"""
Library Packs models - Bundles of technologies, threats, countermeasures, and templates.

Packs enable:
- Community-contributed library bundles
- Industry-specific starter kits (banking, healthcare, etc.)
- Premium/partner pack monetization
- Version-controlled library updates
"""

from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.core.models import TimestampedModel


class LibraryPack(TimestampedModel):
    """
    A bundle of library items (technologies, threats, countermeasures, templates)
    that can be installed together by an organization.
    """

    class PackType(models.TextChoices):
        TECHNOLOGY = "technology", "Technology Pack"
        THREAT = "threat", "Threat Pack"
        COUNTERMEASURE = "countermeasure", "Countermeasure Pack"
        COMPLIANCE = "compliance", "Compliance Pack"
        TEMPLATE = "template", "DFD Template Pack"
        FULL = "full", "Full Stack Pack"  # Contains multiple types
        TAXONOMY = "taxonomy", "Taxonomy Pack"

    class Tier(models.TextChoices):
        FREE = "free", "Free"
        PREMIUM = "premium", "Premium"
        ENTERPRISE = "enterprise", "Enterprise"

    class Source(models.TextChoices):
        OFFICIAL = "official", "Precogly Official"
        PARTNER = "partner", "Partner"
        COMMUNITY = "community", "Community"
        PRIVATE = "private", "Private/Internal"

    # Identity
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text="Unique identifier, e.g., 'banking-technologies'",
    )
    name = models.CharField(max_length=255)
    description = models.TextField()

    # Classification
    pack_type = models.CharField(max_length=20, choices=PackType.choices)
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.FREE)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.COMMUNITY)

    # Versioning
    version = models.CharField(max_length=20, help_text="Semantic version, e.g., '1.2.0'")

    # Metadata
    author = models.CharField(max_length=255, help_text="Author or organization name")
    repository_url = models.URLField(
        blank=True,
        help_text="GitHub or registry URL for the pack source",
    )
    documentation_url = models.URLField(blank=True)
    icon_url = models.URLField(blank=True)

    # Targeting
    industries = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text="Industries this pack is relevant for, e.g., ['banking', 'fintech']",
    )
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text="Tags for search/filtering, e.g., ['aws', 'cloud', 'serverless']",
    )

    # Content - The actual items to be imported
    # This JSON contains all the library items in the pack
    content = models.JSONField(
        default=dict,
        help_text="Pack content: components, threats, countermeasures, templates, etc.",
    )

    # Note: Dependencies are managed through LibraryPackDependency model
    # for version constraint support (see below)

    # Stats
    install_count = models.PositiveIntegerField(default=0)

    # Publishing status
    is_published = models.BooleanField(
        default=False,
        help_text="Whether the pack is visible in the public registry",
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-install_count", "name"]
        verbose_name = "Library Pack"
        verbose_name_plural = "Library Packs"

    def __str__(self):
        return f"{self.name} v{self.version}"

    @property
    def is_free(self):
        return self.tier == self.Tier.FREE

    @property
    def is_official(self):
        return self.source == self.Source.OFFICIAL


class LibraryPackDependency(TimestampedModel):
    """
    Explicit dependency between packs with version constraints.

    Supports semantic versioning constraints like:
    - "^1.0.0" - Compatible with 1.x.x (>=1.0.0 <2.0.0)
    - "~1.2.0" - Compatible with 1.2.x (>=1.2.0 <1.3.0)
    - ">=2.0.0" - Greater than or equal to 2.0.0
    - ">=1.0.0 <2.0.0" - Range constraint
    - "1.5.0" - Exact version
    """

    pack = models.ForeignKey(
        LibraryPack,
        on_delete=models.CASCADE,
        related_name="dependencies",
        help_text="The pack that has the dependency",
    )
    depends_on_pack = models.ForeignKey(
        LibraryPack,
        on_delete=models.CASCADE,
        related_name="dependents",
        help_text="The pack being depended upon",
    )
    version_constraint = models.CharField(
        max_length=50,
        blank=True,
        help_text="SemVer constraint, e.g., '^1.0.0', '>=2.0.0', '~1.2.0'",
    )
    is_optional = models.BooleanField(
        default=False,
        help_text="Optional dependencies are not required for installation",
    )

    class Meta:
        unique_together = ["pack", "depends_on_pack"]
        verbose_name = "Pack Dependency"
        verbose_name_plural = "Pack Dependencies"

    def __str__(self):
        constraint = f" {self.version_constraint}" if self.version_constraint else ""
        optional = " (optional)" if self.is_optional else ""
        return f"{self.pack.slug} -> {self.depends_on_pack.slug}{constraint}{optional}"


class PendingFrameworkOverlay(TimestampedModel):
    """
    Stores framework overlays that couldn't be applied because the framework
    wasn't installed when the pack was imported.

    When a framework is later installed, pending overlays for that framework
    can be activated automatically.
    """

    pack = models.ForeignKey(
        LibraryPack,
        on_delete=models.CASCADE,
        related_name="pending_overlays",
        help_text="The pack that contains this overlay",
    )
    framework_slug = models.CharField(
        max_length=100,
        help_text="The slug of the framework this overlay maps to",
    )
    overlay_file_name = models.CharField(
        max_length=255,
        help_text="Name of the overlay file (e.g., 'countermeasures-owasp-2021.yaml')",
    )
    overlay_data = models.JSONField(
        default=dict,
        help_text="The raw overlay data from the YAML file",
    )
    mapping_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of mappings in this overlay",
    )

    class Meta:
        unique_together = ["pack", "framework_slug"]
        verbose_name = "Pending Framework Overlay"
        verbose_name_plural = "Pending Framework Overlays"
        ordering = ["pack", "framework_slug"]

    def __str__(self):
        return f"{self.pack.slug} -> {self.framework_slug} (pending)"
