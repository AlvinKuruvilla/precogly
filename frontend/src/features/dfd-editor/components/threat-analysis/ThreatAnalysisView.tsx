import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft, Loader2, AlertCircle, Plus, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ComponentView, type Assignee } from './ComponentView'
import { AddThreatDialog } from './AddThreatDialog'
import { AddCountermeasureDialog } from './AddCountermeasureDialog'
import { AddCustomComponentDialog } from './AddCustomComponentDialog'
import {
  useUpdateCountermeasure,
  useUpdateFlowCountermeasure,
  useThreatModelThreats,
  useDismissThreat,
  useRestoreThreat,
  useDismissFlowThreat,
  useRestoreFlowThreat,
  useDeleteCountermeasure,
  useDeleteFlowCountermeasure,
  parseCountermeasureId,
} from '@/api/threats'
import { TableView } from './TableView'
import type { CanvasData } from '../../types'
import type {
  ComponentThreat,
  ComponentThreatCountermeasure,
  CountermeasureStatus,
} from '../../types/threat-analysis'
// NOTE: countermeasure-registry.ts is no longer used here.
// All threat and countermeasure data comes from the backend.

type ViewMode = 'component' | 'table'

interface ThreatAnalysisViewProps {
  threatModelId: string
  diagramId: string
  diagramTitle: string
  canvasData: CanvasData
  selectedFrameworks?: string[]
  onBack: () => void
  backLabel?: string
}

// NOTE: Local threat generation has been removed.
// The backend is now the single source of truth for all threats:
// - Component threats (process/datastore nodes)
// - Data flow threats (edges)
// Trust boundary threats are not yet supported by the backend.

