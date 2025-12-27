from django.contrib import admin

from .models import CountermeasureLibraryStandard, StandardFramework, StandardRequirement


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
