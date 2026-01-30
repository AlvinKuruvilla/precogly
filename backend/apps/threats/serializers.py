"""
Serializers for threats app.
"""

from rest_framework import serializers

from .models import (
    ComponentInstanceCountermeasure,
    ComponentInstanceCountermeasureStandard,
    ComponentInstanceThreat,
    ComponentLibraryThreat,
    CountermeasureLibrary,
    DataFlowInstanceThreat,
    FlowInstanceCountermeasure,
    FlowInstanceCountermeasureStandard,
    PentestFinding,
    ThreatLibrary,
    VerificationTest,
)


class ThreatLibrarySerializer(serializers.ModelSerializer):
    """Serializer for ThreatLibrary model."""

    source_pack_name = serializers.CharField(source="source_pack.name", read_only=True)
    source_pack_slug = serializers.CharField(source="source_pack.slug", read_only=True)

    class Meta:
        model = ThreatLibrary
        fields = [
            "id",
            "name",
            "description",
            "stride_category",
            "source",
            "source_id",
            "source_pack",
            "source_pack_name",
            "source_pack_slug",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "source_pack_name", "source_pack_slug"]


class ThreatLibraryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for threat library listing."""

    source_pack_name = serializers.CharField(source="source_pack.name", read_only=True)
    source_pack_slug = serializers.CharField(source="source_pack.slug", read_only=True)

    class Meta:
        model = ThreatLibrary
        fields = ["id", "name", "stride_category", "source", "source_pack", "source_pack_name", "source_pack_slug"]


class CountermeasureLibrarySerializer(serializers.ModelSerializer):
    """Serializer for CountermeasureLibrary model."""

    source_pack_name = serializers.CharField(source="source_pack.name", read_only=True)
    source_pack_slug = serializers.CharField(source="source_pack.slug", read_only=True)

    class Meta:
        model = CountermeasureLibrary
        fields = [
            "id",
            "organization",
            "name",
            "description",
            "control_type",
            "cost",
            "source_pack",
            "source_pack_name",
            "source_pack_slug",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "source_pack_name", "source_pack_slug"]


class CountermeasureLibraryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for countermeasure library listing."""

    source_pack_name = serializers.CharField(source="source_pack.name", read_only=True)
    source_pack_slug = serializers.CharField(source="source_pack.slug", read_only=True)

    class Meta:
        model = CountermeasureLibrary
        fields = ["id", "name", "control_type", "cost", "source_pack", "source_pack_name", "source_pack_slug"]


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

    # Read fields - prefer model's own fields, fallback to threat_library
    threat_name_display = serializers.SerializerMethodField()
    stride_category_display = serializers.SerializerMethodField()
    component_name = serializers.CharField(source="component.name", read_only=True)

    # Write fields - accept threat_name and stride_category for custom threats
    threat_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    stride_category = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ComponentInstanceThreat
        fields = [
            "id",
            "component",
            "component_name",
            "threat_library",
            "threat_name",
            "threat_name_display",
            "stride_category",
            "stride_category_display",
            "inherent_severity",
            "residual_severity",
            "status",
            "justification",
            "is_dismissed",
            "dismissal_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "threat_name_display",
            "stride_category_display",
            "component_name",
        ]

    def get_threat_name_display(self, obj):
        """Return threat name from model field or threat_library."""
        if obj.threat_name:
            return obj.threat_name
        if obj.threat_library:
            return obj.threat_library.name
        return None

    def get_stride_category_display(self, obj):
        """Return stride category from model field or threat_library."""
        if obj.stride_category:
            return obj.stride_category
        if obj.threat_library:
            return obj.threat_library.stride_category
        return None


class DataFlowInstanceThreatSerializer(serializers.ModelSerializer):
    """Serializer for DataFlowInstanceThreat."""

    # Read fields - prefer model's own fields, fallback to threat_library
    threat_name_display = serializers.SerializerMethodField()
    stride_category_display = serializers.SerializerMethodField()
    flow_label = serializers.CharField(source="data_flow.label", read_only=True)

    # Write fields - accept threat_name and stride_category for custom threats
    threat_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    stride_category = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = DataFlowInstanceThreat
        fields = [
            "id",
            "data_flow",
            "flow_label",
            "threat_library",
            "threat_name",
            "threat_name_display",
            "stride_category",
            "stride_category_display",
            "inherent_severity",
            "residual_severity",
            "status",
            "is_dismissed",
            "dismissal_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "threat_name_display",
            "stride_category_display",
            "flow_label",
        ]

    def get_threat_name_display(self, obj):
        """Return threat name from model field or threat_library."""
        if obj.threat_name:
            return obj.threat_name
        if obj.threat_library:
            return obj.threat_library.name
        return None

    def get_stride_category_display(self, obj):
        """Return stride category from model field or threat_library."""
        if obj.stride_category:
            return obj.stride_category
        if obj.threat_library:
            return obj.threat_library.stride_category
        return None


