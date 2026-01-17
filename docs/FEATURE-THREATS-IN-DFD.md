# Feature: Threats & Countermeasures in DFD Editor

## Overview

Add threat and countermeasure information directly into the DFD editor, allowing users to view and edit security posture while working with the architectural diagram.

## Goals

1. **Contextual Security Analysis** - See threats while viewing component in architectural context
2. **Unified Workflow** - No context switching between DFD editor and threat analysis workspace
3. **Visual Risk Indicators** - At-a-glance threat status on nodes and edges
4. **Full Editability** - Change countermeasure statuses directly from DFD editor

## User Stories

1. As a security engineer, I want to click on a component in the DFD and see its threats/countermeasures alongside its properties, so I can understand the full security context without leaving the diagram.

2. As a security engineer, I want to see visual indicators on DFD nodes showing their threat status (exposed/mitigated), so I can quickly identify which components need attention.

3. As a security engineer, I want to edit countermeasure statuses (gap → planned → platform) directly from the DFD editor, so I can update security posture while reviewing the architecture.

4. As a security engineer, I want to see threat indicators on data flows (edges), so I can identify insecure communication paths.

---

## Design

### 1. Properties Panel Enhancement

**Current State:**
- Right sidebar shows properties when node/edge selected
- Single panel with fields: Name, Description, Technology, Data Sensitivity, etc.

**New State:**
- Tabbed interface with two tabs:
  - **Properties** (existing functionality)
  - **Threats** (new - shows threats and countermeasures)

```
┌─────────────────────────────────────┐
│  [Properties] [Threats]             │  ← Tab buttons
├─────────────────────────────────────┤
│                                     │
│  (Tab content here)                 │
│                                     │
└─────────────────────────────────────┘
```

### 2. Threats Tab Content

When "Threats" tab is selected, display:

```
┌─────────────────────────────────────┐
│ Threats for "Account Database"      │
│ 3 threats · 2 exposed · 1 mitigated │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔴 Information Disclosure       │ │
│ │    STRIDE: Information Disc.    │ │
│ │    2/3 countermeasures          │ │
│ │    [▼ Expand]                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔴 Tampering                    │ │
│ │    STRIDE: Tampering            │ │
│ │    1/2 countermeasures          │ │
│ │    [▼ Expand]                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🟢 Denial of Service            │ │
│ │    STRIDE: Denial of Service    │ │
│ │    3/3 countermeasures ✓        │ │
│ │    [▼ Expand]                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ Add Custom Threat]               │
└─────────────────────────────────────┘
```

**Expanded Threat Card:**

```
┌─────────────────────────────────────┐
│ 🔴 Information Disclosure       [×] │  ← Dismiss button
│    STRIDE: Information Disclosure   │
├─────────────────────────────────────┤
│ Countermeasures:                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Encryption at Rest              │ │
│ │ [Gap] [Planned] [Platform]      │ │  ← Status buttons
│ │ Owner: [Select owner ▼]         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Access Control Lists            │ │
│ │ [Gap] [Planned] [Platform] ✓    │ │
│ │ Owner: sarah.chen@company.com   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ Add Countermeasure]              │
└─────────────────────────────────────┘
```

### 3. Visual Indicators on Nodes

Add threat status badges/indicators to DFD nodes:

**Badge Positions:**
- Top-right corner of node (outside the main shape)
- Small circular badge with count or status

**Badge Designs:**

| Status | Badge | Description |
|--------|-------|-------------|
| Exposed | 🔴 Red circle with number | Has unaddressed threats (gaps) |
| Addressable | 🟡 Yellow circle with number | All threats planned/waived |
| Mitigated | 🟢 Green checkmark | All threats addressed |
| No Threats | (no badge) | Component has no applicable threats |

**Example Node with Badge:**

```
         ┌──┐
         │🔴│ 2    ← Red badge showing 2 exposed threats
┌────────┴──┴────────┐
│                    │
│   ⚙️ API Gateway   │
│   Java / Spring    │
│                    │
│  [🔒 Confidential] │
└────────────────────┘
```

### 4. Visual Indicators on Edges (Data Flows)

Add threat indicators to data flow edges:

**Indicator Placement:**
- Near the edge label or midpoint
- Small icon/badge that doesn't obstruct the flow line

**Design Options:**
1. **Inline badge** - Small colored dot on the edge path
2. **Label annotation** - Add threat count to existing edge label
3. **Stroke color change** - Edge turns red/yellow/green based on status

**Recommended: Stroke color + small badge**

```
Source ───────🔴───────→ Target
              ↑
        Red dot indicates exposed threats
```

### 5. Data Flow

**Current threat data storage:**
- Workspace-level: `workspace_data.systemContext` on ThreatModel
- Diagram-level: `localStorage` keyed by diagram ID (in ThreatAnalysisView)

