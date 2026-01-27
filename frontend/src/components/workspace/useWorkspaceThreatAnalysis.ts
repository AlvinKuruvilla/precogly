import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, skipToken } from '@tanstack/react-query'
import type { Diagram, ThreatModel } from '@/types'
import type {
  ComponentThreat,
  ComponentThreatCountermeasure,
  CountermeasureStatus,
  WorkspaceStatus,
  ThreatModelVersion,
  SystemContext,
  ProgressChecklistItem,
} from '@/features/dfd-editor/types/threat-analysis'
import { DEFAULT_PROGRESS_CHECKLIST, deriveThreatStatus } from '@/features/dfd-editor/types/threat-analysis'
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
  status: WorkspaceStatus
  currentVersion: ThreatModelVersion
  previousVersions: ThreatModelVersion[]
  systemContext: SystemContext
  progressChecklist: ProgressChecklistItem[]
}

interface WorkspaceData {
  status?: WorkspaceStatus
  currentVersion?: ThreatModelVersion
  previousVersions?: ThreatModelVersion[]
  systemContext?: SystemContext
  progressChecklist?: ProgressChecklistItem[]
  criticality?: string
  frameworks?: string[]
}

function getDefaultState(threatModelId: string | undefined): WorkspaceThreatAnalysisState {
  return {
    threatModelId: threatModelId || '',
    componentThreats: [],
    status: 'draft',
    currentVersion: {
      version: 1,
      trigger: 'initial',
      createdAt: new Date().toISOString(),
    },
    previousVersions: [],
    systemContext: {
      scopeLocked: false,
    },
    progressChecklist: DEFAULT_PROGRESS_CHECKLIST.map((item) => ({
      ...item,
      checked: false,
    })),
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
    status: workspaceData.status || 'draft',
    currentVersion: workspaceData.currentVersion || {
      version: 1,
      trigger: 'initial',
      createdAt: new Date().toISOString(),
    },
    previousVersions: workspaceData.previousVersions || [],
    systemContext: workspaceData.systemContext || { scopeLocked: false },
    progressChecklist: workspaceData.progressChecklist?.length
      ? workspaceData.progressChecklist
      : DEFAULT_PROGRESS_CHECKLIST.map((item) => ({ ...item, checked: false })),
  }
}