class ComponentInstanceCountermeasureSerializer(serializers.ModelSerializer):
    """Serializer for ComponentInstanceCountermeasure."""

    # Read fields - prefer model's own fields, fallback to countermeasure_library
    countermeasure_name_display = serializers.SerializerMethodField()
    control_type_display = serializers.SerializerMethodField()
    verified_by_email = serializers.EmailField(
        source="verified_by.email", read_only=True
    )
    assigned_owner_email = serializers.EmailField(
        source="assigned_owner.email", read_only=True
    )

    # Write fields - accept custom countermeasure data
    countermeasure_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    countermeasure_description = serializers.CharField(required=False, allow_blank=True, write_only=True)
    control_type = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ComponentInstanceCountermeasure
        fields = [
            "id",
            "instance_threat",
            "countermeasure_library",
            "countermeasure_name",
            "countermeasure_name_display",
            "countermeasure_description",
            "control_type",
            "control_type_display",
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
            "countermeasure_name_display",
            "control_type_display",
            "verified_by_email",
            "assigned_owner_email",
        ]

    def get_countermeasure_name_display(self, obj):
        """Return countermeasure name from model field or countermeasure_library."""
        if obj.countermeasure_name:
            return obj.countermeasure_name
        if obj.countermeasure_library:
            return obj.countermeasure_library.name
        return None

    def get_control_type_display(self, obj):
        """Return control type from model field or countermeasure_library."""
        if obj.control_type:
            return obj.control_type
        if obj.countermeasure_library:
            return obj.countermeasure_library.control_type
        return None


class FlowInstanceCountermeasureSerializer(serializers.ModelSerializer):
    """Serializer for FlowInstanceCountermeasure."""

    # Read fields - prefer model's own fields, fallback to countermeasure_library
    countermeasure_name_display = serializers.SerializerMethodField()
    control_type_display = serializers.SerializerMethodField()
    verified_by_email = serializers.EmailField(
        source="verified_by.email", read_only=True
    )
    assigned_owner_email = serializers.EmailField(
        source="assigned_owner.email", read_only=True
    )

    # Write fields - accept custom countermeasure data
    countermeasure_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    countermeasure_description = serializers.CharField(required=False, allow_blank=True, write_only=True)
    control_type = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = FlowInstanceCountermeasure
        fields = [
            "id",
            "flow_threat",
            "countermeasure_library",
            "countermeasure_name",
            "countermeasure_name_display",
            "countermeasure_description",
            "control_type",
            "control_type_display",
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
            "countermeasure_name_display",
            "control_type_display",
            "verified_by_email",
            "assigned_owner_email",
        ]

    def get_countermeasure_name_display(self, obj):
        """Return countermeasure name from model field or countermeasure_library."""
        if obj.countermeasure_name:
            return obj.countermeasure_name
        if obj.countermeasure_library:
            return obj.countermeasure_library.name
        return None

    def get_control_type_display(self, obj):
        """Return control type from model field or countermeasure_library."""
        if obj.control_type:
            return obj.control_type
        if obj.countermeasure_library:
            return obj.countermeasure_library.control_type
        return None


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


class ComponentInstanceCountermeasureStandardSerializer(serializers.ModelSerializer):
    """Serializer for ComponentInstanceCountermeasureStandard (instance-level compliance mappings)."""

    framework_name = serializers.CharField(
        source="requirement.framework.name", read_only=True
    )
    framework_slug = serializers.CharField(
        source="requirement.framework.slug", read_only=True
    )
    section_code = serializers.CharField(
        source="requirement.section_code", read_only=True
    )
    requirement_description = serializers.CharField(
        source="requirement.description", read_only=True
    )

    class Meta:
        model = ComponentInstanceCountermeasureStandard
        fields = [
            "id",
            "component_countermeasure",
            "requirement",
            "framework_name",
            "framework_slug",
            "section_code",
            "requirement_description",
            "sufficiency",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "framework_name",
            "framework_slug",
            "section_code",
            "requirement_description",
        ]


class FlowInstanceCountermeasureStandardSerializer(serializers.ModelSerializer):
    """Serializer for FlowInstanceCountermeasureStandard (instance-level compliance mappings)."""

    framework_name = serializers.CharField(
        source="requirement.framework.name", read_only=True
    )
    framework_slug = serializers.CharField(
        source="requirement.framework.slug", read_only=True
    )
    section_code = serializers.CharField(
        source="requirement.section_code", read_only=True
    )
    requirement_description = serializers.CharField(
        source="requirement.description", read_only=True
    )

    class Meta:
        model = FlowInstanceCountermeasureStandard
        fields = [
            "id",
            "flow_countermeasure",
            "requirement",
            "framework_name",
            "framework_slug",
            "section_code",
            "requirement_description",
            "sufficiency",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "framework_name",
            "framework_slug",
            "section_code",
            "requirement_description",
        ]
