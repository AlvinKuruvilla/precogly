"""Maps a ``provider_type`` to the adapter that implements it.

This dict is the extension point that keeps new providers from rippling through
the codebase. Today it holds a single entry; supporting AWS Bedrock or the
native Anthropic API later means writing one adapter class and adding one line
here — callers, the resolver, and the data model are untouched.
"""

from .base import AIProviderError, ChatProvider, ResolvedConfig
from .openai_compat import OpenAICompatProvider

PROVIDER_TYPES: dict[str, type[ChatProvider]] = {
    "openai_compat": OpenAICompatProvider,
}


def build_provider(config: ResolvedConfig) -> ChatProvider:
    """Instantiate the adapter for ``config.provider_type``.

    Raises :class:`AIProviderError` for an unknown type rather than failing
    obscurely later — a misconfigured ``provider_type`` is an operator error we
    want to name explicitly.
    """
    provider_cls = PROVIDER_TYPES.get(config.provider_type)
    if provider_cls is None:
        known = ", ".join(sorted(PROVIDER_TYPES)) or "(none registered)"
        raise AIProviderError(
            f"Unknown AI provider type '{config.provider_type}'. "
            f"Known types: {known}."
        )
    return provider_cls(config)
