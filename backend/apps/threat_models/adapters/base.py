"""Base adapter interface for threat model format interoperability."""

from abc import ABC, abstractmethod


class BaseAdapter(ABC):
    """Abstract base class for threat model format adapters."""

    @abstractmethod
    def import_data(self, json_data, organization, created_by):
        """Import threat model data from external format.

        Returns (threat_model, summary_dict).
        """

    @abstractmethod
    def export_data(self, threat_model):
        """Export threat model to external format.

        Returns dict suitable for JSON serialization.
        """

    @abstractmethod
    def validate(self, json_data):
        """Validate input data structure.

        Raises ValidationError if invalid.
        """
