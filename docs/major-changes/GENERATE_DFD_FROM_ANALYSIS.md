# Generate DFD From Existing Analysis

**Priority:** Future feature

## Summary

Add a "Generate DFD" action that synthesizes a visual Data Flow Diagram from existing backend records (`OrgsystemComponent`, `DataFlow`, `TrustZone`, `TrustBoundary`). This applies to:

- **Imported threat models** (TM-Library JSON) — currently stuck in manual mode with no visual diagram
- **Manually-created threat models** — components and flows added via the Threat Analysis screen but never drawn in the DFD editor

## User Experience

On the Threat Analysis tab (for threat models with no DFD), show a **"Generate DFD"** button. Clicking it:

1. Reads all components, data flows, trust zones, and trust boundaries from the backend
2. Runs auto-layout to compute node positions
3. Creates a `DFD` record with the generated `canvas_data`
4. Wires back-references (`component_id`, `dataflow_id`, `trust_zone_id`) into the node/edge data so the sync service recognizes existing records
5. Opens the DFD editor with the generated diagram, ready for manual refinement

The generated diagram is a **starting point** — users will rearrange nodes, adjust trust zone containment, and clean up the layout. It doesn't need to be perfect, just better than starting from a blank canvas with 17 components.

## Technical Challenges

### 1. Auto-Layout

Positioning nodes so the diagram is readable. Options:

- **Dagre** (hierarchical/layered layout) — good for directed flow graphs, already common in React Flow projects
- **ELK** (Eclipse Layout Kernel) — more sophisticated, handles nested containers (trust zones), available via `elkjs`
- **Simple grid** — fallback: arrange by category (actors left, processes center, datastores right), trust zones as background containers

ELK is the strongest candidate since it handles parent/child containment natively, which maps to trust zones containing components.

### 2. Back-Reference Wiring

The sync service (`sync_dfd_nodes_to_components`) uses `component_id` in node data to decide whether to update or create. The generated canvas must include these IDs so that the first save doesn't create duplicate records:

```json
{
  "id": "node-1",
  "type": "process",
  "data": {
    "label": "Auth Service",
    "component_id": 42,
    "component_library_id": 7
  },
  "position": { "x": 300, "y": 200 },
  "parentId": "zone-node-1"
}
```

Same for edges (`dataflow_id`) and trust zone nodes (`trust_zone_id`).

### 3. Node Type Mapping

`OrgsystemComponent.category` maps directly to DFD node types:

| Component Category | DFD Node Type |
|---|---|
| `process` | `process` |
| `datastore` | `datastore` |
| `human_actor` | `humanActor` |
| `system_actor` | `systemActor` |

### 4. Trust Zone Containment

Components have a `trust_zone` FK. In the DFD editor, containment is expressed via React Flow's `parentId` on the node. The generator must:

- Create a `trustZone` node for each `TrustZone` record
- Set `parentId` on component nodes to their trust zone's node ID
- Size trust zone nodes to contain their children (after layout)

### 5. Parent Component Hierarchy

`OrgsystemComponent.parent_component` creates nested process containers (max 3 levels). The generator must reflect this as nested `parentId` relationships in the canvas.

## API

```
POST /api/threat-models/:id/generate-dfd/
```

- Validates the threat model has no existing DFD (or offers to replace)
- Reads components, flows, zones, boundaries
- Runs layout algorithm server-side (or returns data for client-side layout)
- Creates `DFD` record with `threat_model` FK
- Returns the DFD ID for navigation to the editor

### Alternative: Client-Side Generation

Layout could run entirely in the browser using `elkjs` (which is a JS library). The flow would be:

1. Frontend fetches components, flows, zones via existing API
2. Runs ELK layout in the browser
3. POSTs the generated `canvas_data` to `POST /api/diagrams/` with `threat_model_id`

This avoids adding a layout engine to the backend. The tradeoff is that the "Generate DFD" button lives in the frontend and needs access to all the component/flow data (which the Threat Analysis tab already fetches).

## Scope Boundaries

**In scope:**
- Generate a single DFD from all components and flows in a threat model
- Auto-layout with trust zone containment
- Back-reference wiring to prevent duplicate records on save
- Manual refinement after generation

**Out of scope (future):**
- Incremental updates (re-generate after adding new components)
- Layout style preferences (horizontal vs. vertical, spacing controls)
- Multi-level generation (auto-split into context + level 1)
