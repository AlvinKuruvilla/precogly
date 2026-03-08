"""
Threats models - threat library, countermeasures, instances.
"""

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import TimestampedModel
from apps.systems.models import ComponentLibrary, DataFlow, OrgsystemComponent


class ThreatLibrary(TimestampedModel):
    """Threat template/definition."""

    class CustomizationStatus(models.TextChoices):
        ORIGINAL = "original", "Original (from pack)"
        CUSTOMIZED = "customized", "Customized (user edited)"
        DETACHED = "detached", "Detached (unlinked from pack)"

    source_pack = models.ForeignKey(
        "packs.LibraryPack",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="threats",
        help_text="Pack this item came from (null = custom or legacy)",
    )
    slug = models.SlugField(
        max_length=100,
        blank=True,
        help_text="Unique identifier within pack, e.g., 'sql-injection'",
    )
    qualified_slug = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        db_index=True,
        help_text="Namespace-safe identifier, e.g., 'owasp-top10/sql-injection'",
    )
    name = models.CharField(max_length=255)
    description = models.TextField()

    # Customization tracking (for update vs fork handling)
    customization_status = models.CharField(
        max_length=20,
        choices=CustomizationStatus.choices,
        default=CustomizationStatus.ORIGINAL,
    )
    base_item_qualified_slug = models.CharField(
        max_length=200,
        blank=True,
        db_index=True,
        help_text="Original item this was forked/customized from",
    )

    # Backward compatibility for renamed slugs
    aliases = ArrayField(
        models.CharField(max_length=100),
        default=list,
        blank=True,
        help_text="Previous slugs for backward compatibility",
    )

    class Meta:
        verbose_name_plural = "Threat library"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["qualified_slug"],
                name="unique_threat_qualified_slug",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto-generate qualified_slug if not set
        if not self.qualified_slug and self.slug:
            if self.source_pack:
                self.qualified_slug = f"{self.source_pack.slug}/{self.slug}"
            else:
                self.qualified_slug = f"custom/{self.slug}"
        super().save(*args, **kwargs)



class ExternalTaxonomy(TimestampedModel):
    """External threat classification taxonomy (STRIDE, CAPEC, CWE, etc.)."""

    source_pack = models.ForeignKey(
        "packs.LibraryPack",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="taxonomies",
    )
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source_url = models.URLField(blank=True)
    version = models.CharField(max_length=20, blank=True)

    class Meta:
        verbose_name_plural = "External taxonomies"
        ordering = ["name"]

    def __str__(self):
        return self.name


