"""
Views for threat_models app.
"""

from django.db import transaction
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import OutOfScopeItem, ThreatModel, ThreatModelReferenceImage
from .serializers import (
    OutOfScopeItemSerializer,
    ThreatModelCreateSerializer,
    ThreatModelListSerializer,
    ThreatModelReferenceImageSerializer,
    ThreatModelReferenceImageUploadSerializer,
    ThreatModelSerializer,
)


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
        from apps.diagrams.models import DFD, ThreatModelDFD
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
        from apps.diagrams.models import ThreatModelDFD
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
        from apps.diagrams.models import DFD, ThreatModelDFD

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
        from apps.diagrams.models import ThreatModelDFD

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

    @action(detail=True, methods=["post"])
    def add_system(self, request, pk=None):
        """Add a system to this threat model."""
        from apps.systems.models import Orgsystem

        threat_model = self.get_object()
        system_id = request.data.get("system_id")

        if not system_id:
            return Response(
                {"error": "system_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            orgsystem = Orgsystem.objects.get(
                id=system_id,
                organization=threat_model.organization,
            )
        except Orgsystem.DoesNotExist:
            return Response(
                {"error": "System not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .models import ThreatModelOrgsystem

        ThreatModelOrgsystem.objects.get_or_create(
            threat_model=threat_model, orgsystem=orgsystem
        )
        return Response({"status": "system added"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def remove_system(self, request, pk=None):
        """Remove a system from this threat model."""
        from .models import ThreatModelOrgsystem

        threat_model = self.get_object()
        system_id = request.data.get("system_id")

        if not system_id:
            return Response(
                {"error": "system_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = ThreatModelOrgsystem.objects.filter(
            threat_model=threat_model, orgsystem_id=system_id
        ).delete()

        if deleted:
            return Response({"status": "system removed"}, status=status.HTTP_200_OK)
        return Response(
            {"error": "System not associated with this threat model"},
            status=status.HTTP_404_NOT_FOUND,
        )

    @action(detail=True, methods=["post"])
    def add_referenced_model(self, request, pk=None):
        """Add a referenced threat model relationship."""
        threat_model = self.get_object()
        target_model_id = request.data.get("target_model_id")

        if not target_model_id:
            return Response(
                {"error": "target_model_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_model = ThreatModel.objects.get(
                id=target_model_id,
                organization=threat_model.organization,
            )
        except ThreatModel.DoesNotExist:
            return Response(
                {"error": "Target threat model not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .models import ThreatModelRelationship

        ThreatModelRelationship.objects.get_or_create(
            source_threat_model=threat_model,
            target_threat_model=target_model,
            relation_type=ThreatModelRelationship.RelationType.RELATED_TO,
        )
        return Response({"status": "reference added"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def remove_referenced_model(self, request, pk=None):
        """Remove a referenced threat model relationship."""
        from .models import ThreatModelRelationship

        threat_model = self.get_object()
        target_model_id = request.data.get("target_model_id")

        if not target_model_id:
            return Response(
                {"error": "target_model_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = ThreatModelRelationship.objects.filter(
            source_threat_model=threat_model,
            target_threat_model_id=target_model_id,
            relation_type=ThreatModelRelationship.RelationType.RELATED_TO,
        ).delete()

        if deleted:
            return Response({"status": "reference removed"}, status=status.HTTP_200_OK)
        return Response(
            {"error": "Reference not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    def _serialize_taxonomy_entries(self, threat_library):
        """Serialize taxonomy entries for a threat library."""
        if not threat_library:
            return []

        entries = []
        for join in threat_library.taxonomy_entries.select_related("taxonomy_entry__taxonomy").all():
            entry = join.taxonomy_entry
            entries.append({
                "taxonomy_slug": entry.taxonomy.slug,
                "taxonomy_name": entry.taxonomy.name,
                "external_id": entry.external_id,
                "title": entry.title,
            })
        return entries

    def _serialize_standard_mappings(self, countermeasure_library):
        """Serialize standard mappings for a countermeasure library."""
        if not countermeasure_library:
            return []

        mappings = []
        for mapping in countermeasure_library.standard_mappings.all():
            if mapping.requirement and mapping.requirement.framework:
                mappings.append({
                    "id": mapping.id,
                    "framework_name": mapping.requirement.framework.name,
                    "framework_slug": mapping.requirement.framework.slug,
                    "section_code": mapping.requirement.section_code,
                    "requirement_description": mapping.requirement.description,
                    "sufficiency": mapping.sufficiency,
                })
        return mappings

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

        # Get all component IDs and dataflow IDs from canvas nodes
        component_ids = [v["component_id"] for v in node_component_map.values()]
        dataflow_ids = [v["dataflow_id"] for v in edge_dataflow_map.values()]

        # Also include analysis-only components (linked directly to threat model, not via DFD canvas)
        analysis_only_components = OrgsystemComponent.objects.filter(
            threat_model=threat_model
        ).exclude(
            id__in=component_ids  # Exclude components already on canvas
        )

        # Add analysis-only components to the node_component_map with synthetic node IDs
        for comp in analysis_only_components:
            synthetic_node_id = f"analysis-{comp.id}"
            node_component_map[synthetic_node_id] = {
                "component_id": comp.id,
                "dfd_id": None,
                "dfd_name": None,
                "is_analysis_only": True,
            }
            component_ids.append(comp.id)

        # Fetch all component threats
        component_threats = ComponentInstanceThreat.objects.filter(
            component_id__in=component_ids
        ).select_related(
            "component", "threat_library"
        ).prefetch_related(
            "countermeasures__countermeasure_library",
            "countermeasures__countermeasure_library__standard_mappings__requirement__framework",
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
            "countermeasures__countermeasure_library__standard_mappings__requirement__framework",
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
                "taxonomy_entries": self._serialize_taxonomy_entries(threat.threat_library),
                "inherent_severity": threat.inherent_severity,
                "residual_severity": threat.residual_severity,
                "status": threat.status,
                "justification": threat.justification,
                "is_dismissed": threat.is_dismissed,
                "dismissal_reason": threat.dismissal_reason,
                "countermeasures": [
                    {
                        "id": cm.id,
                        "countermeasure_library_id": cm.countermeasure_library_id,
                        # Use library fields if available, fall back to copied fields for orphaned instances
                        "countermeasure_name": (cm.countermeasure_library.name if cm.countermeasure_library else None) or cm.countermeasure_name,
                        "control_type": (cm.countermeasure_library.control_type if cm.countermeasure_library else None) or cm.control_type,
                        "status": cm.status,
                        "priority": cm.priority,
                        "evidence_url": cm.evidence_url,
                        "assigned_owner_email": cm.assigned_owner.email if cm.assigned_owner else None,
                        "verified_by_email": cm.verified_by.email if cm.verified_by else None,
                        "standard_mappings": self._serialize_standard_mappings(cm.countermeasure_library),
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
                "taxonomy_entries": self._serialize_taxonomy_entries(threat.threat_library),
                "inherent_severity": threat.inherent_severity,
                "residual_severity": threat.residual_severity,
                "status": threat.status,
                "justification": "",
                "is_dismissed": threat.is_dismissed,
                "dismissal_reason": threat.dismissal_reason,
                "countermeasures": [
                    {
                        "id": cm.id,
                        "countermeasure_library_id": cm.countermeasure_library_id,
                        # Use library fields if available, fall back to copied fields for orphaned instances
                        "countermeasure_name": (cm.countermeasure_library.name if cm.countermeasure_library else None) or cm.countermeasure_name,
                        "control_type": (cm.countermeasure_library.control_type if cm.countermeasure_library else None) or cm.control_type,
                        "status": cm.status,
                        "priority": cm.priority,
                        "evidence_url": cm.evidence_url,
                        "assigned_owner_email": cm.assigned_owner.email if cm.assigned_owner else None,
                        "verified_by_email": cm.verified_by.email if cm.verified_by else None,
                        "standard_mappings": self._serialize_standard_mappings(cm.countermeasure_library),
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


class ThreatModelReferenceImageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing threat model reference images."""

    permission_classes = [IsAuthenticated]
    serializer_class = ThreatModelReferenceImageSerializer

    def get_queryset(self):
        """Filter by user's organization access and specific threat model."""
        user = self.request.user
        user_orgs = user.organization_memberships.values_list("organization_id", flat=True)

        queryset = ThreatModelReferenceImage.objects.filter(
            threat_model__organization_id__in=user_orgs
        ).select_related("threat_model", "uploaded_by")

        # Filter by threat_model if accessed via nested route
        threat_model_id = self.kwargs.get('threat_model_pk')
        if threat_model_id:
            queryset = queryset.filter(threat_model_id=threat_model_id)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ["create", "upload_for_threat_model"]:
            return ThreatModelReferenceImageUploadSerializer
        return ThreatModelReferenceImageSerializer

    def perform_create(self, serializer):
        """Set uploaded_by to current user."""
        serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="upload")
    def upload_for_threat_model(self, request, threat_model_pk=None):
        """Upload a reference image for a specific threat model."""
        from django.shortcuts import get_object_or_404

        threat_model = get_object_or_404(ThreatModel, pk=threat_model_pk)

        # Verify user has access to this threat model's organization
        user_orgs = request.user.organization_memberships.values_list("organization_id", flat=True)
        if threat_model.organization_id not in user_orgs:
            return Response(
                {"detail": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ThreatModelReferenceImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image = serializer.save(
            threat_model=threat_model,
            uploaded_by=request.user,
        )

        return Response(
            ThreatModelReferenceImageSerializer(image, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class OutOfScopeItemViewSet(viewsets.ModelViewSet):
    """ViewSet for OutOfScopeItem CRUD, nested under threat models."""

    serializer_class = OutOfScopeItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter by threat model and user's organization."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return OutOfScopeItem.objects.filter(
            threat_model_id=self.kwargs["threat_model_pk"],
            threat_model__organization_id__in=org_ids,
        )

    def perform_create(self, serializer):
        """Set threat_model from URL kwargs."""
        serializer.save(threat_model_id=self.kwargs["threat_model_pk"])
