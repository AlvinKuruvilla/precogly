"""
Serializers for threats app.
"""

from rest_framework import serializers

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


class ThreatLibrarySerializer(serializers.ModelSerializer):
    """Serializer for ThreatLibrary model."""

    class Meta:
        model = ThreatLibrary
        fields = [
            "id",
            "organization",
            "name",
            "description",
            "stride_category",
            "source",
            "source_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ThreatLibraryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for threat library listing."""

    class Meta:
        model = ThreatLibrary
        fields = ["id", "name", "stride_category", "source"]


class CountermeasureLibrarySerializer(serializers.ModelSerializer):
    """Serializer for CountermeasureLibrary model."""

    class Meta:
        model = CountermeasureLibrary
        fields = [
            "id",
            "organization",
            "name",
            "description",
            "control_type",
            "cost",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CountermeasureLibraryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for countermeasure library listing."""

    class Meta:
        model = CountermeasureLibrary
        fields = ["id", "name", "control_type", "cost"]


class ComponentLibraryThreatSerializer(serializers.ModelSerializer):
    """Serializer for ComponentLibraryThreat associations."""

    threat_name = serializers.CharField(source="threat_library.name", read_only=True)
    component_name = serializers.CharField(
        source="component_library.name", read_only=True
    )

    class Meta:
        model = ComponentLibraryThreat
        fields = [
            "id",
            "component_library",
            "component_name",
            "threat_library",
            "threat_name",
            "default_severity",
            "applies_to",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "threat_name", "component_name"]


class ComponentInstanceThreatSerializer(serializers.ModelSerializer):
    """Serializer for ComponentInstanceThreat."""

    threat_name = serializers.CharField(source="threat_library.name", read_only=True)
    stride_category = serializers.CharField(
        source="threat_library.stride_category", read_only=True
    )
    component_name = serializers.CharField(source="component.name", read_only=True)

    class Meta:
        model = ComponentInstanceThreat
        fields = [
            "id",
            "component",
            "component_name",
            "threat_library",
            "threat_name",
            "stride_category",
            "inherent_severity",
            "residual_severity",
            "status",
            "justification",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "threat_name",
            "stride_category",
            "component_name",
        ]


class DataFlowInstanceThreatSerializer(serializers.ModelSerializer):
    """Serializer for DataFlowInstanceThreat."""

    threat_name = serializers.CharField(source="threat_library.name", read_only=True)
    stride_category = serializers.CharField(
        source="threat_library.stride_category", read_only=True
    )
    flow_label = serializers.CharField(source="data_flow.label", read_only=True)

    class Meta:
        model = DataFlowInstanceThreat
        fields = [
            "id",
            "data_flow",
            "flow_label",
            "threat_library",
            "threat_name",
            "stride_category",
            "inherent_severity",
            "residual_severity",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "threat_name",
            "stride_category",
            "flow_label",
        ]


class ComponentInstanceCountermeasureSerializer(serializers.ModelSerializer):
    """Serializer for ComponentInstanceCountermeasure."""

    countermeasure_name = serializers.CharField(
        source="countermeasure_library.name", read_only=True
    )
    verified_by_email = serializers.EmailField(
        source="verified_by.email", read_only=True
    )
    assigned_owner_email = serializers.EmailField(
        source="assigned_owner.email", read_only=True
    )

    class Meta:
        model = ComponentInstanceCountermeasure
        fields = [
            "id",
            "instance_threat",
            "countermeasure_library",
            "countermeasure_name",
            "status",
            "verified_by",
            "verified_by_email",
            "evidence_url",
            "required_for_release",
            "assigned_owner",
            "assigned_owner_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "countermeasure_name",
            "verified_by_email",
            "assigned_owner_email",
        ]


class FlowInstanceCountermeasureSerializer(serializers.ModelSerializer):
    """Serializer for FlowInstanceCountermeasure."""

    countermeasure_name = serializers.CharField(
        source="countermeasure_library.name", read_only=True
    )
    verified_by_email = serializers.EmailField(
        source="verified_by.email", read_only=True
    )
    assigned_owner_email = serializers.EmailField(
        source="assigned_owner.email", read_only=True
    )

    class Meta:
        model = FlowInstanceCountermeasure
        fields = [
            "id",
            "flow_threat",
            "countermeasure_library",
            "countermeasure_name",
            "status",
            "verified_by",
            "verified_by_email",
            "evidence_url",
            "required_for_release",
            "assigned_owner",
            "assigned_owner_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "countermeasure_name",
            "verified_by_email",
            "assigned_owner_email",
        ]


class VerificationTestSerializer(serializers.ModelSerializer):
    """Serializer for VerificationTest."""

    class Meta:
        model = VerificationTest
        fields = [
            "id",
            "name",
            "method",
            "last_run_at",
            "passed",
            "evidence",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PentestFindingSerializer(serializers.ModelSerializer):
    """Serializer for PentestFinding."""

    matched_threat_name = serializers.CharField(
        source="matched_threat_library.name", read_only=True
    )

    class Meta:
        model = PentestFinding
        fields = [
            "id",
            "threat_model",
            "finding_description",
            "severity",
            "matched_threat_library",
            "matched_threat_name",
            "matched_component_countermeasure",
            "matched_flow_countermeasure",
            "reconciliation_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "matched_threat_name"]
