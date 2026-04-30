from django.contrib import admin

from .models import (
    CountermeasureLibraryStandard,
    StandardFramework,
    StandardRequirement,
    StandardRequirementMapping,
)


@admin.register(StandardFramework)
class StandardFrameworkAdmin(admin.ModelAdmin):
    list_display = ["name", "version", "issuer"]
    search_fields = ["name", "issuer"]


@admin.register(StandardRequirement)
class StandardRequirementAdmin(admin.ModelAdmin):
    list_display = ["framework", "section_code", "parent"]
    list_filter = ["framework"]
    search_fields = ["section_code", "description"]


@admin.register(CountermeasureLibraryStandard)
class CountermeasureLibraryStandardAdmin(admin.ModelAdmin):
    list_display = ["countermeasure_library", "requirement", "sufficiency"]
    list_filter = ["sufficiency", "requirement__framework"]


@admin.register(StandardRequirementMapping)
class StandardRequirementMappingAdmin(admin.ModelAdmin):
    list_display = ["from_requirement", "to_requirement", "sufficiency", "source_pack"]
    list_filter = ["sufficiency", "from_requirement__framework", "to_requirement__framework"]
    search_fields = [
        "from_requirement__section_code",
        "to_requirement__section_code",
    ]
