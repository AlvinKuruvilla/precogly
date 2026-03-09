import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, skipToken } from '@tanstack/react-query'
import type { Diagram, ThreatModel } from '@/types'
import type {
  ComponentThreat,
  ComponentThreatCountermeasure,
  CountermeasureStatus,
  ThreatModelVersion,
  ProgressChecklistItem,
} from '@/features/dfd-editor/types/threat-analysis'
import { deriveThreatStatus } from '@/features/dfd-editor/types/threat-analysis'
import {
  useThreatModelThreats,
  useUpdateCountermeasure,
  useUpdateFlowCountermeasure,
  parseCountermeasureId,
} from '@/api/threats'
import { useUpdateThreatModel } from '@/api/threat-models'
import { api } from '@/lib/api'

interface WorkspaceThreatAnalysisState {
  threatModelId: string
  componentThreats: ComponentThreat[]
  currentVersion: ThreatModelVersion
  previousVersions: ThreatModelVersion[]
}

interface WorkspaceData {
  currentVersion?: ThreatModelVersion
  previousVersions?: ThreatModelVersion[]
}

function getDefaultState(threatModelId: string | undefined): WorkspaceThreatAnalysisState {
  return {
    threatModelId: threatModelId || '',
    componentThreats: [],
    currentVersion: {
      version: 1,
      trigger: 'initial',
      createdAt: new Date().toISOString(),
    },
    previousVersions: [],
  }
}

/**
 * Extract workspace state from backend workspace_data
 */
function extractWorkspaceState(
  workspaceData: WorkspaceData | undefined
): Partial<WorkspaceThreatAnalysisState> {
  if (!workspaceData) return {}

  return {
    currentVersion: workspaceData.currentVersion || {
      version: 1,
      trigger: 'initial',
      createdAt: new Date().toISOString(),
    },
    previousVersions: workspaceData.previousVersions || [],
  }
}

// NOTE: Local threat generation has been removed from this hook.
// The backend is now the single source of truth for threats.

