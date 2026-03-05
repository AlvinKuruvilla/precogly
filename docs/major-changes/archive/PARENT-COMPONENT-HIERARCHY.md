# Parent Component Hierarchy

**Date:** 2026-03-04
**Status:** Complete (Phases 1-5 implemented, Phase 6 abandoned)

> **Note:** All library packs, DFD templates, and sample data referenced in this document are test/sample data. This is pre-release code.

---

## Terminology

| Our Term | OWASP TM-Library Term | Notes |
|----------|----------------------|-------|
| OrgsystemComponent | Varies by category | Our umbrella entity for all analyzable DFD node types |
| OrgsystemComponent (category=process) | component | A process that transforms data |
| OrgsystemComponent (category=datastore) | data_store | A data repository |
| OrgsystemComponent (category=human_actor) | actor (type=user) | A human external entity |
| OrgsystemComponent (category=system_actor) | actor (type=system) | A system external entity |
| ComponentLibrary | — | Reusable template from a library pack |
| parent_component (on OrgsystemComponent) | parent_component (on component only) | Instance-level structural hierarchy |
| parent (on ComponentLibrary) | — (proposed) | Template-level structural hierarchy |

The OWASP schema's `component` maps specifically to our `process` category. In the OWASP schema, `data_store` and `actor` are separate top-level entities without `parent_component`. Our unified `OrgsystemComponent` model could technically allow parent-child on any category, but we **constrain it to process-only** (see Design Decisions below).

See FORMAT-INTEROPERABILITY.md for how all entities map between our data model and TM-BOM/OTM formats.

---

## Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Visual nesting via React Flow parentId chain.** ChildProcess.parentId = ParentProcess (not TrustZone). Trust zone membership inherited through ancestry. | Keeps one parent per node. Sync walks up the parentId chain to find the trust zone ancestor. Nesting chain: SystemScope → TrustZone → ParentProcess → ChildProcess. |
| D2 | **Process nodes only as parents.** Data stores and actors are always leaf nodes — they cannot be parents and do not participate in component hierarchy. | Matches OWASP schema (only `component` has `parent_component`). Keeps the model tractable. |
| D3 | **Same DFD only.** Parent and child must be in the same DFD. | Cross-DFD references add complexity with limited practical value. Each DFD represents one diagram context. |
| D4 | **Max 3 levels of nesting.** Parent → Child → Grandchild. | Keeps the canvas readable. Deeper decomposition can use multiple DFDs at different abstraction levels (context → level1 → level2). |

---

## Current State

`OrgsystemComponent.parent_component` is a self-referential FK that exists in the database but has no UI or DFD sync logic.

| Layer | Status |
|-------|--------|
| DB field | Done — `parent_component = ForeignKey("self", on_delete=SET_NULL, null=True, related_name="children")` |
| Serializer | Done — included in `OrgsystemComponentSerializer` fields |
| API | Done — readable/writable via `/components/` endpoint |
| DFD sync | Not implemented — `services.py` does not read or write `parent_component` |
| DFD canvas UI | Not implemented — no hierarchy controls in NodeEditPanel |
| Threat analysis UI | Not implemented — no hierarchy display in ComponentView |
| Import/export | Partially supported — TM-BOM schema includes `parent_component` on components (process only); adapter layer (see FORMAT-INTEROPERABILITY.md) will handle mapping |

---

## Why It Matters for Threat Analysis

The current FIELD-ADDITIONS-FRONTEND.md characterizes `parent_component` as "mainly for import/export round-trips." This undersells it. Component hierarchy directly affects how threats are identified, scoped, and reasoned about.

### Example 1: Mobile Banking App

```
Mobile Banking App (process)
├── Auth Module (process)
│   ├── Biometric Handler (process)
│   ├── PIN Entry (process)
│   └── Token Manager (process)
├── Payment Engine (process)
│   ├── Transaction Builder (process)
│   └── Fraud Check Client (process)
└── API Gateway Client (process)
```

> **Note on D2:** All nodes in the hierarchy are `process` category. Data stores (e.g., a local SQLite database) would sit as siblings at the trust zone level, connected via data flows — not nested inside the hierarchy. "Local Encrypted Store" from an earlier draft was removed because it would be a `datastore` category, which cannot participate in the hierarchy per Decision D2.