export function ThreatAnalysisView({
  threatModelId,
  diagramId,
  diagramTitle,
  canvasData,
  selectedFrameworks = [],
  onBack,
  backLabel = 'Back',
}: ThreatAnalysisViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('component')

  // Dialog states
  const [addThreatDialogOpen, setAddThreatDialogOpen] = useState(false)
  const [addCountermeasureDialogOpen, setAddCountermeasureDialogOpen] = useState(false)
  const [addComponentDialogOpen, setAddComponentDialogOpen] = useState(false)

  // Fetch backend threats for this threat model
  const {
    data: backendData,
    isLoading,
    isError,
    refetch,
  } = useThreatModelThreats(threatModelId)

  // Filter backend threats to current diagram
  const backendThreats = useMemo(() => {
    if (!backendData?.componentThreats) return []
    return backendData.componentThreats.filter(
      (t) => t.sourceDiagramId === diagramId || t.diagramId === diagramId
    )
  }, [backendData, diagramId])

  // Track local state for modifications not yet persisted
  const [localModifications, setLocalModifications] = useState<Record<string, Partial<ComponentThreat>>>({})

  // Backend threats with local modifications applied
  const componentThreats = useMemo(() => {
    // Apply local modifications to backend threats
    return backendThreats.map((t) => {
      const mods = localModifications[t.id]
      if (mods) {
        return { ...t, ...mods }
      }
      return t
    })
  }, [backendThreats, localModifications])

  // Selected component and threat for drill-down
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null)

  // Get all analyzable components (process, datastore, humanActor, and systemActor nodes)
  const analyzableComponents = useMemo(() => {
    return canvasData.nodes.filter((node) =>
      node.type === 'process' || node.type === 'datastore' ||
      node.type === 'humanActor' || node.type === 'systemActor'
    )
  }, [canvasData.nodes])

  // Get all trust boundaries (for threat analysis)
  const trustZones = useMemo(() => {
    return canvasData.nodes.filter((node) => node.type === 'trustZone')
  }, [canvasData.nodes])

  // Get all data flows (edges)
  const dataFlows = useMemo(() => {
    return canvasData.edges
  }, [canvasData.edges])

  // Get threats for selected component
  const threatsForSelectedComponent = useMemo(() => {
    if (!selectedComponentId) return []
    return componentThreats.filter(
      (ct) => ct.componentId === selectedComponentId && !ct.dismissed
    )
  }, [componentThreats, selectedComponentId])

  // Get selected component threat
  const selectedComponentThreat = useMemo(() => {
    if (!selectedThreatId) return null
    return componentThreats.find((ct) => ct.id === selectedThreatId) || null
  }, [componentThreats, selectedThreatId])

  // Auto-select first component, trust boundary, or data flow if none selected
  useMemo(() => {
    if (!selectedComponentId) {
      if (analyzableComponents.length > 0) {
        setSelectedComponentId(analyzableComponents[0].id)
      } else if (trustZones.length > 0) {
        setSelectedComponentId(trustZones[0].id)
      } else if (dataFlows.length > 0) {
        setSelectedComponentId(dataFlows[0].id)
      }
    }
  }, [selectedComponentId, analyzableComponents, trustZones, dataFlows])

  // Auto-select first threat when component changes
  useMemo(() => {
    if (selectedComponentId && threatsForSelectedComponent.length > 0) {
      // Only auto-select if current selection is invalid
      if (!selectedThreatId || !threatsForSelectedComponent.find((t) => t.id === selectedThreatId)) {
        setSelectedThreatId(threatsForSelectedComponent[0].id)
      }
    } else {
      setSelectedThreatId(null)
    }
  }, [selectedComponentId, threatsForSelectedComponent, selectedThreatId])

  // Mutations for backend persistence
  const updateCountermeasureMutation = useUpdateCountermeasure()
  const updateFlowCountermeasureMutation = useUpdateFlowCountermeasure()
  const dismissThreatMutation = useDismissThreat()
  const restoreThreatMutation = useRestoreThreat()
  const dismissFlowThreatMutation = useDismissFlowThreat()
  const restoreFlowThreatMutation = useRestoreFlowThreat()
  const deleteCountermeasureMutation = useDeleteCountermeasure()
  const deleteFlowCountermeasureMutation = useDeleteFlowCountermeasure()

  // Helper to update local modifications for backend threats
  const updateLocalModification = useCallback(
    (threatId: string, updates: Partial<ComponentThreat>) => {
      setLocalModifications((prev) => ({
        ...prev,
        [threatId]: { ...prev[threatId], ...updates },
      }))
    },
    []
  )

  // Update countermeasure status (with optional notes for waiver reason)
  const handleCountermeasureStatusChange = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string, status: CountermeasureStatus, notes?: string) => {
      // Find the threat to update
      const threat = componentThreats.find((ct) => ct.id === componentThreatId)
      if (!threat) return

      const updatedCountermeasures = threat.countermeasures.map((cm) => {
        if (cm.id !== countermeasureInstanceId) return cm
        return {
          ...cm,
          status,
          ...(notes !== undefined && { notes }),
          updatedAt: new Date().toISOString(),
        }
      })

      // Update local modifications
      updateLocalModification(componentThreatId, {
        countermeasures: updatedCountermeasures,
        updatedAt: new Date().toISOString(),
      })

      // Persist to backend if this is a backend countermeasure
      if (countermeasureInstanceId.startsWith('cm-')) {
        const backendId = parseInt(countermeasureInstanceId.slice(3), 10)
        if (!isNaN(backendId)) {
          updateCountermeasureMutation.mutate({
            countermeasureId: backendId,
            data: {
              status,
              ...(notes !== undefined && { evidenceUrl: notes }),
            },
          })
        }
      }
    },
    [componentThreats, updateLocalModification, updateCountermeasureMutation]
  )

  // Assign owner to countermeasure
  const handleAssignOwner = useCallback(
    (
      componentThreatId: string,
      countermeasureInstanceId: string,
      assignee: Assignee,
      newStatus?: CountermeasureStatus
    ) => {
      const threat = componentThreats.find((ct) => ct.id === componentThreatId)
      if (!threat) return

      // Determine final status - use explicit newStatus if provided, otherwise auto-set to planned
      const currentCm = threat.countermeasures.find(cm => cm.id === countermeasureInstanceId)
      const finalStatus = newStatus || (currentCm?.status === 'gap' ? 'planned' : currentCm?.status)

      const updatedCountermeasures = threat.countermeasures.map((cm) => {
        if (cm.id !== countermeasureInstanceId) return cm
        return {
          ...cm,
          owner: assignee.email,
          status: finalStatus || cm.status,
          updatedAt: new Date().toISOString(),
        }
      })

      // Update local modifications
      updateLocalModification(componentThreatId, {
        countermeasures: updatedCountermeasures,
        updatedAt: new Date().toISOString(),
      })

      // Persist to backend — supports both cm-{id} (component) and fcm-{id} (flow) IDs
      const isComponentCm = countermeasureInstanceId.startsWith('cm-')
      const isFlowCm = countermeasureInstanceId.startsWith('fcm-')

      if (isComponentCm || isFlowCm) {
        const prefix = isFlowCm ? 4 : 3
        const backendId = parseInt(countermeasureInstanceId.slice(prefix), 10)

        if (!isNaN(backendId)) {
          const mutation = isFlowCm ? updateFlowCountermeasureMutation : updateCountermeasureMutation
          const data: { assignedOwner: number; status?: string } = { assignedOwner: assignee.userId }
          if (newStatus) {
            data.status = newStatus
          }

          mutation.mutate({
            countermeasureId: backendId,
            data,
          })
        }
      }
    },
    [componentThreats, updateLocalModification, updateCountermeasureMutation, updateFlowCountermeasureMutation]
  )

  // Add custom threat - opens the AddThreatDialog
  const handleAddCustomThreat = useCallback(() => {
    setAddThreatDialogOpen(true)
  }, [])

  // Dismiss threat (persisted to backend)
  const handleDismissThreat = useCallback((componentThreatId: string, reason: string = 'Not applicable') => {
    // Optimistic update
    updateLocalModification(componentThreatId, {
      dismissed: true,
      dismissalReason: reason,
      updatedAt: new Date().toISOString(),
    })

    // Persist to backend
    // Parse threat ID: "backend-{id}" for component threats, "backend-flow-{id}" for flow threats
    const isFlowThreat = componentThreatId.startsWith('backend-flow-')
    const backendId = isFlowThreat
      ? parseInt(componentThreatId.replace('backend-flow-', ''), 10)
      : parseInt(componentThreatId.replace('backend-', ''), 10)

    if (!isNaN(backendId)) {
      const mutation = isFlowThreat ? dismissFlowThreatMutation : dismissThreatMutation
      mutation.mutate(
        { threatId: backendId, reason },
        {
          onError: () => {
            // Revert optimistic update on error
            updateLocalModification(componentThreatId, {
              dismissed: false,
              dismissalReason: '',
              updatedAt: new Date().toISOString(),
            })
          },
        }
      )
    }
  }, [updateLocalModification, dismissThreatMutation, dismissFlowThreatMutation])

  // Restore dismissed threat (persisted to backend)
  const handleRestoreThreat = useCallback((componentThreatId: string) => {
    // Optimistic update
    updateLocalModification(componentThreatId, {
      dismissed: false,
      dismissalReason: '',
      updatedAt: new Date().toISOString(),
    })

    // Persist to backend
    const isFlowThreat = componentThreatId.startsWith('backend-flow-')
    const backendId = isFlowThreat
      ? parseInt(componentThreatId.replace('backend-flow-', ''), 10)
      : parseInt(componentThreatId.replace('backend-', ''), 10)

    if (!isNaN(backendId)) {
      const mutation = isFlowThreat ? restoreFlowThreatMutation : restoreThreatMutation
      mutation.mutate(backendId, {
        onError: () => {
          // Revert optimistic update on error
          updateLocalModification(componentThreatId, {
            dismissed: true,
            updatedAt: new Date().toISOString(),
          })
        },
      })
    }
  }, [updateLocalModification, restoreThreatMutation, restoreFlowThreatMutation])

  // Add custom countermeasure - opens the AddCountermeasureDialog
  const handleAddCustomCountermeasure = useCallback(
    () => {
      setAddCountermeasureDialogOpen(true)
    },
    []
  )

  // Remove countermeasure (persisted to backend)
  const handleRemoveCountermeasure = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string) => {
      const threat = componentThreats.find((ct) => ct.id === componentThreatId)
      if (!threat) return

      // Store original countermeasures for potential rollback
      const originalCountermeasures = [...threat.countermeasures]

      // Optimistic update - remove from local state
      const updatedCountermeasures = threat.countermeasures.filter(
        (cm) => cm.id !== countermeasureInstanceId
      )

      updateLocalModification(componentThreatId, {
        countermeasures: updatedCountermeasures,
        updatedAt: new Date().toISOString(),
      })

      // Persist to backend
      const { type, id } = parseCountermeasureId(countermeasureInstanceId)

      if (id !== null && (type === 'component' || type === 'flow')) {
        const mutation = type === 'flow' ? deleteFlowCountermeasureMutation : deleteCountermeasureMutation
        mutation.mutate(id, {
          onError: () => {
            // Rollback optimistic update on error
            updateLocalModification(componentThreatId, {
              countermeasures: originalCountermeasures,
              updatedAt: new Date().toISOString(),
            })
          },
        })
      }
    },
    [componentThreats, updateLocalModification, deleteCountermeasureMutation, deleteFlowCountermeasureMutation]
  )

  // Update countermeasure priority
  const handleCountermeasurePriorityChange = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string, priority: string) => {
      const threat = componentThreats.find((ct) => ct.id === componentThreatId)
      if (!threat) return

      const updatedCountermeasures = threat.countermeasures.map((cm) =>
        cm.id === countermeasureInstanceId
          ? { ...cm, priority: priority as ComponentThreatCountermeasure['priority'], updatedAt: new Date().toISOString() }
          : cm
      )

      updateLocalModification(componentThreatId, {
        countermeasures: updatedCountermeasures,
        updatedAt: new Date().toISOString(),
      })

      // Persist to backend
      if (countermeasureInstanceId.startsWith('cm-')) {
        const backendId = parseInt(countermeasureInstanceId.slice(3), 10)
        if (!isNaN(backendId)) {
          updateCountermeasureMutation.mutate({
            countermeasureId: backendId,
            data: { priority },
          })
        }
      } else if (countermeasureInstanceId.startsWith('fcm-')) {
        const backendId = parseInt(countermeasureInstanceId.slice(4), 10)
        if (!isNaN(backendId)) {
          updateFlowCountermeasureMutation.mutate({
            countermeasureId: backendId,
            data: { priority },
          })
        }
      }
    },
    [componentThreats, updateLocalModification, updateCountermeasureMutation, updateFlowCountermeasureMutation]
  )

  // Restore a dismissed countermeasure (local modification only - TODO: persist to backend)
  const handleRestoreCountermeasure = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string) => {
      const threat = componentThreats.find((ct) => ct.id === componentThreatId)
      if (!threat) return

      const updatedCountermeasures = threat.countermeasures.map((cm) =>
        cm.id === countermeasureInstanceId ? { ...cm, dismissed: false } : cm
      )

      updateLocalModification(componentThreatId, {
        countermeasures: updatedCountermeasures,
        updatedAt: new Date().toISOString(),
      })
    },
    [componentThreats, updateLocalModification]
  )

  // Compute dialog props
  const nodeComponentMap = backendData?.nodeComponentMap || {}

  // Get backend component/dataflow ID for selected component
  const selectedBackendInfo = useMemo(() => {
    if (!selectedComponentId) return null

    // Check if it's a data flow (edge)
    const isDataflow = dataFlows.some(df => df.id === selectedComponentId)

    if (isDataflow) {
      // For data flows, find a threat that has this edge ID to get the dataflow backend ID
      const flowThreat = backendThreats.find(
        t => t.componentId === selectedComponentId && t.threatType === 'dataflow'
      )
      if (flowThreat?.backendComponentId) {
        const edge = dataFlows.find(df => df.id === selectedComponentId)
        return {
          backendId: flowThreat.backendComponentId,
          type: 'dataflow' as const,
          name: edge?.data?.label || `${edge?.source} → ${edge?.target}` || 'Data Flow',
        }
      }
      return null
    }

    // For components, use the nodeComponentMap
    const mapping = nodeComponentMap[selectedComponentId]
    if (mapping) {
      const node = canvasData.nodes.find(n => n.id === selectedComponentId)
      const nodeName = node ? String(node.data.label) : selectedComponentId
      return {
        backendId: mapping.componentId,
        type: 'component' as const,
        name: nodeName,
      }
    }

    return null
  }, [selectedComponentId, dataFlows, backendThreats, nodeComponentMap, canvasData.nodes])

  // Get backend threat info for the selected threat (for AddCountermeasureDialog)
  const selectedThreatBackendInfo = useMemo(() => {
    if (!selectedComponentThreat) return null
    if (!selectedComponentThreat.backendThreatId) return null

    // Parse threatLibraryId from threatId (format: "lib-{id}")
    const threatLibraryId = selectedComponentThreat.threatId.startsWith('lib-')
      ? parseInt(selectedComponentThreat.threatId.slice(4), 10)
      : null

    return {
      backendId: selectedComponentThreat.backendThreatId,
      type: selectedComponentThreat.threatType || 'component',
      name: selectedComponentThreat.threatName || 'Unknown Threat',
      threatLibraryId: isNaN(threatLibraryId || NaN) ? null : threatLibraryId,
    }
  }, [selectedComponentThreat])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading threats...</p>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">Failed to load threats</p>
        <Button onClick={() => refetch()} variant="outline">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-semibold">
            Threat Analysis: {diagramTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Component Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddComponentDialogOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Component
          </Button>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-1">
            <Button
              variant={viewMode === 'component' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('component')}
              className={cn(
                'rounded-md px-3',
                viewMode === 'component' ? '' : 'hover:bg-transparent'
              )}
            >
              Component View
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-md px-3',
                viewMode === 'table' ? '' : 'hover:bg-transparent'
              )}
            >
              Table View
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'component' ? (
          <ComponentView
            threatModelId={threatModelId}
            canvasData={canvasData}
            analyzableComponents={analyzableComponents}
            trustZones={trustZones}
            dataFlows={dataFlows}
            componentThreats={componentThreats}
            selectedFrameworks={selectedFrameworks}
            selectedComponentId={selectedComponentId}
            selectedThreatId={selectedThreatId}
            selectedComponentThreat={selectedComponentThreat}
            onSelectComponent={setSelectedComponentId}
            onSelectThreat={setSelectedThreatId}
            onCountermeasureStatusChange={handleCountermeasureStatusChange}
            onAssignOwner={handleAssignOwner}
            onAddCustomThreat={() => setAddThreatDialogOpen(true)}
            onDismissThreat={handleDismissThreat}
            onRestoreThreat={handleRestoreThreat}
            onAddCustomCountermeasure={handleAddCustomCountermeasure}
            onRemoveCountermeasure={handleRemoveCountermeasure}
            onRestoreCountermeasure={handleRestoreCountermeasure}
            onCountermeasurePriorityChange={handleCountermeasurePriorityChange}
          />
        ) : (
          <TableView
            canvasData={canvasData}
            componentThreats={componentThreats}
            onCountermeasureStatusChange={handleCountermeasureStatusChange}
            onSelectThreat={(componentId, threatId) => {
              setSelectedComponentId(componentId)
              setSelectedThreatId(threatId)
              setViewMode('component')
            }}
          />
        )}
      </div>

      {/* Add Threat Dialog */}
      {selectedBackendInfo ? (
        <AddThreatDialog
          open={addThreatDialogOpen}
          onOpenChange={setAddThreatDialogOpen}
          targetId={selectedBackendInfo.backendId}
          targetType={selectedBackendInfo.type}
          targetName={selectedBackendInfo.name}
          onSuccess={() => {
            refetch()
          }}
        />
      ) : (
        <Dialog open={addThreatDialogOpen} onOpenChange={setAddThreatDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Component Not Synced
                </DialogTitle>
                <DialogDescription>
                  This component hasn't been synced to the backend yet. To add threats,
                  please save the DFD first to sync all components.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-sm text-muted-foreground">
                <p>When you save the DFD diagram, components are automatically synced and you'll be able to add threats to them.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddThreatDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      )}

      {/* Add Countermeasure Dialog */}
      {selectedThreatBackendInfo ? (
        <AddCountermeasureDialog
          open={addCountermeasureDialogOpen}
          onOpenChange={setAddCountermeasureDialogOpen}
          threatId={selectedThreatBackendInfo.backendId}
          threatType={selectedThreatBackendInfo.type}
          threatName={selectedThreatBackendInfo.name}
          threatLibraryId={selectedThreatBackendInfo.threatLibraryId}
          onSuccess={() => {
            refetch()
          }}
        />
      ) : (
        <Dialog open={addCountermeasureDialogOpen} onOpenChange={setAddCountermeasureDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Threat Not Available
              </DialogTitle>
              <DialogDescription>
                Please select a threat first to add countermeasures.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddCountermeasureDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Custom Component Dialog */}
      <AddCustomComponentDialog
        open={addComponentDialogOpen}
        onOpenChange={setAddComponentDialogOpen}
        threatModelId={threatModelId}
        onSuccess={() => {
          refetch()
        }}
      />
    </div>
  )
}