class TaxonomyEntry(TimestampedModel):
    """Single entry within a taxonomy (e.g., STRIDE:tampering, CAPEC:66)."""

    taxonomy = models.ForeignKey(
        ExternalTaxonomy,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    external_id = models.CharField(
        max_length=100,
        help_text="Normalized ID: 'tampering', '66', 'CWE-89', 'T1059'",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ["taxonomy", "external_id"]
        ordering = ["taxonomy", "external_id"]

    def __str__(self):
        return f"{self.taxonomy.slug}:{self.external_id}"


class ThreatLibraryTaxonomyEntry(TimestampedModel):
    """M2M join: links a ThreatLibrary to one or more TaxonomyEntry records."""

    threat_library = models.ForeignKey(
        ThreatLibrary,
        on_delete=models.CASCADE,
        related_name="taxonomy_entries",
    )
    taxonomy_entry = models.ForeignKey(
        TaxonomyEntry,
        on_delete=models.CASCADE,
        related_name="threat_libraries",
    )

    class Meta:
        unique_together = ["threat_library", "taxonomy_entry"]

    def __str__(self):
        return f"{self.threat_library} -> {self.taxonomy_entry}"


class ComponentLibraryThreat(TimestampedModel):
    """Association between component library and threats."""

    class AppliesTo(models.TextChoices):
        COMPONENT = "component", "Component"
        FLOW = "flow", "Data Flow"
        BOTH = "both", "Both"

    component_library = models.ForeignKey(
        ComponentLibrary,
        on_delete=models.CASCADE,
        related_name="threats",
    )
    threat_library = models.ForeignKey(
        ThreatLibrary,
        on_delete=models.CASCADE,
        related_name="component_associations",
    )
    default_severity = models.CharField(max_length=20, default="medium")
    applies_to = models.CharField(
        max_length=20,
        choices=AppliesTo.choices,
        default=AppliesTo.COMPONENT,
    )

    class Meta:
        unique_together = ["component_library", "threat_library"]

    def __str__(self):
        return f"{self.component_library} - {self.threat_library}"


class CountermeasureLibrary(TimestampedModel):
    """Countermeasure/control template."""

    class Cost(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class CustomizationStatus(models.TextChoices):
        ORIGINAL = "original", "Original (from pack)"
        CUSTOMIZED = "customized", "Customized (user edited)"
        DETACHED = "detached", "Detached (unlinked from pack)"

    source_pack = models.ForeignKey(
        "packs.LibraryPack",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="countermeasures",
        help_text="Pack this item came from (null = custom or legacy)",
    )
    slug = models.SlugField(
        max_length=100,
        blank=True,
        help_text="Unique identifier within pack, e.g., 'encryption-at-rest'",
    )
    qualified_slug = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        db_index=True,
        help_text="Namespace-safe identifier, e.g., 'security-controls/encryption-at-rest'",
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    control_type = models.CharField(max_length=50, default="preventive")
    default_status = models.CharField(
        max_length=20,
        choices=[("gap", "Gap"), ("platform", "Platform")],
        default="gap",
    )
    cost = models.CharField(max_length=20, choices=Cost.choices, default=Cost.MEDIUM)
    applicable_threats = models.ManyToManyField(
        "ThreatLibrary",
        blank=True,
        related_name="applicable_countermeasures",
        help_text="Threats this countermeasure can mitigate",
    )

    # Customization tracking (for update vs fork handling)
    customization_status = models.CharField(
        max_length=20,
        choices=CustomizationStatus.choices,
        default=CustomizationStatus.ORIGINAL,
    )
    base_item_qualified_slug = models.CharField(
        max_length=200,
        blank=True,
        db_index=True,
        help_text="Original item this was forked/customized from",
    )

    # Backward compatibility for renamed slugs
    aliases = ArrayField(
        models.CharField(max_length=100),
        default=list,
        blank=True,
        help_text="Previous slugs for backward compatibility",
    )

    class Meta:
        verbose_name_plural = "Countermeasure library"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["qualified_slug"],
                name="unique_countermeasure_qualified_slug",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto-generate qualified_slug if not set
        if not self.qualified_slug and self.slug:
            if self.source_pack:
                self.qualified_slug = f"{self.source_pack.slug}/{self.slug}"
            else:
                self.qualified_slug = f"custom/{self.slug}"
        super().save(*args, **kwargs)


class ComponentInstanceThreat(TimestampedModel):
    """Threat instance for a specific component."""

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        EXPOSED = "exposed", "Exposed"
        ADDRESSABLE = "addressable", "Addressable"
        MITIGATED = "mitigated", "Mitigated"

    component = models.ForeignKey(
        OrgsystemComponent,
        on_delete=models.CASCADE,
        related_name="threats",
    )
    threat_library = models.ForeignKey(
        ThreatLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="component_instances",
        help_text="Null means orphaned/custom threat (library item was removed)",
    )
    inherent_severity = models.CharField(max_length=20, choices=Severity.choices)
    residual_severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.EXPOSED,
    )
    justification = models.TextField(blank=True)

    # Dismiss functionality
    is_dismissed = models.BooleanField(
        default=False,
        help_text="Dismissed threats are hidden from active view but preserved for audit",
    )
    dismissal_reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason for dismissing the threat",
    )

    format_metadata = models.JSONField(default=dict, blank=True)

    # Metadata copied from library on creation (for self-sufficiency if orphaned)
    threat_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Copied from ThreatLibrary.name on creation",
    )
    threat_description = models.TextField(
        blank=True,
        help_text="Copied from ThreatLibrary.description on creation",
    )

    class Meta:
        unique_together = ["component", "threat_library"]
        ordering = ["component", "threat_library"]

    def __str__(self):
        return f"{self.component} - {self.threat_library}"


