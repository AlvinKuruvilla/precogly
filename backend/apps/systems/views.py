"""
Views for systems app.
"""

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

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
    filterset_fields = ["category", "provider"]
    search_fields = ["name", "component_type"]

    def get_queryset(self):
        """Get global + org-specific component library."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return ComponentLibrary.objects.filter(
            Q(organization__isnull=True) | Q(organization_id__in=org_ids)
        )


class OrgsystemComponentViewSet(viewsets.ModelViewSet):
    """ViewSet for OrgsystemComponent CRUD operations."""

    serializer_class = OrgsystemComponentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["orgsystem", "trust_boundary"]
    search_fields = ["name"]

    def get_queryset(self):
        """Filter by user's organizations."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return OrgsystemComponent.objects.filter(
            orgsystem__organization_id__in=org_ids
        ).select_related("component_library", "trust_boundary")


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
