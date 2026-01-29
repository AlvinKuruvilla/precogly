import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ComponentView, type Assignee } from './ComponentView'
import { useUpdateCountermeasure, useUpdateFlowCountermeasure, useThreatModelThreats } from '@/api/threats'
import { TableView } from './TableView'
import type { CanvasData } from '../../types'
import type {
  ComponentThreat,
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

  // Fetch backend threats for this threat model
  const {
    data: backendData,
    isLoading,
    isError,
    refetch,
  } = useThreatModelThreats(threatModelId)

  // Filter backend threats to current diagram
  const backendThreats = useMemo(() => {
    if (!backendData?.componentThreats) {
      console.log('[ThreatAnalysisView] backendThreats: no backendData?.componentThreats')
      return []
    }
    console.log('[ThreatAnalysisView] Filtering backendThreats:', {
      diagramId,
      allBackendThreats: backendData.componentThreats.map(t => ({
        id: t.id,
        diagramId: t.diagramId,
        sourceDiagramId: t.sourceDiagramId,
      })),
    })
    const filtered = backendData.componentThreats.filter(
      (t) => t.sourceDiagramId === diagramId || t.diagramId === diagramId
    )
    console.log('[ThreatAnalysisView] Filtered backendThreats count:', filtered.length)
    return filtered
  }, [backendData, diagramId])

  // Track local state for modifications not yet persisted
  const [localModifications, setLocalModifications] = useState<Record<string, Partial<ComponentThreat>>>({})

  // Backend threats with local modifications applied
  const componentThreats = useMemo(() => {
    // Apply local modifications to backend threats
    const modifiedBackendThreats = backendThreats.map((t) => {
      const mods = localModifications[t.id]
      if (mods) {
        return { ...t, ...mods }
      }
      return t
    })
    console.log('[ThreatAnalysisView] componentThreats computed:', {
      backendThreatsCount: backendThreats.length,
      totalCount: modifiedBackendThreats.length,
      threatIds: modifiedBackendThreats.map(t => t.id),
    })
    return modifiedBackendThreats
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
  const trustBoundaries = useMemo(() => {
    return canvasData.nodes.filter((node) => node.type === 'trustBoundary')
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
      } else if (trustBoundaries.length > 0) {
        setSelectedComponentId(trustBoundaries[0].id)
      } else if (dataFlows.length > 0) {
        setSelectedComponentId(dataFlows[0].id)
      }
    }
  }, [selectedComponentId, analyzableComponents, trustBoundaries, dataFlows])

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
          // Map frontend status to backend status
          const backendStatus = status === 'platform' ? 'verified' : status
          updateCountermeasureMutation.mutate({
            countermeasureId: backendId,
            data: {
              status: backendStatus,
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
      newStatus?: CountermeasureStatus // Optional: also update status in the same API call
    ) => {
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
      console.log('=== [2] ThreatAnalysisView.handleAssignOwner START ===')
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
      console.log('[2] componentThreatId:', componentThreatId)
      console.log('[2] countermeasureInstanceId:', countermeasureInstanceId)
      console.log('[2] assignee:', JSON.stringify(assignee, null, 2))
      console.log('[2] newStatus:', newStatus)

      // Find the threat to update
      const threat = componentThreats.find((ct) => ct.id === componentThreatId)
      console.log('[2] Found threat:', threat ? {
        id: threat.id,
        componentId: threat.componentId,
        countermeasuresCount: threat.countermeasures.length,
        countermeasureIds: threat.countermeasures.map(cm => cm.id),
      } : 'NOT FOUND')

      if (!threat) {
        console.log('[2] ERROR: Threat not found, returning early')
        return
      }

      // Determine owner string for local state storage
      const ownerString =
        assignee.type === 'team'
          ? `team:${assignee.name}`
          : assignee.email
      console.log('[2] ownerString:', ownerString)

      // Determine final status - use explicit newStatus if provided, otherwise auto-set to planned
      const currentCm = threat.countermeasures.find(cm => cm.id === countermeasureInstanceId)
      const finalStatus = newStatus || (currentCm?.status === 'gap' ? 'planned' : currentCm?.status)

      const updatedCountermeasures = threat.countermeasures.map((cm) => {
        if (cm.id !== countermeasureInstanceId) return cm
        console.log('[2] Found matching countermeasure to update:', cm.id)
        return {
          ...cm,
          owner: ownerString,
          status: finalStatus || cm.status,
          updatedAt: new Date().toISOString(),
        }
      })

      const matchingCm = updatedCountermeasures.find(cm => cm.owner === ownerString)
      console.log('[2] Countermeasure was updated:', !!matchingCm)

      // Update local modifications
      console.log('[2] Calling updateLocalModification...')
      updateLocalModification(componentThreatId, {
        countermeasures: updatedCountermeasures,
        updatedAt: new Date().toISOString(),
      })
      console.log('[2] Local modification updated')

      // Persist to backend if this is a backend countermeasure
      // Supports both cm-{id} (component) and fcm-{id} (flow) countermeasure IDs
      const isComponentCm = countermeasureInstanceId.startsWith('cm-')
      const isFlowCm = countermeasureInstanceId.startsWith('fcm-')
      console.log('[2] Checking backend persistence conditions:', {
        assigneeType: assignee.type,
        isComponentCm,
        isFlowCm,
      })

      if (assignee.type === 'member' && (isComponentCm || isFlowCm)) {
        const prefix = isFlowCm ? 4 : 3 // 'fcm-' is 4 chars, 'cm-' is 3 chars
        const backendId = parseInt(countermeasureInstanceId.slice(prefix), 10)
        console.log('[2] Parsed backendId:', backendId, 'type:', isFlowCm ? 'flow' : 'component')

        if (!isNaN(backendId)) {
          // Use the correct mutation based on countermeasure type
          const mutation = isFlowCm ? updateFlowCountermeasureMutation : updateCountermeasureMutation

          // Build data payload - include status if provided to avoid race condition
          const backendStatus = newStatus === 'platform' ? 'verified' : newStatus
          const data: { assignedOwner?: number; status?: string } = { assignedOwner: assignee.userId }
          if (backendStatus) {
            data.status = backendStatus
          }

          console.log('[2] Calling mutation.mutate with:', {
            countermeasureId: backendId,
            data,
            mutationType: isFlowCm ? 'flow' : 'component',
          })
          mutation.mutate(
            {
              countermeasureId: backendId,
              data,
            },
            {
              onSuccess: (data) => {
                console.log('[2] ✅ Backend mutation SUCCESS:', data)
              },
              onError: (error) => {
                console.log('[2] ❌ Backend mutation ERROR:', error)
              },
            }
          )
        } else {
          console.log('[2] ERROR: backendId is NaN, skipping backend call')
        }
      } else {
        console.log('[2] Skipping backend persistence (not a backend countermeasure or not a member)')
      }

      console.log('=== [2] ThreatAnalysisView.handleAssignOwner END ===')
    },
    [componentThreats, updateLocalModification, updateCountermeasureMutation, updateFlowCountermeasureMutation]
  )

  // Add custom threat - disabled (requires backend API support)
  // TODO: Implement backend API for adding custom threats
  const handleAddCustomThreat = useCallback(
    (_componentId: string, _threatId: string) => {
      console.warn('[ThreatAnalysisView] handleAddCustomThreat is disabled - backend API not yet implemented')
    },
    []
  )

  // Dismiss threat (local modification only - TODO: persist to backend)
  const handleDismissThreat = useCallback((componentThreatId: string) => {
    updateLocalModification(componentThreatId, {
      dismissed: true,
      updatedAt: new Date().toISOString(),
    })
  }, [updateLocalModification])

  // Restore dismissed threat (local modification only - TODO: persist to backend)
  const handleRestoreThreat = useCallback((componentThreatId: string) => {
    updateLocalModification(componentThreatId, {
      dismissed: false,
      updatedAt: new Date().toISOString(),
    })
  }, [updateLocalModification])

  // Add custom countermeasure - disabled (requires backend API support)
  // TODO: Implement backend API for adding custom countermeasures
  const handleAddCustomCountermeasure = useCallback(
    (_componentThreatId: string, _countermeasureId: string) => {
      console.warn('[ThreatAnalysisView] handleAddCustomCountermeasure is disabled - backend API not yet implemented')
    },
    []
  )

  // Remove countermeasure (local modification only - TODO: persist to backend)
  const handleRemoveCountermeasure = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string) => {
      const threat = componentThreats.find((ct) => ct.id === componentThreatId)
      if (!threat) return

      const updatedCountermeasures = threat.countermeasures.filter(
        (cm) => cm.id !== countermeasureInstanceId
      )

      updateLocalModification(componentThreatId, {
        countermeasures: updatedCountermeasures,
        updatedAt: new Date().toISOString(),
      })
    },
    [componentThreats, updateLocalModification]
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

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'component' ? (
          <ComponentView
            canvasData={canvasData}
            analyzableComponents={analyzableComponents}
            trustBoundaries={trustBoundaries}
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
            onAddCustomThreat={handleAddCustomThreat}
            onDismissThreat={handleDismissThreat}
            onRestoreThreat={handleRestoreThreat}
            onAddCustomCountermeasure={handleAddCustomCountermeasure}
            onRemoveCountermeasure={handleRemoveCountermeasure}
            onRestoreCountermeasure={handleRestoreCountermeasure}
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
    </div>
  )
}
