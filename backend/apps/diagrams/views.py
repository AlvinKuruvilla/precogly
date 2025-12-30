"""
Views for diagrams app.
"""

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
        Smart cascade delete: Delete the threat model and any DFDs that would become orphaned.

        A DFD is considered orphaned if it's not associated with any other threat model
        after this threat model is deleted.
        """
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

        # Delete the threat model first (this cascades to ThreatModelDFD associations)
        instance.delete()

        # Delete orphaned DFDs
        for dfd in orphaned_dfds:
            dfd.delete()

    @action(detail=True, methods=["get"])
    def delete_preview(self, request, pk=None):
        """
        Preview what will be deleted when this threat model is deleted.

        Returns information about DFDs that will be deleted (orphaned) vs preserved (shared).
        """
        threat_model = self.get_object()

        # Get all DFDs associated with this threat model
        dfd_associations = threat_model.dfd_associations.select_related("dfd").all()

        dfds_to_delete = []
        dfds_to_preserve = []

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
            else:
                # Include names of other threat models that share this DFD
                dfd_info["shared_with"] = [
                    {"id": str(a.threat_model.id), "name": a.threat_model.name}
                    for a in other_associations
                ]
                dfds_to_preserve.append(dfd_info)

        return Response({
            "threat_model": {
                "id": str(threat_model.id),
                "name": threat_model.name,
            },
            "dfds_to_delete": dfds_to_delete,
            "dfds_to_preserve": dfds_to_preserve,
            "total_dfds": len(dfd_associations),
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

        Returns threats with their countermeasures, organized by component.
        """
        from apps.systems.models import OrgsystemComponent
        from apps.threats.models import ComponentInstanceThreat, ComponentInstanceCountermeasure
        from apps.threats.serializers import (
            ComponentInstanceThreatSerializer,
            ComponentInstanceCountermeasureSerializer,
        )

        threat_model = self.get_object()

        # Get all DFDs for this threat model
        dfd_associations = threat_model.dfd_associations.select_related("dfd").all()
        dfds = [assoc.dfd for assoc in dfd_associations]

        # Build node_id -> component_id mapping from all DFDs
        node_component_map = {}
        for dfd in dfds:
            canvas_data = dfd.canvas_data or {}
            for node in canvas_data.get("nodes", []):
                node_id = node.get("id")
                component_id = node.get("data", {}).get("component_id")
                if node_id and component_id:
                    node_component_map[node_id] = {
                        "component_id": component_id,
                        "dfd_id": str(dfd.id),
                        "dfd_name": dfd.name,
                    }

        # Get all component IDs
        component_ids = [v["component_id"] for v in node_component_map.values()]

        # Fetch all threats for these components
        threats = ComponentInstanceThreat.objects.filter(
            component_id__in=component_ids
        ).select_related(
            "component", "threat_library"
        ).prefetch_related(
            "countermeasures__countermeasure_library"
        )

        # Build response with node mapping
        result = []
        for threat in threats:
            # Find which node this component corresponds to
            node_info = None
            for node_id, info in node_component_map.items():
                if info["component_id"] == threat.component_id:
                    node_info = {"node_id": node_id, **info}
                    break

            threat_data = {
                "id": threat.id,
                "component_id": threat.component_id,
                "component_name": threat.component.name if threat.component else None,
                "node_id": node_info["node_id"] if node_info else None,
                "dfd_id": node_info["dfd_id"] if node_info else None,
                "dfd_name": node_info["dfd_name"] if node_info else None,
                "threat_library_id": threat.threat_library_id,
                "threat_name": threat.threat_library.name if threat.threat_library else None,
                "threat_description": threat.threat_library.description if threat.threat_library else None,
                "stride_category": threat.threat_library.stride_category if threat.threat_library else None,
                "inherent_severity": threat.inherent_severity,
                "residual_severity": threat.residual_severity,
                "status": threat.status,
                "justification": threat.justification,
                "countermeasures": [
                    {
                        "id": cm.id,
                        "countermeasure_library_id": cm.countermeasure_library_id,
                        "countermeasure_name": cm.countermeasure_library.name if cm.countermeasure_library else None,
                        "control_type": cm.countermeasure_library.control_type if cm.countermeasure_library else None,
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


class DFDTemplatesLibraryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for browsing DFD templates (read-only)."""

    serializer_class = DFDTemplatesLibrarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "diagram_type"]
    search_fields = ["name", "description"]

    def get_queryset(self):
        """Get templates accessible to user (global + org-specific, excluding deleted)."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)

        return DFDTemplatesLibrary.objects.filter(
            Q(organization__isnull=True) | Q(organization_id__in=org_ids),
            is_deleted=False,
        ).select_related("source_pack")
