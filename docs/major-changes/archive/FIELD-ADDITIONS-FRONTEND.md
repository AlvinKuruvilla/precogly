# Field Additions — Frontend CRUD

**Date:** 2026-03-02
**Status:** Completed

---

## Overview

Maps each new backend field (from FIELD-ADDITIONS.md) to its natural frontend screen and describes the UI change needed. Excludes `format_metadata` (adapter-only, no user-facing UI).

---

## Important: Canvas Data vs Backend Fields

The DFD editor panels (NodeEditPanel, EdgeEditPanel) operate on **canvas data** (`node.data` / `edge.data`), not directly on backend model fields. A sync process maps canvas data to backend records when the DFD is saved. Adding a field to a panel requires:

1. Adding it to the canvas data TypeScript type
2. Adding UI controls in the panel
3. Ensuring the DFD sync process writes the field to the backend on save

---

## Field → Screen Mapping

### NodeEditPanel.tsx (DFD component properties)

| Field                                 | Category                  | Current UI                                                                                                                                                                                                     | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OrgsystemComponent.description`      | All node types            | Panel has a Description textarea, but it writes to **canvas data only**. Not synced to backend `description` field.                                                                                            | Wire the sync to persist `node.data.description` → backend `OrgsystemComponent.description`. No new UI control needed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `OrgsystemComponent.actor_type`       | human_actor, system_actor | systemActor has a "System Type" dropdown (api, legacy, partner, thirdParty, other). humanActor has an "Actor Type" dropdown (user, admin, attacker, customer). Neither maps to the backend `actor_type` field. | **Decided:** Backend `actor_type` is free text (no enum). Canvas keeps two separate fields: `actorType` on humanActor and `systemType` on systemActor. Both become **comboboxes** (free text with suggestions, like the Technology field). Both sync to the single backend `actor_type` field. Suggested values for humanActor: user, power_user, administrator, engineer, third_party, customer. Suggested values for systemActor: api, legacy, partner, third_party, saas, other. Drop `attacker` — it's a threat persona, not an architectural role. **TypeScript type change:** `HumanActorNodeData.actorType` changes from `'user' \| 'admin' \| 'attacker' \| 'customer'` to `string` (free text). `SystemActorNodeData.systemType` changes from `'api' \| 'legacy' \| 'partner' \| 'thirdParty' \| 'other'` to `string` (free text). |
| `OrgsystemComponent.data_store_type`  | datastore                 | No field exists. Datastores only have Technology combobox + Data Sensitivity.                                                                                                                                  | Add "Store Type" dropdown (sql, key_value, document, object, graph, time_series) below the Technology combobox. Sync to backend.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `OrgsystemComponent.parent_component` | All                       | Not shown.                                                                                                                                                                                                     | **Defer.** Hierarchy is mainly for import/export round-trips. Low UI priority.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### EdgeEditPanel.tsx (DFD data flow properties)

| Field                         | Current UI                                | Recommendation                                                                                                                                |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataFlow.description`        | Panel has Label but no description/notes. | Add a "Description" textarea below the Label field. Sync to backend.                                                                          |
| `DataFlow.has_sensitive_data` | Not present.                              | Add a "Contains Sensitive Data" checkbox in the Security section (alongside Encryption in Transit, Authentication Required). Sync to backend. |

### AssetsModal.tsx (workspace asset definitions)

**Note:** The assets modal manages `SystemContextAsset` objects stored in `workspace_data` JSON — these are **not** the same as `DataAsset` DB records. The `DataAsset` model has no dedicated CRUD UI. Before adding fields here, decide whether workspace assets should become (or link to) `DataAsset` rows.

