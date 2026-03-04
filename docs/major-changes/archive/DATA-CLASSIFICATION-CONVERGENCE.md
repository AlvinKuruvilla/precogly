# Data Classification Convergence

**Date:** 2026-03-04
**Status:** Completed

---

## Current State

Two data classification systems exist in the codebase. They now share the **same tag set** but differ in persistence and UI pattern.

### Shared Tag Set (Already Converged)

Both fields use `DataSensitivityTag` from `frontend/src/types/domain.ts:276`:

| Key    | Label       | Description                         |
| ------ | ----------- | ----------------------------------- |
| `pii`  | PII         | Personally Identifiable Information |
| `phi`  | PHI         | Protected Health Information        |
| `fin`  | Financial   | Financial Data                      |
| `ip`   | IP          | Intellectual Property               |
| `cred` | Credentials | Credentials & Secrets               |
| `biz`  | Business    | Business Critical Data              |
| `gov`  | Government  | Government/Regulatory Data          |
| `pci`  | PCI         | Payment Card Industry Data          |
| `op`   | Operational | Operational Data                    |

`DataClassification` is a type alias for `DataSensitivityTag` (`diagram.ts:291`). This convergence is already done.

### Where They Differ

| Aspect              | DataAsset.data_sensitivity                   | DataFlowEdgeData.dataClassification                                                                                                              |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI location         | AssetsModal — toggle chips (purple)          | EdgeEditPanel — 2-column checkboxes                                                                                                              |
| Backend persistence | Yes — `DataAsset.data_sensitivity` JSONField | **No** — canvas data only, not synced to DataFlow model                                                                                          |
| Backend field       | `data_sensitivity` on DataAsset model        | No corresponding field on DataFlow model                                                                                                         |
| DFD sync            | N/A (direct CRUD)                            | **Not synced** — `services.py` extracts label, protocol, encrypted, authenticated, description, has_sensitive_data, but skips dataClassification |
| Normalization       | None                                         | None                                                                                                                                             |

### The Gap

Edge `dataClassification` is **not persisted to the backend**. It lives only in `canvas_data` JSON on the DFD. This means:

- Threat analysis queries can't filter data flows by classification
- Reports can't include "all flows carrying PII"
- If canvas_data is regenerated or lost, classifications are gone
- No cross-referencing between "this asset is PII" and "this flow carries PII"

---

## Historical Context

The original FIELD-ADDITIONS-FRONTEND.md described three overlapping systems with different value sets:

| Location                              | Field                | Values (then)                                                                             |
| ------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `DataFlowEdgeData` (canvas)           | `dataClassification` | PII, Customer Data, Financial, PHI, Confidential, Internal, Public                        |
| `DataAsset` (DB)                      | `data_sensitivity`   | pii, phi, fin, ip, cred, biz, gov, pci, op                                                |
| `SystemContextAsset` (workspace JSON) | `classification`     | pii, phi, financial, credentials, intellectual_property, business_critical, public, other |

Since then:

- `SystemContextAsset` was eliminated during asset unification — AssetsModal now CRUDs `DataAsset` records directly
- `DataClassification` was aliased to `DataSensitivityTag` — both use the same 9 tags
- Edge UI was updated to use `DATA_SENSITIVITY_TAG_CONFIG` for labels and descriptions

**What remains:** backend persistence for edge classifications and the move to free text.

---

## Proposed Change: Free Text with Suggested Tags

### Why Not a Fixed Enum

The current 9 tags cover common cases but don't fit every domain:

- Healthcare needs `HIPAA`
- Defense needs `ITAR`, `CUI`
- Finance needs `SOX`
- An organization might have internal tiers like `internal-tier-3`

A fixed enum either gets bloated or doesn't fit. Free text with suggestions solves this.

### How It Works

Both `DataAsset.data_sensitivity` and `DataFlow.data_classification` become **free-text string arrays** with suggested tags. The current 9 tags become suggestions, not constraints.

**UI pattern:** Same as `actor_type` and `technology` fields — a SuggestionCombobox where users can click a suggested tag or type a custom one. Selected tags appear as removable chips.

**Normalization:** Lowercase and trim on save. "PII", "pii", and " Pii " all become `"pii"`. This eliminates the main free-text risk (inconsistent casing).

**Suggested tags:** The current 9 tags remain as defaults. Future enhancement: org-level custom suggestions configured by admins.

### Example

An analyst at a healthcare company:

1. Creates a data asset "Patient Records"
2. Clicks suggested tags: `pii`, `phi`
3. Types a custom tag: `hipaa` (normalized to lowercase on save)
4. Saved as `["pii", "phi", "hipaa"]`

Later, drawing a data flow that carries patient records:

1. Tags the edge: `pii`, `phi`, `hipaa`
2. Both the asset and the flow now share the same vocabulary
3. A report can cross-reference: "flows carrying `phi` data touch these assets"

---

## Implementation Plan

### Phase 1: Backend — Add `data_classification` to DataFlow Model

Add a `JSONField` to the `DataFlow` model (mirrors `DataAsset.data_sensitivity`):

```python
data_classification = models.JSONField(default=list, blank=True)
```

Include in serializer. Migration required.

### Phase 2: DFD Sync — Persist Edge Classifications

Update `_sync_edges_to_dataflows()` in `services.py` to extract and sync `dataClassification`:

```python
data_classification = edge_data.get("data_classification", [])
```

Add to the create/update paths alongside the existing fields (label, protocol, etc.).

### Phase 3: Normalization Layer

Add a normalization utility used by both AssetsModal and EdgeEditPanel:

- Lowercase
- Trim whitespace
- Deduplicate

Apply on save for both data assets and data flows. Backend serializer validation can enforce this as a safety net.

### Phase 4: UI — Switch to SuggestionCombobox

Replace the current UIs:

- **EdgeEditPanel** (2-column checkboxes) → SuggestionCombobox with chip display
- **AssetsModal** (toggle buttons) → SuggestionCombobox with chip display (or keep toggle buttons for suggested tags + a text input for custom tags)

Both UIs use `DATA_SENSITIVITY_TAG_CONFIG` as the suggestion list. Custom tags appear as chips in the same style.

### Phase 5: Cross-Referencing (Future)

Once both fields are persisted and normalized:

- Auto-suggest: when an edge connects to a component that has associated data assets, pre-populate the edge's classification from the assets' sensitivity tags
- Reporting: "show all flows carrying PII" or "show all assets touched by flows without encryption"
- Validation hints: "this flow is tagged PII but encryption is off"

---

## Relationship to Other Work

- **PARENT-COMPONENT-HIERARCHY.md** — independent workstream, no dependency in either direction
- **FIELD-ADDITIONS-FRONTEND.md** (archived) — originally flagged this issue as a note; this doc replaces that note with an actionable plan
