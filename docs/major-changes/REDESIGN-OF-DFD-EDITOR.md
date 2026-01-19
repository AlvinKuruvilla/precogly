# DFD Editor Redesign - Decisions

## Overview

This document captures decisions made after comparing our DFD editor implementation against standard Data Flow Diagram conventions. Our goal is to align with DFD standards where beneficial while preserving enhancements necessary for threat modeling.

**Reference**: [Wikipedia - Data-flow diagram](https://en.wikipedia.org/wiki/Data-flow_diagram)

---

## Decision 1: Component Terminology & Visuals

### Decision: Split Actor into two node types

**Current state**: Single "Actor" node (stick figure) for all external entities.

**Change**:
| Node Type | Visual | Use Case |
|-----------|--------|----------|
| **Actor** (keep) | Stick figure, green | Human external entities: users, admins, customers, vendors, employees |
| **External System** (new) | Sharp-cornered rectangle, gray | Non-human external entities: third-party APIs, partner systems, legacy systems |

**Rationale**:

- OWASP community feedback: "Love the stick figures. People are not rectangles."
- Sharp rectangle for External System aligns with Gane-Sarson DFD notation
- Clear visual distinction from Process (rounded rectangle with gear icon)

---

## Decision 2: Rename "System Boundary" to "System Scope"

### Decision: Rename for clarity

**Current state**: "System Boundary" - solid border container with owner/classification properties.

**Change**: Rename to "System Scope"

**Rationale**:

- Clearer purpose: defines what's in scope for threat modeling
- Avoids confusion with DFD terminology where "system" has specific meaning
- Better differentiates from Trust Boundary (security zones vs analysis scope)
- Supports intended use cases:
  - Recording system-level threats and mitigations
  - Business process level threat modeling
  - Visual grouping of related components

---

# Implementation Plan

This section provides detailed implementation instructions for AI coding assistants.

---

## Implementation: Decision 1 - Add "External System" Node

### Step 1: Update Type Definitions

#### File: `frontend/src/types/domain.ts`

Update the `DiagramNodeType` union to include the new type:

```typescript
// Line ~192 - Add 'externalSystem' to the union
export type DiagramNodeType = 'process' | 'datastore' | 'actor' | 'externalSystem' | 'trustBoundary' | 'systemBoundary'
```

#### File: `frontend/src/features/dfd-editor/types/diagram.ts`

Add the new node data interface and type guard:

```typescript
// Add after ActorNodeData interface (~line 59)
export interface ExternalSystemNodeData extends BaseNodeData {
  systemType?: 'api' | 'legacy' | 'partner' | 'thirdParty' | 'other'
  vendor?: string
}

// Update DiagramNodeData union (~line 76) to include ExternalSystemNodeData
export type DiagramNodeData =
  | ProcessNodeData
  | DataStoreNodeData
  | ActorNodeData
  | ExternalSystemNodeData
  | TrustBoundaryNodeData
  | SystemBoundaryNodeData

// Add type guard after isActorNode (~line 170)
export function isExternalSystemNode(node: DiagramNode): node is Node<ExternalSystemNodeData, 'externalSystem'> {
  return node.type === 'externalSystem'
}
```

### Step 2: Create the Node Component

#### New File: `frontend/src/features/dfd-editor/components/nodes/ExternalSystemNode.tsx`

Create a new node component with sharp-cornered rectangle styling:

- Use gray color scheme (`bg-slate-100`, `border-slate-400`)
- Sharp corners (no `rounded-*` classes)
- Add server/box icon from lucide-react (e.g., `Server` or `Box`)
- Include 8 connection handles (top, bottom, left, right for both source and target)
- Follow the same pattern as `ActorNode.tsx` for structure

Visual specifications:
- Background: `bg-slate-50` or `bg-gray-100`
- Border: `border-2 border-slate-400`
- Icon: `Server` from lucide-react, `text-slate-600`
- No border-radius (sharp corners)
- Default size: similar to Actor node

### Step 3: Register the Node Component

#### File: `frontend/src/features/dfd-editor/components/nodes/index.ts`

Add export for the new component:

```typescript
export { ExternalSystemNode } from './ExternalSystemNode'
```

#### File: `frontend/src/features/dfd-editor/components/index.ts`

Register in the nodeTypes object:

```typescript
import { ExternalSystemNode } from './nodes'

export const nodeTypes = {
  process: ProcessNode,
  datastore: DataStoreNode,
  actor: ActorNode,
  externalSystem: ExternalSystemNode,  // Add this line
  trustBoundary: TrustBoundaryNode,
  systemBoundary: SystemBoundaryNode,
}
```

### Step 4: Update Connection Logic

#### File: `frontend/src/features/dfd-editor/DFDEditor.tsx`

Update the `connectableTypes` array to include the new node type:

```typescript
// Line ~199 - Add 'externalSystem' to allow data flow connections
const connectableTypes = ['process', 'datastore', 'actor', 'externalSystem']
```

### Step 5: Update Technology Registry

#### File: `frontend/src/features/dfd-editor/lib/technology-registry.ts`

Add the new node type to `NODE_TYPE_CATEGORIES`:

```typescript
// Line ~28-34 - Add externalSystem
export const NODE_TYPE_CATEGORIES: Record<DiagramNodeType, TechnologyCategory[]> = {
  datastore: ['database', 'storage', 'cache'],
  process: ['compute', 'backend', 'messaging', 'security'],
  actor: [],
  externalSystem: [],  // External systems typically don't have internal technologies
  trustBoundary: ['networking'],
  systemBoundary: ['infrastructure', 'networking'],
}
```

### Step 6: Update Toolbar

#### File: `frontend/src/features/dfd-editor/components/DiagramToolbar.tsx`

Add a button to create External System nodes:

- Add after the Actor button
- Use `Server` icon from lucide-react
- Label: "External System"
- Follow the same pattern as the Actor button for the click handler

### Step 7: Update Node Edit Panel

#### File: `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx`

Add handling for External System nodes:

- Display node type as "External System"
- Add fields for `systemType` dropdown (api, legacy, partner, thirdParty, other)
- Add optional `vendor` text field
- Follow the pattern used for Actor node editing

### Step 8: Update Frontend Templates (Optional)

#### Files: `frontend/src/data/templates/generic.json`, `banking.json`

Review templates and consider updating nodes that represent non-human external entities to use `externalSystem` type instead of `actor`. This is optional but improves semantic accuracy.

### Step 9: Update Library Pack Templates (Optional but Recommended)

#### Directory: `libraries/packs/**/DFDTemplates/*.yaml`

Library pack templates currently use `actor` nodes with `actorType` to distinguish between humans and systems. For semantic accuracy, migrate system actors to use the new `externalSystem` type.

**Current pattern:**
```yaml
- id: "actor-swiftnet"
  type: "actor"
  data:
    label: "SWIFTNet"
    actorType: "system"  # Non-human system
```

**New pattern:**
```yaml
- id: "system-swiftnet"
  type: "externalSystem"
  data:
    label: "SWIFTNet"
    systemType: "partner"
    vendor: "SWIFT"
```

**Migration guide by `actorType`:**

| Current actorType | Action | New type |
|-------------------|--------|----------|
| `"user"` | Keep as-is | `actor` |
| `"system"` | Migrate | `externalSystem` |
| `"external"` | Review case-by-case | `actor` (if human/org) or `externalSystem` (if API/system) |

**Files to review:**

| Pack | Template | System Actors to Migrate |
|------|----------|--------------------------|
| `azure` | `data-pipeline.yaml` | IoT Devices, Application Events, ML Pipeline |
| `azure` | `serverless-functions.yaml` | External Webhook, Timer Trigger |
| `banking` | `swift-payments.yaml` | SWIFTNet |

---

## Implementation: Decision 2 - Rename "System Boundary" to "System Scope"

### Step 1: Update Type Definitions

#### File: `frontend/src/types/domain.ts`

Rename in the `DiagramNodeType` union:

```typescript
// Line ~192 - Change 'systemBoundary' to 'systemScope'
export type DiagramNodeType = 'process' | 'datastore' | 'actor' | 'externalSystem' | 'trustBoundary' | 'systemScope'
```

#### File: `frontend/src/features/dfd-editor/types/diagram.ts`

Rename the interface and type guard:

```typescript
// Rename SystemBoundaryNodeData to SystemScopeNodeData (~line 70)
export interface SystemScopeNodeData extends BaseNodeData {
  owner?: string
  classification?: string
}

// Update DiagramNodeData union to use new name
export type DiagramNodeData =
  | ProcessNodeData
  | DataStoreNodeData
  | ActorNodeData
  | ExternalSystemNodeData
  | TrustBoundaryNodeData
  | SystemScopeNodeData

// Rename type guard (~line 176)
export function isSystemScopeNode(node: DiagramNode): node is Node<SystemScopeNodeData, 'systemScope'> {
  return node.type === 'systemScope'
}

// Update isBoundaryNode helper (~line 180)
export function isBoundaryNode(node: DiagramNode): boolean {
  return node.type === 'trustBoundary' || node.type === 'systemScope'
}
```

### Step 2: Rename Node Component File

#### Rename: `frontend/src/features/dfd-editor/components/nodes/SystemBoundaryNode.tsx`
#### To: `frontend/src/features/dfd-editor/components/nodes/SystemScopeNode.tsx`

Inside the file:
- Rename component from `SystemBoundaryNode` to `SystemScopeNode`
- Update any internal references to "System Boundary" in labels/comments to "System Scope"

### Step 3: Update Exports

#### File: `frontend/src/features/dfd-editor/components/nodes/index.ts`

Update the export:

```typescript
// Change from:
export { SystemBoundaryNode } from './SystemBoundaryNode'
// To:
export { SystemScopeNode } from './SystemScopeNode'
```

#### File: `frontend/src/features/dfd-editor/components/index.ts`

Update the nodeTypes registration:

```typescript
import { SystemScopeNode } from './nodes'

export const nodeTypes = {
  process: ProcessNode,
  datastore: DataStoreNode,
  actor: ActorNode,
  externalSystem: ExternalSystemNode,
  trustBoundary: TrustBoundaryNode,
  systemScope: SystemScopeNode,  // Renamed from systemBoundary
}
```

### Step 4: Update Technology Registry

#### File: `frontend/src/features/dfd-editor/lib/technology-registry.ts`

Rename the key in `NODE_TYPE_CATEGORIES`:

```typescript
export const NODE_TYPE_CATEGORIES: Record<DiagramNodeType, TechnologyCategory[]> = {
  datastore: ['database', 'storage', 'cache'],
  process: ['compute', 'backend', 'messaging', 'security'],
  actor: [],
  externalSystem: [],
  trustBoundary: ['networking'],
  systemScope: ['infrastructure', 'networking'],  // Renamed from systemBoundary
}
```

### Step 5: Update Toolbar

#### File: `frontend/src/features/dfd-editor/components/DiagramToolbar.tsx`

Update the button label and any references:

- Change button label from "System Boundary" to "System Scope"
- Update the node type in the click handler from `'systemBoundary'` to `'systemScope'`

### Step 6: Update Node Edit Panel

#### File: `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx`

Update references:

- Change display label from "System Boundary" to "System Scope"
- Update type checks from `'systemBoundary'` to `'systemScope'`
- Update any `SystemBoundaryNodeData` references to `SystemScopeNodeData`

### Step 7: Update Hooks

#### File: `frontend/src/features/dfd-editor/hooks/useParentRelationships.ts`

Search for any `'systemBoundary'` string literals and update to `'systemScope'`.

#### File: `frontend/src/features/dfd-editor/hooks/useKeyboardShortcuts.ts`

Search for any `'systemBoundary'` string literals and update to `'systemScope'`.

### Step 8: Update Frontend Templates

#### Files: `frontend/src/data/templates/generic.json`, `banking.json`

Update any nodes with `"type": "systemBoundary"` to `"type": "systemScope"`.

### Step 9: Update Library Pack Templates (REQUIRED)

#### Directory: `libraries/packs/**/DFDTemplates/*.yaml`

**This step is required** - library pack templates use `systemBoundary` and will break if not updated.

**Find and replace:**
- Find: `type: "systemBoundary"`
- Replace: `type: "systemScope"`

**Affected files (11 total):**

| Pack | Template File |
|------|---------------|
| `technologies/aws` | `DFDTemplates/serverless-api.yaml` |
| `technologies/azure` | `DFDTemplates/webapp.yaml` |
| `technologies/azure` | `DFDTemplates/microservices-aks.yaml` |
| `technologies/azure` | `DFDTemplates/serverless-functions.yaml` |
| `technologies/azure` | `DFDTemplates/data-pipeline.yaml` |
| `technologies/gcp` | `DFDTemplates/cloud-run.yaml` |
| `technologies/banking` | `DFDTemplates/swift-payments.yaml` |
| `technologies/banking` | `DFDTemplates/card-payment-processing.yaml` |
| `technologies/banking` | `DFDTemplates/open-banking-psd2.yaml` |
| `technologies/banking` | `DFDTemplates/fraud-detection.yaml` |
| `technologies/banking` | `DFDTemplates/mobile-banking.yaml` |

**Batch update command:**
```bash
find libraries/packs -name "*.yaml" -exec sed -i '' 's/type: "systemBoundary"/type: "systemScope"/g' {} \;
```

---

## Files Summary

### Decision 1: Add External System Node

| Action | File |
|--------|------|
| Modify | `frontend/src/types/domain.ts` |
| Modify | `frontend/src/features/dfd-editor/types/diagram.ts` |
| Create | `frontend/src/features/dfd-editor/components/nodes/ExternalSystemNode.tsx` |
| Modify | `frontend/src/features/dfd-editor/components/nodes/index.ts` |
| Modify | `frontend/src/features/dfd-editor/components/index.ts` |
| Modify | `frontend/src/features/dfd-editor/DFDEditor.tsx` |
| Modify | `frontend/src/features/dfd-editor/lib/technology-registry.ts` |
| Modify | `frontend/src/features/dfd-editor/components/DiagramToolbar.tsx` |
| Modify | `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx` |
| Modify (optional) | `libraries/packs/technologies/azure/DFDTemplates/data-pipeline.yaml` |
| Modify (optional) | `libraries/packs/technologies/azure/DFDTemplates/serverless-functions.yaml` |
| Modify (optional) | `libraries/packs/technologies/banking/DFDTemplates/swift-payments.yaml` |

### Decision 2: Rename System Boundary → System Scope

| Action | File |
|--------|------|
| Modify | `frontend/src/types/domain.ts` |
| Modify | `frontend/src/features/dfd-editor/types/diagram.ts` |
| Rename | `SystemBoundaryNode.tsx` → `SystemScopeNode.tsx` |
| Modify | `frontend/src/features/dfd-editor/components/nodes/index.ts` |
| Modify | `frontend/src/features/dfd-editor/components/index.ts` |
| Modify | `frontend/src/features/dfd-editor/lib/technology-registry.ts` |
| Modify | `frontend/src/features/dfd-editor/components/DiagramToolbar.tsx` |
| Modify | `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx` |
| Modify | `frontend/src/features/dfd-editor/hooks/useParentRelationships.ts` |
| Modify | `frontend/src/features/dfd-editor/hooks/useKeyboardShortcuts.ts` |
| Modify | `frontend/src/data/templates/generic.json` |
| Modify | `frontend/src/data/templates/banking.json` |
| Modify | `libraries/packs/technologies/aws/DFDTemplates/serverless-api.yaml` |
| Modify | `libraries/packs/technologies/azure/DFDTemplates/webapp.yaml` |
| Modify | `libraries/packs/technologies/azure/DFDTemplates/microservices-aks.yaml` |
| Modify | `libraries/packs/technologies/azure/DFDTemplates/serverless-functions.yaml` |
| Modify | `libraries/packs/technologies/azure/DFDTemplates/data-pipeline.yaml` |
| Modify | `libraries/packs/technologies/gcp/DFDTemplates/cloud-run.yaml` |
| Modify | `libraries/packs/technologies/banking/DFDTemplates/swift-payments.yaml` |
| Modify | `libraries/packs/technologies/banking/DFDTemplates/card-payment-processing.yaml` |
| Modify | `libraries/packs/technologies/banking/DFDTemplates/open-banking-psd2.yaml` |
| Modify | `libraries/packs/technologies/banking/DFDTemplates/fraud-detection.yaml` |
| Modify | `libraries/packs/technologies/banking/DFDTemplates/mobile-banking.yaml` |

---

## Revision History

| Date | Changes |
|------|---------|
| 2026-01-16 | Initial decisions captured after DFD standard gap analysis |
| 2026-01-16 | Added implementation plan for both decisions |
| 2026-01-19 | Added library pack template migration steps (11 templates use systemBoundary) |
