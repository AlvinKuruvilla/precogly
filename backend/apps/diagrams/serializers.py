"""
Serializers for diagrams app.
"""

from rest_framework import serializers

from .models import DFD, DFDTemplatesLibrary, ThreatModel, ThreatModelDFD


class DFDSerializer(serializers.ModelSerializer):
    """Serializer for DFD model."""

    updated_by_email = serializers.EmailField(source="updated_by.email", read_only=True)

    class Meta:
        model = DFD
        fields = [
            "id",
            "name",
            "diagram_type",
            "canvas_data",
            "threat_analysis_data",
            "template_library",
            "updated_by",
            "updated_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "updated_by_email"]


class DFDListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for DFD listing."""

    class Meta:
        model = DFD
        fields = ["id", "name", "diagram_type", "updated_at"]


class ThreatModelSerializer(serializers.ModelSerializer):
    """Serializer for ThreatModel model."""

    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    dfds = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()

    class Meta:
        model = ThreatModel
        fields = [
            "id",
            "name",
            "description",
            "version",
            "status",
            "trigger",
            "organization",
            "created_by",
            "created_by_email",
            "owner",
            "previous_version",
            "workspace_data",
            "dfds",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by_email", "owner"]

    def get_dfds(self, obj):
        """Get associated DFDs with canvas_data for threat analysis."""
        dfd_associations = obj.dfd_associations.select_related("dfd").all()
        return DFDSerializer([assoc.dfd for assoc in dfd_associations], many=True).data

    def get_owner(self, obj):
        """Get owner name from created_by user."""
        if obj.created_by:
            return obj.created_by.email
        return None


class ThreatModelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for ThreatModel listing."""

    owner = serializers.SerializerMethodField()
    criticality = serializers.SerializerMethodField()

    class Meta:
        model = ThreatModel
        fields = [
            "id",
            "name",
            "description",
            "status",
            "owner",
            "criticality",
            "created_at",
            "updated_at",
        ]

    def get_owner(self, obj):
        """Get owner email."""
        if obj.created_by:
            return obj.created_by.email
        return None

    def get_criticality(self, obj):
        """Get criticality from workspace_data or default."""
        return obj.workspace_data.get("criticality", "medium")


class ThreatModelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ThreatModel."""

    criticality = serializers.CharField(write_only=True, required=False, default="medium")
    frameworks = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model = ThreatModel
        fields = [
            "name",
            "description",
            "organization",
            "criticality",
            "frameworks",
        ]
        extra_kwargs = {
            "organization": {"required": False},
        }

    def create(self, validated_data):
        """Create threat model with workspace_data."""
        criticality = validated_data.pop("criticality", "medium")
        frameworks = validated_data.pop("frameworks", [])

        # Set created_by from request user
        user = self.context["request"].user
        validated_data["created_by"] = user

        # Auto-assign organization from user's first membership if not provided
        if "organization" not in validated_data or validated_data["organization"] is None:
            first_membership = user.organization_memberships.first()
            if first_membership:
                validated_data["organization"] = first_membership.organization
            else:
                raise serializers.ValidationError(
                    {"organization": "User has no organization membership."}
                )

        # Initialize workspace_data
        validated_data["workspace_data"] = {
            "criticality": criticality,
            "frameworks": frameworks,
            "systemContext": {
                "description": "",
                "assets": [],
                "outOfScopeItems": [],
                "integrations": {},
                "uploads": {},
                "scopeLocked": False,
            },
            "progressChecklist": [],
        }

        return super().create(validated_data)


class DFDTemplatesLibrarySerializer(serializers.ModelSerializer):
    """Serializer for DFD templates."""

    class Meta:
        model = DFDTemplatesLibrary
        fields = [
            "id",
            "name",
            "description",
            "category",
            "diagram_type",
            "canvas_data",
            "organization",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ThreatModelDFDSerializer(serializers.ModelSerializer):
    """Serializer for ThreatModel-DFD association."""

    class Meta:
        model = ThreatModelDFD
        fields = ["id", "threat_model", "dfd"]
