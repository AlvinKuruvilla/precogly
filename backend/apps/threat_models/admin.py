from django.contrib import admin

from .models import (
    ThreatModel,
    ThreatModelOrgsystem,
    ThreatModelReferenceImage,
    ThreatModelRelationship,
)


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


@admin.register(ThreatModelReferenceImage)
class ThreatModelReferenceImageAdmin(admin.ModelAdmin):
    list_display = ["filename", "threat_model", "uploaded_by", "display_order", "created_at"]
    list_filter = ["threat_model", "uploaded_by"]
    search_fields = ["filename", "description"]
    readonly_fields = ["created_at", "uploaded_by"]
