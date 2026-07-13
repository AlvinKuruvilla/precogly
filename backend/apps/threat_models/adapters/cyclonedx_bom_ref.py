"""BomRefResolver — bom-ref <-> Precogly object mapping for CycloneDX 2.0."""

from collections import defaultdict

from django.utils.text import slugify


class BomRefResolver:
    """Maps CycloneDX bom-ref strings to Precogly model instances.

    Operates in two modes:
      - Export: register(entity_type, obj) -> returns generated bom-ref
      - Import: register(entity_type, bom_ref_string, obj) -> stores mapping
    """

    def __init__(self):
        self._ref_to_obj = {}  # bom-ref -> (entity_type, object)
        self._obj_to_ref = {}  # (entity_type, object_id) -> bom-ref
        self._counter = defaultdict(int)

    def register(self, entity_type, bom_ref_or_obj, obj=None):
        """Register a mapping between bom-ref and object.

        Export mode: register("asset", component) -> "asset-web-app-1"
        Import mode: register("asset", "some-ref", component) -> "some-ref"
        """
        if obj is None:
            # Export mode: generate bom-ref from object
            obj = bom_ref_or_obj
            bom_ref = self._generate_ref(entity_type, obj)
        else:
            bom_ref = bom_ref_or_obj

        self._ref_to_obj[bom_ref] = (entity_type, obj)
        obj_id = getattr(obj, "id", None) or id(obj)
        self._obj_to_ref[(entity_type, obj_id)] = bom_ref
        return bom_ref

    def resolve(self, entity_type, bom_ref):
        """Look up object by bom-ref. Returns None if not found."""
        if not bom_ref:
            return None
        entry = self._ref_to_obj.get(bom_ref)
        if entry is None:
            return None
        # Prefer typed match, but allow untyped fallback
        return entry[1]

    def get_ref(self, entity_type, obj):
        """Look up bom-ref by object. Returns None if not registered."""
        if obj is None:
            return None
        obj_id = getattr(obj, "id", None) or id(obj)
        return self._obj_to_ref.get((entity_type, obj_id))

    def _generate_ref(self, entity_type, obj):
        """Generate a deterministic, human-readable bom-ref."""
        name = getattr(obj, "name", "") or getattr(obj, "label", "") or ""
        slug = slugify(name)[:40] if name else entity_type
        self._counter[entity_type] += 1
        return f"{entity_type}-{slug}-{self._counter[entity_type]}"
