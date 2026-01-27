"""
Services for diagrams app - DFD node synchronization and threat generation.
"""

from django.db import transaction

from apps.systems.models import ComponentLibrary, DataFlow, OrgsystemComponent
from apps.threats.models import (
    ComponentInstanceThreat,
    ComponentLibraryThreat,
    DataFlowInstanceThreat,
    FlowInstanceCountermeasure,
)


def sync_dfd_nodes_to_components(dfd, threat_model):
    """
    Sync DFD canvas nodes and edges to backend records.

    When a DFD is saved, this function:
    1. Extracts process/datastore nodes from canvas_data
    2. Creates or updates OrgsystemComponent records for each
    3. Links to ComponentLibrary based on technology if available
    4. Stores the component_id back in the node data
    5. Auto-generates threats for new components
    6. Syncs edges to DataFlow records
    7. Auto-generates threats for new data flows

    Note: Components are created with orgsystem=None. Users can optionally
    assign components to systems via the node edit panel if the threat model
    has linked systems.

    Args:
        dfd: The DFD instance being saved
        threat_model: The associated ThreatModel instance

    Returns:
        dict with:
            - synced_count: number of components synced
            - created_count: number of new components created
            - threats_generated: number of new threats generated
            - node_component_map: mapping of node_id -> component_id
            - flows_synced: number of data flows synced
            - flows_created: number of new data flows created
            - flow_threats_generated: number of new flow threats generated
    """
    canvas_data = dfd.canvas_data or {}
    nodes = canvas_data.get("nodes", [])
    edges = canvas_data.get("edges", [])

    if not nodes:
        return {
            "synced_count": 0,
            "created_count": 0,
            "threats_generated": 0,
            "node_component_map": {},
            "flows_synced": 0,
            "flows_created": 0,
            "flow_threats_generated": 0,
        }

    # Filter to analyzable nodes (process, datastore)
    analyzable_nodes = [
        node for node in nodes
        if node.get("type") in ("process", "datastore")
    ]

    synced_count = 0
    created_count = 0
    threats_generated = 0
    node_component_map = {}
    new_components = []

    with transaction.atomic():
        for node in analyzable_nodes:
            node_id = node.get("id")
            node_data = node.get("data", {})
            node_type = node.get("type")

            # Get component name from node
            label = node_data.get("label", f"Unnamed {node_type}")
            technology = node_data.get("technology", "")

            # Check if this node already has a component_id stored
            existing_component_id = node_data.get("component_id")

            # Find matching ComponentLibrary based on technology
            component_library = _find_component_library(technology, node_type)

            # Skip nodes without a technology - they're visual placeholders only
            # Components are only created when a technology is assigned
            if not component_library:
                continue

            if existing_component_id:
                # Update existing component
                try:
                    component = OrgsystemComponent.objects.get(id=existing_component_id)
                    component.name = label
                    component.component_library = component_library
                    # NOTE: Don't overwrite orgsystem - preserve user's system assignment
                    component.save()
                    synced_count += 1
                except OrgsystemComponent.DoesNotExist:
                    # Component was deleted, create new one
                    component = OrgsystemComponent.objects.create(
                        name=label,
                        orgsystem=None,  # No automatic system assignment
                        component_library=component_library,
                    )
                    created_count += 1
                    new_components.append(component)
            else:
                # Create new component with no system assigned
                component = OrgsystemComponent.objects.create(
                    name=label,
                    orgsystem=None,  # No automatic system assignment
                    component_library=component_library,
                )
                created_count += 1
                new_components.append(component)
                synced_count += 1

            node_component_map[node_id] = component.id

        # Update canvas_data with component_ids
        _update_canvas_with_component_ids(dfd, node_component_map)

        # Auto-generate threats for new components
        for component in new_components:
            if component.component_library:
                generated = _generate_threats_for_component(component)
                threats_generated += generated

        # Sync edges to DataFlow records and generate flow threats
        flow_result = _sync_edges_to_dataflows(dfd, edges, node_component_map)

    return {
        "synced_count": synced_count,
        "created_count": created_count,
        "threats_generated": threats_generated,
        "node_component_map": node_component_map,
        "flows_synced": flow_result["synced_count"],
        "flows_created": flow_result["created_count"],
        "flow_threats_generated": flow_result["threats_generated"],
    }


