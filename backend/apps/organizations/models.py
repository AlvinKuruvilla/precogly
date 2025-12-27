"""
Organization models for multi-tenancy.
"""

from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class Organization(TimestampedModel):
    """Organization/tenant model."""

    class Plan(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"
        ENTERPRISE = "enterprise", "Enterprise"

    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, blank=True)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.FREE)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OrganizationMember(TimestampedModel):
    """Organization membership with roles."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        SECURITY_TEAM = "security_team", "Security Team"
        CHAMPION = "champion", "Security Champion"
        VIEWER = "viewer", "Viewer"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["organization", "user"]
        ordering = ["organization", "user"]

    def __str__(self):
        return f"{self.user} @ {self.organization} ({self.role})"
