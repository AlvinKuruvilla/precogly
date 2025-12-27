from django.contrib import admin

from .models import (
    DFD,
    DFDOrgsystem,
    DFDTemplatesLibrary,
    ThreatModel,
    ThreatModelDFD,
    ThreatModelOrgsystem,
    ThreatModelRelationship,
)


@admin.register(DFDTemplatesLibrary)
class DFDTemplatesLibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "diagram_type", "organization", "maintained_by"]
    list_filter = ["category", "diagram_type"]
    search_fields = ["name", "description"]


@admin.register(ThreatModel)
class ThreatModelAdmin(admin.ModelAdmin):
    list_display = ["name", "version", "status", "organization", "created_by", "updated_at"]
    list_filter = ["status", "trigger", "organization"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ThreatModelOrgsystem)
class ThreatModelOrgsystemAdmin(admin.ModelAdmin):
    list_display = ["threat_model", "orgsystem"]
    list_filter = ["threat_model", "orgsystem"]


@admin.register(ThreatModelRelationship)
class ThreatModelRelationshipAdmin(admin.ModelAdmin):
    list_display = ["source_threat_model", "relation_type", "target_threat_model"]
    list_filter = ["relation_type"]


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
