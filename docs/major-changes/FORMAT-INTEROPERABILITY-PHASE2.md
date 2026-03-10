# Format Interoperability — Phase 2: TM-Library Adapter

**Date:** 2026-03-10
**Status:** Not started
**Depends on:** FORMAT-INTEROPERABILITY.md (schema — completed), THREAT-SEVERITY-SCORING-METADATA.md (not started)
**Context:** Pre-release code, all existing data is test data. Single developer. Backend uses a venv (`backend/venv/`).

---

## Scope

Implement TM-Library import and export for threat models. TM-Library (OWASP Project Threat Model Library) is the current spec; it will eventually merge with TM-BOM when that spec is complete. This adapter will become the TM-BOM adapter at that point. OTM (Open Threat Model) is a separate format for future work.

**In scope:** TM-Library import adapter, export adapter, API endpoints, frontend import/export UI.
**Out of scope:** OTM (future), merge-into-existing import (future), DFD canvas generation from imported data.
**Frontend reference:** `demo/tmbom-viewer/` (misnamed — it's a Project TM-Library viewer, not TM-BOM) contains a standalone viewer with complete TypeScript types and import/export UI components. Use as reference for field mappings and UI patterns. Delete the demo folder after this work is complete.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| First format | TM-Library | Scoring engine already exists (`threats/scoring/tm_library.py`). Most field-rich format — proves the adapter pattern. |
| Import mode | New threat model only | No merge conflict resolution needed. User uploads a file → gets a new threat model. |
| Enum translation | Map to closest match + preserve original in `format_metadata` | Round-trip fidelity without blocking import on unmapped values. |
| Pack interaction | No pack linkage | Imported threats/countermeasures are standalone instances (no `*_library` FK). Keeps adapters simple and pack-agnostic. |
| Team assignment | Auto-assign to user's default team | Imported threat model is assigned to `created_by`'s default team. |
| Multi-threat controls | Duplicate per threat | A TM-Library control referencing N threats creates N countermeasure instances (same name/description/status, different `instance_threat` FK). Export re-merges by `symbolic_name`. This aligns with Precogly's per-threat assessment model (effectiveness, status, owner are per-threat properties). |
| Flow threat routing | Route by entity type | `components_affected` referencing data flows → `DataFlowInstanceThreat`. Referencing components/actors/data_stores → `ComponentInstanceThreat`. Assume TM-Library schema gaps will be fixed upstream. |

---

## Conceptual Model Mismatch: Severity vs. Risk

TM-Library and Precogly model threat severity and risk differently. This is the most important conceptual gap the adapter must handle.

**TM-Library:** No concept of per-threat severity. Threats are unscored descriptors (title, description, CAPEC/CWE, persona). All scoring (likelihood × impact → score, level) lives on `risks`, which reference one or more threats. When a risk references a single threat, likelihood × impact is effectively that threat's severity assessment — but TM-Library calls it a "risk."

**Precogly:** Separates the two concepts:
- **Severity** — per-threat, per-component assessment. `ComponentInstanceThreat.inherent_severity` (low/medium/high/critical) evaluates how severe this specific threat is to this specific component. Set directly, not computed.
- **Risk** — business-level aggregate in the Risk Analysis module. `Risk` groups multiple threats via `RiskThreat`, scored using a configurable methodology (likelihood × impact, FAIR, OWASP RR, etc.) set at the ThreatModel level.

**Adapter implications:**

| Direction | Handling |
|---|---|
| **Import** | TM-Library threats arrive with no severity. Set `inherent_severity` to a default (see threat mapping below). TM-Library risks import cleanly as Precogly Risks with RiskThreat linkages and likelihood × impact scoring. |
| **Export** | Precogly's per-threat `inherent_severity` has no place in the TM-Library schema — it is not exported. Risks export with likelihood/impact from `scoring_metadata` (if `risk_scoring_method == "tm_library"`). |

---

## TM-Library ↔ Precogly Field Mapping

Reference: TM-Library JSON schema (`docs/TM-FORMATS/Project-TM-Library/threat-model.schema.json`).

### Import Mapping (TM-Library → Precogly)

**Top-level → ThreatModel**

| TM-Library Field | Precogly Field | Notes |
|---|---|---|
| `scope.title` | `name` | |
| `scope.description` / `description` | `description` | |
| `scope.business_criticality` | `criticality` | Map: minimal/low→low, moderate→medium, high→high, maximal→critical |
| `scope.exposure` | `format_metadata.tm_library.exposure` | No core column |
| `scope.tier` | `format_metadata.tm_library.tier` | No core column |
| `scope.data_sensitivity` | `format_metadata.tm_library.scope_data_sensitivity` | Scope-level, distinct from per-asset DataAsset.data_sensitivity |
| `frozen` | `scope_locked` | |
| `released_at`, `reviewed_at`, `repo_link` | `format_metadata.tm_library.*` | |
| `assumptions` | `format_metadata.tm_library.assumptions` | |
| — | `risk_scoring_method` | Set to `"tm_library"` |
| — | `status` | Set to `"draft"` |
| — | `modeling_mode` | Set to `"manual"` (no DFD canvas generated) |

**trust_zones → TrustZone**

| TM-Library Field | Precogly Field |
|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` |
| `title` | `name` |
| `description` | `description` |

**trust_boundaries → TrustBoundary**

| TM-Library Field | Precogly Field |
|---|---|
| `trust_zone_a` | `zone_a` (FK, resolved via symbolic_name) |
| `trust_zone_b` | `zone_b` (FK, resolved via symbolic_name) |
| `access_control_methods` | `format_metadata.tm_library.access_control_methods` |
| `authentication_methods` | `format_metadata.tm_library.authentication_methods` |
| `access_token_*`, `refresh_token_*`, `can_*_logout` | `format_metadata.tm_library.*` |

**actors → OrgsystemComponent**

| TM-Library Field | Precogly Field |
|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` |
| `title` | `name` |
| `description` | `description` |
| `type` | `actor_type` (core column) |
| `permissions` | `format_metadata.tm_library.permissions` |
| `trust_zone` | `trust_zone` (FK, resolved via symbolic_name) |
| — | `category` | Set to `"human_actor"` or `"system_actor"` based on `type` |

Actor type → category mapping: `user`, `power_user`, `administrator`, `engineer`, `third_party`, `customer` → `human_actor`. `system`, `api`, `legacy`, `partner`, `saas` → `system_actor`. Unknown values → store original in `format_metadata`, default to `system_actor`.

**components → OrgsystemComponent**

| TM-Library Field | Precogly Field |
|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` |
| `title` | `name` |
| `description` | `description` |
| `parent_component` | `parent_component` (FK, resolved via symbolic_name) |
| `trust_zone` | `trust_zone` (FK, resolved via symbolic_name) |
| `repo_link` | `format_metadata.tm_library.repo_link` |
| — | `category` | Set to `"process"` |

**data_stores → OrgsystemComponent**

| TM-Library Field | Precogly Field |
|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` |
| `title` | `name` |
| `description` | `description` |
| `type` | `data_store_type` (core column) |
| `vendor` | `format_metadata.tm_library.vendor` |
| `product` | `format_metadata.tm_library.product` |
| `trust_zone` | `trust_zone` (FK, resolved via symbolic_name) |
| — | `category` | Set to `"datastore"` |

**data_sets → DataAsset + ComponentDataAsset**

| TM-Library Field | Precogly Field |
|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` |
| `title` | `name` |
| `description` | `description` |
| `data_sensitivity` | `data_sensitivity` (core JSONField) |
| `access_control_methods` | `format_metadata.tm_library.access_control_methods` |
| `record_count` | `format_metadata.tm_library.record_count` |
| `placements[].data_store` | Creates ComponentDataAsset (FK → component resolved via symbolic_name) |
| `placements[].encrypted` | `ComponentDataAsset.encrypted` |

**data_flows → DataFlow**

| TM-Library Field | Precogly Field |
|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` |
| `title` | `label` |
| `description` | `description` |
| `source` | `source_component` (FK, resolved via typed symbolic_name) |
| `destination` | `dest_component` (FK, resolved via typed symbolic_name) |
| `has_sensitive_data` | `has_sensitive_data` (core column) |
| `encrypted` | `encrypted` (core column) |

**threats → ComponentInstanceThreat / DataFlowInstanceThreat**

Route to ComponentInstanceThreat if `components_affected` references components/actors/data_stores. Route to DataFlowInstanceThreat if it references data_flows. If both, create one instance per affected entity.

| TM-Library Field | Precogly Field |
|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` |
| `title` | `threat_name` |
| `description` | `threat_description` |
| `threat_persona` | `format_metadata.tm_library.threat_persona` |
| `event` | `format_metadata.tm_library.event` |
| `sources` | `format_metadata.tm_library.sources` |
| `attack_mechanisms` | `format_metadata.tm_library.attack_mechanisms` |
| `weaknesses` | `format_metadata.tm_library.weaknesses` |
| — | `threat_library` | `null` (no pack linkage) |
| — | `inherent_severity` | TM-Library has no per-threat severity. Default to `"medium"`. User can refine in the Threat Analysis workspace after import. |
| — | `status` | Set to `"exposed"` |

**controls → ComponentInstanceCountermeasure / FlowInstanceCountermeasure**

Route based on which threat type the referenced threat resolved to.

| TM-Library Field | Precogly Field |
|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` |
| `title` | `countermeasure_name` |
| `description` | `countermeasure_description` |
| `threats` | `instance_threat` / `flow_threat` (FK, resolved via symbolic_name). **If multiple threats referenced, create one countermeasure instance per threat** (see Decisions table). All instances share the same `symbolic_name` in `format_metadata` for export re-merging. |
| `status` | `status` — see enum mapping below |
| `priority` | `priority` (core column, direct map: none/low/medium/high/critical) |
| `trust_boundary` | `format_metadata.tm_library.trust_boundary` |
| — | `countermeasure_library` | `null` (no pack linkage) |

**Control status enum mapping (TM-Library → Precogly):**

| TM-Library | Precogly | Original preserved in metadata? |
|---|---|---|
| `active` | `verified` | No (clean map) |
| `assumed` | `platform` | Yes |
| `suggested` | `planned` | Yes |
| `under_review` | `planned` | Yes |
| `approved` | `planned` | Yes |
| `scheduled` | `planned` | Yes |
| `retired` | `waived` | Yes |
| `wont_do` | `waived` | Yes |
| *(unknown)* | `gap` | Yes |

When `original_status` is preserved: `format_metadata.tm_library.original_status = "<value>"`.

**risks → Risk + RiskThreat**

In Precogly, a Risk is a **user-created business-level aggregate** that groups multiple threats. The scoring method is set per ThreatModel (not per Risk) — all risks in a threat model use the same method. There are two score layers:

- **Inherent score** — computed from `scoring_metadata` via the scoring engine (e.g., likelihood × impact for tm_library)
- **Residual score** — auto-derived by `recalculate_risk()`: walks all linked threats' countermeasures, averages their effectiveness, then `residual = inherent × (1 - avg_effectiveness)`

Since we import as a new threat model, we set `ThreatModel.risk_scoring_method = "tm_library"` — this makes the TM-Library file's likelihood/impact values directly usable as scoring inputs.

| TM-Library Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | `format_metadata.tm_library.symbolic_name` | |
| `title` | `name` | |
| `description` | `description` | |
| `threats` | Creates RiskThreat rows (FKs resolved via symbolic_name) | A risk links to multiple threats |
| `likelihood` | `scoring_metadata.likelihood` | Input to scoring engine |
| `impact` | `scoring_metadata.impact` | Input to scoring engine |
| `impact_description` | `scoring_metadata.impact_description` | |
| `score` | `inherent_score` | **Do not use file's score directly.** Recompute via `calculate_inherent_score("tm_library", scoring_metadata)` for consistency. |
| `level` | `inherent_level` | Derived from computed score via `score_to_level()` |
| — | `residual_score` | Auto-computed by `recalculate_risk()` after RiskThreat rows are created |

**Import sequence for each risk:**
1. Create Risk with `scoring_metadata = {likelihood, impact, impact_description}`
2. Compute `inherent_score` and `inherent_level` via `calculate_inherent_score()`
3. Create RiskThreat rows linking to resolved threat instances
4. Call `recalculate_risk(risk)` to derive `residual_score` from linked countermeasure effectiveness

**threat_personas → format_metadata only**

Not modeled as a separate entity. Stored in `ThreatModel.format_metadata.tm_library.threat_personas` as the full array. Individual threats reference personas by symbolic_name in their own `format_metadata`.

### Export Mapping (Precogly → TM-Library)

Reverse of the import mapping. Key differences:

- **symbolic_name generation:** Use `<entity_type>_<pk>` (e.g., `component_42`, `threat_7`). If `format_metadata.tm_library.symbolic_name` exists (round-trip), use that instead.
- **Enum reverse mapping:** If `format_metadata.tm_library.original_status` exists, use that. Otherwise, map back: verified→active, platform→assumed, planned→suggested, waived→retired, gap→*(omit or use a sensible default)*.
- **Threat routing:** ComponentInstanceThreat and DataFlowInstanceThreat both export as `threats[]`. Populate `components_affected` with the symbolic_names of the owning component/flow. `inherent_severity` is **not exported** — TM-Library has no per-threat severity concept.
- **Control re-merging:** Multiple countermeasure instances sharing the same `format_metadata.tm_library.symbolic_name` export as a single `controls[]` entry with all referenced threats in `threats[]`. Use the first instance's status/priority (warn if they diverged).
- **Risk export depends on scoring method:**
  - If `risk_scoring_method == "tm_library"`: read `likelihood` and `impact` from `scoring_metadata` directly — they're already in TM-Library enum format. Export `inherent_score` as `score` and `inherent_level` as `level`.
  - If a different scoring method (FAIR, OWASP RR, etc.): `scoring_metadata` won't have `likelihood`/`impact`. Export the risk with `score` and `level` only (from `inherent_score`/`inherent_level`). Omit `likelihood` and `impact` fields. Add a warning to the export summary.

---

## Implementation

### Backend

#### 1. Adapter Module

```
backend/apps/threat_models/adapters/
    __init__.py
    base.py              # BaseAdapter ABC (import_data, export_data, validate)
    tm_library.py        # TmLibraryAdapter
    symbolic_name.py     # SymbolicNameResolver — builds/resolves name→object maps
```

**SymbolicNameResolver:** During import, builds a `dict[str, Model]` as entities are created, so later entities (threats, controls, risks) can resolve FKs by symbolic_name. During export, builds the reverse map.

**TmLibraryAdapter.import_data(json_data, organization, created_by):** Auto-assigns to `created_by`'s default team.
1. Validate JSON structure (required top-level keys, array types)
2. Create ThreatModel
3. Process entities in dependency order: trust_zones → trust_boundaries → actors/components/data_stores → data_sets → data_flows → threat_personas → threats → controls → risks
4. Return the created ThreatModel
5. Wrap in `transaction.atomic()` — all or nothing

**TmLibraryAdapter.export_data(threat_model):**
1. Query all related objects (prefetch for performance)
2. Build symbolic_name map
3. Assemble JSON structure
4. Return dict (caller handles serialization to JSON/file)

#### 2. API Endpoints

Add as custom actions on `ThreatModelViewSet`:

```python
# Import — creates a new threat model from uploaded file
@action(detail=False, methods=["post"], url_path="import/tm-library")
def import_tm_library(self, request):
    """Import a TM-Library JSON file as a new threat model."""
    # Accepts: multipart file upload or JSON body
    # Returns: serialized new ThreatModel + import summary

# Export — exports an existing threat model
@action(detail=True, methods=["get"], url_path="export/tm-library")
def export_tm_library(self, request, pk=None):
    """Export this threat model as TM-Library JSON."""
    # Returns: TM-Library JSON as file download (Content-Disposition: attachment)
```

URL pattern: `POST /api/threat-models/import/tm-library/`, `GET /api/threat-models/{id}/export/tm-library/`

**Import response shape:**

```json
{
  "threat_model": { "id": 42, "name": "..." },
  "summary": {
    "trust_zones": 3,
    "components": 12,
    "data_flows": 8,
    "threats": 45,
    "countermeasures": 30,
    "risks": 10,
    "warnings": [
      "Control 'ctrl_7' status 'under_review' mapped to 'planned'",
      "Actor 'actor_3' type 'unknown_type' defaulted to system_actor"
    ]
  }
}
```

### Frontend

#### Import UI

Location: Create Threat Model page (`/threat-models/new`).

- Add an "Import from file" option alongside the manual creation form (e.g., a tab or section)
- File upload dropzone (accepts `.json`), format selector (TM-Library only for now)
- On upload: `POST /api/threat-models/import/tm-library/` with file
- On success: navigate to new threat model overview, show toast with summary (X components, Y threats imported, Z warnings)
- On error: show validation errors inline

#### Export UI

Location: Threat Model detail page header, near "Submit for Review" button.

- "Export" button → dropdown with format options (TM-Library only for now)
- On click: `GET /api/threat-models/{id}/export/tm-library/` → browser downloads JSON file
- Filename: `{threat_model_name}-tm-library.json`

---

## Task Breakdown

### Backend
1. Create `adapters/` module with `BaseAdapter`, `SymbolicNameResolver`
2. Implement `TmLibraryAdapter.import_data` — entity creation in dependency order
3. Implement `TmLibraryAdapter.export_data` — query + assemble JSON
4. Add `import_tm_library` and `export_tm_library` actions to `ThreatModelViewSet`
5. Add tests — import round-trip (import → export → compare), malformed input, enum edge cases

### Frontend
6. Add "Import" button + modal on threat models list page
7. Add "Export" dropdown on threat model detail header
8. Wire API calls, loading states, error handling, success toasts

---

## Known TM-Library Schema Gaps

The TM-Library schema (`docs/TM-FORMATS/Project-TM-Library/threat-model.schema.json`) has several gaps relative to real-world threat modeling needs and the Precogly data model. These affect both import (data we can't ingest because the schema doesn't carry it) and export (Precogly data that has no place in the schema).

### Missing properties on existing entities

| Entity | Missing | Adapter handling |
|---|---|---|
| `data-flow` | `protocol`, `port`, `authenticated`, `crosses_trust_zone`, `data_classification` | Export: omit (lossy). Import: fields left at defaults. |
| `actor` | `trust_zone` | Schema has `additionalProperties: false` so not extensible. Demo types added it (`TmBomActor.trust_zone?`). Export: omit. Import: actor created without trust zone placement. |
| `data-store` | `trust_zone` | Same as actor. |
| `trust-zone` | `parent` (self-reference for nesting) | No way to represent zone hierarchy. Export: flatten nested zones. Import: all zones created as top-level. |
| `trust-boundary` | `label`, `description` | Only zone_a/zone_b + auth properties. Export: label/description lost. Import: TrustBoundary created with empty label/description. |
| `control` | `control_type`, `effectiveness`, `evidence_url` | No preventive/detective/corrective distinction. Export: omit. Import: defaults. |
| `risk` | `residual_score`, `residual_level` | Only inherent scoring. Export: omit residual. Import: residual computed by `recalculate_risk()` from countermeasure effectiveness. |
| `threat` | Data flow association | `components_affected` references symbolic-names titled "Components" — ambiguous whether data flows can be referenced. Export: data flow threats exported with flow symbolic_name as `components_affected`. Import: resolve symbolic_names against all entity types — route to `DataFlowInstanceThreat` when a data flow matches, `ComponentInstanceThreat` otherwise. |

### Schema vs. real-world implementation discrepancy

- `typed-symbolic-name` property is called `name` in the schema but `object` in actual TM-Library JSON files. The demo types note: `// actual JSON uses "object", not "name" from schema`. **Adapter must support both** (`name` and `object`) on import.

### Score range mismatch

- Schema `risk-score`: integer 0–25 (raw likelihood × impact).
- Precogly `inherent_score`: integer 0–100 (normalized).
- Import: normalize via `calculate_inherent_score("tm_library", scoring_metadata)`.
- Export: denormalize back to 0–25 (`round(inherent_score / 100 * 25)`).

### Concepts absent from the schema entirely

These Precogly features have no representation in TM-Library and are silently omitted on export:

- Compliance frameworks and requirement mappings
- CIA triad ratings on data assets (confidentiality, integrity, availability)
- Per-threat severity (`inherent_severity`, `residual_severity`)
- Component `category`, `component_type`, `provider` (structural in TM-Library via separate entity types)
- Data flow `data_classification` tags
- Countermeasure inheritance (zone-based)

### CAPEC/CWE taxonomy visibility gap (accepted)

TM-Library threats carry inline `attack_mechanisms` (CAPEC) and `weaknesses` (CWE). In Precogly, taxonomy entries are linked to **library-level threats** (`ThreatLibrary` → `ThreatLibraryTaxonomyEntry` → `TaxonomyEntry`), not to instances. Since imported threats have `threat_library = null` (no pack linkage), their CAPEC/CWE data is stored in `format_metadata` but won't appear in taxonomy UI. This is acceptable — the data is preserved for round-trip export, and users can manually link a library threat later if taxonomy visibility is needed.

---

## Edge Cases

- **Duplicate symbolic_names in input:** Reject with validation error.
- **Missing required fields (title, trust_zone on component):** Reject entity with warning, continue import (partial import). *Or:* reject entire file — TBD during implementation.
- **Threats referencing nonexistent components:** Skip threat, add to warnings.
- **Controls referencing nonexistent threats:** Skip control, add to warnings.
- **Export with non-TM-Library scoring method:** Omit `likelihood`/`impact` from risks, export only `score` and `level`.
- **Empty threat model export:** Return valid TM-Library JSON with empty arrays.