Without hierarchy, all 7 leaf components appear as flat siblings on the DFD. The analyst loses important context:

- **Cascading compromise.** A rooted/jailbroken device compromises the Mobile Banking App process. Every child component is exposed — that's a parent-level threat that propagates downward. A flat model forces you to duplicate this threat across every child manually.
- **Scoped analysis.** You can threat-model the Payment Engine as a unit first ("what goes wrong if the whole payment subsystem is compromised?"), then drill into Transaction Builder vs Fraud Check Client. Without hierarchy, there's no way to reason at different abstraction levels.
- **Inherited trust context.** Sub-components share the parent's runtime environment. Biometric Handler and PIN Entry both live inside Auth Module's process boundary — that's a security-relevant fact (shared memory, same sandbox) that a flat list doesn't capture.
- **Attack path depth.** Reaching the API Gateway Client is one hop from the app surface. Reaching the Token Manager is conceptually deeper (app → auth module → token manager). Hierarchy makes attack path depth explicit and measurable.

### Example 2: Auth Module (Zoomed In)

```
Auth Module (process)                          ← Level 1
├── Token Service (process)                    ← Level 2
│   ├── JWT Issuer (process)                   ← Level 3 (max depth)
│   └── Token Rotation Service (process)       ← Level 3 (max depth)
└── Session Manager (process)                  ← Level 2
    ├── Session Validator (process)            ← Level 3 (max depth)
    └── Session Cleanup Worker (process)       ← Level 3 (max depth)
```

> **Note on D4:** This example shows 3 levels, which is the max depth. Items like "Session Cache (Redis)" would be modeled as a `datastore` category node sitting at the trust zone level, connected to Session Manager via data flows.

Here the hierarchy captures **structural decomposition** that matters for threat analysis:

- **Blast radius.** If Token Service is compromised, both JWT Issuer and Token Rotation Service are affected — but Session Manager is not. Without hierarchy, an analyst has no structured way to express "these two components fail together."
- **Shared secrets.** JWT Issuer and Token Rotation Service likely share a signing key because they're siblings under Token Service. That's an implicit trust relationship the hierarchy makes visible.
- **Countermeasure scoping.** A countermeasure like "rotate signing keys" applies at the Token Service level and covers both children. Without hierarchy, you'd either apply it to each child redundantly or lose the scoping relationship.

---

## Impact on Library Packs

Library packs are currently **entirely flat** — this is the biggest structural gap. Hierarchy support requires changes across the pack schema, the ComponentLibrary model, threat generation, and pack import.

### Current Library Pack Structure (Flat)

`components.yaml` today:

```yaml
components:
  - id: s3
    name: Amazon S3
    category: datastore
    type: Object Storage
    provider: aws
  - id: lambda
    name: AWS Lambda
    category: process
    type: Serverless Function
    provider: aws
```

No component knows about any other component. The `ComponentLibrary` model has no `parent` field. Threats are linked 1:1 to individual components via `ComponentLibraryThreat`.

### What Needs to Change

#### 1. ComponentLibrary Model — Add `parent` Self-FK

`ComponentLibrary` needs a `parent` field (analogous to `OrgsystemComponent.parent_component`):

```python
parent = models.ForeignKey(
    "self", on_delete=models.SET_NULL,
    null=True, blank=True, related_name="children",
)
```

This lets a library pack define that "Token Service" is a child of "Auth Module" at the **template level**, not just at the instance level.

**Constraint (D2):** Only `category=process` entries can have a non-null `parent`, and `parent` must also be `category=process`. Enforce via model `clean()` validation. **Constraint (D4):** Validate max depth of 3 levels at import time.

#### 2. components.yaml Schema — Add `parent` Reference

```yaml
components:
  - id: mobile-banking-app
    name: Mobile Banking App
    category: process
    type: Mobile Application

  - id: auth-module
    name: Auth Module
    category: process
    type: Authentication Module
    parent: mobile-banking-app          # <-- new field

  - id: biometric-handler
    name: Biometric Handler
    category: process
    type: Biometric Authentication
    parent: auth-module                 # <-- nested under auth-module

  - id: token-manager
    name: Token Manager
    category: process
    type: Token Management
    parent: auth-module
```

