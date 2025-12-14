import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { NodeChange, EdgeChange } from '@xyflow/react'
import type { Diagram, DiagramNode, DataFlowEdge } from '../types'
// Undo feature - remove this import to disable undo functionality
import { useUndoHistory } from './useUndoHistory'

interface UseDiagramStateOptions {
  diagramId: string
  autoSaveInterval?: number // ms, 0 to disable
}

interface UseDiagramStateReturn {
  // Data
  diagram: Diagram | undefined
  nodes: DiagramNode[]
  edges: DataFlowEdge[]

  // Loading states
  isLoading: boolean
  isSaving: boolean
  isError: boolean
  error: Error | null

  // Actions
  setNodes: React.Dispatch<React.SetStateAction<DiagramNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<DataFlowEdge[]>>
  onNodesChange: (changes: NodeChange<DiagramNode>[]) => void
  onEdgesChange: (changes: EdgeChange<DataFlowEdge>[]) => void
  saveNow: () => Promise<void>
  updateTitle: (title: string) => Promise<void>
  // Undo feature - remove this line to disable undo functionality
  undo: () => void

  // State
  hasUnsavedChanges: boolean
  lastSaved: Date | null
  // Undo feature - remove this line to disable undo functionality
  canUndo: boolean
}

async function fetchDiagram(diagramId: string): Promise<Diagram> {
  const response = await fetch(`/api/diagrams/${diagramId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch diagram')
  }
  return response.json()
}

async function saveDiagram(
  diagramId: string,
  data: { nodes: DiagramNode[]; edges: DataFlowEdge[] }
): Promise<Diagram> {
  const response = await fetch(`/api/diagrams/${diagramId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canvasData: {
        nodes: data.nodes,
        edges: data.edges,
      },
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to save diagram')
  }
  return response.json()
}

async function updateDiagramTitle(
  diagramId: string,
  title: string
): Promise<Diagram> {
  const response = await fetch(`/api/diagrams/${diagramId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!response.ok) {
    throw new Error('Failed to update diagram title')
  }
  return response.json()
}

export function useDiagramState({
  diagramId,
  autoSaveInterval = 30000, // 30 seconds default
}: UseDiagramStateOptions): UseDiagramStateReturn {
  const queryClient = useQueryClient()

  // Local state for nodes and edges
  const [nodes, setNodes] = useState<DiagramNode[]>([])
  const [edges, setEdges] = useState<DataFlowEdge[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Track if initial data has been loaded
  const initialLoadRef = useRef(false)

  // Undo feature - remove this block to disable undo functionality
  const { pushToHistory, undo: undoFromHistory, canUndo } = useUndoHistory()
  const nodesRef = useRef<DiagramNode[]>(nodes)
  const edgesRef = useRef<DataFlowEdge[]>(edges)
  // Keep refs in sync for undo access
  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  // Fetch diagram data
  const {
    data: diagram,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['diagram', diagramId],
    queryFn: () => fetchDiagram(diagramId),
    staleTime: 60000, // Consider fresh for 1 minute
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: { nodes: DiagramNode[]; edges: DataFlowEdge[] }) =>
      saveDiagram(diagramId, data),
    onSuccess: (updatedDiagram) => {
      queryClient.setQueryData(['diagram', diagramId], updatedDiagram)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    },
  })

  // Title update mutation
  const titleMutation = useMutation({
    mutationFn: (title: string) => updateDiagramTitle(diagramId, title),
    onSuccess: (updatedDiagram) => {
      queryClient.setQueryData(['diagram', diagramId], updatedDiagram)
    },
  })

  // Initialize nodes and edges from fetched diagram
  useEffect(() => {
    if (diagram && !initialLoadRef.current) {
      setNodes(diagram.canvasData.nodes as DiagramNode[])
      setEdges(diagram.canvasData.edges as DataFlowEdge[])
      setLastSaved(new Date(diagram.updatedAt))
      initialLoadRef.current = true
    }
  }, [diagram])

  // Reset initial load ref when diagram ID changes
  useEffect(() => {
    initialLoadRef.current = false
  }, [diagramId])

  // Track changes to nodes
  const handleNodesChange = useCallback((changes: NodeChange<DiagramNode>[]) => {
    // Only mark as changed for meaningful changes (not selection)
    const hasRealChanges = changes.some(
      (c) => c.type !== 'select' && c.type !== 'dimensions'
    )
    // Undo feature - push to history before meaningful changes
    if (hasRealChanges) {
      pushToHistory({ nodes: nodesRef.current, edges: edgesRef.current })
    }
    setNodes((nds) => applyNodeChanges(changes, nds) as DiagramNode[])
    if (hasRealChanges) {
      setHasUnsavedChanges(true)
    }
  }, [pushToHistory])

  // Track changes to edges
  const handleEdgesChange = useCallback((changes: EdgeChange<DataFlowEdge>[]) => {
    // Only mark as changed for meaningful changes
    const hasRealChanges = changes.some((c) => c.type !== 'select')
    // Undo feature - push to history before meaningful changes
    if (hasRealChanges) {
      pushToHistory({ nodes: nodesRef.current, edges: edgesRef.current })
    }
    setEdges((eds) => applyEdgeChanges(changes, eds) as DataFlowEdge[])
    if (hasRealChanges) {
      setHasUnsavedChanges(true)
    }
  }, [pushToHistory])

  // Auto-save effect
  useEffect(() => {
    if (autoSaveInterval <= 0 || !hasUnsavedChanges) return

    const timer = setTimeout(() => {
      saveMutation.mutate({ nodes, edges })
    }, autoSaveInterval)

    return () => clearTimeout(timer)
  }, [nodes, edges, hasUnsavedChanges, autoSaveInterval, saveMutation])

  // Save now function
  const saveNow = useCallback(async () => {
    await saveMutation.mutateAsync({ nodes, edges })
  }, [nodes, edges, saveMutation])

  // Update title function
  const updateTitle = useCallback(async (title: string) => {
    await titleMutation.mutateAsync(title)
  }, [titleMutation])

  // Undo feature - remove this block to disable undo functionality
  const undo = useCallback(() => {
    const previousState = undoFromHistory()
    if (previousState) {
      setNodes(previousState.nodes)
      setEdges(previousState.edges)
      setHasUnsavedChanges(true)
    }
  }, [undoFromHistory])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return {
    diagram,
    nodes,
    edges,
    isLoading,
    isSaving: saveMutation.isPending,
    isError,
    error: error as Error | null,
    setNodes,
    setEdges,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    saveNow,
    updateTitle,
    // Undo feature - remove these lines to disable undo functionality
    undo,
    canUndo: canUndo(),
    hasUnsavedChanges,
    lastSaved,
  }
}
