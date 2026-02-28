# DFD Editor

A self-contained Data Flow Diagram editor built with [@xyflow/react](https://reactflow.dev/).

## Structure

```
dfd-editor/
├── DFDEditor.tsx          # Main component
├── components/
│   ├── nodes/             # Custom node types (Process, DataStore, Actor, Boundaries)
│   ├── edges/             # DataFlowEdge with protocol/encryption metadata
│   └── panels/            # Right-side edit panels for nodes/edges
├── hooks/
│   ├── useDiagramState    # State, API integration, auto-save
│   ├── useUndoHistory     # Undo stack (Cmd+Z)
│   ├── useKeyboardShortcuts
│   └── useParentRelationships  # Boundary nesting logic
├── lib/
│   └── technology-registry    # 250+ technologies (AWS, Azure, GCP, etc.)
└── types/
    └── diagram.ts         # Node/edge type definitions
```

## Key Concepts

- **Nodes**: Process, DataStore, Actor, TrustZone, SystemScope
- **Edges**: Data flows with protocol, encryption, and classification metadata
- **Containers**: Nodes can be nested inside trust zones or system scopes (auto-detected on drag)

## Extending

**Add a node type:**
1. Create component in `components/nodes/`
2. Add type to `DiagramNodeType` in `types/diagram.ts`
3. Register in `nodeTypes` object in `DFDEditor.tsx`

**Add technologies:**
- Edit `lib/technology-registry.ts`
