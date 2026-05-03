"""
Compliance models - frameworks, standards.
"""

from django.db import models

from apps.core.models import TimestampedModel
from apps.threats.models import CountermeasureLibrary


class StandardFramework(TimestampedModel):
    """Compliance framework (e.g., PCI-DSS, SOC2, NIST)."""

    slug = models.SlugField(max_length=100, unique=True)
    source_pack = models.ForeignKey(
        "packs.LibraryPack",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="frameworks",
    )
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=50)
    issuer = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name", "version"]

    def __str__(self):
        return f"{self.name} {self.version}"


class StandardRequirement(TimestampedModel):
    """Requirement within a compliance framework."""

    framework = models.ForeignKey(
        StandardFramework,
        on_delete=models.CASCADE,
        related_name="requirements",
    )
    section_code = models.CharField(max_length=50)
    description = models.TextField()
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )

    class Meta:
        ordering = ["framework", "section_code"]

    def __str__(self):
        return f"{self.framework.name} - {self.section_code}"


class CountermeasureLibraryStandard(models.Model):
    """Association between countermeasure and compliance requirement."""

    class Sufficiency(models.TextChoices):
        FULL = "full", "Full"
        PARTIAL = "partial", "Partial"

    countermeasure_library = models.ForeignKey(
        CountermeasureLibrary,
        on_delete=models.CASCADE,
        related_name="standard_mappings",
    )
    requirement = models.ForeignKey(
        StandardRequirement,
        on_delete=models.CASCADE,
        related_name="countermeasure_mappings",
    )
    sufficiency = models.CharField(
        max_length=10,
        choices=Sufficiency.choices,
        default=Sufficiency.PARTIAL,
    )

    class Meta:
        unique_together = ["countermeasure_library", "requirement"]

    def __str__(self):
        return f"{self.countermeasure_library} -> {self.requirement} ({self.sufficiency})"


class StandardRequirementMapping(models.Model):
    """Cross-framework mapping between two compliance requirements.

    Example: NIST CSF PR.AC-4 partially covers OWASP A01:2021.
    Used for gap analysis between compliance standards.
    """

    class Sufficiency(models.TextChoices):
        FULL = "full", "Full"
        PARTIAL = "partial", "Partial"

    from_requirement = models.ForeignKey(
        StandardRequirement,
        on_delete=models.CASCADE,
        related_name="outgoing_mappings",
    )
    to_requirement = models.ForeignKey(
        StandardRequirement,
        on_delete=models.CASCADE,
        related_name="incoming_mappings",
    )
    sufficiency = models.CharField(
        max_length=10,
        choices=Sufficiency.choices,
        default=Sufficiency.PARTIAL,
    )
    source_pack = models.ForeignKey(
        "packs.LibraryPack",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requirement_mappings",
        help_text="Pack that created this mapping, used for cleanup on pack delete",
    )

    class Meta:
        unique_together = ["from_requirement", "to_requirement"]

    def __str__(self):
        return (
            f"{self.from_requirement.framework.slug}:{self.from_requirement.section_code} "
            f"-> {self.to_requirement.framework.slug}:{self.to_requirement.section_code} "
            f"({self.sufficiency})"
        )
