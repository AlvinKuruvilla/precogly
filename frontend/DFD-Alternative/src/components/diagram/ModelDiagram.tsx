import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ArchitectureModel, Element } from '../../types/model'
import { Loader2, User, Server, Database, Globe, Box, Shield } from 'lucide-react'

interface ModelDiagramProps {
  model: ArchitectureModel | null
  viewId?: string
  onViewChange?: (viewId: string) => void
  className?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM NODE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const ELEMENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  actor: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  external: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-600' },
  system: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
  service: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  datastore: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  component: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  trustBoundary: { bg: 'bg-red-50/30', border: 'border-red-300', text: 'text-red-600' },
}

const ELEMENT_ICONS: Record<string, typeof User> = {
  actor: User,
  external: Globe,
  system: Box,
  service: Server,
  datastore: Database,
  component: Box,
  trustBoundary: Shield,
}

interface ElementNodeData {
  label: string
  kind: string
  description?: string
  technology?: string
  tags: string[]
}

function ElementNode({ data }: { data: ElementNodeData }) {
  const colors = ELEMENT_COLORS[data.kind] || ELEMENT_COLORS.component
  const Icon = ELEMENT_ICONS[data.kind] || Box

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-sm min-w-[140px] max-w-[200px] ${colors.bg} ${colors.border}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      <div className="flex items-start gap-2">
        <Icon className={`w-5 h-5 mt-0.5 ${colors.text}`} />
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm ${colors.text} truncate`}>
            {data.label}
          </div>
          {data.technology && (
            <div className="text-xs text-gray-500 truncate mt-0.5">
              {data.technology}
            </div>
          )}
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-white/50 text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  )
}

function BoundaryNode({ data }: { data: ElementNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50/20 min-w-[200px] min-h-[100px]">
      <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
        <Shield className="w-4 h-4" />
        {data.label}
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  element: ElementNode,
  boundary: BoundaryNode,
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT HELPERS
// ═══════════════════════════════════════════════════════════════════════════

interface ViewFilter {
  includes: Set<string>
  scope?: string
}

function getViewFilter(model: ArchitectureModel, viewId: string): ViewFilter | null {
  const view = model.views.find(v => v.id === viewId)
  if (!view) return null

  // Parse includes - for now we support simple element IDs and wildcards
  const includes = new Set<string>()

  for (const inc of view.includes) {
    if (inc === '*') {
      // Include all elements
      model.model.elements.forEach(e => {
        includes.add(e.id)
        if (e.children) {
          e.children.forEach(c => includes.add(c.id))
        }
      })
    } else if (inc.endsWith('.*')) {
      // Include children of element (e.g., "platform.*")
      const parentId = inc.slice(0, -2)
      const parent = model.model.elements.find(e => e.id === parentId)
      if (parent?.children) {
        parent.children.forEach(c => includes.add(c.id))
      }
    } else {
      includes.add(inc)
    }
  }

  return { includes, scope: view.scope }
}

function shouldIncludeElement(elementId: string, filter: ViewFilter | null): boolean {
  if (!filter) return true
  if (filter.includes.size === 0) return true
  return filter.includes.has(elementId)
}

function shouldIncludeRelationship(rel: { source: string; target: string }, filter: ViewFilter | null, includedElements: Set<string>): boolean {
  if (!filter) return true
  // Include relationship if both source and target are visible
  return includedElements.has(rel.source) && includedElements.has(rel.target)
}

function convertModelToFlow(
  model: ArchitectureModel,
  viewId: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Get view filter
  const filter = getViewFilter(model, viewId)
  const includedElements = new Set<string>()

  // Layout constants
  const nodeWidth = 180
  const nodeHeight = 100
  const gapX = 60
  const gapY = 80
  const boundaryPadding = 40

  // Group elements by boundary for layout
  const elementsByBoundary = new Map<string, Element[]>()
  elementsByBoundary.set('_none', [])

  function collectElements(element: Element) {
    if (!shouldIncludeElement(element.id, filter)) return

    includedElements.add(element.id)
    const boundaryId = element.boundary || '_none'

    if (!elementsByBoundary.has(boundaryId)) {
      elementsByBoundary.set(boundaryId, [])
    }
    elementsByBoundary.get(boundaryId)!.push(element)

    // Process children
    if (element.children) {
      element.children.forEach(collectElements)
    }
  }

  model.model.elements.forEach(collectElements)

  // Layout boundaries and their elements
  let boundaryX = 0
  const boundaryNodes: Node[] = []

  model.model.boundaries.forEach((boundary) => {
    const elements = elementsByBoundary.get(boundary.id) || []
    if (elements.length === 0) return // Don't show empty boundaries

    const cols = Math.min(elements.length, 2)
    const rows = Math.ceil(elements.length / cols)
    const boundaryWidth = cols * (nodeWidth + gapX) + boundaryPadding * 2
    const boundaryHeight = rows * (nodeHeight + gapY) + boundaryPadding + 60 // Extra for header

    // Add boundary node (group)
    boundaryNodes.push({
      id: `boundary-${boundary.id}`,
      type: 'boundary',
      position: { x: boundaryX, y: 0 },
      data: {
        label: boundary.name,
        kind: 'trustBoundary',
        tags: [],
      },
      style: {
        width: boundaryWidth,
        height: boundaryHeight,
      },
      zIndex: -1,
      draggable: false, // Boundaries are not draggable
    })

    // Add elements inside this boundary
    elements.forEach((element, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const x = boundaryX + boundaryPadding + col * (nodeWidth + gapX)
      const y = 50 + row * (nodeHeight + gapY) // 50px offset for boundary header

      nodes.push({
        id: element.id,
        type: 'element',
        position: { x, y },
        data: {
          label: element.name,
          kind: element.kind,
          description: element.description,
          technology: element.technology,
          tags: element.tags,
        } satisfies ElementNodeData,
      })
    })

    boundaryX += boundaryWidth + 40
  })

  // Add elements without a boundary
  const unboundedElements = elementsByBoundary.get('_none') || []
  unboundedElements.forEach((element, idx) => {
    const col = idx % 3
    const row = Math.floor(idx / 3)
    const x = boundaryX + col * (nodeWidth + gapX)
    const y = row * (nodeHeight + gapY)

    nodes.push({
      id: element.id,
      type: 'element',
      position: { x, y },
      data: {
        label: element.name,
        kind: element.kind,
        description: element.description,
        technology: element.technology,
        tags: element.tags,
      } satisfies ElementNodeData,
    })
  })

  // Add boundary nodes after element nodes (for z-index)
  nodes.unshift(...boundaryNodes)

  // Add edges from relationships
  model.model.relationships.forEach((rel, idx) => {
    if (!shouldIncludeRelationship(rel, filter, includedElements)) return

    edges.push({
      id: `edge-${idx}`,
      source: rel.source,
      target: rel.target,
      label: rel.label,
      type: 'smoothstep',
      animated: rel.tags.includes('#encrypted_in_transit'),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        stroke: rel.tags.includes('#encrypted_in_transit') ? '#22c55e' : '#64748b',
        strokeWidth: 2,
      },
      labelStyle: {
        fontSize: 11,
        fontWeight: 500,
      },
    })
  })

  return { nodes, edges }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ModelDiagram({ model, viewId, onViewChange, className = '' }: ModelDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [isLayouting, setIsLayouting] = useState(false)
  const [currentViewId, setCurrentViewId] = useState(viewId || 'all')

  // Convert model to flow elements when model or view changes
  useEffect(() => {
    if (!model) {
      setNodes([])
      setEdges([])
      return
    }

    setIsLayouting(true)

    // Small delay to show loading state
    const timer = setTimeout(() => {
      const { nodes: flowNodes, edges: flowEdges } = convertModelToFlow(model, currentViewId)
      setNodes(flowNodes)
      setEdges(flowEdges)
      setIsLayouting(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [model, currentViewId, setNodes, setEdges])

  // Get available views
  const availableViews = useMemo(() => {
    if (!model) return []
    return model.views.map((v) => ({ id: v.id, title: v.title || v.id }))
  }, [model])

  // Handle view change
  const handleViewChange = useCallback((newViewId: string) => {
    setCurrentViewId(newViewId)
    onViewChange?.(newViewId)
  }, [onViewChange])

  if (!model) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No Model</p>
          <p className="text-sm">Parse DSL to see the diagram</p>
        </div>
      </div>
    )
  }

  if (isLayouting) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Laying out diagram...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* View selector */}
      {availableViews.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-600">View:</span>
          <select
            value={currentViewId}
            onChange={(e) => handleViewChange(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
          >
            {availableViews.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Diagram */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as Record<string, unknown> | undefined
              const kind = (data?.kind as string) || 'component'
              const colors: Record<string, string> = {
                actor: '#3b82f6',
                external: '#6b7280',
                system: '#6366f1',
                service: '#22c55e',
                datastore: '#f59e0b',
                component: '#a855f7',
              }
              return colors[kind] || '#6b7280'
            }}
            maskColor="rgba(255, 255, 255, 0.8)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
