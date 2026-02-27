# Trust Zones and Trust Boundaries

**Date:** 2026-02-27
**Status:** Proposed

---

## Problem

Our current `TrustBoundary` model is actually a **trust zone** — it's a named region with a trust level:

```python
# Current model (misnamed)
class TrustBoundary(TimestampedModel):
    name = CharField(255)
    trust_level = IntegerField(default=50)  # 0-100
    description = TextField
    parent = FK(self)  # hierarchy
```

A **trust boundary** in standard threat modeling terminology (and in TM-Library, STRIDE, etc.) is the *edge between two zones* — where access control, authentication, and data protection policies are enforced.

We're conflating two distinct concepts:
- **Trust zone**: "Production VPC", "Public Internet", "Internal Network" (a region)
- **Trust boundary**: the crossing point between two zones (where security controls apply)

Our DFD editor and frontend also use the term "trust boundary" when they mean "trust zone."

---

## Proposal

### Rename + Add

1. **Rename** `TrustBoundary` → `TrustZone` (what it actually is)
2. **Add** a new `TrustBoundary` model for the edge between two zones

### New Models

```
TrustZone (renamed from current TrustBoundary)
  - name (CharField)
  - trust_level (IntegerField, 0-100)
  - description (TextField)
  - parent (FK → self, nullable)  # zone hierarchy

TrustBoundary (new)
  - zone_a (FK → TrustZone)
  - zone_b (FK → TrustZone)
  - description (TextField)
  - format_metadata (JSONField)  # auth methods, access control, token TTL etc.
  - unique_together: [zone_a, zone_b]
```

### What Changes

| Area | Current | After |
|---|---|---|
| Model name | `TrustBoundary` | `TrustZone` |
| New model | — | `TrustBoundary` (edge between zones) |
| OrgsystemComponent.trust_boundary FK | Points to zone | Renamed to `trust_zone`, points to TrustZone |
| DataFlow.crosses_trust_boundary | Boolean flag | Can be derived: source and dest components are in different zones |
| DFD canvas | Labels zones as "trust boundaries" | Labels corrected to "trust zones"; boundaries rendered as the edges between zones |
| Frontend terminology | "Trust Boundary" everywhere | "Trust Zone" for regions, "Trust Boundary" for crossings |

### Why format_metadata on TrustBoundary

TM-Library stores rich auth details on trust boundaries:

```json
{
  "trust_zone_a": "public",
  "trust_zone_b": "prod-zone",
  "access_control_methods": ["rbac", "acl"],
  "authentication_methods": ["sso"],
  "access_token_expires": true,
  "access_token_ttl": 3600
}
```

Rather than adding columns for every possible auth property (which varies by format), we store these in `format_metadata`. The adapter reconstructs them on export.

---

## Migration Strategy

1. Rename model `TrustBoundary` → `TrustZone` (Django `db_table` rename)
2. Rename FK `OrgsystemComponent.trust_boundary` → `OrgsystemComponent.trust_zone`
3. Create new `TrustBoundary` model
4. Update DFD canvas_data references (backend migration + frontend)
5. Update all frontend labels and API field names

---

## Impact

- 1 renamed model, 1 new model
- FK rename on OrgsystemComponent
- DFD editor updates (labels, canvas_data key names)
- Frontend: find/replace "trust boundary" → "trust zone" where referring to regions
- API: field rename (handled by djangorestframework-camel-case, but serializers need updating)
