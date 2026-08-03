"""The stable seam between Precogly and any AI model provider.

Everything in the codebase that needs a model talks to a :class:`ChatProvider`,
never to a concrete client. That indirection is the whole point of this app:
the rest of the system depends on *this interface*, so adding a new kind of
provider later — AWS Bedrock (SigV4), the native Anthropic Messages API, native
Gemini — is a matter of writing one more adapter and registering it. No caller
changes, no migration of behavior.

A provider is constructed from a :class:`ResolvedConfig`: a flat, already-
decrypted snapshot of one model endpoint. Resolving *which* config to use (an
org's saved config vs. the operator-wide fallback) is a separate concern handled
by :mod:`apps.ai.resolver`; by the time an adapter sees a ``ResolvedConfig`` the
key is plaintext and the only job left is to make the call.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


class AIProviderError(Exception):
    """The configured AI provider could not be reached or returned an error.

    The message is safe to surface to an authenticated operator — it explains
    what to check (is the model running? is the URL right?) without leaking
    secrets.
    """


class AIDisabledError(AIProviderError):
    """No usable AI provider is configured for this context.

    Raised by the resolver when neither the organization nor the operator-wide
    fallback yields an enabled provider. Separated from the generic provider
    error so the API layer can answer with a clear "not enabled" status instead
    of looking like an outage.
    """


@dataclass(frozen=True)
class ResolvedConfig:
    """A flat, ready-to-use snapshot of one model endpoint.

    The ``api_key`` is already decrypted here — adapters never touch ciphertext
    or the database. ``provider_type`` selects which adapter the registry builds;
    for now only ``"openai_compat"`` exists.
    """

    provider_type: str
    base_url: str
    model: str
    api_key: str = ""
    request_timeout: int = 60
    # The id of the :class:`~apps.ai.models.AIProviderConfig` this snapshot came
    # from, or ``None`` for the operator-wide settings fallback. Carried so usage
    # records can link back to the saved config without re-resolving it. Adapters
    # ignore it; only the metering layer reads it.
    config_id: int | None = None


@dataclass(frozen=True)
class TokenUsage:
    """Token counts a provider reports for one completion.

    Mirrors the OpenAI ``usage`` block. ``None`` is used elsewhere (not zeros)
    to mean "the server didn't report usage", so a present :class:`TokenUsage`
    always carries real counts.
    """

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True)
class Completion:
    """The result of :meth:`ChatProvider.complete`.

    ``content`` is the assistant's message text (what every caller wants).
    ``usage`` is the token accounting when the provider reported it, else
    ``None`` — kept alongside the content so the metering layer can record spend
    without a second call, while callers that only need the text use ``content``.
    """

    content: str
    usage: "TokenUsage | None" = None


@dataclass(frozen=True)
class ProviderHealth:
    """Outcome of a :meth:`ChatProvider.test_connection` probe.

    ``ok`` answers "can we reach this model with these settings?"; ``detail`` is
    a short, operator-facing line suitable for a UI ("reachable, 3 models" or
    "connection refused — is the server running?").
    """

    ok: bool
    detail: str


class ChatProvider(ABC):
    """A model endpoint Precogly can ask for a chat completion.

    Concrete adapters translate :meth:`complete` into whatever wire protocol
    their provider speaks. The interface stays deliberately small — one
    completion call and one health probe — so that supporting a new provider is
    cheap and the dependency surface the rest of the app sees never grows.
    """

    def __init__(self, config: ResolvedConfig):
        self.config = config

    @abstractmethod
    def complete(
        self,
        messages: list[dict[str, Any]],
        *,
        temperature: float = 0.2,
        force_json: bool = True,
    ) -> "Completion":
        """Run one chat completion and return its content plus token usage.

        ``messages`` follows the OpenAI role/content shape and may include
        multimodal content parts (text, image_url) for vision-capable models.
        Raises
        :class:`AIProviderError` if the endpoint is unreachable, times out, or
        returns a response the adapter cannot parse. The returned
        :class:`Completion` carries ``usage=None`` when the provider did not
        report token counts.
        """

    def price_for(self, usage: "TokenUsage") -> Decimal | None:
        """USD cost for ``usage`` on this provider, or ``None`` when unpriced.

        The default is ``None``: self-hosted models (LM Studio, Ollama) cost the
        operator nothing measurable here, so we record tokens without a dollar
        figure. Managed adapters (Bedrock, Anthropic, …) override this with a
        model→price table — the adapter that knows the wire protocol is also the
        one that knows the prices.
        """
        return None

    @abstractmethod
    def test_connection(self) -> ProviderHealth:
        """Probe the endpoint without committing to a full completion.

        Never raises for an expected connectivity problem — those are reported
        as ``ProviderHealth(ok=False, detail=...)`` so a "test connection" UI can
        show the reason inline instead of treating it as a crash.
        """
