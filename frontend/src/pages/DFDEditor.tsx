import { useCallback, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  type Connection,
  type NodeDragHandler,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Save, Clock, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { nodeTypes, edgeTypes } from '@/components/diagram'
import { DiagramToolbar } from '@/components/diagram/DiagramToolbar'
import { NodeEditPanel } from '@/components/diagram/NodeEditPanel'
import { EdgeEditPanel } from '@/components/diagram/EdgeEditPanel'
import { TemplateBrowser } from '@/components/diagram/TemplateBrowser'
import { useDiagramState } from '@/hooks/useDiagramState'
import { useParentRelationships } from '@/hooks/useParentRelationships'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { DiagramNode, DataFlowEdge } from '@/types'

function DFDEditorContent() {
  const { diagramId, id: threatModelId } = useParams<{ id: string; diagramId: string }>()
  const navigate = useNavigate()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // State for UI
  const [connectionMode, setConnectionMode] = useState(false)
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<DataFlowEdge | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

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

  // Parent relationship detection
  const { updateParentRelationships } = useParentRelationships()

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: DiagramNode) => {
      setSelectedNode(node)
      setSelectedEdge(null)
    },
    []
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
  }, [])

  // Handle node drag end - update parent relationships
  const handleNodeDragStop: NodeDragHandler<DiagramNode> = useCallback(
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

      // Offset nodes to avoid overlap
      const offset = { x: 100, y: 100 }

      const newNodes: DiagramNode[] = templateNodes.map((node) => ({
        ...node,
        id: idMap.get(node.id)!,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        parentId: node.parentId && idMap.has(node.parentId)
          ? idMap.get(node.parentId)
          : undefined,
      }))

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
  const handleTitleClick = useCallback(() => {
    if (diagram) {
      setTitleValue(diagram.title)
      setIsEditingTitle(true)
      setTimeout(() => titleInputRef.current?.select(), 0)
    }
  }, [diagram])

  const handleTitleSave = useCallback(async () => {
    const trimmedTitle = titleValue.trim()
    if (trimmedTitle && trimmedTitle !== diagram?.title) {
      await updateTitle(trimmedTitle)
    }
    setIsEditingTitle(false)
  }, [titleValue, diagram?.title, updateTitle])

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !diagram) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <p className="text-muted-foreground">Failed to load diagram</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
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
                <h1 className="font-semibold">{diagram.title}</h1>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              Data Flow Diagram
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
        </div>
      </div>

      {/* Toolbar */}
      <DiagramToolbar
        connectionMode={connectionMode}
        onConnectionModeChange={setConnectionMode}
        onOpenTemplates={() => setShowTemplates(true)}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
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
            <MiniMap
              nodeStrokeColor={(n) => {
                if (n.type === 'actor') return '#16a34a'
                if (n.type === 'process') return '#2563eb'
                if (n.type === 'datastore') return '#9333ea'
                if (n.type === 'trustBoundary') return '#ea580c'
                if (n.type === 'systemBoundary') return '#475569'
                return '#64748b'
              }}
              nodeColor={(n) => {
                if (n.type === 'actor') return '#dcfce7'
                if (n.type === 'process') return '#dbeafe'
                if (n.type === 'datastore') return '#f3e8ff'
                if (n.type === 'trustBoundary') return '#ffedd5'
                if (n.type === 'systemBoundary') return '#f1f5f9'
                return '#f8fafc'
              }}
              maskColor="rgba(0,0,0,0.1)"
            />

            {/* Connection mode indicator */}
            {connectionMode && (
              <Panel position="top-center">
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                  Click and drag from a node to create a connection
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Edit Panel */}
        {currentSelectedNode && (
          <NodeEditPanel
            node={currentSelectedNode}
            onClose={() => setSelectedNode(null)}
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
