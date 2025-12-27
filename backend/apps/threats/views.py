"""
Views for threats app.
"""

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import (
    ComponentInstanceCountermeasure,
    ComponentInstanceThreat,
    ComponentLibraryThreat,
    CountermeasureLibrary,
    DataFlowInstanceThreat,
    FlowInstanceCountermeasure,
    PentestFinding,
    ThreatLibrary,
    VerificationTest,
)
from .serializers import (
    ComponentInstanceCountermeasureSerializer,
    ComponentInstanceThreatSerializer,
    ComponentLibraryThreatSerializer,
    CountermeasureLibraryListSerializer,
    CountermeasureLibrarySerializer,
    DataFlowInstanceThreatSerializer,
    FlowInstanceCountermeasureSerializer,
    PentestFindingSerializer,
    ThreatLibraryListSerializer,
    ThreatLibrarySerializer,
    VerificationTestSerializer,
)


class ThreatLibraryViewSet(viewsets.ModelViewSet):
    """ViewSet for ThreatLibrary CRUD operations."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["stride_category", "source", "organization"]
    search_fields = ["name", "description", "source_id"]
    ordering_fields = ["name", "stride_category", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Return threats accessible to user (global + org-specific, excluding deleted)."""
        user = self.request.user
        org_ids = list(user.organization_memberships.values_list("organization_id", flat=True))
        return ThreatLibrary.objects.filter(
            Q(organization__isnull=True) | Q(organization_id__in=org_ids),
            is_deleted=False,
        ).select_related("organization", "source_pack")

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == "list":
            return ThreatLibraryListSerializer
        return ThreatLibrarySerializer


class CountermeasureLibraryViewSet(viewsets.ModelViewSet):
    """ViewSet for CountermeasureLibrary CRUD operations."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["control_type", "cost", "organization"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "control_type", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Return countermeasures accessible to user (global + org-specific, excluding deleted)."""
        user = self.request.user
        org_ids = list(user.organization_memberships.values_list("organization_id", flat=True))
        return CountermeasureLibrary.objects.filter(
            Q(organization__isnull=True) | Q(organization_id__in=org_ids),
            is_deleted=False,
        ).select_related("organization", "source_pack")

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == "list":
            return CountermeasureLibraryListSerializer
        return CountermeasureLibrarySerializer


class ComponentLibraryThreatViewSet(viewsets.ModelViewSet):
    """ViewSet for ComponentLibraryThreat associations."""

    queryset = ComponentLibraryThreat.objects.select_related(
        "component_library", "threat_library"
    ).all()
    serializer_class = ComponentLibraryThreatSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["component_library", "threat_library", "applies_to"]


class ComponentInstanceThreatViewSet(viewsets.ModelViewSet):
    """ViewSet for ComponentInstanceThreat."""

    queryset = ComponentInstanceThreat.objects.select_related(
        "component", "threat_library"
    ).all()
    serializer_class = ComponentInstanceThreatSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["component", "threat_library", "status", "inherent_severity"]
    ordering_fields = ["inherent_severity", "status", "created_at"]
    ordering = ["-inherent_severity"]


class DataFlowInstanceThreatViewSet(viewsets.ModelViewSet):
    """ViewSet for DataFlowInstanceThreat."""

    queryset = DataFlowInstanceThreat.objects.select_related(
        "data_flow", "threat_library"
    ).all()
    serializer_class = DataFlowInstanceThreatSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["data_flow", "threat_library", "status", "inherent_severity"]
    ordering_fields = ["inherent_severity", "status", "created_at"]
    ordering = ["-inherent_severity"]


class ComponentInstanceCountermeasureViewSet(viewsets.ModelViewSet):
    """ViewSet for ComponentInstanceCountermeasure."""

    queryset = ComponentInstanceCountermeasure.objects.select_related(
        "instance_threat",
        "countermeasure_library",
        "verified_by",
        "assigned_owner",
    ).all()
    serializer_class = ComponentInstanceCountermeasureSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        "instance_threat",
        "countermeasure_library",
        "status",
        "required_for_release",
    ]


class FlowInstanceCountermeasureViewSet(viewsets.ModelViewSet):
    """ViewSet for FlowInstanceCountermeasure."""

    queryset = FlowInstanceCountermeasure.objects.select_related(
        "flow_threat",
        "countermeasure_library",
        "verified_by",
        "assigned_owner",
    ).all()
    serializer_class = FlowInstanceCountermeasureSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        "flow_threat",
        "countermeasure_library",
        "status",
        "required_for_release",
    ]


class VerificationTestViewSet(viewsets.ModelViewSet):
    """ViewSet for VerificationTest."""

    queryset = VerificationTest.objects.all()
    serializer_class = VerificationTestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["method", "passed"]
    search_fields = ["name"]


class PentestFindingViewSet(viewsets.ModelViewSet):
    """ViewSet for PentestFinding."""

    queryset = PentestFinding.objects.select_related(
        "threat_model",
        "matched_threat_library",
        "matched_component_countermeasure",
        "matched_flow_countermeasure",
    ).all()
    serializer_class = PentestFindingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["threat_model", "reconciliation_status", "severity"]
    ordering_fields = ["severity", "created_at"]
    ordering = ["-created_at"]
