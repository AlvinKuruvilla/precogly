"""
Diagrams models - DFDs, threat models.
"""

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.core.models import TimestampedModel
from apps.organizations.models import Organization
from apps.systems.models import Orgsystem


class DFDTemplatesLibrary(TimestampedModel):
    """DFD template library."""

    class Category(models.TextChoices):
        WEBAPP = "webapp", "Web Application"
        MICROSERVICES = "microservices", "Microservices"
        IOT = "iot", "IoT"
        API = "api", "API"
        MOBILE = "mobile", "Mobile"

    class DiagramType(models.TextChoices):
        CONTEXT = "context", "Context"
        LEVEL1 = "level1", "Level 1"
        LEVEL2 = "level2", "Level 2"

    class CustomizationStatus(models.TextChoices):
        ORIGINAL = "original", "Original (from pack)"
        CUSTOMIZED = "customized", "Customized (org edited)"
        DETACHED = "detached", "Detached (unlinked from pack)"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="dfd_templates",
        help_text="Null means global/shared",
    )
    source_pack = models.ForeignKey(
        "packs.LibraryPack",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dfd_templates",
        help_text="Pack this item came from (null = custom or legacy)",
    )
    slug = models.SlugField(
        max_length=100,
        blank=True,
        help_text="Unique identifier within pack, e.g., 'banking-webapp-l1'",
    )
    qualified_slug = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        db_index=True,
        help_text="Namespace-safe identifier, e.g., 'banking-templates/webapp-l1'",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices)
    diagram_type = models.CharField(max_length=20, choices=DiagramType.choices)
    maintained_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintained_templates",
    )
    # Store the ReactFlow JSON structure
    canvas_data = models.JSONField(default=dict, blank=True)

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

    # Soft delete (for deletion cascade handling)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "DFD templates library"
        ordering = ["category", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["qualified_slug"],
                condition=models.Q(is_deleted=False),
                name="unique_active_dfdtemplate_qualified_slug",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.category})"

    def save(self, *args, **kwargs):
        # Auto-generate qualified_slug if not set
        if not self.qualified_slug and self.slug:
            if self.source_pack:
                self.qualified_slug = f"{self.source_pack.slug}/{self.slug}"
            elif self.organization:
                self.qualified_slug = f"org-{self.organization.id}/{self.slug}"
            else:
                self.qualified_slug = f"global/{self.slug}"
        super().save(*args, **kwargs)


class ThreatModel(TimestampedModel):
    """Threat model."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "in_progress", "In Progress"
        PENDING_REVIEW = "pending_review", "Pending Review"
        APPROVED = "approved", "Approved"
        ARCHIVED = "archived", "Archived"

    class Trigger(models.TextChoices):
        NEW = "new", "New System"
        INCIDENT = "incident", "Security Incident"
        PENTEST = "pentest", "Penetration Test"
        DRIFT = "drift", "Architecture Drift"
        FEATURE_ADDITION = "feature_addition", "Feature Addition"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="threat_models",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_threat_models",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=50, default="1.0")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    trigger = models.CharField(
        max_length=20,
        choices=Trigger.choices,
        default=Trigger.NEW,
    )
    previous_version = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="next_versions",
    )
    # Store system context, progress, etc.
    workspace_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.name} (v{self.version})"


class ThreatModelOrgsystem(models.Model):
    """Association between threat model and orgsystem."""

    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="orgsystem_associations",
    )
    orgsystem = models.ForeignKey(
        Orgsystem,
        on_delete=models.CASCADE,
        related_name="threat_model_associations",
    )

    class Meta:
        unique_together = ["threat_model", "orgsystem"]

    def __str__(self):
        return f"{self.threat_model} - {self.orgsystem}"


class ThreatModelRelationship(TimestampedModel):
    """Relationship between threat models."""

    class RelationType(models.TextChoices):
        DEPENDS_ON = "depends_on", "Depends On"
        SUBSYSTEM_OF = "subsystem_of", "Subsystem Of"
        RELATED_TO = "related_to", "Related To"
        SUPERSEDED_BY = "superseded_by", "Superseded By"

    source_threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="outgoing_relationships",
    )
    target_threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="incoming_relationships",
    )
    relation_type = models.CharField(max_length=20, choices=RelationType.choices)

    class Meta:
        unique_together = ["source_threat_model", "target_threat_model", "relation_type"]

    def __str__(self):
        return f"{self.source_threat_model} {self.relation_type} {self.target_threat_model}"


class DFD(TimestampedModel):
    """Data Flow Diagram."""

    class DiagramType(models.TextChoices):
        CONTEXT = "context", "Context"
        LEVEL1 = "level1", "Level 1"
        LEVEL2 = "level2", "Level 2"

    name = models.CharField(max_length=255)
    diagram_type = models.CharField(
        max_length=20,
        choices=DiagramType.choices,
        default=DiagramType.LEVEL1,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_dfds",
    )
    template_library = models.ForeignKey(
        DFDTemplatesLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="instantiated_dfds",
    )
    # Store the ReactFlow JSON structure (nodes, edges)
    canvas_data = models.JSONField(default=dict, blank=True)
    # Store threat analysis data
    threat_analysis_data = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "DFD"
        verbose_name_plural = "DFDs"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.diagram_type})"


class ThreatModelDFD(models.Model):
    """Association between threat model and DFD."""

    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="dfd_associations",
    )
    dfd = models.ForeignKey(
        DFD,
        on_delete=models.CASCADE,
        related_name="threat_model_associations",
    )

    class Meta:
        unique_together = ["threat_model", "dfd"]

    def __str__(self):
        return f"{self.threat_model} - {self.dfd}"


class DFDOrgsystem(models.Model):
    """Association between DFD and orgsystem."""

    dfd = models.ForeignKey(
        DFD,
        on_delete=models.CASCADE,
        related_name="orgsystem_associations",
    )
    orgsystem = models.ForeignKey(
        Orgsystem,
        on_delete=models.CASCADE,
        related_name="dfd_associations",
    )

    class Meta:
        unique_together = ["dfd", "orgsystem"]

    def __str__(self):
        return f"{self.dfd} - {self.orgsystem}"