class DataFlowInstanceThreat(TimestampedModel):
    """Threat instance for a specific data flow."""

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        EXPOSED = "exposed", "Exposed"
        ADDRESSABLE = "addressable", "Addressable"
        MITIGATED = "mitigated", "Mitigated"

    data_flow = models.ForeignKey(
        DataFlow,
        on_delete=models.CASCADE,
        related_name="threats",
    )
    threat_library = models.ForeignKey(
        ThreatLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flow_instances",
        help_text="Null means orphaned/custom threat (library item was removed)",
    )
    inherent_severity = models.CharField(max_length=20, choices=Severity.choices)
    residual_severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.EXPOSED,
    )

    # Dismiss functionality
    is_dismissed = models.BooleanField(
        default=False,
        help_text="Dismissed threats are hidden from active view but preserved for audit",
    )
    dismissal_reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason for dismissing the threat",
    )

    format_metadata = models.JSONField(default=dict, blank=True)

    # Metadata copied from library on creation (for self-sufficiency if orphaned)
    threat_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Copied from ThreatLibrary.name on creation",
    )
    threat_description = models.TextField(
        blank=True,
        help_text="Copied from ThreatLibrary.description on creation",
    )

    class Meta:
        unique_together = ["data_flow", "threat_library"]

    def __str__(self):
        return f"{self.data_flow} - {self.threat_library}"


class ComponentInstanceCountermeasure(TimestampedModel):
    """Countermeasure instance for a component threat."""

    class Status(models.TextChoices):
        GAP = "gap", "Gap"
        PLANNED = "planned", "Planned"
        VERIFIED = "verified", "Verified"
        WAIVED = "waived", "Waived"
        PLATFORM = "platform", "Platform"

    instance_threat = models.ForeignKey(
        ComponentInstanceThreat,
        on_delete=models.CASCADE,
        related_name="countermeasures",
    )
    countermeasure_library = models.ForeignKey(
        CountermeasureLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="component_instances",
        help_text="Null means orphaned/custom countermeasure (library item was removed)",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.GAP)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_component_countermeasures",
    )
    evidence_url = models.URLField(blank=True)
    required_for_release = models.BooleanField(default=False)
    assigned_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_component_countermeasures",
    )

    # Metadata copied from library on creation (for self-sufficiency if orphaned)
    countermeasure_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Copied from CountermeasureLibrary.name on creation",
    )
    countermeasure_description = models.TextField(
        blank=True,
        help_text="Copied from CountermeasureLibrary.description on creation",
    )
    control_type = models.CharField(
        max_length=20,
        blank=True,
        help_text="Copied from CountermeasureLibrary.control_type on creation",
    )
    effectiveness = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="User-assessed control effectiveness (0.0-1.0). Null = not yet assessed.",
    )
    priority = models.CharField(max_length=10, default="none", blank=True)
    format_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ["instance_threat", "countermeasure_library"]

    def __str__(self):
        return f"{self.instance_threat} - {self.countermeasure_library}"


