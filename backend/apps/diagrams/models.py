"""
Diagrams models - DFDs, threat models.
"""

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.core.models import TimestampedModel
from apps.organizations.models import Organization
from apps.systems.models import Orgsystem
from apps.compliance.models import StandardFramework


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


class ThreatModel(TimestampedModel):
    """Threat model."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "inProgress", "In Progress"
        PENDING_REVIEW = "pendingReview", "Pending Review"
        APPROVED = "approved", "Approved"
        ARCHIVED = "archived", "Archived"

    class Trigger(models.TextChoices):
        NEW = "new", "New System"
        INCIDENT = "incident", "Security Incident"
        PENTEST = "pentest", "Penetration Test"
        DRIFT = "drift", "Architecture Drift"
        FEATURE_ADDITION = "feature_addition", "Feature Addition"

    class Criticality(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class ModelingMode(models.TextChoices):
        DFD_BASED = "dfdBased", "DFD-Based"
        MANUAL = "manual", "Manual Entry"
        HYBRID = "hybrid", "Hybrid (Both)"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="threat_models",
    )
    owning_team = models.ForeignKey(
        "organizations.Team",
        on_delete=models.PROTECT,
        related_name="threat_models",
        null=True,
        blank=True,
        help_text="Team that owns this threat model (nullable during migration)",
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
    criticality = models.CharField(
        max_length=20,
        choices=Criticality.choices,
        default=Criticality.MEDIUM,
    )
    previous_version = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="next_versions",
    )
    modeling_mode = models.CharField(
        max_length=20,
        choices=ModelingMode.choices,
        default=ModelingMode.DFD_BASED,
        help_text="Primary threat modeling approach for this model",
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


class ThreatModelFramework(models.Model):
    """Association between threat model and compliance framework."""

    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="framework_associations",
    )
    framework = models.ForeignKey(
        StandardFramework,
        on_delete=models.CASCADE,
        related_name="threat_model_associations",
    )

    class Meta:
        unique_together = ["threat_model", "framework"]

    def __str__(self):
        return f"{self.threat_model} - {self.framework}"


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


class ThreatModelReferenceImage(TimestampedModel):
    """Reference image for threat model (whiteboard photos, architecture diagrams, etc.)."""

    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="reference_images",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_reference_images",
    )
    image = models.ImageField(
        upload_to="reference_images/%Y/%m/",
        help_text="Reference image file (JPEG, PNG, WebP)",
    )
    filename = models.CharField(
        max_length=255,
        help_text="Original filename for display",
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description of what this image shows",
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in gallery (lower = first)",
    )

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return f"{self.filename} - {self.threat_model.name}"


@receiver(post_delete, sender=ThreatModelReferenceImage)
def delete_reference_image_file(sender, instance, **kwargs):
    """
    Delete the image file from storage when the model instance is deleted.
    """
    if instance.image:
        # Delete the file from storage
        instance.image.delete(save=False)
