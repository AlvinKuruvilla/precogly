"""
Serializers for systems app.
"""

from rest_framework import serializers

from .models import (
    ComponentLibrary,
    DataAsset,
    DataFlow,
    IntegrationSource,
    Orgsystem,
    OrgsystemComponent,
    TrustBoundary,
    TrustZone,
)


class OrgsystemSerializer(serializers.ModelSerializer):
    """Serializer for Orgsystem model."""

    # Accept 'description' from frontend, map to 'owner' field
    description = serializers.CharField(
        source="owner", required=False, allow_blank=True
    )
    # Map to frontend expected fields for response
    type = serializers.SerializerMethodField()
    environment = serializers.CharField(source="lifecycle_state", read_only=True)

    class Meta:
        model = Orgsystem
        fields = [
            "id",
            "name",
            "owner",
            "description",
            "type",
            "environment",
            "criticality",
            "lifecycle_state",
            "organization",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "created_at", "updated_at"]

    def get_type(self, obj):
        """Return type for frontend compatibility."""
        return "system"

    def create(self, validated_data):
        """Auto-populate organization from the request user."""
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            # Get user's first organization membership
            membership = request.user.organization_memberships.first()
            if membership:
                validated_data["organization"] = membership.organization
            else:
                raise serializers.ValidationError(
                    {"organization": "User has no organization membership."}
                )
        return super().create(validated_data)


class OrgsystemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Orgsystem listing."""

    # Map to frontend expected fields
    type = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    environment = serializers.CharField(source="lifecycle_state")

    class Meta:
        model = Orgsystem
        fields = ["id", "name", "type", "description", "environment"]

    def get_type(self, obj):
        """Return type based on lifecycle state."""
        return "system"

    def get_description(self, obj):
        """Return owner as description for now."""
        return obj.owner or ""


class TrustZoneSerializer(serializers.ModelSerializer):
    """Serializer for TrustZone model."""

    class Meta:
        model = TrustZone
        fields = [
            "id",
            "name",
            "trust_level",
            "description",
            "parent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TrustBoundarySerializer(serializers.ModelSerializer):
    """Serializer for TrustBoundary model."""

    zone_a_name = serializers.CharField(source="zone_a.name", read_only=True)
    zone_b_name = serializers.CharField(source="zone_b.name", read_only=True)

    class Meta:
        model = TrustBoundary
        fields = [
            "id",
            "zone_a",
            "zone_a_name",
            "zone_b",
            "zone_b_name",
            "label",
            "description",
            "edge_id",
            "format_metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "zone_a_name",
            "zone_b_name",
        ]


class ComponentLibrarySerializer(serializers.ModelSerializer):
    """Serializer for ComponentLibrary model."""

    source_pack_name = serializers.CharField(source="source_pack.name", read_only=True)
    source_pack_slug = serializers.CharField(source="source_pack.slug", read_only=True)

    class Meta:
        model = ComponentLibrary
        fields = [
            "id",
            "slug",
            "qualified_slug",
            "name",
            "category",
            "component_type",
            "provider",
            "source_pack",
            "source_pack_name",
            "source_pack_slug",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "qualified_slug",
            "created_at",
            "updated_at",
            "source_pack_name",
            "source_pack_slug",
        ]


class OrgsystemComponentSerializer(serializers.ModelSerializer):
    """Serializer for OrgsystemComponent model."""

    component_library_name = serializers.CharField(
        source="component_library.name", read_only=True
    )

    class Meta:
        model = OrgsystemComponent
        fields = [
            "id",
            "name",
            "category",
            "orgsystem",
            "component_library",
            "component_library_name",
            "trust_zone",
            "source_integration",
            "threat_model",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "component_library_name"]


class DataAssetSerializer(serializers.ModelSerializer):
    """Serializer for DataAsset model."""

    class Meta:
        model = DataAsset
        fields = [
            "id",
            "name",
            "classification",
            "confidentiality",
            "integrity",
            "availability",
            "compliance_tags",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DataFlowSerializer(serializers.ModelSerializer):
    """Serializer for DataFlow model."""

    source_component_name = serializers.CharField(
        source="source_component.name", read_only=True
    )
    dest_component_name = serializers.CharField(
        source="dest_component.name", read_only=True
    )

    class Meta:
        model = DataFlow
        fields = [
            "id",
            "source_component",
            "source_component_name",
            "dest_component",
            "dest_component_name",
            "label",
            "edge_id",
            "protocol",
            "port",
            "encrypted",
            "authenticated",
            "crosses_trust_zone",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "source_component_name",
            "dest_component_name",
        ]


class IntegrationSourceSerializer(serializers.ModelSerializer):
    """Serializer for IntegrationSource model."""

    class Meta:
        model = IntegrationSource
        fields = [
            "id",
            "name",
            "source_type",
            "connection_details",
            "status",
            "last_sync_at",
            "orgsystem",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