The `parent` field references another component's `id` within the same pack. This is the same slug-reference pattern already used in `joins/components-threats.yaml`.

**Validation on import:** Reject if `parent` references a non-process component, if depth exceeds 3 levels, or if circular references exist.

#### 3. Pack Import Service — Resolve Parent References

`_load_components()` in `backend/apps/packs/services.py` needs a two-pass approach:

1. **Pass 1:** Create all `ComponentLibrary` records with `parent=None`
2. **Pass 2:** Resolve `parent` slug references and set the FK

This avoids ordering issues (a child might appear before its parent in the YAML). The same pattern is already used for taxonomy references and cross-pack dependencies.

#### 4. Threat Generation — Hierarchy-Aware Logic

Currently `_generate_threats_for_component()` in `services.py` queries:

```python
ComponentLibraryThreat.objects.filter(component_library=component.component_library)
```

With hierarchy, this needs to consider **inherited threats**:

- A threat defined on "Auth Module" in the library should also generate threat instances for "Biometric Handler" and "Token Manager" when they're placed on a canvas.
- The generation logic should walk up the `component_library.parent` chain and include ancestor threats (max 3 levels per D4).
- Inherited threat instances should be distinguishable from direct threats (e.g., an `inherited_from` field on `ComponentInstanceThreat`) so analysts know which threats are direct vs propagated.

#### 5. DFD Templates — Express Hierarchy

See dedicated section below: **Impact on DFD Templates**.

#### 6. Countermeasure Inheritance

`ComponentLibraryThreat` links threats to components, and countermeasures link to threats via `applicable_threats` M2M. With hierarchy:

- A countermeasure on a parent-level threat (e.g., "Enable app integrity checks" on "Mobile Banking App") should propagate to children.
- When generating countermeasure instances, walk up the ancestor chain and include countermeasures from inherited threats.
- An `inherited_from` marker on `ComponentInstanceCountermeasure` would let the UI show which countermeasures are direct vs inherited.

### Two Levels of Hierarchy

It's important to distinguish **template-level** and **instance-level** hierarchy:

| Level | Field | Where | Purpose |
|-------|-------|-------|---------|
| Template | `ComponentLibrary.parent` | Library packs | Defines default hierarchy in reusable templates |
| Instance | `OrgsystemComponent.parent_component` | Threat model DFDs | Actual hierarchy in a specific threat model |

When a library component with a template-level parent is placed on the canvas:

- If the parent library component is **also on the canvas**, pre-populate `parent_component` on the instance.
- If the parent is **not on the canvas**, the instance has no parent (orphaned at instance level). The template hierarchy is a suggestion, not a constraint.
- Users can override instance-level hierarchy: reparent, unparent, or assign a different parent than the library suggests.

### Migration Path for Existing Packs

Existing packs (aws-mini, azure, gcp, banking, etc.) are flat and stay flat — `parent: null` is the default. No migration needed. Hierarchy is opt-in per pack. New packs (e.g., a "mobile-banking" pack or an "auth-patterns" pack) would be the first to use `parent`.

---

## Impact on DFD Templates

DFD templates (e.g., `libraries/packs/aws-mini/dfd-templates/aws-serverless.yaml`, `libraries/packs/banking/dfd-templates/mobile-banking.yaml`) define canvas layouts with nodes and edges. Currently, the `parentId` on nodes references trust zones or system scopes for visual containment.

### Current Template Structure

```yaml
# From mobile-banking.yaml (simplified)
canvas_data:
  nodes:
    - id: "tb-backend"
      type: "trustZone"
      parentId: "sb-banking"
      style: { width: 520, height: 460 }
      data:
        label: "Bank Backend"
        zoneType: "privateSecured"

    - id: "process-bff"
      type: "process"
      parentId: "tb-backend"        # visually inside trust zone
      data:
        label: "Mobile BFF"
        component_ref: "mobile-bff"

    - id: "process-auth"
      type: "process"
      parentId: "tb-backend"        # visually inside trust zone
      data:
        label: "Auth Service"
        component_ref: "auth-service"
```

All processes are flat siblings inside a trust zone.

### Hierarchical Template Structure

