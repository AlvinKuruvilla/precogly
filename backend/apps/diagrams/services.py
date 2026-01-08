"""
Services for diagrams app - DFD node synchronization and threat generation.
"""

from django.db import transaction

from apps.systems.models import ComponentLibrary, OrgsystemComponent
from apps.threats.models import ComponentInstanceThreat, ComponentLibraryThreat


def sync_dfd_nodes_to_components(dfd, threat_model):
    """
    Sync DFD canvas nodes to OrgsystemComponent records.

    When a DFD is saved, this function:
    1. Extracts process/datastore nodes from canvas_data
    2. Creates or updates OrgsystemComponent records for each
    3. Links to ComponentLibrary based on technology if available
    4. Stores the component_id back in the node data
    5. Auto-generates threats for new components

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
    """
    canvas_data = dfd.canvas_data or {}
    nodes = canvas_data.get("nodes", [])

    if not nodes:
        return {
            "synced_count": 0,
            "created_count": 0,
            "threats_generated": 0,
            "node_component_map": {},
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

    return {
        "synced_count": synced_count,
        "created_count": created_count,
        "threats_generated": threats_generated,
        "node_component_map": node_component_map,
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
        _, created = ComponentInstanceThreat.objects.get_or_create(
            component=component,
            threat_library=lib_threat.threat_library,
            defaults={
                "inherent_severity": lib_threat.default_severity,
                "status": ComponentInstanceThreat.Status.OPEN,
            },
        )
        if created:
            created_count += 1

    return created_count


def get_threat_model_for_dfd(dfd):
    """Get the ThreatModel associated with a DFD."""
    from .models import ThreatModelDFD

    association = ThreatModelDFD.objects.filter(dfd=dfd).select_related("threat_model").first()
    if association:
        return association.threat_model
    return None