def _find_component_library(technology: str, node_type: str):
    """
    Find a ComponentLibrary entry matching the technology.

    Args:
        technology: Technology string from node data (e.g., "aws-s3", "PostgreSQL")
        node_type: The node type ("process" or "datastore")

    Returns:
        ComponentLibrary instance or None
    """
    if not technology:
        return None

    # Try exact match on slug first
    component = ComponentLibrary.objects.filter(
        slug=technology,
        is_deleted=False,
    ).first()

    if component:
        return component

    # Try name match (case-insensitive)
    component = ComponentLibrary.objects.filter(
        name__iexact=technology,
        is_deleted=False,
    ).first()

    if component:
        return component

    # Try partial name match
    component = ComponentLibrary.objects.filter(
        name__icontains=technology,
        is_deleted=False,
    ).first()

    return component


def _update_canvas_with_component_ids(dfd, node_component_map):
    """Update DFD canvas_data with component_ids for synced nodes."""
    canvas_data = dfd.canvas_data or {}
    nodes = canvas_data.get("nodes", [])

    updated = False
    for node in nodes:
        node_id = node.get("id")
        if node_id in node_component_map:
            if "data" not in node:
                node["data"] = {}
            if node["data"].get("component_id") != node_component_map[node_id]:
                node["data"]["component_id"] = node_component_map[node_id]
                updated = True

    if updated:
        dfd.canvas_data = canvas_data
        dfd.save(update_fields=["canvas_data"])


def _generate_countermeasures_for_threat(threat_instance):
    """
    Generate countermeasures for a threat based on applicable countermeasures.

    Args:
        threat_instance: ComponentInstanceThreat instance

    Returns:
        Number of countermeasures created
    """
    from apps.threats.models import ComponentInstanceCountermeasure, CountermeasureLibrary

    # Find countermeasures that apply to this threat's library
    applicable_countermeasures = CountermeasureLibrary.objects.filter(
        applicable_threats=threat_instance.threat_library,
        is_deleted=False,
    )

    created_count = 0
    for countermeasure_library in applicable_countermeasures:
        _, created = ComponentInstanceCountermeasure.objects.get_or_create(
            instance_threat=threat_instance,
            countermeasure_library=countermeasure_library,
            defaults={"status": "gap"},
        )
        if created:
            created_count += 1

    return created_count


def _generate_threats_for_component(component):
    """
    Generate threats for a component based on its library type.

    Returns the number of threats created.
    """
    if not component.component_library:
        return 0

    # Get threats linked to this component's library type
    library_threats = ComponentLibraryThreat.objects.filter(
        component_library=component.component_library,
        threat_library__is_deleted=False,
    ).select_related("threat_library")

    created_count = 0

    for lib_threat in library_threats:
        threat_instance, created = ComponentInstanceThreat.objects.get_or_create(
            component=component,
            threat_library=lib_threat.threat_library,
            defaults={
                "inherent_severity": lib_threat.default_severity,
                "status": ComponentInstanceThreat.Status.OPEN,
            },
        )
        if created:
            created_count += 1
            # Auto-generate countermeasures for this new threat
            _generate_countermeasures_for_threat(threat_instance)

    return created_count


def get_threat_model_for_dfd(dfd):
    """Get the ThreatModel associated with a DFD."""
    from .models import ThreatModelDFD

    association = ThreatModelDFD.objects.filter(dfd=dfd).select_related("threat_model").first()
    if association:
        return association.threat_model
    return None


def _sync_edges_to_dataflows(dfd, edges, node_component_map):
    """
    Sync DFD edges to DataFlow records and generate threats.

    Only creates DataFlow records for edges where BOTH source and dest
    nodes have been synced to components (i.e., have technologies assigned).

    Args:
        dfd: The DFD instance
        edges: List of edges from canvas_data
        node_component_map: Mapping of node_id -> component_id

    Returns:
        dict with synced_count, created_count, threats_generated
    """
    from apps.threats.models import CountermeasureLibrary

    synced_count = 0
    created_count = 0
    threats_generated = 0
    new_flows = []
    edge_dataflow_map = {}

    for edge in edges:
        edge_id = edge.get("id")
        source_node_id = edge.get("source")
        target_node_id = edge.get("target")
        edge_data = edge.get("data", {})

        # Skip edges where either endpoint doesn't have a component
        source_component_id = node_component_map.get(source_node_id)
        target_component_id = node_component_map.get(target_node_id)

        if not source_component_id or not target_component_id:
            continue

        # Get edge properties
        label = edge_data.get("label", "")
        protocol = edge_data.get("protocol", "")
        encrypted = edge_data.get("encrypted", False)
        authenticated = edge_data.get("authenticated", False)

        # Check if this edge already has a dataflow_id stored
        existing_dataflow_id = edge_data.get("dataflow_id")

        if existing_dataflow_id:
            # Update existing DataFlow
            try:
                dataflow = DataFlow.objects.get(id=existing_dataflow_id)
                dataflow.label = label
                dataflow.protocol = protocol
                dataflow.encrypted = encrypted
                dataflow.authenticated = authenticated
                dataflow.source_component_id = source_component_id
                dataflow.dest_component_id = target_component_id
                dataflow.save()
                synced_count += 1
            except DataFlow.DoesNotExist:
                # DataFlow was deleted, create new one
                dataflow = DataFlow.objects.create(
                    source_component_id=source_component_id,
                    dest_component_id=target_component_id,
                    label=label,
                    edge_id=edge_id,
                    protocol=protocol,
                    encrypted=encrypted,
                    authenticated=authenticated,
                )
                created_count += 1
                new_flows.append(dataflow)
        else:
            # Create new DataFlow
            dataflow = DataFlow.objects.create(
                source_component_id=source_component_id,
                dest_component_id=target_component_id,
                label=label,
                edge_id=edge_id,
                protocol=protocol,
                encrypted=encrypted,
                authenticated=authenticated,
            )
            created_count += 1
            new_flows.append(dataflow)
            synced_count += 1

        edge_dataflow_map[edge_id] = dataflow.id

    # Update canvas_data with dataflow_ids
    _update_canvas_with_dataflow_ids(dfd, edge_dataflow_map)

    # Generate threats for new data flows
    for dataflow in new_flows:
        generated = _generate_threats_for_dataflow(dataflow)
        threats_generated += generated

    return {
        "synced_count": synced_count,
        "created_count": created_count,
        "threats_generated": threats_generated,
    }