class FlowInstanceCountermeasure(TimestampedModel):
    """Countermeasure instance for a data flow threat."""

    class Status(models.TextChoices):
        GAP = "gap", "Gap"
        PLANNED = "planned", "Planned"
        VERIFIED = "verified", "Verified"
        WAIVED = "waived", "Waived"
        PLATFORM = "platform", "Platform"

    flow_threat = models.ForeignKey(
        DataFlowInstanceThreat,
        on_delete=models.CASCADE,
        related_name="countermeasures",
    )
    countermeasure_library = models.ForeignKey(
        CountermeasureLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flow_instances",
        help_text="Null means orphaned/custom countermeasure (library item was removed)",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.GAP)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_flow_countermeasures",
    )
    evidence_url = models.URLField(blank=True)
    required_for_release = models.BooleanField(default=False)
    assigned_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_flow_countermeasures",
    )

    # Metadata copied from library on creation (for self-sufficiency if orphaned)
    countermeasure_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Copied from CountermeasureLibrary.name on creation",
    )
    countermeasure_description = models.TextField(
        blank=True,
        help_text="Copied from CountermeasureLibrary.description on creation",
    )
    control_type = models.CharField(
        max_length=20,
        blank=True,
        help_text="Copied from CountermeasureLibrary.control_type on creation",
    )
    effectiveness = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="User-assessed control effectiveness (0.0-1.0). Null = not yet assessed.",
    )
    priority = models.CharField(max_length=10, default="none", blank=True)
    format_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ["flow_threat", "countermeasure_library"]

    def __str__(self):
        return f"{self.flow_threat} - {self.countermeasure_library}"


class VerificationTest(TimestampedModel):
    """Verification test for countermeasures."""

    class Method(models.TextChoices):
        PENTEST = "pentest", "Penetration Test"
        AUTO = "auto", "Automated Scan"
        CODE_REVIEW = "code_review", "Code Review"

    name = models.CharField(max_length=255)
    method = models.CharField(max_length=20, choices=Method.choices)
    last_run_at = models.DateTimeField(null=True, blank=True)
    passed = models.BooleanField(default=False)
    evidence = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ComponentInstanceCountermeasureTest(TimestampedModel):
    """Association between component countermeasure and verification test."""

    component_countermeasure = models.ForeignKey(
        ComponentInstanceCountermeasure,
        on_delete=models.CASCADE,
        related_name="tests",
    )
    verification_test = models.ForeignKey(
        VerificationTest,
        on_delete=models.CASCADE,
        related_name="component_countermeasure_tests",
    )
    tested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["component_countermeasure", "verification_test"]
        ordering = ["-tested_at"]

    def __str__(self):
        return f"{self.component_countermeasure} - {self.verification_test}"


class FlowInstanceCountermeasureTest(TimestampedModel):
    """Association between flow countermeasure and verification test."""

    flow_countermeasure = models.ForeignKey(
        FlowInstanceCountermeasure,
        on_delete=models.CASCADE,
        related_name="tests",
    )
    verification_test = models.ForeignKey(
        VerificationTest,
        on_delete=models.CASCADE,
        related_name="flow_countermeasure_tests",
    )
    tested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["flow_countermeasure", "verification_test"]
        ordering = ["-tested_at"]

    def __str__(self):
        return f"{self.flow_countermeasure} - {self.verification_test}"


