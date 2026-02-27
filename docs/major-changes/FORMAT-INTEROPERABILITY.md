# Format Interoperability (TM-Library, TM-BOM, OTM)

**Date:** 2026-02-27
**Status:** Proposed

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

| Model | What Goes in format_metadata |
|---|---|
| ThreatModel | scope (exposure, tier), release metadata (frozen, released_at, reviewed_at, repo_link), assumptions |
| ComponentInstanceThreat | threat personas, event, sources, CAPEC refs, CWE refs |
| DataFlowInstanceThreat | Same as above |
| ComponentInstanceCountermeasure | control priority, control status (TM-Library uses different enums) |
| FlowInstanceCountermeasure | Same as above |
| Risk | TM-Library mitigation_plan data |
| DataFlow | has_sensitive_data flag |
| TrustZone (new) | TM-Library trust boundary auth details (access_control_methods, auth_methods, token TTL) |

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
| trust_zones | TrustZone (new model) | — |
| trust_boundaries | TrustBoundary (updated model) | auth details, token TTL |
| actors | OrgsystemComponent (HUMAN_ACTOR / SYSTEM_ACTOR) | actor type, permissions |
| components | OrgsystemComponent | repo_link |
| data_stores | OrgsystemComponent (DATASTORE) | vendor, product, data_store_type |
| data_sets | DataAsset + ComponentDataAsset | record_count, placements |
| data_flows | DataFlow | has_sensitive_data |
| threats | ComponentInstanceThreat | persona, event, sources, CAPEC, CWE |
| controls | ComponentInstanceCountermeasure | priority, trust_boundary ref |
| risks | Risk (new) | — |
| mitigation_plans | Derived from Risk → RiskThreat → countermeasures | — |
| assumptions | — | ThreatModel.format_metadata |
| threat_personas | — | Referenced by threat instances in their format_metadata |
| diagrams | DFD (canvas_data) | Original source format (mermaid/plantuml) |

---

## Dependencies

- RISK-TABLES.md — Risk model needed for risk/mitigation_plan mapping
- TRUST-ZONES-AND-BOUNDARIES.md — Trust zone/boundary split needed for trust_zones/trust_boundaries mapping

---

## Impact

- Add `format_metadata` JSONField to ~8 existing models (1 migration)
- New `adapters/` module with per-format import/export logic
- New API endpoints for import/export per format
- Frontend: import/export UI on threat model detail page