**For this feature:**
- Reuse existing threat data from workspace state
- DFD editor will receive threats via props from parent (ThreatModelDetail or new wrapper)
- Changes propagate back via callbacks (same pattern as workspace)

```
┌─────────────────────────────────────────────────────────────┐
│                     ThreatModelDetail                        │
│  (or DFDEditorWrapper)                                       │
│                                                              │
│  State: componentThreats, updateCountermeasureStatus, etc.  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ props
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       DFDEditor                              │
│                                                              │
│  Receives: componentThreats, handlers                        │
│  Passes to: NodeEditPanel, nodes                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ProcessNode   NodeEditPanel   DataFlowEdge
        (badge)       (threats tab)   (indicator)
```

---

## Implementation Plan

### Phase 1: Tabbed Properties Panel

**Files to modify:**
- `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx`
- `frontend/src/features/dfd-editor/components/panels/EdgeEditPanel.tsx`

**Tasks:**
1. Add Tabs component (from shadcn/ui) to both panels
2. Wrap existing content in "Properties" tab
3. Create placeholder "Threats" tab

**New components to create:**
- `frontend/src/features/dfd-editor/components/panels/NodeThreatsPanel.tsx`
- `frontend/src/features/dfd-editor/components/panels/EdgeThreatsPanel.tsx`

### Phase 2: Threats Tab Implementation

**Reuse from existing:**
- `ComponentThreat` type from `types/threat-analysis.ts`
- `CountermeasureStatusButtons` pattern from `ComponentView.tsx`
- `UserSearchCombobox` for owner assignment
- `deriveThreatStatus()` helper function
- Threat/countermeasure registries

**New components:**
- `ThreatCard.tsx` - Collapsible card showing threat with countermeasures
- `CountermeasureRow.tsx` - Single countermeasure with status/owner controls

**Props to add to NodeEditPanel:**
```typescript
interface NodeEditPanelProps {
  node: DiagramNode
  onClose: () => void
  threatModelId?: string
  // New props:
  componentThreats: ComponentThreat[]
  onCountermeasureStatusChange: (ctId: string, cmId: string, status: CountermeasureStatus, notes?: string) => void
  onAssignOwner: (ctId: string, cmId: string, owner: string) => void
  onDismissThreat: (ctId: string) => void
  onRestoreThreat: (ctId: string) => void
  onAddCountermeasure: (ctId: string, cmId: string) => void
  onRemoveCountermeasure: (ctId: string, cmInstanceId: string) => void
}
```

### Phase 3: Visual Indicators on Nodes

**Files to modify:**
- `frontend/src/features/dfd-editor/components/nodes/ProcessNode.tsx`
- `frontend/src/features/dfd-editor/components/nodes/DataStoreNode.tsx`
- `frontend/src/features/dfd-editor/components/nodes/ActorNode.tsx`
- `frontend/src/features/dfd-editor/components/nodes/TrustBoundaryNode.tsx`

**Approach:**
1. Add `threatSummary` to node data or pass via context
2. Render badge component in top-right corner
3. Badge shows count and color based on threat status

**New component:**
- `ThreatStatusBadge.tsx` - Reusable badge for nodes

**Node data extension:**
```typescript
interface ProcessNodeData extends BaseNodeData {
  technology?: string
  dataSensitivity?: DataSensitivity
  // New:
  threatSummary?: {
    total: number
    exposed: number
    addressable: number
    mitigated: number
  }
}
```

### Phase 4: Visual Indicators on Edges

**Files to modify:**
- `frontend/src/features/dfd-editor/components/edges/DataFlowEdge.tsx`

**Approach:**
1. Add `threatSummary` to edge data
2. Modify edge rendering to show status indicator
3. Options: colored stroke, badge at midpoint, or both

### Phase 5: Data Integration

**Files to modify:**
- `frontend/src/features/dfd-editor/DFDEditor.tsx`
- `frontend/src/pages/ThreatModelDetail.tsx` (or create wrapper)

**Tasks:**
1. Fetch/compute threat data for the diagram
2. Pass threat data and handlers to DFDEditor
3. Ensure changes sync with workspace state
4. Handle auto-initialization of threats for new components

**Options:**
1. **Wrapper component** - Create `DFDEditorWithThreats.tsx` that wraps DFDEditor
2. **Lift state** - Move threat state to ThreatModelDetail, pass to DFDEditor
3. **Context provider** - Create ThreatContext for DFD editor tree

**Recommended: Option 2 (Lift state)** - Most straightforward, follows existing patterns

---

## Component Reuse Summary

