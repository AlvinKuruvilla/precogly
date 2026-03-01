"""TM-Library 5x5 likelihood x impact scoring engine."""

from rest_framework.exceptions import ValidationError

from .base import BaseScoringEngine
from .registry import score_to_level

LIKELIHOOD_VALUES = {
    "rare": 1,
    "unlikely": 2,
    "possible": 3,
    "likely": 4,
    "certain": 5,
}

IMPACT_VALUES = {
    "negligible": 1,
    "minor": 2,
    "moderate": 3,
    "major": 4,
    "severe": 5,
}


class TmLibraryScoringEngine(BaseScoringEngine):
    """5x5 likelihood x impact matrix scoring."""

    def validate_inputs(self, scoring_metadata):
        likelihood = scoring_metadata.get("likelihood")
        impact = scoring_metadata.get("impact")

        if not likelihood:
            raise ValidationError({"scoring_metadata": "likelihood is required for tm_library method."})
        if not impact:
            raise ValidationError({"scoring_metadata": "impact is required for tm_library method."})
        if likelihood not in LIKELIHOOD_VALUES:
            raise ValidationError({
                "scoring_metadata": f"Invalid likelihood '{likelihood}'. Must be one of: {', '.join(LIKELIHOOD_VALUES.keys())}"
            })
        if impact not in IMPACT_VALUES:
            raise ValidationError({
                "scoring_metadata": f"Invalid impact '{impact}'. Must be one of: {', '.join(IMPACT_VALUES.keys())}"
            })

    def calculate(self, scoring_metadata):
        likelihood = scoring_metadata["likelihood"]
        impact = scoring_metadata["impact"]

        native_score = LIKELIHOOD_VALUES[likelihood] * IMPACT_VALUES[impact]
        normalized_score = round(native_score / 25 * 100)
        level = score_to_level(normalized_score)

        return normalized_score, level
