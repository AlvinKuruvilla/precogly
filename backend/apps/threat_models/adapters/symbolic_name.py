"""Symbolic name resolver for TM-Library format interoperability."""


class SymbolicNameResolver:
    """Builds name→object maps during import, reverse during export."""

    def __init__(self):
        self._maps = {}

    def register(self, entity_type, symbolic_name, obj):
        if entity_type not in self._maps:
            self._maps[entity_type] = {}
        self._maps[entity_type][symbolic_name] = obj

    def resolve(self, entity_type, symbolic_name):
        return self._maps.get(entity_type, {}).get(symbolic_name)

    def resolve_any(self, symbolic_name):
        """Untyped lookup across all entity types."""
        for type_map in self._maps.values():
            if symbolic_name in type_map:
                return type_map[symbolic_name]
        return None

    def get_all(self, entity_type):
        return self._maps.get(entity_type, {})

    def reverse_map(self, entity_type):
        """Return object→symbolic_name mapping."""
        return {v: k for k, v in self._maps.get(entity_type, {}).items()}