| Field                        | Current UI                                                                                                                                                                        | Recommendation                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataAsset.description`      | AssetsModal already has a description field, but it stores to workspace_data, not the DataAsset model.                                                                            | **Defer** until workspace assets and DataAsset records are unified.                                                                                     |
| `DataAsset.data_sensitivity` | Multi-select toggle chips with purple highlight (9 tags: PII, PHI, Financial, IP, Credentials, Business, Government, PCI, Operational). Purple chip badges in asset list display. | **Done.** Implemented as part of asset unification. Backend JSONField, frontend toggle buttons in AssetsModal, CRUD payloads include `dataSensitivity`. |

### ComponentDataAsset — No UI exists

| Field                          | Current UI                                       | Recommendation                                                              |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `ComponentDataAsset.encrypted` | No screen for component–data-asset associations. | **Defer.** Needs a data assets sub-panel on the component edit panel first. |

### ComponentView.tsx (threat analysis — countermeasure cards)

| Field                                              | Current UI                                                                                                               | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `priority` (both Component + Flow countermeasures) | Not shown. Each countermeasure card shows: name, description, compliance mappings, status buttons, owner, waiver reason. | Add a small priority dropdown or badge row inside each countermeasure card, between the description and the status buttons. Values: none, low, medium, high, critical. Default "none" hides the badge. **Note:** The backend serializer already returns `priority` — the frontend `ComponentThreatCountermeasure` and `ExpandedCountermeasure` TypeScript types need `priority?: 'none' \| 'low' \| 'medium' \| 'high' \| 'critical'` added. |

---

## Summary by Priority

**Quick wins (wire existing UI to backend):**

- `OrgsystemComponent.description` — canvas description already exists, just need sync
- `DataFlow.has_sensitive_data` — one checkbox addition

**Small additions (new controls + sync):**

- `DataFlow.description` — one textarea
- `OrgsystemComponent.data_store_type` — one dropdown for datastore nodes
- `OrgsystemComponent.actor_type` — combobox for actor nodes (free text with suggestions, syncs to backend `actor_type`)
- Countermeasure `priority` — one dropdown per countermeasure card

**Done (completed during asset unification):**

- `DataAsset.data_sensitivity` — multi-select chips in AssetsModal with purple toggle buttons and chip badges

**Deferred (requires architectural decisions):**

- `DataAsset.description` — blocked on further asset unification refinement
- `ComponentDataAsset.encrypted` — no existing UI to attach to
- `OrgsystemComponent.parent_component` — low priority, mainly for import/export

---

## DFD Sync Service Updates Required

Adding fields to canvas panels is only half the work. The backend DFD sync service (`backend/apps/diagrams/services.py`) must also be updated to map canvas data to DB columns on save. Currently the sync only maps `name`, `component_library`, and `category` for components. These fields need to be added:

| Canvas Field                                   | Backend Field                        | Sync Direction |
| ---------------------------------------------- | ------------------------------------ | -------------- |
| `node.data.description`                        | `OrgsystemComponent.description`     | canvas → DB    |
| `node.data.actorType` / `node.data.systemType` | `OrgsystemComponent.actor_type`      | canvas → DB    |
| `node.data.dataStoreType`                      | `OrgsystemComponent.data_store_type` | canvas → DB    |
| `edge.data.description`                        | `DataFlow.description`               | canvas → DB    |
| `edge.data.hasSensitiveData`                   | `DataFlow.has_sensitive_data`        | canvas → DB    |

The sync already handles trust zone assignment via `parentId` — the same pattern applies here.

---

## Decision: Workspace Assets → DataAsset DB Rows

**Decision:** Replace workspace JSON assets with `DataAsset` DB records.

Currently there are two disconnected representations of data assets: `SystemContextAsset` objects in `workspace_data` JSON (managed by AssetsModal) and `DataAsset` DB rows (no CRUD UI). This creates two sources of truth.

**Action:** Refactor AssetsModal to CRUD `DataAsset` records directly instead of reading/writing `workspace_data` JSON. The `DataAsset` model already has richer fields (`description`, `data_sensitivity`, `classification`, `compliance_tags`, component associations via `ComponentDataAsset`). Once this is done, `DataAsset.description` and `data_sensitivity` get UI for free, and `ComponentDataAsset.encrypted` can be added to component edit panels. This is scoped in WORKSPACE-DATA-CLEANUP.md.

**Prerequisite:** `ComponentDataAsset` currently has no serializer or API endpoint. These must be created before asset unification can expose the encrypted toggle and component-asset associations.

---

## Decision: ComponentDataAsset UI Placement

`ComponentDataAsset` links a component to a data asset (with an `encrypted` toggle). It shows up in two places:

- **DFD Editor (NodeEditPanel):** A "Data Assets" section in the existing scrollable side panel, listing associated assets with an encrypted toggle per row.
- **Threat Analysis (ComponentView):** A small "Data Assets" section **above** the threats list in the middle column. When you select a component, you first see what data it touches, then what can go wrong. This preserves the three-column mental model: _what are we working on → what can go wrong → what can we do about it._

Both are blocked on the asset unification work above.

---

## Decision: parent_component vs System Scope

These are separate concepts and should remain so:

- **System Scope** — "what system(s) are we analyzing?" Scoping boundary on the canvas. System Scope = Orgsystem on the canvas (see SYSTEM-SCOPE-BACKEND-MODEL.md). No new model needed.
- **parent_component** — "what is this component structurally composed of?" Architectural hierarchy within a system (e.g., Auth Module contains Token Service and Session Store). DB-level FK on OrgsystemComponent.

A component can independently belong to a System Scope, a Trust Zone, and a parent component. parent_component remains deferred — mainly needed for import/export round-trips.

---

## Fix Required: Countermeasure Status Enum Mismatch

The backend `Status` choices on countermeasure models are: `gap`, `planned`, `verified`, `waived`. The frontend `CountermeasureStatus` type is: `'platform' | 'gap' | 'planned' | 'waived'`. These are **both incomplete** — each side is missing a value the other has.

`verified` and `platform` are distinct concepts:

- **verified** — developer implemented a fix, security team confirmed it works.
- **platform** — infra/platform team provides a paved road; adherence satisfies the countermeasure.

**Fix:** Both backend and frontend must have all five values: `gap`, `planned`, `verified`, `waived`, `platform`. Backend needs `PLATFORM` added to choices (see FIELD-ADDITIONS.md). Frontend needs `'verified'` added to `CountermeasureStatus` and `COUNTERMEASURE_STATUS_CONFIG`. ComponentView status buttons become: Gap, Planned, Verified, Waived, Platform.

---

## Note: Data Classification Convergence

Three overlapping classification systems currently exist:

| Location                              | Field                | Values                                                                                    |
| ------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `DataFlowEdgeData` (canvas)           | `dataClassification` | PII, Customer Data, Financial, PHI, Confidential, Internal, Public                        |
| `DataAsset` (DB)                      | `data_sensitivity`   | pii, phi, fin, ip, cred, biz, gov, pci, op                                                |
| `SystemContextAsset` (workspace JSON) | `classification`     | pii, phi, financial, credentials, intellectual_property, business_critical, public, other |

After asset unification (WORKSPACE-DATA-CLEANUP.md Step 3), `SystemContextAsset.classification` goes away — replaced by `DataAsset` fields. That leaves two: edge-level `dataClassification` and asset-level `data_sensitivity`. These serve different purposes (what flows through an edge vs what an asset contains) and can coexist, but their value sets should be aligned. When implementing asset unification, standardize `dataClassification` values to match `data_sensitivity` tags.
