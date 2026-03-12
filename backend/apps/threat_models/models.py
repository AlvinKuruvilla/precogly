"""
Threat model domain models.
"""

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.core.models import TimestampedModel
from apps.organizations.models import Organization
from apps.systems.models import Orgsystem
from apps.compliance.models import StandardFramework


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
    risk_scoring_method = models.CharField(
        max_length=20,
        choices=[
            ("tm_library", "Likelihood x Impact (5x5 Matrix)"),
            ("fair", "FAIR"),
            ("owasp_rr", "OWASP Risk Rating"),
            ("mozilla_rra", "Mozilla Rapid Risk Assessment"),
            ("custom", "Manual Score"),
        ],
        default="tm_library",
        help_text="Scoring methodology used for all risks in this threat model",
    )
    format_metadata = models.JSONField(default=dict, blank=True)
    # Store system context, progress, etc.
    workspace_data = models.JSONField(default=dict, blank=True)
    assumptions = models.JSONField(default=list, blank=True)
    scope_locked = models.BooleanField(default=False)
    scope_locked_at = models.DateTimeField(null=True, blank=True)

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


class OutOfScopeItem(TimestampedModel):
    """Out-of-scope item for a threat model."""

    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="out_of_scope_items",
    )
    name = models.CharField(max_length=255)
    reason = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


@receiver(post_delete, sender=ThreatModelReferenceImage)
def delete_reference_image_file(sender, instance, **kwargs):
    """
    Delete the image file from storage when the model instance is deleted.
    """
    if instance.image:
        # Delete the file from storage
        instance.image.delete(save=False)