export function useWorkspaceThreatAnalysis(
  threatModelId: string | undefined,
  diagrams: Diagram[]
) {
  // Track if we've initialized from backend to avoid overwriting with defaults
  const hasInitializedFromBackend = useRef(false)

  const [state, setState] = useState<WorkspaceThreatAnalysisState>(() =>
    getDefaultState(threatModelId)
  )

  // Fetch threat model for workspace_data
  const { data: threatModel, isLoading: isLoadingThreatModel } = useQuery({
    queryKey: ['threat-model', threatModelId],
    queryFn: threatModelId
      ? () => api.get<ThreatModel>(`/threat-models/${threatModelId}/`)
      : skipToken,
  })

  // Fetch threats from backend API
  const { data: backendThreats, isLoading: isLoadingThreats } = useThreatModelThreats(threatModelId)

  // Backend API mutations
  const updateCountermeasureMutation = useUpdateCountermeasure()
  const updateFlowCountermeasureMutation = useUpdateFlowCountermeasure()
  const updateThreatModelMutation = useUpdateThreatModel()

  // Initialize state from backend workspaceData when threat model loads
  useEffect(() => {
    if (threatModel?.workspaceData && !hasInitializedFromBackend.current) {
      hasInitializedFromBackend.current = true
      const backendState = extractWorkspaceState(threatModel.workspaceData as WorkspaceData)
      setState((prev) => ({
        ...prev,
        ...backendState,
      }))
    }
  }, [threatModel])

  // Debounced save to backend — only currentVersion, previousVersions
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Don't save until we've loaded from backend
    if (!hasInitializedFromBackend.current) return

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce saves to backend (500ms delay)
    saveTimeoutRef.current = setTimeout(() => {
      if (!threatModelId) return

      const workspaceData = {
        currentVersion: state.currentVersion,
        previousVersions: state.previousVersions,
      }

      updateThreatModelMutation.mutate({
        id: threatModelId,
        data: { workspace_data: workspaceData } as Partial<ThreatModel>,
      })
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state.currentVersion, state.previousVersions, threatModelId])

  // Use backend threats directly - no local threat generation
  useEffect(() => {
    if (backendThreats?.componentThreats) {
      setState((prev) => ({
        ...prev,
        componentThreats: backendThreats.componentThreats,
      }))
    }
  }, [backendThreats])

  // Filter threats when diagrams change (remove threats for deleted diagrams/components)
  useEffect(() => {
    if (!diagrams || diagrams.length === 0) return
    if (isLoadingThreats) return

    setState((prev) => {
      const validComponentIds = new Set<string>()
      const currentDiagramIds = new Set<string>()
      diagrams.forEach((d) => {
        currentDiagramIds.add(String(d.id))
        const canvasData = d.canvasData
        if (canvasData) {
          canvasData.nodes?.forEach((node) => validComponentIds.add(String(node.id)))
          canvasData.edges?.forEach((edge) => validComponentIds.add(String(edge.id)))
        }
      })

      const filteredThreats = prev.componentThreats.filter((ct) => {
        const isAnalysisOnly = String(ct.componentId).startsWith('analysis-') ||
                               (!ct.sourceDiagramId && !ct.diagramId)
        if (isAnalysisOnly) return true

        const diagramId = String(ct.sourceDiagramId || ct.diagramId)
        if (!currentDiagramIds.has(diagramId)) return false
        if (!validComponentIds.has(String(ct.componentId))) return false
        return true
      })

      if (filteredThreats.length !== prev.componentThreats.length) {
        return { ...prev, componentThreats: filteredThreats }
      }
      return prev
    })
  }, [diagrams, isLoadingThreats])

  // Revert an inherited countermeasure back to gap status
  const revertInheritedCountermeasure = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string) => {
      const parsed = parseCountermeasureId(countermeasureInstanceId)
      if (parsed.type === 'component' && parsed.id !== null) {
        updateCountermeasureMutation.mutate({
          countermeasureId: parsed.id,
          data: {
            status: 'gap',
            isInherited: false,
            inheritedFromComponentName: '',
            inheritedFromZoneName: '',
          },
        })
      }
      // Optimistic local state update
      setState((prev) => ({
        ...prev,
        componentThreats: prev.componentThreats.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            countermeasures: ct.countermeasures.map((cm) => {
              if (cm.id !== countermeasureInstanceId) return cm
              return {
                ...cm,
                status: 'gap' as CountermeasureStatus,
                isInherited: false,
                inheritedFromComponentName: undefined,
                inheritedFromZoneName: undefined,
              }
            }),
          }
        }),
      }))
    },
    [updateCountermeasureMutation]
  )

  // Update countermeasure status
  const updateCountermeasureStatus = useCallback(
    (
      componentThreatId: string,
      countermeasureInstanceId: string,
      status: CountermeasureStatus,
      notes?: string
    ) => {
      // Use the instance ID directly for the API call (always unique)
      const parsed = parseCountermeasureId(countermeasureInstanceId)

      if (parsed.type === 'component' && parsed.id !== null) {
        updateCountermeasureMutation.mutate({
          countermeasureId: parsed.id,
          data: {
            status: status as 'platform' | 'gap' | 'planned' | 'verified' | 'waived',
            ...(notes !== undefined && { evidenceUrl: notes }),
          },
        })
      } else if (parsed.type === 'flow' && parsed.id !== null) {
        updateFlowCountermeasureMutation.mutate({
          countermeasureId: parsed.id,
          data: {
            status: status as 'platform' | 'gap' | 'planned' | 'verified' | 'waived',
            ...(notes !== undefined && { evidenceUrl: notes }),
          },
        })
      }

      // Update local state immediately for responsiveness
      setState((prev) => ({
        ...prev,
        componentThreats: prev.componentThreats.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.map((cm) => {
              if (cm.id !== countermeasureInstanceId) return cm
              return {
                ...cm,
                status,
                ...(notes !== undefined && { notes }),
                updatedAt: new Date().toISOString(),
              }
            }),
          }
        }),
      }))
    },
    [updateCountermeasureMutation, updateFlowCountermeasureMutation]
  )

  // Assign owner to countermeasure
  const assignOwner = useCallback(
    (
      componentThreatId: string,
      countermeasureInstanceId: string,
      assignee: { type: 'member'; userId: number; email: string; name: string | null },
      newStatus?: CountermeasureStatus
    ) => {
      const threat = state.componentThreats.find((ct) => ct.id === componentThreatId)
      const countermeasure = threat?.countermeasures.find((cm) => cm.id === countermeasureInstanceId)

      if (countermeasure) {
        const parsed = parseCountermeasureId(countermeasure.id)

        const data: { assignedOwner: number; status?: string } = { assignedOwner: assignee.userId }
        if (newStatus) {
          data.status = newStatus
        }

        if (parsed.type === 'component' && parsed.id !== null) {
          updateCountermeasureMutation.mutate({
            countermeasureId: parsed.id,
            data,
          })
        } else if (parsed.type === 'flow' && parsed.id !== null) {
          updateFlowCountermeasureMutation.mutate({
            countermeasureId: parsed.id,
            data,
          })
        }
      }

      const finalStatus = newStatus || (countermeasure?.status === 'gap' ? 'planned' : countermeasure?.status)
      setState((prev) => ({
        ...prev,
        componentThreats: prev.componentThreats.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.map((cm) => {
              if (cm.id !== countermeasureInstanceId) return cm
              return {
                ...cm,
                owner: assignee.email,
                status: finalStatus || cm.status,
                updatedAt: new Date().toISOString(),
              }
            }),
          }
        }),
      }))
    },
    [state.componentThreats, updateCountermeasureMutation, updateFlowCountermeasureMutation]
  )

  // Update countermeasure priority
  const updateCountermeasurePriority = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string, priority: string) => {
      const threat = state.componentThreats.find((ct) => ct.id === componentThreatId)
      const countermeasure = threat?.countermeasures.find((cm) => cm.id === countermeasureInstanceId)

      if (countermeasure) {
        const parsed = parseCountermeasureId(countermeasure.id)

        if (parsed.type === 'component' && parsed.id !== null) {
          updateCountermeasureMutation.mutate({
            countermeasureId: parsed.id,
            data: { priority },
          })
        } else if (parsed.type === 'flow' && parsed.id !== null) {
          updateFlowCountermeasureMutation.mutate({
            countermeasureId: parsed.id,
            data: { priority },
          })
        }
      }

      // Update local state immediately for responsiveness
      setState((prev) => ({
        ...prev,
        componentThreats: prev.componentThreats.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.map((cm) => {
              if (cm.id !== countermeasureInstanceId) return cm
              return {
                ...cm,
                priority,
                updatedAt: new Date().toISOString(),
              }
            }),
          }
        }),
      }))
    },
    [state.componentThreats, updateCountermeasureMutation, updateFlowCountermeasureMutation]
  )

  // Dismiss threat
  const dismissThreat = useCallback((componentThreatId: string) => {
    setState((prev) => ({
      ...prev,
      componentThreats: prev.componentThreats.map((ct) => {
        if (ct.id !== componentThreatId) return ct
        return { ...ct, dismissed: true, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [])

  // Restore dismissed threat
  const restoreThreat = useCallback((componentThreatId: string) => {
    setState((prev) => ({
      ...prev,
      componentThreats: prev.componentThreats.map((ct) => {
        if (ct.id !== componentThreatId) return ct
        return { ...ct, dismissed: false, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [])

  // Add custom countermeasure
  const addCountermeasure = useCallback(
    (componentThreatId: string, countermeasureId: string) => {
      setState((prev) => {
        const timestamp = new Date().toISOString()
        return {
          ...prev,
          componentThreats: prev.componentThreats.map((ct) => {
            if (ct.id !== componentThreatId) return ct
            if (ct.countermeasures.some((cm) => cm.countermeasureId === countermeasureId)) {
              return ct
            }
            const newCm: ComponentThreatCountermeasure = {
              id: `ctcm-${componentThreatId}-${countermeasureId}-${Date.now()}`,
              countermeasureId,
              componentThreatId,
              status: 'gap',
              createdAt: timestamp,
              updatedAt: timestamp,
            }
            return {
              ...ct,
              updatedAt: timestamp,
              countermeasures: [...ct.countermeasures, newCm],
            }
          }),
        }
      })
    },
    []
  )

  // Dismiss countermeasure
  const removeCountermeasure = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string) => {
      setState((prev) => ({
        ...prev,
        componentThreats: prev.componentThreats.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.map((cm) => {
              if (cm.id !== countermeasureInstanceId) return cm
              return { ...cm, dismissed: true, updatedAt: new Date().toISOString() }
            }),
          }
        }),
      }))
    },
    []
  )

  // Restore dismissed countermeasure
  const restoreCountermeasure = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string) => {
      setState((prev) => ({
        ...prev,
        componentThreats: prev.componentThreats.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.map((cm) => {
              if (cm.id !== countermeasureInstanceId) return cm
              return { ...cm, dismissed: false, updatedAt: new Date().toISOString() }
            }),
          }
        }),
      }))
    },
    []
  )

  // Toggle checklist item — no-op since all items are now auto-computed by the backend
  const toggleChecklistItem = useCallback((_itemId: string, _checked: boolean) => {
    // All checklist items are auto-computed by the backend; no local state to update
  }, [])

  // Compute summary statistics
  const summaries = useMemo(() => {
    const activeThreats = state.componentThreats.filter((ct) => !ct.dismissed)

    const allNodes = diagrams.flatMap((d) => d.canvasData?.nodes || [])
    const componentSummary = {
      total: allNodes.filter(
        (n) => n.type === 'process' || n.type === 'datastore' || n.type === 'humanActor' || n.type === 'systemActor'
      ).length,
      processes: allNodes.filter((n) => n.type === 'process').length,
      datastores: allNodes.filter((n) => n.type === 'datastore').length,
      humanActors: allNodes.filter((n) => n.type === 'humanActor').length,
      systemActors: allNodes.filter((n) => n.type === 'systemActor').length,
      trustZones: allNodes.filter((n) => n.type === 'trustZone').length,
    }

    let exposedThreats = 0
    let addressableThreats = 0
    let mitigatedThreats = 0

    activeThreats.forEach((ct) => {
      const status = deriveThreatStatus(ct.countermeasures)
      if (status === 'exposed') exposedThreats++
      else if (status === 'addressable') addressableThreats++
      else mitigatedThreats++
    })

    const threatSummary = {
      total: activeThreats.length,
      exposed: exposedThreats,
      addressable: addressableThreats,
      mitigated: mitigatedThreats,
    }

    const allCountermeasures = activeThreats.flatMap((ct) => ct.countermeasures)
    const countermeasureSummary = {
      total: allCountermeasures.length,
      platform: allCountermeasures.filter((cm) => cm.status === 'platform').length,
      verified: allCountermeasures.filter((cm) => cm.status === 'verified').length,
      gap: allCountermeasures.filter((cm) => cm.status === 'gap').length,
      planned: allCountermeasures.filter((cm) => cm.status === 'planned').length,
      waived: allCountermeasures.filter((cm) => cm.status === 'waived').length,
    }

    return { componentSummary, threatSummary, countermeasureSummary }
  }, [state.componentThreats, diagrams])

  // Progress checklist is computed by the backend and returned in workspace_data
  const progressChecklist: ProgressChecklistItem[] = useMemo(() => {
    const backendChecklist = (threatModel?.workspaceData as WorkspaceData & { progressChecklist?: ProgressChecklistItem[] })?.progressChecklist
    if (backendChecklist?.length) return backendChecklist
    return []
  }, [threatModel?.workspaceData])

  return {
    componentThreats: state.componentThreats,
    currentVersion: state.currentVersion,
    previousVersions: state.previousVersions,
    progressChecklist,
    summaries,
    isLoading: isLoadingThreats || isLoadingThreatModel,
    isLoadingThreats,
    revertInheritedCountermeasure,
    updateCountermeasureStatus,
    updateCountermeasurePriority,
    assignOwner,
    dismissThreat,
    restoreThreat,
    addCountermeasure,
    removeCountermeasure,
    restoreCountermeasure,
    toggleChecklistItem,
  }
}
