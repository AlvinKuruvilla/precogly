import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Diagram } from '@/types'
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

// LocalStorage key prefix for workspace threat analysis
const WORKSPACE_STORAGE_KEY_PREFIX = 'precogly_workspace_'

interface WorkspaceThreatAnalysisState {
  threatModelId: string
  componentThreats: ComponentThreat[]
  status: WorkspaceStatus
  currentVersion: ThreatModelVersion
  previousVersions: ThreatModelVersion[]
  systemContext: SystemContext
  progressChecklist: ProgressChecklistItem[]
}

function getDefaultState(threatModelId: string): WorkspaceThreatAnalysisState {
  return {
    threatModelId,
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

function loadFromStorage(threatModelId: string): WorkspaceThreatAnalysisState | null {
  try {
    const stored = localStorage.getItem(`${WORKSPACE_STORAGE_KEY_PREFIX}${threatModelId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load workspace state from storage:', e)
  }
  return null
}

function saveToStorage(state: WorkspaceThreatAnalysisState): void {
  try {
    localStorage.setItem(
      `${WORKSPACE_STORAGE_KEY_PREFIX}${state.threatModelId}`,
      JSON.stringify(state)
    )
  } catch (e) {
    console.error('Failed to save workspace state to storage:', e)
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

export function useWorkspaceThreatAnalysis(
  threatModelId: string,
  diagrams: Diagram[]
) {
  const [state, setState] = useState<WorkspaceThreatAnalysisState>(() => {
    const stored = loadFromStorage(threatModelId)
    return stored || getDefaultState(threatModelId)
  })

  // Save to localStorage when state changes
  useEffect(() => {
    saveToStorage(state)
  }, [state])

  // Sync threats when diagrams change
  useEffect(() => {
    if (!diagrams || diagrams.length === 0) return

    setState((prev) => {
      // Get existing diagram IDs that have threats
      const existingDiagramIds = new Set(
        prev.componentThreats.map((ct) => ct.sourceDiagramId || ct.diagramId)
      )

      // Find new diagrams that need threats initialized
      const newDiagrams = diagrams.filter((d) => !existingDiagramIds.has(d.id))

      if (newDiagrams.length === 0) {
        // Also check for removed diagrams
        const currentDiagramIds = new Set(diagrams.map((d) => d.id))
        const filteredThreats = prev.componentThreats.filter(
          (ct) => currentDiagramIds.has(ct.sourceDiagramId || ct.diagramId)
        )
        if (filteredThreats.length !== prev.componentThreats.length) {
          return { ...prev, componentThreats: filteredThreats }
        }
        return prev
      }

      // Initialize threats for new diagrams
      const newThreats: ComponentThreat[] = []
      newDiagrams.forEach((diagram) => {
        const diagramThreats = initializeThreatsForDiagram(
          diagram.id,
          diagram.title,
          diagram.canvasData?.nodes || [],
          diagram.canvasData?.edges || []
        )
        newThreats.push(...diagramThreats)
      })

      return {
        ...prev,
        componentThreats: [...prev.componentThreats, ...newThreats],
      }
    })
  }, [diagrams])

  // Update countermeasure status
  const updateCountermeasureStatus = useCallback(
    (
      componentThreatId: string,
      countermeasureId: string,
      status: CountermeasureStatus,
      notes?: string
    ) => {
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
    []
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

  // Remove countermeasure
  const removeCountermeasure = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string) => {
      setState((prev) => ({
        ...prev,
        componentThreats: prev.componentThreats.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.filter(
              (cm) => cm.id !== countermeasureInstanceId
            ),
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
    updateCountermeasureStatus,
    assignOwner,
    dismissThreat,
    restoreThreat,
    addCountermeasure,
    removeCountermeasure,
    updateStatus,
    updateSystemContext,
    toggleChecklistItem,
  }
}