| Existing Component | Location | Reuse For |
|--------------------|----------|-----------|
| `deriveThreatStatus()` | `types/threat-analysis.ts` | Calculate threat status |
| `summarizeComponentThreats()` | `types/threat-analysis.ts` | Generate badge data |
| `THREAT_STATUS_CONFIG` | `types/threat-analysis.ts` | Status colors/labels |
| `COUNTERMEASURE_STATUS_CONFIG` | `types/threat-analysis.ts` | Status colors/labels |
| `UserSearchCombobox` | `ComponentView.tsx` (inline) | Owner assignment |
| Status button pattern | `ComponentView.tsx` | Countermeasure status |
| `getThreatDefinition()` | `lib/threat-registry.ts` | Threat names/descriptions |
| `getCountermeasureDefinition()` | `lib/countermeasure-registry.ts` | Countermeasure details |
| `Tabs` | `@/components/ui/tabs` | Panel tab switching |
| `Collapsible` | `@/components/ui/collapsible` | Expandable threat cards |
| `Badge` | `@/components/ui/badge` | Status indicators |

---

## UI/UX Considerations

1. **Panel width** - May need to increase panel width to accommodate threats tab content (current: ~280px, suggested: ~320px)

2. **Loading states** - Show skeleton while threats are being calculated

3. **Empty states** - Handle components with no applicable threats gracefully

4. **Sync indicator** - Show when threat changes are being saved

5. **Keyboard navigation** - Ensure tabs are accessible via keyboard

6. **Mobile/responsive** - Panel should still work on smaller screens

---

## Testing Considerations

1. **Unit tests:**
   - ThreatCard rendering with various states
   - CountermeasureRow status changes
   - Badge calculations

2. **Integration tests:**
   - Panel tab switching
   - Threat data flowing from parent to panel
   - Status changes propagating back

3. **E2E tests:**
   - Full workflow: select node → view threats → change status → verify persistence

---

## Potential Issues & Unintended Consequences

### Data & State Issues

1. **Dual source of truth** - Currently, threat data lives in `workspace_data` (workspace level) AND `localStorage` (diagram level in ThreatAnalysisView). Adding a third edit point (DFD editor) risks data conflicts and sync issues.

2. **Stale data on navigation** - User edits threats in DFD editor, navigates away without saving, comes back - what state do they see? Need clear save/discard semantics.

3. **Race conditions** - If user has workspace open in one tab and DFD editor in another, edits in one won't reflect in the other. Could lead to data loss on save.

4. **Orphaned threat data** - If a node is deleted from the DFD, what happens to its threats? Currently handled in workspace, but DFD editor would need same cleanup logic.

5. **New nodes without threats** - User adds a new process node. The threats tab would be empty until threats are initialized. Confusing UX if user expects to see threats immediately.

### Performance Issues

6. **Re-render storms** - Passing threat data to every node could cause excessive re-renders when any countermeasure status changes. Need careful memoization.

7. **Large diagrams** - DFDs with 50+ components, each with 5-10 threats, each with 3-5 countermeasures = thousands of objects. Badge calculations on every render could be expensive.

8. **Panel switching lag** - Loading threat data when switching to Threats tab could cause noticeable delay if data isn't pre-loaded.

### UX Issues

9. **Panel width constraints** - Current panel is ~280px. Threat cards with countermeasure status buttons, owner dropdowns, and notes may not fit well. Cramped UI leads to frustration.

10. **Information overload** - Showing all threats expanded could overwhelm users. But collapsed-by-default means extra clicks to see anything useful.

11. **Context loss** - User is editing properties, switches to Threats tab, makes changes, switches back - did their property changes persist? Tab switching behavior must be clear.

12. **Badge blindness** - If most nodes have red badges, users may start ignoring them. The visual signal loses meaning.

13. **Accidental dismissals** - Easy to accidentally dismiss a threat. Need undo or confirmation.

14. **Owner assignment friction** - Current owner dropdown requires typing to search. In a side panel, this could feel clunky.

### Architectural Issues

15. **Tight coupling** - DFD editor becomes dependent on threat analysis system. Changes to threat model structure would require updates in multiple places.

16. **Feature creep** - Once threats are in the DFD, users will want more: add custom threats, bulk edit, export, etc. Scope could balloon.

17. **Mobile/tablet breakage** - Side panel with tabs and nested content may not work on smaller screens where DFD editor is already cramped.

18. **Accessibility regression** - Nested tabs, expandable cards, status buttons - lots of interactive elements that need proper ARIA labels and keyboard nav.

### Data Model Issues

19. **Edge threat identification** - Edges use generated IDs. If edge is deleted and recreated (common during editing), the new edge won't have the old threats. Need stable edge identity.

20. **Trust boundary threats** - Trust boundaries can contain other nodes. Should the boundary's threat badge include child node threats? Aggregation logic gets complex.

