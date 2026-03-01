"""Scoring method registry — maps method keys to engine classes and metadata."""


def score_to_level(score):
    """Convert 0-100 score to risk level band."""
    if score <= 25:
        return "low"
    if score <= 50:
        return "medium"
    if score <= 75:
        return "high"
    return "critical"


def _build_scoring_methods():
    """Build the scoring methods dict with lazy engine imports."""
    from .tm_library import TmLibraryScoringEngine

    return {
        "tm_library": {
            "label": "Likelihood x Impact (5x5 Matrix)",
            "description": "TM-Library compatible. Score = likelihood(1-5) x impact(1-5).",
            "metadata_schema": {
                "likelihood": {
                    "type": "enum",
                    "values": ["rare", "unlikely", "possible", "likely", "certain"],
                    "required": True,
                },
                "impact": {
                    "type": "enum",
                    "values": ["negligible", "minor", "moderate", "major", "severe"],
                    "required": True,
                },
                "impact_description": {"type": "text", "required": False},
            },
            "engine": TmLibraryScoringEngine,
        },
        "fair": {
            "label": "FAIR",
            "description": "Factor Analysis of Information Risk. Quantitative.",
            "metadata_schema": {
                "loss_event_frequency": {"type": "range", "required": True},
                "loss_magnitude": {"type": "range", "required": True},
                "threat_event_frequency": {"type": "number", "required": True},
                "vulnerability": {"type": "number", "min": 0, "max": 1, "required": True},
            },
            "engine": None,
        },
        "owasp_rr": {
            "label": "OWASP Risk Rating",
            "description": "Likelihood and impact factor groups per OWASP methodology.",
            "metadata_schema": {
                "threat_agent_factors": {"type": "object", "required": True},
                "vulnerability_factors": {"type": "object", "required": True},
                "technical_impact_factors": {"type": "object", "required": True},
                "business_impact_factors": {"type": "object", "required": True},
            },
            "engine": None,
        },
        "mozilla_rra": {
            "label": "Mozilla Rapid Risk Assessment",
            "description": "Qualitative risk assessment with data classification.",
            "metadata_schema": {
                "data_classification": {
                    "type": "enum",
                    "values": [
                        "public",
                        "confidential_internal",
                        "confidential_specific",
                        "confidential_restricted",
                    ],
                    "required": True,
                },
                "risk_impact": {"type": "object", "required": True},
            },
            "engine": None,
        },
        "custom": {
            "label": "Manual Score",
            "description": "User enters score directly. No automated calculation.",
            "metadata_schema": {
                "justification": {"type": "text", "required": False},
            },
            "engine": None,
        },
    }


_SCORING_METHODS = None


def get_scoring_methods():
    """Get the scoring methods dict (lazy-initialized)."""
    global _SCORING_METHODS
    if _SCORING_METHODS is None:
        _SCORING_METHODS = _build_scoring_methods()
    return _SCORING_METHODS


def get_scoring_methods_list():
    """Return serializable list of scoring methods for the API."""
    methods = get_scoring_methods()
    return [
        {
            "key": key,
            "label": config["label"],
            "description": config["description"],
            "metadata_schema": config["metadata_schema"],
            "available": config["engine"] is not None,
        }
        for key, config in methods.items()
    ]