// NOTE: Local threat generation has been removed from this hook.
// The backend is now the single source of truth for threats.
// Previously, this hook used frontend registries (threat-registry.ts, countermeasure-registry.ts)
// to generate local threats with IDs like 'ct-...' and 'ctcm-...'.
// These local IDs were not recognized by parseCountermeasureId() as backend IDs,
// causing owner assignments to only update local state without persisting to the backend.
// Now, only threats from useThreatModelThreats (backend API) are displayed and editable.

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

  // Debounced save to backend when workspace metadata changes (status, systemContext, etc.)
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
        status: state.status,
        currentVersion: state.currentVersion,
        previousVersions: state.previousVersions,
        systemContext: state.systemContext,
        progressChecklist: state.progressChecklist,
        // Preserve existing fields
        criticality: (threatModel?.workspaceData as WorkspaceData)?.criticality,
        frameworks: (threatModel?.workspaceData as WorkspaceData)?.frameworks,
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
  }, [state.status, state.systemContext, state.progressChecklist, state.currentVersion, state.previousVersions, threatModelId])

  // Use backend threats directly - no local threat generation
  // Backend is the single source of truth for threats
  useEffect(() => {
    console.log('[useWorkspaceThreatAnalysis] Backend threats effect triggered:', {
      hasBackendThreats: !!backendThreats?.componentThreats,
      backendThreatsCount: backendThreats?.componentThreats?.length || 0,
    })

    if (backendThreats?.componentThreats) {
      console.log('[useWorkspaceThreatAnalysis] Using backend threats directly (no local generation)')
      if (backendThreats.componentThreats.length > 0) {
        console.log('[useWorkspaceThreatAnalysis] Backend threats sample:',
          backendThreats.componentThreats.slice(0, 2).map(t => ({
            id: t.id,
            componentId: t.componentId,
            threatId: t.threatId,
            countermeasures: t.countermeasures?.map(cm => ({ id: cm.id, countermeasureId: cm.countermeasureId }))
          }))
        )
      }

      setState((prev) => ({
        ...prev,
        componentThreats: backendThreats.componentThreats,
      }))
    }
  }, [backendThreats])

  // Filter threats when diagrams change (remove threats for deleted diagrams/components)
  // NOTE: Local threat generation has been removed - backend is the single source of truth
  useEffect(() => {
    if (!diagrams || diagrams.length === 0) return
    // Skip if backend threats are loading
    if (isLoadingThreats) return

    setState((prev) => {
      // Build a set of all valid component IDs (nodes + edges) across all diagrams
      const validComponentIds = new Set<string>()
      const currentDiagramIds = new Set<string>()
      diagrams.forEach((d) => {
        currentDiagramIds.add(d.id)
        const canvasData = d.canvasData
        if (canvasData) {
          canvasData.nodes?.forEach((node) => validComponentIds.add(node.id))
          canvasData.edges?.forEach((edge) => validComponentIds.add(edge.id))
        }
      })

      // Filter out threats for deleted diagrams OR deleted components
      const filteredThreats = prev.componentThreats.filter((ct) => {
        const diagramId = ct.sourceDiagramId || ct.diagramId
        // Remove if diagram was deleted
        if (!currentDiagramIds.has(diagramId)) return false
        // Remove if component was deleted from the diagram
        if (!validComponentIds.has(ct.componentId)) return false
        return true
      })

      // Only update state if threats were actually filtered out
      if (filteredThreats.length !== prev.componentThreats.length) {
        return { ...prev, componentThreats: filteredThreats }
      }
      return prev
    })
  }, [diagrams, isLoadingThreats])

  // Update countermeasure status
  const updateCountermeasureStatus = useCallback(
    (
      componentThreatId: string,
      countermeasureId: string,
      status: CountermeasureStatus,
      notes?: string
    ) => {
      // Find the threat to check if it's a backend threat
      const threat = state.componentThreats.find((ct) => ct.id === componentThreatId)
      const countermeasure = threat?.countermeasures.find((cm) => cm.countermeasureId === countermeasureId)

      // If this is a backend countermeasure, update via appropriate API
      if (threat && countermeasure) {
        const parsed = parseCountermeasureId(countermeasure.id)
        const backendStatus = status === 'platform' ? 'verified' : status

        if (parsed.type === 'component' && parsed.id !== null) {
          updateCountermeasureMutation.mutate({
            countermeasureId: parsed.id,
            data: {
              status: backendStatus as 'gap' | 'planned' | 'verified' | 'waived',
              ...(notes !== undefined && { evidenceUrl: notes }),
            },
          })
        } else if (parsed.type === 'flow' && parsed.id !== null) {
          updateFlowCountermeasureMutation.mutate({
            countermeasureId: parsed.id,
            data: {
              status: backendStatus as 'gap' | 'planned' | 'verified' | 'waived',
              ...(notes !== undefined && { evidenceUrl: notes }),
            },
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
              if (cm.countermeasureId !== countermeasureId) return cm
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
    [state.componentThreats, updateCountermeasureMutation, updateFlowCountermeasureMutation]
  )

  // Assign owner to countermeasure
  const assignOwner = useCallback(
    (
      componentThreatId: string,
      countermeasureInstanceId: string,
      assignee: { type: 'member' | 'team'; userId?: number; email?: string; name?: string | null; teamId?: number }
    ) => {
      // Determine owner string for local state storage
      const ownerString =
        assignee.type === 'team'
          ? `team:${assignee.name}`
          : assignee.email || ''

      // Find the threat and countermeasure
      const threat = state.componentThreats.find((ct) => ct.id === componentThreatId)
      const countermeasure = threat?.countermeasures.find((cm) => cm.id === countermeasureInstanceId)

      // If this is a backend countermeasure, call the appropriate API
      if (assignee.type === 'member' && countermeasure && assignee.userId) {
        const parsed = parseCountermeasureId(countermeasure.id)

        if (parsed.type === 'component' && parsed.id !== null) {
          updateCountermeasureMutation.mutate({
            countermeasureId: parsed.id,
            data: { assignedOwner: assignee.userId },
          })
        } else if (parsed.type === 'flow' && parsed.id !== null) {
          updateFlowCountermeasureMutation.mutate({
            countermeasureId: parsed.id,
            data: { assignedOwner: assignee.userId },
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
                owner: ownerString,
                status: cm.status === 'gap' ? 'planned' : cm.status,
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

  // Dismiss countermeasure (mark as dismissed instead of removing)
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

  // Update status
  const updateStatus = useCallback((status: WorkspaceStatus) => {
    setState((prev) => ({ ...prev, status }))
  }, [])

  // Update system context
  const updateSystemContext = useCallback((context: SystemContext) => {
    setState((prev) => ({ ...prev, systemContext: context }))
  }, [])

  // Toggle checklist item
  const toggleChecklistItem = useCallback((itemId: string, checked: boolean) => {
    setState((prev) => ({
      ...prev,
      progressChecklist: prev.progressChecklist.map((item) =>
        item.id === itemId ? { ...item, checked } : item
      ),
    }))
  }, [])

  // Compute summary statistics
  const summaries = useMemo(() => {
    const activeThreats = state.componentThreats.filter((ct) => !ct.dismissed)

    // Component summary
    const allNodes = diagrams.flatMap((d) => d.canvasData?.nodes || [])
    const componentSummary = {
      total: allNodes.filter(
        (n) => n.type === 'process' || n.type === 'datastore' || n.type === 'actor'
      ).length,
      processes: allNodes.filter((n) => n.type === 'process').length,
      datastores: allNodes.filter((n) => n.type === 'datastore').length,
      actors: allNodes.filter((n) => n.type === 'actor').length,
      trustBoundaries: allNodes.filter((n) => n.type === 'trustBoundary').length,
    }

    // Threat summary
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

    // Countermeasure summary
    const allCountermeasures = activeThreats.flatMap((ct) => ct.countermeasures)
    const countermeasureSummary = {
      total: allCountermeasures.length,
      platform: allCountermeasures.filter((cm) => cm.status === 'platform').length,
      gap: allCountermeasures.filter((cm) => cm.status === 'gap').length,
      planned: allCountermeasures.filter((cm) => cm.status === 'planned').length,
      waived: allCountermeasures.filter((cm) => cm.status === 'waived').length,
    }

    return { componentSummary, threatSummary, countermeasureSummary }
  }, [state.componentThreats, diagrams])

  // Compute auto-checked progress items
  const computedProgressChecklist = useMemo(() => {
    const allNodes = diagrams.flatMap((d) => d.canvasData?.nodes || [])
    const allEdges = diagrams.flatMap((d) => d.canvasData?.edges || [])
    const activeThreats = state.componentThreats.filter((ct) => !ct.dismissed)

    const hasComponents = allNodes.some(
      (n) => n.type === 'process' || n.type === 'datastore'
    )
    const hasTrustBoundaries = allNodes.some((n) => n.type === 'trustBoundary')
    const hasDataFlows = allEdges.length > 0
    const hasOwnersAssigned = activeThreats.some((ct) =>
      ct.countermeasures.some((cm) => cm.owner)
    )
    const hasThreatsLinkedToComponents = activeThreats.some((ct) =>
      allNodes.some((n) => n.id === ct.componentId)
    )
    const hasThreatsLinkedToFlows = activeThreats.some((ct) =>
      allEdges.some((e) => e.id === ct.componentId)
    )
    const hasCountermeasuresAssigned = activeThreats.some(
      (ct) => ct.countermeasures.length > 0
    )

    return state.progressChecklist.map((item) => {
      if (!item.autoComputed) return item

      let checked = false
      switch (item.id) {
        case 'components_identified':
          checked = hasComponents
          break
        case 'trust_boundaries_identified':
          checked = hasTrustBoundaries
          break
        case 'data_flows_defined':
          checked = hasDataFlows
          break
        case 'owners_assigned':
          checked = hasOwnersAssigned
          break
        case 'threats_linked_components':
          checked = hasThreatsLinkedToComponents
          break
        case 'threats_linked_flows':
          checked = hasThreatsLinkedToFlows
          break
        case 'countermeasures_assigned':
          checked = hasCountermeasuresAssigned
          break
      }
      return { ...item, checked }
    })
  }, [state.progressChecklist, state.componentThreats, diagrams])

  return {
    componentThreats: state.componentThreats,
    status: state.status,
    currentVersion: state.currentVersion,
    previousVersions: state.previousVersions,
    systemContext: state.systemContext,
    progressChecklist: computedProgressChecklist,
    summaries,
    isLoading: isLoadingThreats || isLoadingThreatModel,
    isLoadingThreats,
    updateCountermeasureStatus,
    assignOwner,
    dismissThreat,
    restoreThreat,
    addCountermeasure,
    removeCountermeasure,
    restoreCountermeasure,
    updateStatus,
    updateSystemContext,
    toggleChecklistItem,
  }
}