def _update_canvas_with_dataflow_ids(dfd, edge_dataflow_map):
    """Update DFD canvas_data with dataflow_ids for synced edges."""
    if not edge_dataflow_map:
        return

    canvas_data = dfd.canvas_data or {}
    edges = canvas_data.get("edges", [])

    updated = False
    for edge in edges:
        edge_id = edge.get("id")
        if edge_id in edge_dataflow_map:
            if "data" not in edge:
                edge["data"] = {}
            if edge["data"].get("dataflow_id") != edge_dataflow_map[edge_id]:
                edge["data"]["dataflow_id"] = edge_dataflow_map[edge_id]
                updated = True

    if updated:
        dfd.canvas_data = canvas_data
        dfd.save(update_fields=["canvas_data"])


def _generate_threats_for_dataflow(dataflow):
    """
    Generate threats for a data flow based on connected components.

    For data flows, we look at threats associated with EITHER endpoint's
    component library where applies_to is "flow" or "both".

    Returns the number of threats created.
    """
    source_component = dataflow.source_component
    dest_component = dataflow.dest_component

    # Collect component libraries from both endpoints
    component_libraries = []
    if source_component and source_component.component_library:
        component_libraries.append(source_component.component_library)
    if dest_component and dest_component.component_library:
        component_libraries.append(dest_component.component_library)

    if not component_libraries:
        return 0

    # Get threats that apply to data flows for these component types
    library_threats = ComponentLibraryThreat.objects.filter(
        component_library__in=component_libraries,
        applies_to__in=[
            ComponentLibraryThreat.AppliesTo.FLOW,
            ComponentLibraryThreat.AppliesTo.BOTH,
        ],
        threat_library__is_deleted=False,
    ).select_related("threat_library").distinct()

    created_count = 0
    seen_threat_ids = set()

    for lib_threat in library_threats:
        # Avoid duplicate threats if both endpoints have the same threat
        if lib_threat.threat_library_id in seen_threat_ids:
            continue
        seen_threat_ids.add(lib_threat.threat_library_id)

        threat_instance, created = DataFlowInstanceThreat.objects.get_or_create(
            data_flow=dataflow,
            threat_library=lib_threat.threat_library,
            defaults={
                "inherent_severity": lib_threat.default_severity,
                "status": DataFlowInstanceThreat.Status.OPEN,
            },
        )
        if created:
            created_count += 1
            # Auto-generate countermeasures for this new threat
            _generate_countermeasures_for_flow_threat(threat_instance)

    return created_count


def _generate_countermeasures_for_flow_threat(threat_instance):
    """
    Generate countermeasures for a data flow threat.

    Args:
        threat_instance: DataFlowInstanceThreat instance

    Returns:
        Number of countermeasures created
    """
    from apps.threats.models import CountermeasureLibrary

    # Find countermeasures that apply to this threat's library
    applicable_countermeasures = CountermeasureLibrary.objects.filter(
        applicable_threats=threat_instance.threat_library,
        is_deleted=False,
    )

    created_count = 0
    for countermeasure_library in applicable_countermeasures:
        _, created = FlowInstanceCountermeasure.objects.get_or_create(
            flow_threat=threat_instance,
            countermeasure_library=countermeasure_library,
            defaults={"status": "gap"},
        )
        if created:
            created_count += 1

    return created_count
