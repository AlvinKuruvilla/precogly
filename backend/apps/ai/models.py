"""Per-tenant "bring your own model" configuration.

An :class:`AIProviderConfig` is one organization's saved model endpoint: which
provider, which URL/model, and an encrypted API key. The resolver
(:mod:`apps.ai.resolver`) picks the org's enabled default before falling back to
the operator-wide ``AI_*`` settings, so orgs that configure their own model
override the deployment default without code changes.

The API key is encrypted on the way in and decrypted on the way out; callers use
:meth:`set_api_key` and the :attr:`api_key` property and never see ciphertext.
"""

from django.db import models

from apps.core.models import TimestampedModel

from .crypto import decrypt, encrypt
from .providers.base import ResolvedConfig


class AIProviderConfig(TimestampedModel):
    """An organization's configuration for one AI model endpoint."""

    class ProviderType(models.TextChoices):
        # Only OpenAI-compatible endpoints are supported today. New, non-
        # compatible providers add a value here *and* an adapter in
        # apps.ai.providers.registry — the model itself doesn't need to change
        # beyond this list.
        OPENAI_COMPAT = "openai_compat", "OpenAI-compatible"

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="ai_provider_configs",
    )
    name = models.CharField(
        max_length=255,
        help_text="Operator-facing label, e.g. 'Local LM Studio' or 'Team OpenAI'.",
    )
    provider_type = models.CharField(
        max_length=32,
        choices=ProviderType.choices,
        default=ProviderType.OPENAI_COMPAT,
    )
    base_url = models.URLField(
        help_text="OpenAI-style root exposing /chat/completions, e.g. "
        "http://localhost:1234/v1.",
    )
    model = models.CharField(
        max_length=255,
        help_text="Model name/identifier the endpoint expects.",
    )
    # Encrypted at rest via apps.ai.crypto; never read or written directly.
    # Blank means the endpoint needs no auth (typical for local servers).
    api_key_encrypted = models.TextField(blank=True, default="")
    request_timeout = models.PositiveIntegerField(
        default=60,
        help_text="Seconds to wait for the model before failing with an error.",
    )
    # The org's selected provider. The resolver uses the default; others are
    # kept as ready-to-switch alternatives.
    is_default = models.BooleanField(default=False)
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["organization_id", "name"]
        constraints = [
            # A given label is unique within an org so configs are unambiguous.
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="unique_ai_provider_name_per_org",
            ),
            # At most one default config per organization, enforced in the DB so
            # the resolver can trust there is never an ambiguous default.
            models.UniqueConstraint(
                fields=["organization"],
                condition=models.Q(is_default=True),
                name="unique_default_ai_provider_per_org",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_provider_type_display()})"

    def set_api_key(self, raw: str) -> None:
        """Encrypt and store an API key. Pass an empty string to clear it."""
        self.api_key_encrypted = encrypt(raw or "")

    @property
    def api_key(self) -> str:
        """The decrypted API key (empty when none is set)."""
        return decrypt(self.api_key_encrypted)

    def to_resolved_config(self) -> ResolvedConfig:
        """Flatten into the decrypted snapshot adapters consume."""
        return ResolvedConfig(
            provider_type=self.provider_type,
            base_url=self.base_url,
            model=self.model,
            api_key=self.api_key,
            request_timeout=self.request_timeout,
        )
