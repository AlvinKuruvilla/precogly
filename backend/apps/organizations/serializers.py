"""
Serializers for organizations app.
"""

from rest_framework import serializers

from .models import Organization, OrganizationMember


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model."""

    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "domain",
            "plan",
            "member_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "member_count"]

    def get_member_count(self, obj):
        """Return the number of members in the organization."""
        return obj.members.count()


class OrganizationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for organization listing."""

    class Meta:
        model = Organization
        fields = ["id", "name", "plan"]


class OrganizationMemberSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationMember model."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )

    class Meta:
        model = OrganizationMember
        fields = [
            "id",
            "organization",
            "organization_name",
            "user",
            "user_email",
            "role",
            "joined_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "joined_at",
            "created_at",
            "updated_at",
            "user_email",
            "organization_name",
        ]


class OrganizationMemberListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for member listing."""

    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = OrganizationMember
        fields = ["id", "user", "user_email", "role", "joined_at"]
        read_only_fields = ["id", "joined_at", "user_email"]
