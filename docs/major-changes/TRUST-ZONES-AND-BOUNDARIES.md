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

## DFD Editor Changes

The rename is mechanical. The new trust boundary **edge type** is the real feature work.

### Toolbar

```
┌─ Node creation ──────────────────────────────┬─ Mode toggles ────────────┐
│ 👤 Human Actor  🖥 System Actor  ⚙ Process   │ → Draw Connection         │
│ 💾 Data Store  🛡 Trust Zone  📦 System Scope │ ┄ Trust Boundary          │
└──────────────────────────────────────────────┴───────────────────────────┘
```

- Current "Trust Boundary" button → renamed **"Trust Zone"** (same behavior: adds a resizable zone group node)
- New **"Trust Boundary"** button as a **mode toggle** next to "Draw Connection"
- Tooltip — Trust Zone: *"A security zone that contains components (e.g., DMZ, Internal Network)"*
- Tooltip — Trust Boundary: *"A security crossing between two trust zones — defines authentication and access control"*

### Mode exclusivity

"Trust Boundary" mode and "Draw Connection" mode are mutually exclusive — activating one deactivates the other.

| Active mode | Click trust zone | Click component | Click canvas |
|---|---|---|---|
| Normal | Select zone → edit panel | Select component → edit panel | Deselect all |
| Draw Connection | Ignored (toast: "Click a component") | Source/target for data flow | Cancel mode |
| Trust Boundary | Source/target for boundary edge | Ignored (toast: "Click a trust zone") | Cancel mode |

Escape cancels any active mode.

### Creation flow

1. Click "Trust Boundary" in toolbar → button highlights, cursor changes to crosshair, toast: "Click the first trust zone"
2. Click first trust zone → selection ring highlight, toast: "Now click the second trust zone"
3. Click second trust zone → `trustBoundary` edge created, mode auto-deactivates, edit panel opens
4. Escape or click canvas → cancel at any step

### Edge cases

| Situation | Behavior |
|---|---|
| < 2 trust zones on canvas | Toast: "Add at least two trust zones first" — mode doesn't activate |
| Click same zone twice | Toast: "Click a different trust zone" — stay in mode |
| Click a component in boundary mode | Toast: "Click a trust zone, not a component" — stay in mode |
| Boundary A→B already exists | Toast: "Boundary already exists — click it to edit" — mode deactivates, existing edge selected |
| Boundary B→A exists but A→B doesn't | Allowed — boundaries are directional (e.g., inbound auth vs outbound DLP) |
| Delete a trust zone | Its boundary edges auto-delete (React Flow cascades edge removal) |

### New edge type: `trustBoundary`

Added to `edgeTypes` alongside existing `dataFlow`:

```typescript
export const edgeTypes = {
  dataFlow: DataFlowEdge,
  trustBoundary: TrustBoundaryEdge,
} as const
```

### Visual rendering (`TrustBoundaryEdge.tsx`)

**Border-to-border rendering** — the edge connects the closest borders of two zone rectangles, not their centers:

```
  Standard (center-to-center — wrong):    Custom (border-to-border):

  ┌──── Zone A ────┐                      ┌──── Zone A ────┐
  │        ●────────│───┐                  └─────────────────┘
  └─────────────────┘   │                  ┄┄┄ [🔒 RBAC] ┄┄┄┄
  ┌──── Zone B ────┐    │                  ┌──── Zone B ────┐
  │        ●◀───────│───┘                  └─────────────────┘
  └─────────────────┘
```

Visual elements on the line:
- Bold dashed line (distinct from lighter data flow edges)
- Label badge at midpoint (default: "Zone A → Zone B", editable)
- Small icon badges: lock (auth configured), shield (access control configured)
- Color hint: red if no auth, amber if partial, green if fully configured

### Edit panel (`TrustBoundaryEdgeEditPanel.tsx`)

Opens when clicking a trust boundary edge. Same right-panel pattern as `EdgeEditPanel` for data flows.

- **Label** — text input
- **Access Control Methods** — multi-select chips: none, acl, rbac, mac, dac, abac
- **Authentication Methods** — multi-select chips: none, password, otp, challenge_response, public_key, token, biometrics, sso, social
- **Token Configuration** (collapsible):
  - Access token expires (toggle) + TTL (seconds)
  - Has refresh token (toggle) + expires (toggle) + TTL (seconds)
- **Logout Capabilities** (collapsible):
  - Can user logout (toggle)
  - Can system logout (toggle)
- **Delete Boundary** button

### Secondary access from Trust Zone edit panel

The Trust Zone edit panel shows a read-only **"Boundaries"** section listing existing boundaries for that zone, with "Edit" links that select the boundary edge and open its edit panel. Same dual-access pattern as data flows.

### DFD sync

Trust boundary edges in `canvas_data` sync to `TrustBoundary` DB records on DFD save, same pattern as data flow edges → `DataFlow` records. Edge `source`/`target` (zone node IDs) resolve to `zone_a`/`zone_b` FKs.

### Trust zone nesting on export

Precogly supports nested zones (via `parent` FK). Formats like TM-Library don't. On export:
- Flatten all zones into a flat peer list
- Auto-generate a trust boundary between each parent→child pair (the format-idiomatic way to express nesting)
- Mark auto-generated boundaries in `format_metadata` so they're skipped on re-import if nesting is restored
- Preserve exact hierarchy in format extensions for round-trip fidelity

### New files

| File | Purpose |
|---|---|
| `edges/TrustBoundaryEdge.tsx` | React Flow custom edge with border-to-border rendering |
| `panels/TrustBoundaryEdgeEditPanel.tsx` | Edit panel for auth/access control metadata |

### Modified files

| File | Change |
|---|---|
| `DFDEditor.tsx` | Boundary mode state + `handleBoundaryModeClick` handler |
| `DiagramToolbar.tsx` | Rename "Trust Boundary" → "Trust Zone", add boundary mode toggle |
| `types/diagram.ts` | Add `TrustBoundaryEdgeData` interface |
| `components/index.ts` | Register `trustBoundary` in `edgeTypes` |
| `TrustZoneNode.tsx` (renamed) | Add "Boundaries" section to zone edit panel |

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