class PentestFinding(TimestampedModel):
    """Pentest finding for reconciliation."""

    class ReconciliationStatus(models.TextChoices):
        MATCHED = "matched", "Matched"
        UNPREDICTED = "unpredicted", "Unpredicted"
        FALSE_POSITIVE = "false_positive", "False Positive"

    threat_model = models.ForeignKey(
        "threat_models.ThreatModel",
        on_delete=models.CASCADE,
        related_name="pentest_findings",
    )
    finding_description = models.TextField()
    severity = models.CharField(max_length=20)
    matched_threat_library = models.ForeignKey(
        ThreatLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matched_pentest_findings",
    )
    matched_component_countermeasure = models.ForeignKey(
        ComponentInstanceCountermeasure,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pentest_findings",
    )
    matched_flow_countermeasure = models.ForeignKey(
        FlowInstanceCountermeasure,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pentest_findings",
    )
    reconciliation_status = models.CharField(
        max_length=20,
        choices=ReconciliationStatus.choices,
        default=ReconciliationStatus.UNPREDICTED,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Finding: {self.finding_description[:50]}..."


class ComponentInstanceCountermeasureStandard(TimestampedModel):
    """Instance-level compliance mapping for component countermeasures.

    Allows overriding library-level compliance mappings for specific countermeasure instances.
    Instance mappings take precedence over library mappings for the same requirement.
    """

    class Sufficiency(models.TextChoices):
        FULL = "full", "Full"
        PARTIAL = "partial", "Partial"

    component_countermeasure = models.ForeignKey(
        ComponentInstanceCountermeasure,
        on_delete=models.CASCADE,
        related_name="instance_standard_mappings",
    )
    requirement = models.ForeignKey(
        "compliance.StandardRequirement",
        on_delete=models.CASCADE,
        related_name="component_instance_countermeasure_mappings",
    )
    sufficiency = models.CharField(
        max_length=10,
        choices=Sufficiency.choices,
        default=Sufficiency.PARTIAL,
    )

    class Meta:
        unique_together = ["component_countermeasure", "requirement"]
        verbose_name = "Component countermeasure compliance mapping"
        verbose_name_plural = "Component countermeasure compliance mappings"

    def __str__(self):
        return f"{self.component_countermeasure} - {self.requirement} ({self.sufficiency})"


class FlowInstanceCountermeasureStandard(TimestampedModel):
    """Instance-level compliance mapping for flow countermeasures.

    Allows overriding library-level compliance mappings for specific countermeasure instances.
    Instance mappings take precedence over library mappings for the same requirement.
    """

    class Sufficiency(models.TextChoices):
        FULL = "full", "Full"
        PARTIAL = "partial", "Partial"

    flow_countermeasure = models.ForeignKey(
        FlowInstanceCountermeasure,
        on_delete=models.CASCADE,
        related_name="instance_standard_mappings",
    )
    requirement = models.ForeignKey(
        "compliance.StandardRequirement",
        on_delete=models.CASCADE,
        related_name="flow_instance_countermeasure_mappings",
    )
    sufficiency = models.CharField(
        max_length=10,
        choices=Sufficiency.choices,
        default=Sufficiency.PARTIAL,
    )

    class Meta:
        unique_together = ["flow_countermeasure", "requirement"]
        verbose_name = "Flow countermeasure compliance mapping"
        verbose_name_plural = "Flow countermeasure compliance mappings"

    def __str__(self):
        return f"{self.flow_countermeasure} - {self.requirement} ({self.sufficiency})"


class Risk(TimestampedModel):
    """Business-level risk that aggregates multiple threat instances."""

    class Level(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    threat_model = models.ForeignKey(
        "threat_models.ThreatModel",
        on_delete=models.CASCADE,
        related_name="risks",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    scoring_metadata = models.JSONField(default=dict)
    inherent_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    inherent_level = models.CharField(max_length=10, choices=Level.choices)
    residual_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    residual_level = models.CharField(
        max_length=10,
        choices=Level.choices,
        blank=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_risks",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_risks",
    )
    format_metadata = models.JSONField(default=dict)

    class Meta:
        ordering = ["-inherent_score"]
        constraints = [
            models.UniqueConstraint(
                fields=["threat_model", "name"],
                name="unique_risk_per_threat_model",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.inherent_level})"


class RiskThreat(TimestampedModel):
    """Junction table linking a Risk to threat instances."""

    risk = models.ForeignKey(
        Risk,
        on_delete=models.CASCADE,
        related_name="risk_threats",
    )
    component_threat = models.ForeignKey(
        ComponentInstanceThreat,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="risk_links",
    )
    flow_threat = models.ForeignKey(
        DataFlowInstanceThreat,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="risk_links",
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(component_threat__isnull=False, flow_threat__isnull=True)
                    | models.Q(component_threat__isnull=True, flow_threat__isnull=False)
                ),
                name="risk_threat_exactly_one_fk",
            ),
            models.UniqueConstraint(
                fields=["risk", "component_threat"],
                condition=models.Q(component_threat__isnull=False),
                name="unique_risk_component_threat",
            ),
            models.UniqueConstraint(
                fields=["risk", "flow_threat"],
                condition=models.Q(flow_threat__isnull=False),
                name="unique_risk_flow_threat",
            ),
        ]

    def __str__(self):
        threat = self.component_threat or self.flow_threat
        return f"{self.risk.name} <- {threat}"
