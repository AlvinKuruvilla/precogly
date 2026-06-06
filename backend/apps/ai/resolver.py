"""Decide *which* provider a request should use, and build it.

This is the one place that knows the precedence rule for "bring your own model":

1. the organization's own enabled default config, if it has one;
2. otherwise the operator-wide ``AI_*`` settings, if AI is enabled there;
3. otherwise nothing — AI is off for this context.

Keeping that rule here means callers (the suggest feature, future features) ask
for "a provider for this org" and stay ignorant of tenancy, settings, and
adapters. Switching a tenant onto its own model, or changing the fallback, never
touches them.
"""

from django.conf import settings

from .providers.base import AIDisabledError, ResolvedConfig
from .providers.registry import build_provider


def settings_default_config() -> ResolvedConfig | None:
    """The operator-wide fallback provider from ``AI_*`` settings.

    Returns ``None`` when the operator hasn't enabled AI, so the resolver can
    treat "no fallback" and "no org config" uniformly. This is what keeps a
    zero-database dev setup working: set the env vars and every org inherits it.
    """
    if not settings.AI_SUGGESTIONS_ENABLED:
        return None
    return ResolvedConfig(
        provider_type="openai_compat",
        base_url=settings.AI_BASE_URL,
        model=settings.AI_MODEL,
        api_key=settings.AI_API_KEY,
        request_timeout=settings.AI_REQUEST_TIMEOUT,
    )


def resolve_config(organization) -> ResolvedConfig:
    """Return the :class:`ResolvedConfig` that should serve ``organization``.

    Raises :class:`AIDisabledError` when neither the org nor the operator
    fallback provides one — the API layer turns that into a clear "not enabled"
    response rather than an outage.
    """
    org_config = None
    if organization is not None:
        # Imported lazily so this module stays importable without the app
        # registry being ready (e.g. at settings-validation time).
        from .models import AIProviderConfig

        # The one-default-per-org constraint guarantees at most one match, so
        # .first() is unambiguous without an explicit ordering.
        org_config = AIProviderConfig.objects.filter(
            organization=organization, enabled=True, is_default=True
        ).first()

    if org_config is not None:
        return org_config.to_resolved_config()

    fallback = settings_default_config()
    if fallback is not None:
        return fallback

    raise AIDisabledError(
        "AI features are not configured for this organization. Add an AI "
        "provider, or set AI_SUGGESTIONS_ENABLED with AI_BASE_URL/AI_MODEL."
    )


def resolve_provider(organization):
    """Build a ready-to-call :class:`~apps.ai.providers.base.ChatProvider`."""
    return build_provider(resolve_config(organization))


def organization_for_component(component):
    """Find the organization that owns ``component``.

    A component reaches its org either through its system or, for analysis-only
    components, directly through its threat model — mirroring
    ``apps.core.permissions.CanWrite._get_organization``. A user may belong to
    many orgs, but a component belongs to exactly one, so this (not the caller's
    membership list) is the correct tenant for resolving a provider.
    """
    orgsystem = getattr(component, "orgsystem", None)
    if orgsystem is not None:
        return orgsystem.organization
    threat_model = getattr(component, "threat_model", None)
    if threat_model is not None:
        return threat_model.organization
    return None


def resolve_provider_for_component(component):
    """Convenience: resolve the provider for ``component``'s organization."""
    return resolve_provider(organization_for_component(component))