With component hierarchy (Decision D1), a parent process becomes a visual container. Child processes use `parentId` pointing to the parent process node instead of the trust zone:

```yaml
canvas_data:
  nodes:
    - id: "tb-backend"
      type: "trustZone"
      parentId: "sb-banking"
      style: { width: 800, height: 600 }
      data:
        label: "Bank Backend"
        zoneType: "privateSecured"

    - id: "process-auth-module"
      type: "process"
      parentId: "tb-backend"                  # inside trust zone
      style: { width: 350, height: 250 }      # sized as container
      data:
        label: "Auth Module"
        component_ref: "auth-module"

    - id: "process-token-manager"
      type: "process"
      parentId: "process-auth-module"          # inside parent process (D1)
      data:
        label: "Token Manager"
        component_ref: "token-manager"

    - id: "process-biometric"
      type: "process"
      parentId: "process-auth-module"          # inside parent process (D1)
      data:
        label: "Biometric Handler"
        component_ref: "biometric-handler"
```

Key changes:

- Parent process nodes need explicit `style` with width/height (like trust zones) to act as containers.
- Child nodes use `parentId` pointing to the parent process, **not** the trust zone.
- The `component_ref` field continues to reference the library slug.
- The library's `parent` relationship (in `components.yaml`) and the template's `parentId` nesting should be consistent.

### DFDTemplatesLibrary Model

The `DFDTemplatesLibrary` model stores `canvas_data` as JSON. No model changes needed — the hierarchy is expressed in the canvas_data structure via `parentId` references. The template resolution endpoint (`/dfd-templates/{id}/resolved/`) will need to handle parent process container nodes correctly.

### Existing Templates

Existing templates remain valid — they have no parent process relationships. Hierarchy is opt-in in new templates.

---

## High-Level Implementation Plan

### Phase 1: Library Pack Schema

- Add `parent` self-FK to `ComponentLibrary` model
- Add model validation: only `category=process` can have a non-null parent, parent must also be `category=process` (D2)
- Validate max depth of 3 levels (D4)
- Validate no circular references
- Extend `components.yaml` schema to accept `parent` slug references
- Update pack import service with two-pass parent resolution
- Existing packs unaffected (parent defaults to null)

### Phase 2: Canvas Data Model & Process Container Nodes

Make process nodes capable of acting as containers on the React Flow canvas.

**React Flow parentId chain (Decision D1):**

```
SystemScope (container)
  └── TrustZone (container, parentId = SystemScope)
        └── ParentProcess (container, parentId = TrustZone)
              └── ChildProcess (parentId = ParentProcess)
                    └── GrandchildProcess (parentId = ChildProcess, max depth)
```

**Frontend changes:**

