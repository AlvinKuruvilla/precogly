"""
Diagrams models - DFDs and DFD templates.
"""

from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel
from apps.systems.models import Orgsystem


class DFDTemplatesLibrary(TimestampedModel):
    """DFD template library."""

    class DiagramType(models.TextChoices):
        CONTEXT = "context", "Context"
        LEVEL1 = "level1", "Level 1"
        LEVEL2 = "level2", "Level 2"

    class CustomizationStatus(models.TextChoices):
        ORIGINAL = "original", "Original (from pack)"
        CUSTOMIZED = "customized", "Customized (user edited)"
        DETACHED = "detached", "Detached (unlinked from pack)"

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
    category = models.CharField(
        max_length=50,
        help_text="Freeform category (e.g., webapp, serverless, microservices)",
    )
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

    class Meta:
        verbose_name_plural = "DFD templates library"
        ordering = ["category", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["qualified_slug"],
                name="unique_dfdtemplate_qualified_slug",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.category})"

    def save(self, *args, **kwargs):
        # Auto-generate qualified_slug if not set
        if not self.qualified_slug and self.slug:
            if self.source_pack:
                self.qualified_slug = f"{self.source_pack.slug}/{self.slug}"
            else:
                self.qualified_slug = f"custom/{self.slug}"
        super().save(*args, **kwargs)


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
        "threat_models.ThreatModel",
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
