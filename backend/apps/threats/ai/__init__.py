"""Threat-modeling AI features.

This package holds the AI logic specific to the *threats* domain. The first
feature is grounded threat *suggestions* (``suggest``): given a component, rank
and contextualize threats drawn from the installed library packs. The model
only ever selects from real pack threats — it cannot invent new ones — so a
self-hosted or low-quality model cannot inject fabricated security findings
into a model.

The generic AI plumbing (the chat client, the opt-in gate, and the typed
provider errors) lives in the standalone :mod:`apps.ai` app; this package
depends on it, not the reverse.
"""

from .suggest import suggest_component_threats

__all__ = ["suggest_component_threats"]