21. **Cross-diagram references** - In workspace view, threats aggregate across all DFDs. In DFD editor, showing only current diagram's threats. User might be confused why counts differ.

---

## Implementation Considerations

### Data Architecture

1. **Single source of truth** - Decide definitively: workspace_data JSON OR localStorage OR backend. Recommend migrating fully to workspace_data and removing localStorage usage.

2. **Optimistic updates** - UI should update immediately on status change, then sync to backend. Need rollback on failure.

3. **Debounced saves** - Don't save on every keystroke. Batch changes and save every few seconds (like current 30s auto-save for diagram).

4. **Conflict resolution** - If implementing multi-tab support, need last-write-wins or merge strategy.

### State Management

5. **Lift threat state** - Threat state should live in a common ancestor (ThreatModelDetail or context provider), not duplicated in DFD editor.

6. **Memoize badge data** - Pre-compute threat summaries for all nodes once, don't recalculate on every render.

7. **Selective re-renders** - Use React.memo with custom comparators. Nodes should only re-render when their specific threat data changes.

8. **Lazy load threat details** - Load full countermeasure data only when threat is expanded, not upfront.

### UI/UX

9. **Panel responsiveness** - Test panel at various widths. Consider minimum width or horizontal scroll for countermeasure buttons.

10. **Default tab behavior** - Remember last-used tab per session? Or always default to Properties?

11. **Empty state design** - "No threats analyzed yet. Click 'Analyze Threats' to get started." with clear CTA.

12. **Loading skeletons** - Show placeholder content while threat data loads, not blank space.

13. **Confirmation dialogs** - Confirm before dismissing threats or changing status to "waived" (permanent-feeling actions).

14. **Undo support** - At minimum, allow restoring dismissed threats. Ideally, full undo/redo for all threat changes.

15. **Badge positioning** - Test badge placement with various node sizes and label lengths. Avoid overlap with node content.

16. **Color accessibility** - Red/yellow/green badges need sufficient contrast. Consider adding icons (✓, !, ×) for colorblind users.

### Edge Cases

17. **Actor nodes** - Actors typically don't have threats in STRIDE. Should we hide the Threats tab for actors, or show "No applicable threats"?

18. **System boundaries** - These are organizational, not security constructs. Threats may not apply. Handle gracefully.

19. **Unconnected nodes** - A process with no data flows has different threat profile. Should we warn user?

20. **Template insertion** - When user inserts a template, should threats be auto-initialized for all new nodes?

21. **Copy/paste nodes** - If user copies a node, should threats copy too? Probably not - threats are instance-specific.

22. **Node type changes** - If user somehow changes a process to a datastore, threats become invalid. (May not be possible in current UI, but worth considering.)

### Testing

23. **Mock threat data** - Create fixtures with various threat states for testing all badge/status combinations.

24. **Performance benchmarks** - Test with diagrams of 10, 50, 100+ nodes to ensure acceptable performance.

25. **Cross-browser testing** - Badge positioning and panel layout may vary across browsers.

26. **Concurrent editing simulation** - Test what happens when same diagram edited in multiple tabs.

### Migration

27. **Existing diagrams** - Users with existing threat data in localStorage need seamless migration to new system.

28. **Backwards compatibility** - If threat data structure changes, handle old format gracefully.

29. **Feature flag** - Consider rolling out behind a flag to test with subset of users first.

### Documentation

30. **User guide updates** - Document new workflow: "You can now view and edit threats directly from the DFD editor..."

31. **Tooltip help** - Add tooltips explaining badge colors, status meanings, etc.

---

## Open Questions

1. **Threat initialization** - Should selecting a node auto-initialize threats if none exist, or require explicit "Analyze Threats" action?

2. **Badge click behavior** - Should clicking the threat badge on a node open the panel to the Threats tab directly?

3. **Bulk actions** - Should we support bulk status changes (e.g., mark all countermeasures as "platform")?

4. **Filtering** - Should the threats tab support filtering by status (show only exposed)?

---

## Success Metrics

1. Reduced time to update countermeasure status (no context switching)
2. Increased engagement with threat analysis (more accessible)
3. Better coverage (visual indicators highlight gaps)

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Tabbed Panel | Small |
| Phase 2: Threats Tab | Medium |
| Phase 3: Node Badges | Small |
| Phase 4: Edge Indicators | Small |
| Phase 5: Data Integration | Medium |
| Testing & Polish | Medium |

---

## References

- Current DFD Editor: `frontend/src/features/dfd-editor/DFDEditor.tsx`
- Current Properties Panel: `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx`
- Current Threat Analysis: `frontend/src/features/dfd-editor/components/threat-analysis/ComponentView.tsx`
- Threat Types: `frontend/src/features/dfd-editor/types/threat-analysis.ts`
