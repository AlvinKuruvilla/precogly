import { useCallback, useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  ReactFlowProvider,
  ConnectionMode,
  useReactFlow,
  useViewport,
  type Connection,
  type XYPosition,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Save, Clock, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteDFDDialog } from '@/components/threat-models'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useThreatModel, useDeleteDFD } from '@/api/threat-models'
// DFD Editor internal imports
import { nodeTypes, edgeTypes } from './components'
import { DiagramToolbar } from './components/DiagramToolbar'
import { NodeEditPanel } from './components/panels/NodeEditPanel'
import { EdgeEditPanel } from './components/panels/EdgeEditPanel'
import { TemplateBrowser } from './components/TemplateBrowser'
import { useDiagramState } from './hooks/useDiagramState'
import { useParentRelationships } from './hooks/useParentRelationships'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { DiagramNode, DataFlowEdge } from './types'

function DFDEditorContent() {
  const { diagramId, id: threatModelId } = useParams<{ id: string; diagramId: string }>()
  const navigate = useNavigate()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // State for UI
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState<XYPosition | null>(null)
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<DataFlowEdge | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // ReactFlow instance for coordinate conversion
  const { screenToFlowPosition } = useReactFlow()
  const { x: viewportX, y: viewportY, zoom } = useViewport()

  // Delete DFD mutation
  const deleteDFDMutation = useDeleteDFD()

  // Diagram state management
  const {
    diagram,
    nodes,
    edges,
    isLoading,
    isSaving,
    isError,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    saveNow,
    updateTitle,
    // Undo feature - remove this line to disable undo functionality
    undo,
    hasUnsavedChanges,
    lastSaved,
  } = useDiagramState({
    diagramId: diagramId || '',
    autoSaveInterval: 30000,
  })

  // State for editable title
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Fetch threat model for name display
  const { data: threatModel } = useThreatModel(threatModelId || '')

  // Parent relationship detection
  const { updateParentRelationships } = useParentRelationships()

  // Clear connection source when connection mode is turned off
  useEffect(() => {
    if (!connectionMode) {
      setConnectionSourceId(null)
      setMousePosition(null)
    }
  }, [connectionMode])

  // Calculate absolute position of a node (accounting for parent offsets)
  const getAbsolutePosition = useCallback(
    (nodeId: string): XYPosition | null => {
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return null

      let x = node.position.x
      let y = node.position.y

      // Traverse up the parent chain to accumulate offsets
      let currentNode = node
      while (currentNode.parentId) {
        const parent = nodes.find((n) => n.id === currentNode.parentId)
        if (!parent) break
        x += parent.position.x
        y += parent.position.y
        currentNode = parent as DiagramNode
      }

      return { x, y }
    },
    [nodes]
  )

  // Smart handle selection based on absolute node positions
  // Also considers existing edges to avoid overlapping reverse connections
  const getSmartHandles = useCallback(
    (sourceId: string, targetId: string): { sourceHandle: string; targetHandle: string } => {
      const sourcePos = getAbsolutePosition(sourceId)
      const targetPos = getAbsolutePosition(targetId)

      if (!sourcePos || !targetPos) {
        return { sourceHandle: 'right-source', targetHandle: 'left-target' }
      }

      const dx = targetPos.x - sourcePos.x
      const dy = targetPos.y - sourcePos.y

      // Check if an edge already exists between these nodes (in either direction)
      const existingEdge = edges.find(
        (e) =>
          (e.source === sourceId && e.target === targetId) ||
          (e.source === targetId && e.target === sourceId)
      )

      // Determine primary and secondary axis based on relative positions
      const primaryIsHorizontal = Math.abs(dx) > Math.abs(dy)

      // If no existing edge, use primary axis (most direct route)
      if (!existingEdge) {
        if (primaryIsHorizontal) {
          // Horizontal: target is to the right or left
          if (dx > 0) {
            return { sourceHandle: 'right-source', targetHandle: 'left-target' }
          } else {
            return { sourceHandle: 'left-source', targetHandle: 'right-target' }
          }
        } else {
          // Vertical: target is below or above
          if (dy > 0) {
            return { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
          } else {
            return { sourceHandle: 'top-source', targetHandle: 'bottom-target' }
          }
        }
      }

      // An edge already exists - use secondary axis (perpendicular) to avoid overlap
      if (primaryIsHorizontal) {
        // Primary was horizontal, so use vertical for the new edge
        if (dy >= 0) {
          return { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
        } else {
          return { sourceHandle: 'top-source', targetHandle: 'bottom-target' }
        }
      } else {
        // Primary was vertical, so use horizontal for the new edge
        if (dx >= 0) {
          return { sourceHandle: 'right-source', targetHandle: 'left-target' }
        } else {
          return { sourceHandle: 'left-source', targetHandle: 'right-target' }
        }
      }
    },
    [getAbsolutePosition, edges]
  )

  // Get the source node's absolute position for visual feedback
  const connectionSourcePosition = connectionSourceId
    ? getAbsolutePosition(connectionSourceId)
    : null

  // Handle node click - supports both selection and click-to-connect
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: DiagramNode) => {
      // In connection mode, handle click-to-connect
      if (connectionMode) {
        // Only allow connecting process, datastore, and actor nodes
        const connectableTypes = ['process', 'datastore', 'actor']
        if (!connectableTypes.includes(node.type || '')) {
          return
        }

        if (!connectionSourceId) {
          // First click: set as source
          setConnectionSourceId(node.id)
        } else if (connectionSourceId === node.id) {
          // Clicked same node: deselect
          setConnectionSourceId(null)
        } else {
          // Second click on different node: create edge
          const { sourceHandle, targetHandle } = getSmartHandles(connectionSourceId, node.id)

          const newEdge: DataFlowEdge = {
            id: `edge-${Date.now()}`,
            source: connectionSourceId,
            target: node.id,
            sourceHandle,
            targetHandle,
            type: 'dataFlow',
            animated: true,
            data: {
              label: '',
              encrypted: false,
              authenticated: false,
            },
          }

          setEdges((eds) => addEdge(newEdge, eds) as DataFlowEdge[])
          // Clear source but stay in connection mode for chaining
          setConnectionSourceId(null)
        }
        return
      }

      // Normal mode: select node for editing
      setSelectedNode(node)
      setSelectedEdge(null)
    },
    [connectionMode, connectionSourceId, getSmartHandles, setEdges]
  )

  // Handle edge selection
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: DataFlowEdge) => {
      setSelectedEdge(edge)
      setSelectedNode(null)
    },
    []
  )

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
    // In connection mode, clicking empty space clears source selection
    if (connectionMode) {
      setConnectionSourceId(null)
    }
  }, [connectionMode])

  // Track mouse position for connection line overlay
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (connectionMode && connectionSourceId) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
        setMousePosition(position)
      }
    },
    [connectionMode, connectionSourceId, screenToFlowPosition]
  )

  // Handle node drag end - update parent relationships
  const handleNodeDragStop = useCallback(
    () => {
      updateParentRelationships(nodes, setNodes)
    },
    [nodes, setNodes, updateParentRelationships]
  )

  // Handle new connections
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      const newEdge: DataFlowEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'dataFlow',
        animated: true,
        data: {
          label: '',
          encrypted: false,
          authenticated: false,
        },
      }

      setEdges((eds) => addEdge(newEdge, eds) as DataFlowEdge[])
    },
    [setEdges]
  )

  // Handle template insertion
  const handleInsertTemplate = useCallback(
    (templateNodes: DiagramNode[], templateEdges: DataFlowEdge[]) => {
      const timestamp = Date.now()

      // Create ID mapping
      const idMap = new Map<string, string>()
      templateNodes.forEach((node, index) => {
        idMap.set(node.id, `${node.type}-${timestamp}-${index}`)
      })

      // Offset only root nodes to avoid overlap
      // Child nodes keep their relative positions (relative to parent)
      const offset = { x: 100, y: 100 }

      const newNodes: DiagramNode[] = templateNodes.map((node) => {
        const hasParent = node.parentId && idMap.has(node.parentId)
        return {
          ...node,
          id: idMap.get(node.id)!,
          position: hasParent
            ? node.position // Keep relative position for children
            : {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
              },
          parentId: hasParent ? idMap.get(node.parentId!) : undefined,
        }
      })

      const newEdges: DataFlowEdge[] = templateEdges.map((edge, index) => ({
        ...edge,
        id: `edge-${timestamp}-${index}`,
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target,
      }))

      setNodes((nds) => [...nds, ...newNodes])
      setEdges((eds) => [...eds, ...newEdges])
      setShowTemplates(false)
    },
    [setNodes, setEdges]
  )

  // Keep selectedNode/selectedEdge in sync with actual node/edge data
  const currentSelectedNode = selectedNode
    ? (nodes.find((n) => n.id === selectedNode.id) as DiagramNode | undefined)
    : null

  const currentSelectedEdge = selectedEdge
    ? (edges.find((e) => e.id === selectedEdge.id) as DataFlowEdge | undefined)
    : null

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: saveNow,
    // Undo feature - remove this line to disable undo functionality
    onUndo: undo,
    enabled: true,
  })

  // Format last saved time
  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never saved'
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return 'Saved just now'
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`
    return `Saved ${Math.floor(diff / 3600)}h ago`
  }

  // Handle title editing
  const diagramTitle = diagram?.name || ''

  const handleTitleClick = useCallback(() => {
    if (diagram) {
      setTitleValue(diagramTitle)
      setIsEditingTitle(true)
      setTimeout(() => titleInputRef.current?.select(), 0)
    }
  }, [diagram, diagramTitle])

  const handleTitleSave = useCallback(async () => {
    const trimmedTitle = titleValue.trim()
    if (trimmedTitle && trimmedTitle !== diagramTitle) {
      await updateTitle(trimmedTitle)
    }
    setIsEditingTitle(false)
  }, [titleValue, diagramTitle, updateTitle])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTitleSave()
      } else if (e.key === 'Escape') {
        setIsEditingTitle(false)
      }
    },
    [handleTitleSave]
  )

  // Handle DFD deletion
  const handleConfirmDelete = useCallback(
    (deleteOrphanedComponents: boolean) => {
      if (diagramId) {
        deleteDFDMutation.mutate(
          { dfdId: diagramId, deleteOrphanedComponents },
          {
            onSuccess: () => {
              setShowDeleteDialog(false)
              navigate(`/threat-models/${threatModelId}`)
            },
          }
        )
      }
    },
    [diagramId, deleteDFDMutation, navigate, threatModelId]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-44px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !diagram) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-44px)] gap-4">
        <p className="text-muted-foreground">Failed to load diagram</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-44px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-4">
          <Link
            to={`/threat-models/${threatModelId}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div>
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="font-semibold bg-transparent border-b-2 border-primary outline-none px-0 py-0 min-w-[200px]"
                autoFocus
              />
            ) : (
              <button
                onClick={handleTitleClick}
                className="flex items-center gap-2 group text-left"
              >
                <h1 className="font-semibold">{diagramTitle}</h1>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              {threatModel?.name ? `${threatModel.name}` : 'Data Flow Diagram'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasUnsavedChanges ? (
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isSaving
                      ? 'Saving...'
                      : hasUnsavedChanges
                      ? 'Unsaved changes'
                      : formatLastSaved(lastSaved)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {hasUnsavedChanges
                  ? 'You have unsaved changes. Press Cmd/Ctrl+S to save.'
                  : `Last saved: ${lastSaved?.toLocaleString() || 'Never'}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            size="sm"
            onClick={saveNow}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <DiagramToolbar
        connectionMode={connectionMode}
        onConnectionModeChange={setConnectionMode}
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenThreatAnalysis={async () => {
          // Save any unsaved changes before navigating so Threat Analysis sees latest data
          if (hasUnsavedChanges) {
            await saveNow()
          }
          navigate(`/threat-models/${threatModelId}`)
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper} onMouseMove={handleMouseMove}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{
              type: 'dataFlow',
              animated: true,
            }}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            minZoom={0.1}
            maxZoom={4}
            deleteKeyCode={null} // We handle delete in useKeyboardShortcuts
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
                <marker
                  id="arrow-selected"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
              </defs>
            </svg>

            <Background gap={15} size={1} />
            <Controls />

            {/* Connection mode indicator */}
            {connectionMode && (
              <Panel position="top-center">
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                  {connectionSourceId
                    ? 'Click another node to connect, or click empty space to cancel'
                    : 'Click a node to start connecting'}
                </div>
              </Panel>
            )}

            {/* Connection line overlay - dashed line from source to cursor */}
            {connectionMode && connectionSourcePosition && mousePosition && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  overflow: 'visible',
                }}
              >
                <g transform={`translate(${viewportX}, ${viewportY}) scale(${zoom})`}>
                  <line
                    x1={connectionSourcePosition.x + 75}
                    y1={connectionSourcePosition.y + 40}
                    x2={mousePosition.x}
                    y2={mousePosition.y}
                    stroke="#3b82f6"
                    strokeWidth={2 / zoom}
                    strokeDasharray={`${8 / zoom} ${4 / zoom}`}
                    opacity="0.7"
                  />
                  <circle
                    cx={mousePosition.x}
                    cy={mousePosition.y}
                    r={6 / zoom}
                    fill="#3b82f6"
                    opacity="0.7"
                  />
                </g>
              </svg>
            )}

            {/* Source node highlight overlay */}
            {connectionMode && connectionSourcePosition && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 999,
                  overflow: 'visible',
                }}
              >
                <g transform={`translate(${viewportX}, ${viewportY}) scale(${zoom})`}>
                  <rect
                    x={connectionSourcePosition.x - 4}
                    y={connectionSourcePosition.y - 4}
                    width="158"
                    height="88"
                    rx="12"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={3 / zoom}
                    opacity="0.8"
                    style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                  />
                </g>
              </svg>
            )}
          </ReactFlow>
        </div>

        {/* Edit Panel */}
        {currentSelectedNode && (
          <NodeEditPanel
            node={currentSelectedNode}
            onClose={() => setSelectedNode(null)}
            threatModelId={threatModelId}
          />
        )}
        {currentSelectedEdge && (
          <EdgeEditPanel
            edge={currentSelectedEdge}
            onClose={() => setSelectedEdge(null)}
          />
        )}
      </div>

      {/* Template Browser Dialog */}
      {showTemplates && (
        <TemplateBrowser
          open={showTemplates}
          onOpenChange={setShowTemplates}
          onInsert={handleInsertTemplate}
        />
      )}

      {/* Delete DFD Dialog */}
      <DeleteDFDDialog
        dfdId={diagramId ?? null}
        dfdName={diagramTitle}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteDFDMutation.isPending}
      />
    </div>
  )
}

export function DFDEditor() {
  return (
    <ReactFlowProvider>
      <DFDEditorContent />
    </ReactFlowProvider>
  )
}
