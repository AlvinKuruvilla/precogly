from django.contrib import admin

from .models import Organization, OrganizationMember


class OrganizationMemberInline(admin.TabularInline):
    model = OrganizationMember
    extra = 1


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "plan", "created_at"]
    list_filter = ["plan"]
    search_fields = ["name", "domain"]
    inlines = [OrganizationMemberInline]


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ["user", "organization", "role", "joined_at"]
    list_filter = ["role", "organization"]
    search_fields = ["user__email", "organization__name"]
