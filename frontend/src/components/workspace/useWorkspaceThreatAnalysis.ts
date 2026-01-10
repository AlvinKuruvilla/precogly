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
  THREAT_DEFINITIONS,
  getThreatsForDataFlowByProperties,
  getThreatsForTrustBoundary,
} from '@/features/dfd-editor/lib/threat-registry'
import {
  getCountermeasuresForThreat,
} from '@/features/dfd-editor/lib/countermeasure-registry'
import {
  getTechnologyById,
  TECHNOLOGIES,
  type TechnologyCategory,
} from '@/features/dfd-editor/lib/technology-registry'
import type { DiagramNode, DataFlowEdge, TrustBoundaryNodeData } from '@/features/dfd-editor/types'
import { useThreatModelThreats, useUpdateCountermeasure } from '@/api/threats'
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

/**
 * Infer technology category from node type and technology string
 */
function inferTechnologyCategory(
  nodeType: string,
  techValue: string | undefined
): TechnologyCategory | null {
  if (techValue) {
    const byId = getTechnologyById(techValue)
    if (byId) return byId.category

    const normalizedValue = techValue.toLowerCase()
    const byName = TECHNOLOGIES.find(
      (t) =>
        t.name.toLowerCase() === normalizedValue ||
        t.name.toLowerCase().includes(normalizedValue) ||
        normalizedValue.includes(t.name.toLowerCase())
    )
    if (byName) return byName.category

    const lower = normalizedValue
    if (lower.includes('database') || lower.includes('sql') || lower.includes('db')) return 'database'
    if (lower.includes('redis') || lower.includes('cache')) return 'cache'
    if (lower.includes('s3') || lower.includes('blob') || lower.includes('storage')) return 'storage'
    if (lower.includes('lambda') || lower.includes('function')) return 'compute'
    if (lower.includes('kubernetes') || lower.includes('k8s')) return 'compute'
    if (lower.includes('api') || lower.includes('gateway')) return 'networking'
    if (lower.includes('auth') || lower.includes('oauth')) return 'auth'
    if (lower.includes('kafka') || lower.includes('queue')) return 'messaging'
  }

  if (nodeType === 'datastore') return 'database'
  if (nodeType === 'process') return 'backend'

  return null
}

/**
 * Initialize threats for a diagram
 */
