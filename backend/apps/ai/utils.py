"""Shared helpers for AI feature modules."""

from __future__ import annotations

import json


def extract_json_object(raw: str) -> dict | None:
    """Parse a JSON object from a possibly-noisy model response.

    Tolerates markdown fences (``````json … ``````), prose around the JSON, and
    other common noise patterns.  Returns ``None`` when nothing parseable is
    found — callers decide how to handle that (empty result, error, etc.).
    """
    if not raw:
        return None
    text = raw.strip()
    try:
        result = json.loads(text)
        return result if isinstance(result, dict) else None
    except ValueError:
        pass
    # Fall back to the substring between the first '{' and last '}'.
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        result = json.loads(text[start : end + 1])
        return result if isinstance(result, dict) else None
    except ValueError:
        return None
