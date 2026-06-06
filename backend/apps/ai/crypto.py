"""Symmetric encryption for per-tenant provider API keys at rest.

Bringing your own model means tenants hand us a provider API key, and per-tenant
config means that key lives in our database. We never store it in the clear: a
database compromise alone should not leak customers' provider credentials. This
is straightforward Fernet (AES-CBC + HMAC) encryption keyed off ``AI_SECRET_KEY``
— deliberately *not* a full KMS. The trade-off: it protects data at rest and
keeps the secret out of query results and backups, but it is only as strong as
the host's ability to keep ``AI_SECRET_KEY`` out of the database. Rotating that
setting invalidates every stored key, which then has to be re-entered.

``AI_SECRET_KEY`` may be any sufficiently-random string; we derive a valid
32-byte Fernet key from it by hashing, so operators don't have to generate a
Fernet-format key by hand.
"""

import base64
import hashlib

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from cryptography.fernet import Fernet, InvalidToken

from .providers.base import AIProviderError


def _fernet() -> Fernet:
    secret = settings.AI_SECRET_KEY
    if not secret:
        # We only get here when someone tries to encrypt/decrypt a non-empty key
        # without a secret configured — name the fix rather than failing opaquely.
        raise ImproperlyConfigured(
            "AI_SECRET_KEY must be set to store or read encrypted AI provider "
            "API keys. Set it to a long random string in the environment."
        )
    digest = hashlib.sha256(secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plaintext: str) -> str:
    """Encrypt an API key for storage. Empty input stays empty (no key set)."""
    if not plaintext:
        return ""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    """Decrypt a stored API key. Empty input stays empty (no key set).

    Raises :class:`AIProviderError` if the ciphertext can't be decrypted, which
    in practice means ``AI_SECRET_KEY`` changed since the key was saved — an
    actionable condition (re-enter the key), not a server bug.
    """
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as err:
        raise AIProviderError(
            "A stored AI provider API key could not be decrypted. AI_SECRET_KEY "
            "may have changed; re-enter the key for this provider."
        ) from err
