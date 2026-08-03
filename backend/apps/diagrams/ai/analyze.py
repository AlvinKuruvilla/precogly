"""Step 1: Analyze an architecture image with a vision-capable model."""

from __future__ import annotations

import base64

from apps.ai.providers.base import AIProviderError
from apps.ai.resolver import resolve_provider
from apps.ai.utils import extract_json_object

from .prompts import ANALYZE_SYSTEM_PROMPT

# Keys we require in the analysis response.
_REQUIRED_KEYS = {"components", "dataFlows", "trustZones", "systemScope", "questions"}


def analyze_architecture_image(
    *,
    image_bytes: bytes,
    image_content_type: str,
    app_name: str,
    app_description: str,
    organization,
    user=None,
) -> dict:
    """Send an architecture image to a vision model and return structured analysis.

    Returns a dict with keys: components, dataFlows, trustZones, systemScope,
    questions.  Raises ``AIProviderError`` if the model cannot be reached or
    returns unparseable output (e.g. the model does not support vision).
    """
    provider = resolve_provider(
        organization, feature="generate_dfd", user=user
    )

    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    data_uri = f"data:{image_content_type};base64,{image_b64}"

    user_text = f"Application: {app_name}"
    if app_description:
        user_text += f"\nDescription: {app_description}"
    user_text += "\n\nAnalyze the architecture diagram above and extract all components, data flows, trust zones, and clarifying questions."

    messages = [
        {"role": "system", "content": ANALYZE_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": data_uri, "detail": "high"},
                },
                {"type": "text", "text": user_text},
            ],
        },
    ]

    completion = provider.complete(messages, temperature=0.3)
    result = extract_json_object(completion.content)

    if result is None:
        raise AIProviderError(
            "The AI model returned a response that could not be parsed as JSON. "
            "The model may not support vision/image inputs. Try a vision-capable "
            "model such as GPT-4o."
        )

    # Validate required keys, filling in defaults for missing ones so
    # downstream code always sees a consistent shape.
    for key in _REQUIRED_KEYS:
        if key not in result:
            result[key] = [] if key != "systemScope" else {"name": app_name, "description": app_description}

    # Ensure components is a list of dicts.
    if not isinstance(result["components"], list):
        result["components"] = []
    # Ensure dataFlows is a list.
    if not isinstance(result["dataFlows"], list):
        result["dataFlows"] = []
    # Ensure trustZones is a list.
    if not isinstance(result["trustZones"], list):
        result["trustZones"] = []
    # Ensure questions is a list.
    if not isinstance(result["questions"], list):
        result["questions"] = []
    # Ensure systemScope is a dict.
    if not isinstance(result["systemScope"], dict):
        result["systemScope"] = {"name": app_name, "description": app_description}

    return result
