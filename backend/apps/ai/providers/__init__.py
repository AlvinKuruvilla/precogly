"""Provider abstraction: one interface, swappable adapters, a registry.

See :mod:`apps.ai.providers.base` for the :class:`ChatProvider` seam. This
package is internal to ``apps.ai``: callers obtain a provider from
:mod:`apps.ai.resolver` and import error types from ``apps.ai``, rather than
reaching into these submodules directly.
"""
