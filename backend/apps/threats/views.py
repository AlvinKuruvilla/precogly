"""
Views for threats app.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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
    pagination_class = None  # Return all items without pagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["stride_category", "source", "organization"]
    search_fields = ["name", "description", "source_id"]
    ordering_fields = ["name", "stride_category", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Return all threats in the library."""
        return ThreatLibrary.objects.all().select_related("source_pack")

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == "list":
            return ThreatLibraryListSerializer
        return ThreatLibrarySerializer


class CountermeasureLibraryViewSet(viewsets.ModelViewSet):
    """ViewSet for CountermeasureLibrary CRUD operations."""

    permission_classes = [IsAuthenticated]
    pagination_class = None  # Return all items without pagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["control_type", "cost"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "control_type", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Return all countermeasures in the library."""
        return CountermeasureLibrary.objects.all().select_related("source_pack")

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

    @action(detail=True, methods=["get"])
    def suggested_countermeasures(self, request, pk=None):
        """
        Get suggested countermeasures for this threat instance.

        Queries CountermeasureLibrary.applicable_threats to find countermeasures
        that can mitigate this threat type.

        Returns:
            - suggested: countermeasures not yet applied
            - applied: countermeasures already applied to this threat instance
        """
        instance_threat = self.get_object()
        threat_library = instance_threat.threat_library

        # Get countermeasures applicable to this threat type
        applicable_countermeasures = CountermeasureLibrary.objects.filter(
            applicable_threats=threat_library,
        )

        # Get countermeasures already applied to this instance
        applied_ids = set(
            instance_threat.countermeasures.values_list(
                "countermeasure_library_id", flat=True
            )
        )

        suggested = []
        applied = []

        for cm in applicable_countermeasures:
            if cm.id in applied_ids:
                applied.append(cm)
            else:
                suggested.append(cm)

        return Response({
            "threat_id": instance_threat.id,
            "threat_name": threat_library.name,
            "suggested": CountermeasureLibraryListSerializer(suggested, many=True).data,
            "applied": CountermeasureLibraryListSerializer(applied, many=True).data,
            "suggested_count": len(suggested),
            "applied_count": len(applied),
        })

    @action(detail=True, methods=["post"])
    def apply_countermeasure(self, request, pk=None):
        """
        Apply a suggested countermeasure to this threat instance.

        Request body:
            - countermeasure_library_id: ID of the countermeasure to apply
            - status: optional, defaults to 'gap'
        """
        instance_threat = self.get_object()
        countermeasure_id = request.data.get("countermeasure_library_id")

        if not countermeasure_id:
            return Response(
                {"error": "countermeasure_library_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            countermeasure = CountermeasureLibrary.objects.get(id=countermeasure_id)
        except CountermeasureLibrary.DoesNotExist:
            return Response(
                {"error": "Countermeasure not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create or get the instance countermeasure
        instance_cm, created = ComponentInstanceCountermeasure.objects.get_or_create(
            instance_threat=instance_threat,
            countermeasure_library=countermeasure,
            defaults={
                "status": request.data.get("status", ComponentInstanceCountermeasure.Status.GAP),
            },
        )

        if not created:
            return Response(
                {"error": "Countermeasure already applied to this threat"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Recalculate threat status
        self._recalculate_threat_status(instance_threat)

        return Response({
            "countermeasure": ComponentInstanceCountermeasureSerializer(instance_cm).data,
            "message": f"Applied countermeasure '{countermeasure.name}' to threat",
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def recalculate_status(self, request, pk=None):
        """
        Recalculate the threat status based on applied countermeasures.

        Status logic:
            - OPEN: No countermeasures applied OR all countermeasures are gaps
            - MITIGATED: All countermeasures are verified
            - OPEN (addressable): Some countermeasures planned/verified but not all
        """
        instance_threat = self.get_object()
        new_status = self._recalculate_threat_status(instance_threat)

        return Response({
            "threat_id": instance_threat.id,
            "old_status": instance_threat.status,
            "new_status": new_status,
            "message": f"Status updated to {new_status}",
        })

    def _recalculate_threat_status(self, instance_threat):
        """
        Internal method to recalculate threat status.

        Status determination:
            - MITIGATED: All applicable countermeasures verified OR accepted risk
            - OPEN: No countermeasures, all gaps, or incomplete mitigation
        """
        countermeasures = instance_threat.countermeasures.all()

        if not countermeasures.exists():
            # No countermeasures = open
            new_status = ComponentInstanceThreat.Status.OPEN
        else:
            statuses = list(countermeasures.values_list("status", flat=True))

            # All verified = mitigated
            if all(s == ComponentInstanceCountermeasure.Status.VERIFIED for s in statuses):
                new_status = ComponentInstanceThreat.Status.MITIGATED
            # All waived = accepted
            elif all(s == ComponentInstanceCountermeasure.Status.WAIVED for s in statuses):
                new_status = ComponentInstanceThreat.Status.ACCEPTED
            # Mix of verified/waived = mitigated (risk accepted for some)
            elif all(
                s in [ComponentInstanceCountermeasure.Status.VERIFIED, ComponentInstanceCountermeasure.Status.WAIVED]
                for s in statuses
            ):
                new_status = ComponentInstanceThreat.Status.MITIGATED
            else:
                # Gaps or planned = still open
                new_status = ComponentInstanceThreat.Status.OPEN

        if instance_threat.status != new_status:
            instance_threat.status = new_status
            instance_threat.save(update_fields=["status", "updated_at"])

        return new_status


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