function initializeThreatsForDiagram(
  diagramId: string,
  diagramTitle: string,
  nodes: DiagramNode[],
  edges: DataFlowEdge[]
): ComponentThreat[] {
  const componentThreats: ComponentThreat[] = []
  const timestamp = new Date().toISOString()

  // Process nodes (components - process and datastore)
  const analyzableNodes = nodes.filter(
    (node) => node.type === 'process' || node.type === 'datastore'
  )

  analyzableNodes.forEach((node) => {
    const techValue = (node.data as { technology?: string }).technology
    const category = inferTechnologyCategory(node.type as string, techValue)

    if (!category) return

    const applicableThreats = THREAT_DEFINITIONS.filter((threat) => {
      const elementTypes = threat.applicableElementTypes || ['component']
      return (
        elementTypes.includes('component') &&
        threat.applicableTechCategories.includes(category)
      )
    })

    applicableThreats.forEach((threatDef) => {
      const componentThreatId = `ct-${diagramId}-${node.id}-${threatDef.id}`
      const countermeasureDefs = getCountermeasuresForThreat(threatDef.id)

      const countermeasures: ComponentThreatCountermeasure[] = countermeasureDefs.map(
        (cmDef) => ({
          id: `ctcm-${componentThreatId}-${cmDef.id}`,
          countermeasureId: cmDef.id,
          componentThreatId,
          status: cmDef.isPlatformLevel
            ? 'platform'
            : ('gap' as CountermeasureStatus),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      )

      componentThreats.push({
        id: componentThreatId,
        diagramId,
        sourceDiagramId: diagramId,
        sourceDiagramTitle: diagramTitle,
        componentId: node.id,
        threatId: threatDef.id,
        dismissed: false,
        countermeasures,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    })
  })

  // Process trust boundary nodes
  const trustBoundaryNodes = nodes.filter((node) => node.type === 'trustBoundary')

  trustBoundaryNodes.forEach((node) => {
    const boundaryData = node.data as TrustBoundaryNodeData
    const boundaryType = boundaryData.boundaryType

    if (!boundaryType) return

    const applicableThreats = getThreatsForTrustBoundary(boundaryType)

    applicableThreats.forEach((threatDef) => {
      const componentThreatId = `ct-${diagramId}-${node.id}-${threatDef.id}`
      const countermeasureDefs = getCountermeasuresForThreat(threatDef.id)

      const countermeasures: ComponentThreatCountermeasure[] = countermeasureDefs.map(
        (cmDef) => ({
          id: `ctcm-${componentThreatId}-${cmDef.id}`,
          countermeasureId: cmDef.id,
          componentThreatId,
          status: cmDef.isPlatformLevel
            ? 'platform'
            : ('gap' as CountermeasureStatus),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      )

      componentThreats.push({
        id: componentThreatId,
        diagramId,
        sourceDiagramId: diagramId,
        sourceDiagramTitle: diagramTitle,
        componentId: node.id,
        threatId: threatDef.id,
        dismissed: false,
        countermeasures,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    })
  })

  // Process edges (data flows)
  edges.forEach((edge) => {
    const edgeData = edge.data || {}
    const dataFlowThreats = getThreatsForDataFlowByProperties({
      protocol: edgeData.protocol,
      encrypted: edgeData.encrypted,
      authenticated: edgeData.authenticated,
    })

    dataFlowThreats.forEach((threatDef) => {
      const componentThreatId = `ct-${diagramId}-${edge.id}-${threatDef.id}`
      const countermeasureDefs = getCountermeasuresForThreat(threatDef.id)

      const countermeasures: ComponentThreatCountermeasure[] = countermeasureDefs.map(
        (cmDef) => ({
          id: `ctcm-${componentThreatId}-${cmDef.id}`,
          countermeasureId: cmDef.id,
          componentThreatId,
          status: cmDef.isPlatformLevel
            ? 'platform'
            : ('gap' as CountermeasureStatus),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      )

      componentThreats.push({
        id: componentThreatId,
        diagramId,
        sourceDiagramId: diagramId,
        sourceDiagramTitle: diagramTitle,
        componentId: edge.id,
        threatId: threatDef.id,
        dismissed: false,
        countermeasures,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    })
  })

  return componentThreats
}

/**
 * Merge backend threats with local threats.
 * Backend threats take priority; local threats are kept for components not yet synced.
 */
function mergeThreats(
  localThreats: ComponentThreat[],
  backendThreats: ComponentThreat[]
): ComponentThreat[] {
  // Create a map of backend threats by componentId + threatId combination
  const backendThreatMap = new Map<string, ComponentThreat>()
  backendThreats.forEach((bt) => {
    const key = `${bt.componentId}-${bt.threatId}`
    backendThreatMap.set(key, bt)
  })

  // Get set of component IDs that have backend threats
  const backendComponentIds = new Set(backendThreats.map((bt) => bt.componentId))

  // Keep local threats for components not in backend (unsaved components)
  const localOnlyThreats = localThreats.filter((lt) => {
    // Keep if this component has no backend threats
    if (!backendComponentIds.has(lt.componentId)) return true
    // If component has backend threats, check if this specific threat exists
    const key = `${lt.componentId}-${lt.threatId}`
    return !backendThreatMap.has(key)
  })

  // Combine backend threats (priority) with local-only threats
  return [...backendThreats, ...localOnlyThreats]
}

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

  // Merge backend threats with local state when backend data loads
  useEffect(() => {
    if (backendThreats?.componentThreats && backendThreats.componentThreats.length > 0) {
      setState((prev) => ({
        ...prev,
        // Use backend threats, keeping any local threats for unsaved components
        componentThreats: mergeThreats(prev.componentThreats, backendThreats.componentThreats),
      }))
    }
  }, [backendThreats])

  // Sync threats when diagrams change (fallback for unsaved components)
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

      // Get existing diagram IDs that have threats (after filtering)
      const existingDiagramIds = new Set(
        filteredThreats.map((ct) => ct.sourceDiagramId || ct.diagramId)
      )

      // Find new diagrams that need threats initialized
      const newDiagrams = diagrams.filter((d) => !existingDiagramIds.has(d.id))

      if (newDiagrams.length === 0) {
        // Return filtered threats if any were removed
        if (filteredThreats.length !== prev.componentThreats.length) {
          return { ...prev, componentThreats: filteredThreats }
        }
        return prev
      }

      // Initialize threats for new diagrams (only for components without backend threats)
      const newThreats: ComponentThreat[] = []
      newDiagrams.forEach((diagram) => {
        const canvasData = diagram.canvasData
        const diagramThreats = initializeThreatsForDiagram(
          diagram.id,
          diagram.name || '',
          canvasData?.nodes || [],
          canvasData?.edges || []
        )
        newThreats.push(...diagramThreats)
      })

      return {
        ...prev,
        componentThreats: [...filteredThreats, ...newThreats],
      }
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

      // If this is a backend threat, also update via API
      if (threat && countermeasure && countermeasure.id.startsWith('cm-')) {
        // Extract backend countermeasure ID from the id string (format: "cm-{backendId}")
        const backendCmId = parseInt(countermeasure.id.replace('cm-', ''), 10)
        if (!isNaN(backendCmId)) {
          // Map frontend status to backend status
          const backendStatus = status === 'platform' ? 'verified' : status
          updateCountermeasureMutation.mutate({
            countermeasureId: backendCmId,
            data: {
              status: backendStatus as 'gap' | 'planned' | 'verified' | 'waived',
              ...(notes !== undefined && { evidence_url: notes }),
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
    [state.componentThreats, updateCountermeasureMutation]
  )

  // Assign owner to countermeasure
  const assignOwner = useCallback(
    (componentThreatId: string, countermeasureId: string, owner: string) => {
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
                owner,
                status: cm.status === 'gap' ? 'planned' : cm.status,
                updatedAt: new Date().toISOString(),
              }
            }),
          }
        }),
      }))
    },
    []
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
