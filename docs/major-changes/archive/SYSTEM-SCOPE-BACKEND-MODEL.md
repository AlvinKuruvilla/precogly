# System Scope — Backend Model

**Date:** 2026-03-03
**Status:** Completed

---

## Problem

System Scope exists only on the DFD canvas — a React Flow group node (`systemScope` type) with two fields (`owner`, `classification`). No backend model, no DB table. This means:

- System scopes don't survive outside canvas_data JSON
- Can't associate risks at the system level
- Can't query "which components belong to which system"
- Import/export adapters can't reference system scopes
- No system-level reporting or analytics

---

## What System Scope Represents

System Scope answers: **"What system(s) are we analyzing?"**

It is a scoping boundary — "Mobile App" and "Backend App" are systems under analysis. Components and data flows within and between system scopes carry threats. Threats can be aggregated at the system level and systems can themselves be assigned threats and countermeasures; risk rolls up further to the org/business level.

It is **not** the same as:

- **Trust Zone** — security classification ("what trust level does this operate at?")
- **parent_component** — structural composition ("what is this component a submodule of?")

---

## Decision: System Scope = Orgsystem on the Canvas

### Discovery: Orgsystem Is the "Connected Systems" Feature

`Orgsystem` is not dormant — it's the partially wired "Connected Systems" feature on the threat model overview page. The full chain exists:

- **Backend:** `Orgsystem` model → `ThreatModelOrgsystem` junction table → `ThreatModelSerializer` returns `systemIds` → `ThreatModelCreateSerializer` accepts `systemIds` and creates associations → `/systems/` API endpoint
- **Frontend:** Threat model overview shows "Connected Systems" card → "Manage Connected Systems" modal fetches from `/systems/` and filters by `threatModel.systemIds`
- **Gap:** The modal's add/remove buttons are `console.log` stubs. No `Orgsystem` rows exist in the database, so the feature appears empty.

### Decision

**System Scope is the visual representation of an Orgsystem on the DFD canvas.** No new model needed. The flow is:

1. **Org level:** Create `Orgsystem` records (the systems your organization owns and operates)
2. **Threat model level:** Connect orgsystems via "Connected Systems" on the overview page
3. **DFD level:** Connected systems appear as System Scope group nodes on the canvas

Third-party services are **not** system scopes — they are external actors (`system_actor` category on `OrgsystemComponent`). An organizational system is something you own and operate. Everything else is an actor on the DFD.

## Remaining Issues

### 1. Component Membership — Decided

**Decision:** Wire it up during DFD sync. When a component is placed inside a System Scope node on the canvas (directly or nested inside a trust zone within a system scope), the sync process walks up the `parentId` chain to find the systemScope ancestor and sets `OrgsystemComponent.orgsystem` FK to the corresponding `Orgsystem` row. Components outside any system scope get `orgsystem = null`. The FK already exists — it just needs to be set by the sync. This makes "which components belong to which system?" directly queryable from the DB.

Example:
```
SystemScope (Mobile App)          ← orgsystem_id=5
  └── TrustZone (DMZ)
        └── Process (API Gateway) ← parentId=TrustZone
```
Sync walks up: API Gateway → TrustZone → SystemScope → sets `API Gateway.orgsystem = 5`.

### 2. Risk Association — Decided

**Decision:** No direct FK from `Risk` to `Orgsystem`. Derive system-level risk through the existing chain: Risk → RiskThreat → threat instance → component → orgsystem. A risk can span multiple systems (e.g., a cross-system data flow threat), so a single FK wouldn't model this correctly. The derived path also auto-updates when components move between systems.

### 3. DFD Sync

TrustZone already went through this journey (canvas group node → backend model with sync). The same pattern applies: when a DFD is saved, system scope nodes get synced to `Orgsystem` records, and an `orgsystemId` is written back to canvas data.

### 4. Inter-System Threat Modeling — Decided

**Decision:** No explicit flag. Derive inter-system crossings by comparing `source_component.orgsystem` vs `dest_component.orgsystem`. If they differ, it's a cross-system flow. Both components already have the orgsystem FK (set during DFD sync), so no extra field needed.

### 5. Canvas Data Migration — Decided

**Decision:** No migration needed. System is pre-release — all existing data is test data.

### 6. Finish "Connected Systems" Wiring — Essential Task

The "Manage Connected Systems" modal's add/remove buttons now call the API (they patch `systemIds` on the ThreatModel via `useUpdateThreatModel()`). The remaining work is wiring the DFD sync — system scope nodes on the canvas must sync to `Orgsystem` records, following the same pattern as TrustZone sync.

### 7. Connected Threat Models — Decided

The "Connected Threat Models" feature (also on the overview page, also has `console.log` stubs) links related threat models together. The long-term vision is inter-model data flows — drawing connections from components in one model to components in another, enabling cross-model threat analysis. However, this is complex (cross-model references, permissions, conflict resolution).

**Decision for pre-release:** Wire it up as **navigational only** — a reference link that says "these models are related" with click-through navigation. Let the community and market inform whether to evolve toward read-only visibility, aggregated risk reporting, or inter-model data flows.

---

### 8. Orgsystem Model Additions — Decided

The current Orgsystem model is too thin for System Scope sync. It needs parity with TrustZone for round-trip support.

**Add to Orgsystem:**
```
description        TextField (blank=True)
format_metadata    JSONField (default=dict, blank=True)
```

`classification` is **not** added — `criticality` (already on the model) serves a similar purpose.

**Prerequisite — Fix OrgsystemSerializer alias collision:** The current `OrgsystemSerializer` maps the frontend field `description` to the model's `owner` column (`description = CharField(source="owner")`). When the real `description` field is added to Orgsystem, this will collide. **Fix:** Remove the alias from the serializer and expose `owner` directly. Update the frontend `System` type to use `owner` instead of `description`. This must be done before (or as part of) this migration.

### 9. Canvas Type Changes — Decided

**SystemScopeNodeData** updates:
- Add `orgsystemId?: number` — written back by sync after save (same pattern as `trustZoneId` on TrustZone nodes)
- Remove `classification` — not needed, Orgsystem has `criticality`

Updated type:
```typescript
interface SystemScopeNodeData extends BaseNodeData {
  owner?: string
  technology?: string
  orgsystemId?: number
}
```

`technology` is kept — useful for identifying the platform (AWS, GCP, Azure, on-prem).

---

## Parallel: How TrustZone Did It

TrustZone is the closest precedent. It has:

- Backend model: `name`, `trust_level`, `description`, `format_metadata`, `parent` (self-FK)
- DFD sync: canvas trust zone nodes ↔ TrustZone DB records
- Canvas writeback: `trustZoneId` stored in node data after sync
- Components reference trust zones via canvas parent relationships

System Scope can follow the same pattern.
