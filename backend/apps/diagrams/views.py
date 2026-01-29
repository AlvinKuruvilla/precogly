"""
Views for diagrams app.
"""

from django.db import transaction
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DFD, DFDTemplatesLibrary, ThreatModel, ThreatModelDFD
from .serializers import (
    DFDListSerializer,
    DFDSerializer,
    DFDTemplatesLibrarySerializer,
    ThreatModelCreateSerializer,
    ThreatModelListSerializer,
    ThreatModelSerializer,
)
from .services import get_threat_model_for_dfd, sync_dfd_nodes_to_components


class ThreatModelViewSet(viewsets.ModelViewSet):
    """ViewSet for ThreatModel CRUD operations."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "trigger", "organization"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at", "status"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        """Filter threat models by user's organizations."""
        user = self.request.user
        # Get organizations the user belongs to
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return ThreatModel.objects.filter(organization_id__in=org_ids).select_related(
            "created_by", "organization"
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return ThreatModelListSerializer
        elif self.action == "create":
            return ThreatModelCreateSerializer
        return ThreatModelSerializer

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        """
        Smart cascade delete: Delete the threat model, orphaned DFDs, and their components.

        A DFD is considered orphaned if it's not associated with any other threat model
        after this threat model is deleted. Components from orphaned DFDs are also deleted,
        which cascades to delete their threats and countermeasures.
        """
        from apps.systems.models import OrgsystemComponent

        # Get all DFDs associated with this threat model
        dfd_associations = instance.dfd_associations.select_related("dfd").all()
        dfds_to_check = [assoc.dfd for assoc in dfd_associations]

        # Find DFDs that would become orphaned (only linked to this threat model)
        orphaned_dfds = []
        for dfd in dfds_to_check:
            # Count how many OTHER threat models this DFD is linked to
            other_associations_count = ThreatModelDFD.objects.filter(
                dfd=dfd
            ).exclude(
                threat_model=instance
            ).count()

            if other_associations_count == 0:
                orphaned_dfds.append(dfd)

        # Collect component IDs from orphaned DFDs
        component_ids_to_delete = set()
        for dfd in orphaned_dfds:
            canvas_data = dfd.canvas_data or {}
            for node in canvas_data.get("nodes", []):
                component_id = node.get("data", {}).get("component_id")
                if component_id:
                    component_ids_to_delete.add(component_id)

        with transaction.atomic():
            # Delete components first (cascades to threats and countermeasures)
            if component_ids_to_delete:
                OrgsystemComponent.objects.filter(id__in=component_ids_to_delete).delete()

            # Delete the threat model (cascades to ThreatModelDFD associations)
            instance.delete()

            # Delete orphaned DFDs
            for dfd in orphaned_dfds:
                dfd.delete()

    @action(detail=True, methods=["get"])
    def delete_preview(self, request, pk=None):
        """
        Preview what will be deleted when this threat model is deleted.

        Returns information about DFDs, components, threats, and countermeasures
        that will be deleted.
        """
        from apps.systems.models import DataFlow, OrgsystemComponent
        from apps.threats.models import (
            ComponentInstanceCountermeasure,
            ComponentInstanceThreat,
            DataFlowInstanceThreat,
            FlowInstanceCountermeasure,
        )

        threat_model = self.get_object()

        # Get all DFDs associated with this threat model
        dfd_associations = threat_model.dfd_associations.select_related("dfd").all()

        dfds_to_delete = []
        dfds_to_preserve = []
        component_ids_to_delete = set()

        for assoc in dfd_associations:
            dfd = assoc.dfd
            canvas_data = dfd.canvas_data or {}
            node_count = len(canvas_data.get("nodes", []))

            # Count how many OTHER threat models this DFD is linked to
            other_associations = ThreatModelDFD.objects.filter(
                dfd=dfd
            ).exclude(
                threat_model=threat_model
            ).select_related("threat_model")

            dfd_info = {
                "id": str(dfd.id),
                "name": dfd.name,
                "node_count": node_count,
            }

            if other_associations.count() == 0:
                dfds_to_delete.append(dfd_info)
                # Collect component IDs from orphaned DFDs
                for node in canvas_data.get("nodes", []):
                    component_id = node.get("data", {}).get("component_id")
                    if component_id:
                        component_ids_to_delete.add(component_id)
            else:
                # Include names of other threat models that share this DFD
                dfd_info["shared_with"] = [
                    {"id": str(a.threat_model.id), "name": a.threat_model.name}
                    for a in other_associations
                ]
                dfds_to_preserve.append(dfd_info)

        # Count data flows that will be deleted (those connected to components being deleted)
        dataflow_count = DataFlow.objects.filter(
            Q(source_component_id__in=component_ids_to_delete) |
            Q(dest_component_id__in=component_ids_to_delete)
        ).count()

        # Count component threats and countermeasures
        component_threat_count = ComponentInstanceThreat.objects.filter(
            component_id__in=component_ids_to_delete
        ).count()
        component_countermeasure_count = ComponentInstanceCountermeasure.objects.filter(
            instance_threat__component_id__in=component_ids_to_delete
        ).count()

        # Count flow threats and countermeasures
        flow_threat_count = DataFlowInstanceThreat.objects.filter(
            Q(data_flow__source_component_id__in=component_ids_to_delete) |
            Q(data_flow__dest_component_id__in=component_ids_to_delete)
        ).count()
        flow_countermeasure_count = FlowInstanceCountermeasure.objects.filter(
            Q(flow_threat__data_flow__source_component_id__in=component_ids_to_delete) |
            Q(flow_threat__data_flow__dest_component_id__in=component_ids_to_delete)
        ).count()

        return Response({
            "threat_model": {
                "id": str(threat_model.id),
                "name": threat_model.name,
            },
            "dfds_to_delete": dfds_to_delete,
            "dfds_to_preserve": dfds_to_preserve,
            "total_dfds": len(dfd_associations),
            "components_to_delete": len(component_ids_to_delete),
            "dataflows_to_delete": dataflow_count,
            "threats_to_delete": component_threat_count + flow_threat_count,
            "countermeasures_to_delete": component_countermeasure_count + flow_countermeasure_count,
        })

    @action(detail=True, methods=["post"])
    def add_dfd(self, request, pk=None):
        """Add a DFD to this threat model."""
        threat_model = self.get_object()
        dfd_id = request.data.get("dfd_id")

        if not dfd_id:
            return Response(
                {"error": "dfd_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dfd = DFD.objects.get(id=dfd_id)
        except DFD.DoesNotExist:
            return Response(
                {"error": "DFD not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        ThreatModelDFD.objects.get_or_create(threat_model=threat_model, dfd=dfd)
        return Response({"status": "DFD added"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def remove_dfd(self, request, pk=None):
        """Remove a DFD from this threat model."""
        threat_model = self.get_object()
        dfd_id = request.data.get("dfd_id")

        if not dfd_id:
            return Response(
                {"error": "dfd_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = ThreatModelDFD.objects.filter(
            threat_model=threat_model, dfd_id=dfd_id
        ).delete()

        if deleted:
            return Response({"status": "DFD removed"}, status=status.HTTP_200_OK)
        return Response(
            {"error": "DFD not associated with this threat model"},
            status=status.HTTP_404_NOT_FOUND,
        )

    @action(detail=True, methods=["get"])
    def threats(self, request, pk=None):
        """
        Get all threats for this threat model, aggregated from all DFDs.

        Returns both component threats and data flow threats with their countermeasures.
        """
        from apps.systems.models import DataFlow, OrgsystemComponent
        from apps.threats.models import (
            ComponentInstanceCountermeasure,
            ComponentInstanceThreat,
            DataFlowInstanceThreat,
        )

        threat_model = self.get_object()

        # Get all DFDs for this threat model
        dfd_associations = threat_model.dfd_associations.select_related("dfd").all()
        dfds = [assoc.dfd for assoc in dfd_associations]

        # Build node_id -> component_id mapping and edge_id -> dataflow_id mapping from all DFDs
        node_component_map = {}
        edge_dataflow_map = {}
        for dfd in dfds:
            canvas_data = dfd.canvas_data or {}
            for node in canvas_data.get("nodes", []):
                node_id = node.get("id")
                node_data = node.get("data", {})
                component_id = node_data.get("component_id")
                if node_id and component_id:
                    node_component_map[node_id] = {
                        "component_id": component_id,
                        "dfd_id": str(dfd.id),
                        "dfd_name": dfd.name,
                    }
            for edge in canvas_data.get("edges", []):
                edge_id = edge.get("id")
                dataflow_id = edge.get("data", {}).get("dataflow_id")
                if edge_id and dataflow_id:
                    edge_dataflow_map[edge_id] = {
                        "dataflow_id": dataflow_id,
                        "dfd_id": str(dfd.id),
                        "dfd_name": dfd.name,
                    }

        # Get all component IDs and dataflow IDs
        component_ids = [v["component_id"] for v in node_component_map.values()]
        dataflow_ids = [v["dataflow_id"] for v in edge_dataflow_map.values()]

        # Fetch all component threats
        component_threats = ComponentInstanceThreat.objects.filter(
            component_id__in=component_ids
        ).select_related(
            "component", "threat_library"
        ).prefetch_related(
            "countermeasures__countermeasure_library",
            "countermeasures__assigned_owner",
            "countermeasures__verified_by",
        )

        # Fetch all data flow threats
        flow_threats = DataFlowInstanceThreat.objects.filter(
            data_flow_id__in=dataflow_ids
        ).select_related(
            "data_flow", "threat_library"
        ).prefetch_related(
            "countermeasures__countermeasure_library",
            "countermeasures__assigned_owner",
            "countermeasures__verified_by",
        )

        # Build response with component threats
        result = []
        for threat in component_threats:
            # Find which node this component corresponds to
            node_info = None
            for node_id, info in node_component_map.items():
                if info["component_id"] == threat.component_id:
                    node_info = {"node_id": node_id, **info}
                    break

            threat_data = {
                "id": threat.id,
                "type": "component",
                "component_id": threat.component_id,
                "component_name": threat.component.name if threat.component else None,
                "node_id": node_info["node_id"] if node_info else None,
                "dfd_id": node_info["dfd_id"] if node_info else None,
                "dfd_name": node_info["dfd_name"] if node_info else None,
                "threat_library_id": threat.threat_library_id,
                # Use library fields if available, fall back to copied fields for orphaned instances
                "threat_name": (threat.threat_library.name if threat.threat_library else None) or threat.threat_name,
                "threat_description": (threat.threat_library.description if threat.threat_library else None) or threat.threat_description,
                "stride_category": (threat.threat_library.stride_category if threat.threat_library else None) or threat.stride_category,
                "inherent_severity": threat.inherent_severity,
                "residual_severity": threat.residual_severity,
                "status": threat.status,
                "justification": threat.justification,
                "countermeasures": [
                    {
                        "id": cm.id,
                        "countermeasure_library_id": cm.countermeasure_library_id,
                        # Use library fields if available, fall back to copied fields for orphaned instances
                        "countermeasure_name": (cm.countermeasure_library.name if cm.countermeasure_library else None) or cm.countermeasure_name,
                        "control_type": (cm.countermeasure_library.control_type if cm.countermeasure_library else None) or cm.control_type,
                        "status": cm.status,
                        "evidence_url": cm.evidence_url,
                        "assigned_owner_email": cm.assigned_owner.email if cm.assigned_owner else None,
                        "verified_by_email": cm.verified_by.email if cm.verified_by else None,
                    }
                    for cm in threat.countermeasures.all()
                ],
            }
            result.append(threat_data)

        # Add data flow threats to the response
        for threat in flow_threats:
            # Find which edge this dataflow corresponds to
            edge_info = None
            for edge_id, info in edge_dataflow_map.items():
                if info["dataflow_id"] == threat.data_flow_id:
                    edge_info = {"edge_id": edge_id, **info}
                    break

            threat_data = {
                "id": threat.id,
                "type": "dataflow",
                "dataflow_id": threat.data_flow_id,
                "dataflow_label": threat.data_flow.label if threat.data_flow else None,
                "edge_id": edge_info["edge_id"] if edge_info else None,
                "node_id": edge_info["edge_id"] if edge_info else None,  # Use edge_id as node_id for compatibility
                "component_id": threat.data_flow_id,  # Use dataflow_id as component_id for compatibility
                "component_name": threat.data_flow.label if threat.data_flow else None,
                "dfd_id": edge_info["dfd_id"] if edge_info else None,
                "dfd_name": edge_info["dfd_name"] if edge_info else None,
                "threat_library_id": threat.threat_library_id,
                # Use library fields if available, fall back to copied fields for orphaned instances
                "threat_name": (threat.threat_library.name if threat.threat_library else None) or threat.threat_name,
                "threat_description": (threat.threat_library.description if threat.threat_library else None) or threat.threat_description,
                "stride_category": (threat.threat_library.stride_category if threat.threat_library else None) or threat.stride_category,
                "inherent_severity": threat.inherent_severity,
                "residual_severity": threat.residual_severity,
                "status": threat.status,
                "justification": "",
                "countermeasures": [
                    {
                        "id": cm.id,
                        "countermeasure_library_id": cm.countermeasure_library_id,
                        # Use library fields if available, fall back to copied fields for orphaned instances
                        "countermeasure_name": (cm.countermeasure_library.name if cm.countermeasure_library else None) or cm.countermeasure_name,
                        "control_type": (cm.countermeasure_library.control_type if cm.countermeasure_library else None) or cm.control_type,
                        "status": cm.status,
                        "evidence_url": cm.evidence_url,
                        "assigned_owner_email": cm.assigned_owner.email if cm.assigned_owner else None,
                        "verified_by_email": cm.verified_by.email if cm.verified_by else None,
                    }
                    for cm in threat.countermeasures.all()
                ],
            }
            result.append(threat_data)

        return Response({
            "threat_model_id": str(threat_model.id),
            "threats": result,
            "total_count": len(result),
            "node_component_map": node_component_map,
            "edge_dataflow_map": edge_dataflow_map,
        })


class DFDViewSet(viewsets.ModelViewSet):
    """ViewSet for DFD CRUD operations."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["diagram_type"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        """Get DFDs accessible to the user."""
        user = self.request.user
        # Get organizations the user belongs to
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)

        # Get DFDs associated with threat models in user's organizations
        threat_model_ids = ThreatModel.objects.filter(
            organization_id__in=org_ids
        ).values_list("id", flat=True)

        dfd_ids = ThreatModelDFD.objects.filter(
            threat_model_id__in=threat_model_ids
        ).values_list("dfd_id", flat=True)

        return DFD.objects.filter(id__in=dfd_ids).select_related("updated_by")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DFDListSerializer
        return DFDSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a DFD with required threat model association.

        All DFDs must be associated with a threat model to prevent orphaned DFDs.
        The threat_model_id field is required in the request body.
        """
        threat_model_id = request.data.get("threat_model_id")
        if not threat_model_id:
            return Response(
                {"error": "threat_model_id is required. DFDs cannot be created without a threat model."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            threat_model = ThreatModel.objects.get(id=threat_model_id)
        except ThreatModel.DoesNotExist:
            return Response(
                {"error": "Threat model not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create the DFD
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dfd = serializer.save(updated_by=request.user)

        # Associate with threat model atomically
        ThreatModelDFD.objects.create(threat_model=threat_model, dfd=dfd)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        """Set updated_by to current user and sync nodes to components."""
        dfd = serializer.save(updated_by=self.request.user)

        # Sync DFD nodes to OrgsystemComponent records
        threat_model = get_threat_model_for_dfd(dfd)
        if threat_model:
            sync_result = sync_dfd_nodes_to_components(dfd, threat_model)
            # Store sync result in response headers for debugging
            self._sync_result = sync_result

    @action(detail=False, methods=["post"])
    def create_for_threat_model(self, request):
        """
        Create a DFD and associate it with a threat model.

        DEPRECATED: Use POST /diagrams/ with threat_model_id instead.
        Kept for backwards compatibility.
        """
        return self.create(request)

    @action(detail=True, methods=["get"])
    def delete_preview(self, request, pk=None):
        """
        Preview what will be deleted when this DFD is deleted.

        Returns information about:
        - Threat models that will lose this DFD
        - Node and component counts
        - Warning if shared with multiple threat models
        - Orphaned components that could be deleted
        """
        from apps.systems.models import OrgsystemComponent

        dfd = self.get_object()
        canvas_data = dfd.canvas_data or {}
        nodes = canvas_data.get("nodes", [])

        # Get threat model associations
        threat_model_associations = ThreatModelDFD.objects.filter(
            dfd=dfd
        ).select_related("threat_model")

        affected_threat_models = [
            {
                "id": str(assoc.threat_model.id),
                "name": assoc.threat_model.name,
            }
            for assoc in threat_model_associations
        ]

        # Extract component IDs from nodes
        component_ids = []
        for node in nodes:
            comp_id = node.get("data", {}).get("component_id")
            if comp_id:
                component_ids.append(comp_id)

        # Find orphaned components (components only referenced by this DFD)
        # A component is orphaned if it's not referenced by any other DFD's nodes
        orphaned_components = []
        if component_ids:
            # Get all other DFDs
            other_dfds = DFD.objects.exclude(id=dfd.id)

            # Collect component IDs referenced by other DFDs
            other_dfd_component_ids = set()
            for other_dfd in other_dfds:
                other_canvas = other_dfd.canvas_data or {}
                for node in other_canvas.get("nodes", []):
                    other_comp_id = node.get("data", {}).get("component_id")
                    if other_comp_id:
                        other_dfd_component_ids.add(other_comp_id)

            # Find components only in this DFD
            orphaned_component_ids = set(component_ids) - other_dfd_component_ids

            if orphaned_component_ids:
                orphaned_comps = OrgsystemComponent.objects.filter(
                    id__in=orphaned_component_ids
                ).select_related("component_library")

                for comp in orphaned_comps:
                    orphaned_components.append({
                        "id": comp.id,
                        "name": comp.name,
                        "library_name": comp.component_library.name if comp.component_library else None,
                    })

        return Response({
            "dfd": {
                "id": str(dfd.id),
                "name": dfd.name,
                "node_count": len(nodes),
                "component_count": len(component_ids),
            },
            "affected_threat_models": affected_threat_models,
            "is_shared": len(affected_threat_models) > 1,
            "orphaned_components": orphaned_components,
            "orphaned_component_count": len(orphaned_components),
        })

    def destroy(self, request, *args, **kwargs):
        """
        Delete a DFD with optional orphaned component cleanup.

        Query params:
        - delete_orphaned_components: If "true", also delete components
          that are only referenced by this DFD.
        """
        from apps.systems.models import OrgsystemComponent

        dfd = self.get_object()
        delete_orphaned = request.query_params.get("delete_orphaned_components", "").lower() == "true"

        orphaned_deleted_count = 0

        if delete_orphaned:
            # Find and delete orphaned components
            canvas_data = dfd.canvas_data or {}
            nodes = canvas_data.get("nodes", [])

            component_ids = []
            for node in nodes:
                comp_id = node.get("data", {}).get("component_id")
                if comp_id:
                    component_ids.append(comp_id)

            if component_ids:
                # Get component IDs referenced by other DFDs
                other_dfds = DFD.objects.exclude(id=dfd.id)
                other_dfd_component_ids = set()
                for other_dfd in other_dfds:
                    other_canvas = other_dfd.canvas_data or {}
                    for node in other_canvas.get("nodes", []):
                        other_comp_id = node.get("data", {}).get("component_id")
                        if other_comp_id:
                            other_dfd_component_ids.add(other_comp_id)

                # Delete orphaned components
                orphaned_component_ids = set(component_ids) - other_dfd_component_ids
                if orphaned_component_ids:
                    orphaned_deleted_count, _ = OrgsystemComponent.objects.filter(
                        id__in=orphaned_component_ids
                    ).delete()

        # Delete the DFD (cascades to ThreatModelDFD, DFDOrgsystem)
        dfd.delete()

        return Response({
            "status": "deleted",
            "orphaned_components_deleted": orphaned_deleted_count,
        }, status=status.HTTP_200_OK)


class DFDTemplatesLibraryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for browsing DFD templates (read-only)."""

    serializer_class = DFDTemplatesLibrarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "diagram_type"]
    search_fields = ["name", "description"]

    def get_queryset(self):
        """Get all available DFD templates."""
        return DFDTemplatesLibrary.objects.all().select_related("source_pack")

    @action(detail=True, methods=["get"])
    def resolved(self, request, pk=None):
        """
        Get template with resolved component_refs.

        Returns the template's canvas_data with component_ref values resolved
        to actual component_library_id values for nodes that reference components.
        """
        from apps.systems.models import ComponentLibrary

        template = self.get_object()
        canvas_data = template.canvas_data or {}

        # Get the source pack for reference resolution
        source_pack = template.source_pack

        # Clone the canvas_data to avoid mutating the original
        resolved_data = {
            "nodes": [],
            "edges": canvas_data.get("edges", []),
        }

        # Track resolution results
        resolution_results = []

        for node in canvas_data.get("nodes", []):
            resolved_node = {**node}
            node_data = node.get("data", {})
            component_ref = node_data.get("component_ref")

            if component_ref:
                # Resolve the component_ref to a component_library_id
                component_library = None

                if source_pack:
                    # Try to resolve within the source pack first
                    qualified_slug = f"{source_pack.slug}/{component_ref}"
                    component_library = ComponentLibrary.objects.filter(
                        qualified_slug=qualified_slug,
                    ).first()

                if not component_library and "/" in component_ref:
                    # Cross-pack reference
                    component_library = ComponentLibrary.objects.filter(
                        qualified_slug=component_ref,
                    ).first()

                if component_library:
                    # Add component_library_id to the node data
                    resolved_node["data"] = {
                        **node_data,
                        "component_library_id": component_library.id,
                        "component_library_name": component_library.name,
                    }
                    resolution_results.append({
                        "node_id": node.get("id"),
                        "component_ref": component_ref,
                        "resolved": True,
                        "component_library_id": component_library.id,
                        "component_library_name": component_library.name,
                    })
                else:
                    resolution_results.append({
                        "node_id": node.get("id"),
                        "component_ref": component_ref,
                        "resolved": False,
                        "error": f"Component not found: {component_ref}",
                    })

            resolved_data["nodes"].append(resolved_node)

        return Response({
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "category": template.category,
            "diagramType": template.diagram_type,
            "canvasData": resolved_data,
            "sourcePackId": source_pack.id if source_pack else None,
            "sourcePackName": source_pack.name if source_pack else None,
            "resolutionResults": resolution_results,
            "allResolved": all(r.get("resolved", False) for r in resolution_results if r),
        })
