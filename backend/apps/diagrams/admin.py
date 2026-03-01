from django.contrib import admin

from .models import DFD, DFDOrgsystem, DFDTemplatesLibrary, ThreatModelDFD


@admin.register(DFDTemplatesLibrary)
class DFDTemplatesLibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "diagram_type", "maintained_by"]
    list_filter = ["category", "diagram_type"]
    search_fields = ["name", "description"]


@admin.register(DFD)
class DFDAdmin(admin.ModelAdmin):
    list_display = ["name", "diagram_type", "updated_by", "updated_at"]
    list_filter = ["diagram_type"]
    search_fields = ["name"]


@admin.register(ThreatModelDFD)
class ThreatModelDFDAdmin(admin.ModelAdmin):
    list_display = ["threat_model", "dfd"]


@admin.register(DFDOrgsystem)
class DFDOrgsystemAdmin(admin.ModelAdmin):
    list_display = ["dfd", "orgsystem"]
