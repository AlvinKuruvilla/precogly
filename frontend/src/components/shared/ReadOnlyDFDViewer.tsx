/**
 * Read-only DFD viewer for shared/public views.
 * Displays a Data Flow Diagram without editing capabilities.
 */

import { ReactFlow, Background, Controls, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes, edgeTypes } from '@/features/dfd-editor/components'

// Flexible canvas data type that accepts the API response format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CanvasData {
  nodes?: any[]
  edges?: any[]
}

interface ReadOnlyDFDViewerProps {
  canvasData: CanvasData
  className?: string
}

function DFDViewerContent({ canvasData, className }: ReadOnlyDFDViewerProps) {
  const nodes = canvasData.nodes ?? []
  const edges = canvasData.edges ?? []

  return (
    <div className={className}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        // Disable all interactions except pan and zoom
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        preventScrolling
      >
        {/* SVG Definitions for edge markers */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
            </marker>
          </defs>
        </svg>
        <Background gap={15} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

export function ReadOnlyDFDViewer(props: ReadOnlyDFDViewerProps) {
  return (
    <ReactFlowProvider>
      <DFDViewerContent {...props} />
    </ReactFlowProvider>
  )
}