- `ProcessNodeData` in `diagram.ts` gains optional `parentComponentId?: string` (references another process node's backend component ID, used during sync)
- Process nodes conditionally render as containers based on whether they have children:
  - Leaf process nodes (no children): current non-container behavior
  - Parent process nodes (have children): `NodeResizer` support, explicit width/height, visual styling as container
  - A process transitions to container when its first child is added, and back when its last child is removed

**Note:** `parentComponentId` in node data is the **logical** parent reference (synced to DB). The React Flow `parentId` is the **visual** parent for canvas nesting. For process hierarchy, these align: the child's React Flow `parentId` points to the parent process node, and `parentComponentId` stores the backend component ID for sync.

### Phase 3: DFD Sync

Update `sync_dfd_nodes_to_components()` in `services.py`:

1. **Two-pass node sync** (same pattern as pack import):
   - Pass 1: Create/update all `OrgsystemComponent` records with `parent_component=None`
   - Pass 2: Resolve `parentComponentId` from canvas node data and set `parent_component` FK

2. **Trust zone resolution by ancestry:**
   - Child components no longer have a direct React Flow `parentId` pointing to a trust zone
   - Sync must walk up the `parentId` chain to find the nearest trust zone ancestor
   - Set the child's `trust_zone` FK to the resolved zone
   - Example: GrandchildProcess → ChildProcess → ParentProcess → TrustZone → resolved

3. **Validation (enforce in sync service, serializer, AND frontend):**
   - No circular references (A → B → A)
   - Max depth of 3 levels (D4)
   - Only process-category nodes can be parents (D2)
   - Parent must exist in the same DFD (D3)

4. **Library pre-population:**
   - When a library component has a `parent` in the library, and both parent and child are being synced in the same DFD, pre-populate the instance's `parent_component`
   - This is a suggestion — users can override at instance level

5. **Deletion handling:**
   - When a parent node is removed from the canvas, `on_delete=SET_NULL` clears children's `parent_component` in the DB
   - On the canvas, orphaned children should revert to their trust zone as their React Flow `parentId` (re-parented to the nearest ancestor trust zone)
   - `delete_preview` endpoint should warn about orphaned children

### Phase 4: NodeEditPanel UI

Add a "Parent Component" selector to NodeEditPanel for process nodes only (D2):

- Options: other process nodes in the same DFD (D3), excluding self and descendants to prevent cycles
- Filtered by max depth constraint (D4) — if the candidate parent is already at depth 2, and the current node has children, the nesting would exceed 3 levels
- Setting a parent visually moves the child inside the parent container on the canvas
- Clearing a parent moves the child back to its trust zone container
- Only visible for `process` node type

### Phase 5: Threat Analysis Display

In ComponentView, show hierarchy context:

- Breadcrumb or path above the component name (e.g., "Mobile Banking App > Auth Module > Token Manager")
- Collapsible tree view in the component list (left column) as an alternative to the current flat list
- "Child Components" section showing direct children when a parent is selected
- Data stores and actors appear as flat items (they never participate in hierarchy)

### Phase 6: Threat & Countermeasure Propagation — ABANDONED

**Status:** Abandoned

**Reason:** Phases 1-5 already give the analyst full hierarchy context — the tree view, breadcrumbs, and child components section make it clear which components are children of which parents. Duplicating parent threats onto every child would create noisy data (e.g., 6 threat instances to manage instead of 4) without adding actionable information. The analyst can already click the parent to see its threats and reason about cascading impact from the hierarchy structure alone.

---

## TM-BOM Export Considerations

See FORMAT-INTEROPERABILITY.md for the full adapter architecture. Parent component hierarchy has specific export implications:

| Our Category | OWASP Entity | `parent_component` on Export |
|---|---|---|
| process | component | Mapped to `component.parent_component` (symbolic name ref) — clean 1:1 mapping |
| datastore | data_store | N/A — `data_store` has no `parent_component` in the schema. Since we constrain parents to process-only (D2), this never arises. |
| human_actor / system_actor | actor | N/A — `actor` has no `parent_component` in the schema. Since we constrain parents to process-only (D2), this never arises. |

**On import** of a TM-BOM file:

- Resolve `component.parent_component` symbolic name references to `OrgsystemComponent` instances
- Requires two-pass import (same pattern as pack import and DFD sync)
- Validate depth ≤ 3 levels (D4); warn or truncate if the source file has deeper nesting

**On export** to TM-BOM:

- Walk `OrgsystemComponent.parent_component` for process-category components
- Emit `parent_component` as a symbolic name reference
- Non-process categories never have a parent, so no lossy conversion

---

## Relationship to Other Concepts

`parent_component`, trust zones, and system scopes are **independent axes**, but with a defined nesting order on the canvas:

| Concept | Question it answers | Scope | Canvas role |
|---------|-------------------|-------|-------------|
| System Scope | "What system are we analyzing?" | Organizational boundary | Outermost container |
| Trust Zone | "What trust level does this run at?" | Security boundary | Container inside system scope |
| Parent Component | "What is this a submodule of?" | Structural composition | Container inside trust zone (process nodes only, per D2) |

**Canvas nesting order:** SystemScope → TrustZone → ParentProcess → ChildProcess → GrandchildProcess (max per D4)

A component's trust zone is determined by **walking up the React Flow parentId chain** to the nearest trust zone ancestor during sync. This means:

- A child component inherits its parent's trust zone implicitly on the canvas
- If an analyst moves a parent process to a different trust zone, all children move with it (they're visually nested)
- The DB `trust_zone` FK is resolved during sync by walking the ancestry chain

---

## Technical Appendix: React Flow Implementation Details

This section documents the current React Flow implementation and the specific changes needed for process container nodes. Based on analysis of the actual codebase.

### Current Architecture: Container vs Leaf Nodes

| Aspect | Leaf Nodes (process, datastore, humanActor, systemActor) | Container Nodes (trustZone, systemScope) |
|--------|----------------------------------------------------------|------------------------------------------|
| Handles | 8 handles: 2 per side (source + target) with named IDs (`top-source`, `left-target`, etc.) for smart edge routing | 4 handles: 1 per side, no IDs |
| NodeResizer | None | Yes — min 200×150, visible when selected |
| Can contain children | No | Yes — via React Flow `parentId` |
| Default size | Content-based (auto) | Explicit `style: { width: 300, height: 200 }` |
| Delete behavior | Removed; connected edges removed | Children promoted to root with absolute position recalculated |

### Parent Assignment Algorithm

**File:** `frontend/src/features/dfd-editor/hooks/useParentRelationships.ts`

Called on every `onNodeDragStop`. Current logic:

1. **Valid parents filter:** Only `trustZone` and `systemScope` types
2. **Center-based hit test:** Node's center point must be inside a candidate parent's bounding box
3. **Smallest-fits-best:** If multiple candidates overlap, pick the smallest (most specific container)
4. **Cycle prevention:** A node cannot be assigned to its own descendant (checked up to 100 levels)
5. **Coordinate transform:** When entering a parent, absolute position is converted to relative (`relativePos = absolutePos - parentAbsolutePos`)
6. **Animations:** Sets `lockAnimationKey` on child and `receiveChildAnimationKey` on parent (500ms orange pulse)
7. **Topological sort:** After all updates, nodes are sorted by depth (parents before children)

### Changes Needed for Process Container Nodes

#### 1. `useParentRelationships.ts` — Extend Valid Parents

Current:
```typescript
// Only trustZone and systemScope are valid parents
const isBoundary = node.type === 'trustZone' || node.type === 'systemScope'
```

Needed:
```typescript
// trustZone, systemScope, AND process nodes that are designated containers
const isBoundary = node.type === 'trustZone' || node.type === 'systemScope'
const isProcessContainer = node.type === 'process' && hasChildren(node.id)
const isValidParent = isBoundary || isProcessContainer
```

**Depth enforcement (D4):** Before assigning a parent, walk up the parentId chain and count process-to-process levels. Reject if adding this child would exceed 3 levels.

**Category enforcement (D2):** Only allow `process` nodes to be dropped into process containers. `datastore`, `humanActor`, `systemActor` should still only nest inside trust zones / system scopes.

#### 2. `ProcessNode.tsx` — Dual-Mode Rendering

Process nodes need to render in two modes:

**Leaf mode** (no children — current behavior):
- Fixed content-based size
- Blue rounded rectangle with cog icon
- 8 handles with named IDs

**Container mode** (has children):
- `NodeResizer` enabled (min 250×180)
- Larger visual area with children rendered inside
- Visually distinct from trust zones: keep blue color scheme, use solid border (not dashed), slightly transparent background
- 8 handles preserved (process containers still participate in data flows — unlike trust zones which rarely do)
- Label rendered in top-left corner (like trust zones) rather than centered

**Transition:** Determined by whether any other node has `parentId` pointing to this process. The DFD editor can derive this from the nodes array on each render.

#### 3. `diagram.ts` — Type Changes

```typescript
interface ProcessNodeData extends BaseNodeData {
  technology?: string
  dataSensitivity?: DataSensitivity
  parentComponentId?: string    // NEW: backend component ID of parent process
  // isContainer is derived, not stored — computed from whether other nodes
  // reference this node as parentId
}
```

No new node type needed. The existing `process` type handles both modes.

#### 4. `DFDEditor.tsx` — Node Creation

When creating a new process node via toolbar:
- Created as leaf (no style width/height)
- Becomes container automatically when a child is dropped in

When inserting from a template that has process hierarchy:
- Parent process nodes get explicit `style: { width, height }` from template
- Child process nodes get `parentId` pointing to parent process node (remapped)
- Same ID remapping logic as current templates — already handles parentId chains

#### 5. Smart Handle Selection — No Changes

`getSmartHandles()` uses absolute positions (sums parent offsets). This already works for nested nodes. Process containers keeping 8 named handles means smart routing works identically.

#### 6. Connection Mode — Minor Change

Current connection mode allows connecting: process, datastore, humanActor, systemActor. No change needed — process containers are still process nodes and can be connected. A data flow can go to/from a parent process just like a leaf process.

### Sync Service Changes (`services.py`)

#### Current Sync Order

```
Phase 1: _sync_nodes_to_trust_zones()        → TrustZone records
Phase 2: _sync_nodes_to_orgsystems()          → Orgsystem records
Phase 3: Loop over analyzable nodes           → OrgsystemComponent records
Phase 4: _sync_edges_to_dataflows()           → DataFlow records
Phase 5: _sync_edges_to_trust_boundaries()    → TrustBoundary records
```

#### Updated Sync Order

```
Phase 1: _sync_nodes_to_trust_zones()         → TrustZone records (unchanged)
Phase 2: _sync_nodes_to_orgsystems()           → Orgsystem records (unchanged)
Phase 3a: Loop over analyzable nodes (PASS 1)  → Create/update OrgsystemComponent
                                                  with parent_component=None
Phase 3b: Resolve parent_component (PASS 2)    → Walk parentId chain for process nodes,
                                                  set parent_component FK
Phase 3c: Resolve trust_zone by ancestry        → For nodes whose parentId is a process
                                                  (not a trust zone), walk up until
                                                  trust zone found
Phase 4: _sync_edges_to_dataflows()            → DataFlow records (unchanged)
Phase 5: _sync_edges_to_trust_boundaries()     → TrustBoundary records (unchanged)
```

**Trust zone resolution detail:** Currently, sync determines trust zone by checking if a node's direct `parentId` is in `node_zone_map`. With process containers, a child node's `parentId` points to a process, not a zone. The resolver must walk up:

```python
def _resolve_trust_zone(node, nodes_by_id, node_zone_map):
    """Walk up parentId chain until a trust zone is found."""
    current_id = node.get("parentId")
    visited = set()
    while current_id and current_id not in visited:
        visited.add(current_id)
        if current_id in node_zone_map:
            return node_zone_map[current_id]
        parent_node = nodes_by_id.get(current_id)
        if not parent_node:
            break
        current_id = parent_node.get("parentId")
    return None  # No trust zone ancestor found
```

### NodeEditPanel Changes

**File:** `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx`

Current fields for process nodes: label, description, technology, dataSensitivity, system assignment, data assets.

Add **"Parent Component"** field (only for process nodes):

- **Type:** Combobox / select
- **Options:** Other process nodes in the same DFD canvas, filtered by:
  - Exclude self
  - Exclude descendants of self (prevents cycles)
  - Exclude nodes that would cause depth > 3 (D4)
- **On select:** Update the child's React Flow `parentId` to point to the selected parent node, convert position to relative, trigger lock animation
- **On clear:** Revert `parentId` to nearest trust zone ancestor, convert position to absolute then to relative-to-zone
- **Display when has parent:** Show "Contained In: {parent label}" (already exists for trust zones — extend to show process parents)

### Deletion Behavior for Process Containers

When a process container is deleted from the canvas:

1. **Children promoted:** All children get `parentId` set to the deleted node's parent (the trust zone or parent process above it)
2. **Position recalculated:** `childAbsolutePos = childRelativePos + deletedNodeAbsolutePos`, then convert to relative for new parent
3. **DB sync:** `parent_component` set to NULL via `on_delete=SET_NULL`
4. **`delete_preview`** endpoint should list affected children

This matches the existing `SystemScopeNode` deletion pattern — children are preserved with absolute position recalculation.

### Validation Summary

| Check | Frontend | Sync Service | Serializer |
|-------|----------|-------------|------------|
| Only process can be parent (D2) | `useParentRelationships` filter | Category check in Pass 2 | `clean()` on OrgsystemComponent |
| Same DFD only (D3) | Implicit (canvas-local) | Implicit (single DFD context) | N/A |
| Max 3 levels (D4) | Depth check before parent assignment | Depth check in Pass 2 | `clean()` depth walk |
| No circular refs | `isDescendant()` check | Walk check with visited set | `clean()` ancestor walk |
| Trust zone resolution | N/A (visual only) | Ancestry walk in Phase 3c | N/A |
