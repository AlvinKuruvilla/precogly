from django.contrib import admin

from .models import (
    ComponentDataAsset,
    ComponentLibrary,
    DataAsset,
    DataFlow,
    DataFlowAsset,
    IntegrationSource,
    Orgsystem,
    OrgsystemComponent,
    TrustBoundary,
)


@admin.register(Orgsystem)
class OrgsystemAdmin(admin.ModelAdmin):
    list_display = ["name", "organization", "criticality", "lifecycle_state"]
    list_filter = ["criticality", "lifecycle_state", "organization"]
    search_fields = ["name", "owner"]


@admin.register(IntegrationSource)
class IntegrationSourceAdmin(admin.ModelAdmin):
    list_display = ["name", "orgsystem", "source_type", "status", "last_sync_at"]
    list_filter = ["source_type", "status"]
    search_fields = ["name"]


@admin.register(TrustBoundary)
class TrustBoundaryAdmin(admin.ModelAdmin):
    list_display = ["name", "trust_level", "parent"]
    list_filter = ["trust_level"]
    search_fields = ["name"]


@admin.register(ComponentLibrary)
class ComponentLibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "component_type", "provider", "organization"]
    list_filter = ["category", "provider"]
    search_fields = ["name", "component_type"]


@admin.register(OrgsystemComponent)
class OrgsystemComponentAdmin(admin.ModelAdmin):
    list_display = ["name", "orgsystem", "component_library", "trust_boundary"]
    list_filter = ["orgsystem", "trust_boundary"]
    search_fields = ["name"]


@admin.register(DataAsset)
class DataAssetAdmin(admin.ModelAdmin):
    list_display = ["name", "classification", "confidentiality", "integrity", "availability"]
    list_filter = ["classification", "confidentiality"]
    search_fields = ["name"]


@admin.register(ComponentDataAsset)
class ComponentDataAssetAdmin(admin.ModelAdmin):
    list_display = ["component", "data_asset", "data_state"]
    list_filter = ["data_state"]


@admin.register(DataFlow)
class DataFlowAdmin(admin.ModelAdmin):
    list_display = ["source_component", "dest_component", "protocol", "crosses_trust_boundary"]
    list_filter = ["crosses_trust_boundary", "protocol"]


@admin.register(DataFlowAsset)
class DataFlowAssetAdmin(admin.ModelAdmin):
    list_display = ["data_flow", "data_asset", "protection_method"]
    list_filter = ["protection_method"]
