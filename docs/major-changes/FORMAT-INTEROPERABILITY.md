# Format Interoperability (TM-Library, TM-BOM, OTM)

**Date:** 2026-02-27
**Status:** Completed (schema only — adapters, API endpoints, and UI are not yet implemented)

---

## Problem

The threat modeling industry has multiple emerging formats — OWASP TM-Library, TM-BOM, OTM (Open Threat Model) — each with overlapping but different schemas. These are moving targets. We need import/export support without coupling our database to any single format.

---

## Proposal

### Principle: Adapter Pattern + Metadata Storage

1. **Core schema stays minimalist.** It models what our product operates on (DFDs, components, threats, countermeasures, compliance).
2. **Format-specific fields live in metadata.** Each relevant model gets a `format_metadata` JSONField to store data that doesn't map to core columns but needs to survive round-trips.
3. **Adapters own format intelligence.** Each format has its own adapter that handles validation, import mapping, and export reconstruction.

### Metadata Field

Add `format_metadata = JSONField(default=dict, blank=True)` to models that carry format-specific data:

| Model | What Goes in format_metadata | Status |
|---|---|---|
| ThreatModel | scope (exposure, tier), release metadata (frozen, released_at, reviewed_at, repo_link), assumptions | Needs adding |
| OrgsystemComponent | permissions, repo_link | Needs adding |
| ComponentInstanceThreat | threat personas, event, sources, CAPEC refs, CWE refs | Needs adding |
| DataFlowInstanceThreat | Same as above | Needs adding |
| ComponentInstanceCountermeasure | control priority, control status (TM-Library uses different enums) | Needs adding |
| FlowInstanceCountermeasure | Same as above | Needs adding |
| DataAsset | record_count, placements, access_control_methods | Needs adding |
| DataFlow | ~~has_sensitive_data~~ (moved to core column, see FIELD-ADDITIONS.md) | Needs adding |
| TrustZone | TM-Library trust boundary auth details (access_control_methods, auth_methods, token TTL) | Needs adding |
| Risk | TM-Library mitigation_plan data | Already exists |
| TrustBoundary | auth details, token TTL | Already exists |

Namespaced by format:

```json
{
  "tm_library": {
    "threat_persona": "ratimir",
    "event": "denial of service",
    "sources": ["adversary"],
    "attack_mechanisms": [{"capec_id": 100, "capec_title": "Overflow Buffers"}],
    "weaknesses": [{"cwe_id": 120, "cwe_title": "Classic Buffer Overflow"}]
  }
}
```

### Adapter Architecture

```
import_tm_library(json_data, threat_model) → creates/updates DB objects
export_tm_library(threat_model) → returns TM-Library JSON

import_otm(json_data, threat_model) → creates/updates DB objects
export_otm(threat_model) → returns OTM JSON

import_tmbom(json_data, threat_model) → creates/updates DB objects
export_tmbom(threat_model) → returns TM-BOM JSON
```

Each adapter:
- Validates input against the format's schema
- Maps core fields to/from our models
- Stashes/retrieves format-specific fields in `format_metadata`
- Handles enum translation (e.g., TM-Library control status → our countermeasure status)

### What Adapters Map To Core vs. Metadata

Using TM-Library as the example:

| TM-Library Entity | Maps To (Core) | Stored in Metadata |
|---|---|---|
| scope | ThreatModel fields | exposure, tier, data_sensitivity |
| trust_zones | TrustZone | — |
| trust_boundaries | TrustBoundary | auth details, token TTL |
| actors | OrgsystemComponent (HUMAN_ACTOR / SYSTEM_ACTOR) | actor type, permissions |
| components | OrgsystemComponent | repo_link |
| data_stores | OrgsystemComponent (DATASTORE) | vendor, product, data_store_type |
| data_sets | DataAsset + ComponentDataAsset | record_count, placements |
| data_flows | DataFlow (has_sensitive_data is a core column) | — |
| threats | ComponentInstanceThreat | persona, event, sources, CAPEC, CWE |
| controls | ComponentInstanceCountermeasure | priority, trust_boundary ref |
| risks | Risk | — |
| mitigation_plans | Derived from Risk → RiskThreat → countermeasures | — |
| assumptions | — | ThreatModel.format_metadata |
| threat_personas | — | Referenced by threat instances in their format_metadata |
| diagrams | DFD (canvas_data) | Original source format (mermaid/plantuml) |

---

## Dependencies

- ~~RISK-TABLES.md~~ — Completed. Risk + RiskThreat models exist, Risk already has `format_metadata`.
- ~~TRUST-ZONES-AND-BOUNDARIES.md~~ — Completed. TrustZone + TrustBoundary models exist, TrustBoundary already has `format_metadata`.

---

## Impact

- Add `format_metadata` JSONField to ~9 models (Risk and TrustBoundary already have it; ~7 need adding), 1 migration
- New `adapters/` module with per-format import/export logic
- New API endpoints for import/export per format
- Frontend: import/export UI on threat model detail page
