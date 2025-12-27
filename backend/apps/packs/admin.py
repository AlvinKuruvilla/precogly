from django.contrib import admin

from .models import LibraryPack, LibraryPackDependency, OrganizationPackInstallation


class LibraryPackDependencyInline(admin.TabularInline):
    model = LibraryPackDependency
    fk_name = "pack"
    extra = 1
    autocomplete_fields = ["depends_on_pack"]


@admin.register(LibraryPack)
class LibraryPackAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "slug",
        "pack_type",
        "version",
        "tier",
        "source",
        "install_count",
        "is_published",
    ]
    list_filter = ["pack_type", "tier", "source", "is_published"]
    search_fields = ["name", "slug", "description", "author"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["install_count", "created_at", "updated_at"]
    inlines = [LibraryPackDependencyInline]

    fieldsets = (
        (None, {
            "fields": ("name", "slug", "description", "pack_type")
        }),
        ("Classification", {
            "fields": ("tier", "source", "version")
        }),
        ("Metadata", {
            "fields": ("author", "repository_url", "documentation_url", "icon_url")
        }),
        ("Targeting", {
            "fields": ("industries", "tags")
        }),
        ("Content", {
            "fields": ("content",),
            "classes": ("collapse",),
        }),
        ("Publishing", {
            "fields": ("is_published", "published_at", "owner_organization")
        }),
        ("Stats", {
            "fields": ("install_count", "created_at", "updated_at"),
        }),
    )


@admin.register(LibraryPackDependency)
class LibraryPackDependencyAdmin(admin.ModelAdmin):
    list_display = ["pack", "depends_on_pack", "version_constraint", "is_optional"]
    list_filter = ["is_optional"]
    search_fields = ["pack__name", "pack__slug", "depends_on_pack__name", "depends_on_pack__slug"]
    autocomplete_fields = ["pack", "depends_on_pack"]


@admin.register(OrganizationPackInstallation)
class OrganizationPackInstallationAdmin(admin.ModelAdmin):
    list_display = [
        "organization",
        "pack",
        "installed_version",
        "status",
        "installed_by",
        "installed_at",
    ]
    list_filter = ["status", "pack__pack_type", "pack__tier"]
    search_fields = ["organization__name", "pack__name"]
    readonly_fields = ["installed_at", "last_updated_at", "created_at", "updated_at"]
    raw_id_fields = ["organization", "pack", "installed_by"]
