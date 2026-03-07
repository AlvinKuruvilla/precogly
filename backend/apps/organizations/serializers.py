"""
Serializers for organizations app.
"""

from rest_framework import serializers

from .models import (
    Organization,
    OrganizationMember,
    BusinessUnit,
    Team,
    TeamMembership,
    TeamInvitation,
    MagicLink,
    SharedWithMe,
)


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
            "business_unit_label",
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


class BusinessUnitSerializer(serializers.ModelSerializer):
    """Serializer for BusinessUnit model."""

    team_count = serializers.SerializerMethodField()

    class Meta:
        model = BusinessUnit
        fields = [
            "id",
            "organization",
            "name",
            "code",
            "description",
            "parent",
            "team_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "team_count"]

    def get_team_count(self, obj):
        """Return the number of teams in the business unit."""
        return obj.teams.count()


class TeamSerializer(serializers.ModelSerializer):
    """Serializer for Team model."""

    member_count = serializers.SerializerMethodField()
    business_unit_name = serializers.CharField(
        source="business_unit.name", read_only=True, allow_null=True
    )

    class Meta:
        model = Team
        fields = [
            "id",
            "organization",
            "business_unit",
            "business_unit_name",
            "name",
            "code",
            "description",
            "member_count",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "member_count",
            "business_unit_name",
        ]
        extra_kwargs = {
            "code": {"required": False, "default": ""},
            "description": {"required": False},
        }

    def get_member_count(self, obj):
        """Return the number of members in the team."""
        return obj.memberships.count()


class TeamListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for team listing."""

    member_count = serializers.SerializerMethodField()
    business_unit_name = serializers.CharField(
        source="business_unit.name", read_only=True, allow_null=True
    )

    class Meta:
        model = Team
        fields = [
            "id",
            "name",
            "code",
            "business_unit_name",
            "member_count",
            "is_default",
        ]

    def get_member_count(self, obj):
        """Return the number of members in the team."""
        return obj.memberships.count()


class TeamMembershipSerializer(serializers.ModelSerializer):
    """Serializer for TeamMembership model."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.SerializerMethodField()
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = TeamMembership
        fields = [
            "id",
            "team",
            "team_name",
            "user",
            "user_email",
            "user_name",
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
            "user_name",
            "team_name",
        ]

    def get_user_name(self, obj):
        """Return the user's full name or email."""
        if obj.user.first_name or obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return obj.user.email


class TeamInvitationSerializer(serializers.ModelSerializer):
    """Serializer for TeamInvitation model."""

    team_name = serializers.CharField(source="team.name", read_only=True)
    organization_name = serializers.CharField(
        source="team.organization.name", read_only=True
    )
    invited_by_email = serializers.EmailField(
        source="invited_by.email", read_only=True, allow_null=True
    )
    invite_url = serializers.SerializerMethodField()

    class Meta:
        model = TeamInvitation
        fields = [
            "id",
            "team",
            "team_name",
            "organization_name",
            "email",
            "role",
            "token",
            "invite_url",
            "invited_by",
            "invited_by_email",
            "status",
            "expires_at",
            "accepted_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "token",
            "invited_by",
            "invited_by_email",
            "status",
            "accepted_at",
            "created_at",
            "updated_at",
            "team_name",
            "organization_name",
            "invite_url",
        ]

    def get_invite_url(self, obj):
        """Return the invitation URL."""
        return f"/invite/{obj.token}"


class MagicLinkSerializer(serializers.ModelSerializer):
    """Serializer for MagicLink model."""

    url = serializers.SerializerMethodField()
    threat_model_name = serializers.CharField(
        source="threat_model.name", read_only=True
    )

    class Meta:
        model = MagicLink
        fields = [
            "id",
            "threat_model",
            "threat_model_name",
            "token",
            "url",
            "expires_at",
            "accessed_count",
            "is_revoked",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "token",
            "expires_at",
            "accessed_count",
            "is_revoked",
            "created_at",
            "updated_at",
            "threat_model_name",
            "url",
        ]

    def get_url(self, obj):
        """Return the magic link URL."""
        return f"/share/{obj.token}"


class SharedWithMeSerializer(serializers.ModelSerializer):
    """Serializer for SharedWithMe model - threat models shared via magic link."""

    threat_model_id = serializers.IntegerField(source="threat_model.id", read_only=True)
    threat_model_name = serializers.CharField(
        source="threat_model.name", read_only=True
    )
    threat_model_description = serializers.CharField(
        source="threat_model.description", read_only=True
    )
    threat_model_status = serializers.CharField(
        source="threat_model.status", read_only=True
    )
    threat_model_version = serializers.CharField(
        source="threat_model.version", read_only=True
    )
    organization_name = serializers.CharField(
        source="threat_model.organization.name", read_only=True
    )
    shared_by = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = SharedWithMe
        fields = [
            "id",
            "threat_model_id",
            "threat_model_name",
            "threat_model_description",
            "threat_model_status",
            "threat_model_version",
            "organization_name",
            "shared_by",
            "share_url",
            "first_accessed_at",
            "last_accessed_at",
            "access_count",
        ]
        read_only_fields = fields

    def get_shared_by(self, obj):
        """Return info about who shared the model (magic link creator)."""
        if obj.magic_link and obj.magic_link.created_by:
            return {
                "email": obj.magic_link.created_by.email,
                "name": obj.magic_link.created_by.get_full_name()
                or obj.magic_link.created_by.email,
            }
        return None

    def get_share_url(self, obj):
        """Return the magic link URL to access the shared model."""
        if obj.magic_link and obj.magic_link.is_valid():
            return f"/share/{obj.magic_link.token}"
        return None
