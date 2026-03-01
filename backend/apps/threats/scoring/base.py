"""Abstract base class for scoring engines."""

from abc import ABC, abstractmethod


class BaseScoringEngine(ABC):
    """Base class for risk scoring engines."""

    @abstractmethod
    def validate_inputs(self, scoring_metadata):
        """Raise ValidationError if required inputs are missing or invalid."""

    @abstractmethod
    def calculate(self, scoring_metadata):
        """Returns (score: int 0-100, level: str)."""
