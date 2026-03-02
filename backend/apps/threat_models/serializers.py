"""
Serializers for threat_models app.
"""

from rest_framework import serializers

from .models import (
    ThreatModel,
    ThreatModelFramework,
    ThreatModelOrgsystem,
    ThreatModelReferenceImage,
    ThreatModelRelationship,
)


class ThreatModelReferenceImageSerializer(serializers.ModelSerializer):
    """Serializer for ThreatModelReferenceImage model."""

    image_url = serializers.SerializerMethodField()
    uploaded_by_email = serializers.CharField(source="uploaded_by.email", read_only=True)

    class Meta:
        model = ThreatModelReferenceImage
        fields = [
            "id",
            "threat_model",
            "image",
            "image_url",
            "filename",
            "description",
            "display_order",
            "uploaded_by",
            "uploaded_by_email",
            "created_at",
        ]
        read_only_fields = ["id", "threat_model", "uploaded_by", "created_at"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ThreatModelReferenceImageUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading reference images."""

    class Meta:
        model = ThreatModelReferenceImage
        fields = ["image", "filename", "description"]


class ThreatModelSerializer(serializers.ModelSerializer):
    """Serializer for ThreatModel model."""

    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    dfds = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    frameworks = serializers.SerializerMethodField()
    system_ids = serializers.SerializerMethodField()
    referenced_model_ids = serializers.SerializerMethodField()
    reference_images = ThreatModelReferenceImageSerializer(many=True, read_only=True)

    class Meta:
        model = ThreatModel
        fields = [
            "id",
            "name",
            "description",
            "version",
            "status",
            "trigger",
            "criticality",
            "organization",
            "created_by",
            "created_by_email",
            "owner",
            "previous_version",
            "modeling_mode",
            "workspace_data",
            "format_metadata",
            "dfds",
            "frameworks",
            "system_ids",
            "referenced_model_ids",
            "reference_images",
            "risk_scoring_method",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by_email", "owner"]

    def get_dfds(self, obj):
        """Get associated DFDs with canvas_data for threat analysis."""
        from apps.diagrams.serializers import DFDSerializer

        dfd_associations = obj.dfd_associations.select_related("dfd").all()
        return DFDSerializer([assoc.dfd for assoc in dfd_associations], many=True).data

    def get_owner(self, obj):
        """Get owner name from created_by user."""
        if obj.created_by:
            return obj.created_by.email
        return None

    def get_frameworks(self, obj):
        """Get associated framework names."""
        associations = obj.framework_associations.select_related("framework").all()
        return [assoc.framework.name for assoc in associations]

    def get_system_ids(self, obj):
        """Get associated system IDs."""
        associations = obj.orgsystem_associations.all()
        return [str(assoc.orgsystem_id) for assoc in associations]

    def get_referenced_model_ids(self, obj):
        """Get referenced threat model IDs."""
        associations = obj.outgoing_relationships.filter(
            relation_type=ThreatModelRelationship.RelationType.RELATED_TO
        ).all()
        return [str(assoc.target_threat_model_id) for assoc in associations]


class ThreatModelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for ThreatModel listing."""

    owner = serializers.SerializerMethodField()
    frameworks = serializers.SerializerMethodField()

    class Meta:
        model = ThreatModel
        fields = [
            "id",
            "name",
            "description",
            "status",
            "criticality",
            "owner",
            "frameworks",
            "risk_scoring_method",
            "created_at",
            "updated_at",
        ]

    def get_owner(self, obj):
        """Get owner email."""
        if obj.created_by:
            return obj.created_by.email
        return None

    def get_frameworks(self, obj):
        """Get associated framework names."""
        associations = obj.framework_associations.select_related("framework").all()
        return [assoc.framework.name for assoc in associations]


class ThreatModelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ThreatModel."""

    framework_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )
    system_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )
    referenced_model_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model = ThreatModel
        fields = [
            "id",
            "name",
            "description",
            "organization",
            "criticality",
            "modeling_mode",
            "framework_ids",
            "system_ids",
            "referenced_model_ids",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "organization": {"required": False},
            "criticality": {"required": False},
            "modeling_mode": {"required": False},
        }

    def create(self, validated_data):
        """Create threat model with all relationships."""
        framework_ids = validated_data.pop("framework_ids", [])
        system_ids = validated_data.pop("system_ids", [])
        referenced_model_ids = validated_data.pop("referenced_model_ids", [])

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

        # Initialize workspace_data (for system context, progress, etc.)
        # Note: Use snake_case here - middleware auto-converts to camelCase for API
        validated_data["workspace_data"] = {
            "system_context": {
                "description": "",
                "assets": [],
                "out_of_scope_items": [],
                "integrations": {},
                "uploads": {},
                "scope_locked": False,
            },
            "progress_checklist": [],
        }

        # Create the threat model
        threat_model = super().create(validated_data)

        # Create framework associations
        for framework_id in framework_ids:
            ThreatModelFramework.objects.create(
                threat_model=threat_model,
                framework_id=framework_id,
            )

        # Create system associations
        for system_id in system_ids:
            ThreatModelOrgsystem.objects.create(
                threat_model=threat_model,
                orgsystem_id=system_id,
            )

        # Create threat model references
        for ref_model_id in referenced_model_ids:
            ThreatModelRelationship.objects.create(
                source_threat_model=threat_model,
                target_threat_model_id=ref_model_id,
                relation_type=ThreatModelRelationship.RelationType.RELATED_TO,
            )

        return threat_model
