import { useCallback, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import type { NodeChange, EdgeChange } from '@xyflow/react'
import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'
import { useGuestDiagramState } from './hooks/useGuestDiagramState'
import { useGuestThreats } from './hooks/useGuestThreats'
import { useGuestCountermeasures } from './hooks/useGuestCountermeasures'
import { GuestEditorProvider } from './context/GuestEditorContext'
import { GuestEditorHeader } from './components/GuestEditorHeader'

export interface GuestDiagramOutletContext {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  setNodes: React.Dispatch<React.SetStateAction<DiagramNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<DiagramEdge[]>>
  onNodesChange: (changes: NodeChange<DiagramNode>[]) => void
  onEdgesChange: (changes: EdgeChange<DiagramEdge>[]) => void
  undo: () => void
  canUndo: boolean
}

export function GuestLayout() {
  const diagramState = useGuestDiagramState()
  const threatOps = useGuestThreats()
  const countermeasureOps = useGuestCountermeasures()

  // Wrap removeThreat to cascade-delete countermeasures
  const removeThreatWithCascade = useCallback(
    (threatId: string) => {
      threatOps.removeThreat(threatId)
      countermeasureOps.removeCountermeasuresForThreat(threatId)
    },
    [threatOps.removeThreat, countermeasureOps.removeCountermeasuresForThreat]
  )

  const contextValue = useMemo(
    () => ({
      // Diagram data (read-only)
      nodes: diagramState.nodes,
      edges: diagramState.edges,
      title: diagramState.title,

      // Threat operations (with cascade delete)
      addThreat: threatOps.addThreat,
      updateThreat: threatOps.updateThreat,
      removeThreat: removeThreatWithCascade,
      getThreatsForTarget: threatOps.getThreatsForTarget,
      getThreatCount: threatOps.getThreatCount,
      getAllThreats: threatOps.getAllThreats,
      loadThreats: threatOps.loadThreats,

      // Countermeasure operations
      addCountermeasure: countermeasureOps.addCountermeasure,
      updateCountermeasure: countermeasureOps.updateCountermeasure,
      removeCountermeasure: countermeasureOps.removeCountermeasure,
      getCountermeasuresForThreat: countermeasureOps.getCountermeasuresForThreat,
      getCountermeasureCount: countermeasureOps.getCountermeasureCount,
      getAllCountermeasures: countermeasureOps.getAllCountermeasures,
      loadCountermeasures: countermeasureOps.loadCountermeasures,
    }),
    [
      diagramState.nodes,
      diagramState.edges,
      diagramState.title,
      threatOps.addThreat,
      threatOps.updateThreat,
      removeThreatWithCascade,
      threatOps.getThreatsForTarget,
      threatOps.getThreatCount,
      threatOps.getAllThreats,
      threatOps.loadThreats,
      countermeasureOps.addCountermeasure,
      countermeasureOps.updateCountermeasure,
      countermeasureOps.removeCountermeasure,
      countermeasureOps.getCountermeasuresForThreat,
      countermeasureOps.getCountermeasureCount,
      countermeasureOps.getAllCountermeasures,
      countermeasureOps.loadCountermeasures,
    ]
  )

  const outletContext: GuestDiagramOutletContext = useMemo(
    () => ({
      nodes: diagramState.nodes,
      edges: diagramState.edges,
      setNodes: diagramState.setNodes,
      setEdges: diagramState.setEdges,
      onNodesChange: diagramState.onNodesChange,
      onEdgesChange: diagramState.onEdgesChange,
      undo: diagramState.undo,
      canUndo: diagramState.canUndo,
    }),
    [
      diagramState.nodes,
      diagramState.edges,
      diagramState.setNodes,
      diagramState.setEdges,
      diagramState.onNodesChange,
      diagramState.onEdgesChange,
      diagramState.undo,
      diagramState.canUndo,
    ]
  )

  return (
    <GuestEditorProvider value={contextValue}>
      <div className="flex flex-col h-screen">
        <GuestEditorHeader
          title={diagramState.title}
          onTitleChange={diagramState.setTitle}
          hasUnsavedChanges={diagramState.hasUnsavedChanges}
          onMarkSaved={diagramState.markSaved}
          onLoadFromFile={diagramState.loadFromFile}
        />
        <Outlet context={outletContext} />
      </div>
    </GuestEditorProvider>
  )
}
