from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

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

User = get_user_model()


class OrganizationMemberInline(admin.TabularInline):
    model = OrganizationMember
    extra = 1


class UserOrganizationMemberInline(admin.TabularInline):
    """Inline for OrganizationMember on the User admin page."""
    model = OrganizationMember
    extra = 0
    fields = ["organization", "role", "joined_at"]
    readonly_fields = ["joined_at"]


# Unregister the default User admin, then re-register with org role column
admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = list(BaseUserAdmin.list_display) + ["org_role"]
    inlines = list(BaseUserAdmin.inlines or []) + [UserOrganizationMemberInline]

    @admin.display(description="Org Role")
    def org_role(self, obj):
        roles = list(
            OrganizationMember.objects.filter(user=obj)
            .values_list("organization__name", "role")
        )
        if not roles:
            return "-"
        return ", ".join(f"{org}: {role}" for org, role in roles)


class TeamInline(admin.TabularInline):
    model = Team
    extra = 0
    fields = ["name", "code", "business_unit", "is_default"]


class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 1


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "plan", "business_unit_label", "created_at"]
    list_filter = ["plan"]
    search_fields = ["name", "domain"]
    inlines = [OrganizationMemberInline, TeamInline]


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ["user", "organization", "role", "joined_at"]
    list_filter = ["role", "organization"]
    search_fields = ["user__email", "organization__name"]


@admin.register(BusinessUnit)
class BusinessUnitAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "organization", "parent", "created_at"]
    list_filter = ["organization"]
    search_fields = ["name", "code"]


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "organization", "business_unit", "is_default", "created_at"]
    list_filter = ["organization", "business_unit", "is_default"]
    search_fields = ["name", "code"]
    inlines = [TeamMembershipInline]


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "team", "role", "joined_at"]
    list_filter = ["role", "team__organization"]
    search_fields = ["user__email", "team__name"]


@admin.register(TeamInvitation)
class TeamInvitationAdmin(admin.ModelAdmin):
    list_display = ["email", "team", "role", "status", "expires_at", "created_at"]
    list_filter = ["status", "team__organization"]
    search_fields = ["email", "team__name"]
    readonly_fields = ["token"]


@admin.register(MagicLink)
class MagicLinkAdmin(admin.ModelAdmin):
    list_display = ["threat_model", "created_by", "accessed_count", "is_revoked", "expires_at"]
    list_filter = ["is_revoked"]
    search_fields = ["threat_model__name"]
    readonly_fields = ["token", "accessed_count"]


@admin.register(SharedWithMe)
class SharedWithMeAdmin(admin.ModelAdmin):
    list_display = ["user", "threat_model", "access_count", "last_accessed_at"]
    list_filter = ["threat_model"]
    search_fields = ["user__email", "threat_model__name"]


