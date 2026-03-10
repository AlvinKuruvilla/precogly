# Threat Severity Scoring Metadata

**Date:** 2026-03-10
**Status:** Not started
**Depends on:** None
**Blocks:** FORMAT-INTEROPERABILITY-PHASE2.md (adapter needs this field for import)

---

## Problem

Threat instances have `inherent_severity` (low/medium/high/critical) but no structured way to record **why** that severity was assigned. There is also a parity gap: `ComponentInstanceThreat` has a `justification` TextField, `DataFlowInstanceThreat` does not.

The upcoming TM-Library adapter needs a place to store severity inputs (likelihood, impact) that don't exist as separate columns and shouldn't be promoted to core columns (they're methodology-specific).

---

## Proposal

Replace `ComponentInstanceThreat.justification` (TextField) with `severity_scoring_metadata` (JSONField) on both threat instance models. One field serves both structured scoring inputs and free-text rationale.

**Before:**
```
ComponentInstanceThreat:    justification (TextField)        — exists
DataFlowInstanceThreat:     justification                    — missing (parity gap)
```

**After:**
```
ComponentInstanceThreat:    severity_scoring_metadata (JSONField, default=dict, blank=True)
DataFlowInstanceThreat:     severity_scoring_metadata (JSONField, default=dict, blank=True)
```

### Usage Patterns

```json
// Structured (likelihood x impact)
{"likelihood": "likely", "impact": "major", "rationale": "public-facing API"}

// Qualitative only
{"rationale": "carries credit card info, PCI scope"}

// TM-Library import (no per-threat severity in source format)
{"rationale": "severity defaulted during TM-Library import"}

// Empty (user hasn't provided reasoning yet)
{}
```

### Why JSONField, Not TextField

- Mirrors `Risk.scoring_metadata` pattern already in the codebase
- Queryable: `severity_scoring_metadata__likelihood="likely"`
- Forward-compatible with per-threat scoring engines if ever needed
- Still supports free-text via `rationale` key

---

## Impact Analysis

### Backend — 6 files

| File | Change |
|---|---|
| `apps/threats/models.py:321` | Replace `justification = TextField(blank=True)` with `severity_scoring_metadata = JSONField(default=dict, blank=True)` on ComponentInstanceThreat. Add same field to DataFlowInstanceThreat. |
| `apps/threats/serializers.py:189` | ComponentInstanceThreatSerializer: replace `justification` with `severity_scoring_metadata` in fields list. DataFlowInstanceThreatSerializer: add `severity_scoring_metadata` to fields list. |
| `apps/threat_models/views.py:545,598` | Custom `threats()` action serializes `"justification": threat.justification` for component threats and `"justification": ""` for flow threats. Change both to `"severityScoringMetadata": threat.severity_scoring_metadata`. |
| `apps/organizations/views.py:746` | Same pattern — change `"justification": threat.justification` to `"severityScoringMetadata": threat.severity_scoring_metadata`. |
| `apps/threats/migrations/` | New migration: remove `justification` from ComponentInstanceThreat, add `severity_scoring_metadata` to both models. |

**Do NOT touch:** `apps/threats/scoring/registry.py:82` — that `justification` is for manual Risk scoring metadata, completely unrelated.

### Frontend — 3 files

| File | Change |
|---|---|
| `src/api/threats.ts:25` | ComponentInstanceThreat interface: replace `justification: string` with `severityScoringMetadata: Record<string, unknown>`. |
| `src/api/threats.ts:582,664` | BackendThreat interface: replace `justification: string`. Transform function: update `notes: bt.justification \|\| undefined` mapping (see notes below). |
| `src/types/organization.ts:218` | SharedThreat interface: replace `justification?: string` with `severityScoringMetadata?: Record<string, unknown>`. |

### Frontend — `notes` mapping decision

`frontend/src/api/threats.ts:664` currently maps `justification` → `notes` on the internal `ComponentThreat` type. Two options:

1. **Map `rationale` key:** `notes: bt.severityScoringMetadata?.rationale || undefined` — preserves the existing `notes` behavior for display.
2. **Drop the mapping:** `notes` is not rendered anywhere in the current UI. Remove it from the transform entirely.

Recommend option 2 (drop). The severity scoring metadata will get its own UI treatment when the threat detail panel is built.

### Docs — 1 file

| File | Change |
|---|---|
| `docs/DATABASE.md:285` | Update ComponentInstanceThreats table: remove `justification`, add `severity_scoring_metadata`. Add same field to DataFlowInstanceThreats table. |

### Not affected

- `apps/threats/scoring/registry.py` — different `justification` (Risk scoring metadata for manual/custom method)
- `docs/major-changes/archive/RISK-TABLES.md` — references Risk scoring `justification`, not threat justification
- `demo/tmbom-viewer/` — no reference to threat justification
- Library pack YAML files — no reference to justification
- DFD editor UI — does not render justification

---

## Task Breakdown

1. Backend: update models + create migration
2. Backend: update serializers (both threat instance serializers)
3. Backend: update custom view responses (`threat_models/views.py`, `organizations/views.py`)
4. Frontend: update type definitions (`api/threats.ts`, `types/organization.ts`)
5. Frontend: update transform function (drop `notes` mapping)
6. Docs: update `DATABASE.md`
