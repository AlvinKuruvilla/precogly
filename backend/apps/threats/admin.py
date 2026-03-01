from django.contrib import admin

from .models import (
    ComponentInstanceCountermeasure,
    ComponentInstanceThreat,
    ComponentLibraryThreat,
    CountermeasureLibrary,
    DataFlowInstanceThreat,
    ExternalTaxonomy,
    FlowInstanceCountermeasure,
    PentestFinding,
    Risk,
    RiskThreat,
    TaxonomyEntry,
    ThreatLibrary,
    ThreatLibraryTaxonomyEntry,
    VerificationTest,
)


@admin.register(ThreatLibrary)
class ThreatLibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "source_pack"]
    list_filter = ["source_pack"]
    search_fields = ["name", "description"]


@admin.register(ComponentLibraryThreat)
class ComponentLibraryThreatAdmin(admin.ModelAdmin):
    list_display = ["component_library", "threat_library", "default_severity", "applies_to"]
    list_filter = ["applies_to", "default_severity"]


@admin.register(CountermeasureLibrary)
class CountermeasureLibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "control_type", "cost"]
    list_filter = ["control_type", "cost"]
    search_fields = ["name", "description"]


@admin.register(ComponentInstanceThreat)
class ComponentInstanceThreatAdmin(admin.ModelAdmin):
    list_display = ["component", "threat_library", "status", "inherent_severity", "residual_severity"]
    list_filter = ["status", "inherent_severity"]


@admin.register(DataFlowInstanceThreat)
class DataFlowInstanceThreatAdmin(admin.ModelAdmin):
    list_display = ["data_flow", "threat_library", "status", "inherent_severity"]
    list_filter = ["status", "inherent_severity"]


@admin.register(ComponentInstanceCountermeasure)
class ComponentInstanceCountermeasureAdmin(admin.ModelAdmin):
    list_display = ["instance_threat", "countermeasure_library", "status", "assigned_owner"]
    list_filter = ["status", "required_for_release"]


@admin.register(FlowInstanceCountermeasure)
class FlowInstanceCountermeasureAdmin(admin.ModelAdmin):
    list_display = ["flow_threat", "countermeasure_library", "status", "assigned_owner"]
    list_filter = ["status", "required_for_release"]


@admin.register(VerificationTest)
class VerificationTestAdmin(admin.ModelAdmin):
    list_display = ["name", "method", "passed", "last_run_at"]
    list_filter = ["method", "passed"]


@admin.register(ExternalTaxonomy)
class ExternalTaxonomyAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "version"]
    search_fields = ["name", "slug"]


@admin.register(TaxonomyEntry)
class TaxonomyEntryAdmin(admin.ModelAdmin):
    list_display = ["taxonomy", "external_id", "title"]
    list_filter = ["taxonomy"]
    search_fields = ["external_id", "title"]


@admin.register(ThreatLibraryTaxonomyEntry)
class ThreatLibraryTaxonomyEntryAdmin(admin.ModelAdmin):
    list_display = ["threat_library", "taxonomy_entry"]
    list_filter = ["taxonomy_entry__taxonomy"]


@admin.register(PentestFinding)
class PentestFindingAdmin(admin.ModelAdmin):
    list_display = ["finding_description", "severity", "reconciliation_status", "threat_model"]
    list_filter = ["reconciliation_status", "severity"]


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = ["name", "threat_model", "inherent_level", "residual_level", "owner"]
    list_filter = ["inherent_level", "residual_level"]
    search_fields = ["name", "description"]


@admin.register(RiskThreat)
class RiskThreatAdmin(admin.ModelAdmin):
    list_display = ["risk", "component_threat", "flow_threat"]
    list_filter = ["risk__threat_model"]
