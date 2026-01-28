"""
Views for systems app.
"""

from django.db import transaction
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.threats.models import ComponentInstanceThreat, ComponentLibraryThreat
from apps.threats.serializers import ComponentInstanceThreatSerializer

from .models import (
    ComponentLibrary,
    DataAsset,
    DataFlow,
    IntegrationSource,
    Orgsystem,
    OrgsystemComponent,
    TrustBoundary,
)
from .serializers import (
    ComponentLibrarySerializer,
    DataAssetSerializer,
    DataFlowSerializer,
    IntegrationSourceSerializer,
    OrgsystemComponentSerializer,
    OrgsystemListSerializer,
    OrgsystemSerializer,
    TrustBoundarySerializer,
)


class OrgsystemViewSet(viewsets.ModelViewSet):
    """ViewSet for Orgsystem CRUD operations."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["criticality", "lifecycle_state", "organization"]
    search_fields = ["name", "owner"]
    ordering_fields = ["name", "created_at", "criticality"]
    ordering = ["name"]

    def get_queryset(self):
        """Filter by user's organizations."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return Orgsystem.objects.filter(organization_id__in=org_ids).select_related(
            "organization"
        )

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == "list":
            return OrgsystemListSerializer
        return OrgsystemSerializer


class TrustBoundaryViewSet(viewsets.ModelViewSet):
    """ViewSet for TrustBoundary CRUD operations."""

    queryset = TrustBoundary.objects.all()
    serializer_class = TrustBoundarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["name", "description"]


class ComponentLibraryViewSet(viewsets.ModelViewSet):
    """ViewSet for ComponentLibrary (shared component templates)."""

    serializer_class = ComponentLibrarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "component_type", "provider"]
    search_fields = ["name", "component_type", "slug"]

    def get_queryset(self):
        """
        Get all component library entries.

        Returns all components that have been imported into the database.
        """
        queryset = ComponentLibrary.objects.all().select_related("source_pack").order_by("name")
        # DEBUG [1]: Log queryset
        print(f"[DEBUG 1] ComponentLibraryViewSet.get_queryset() - count: {queryset.count()}")
        for item in queryset:
            print(f"[DEBUG 1]   - {item.id}: {item.name} (category: {item.category}, type: {item.component_type})")
        return queryset

    def list(self, request, *args, **kwargs):
        """Override list to add debugging."""
        print(f"[DEBUG 2] ComponentLibraryViewSet.list() - request path: {request.path}")
        response = super().list(request, *args, **kwargs)
        print(f"[DEBUG 2] Response status: {response.status_code}")
        print(f"[DEBUG 2] Response data type: {type(response.data)}")
        if isinstance(response.data, dict):
            print(f"[DEBUG 2] Response keys: {response.data.keys()}")
            print(f"[DEBUG 2] Results count: {len(response.data.get('results', []))}")
        else:
            print(f"[DEBUG 2] Response data (first 500 chars): {str(response.data)[:500]}")
        return response


class OrgsystemComponentViewSet(viewsets.ModelViewSet):
    """ViewSet for OrgsystemComponent CRUD operations."""

    serializer_class = OrgsystemComponentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["orgsystem", "trust_boundary"]
    search_fields = ["name"]

    def get_queryset(self):
        """
        Filter by user's organizations.

        Includes components where:
        - orgsystem belongs to user's organization, OR
        - orgsystem is NULL (unassigned components)
        """
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return OrgsystemComponent.objects.filter(
            Q(orgsystem__organization_id__in=org_ids) | Q(orgsystem__isnull=True)
        ).select_related("component_library", "trust_boundary")

    @action(detail=True, methods=["patch"])
    def assign_system(self, request, pk=None):
        """
        Assign a component to a system (or unassign with null).

        Request body:
            orgsystemId: int | null - System ID to assign, or null to unassign
        """
        component = self.get_object()
        orgsystem_id = request.data.get("orgsystemId")

        if orgsystem_id:
            # Validate system belongs to user's organization
            user = self.request.user
            org_ids = list(user.organization_memberships.values_list("organization_id", flat=True))
            try:
                system = Orgsystem.objects.get(id=orgsystem_id, organization_id__in=org_ids)
                component.orgsystem = system
            except Orgsystem.DoesNotExist:
                return Response(
                    {"error": "System not found or access denied"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            component.orgsystem = None

        component.save()
        return Response({"status": "updated", "orgsystemId": orgsystem_id})

    @action(detail=True, methods=["post"])
    def generate_threats(self, request, pk=None):
        """
        Auto-generate threats for this component based on its library type.

        Queries ComponentLibraryThreat for threats linked to the component's
        library entry and creates ComponentInstanceThreat records.

        Returns:
            - created: list of newly created threat instances
            - existing: list of threats that already existed
            - total: total threats now associated with this component
        """
        component = self.get_object()

        if not component.component_library:
            return Response(
                {"error": "Component has no library type assigned"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get threats linked to this component's library type
        library_threats = ComponentLibraryThreat.objects.filter(
            component_library=component.component_library,
        ).select_related("threat_library")

        created_threats = []
        existing_threats = []

        with transaction.atomic():
            for lib_threat in library_threats:
                instance_threat, created = ComponentInstanceThreat.objects.get_or_create(
                    component=component,
                    threat_library=lib_threat.threat_library,
                    defaults={
                        "inherent_severity": lib_threat.default_severity,
                        "status": ComponentInstanceThreat.Status.OPEN,
                    },
                )

                if created:
                    created_threats.append(instance_threat)
                else:
                    existing_threats.append(instance_threat)

        return Response({
            "created": ComponentInstanceThreatSerializer(created_threats, many=True).data,
            "existing": ComponentInstanceThreatSerializer(existing_threats, many=True).data,
            "created_count": len(created_threats),
            "existing_count": len(existing_threats),
            "total": len(created_threats) + len(existing_threats),
            "message": f"Generated {len(created_threats)} new threats, {len(existing_threats)} already existed",
        })


class DataAssetViewSet(viewsets.ModelViewSet):
    """ViewSet for DataAsset CRUD operations."""

    queryset = DataAsset.objects.all()
    serializer_class = DataAssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["classification", "confidentiality"]
    search_fields = ["name"]


class DataFlowViewSet(viewsets.ModelViewSet):
    """ViewSet for DataFlow CRUD operations."""

    serializer_class = DataFlowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["crosses_trust_boundary", "protocol"]

    def get_queryset(self):
        """Filter by user's organizations."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return DataFlow.objects.filter(
            source_component__orgsystem__organization_id__in=org_ids
        ).select_related("source_component", "dest_component")


class IntegrationSourceViewSet(viewsets.ModelViewSet):
    """ViewSet for IntegrationSource CRUD operations."""

    serializer_class = IntegrationSourceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["source_type", "status", "orgsystem"]
    search_fields = ["name"]

    def get_queryset(self):
        """Filter by user's organizations."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return IntegrationSource.objects.filter(
            orgsystem__organization_id__in=org_ids
        ).select_related("orgsystem")
