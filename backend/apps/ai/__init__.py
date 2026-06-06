"""Precogly's optional AI infrastructure.

This app is the single, isolated home for the *generic* AI plumbing every
Precogly AI feature builds on: a provider abstraction with swappable adapters
(:mod:`apps.ai.providers`), per-tenant "bring your own model" configuration
(:class:`apps.ai.models.AIProviderConfig`), and a resolver that decides which
model serves a given organization.

It is deliberately domain-agnostic — nothing here imports from ``threats``,
``packs``, or any other domain app, and nothing runs unless an operator opts in
(via per-tenant config or the ``AI_*`` settings fallback). Feature-specific logic
(e.g. grounded threat *suggestions*) lives with its domain and depends on this
app, never the other way around.

The public surface is intentionally small: get a provider for an organization
from :func:`resolve_provider` / :func:`resolve_provider_for_component`, then call
``.complete(...)``; catch :class:`AIDisabledError` / :class:`AIProviderError`.
"""

from .providers.base import AIDisabledError, AIProviderError
from .resolver import (
    resolve_config,
    resolve_provider,
    resolve_provider_for_component,
)

__all__ = [
    "AIDisabledError",
    "AIProviderError",
    "resolve_config",
    "resolve_provider",
    "resolve_provider_for_component",
]
