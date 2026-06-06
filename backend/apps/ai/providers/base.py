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
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        force_json: bool = True,
    ) -> str:
        """Run one chat completion and return the assistant's message content.

        ``messages`` follows the OpenAI role/content shape. Raises
        :class:`AIProviderError` if the endpoint is unreachable, times out, or
        returns a response the adapter cannot parse.
        """

    @abstractmethod
    def test_connection(self) -> ProviderHealth:
        """Probe the endpoint without committing to a full completion.

        Never raises for an expected connectivity problem — those are reported
        as ``ProviderHealth(ok=False, detail=...)`` so a "test connection" UI can
        show the reason inline instead of treating it as a crash.
        """
