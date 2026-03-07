from django.contrib import admin

from .models import (
    Organization,
    OrganizationMember,
    BusinessUnit,
    Team,
    TeamMembership,
    TeamInvitation,
    MagicLink,
)


class OrganizationMemberInline(admin.TabularInline):
    model = OrganizationMember
    extra = 1


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


