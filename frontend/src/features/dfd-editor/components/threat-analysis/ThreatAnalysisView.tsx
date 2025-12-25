import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ComponentView } from './ComponentView'
import { TableView } from './TableView'
import type { DiagramNode, DataFlowEdge, CanvasData, TrustBoundaryNodeData } from '../../types'
import type {
  ComponentThreat,
  ComponentThreatCountermeasure,
  CountermeasureStatus,
} from '../../types/threat-analysis'
import { getThreatById, THREAT_DEFINITIONS, getThreatsForDataFlowByProperties, getThreatsForTrustBoundary } from '../../lib/threat-registry'
import {
  getCountermeasuresForThreat,
  getCountermeasureById,
} from '../../lib/countermeasure-registry'
import { getTechnologyById, TECHNOLOGIES, type TechnologyCategory } from '../../lib/technology-registry'

// LocalStorage key prefix for persisting threat selections
const THREAT_STORAGE_KEY_PREFIX = 'precogly_threats_'

/**
 * Load saved threats from localStorage
 */
function loadThreatsFromStorage(diagramId: string): ComponentThreat[] | null {
  try {
    const stored = localStorage.getItem(`${THREAT_STORAGE_KEY_PREFIX}${diagramId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load threats from storage:', e)
  }
  return null
}

/**
 * Save threats to localStorage
 */
function saveThreatsToStorage(diagramId: string, threats: ComponentThreat[]): void {
  try {
    localStorage.setItem(`${THREAT_STORAGE_KEY_PREFIX}${diagramId}`, JSON.stringify(threats))
  } catch (e) {
    console.error('Failed to save threats to storage:', e)
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
      (t) => t.name.toLowerCase() === normalizedValue ||
             t.name.toLowerCase().includes(normalizedValue) ||
             normalizedValue.includes(t.name.toLowerCase())
    )
    if (byName) return byName.category

    const lower = normalizedValue
    if (lower.includes('database') || lower.includes('sql') || lower.includes('db') || lower.includes('postgres') || lower.includes('mysql') || lower.includes('mongo')) return 'database'
    if (lower.includes('redis') || lower.includes('cache') || lower.includes('memcache')) return 'cache'
    if (lower.includes('s3') || lower.includes('blob') || lower.includes('storage')) return 'storage'
    if (lower.includes('lambda') || lower.includes('function') || lower.includes('serverless')) return 'compute'
    if (lower.includes('kubernetes') || lower.includes('k8s') || lower.includes('aks') || lower.includes('eks') || lower.includes('gke')) return 'compute'
    if (lower.includes('api') || lower.includes('gateway') || lower.includes('waf') || lower.includes('load balancer')) return 'networking'
    if (lower.includes('auth') || lower.includes('oauth') || lower.includes('cognito') || lower.includes('identity')) return 'auth'
    if (lower.includes('kafka') || lower.includes('queue') || lower.includes('sqs') || lower.includes('pubsub') || lower.includes('event')) return 'messaging'
  }

  if (nodeType === 'datastore') return 'database'
  if (nodeType === 'process') return 'backend'

  return null
}

type ViewMode = 'component' | 'table'

interface ThreatAnalysisViewProps {
  diagramId: string
  diagramTitle: string
  canvasData: CanvasData
  selectedFrameworks?: string[]
  onBack: () => void
  backLabel?: string
}

/**
 * Initialize threats for a diagram - loads from localStorage if available,
 * otherwise auto-creates all applicable threats for each component and data flow
 */
function initializeThreatsForDiagram(
  diagramId: string,
  nodes: DiagramNode[],
  edges: DataFlowEdge[]
): ComponentThreat[] {
  // Try to load saved threats from localStorage
  const savedThreats = loadThreatsFromStorage(diagramId)

  // Check if we need to add data flow threats to existing saved threats
  if (savedThreats) {
    // Get edge IDs that already have threats
    const edgeIdsWithThreats = new Set(
      savedThreats
        .filter((t) => edges.some((e) => e.id === t.componentId))
        .map((t) => t.componentId)
    )

    // Find edges that don't have any threats yet
    const edgesWithoutThreats = edges.filter((e) => !edgeIdsWithThreats.has(e.id))

    // If all edges have threats, return saved threats as-is
    if (edgesWithoutThreats.length === 0) {
      return savedThreats
    }

    // Add threats for edges that don't have any
    const timestamp = new Date().toISOString()
    const newDataFlowThreats: ComponentThreat[] = []

    edgesWithoutThreats.forEach((edge) => {
      const edgeData = edge.data || {}
      const dataFlowThreats = getThreatsForDataFlowByProperties({
        protocol: edgeData.protocol,
        encrypted: edgeData.encrypted,
        authenticated: edgeData.authenticated,
      })

      dataFlowThreats.forEach((threatDef) => {
        const componentThreatId = `ct-${edge.id}-${threatDef.id}`
        const countermeasureDefs = getCountermeasuresForThreat(threatDef.id)

        const countermeasures: ComponentThreatCountermeasure[] = countermeasureDefs.map((cmDef) => ({
          id: `ctcm-${componentThreatId}-${cmDef.id}`,
          countermeasureId: cmDef.id,
          componentThreatId,
          status: cmDef.isPlatformLevel ? 'platform' : 'gap' as CountermeasureStatus,
          createdAt: timestamp,
          updatedAt: timestamp,
        }))

        newDataFlowThreats.push({
          id: componentThreatId,
          diagramId,
          componentId: edge.id,
          threatId: threatDef.id,
          dismissed: false,
          countermeasures,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      })
    })

    // Merge saved threats with new data flow threats
    return [...savedThreats, ...newDataFlowThreats]
  }

  // Auto-create all applicable threats for each component and data flow
  const componentThreats: ComponentThreat[] = []
  const timestamp = new Date().toISOString()

  // Process nodes (components - process and datastore)
  const analyzableNodes = nodes.filter((node) =>
    node.type === 'process' || node.type === 'datastore'
  )

  analyzableNodes.forEach((node) => {
    const techValue = (node.data as { technology?: string }).technology
    const category = inferTechnologyCategory(node.type as string, techValue)

    if (!category) return

    // Get component threats (those without applicableElementTypes or with 'component')
    const applicableThreats = THREAT_DEFINITIONS.filter((threat) => {
      const elementTypes = threat.applicableElementTypes || ['component']
      return elementTypes.includes('component') && threat.applicableTechCategories.includes(category)
    })

    applicableThreats.forEach((threatDef) => {
      const componentThreatId = `ct-${node.id}-${threatDef.id}`
      const countermeasureDefs = getCountermeasuresForThreat(threatDef.id)

      const countermeasures: ComponentThreatCountermeasure[] = countermeasureDefs.map((cmDef) => ({
        id: `ctcm-${componentThreatId}-${cmDef.id}`,
        countermeasureId: cmDef.id,
        componentThreatId,
        status: cmDef.isPlatformLevel ? 'platform' : 'gap' as CountermeasureStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
      }))

      componentThreats.push({
        id: componentThreatId,
        diagramId,
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

    // Only generate threats for boundaries with a boundaryType set
    if (!boundaryType) return

    const applicableThreats = getThreatsForTrustBoundary(boundaryType)

    applicableThreats.forEach((threatDef) => {
      const componentThreatId = `ct-${node.id}-${threatDef.id}`
      const countermeasureDefs = getCountermeasuresForThreat(threatDef.id)

      const countermeasures: ComponentThreatCountermeasure[] = countermeasureDefs.map((cmDef) => ({
        id: `ctcm-${componentThreatId}-${cmDef.id}`,
        countermeasureId: cmDef.id,
        componentThreatId,
        status: cmDef.isPlatformLevel ? 'platform' : 'gap' as CountermeasureStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
      }))

      componentThreats.push({
        id: componentThreatId,
        diagramId,
        componentId: node.id,
        threatId: threatDef.id,
        dismissed: false,
        countermeasures,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    })
  })

  // Process edges (data flows) - filter threats based on edge properties
  edges.forEach((edge) => {
    // Get data flow properties from edge data
    const edgeData = edge.data || {}
    const dataFlowThreats = getThreatsForDataFlowByProperties({
      protocol: edgeData.protocol,
      encrypted: edgeData.encrypted,
      authenticated: edgeData.authenticated,
    })

    dataFlowThreats.forEach((threatDef) => {
      const componentThreatId = `ct-${edge.id}-${threatDef.id}`
      const countermeasureDefs = getCountermeasuresForThreat(threatDef.id)

      const countermeasures: ComponentThreatCountermeasure[] = countermeasureDefs.map((cmDef) => {
        return {
          id: `ctcm-${componentThreatId}-${cmDef.id}`,
          countermeasureId: cmDef.id,
          componentThreatId,
          status: cmDef.isPlatformLevel ? 'platform' : 'gap' as CountermeasureStatus,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      })

      componentThreats.push({
        id: componentThreatId,
        diagramId,
        componentId: edge.id, // Using edge.id as componentId for data flows
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

export function ThreatAnalysisView({
  diagramId,
  diagramTitle,
  canvasData,
  selectedFrameworks = [],
  onBack,
  backLabel = 'Back',
}: ThreatAnalysisViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('component')

  // Initialize component threats from diagram data (loads from localStorage)
  const [componentThreats, setComponentThreats] = useState<ComponentThreat[]>(() =>
    initializeThreatsForDiagram(diagramId, canvasData.nodes, canvasData.edges)
  )

  // Persist threats to localStorage when they change
  useEffect(() => {
    saveThreatsToStorage(diagramId, componentThreats)
  }, [diagramId, componentThreats])

  // Selected component and threat for drill-down
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null)

  // Get all analyzable components (process and datastore nodes)
  const analyzableComponents = useMemo(() => {
    return canvasData.nodes.filter((node) =>
      node.type === 'process' || node.type === 'datastore'
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

  // Update countermeasure status (with optional notes for waiver reason)
  const handleCountermeasureStatusChange = useCallback(
    (componentThreatId: string, countermeasureId: string, status: CountermeasureStatus, notes?: string) => {
      setComponentThreats((prev) =>
        prev.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.map((cm) => {
              if (cm.countermeasureId !== countermeasureId) return cm
              return {
                ...cm,
                status,
                // Update notes if provided (for waiver reason)
                ...(notes !== undefined && { notes }),
                updatedAt: new Date().toISOString(),
              }
            }),
          }
        })
      )
    },
    []
  )

  // Assign owner to countermeasure
  const handleAssignOwner = useCallback(
    (componentThreatId: string, countermeasureId: string, owner: string) => {
      setComponentThreats((prev) =>
        prev.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.map((cm) => {
              if (cm.countermeasureId !== countermeasureId) return cm
              return {
                ...cm,
                owner,
                // Auto-set to planned when owner is assigned
                status: cm.status === 'gap' ? 'planned' : cm.status,
                updatedAt: new Date().toISOString(),
              }
            }),
          }
        })
      )
    },
    []
  )

  // Add custom threat
  const handleAddCustomThreat = useCallback(
    (componentId: string, threatId: string) => {
      const threatDef = getThreatById(threatId)
      if (!threatDef) return

      const timestamp = new Date().toISOString()
      const componentThreatId = `ct-${componentId}-${threatId}-${Date.now()}`

      const countermeasureDefs = getCountermeasuresForThreat(threatId)
      const countermeasures: ComponentThreatCountermeasure[] = countermeasureDefs.map((cmDef) => ({
        id: `ctcm-${componentThreatId}-${cmDef.id}`,
        countermeasureId: cmDef.id,
        componentThreatId,
        status: cmDef.isPlatformLevel ? 'platform' : 'gap' as CountermeasureStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
      }))

      const newThreat: ComponentThreat = {
        id: componentThreatId,
        diagramId,
        componentId,
        threatId,
        dismissed: false,
        countermeasures,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      setComponentThreats((prev) => [...prev, newThreat])
      setSelectedThreatId(newThreat.id)
    },
    [diagramId]
  )

  // Dismiss threat
  const handleDismissThreat = useCallback((componentThreatId: string) => {
    setComponentThreats((prev) =>
      prev.map((ct) => {
        if (ct.id !== componentThreatId) return ct
        return { ...ct, dismissed: true, updatedAt: new Date().toISOString() }
      })
    )
  }, [])

  // Restore dismissed threat
  const handleRestoreThreat = useCallback((componentThreatId: string) => {
    setComponentThreats((prev) =>
      prev.map((ct) => {
        if (ct.id !== componentThreatId) return ct
        return { ...ct, dismissed: false, updatedAt: new Date().toISOString() }
      })
    )
  }, [])

  // Add custom countermeasure
  const handleAddCustomCountermeasure = useCallback(
    (componentThreatId: string, countermeasureId: string) => {
      const cmDef = getCountermeasureById(countermeasureId)
      if (!cmDef) return

      const timestamp = new Date().toISOString()
      const newCm: ComponentThreatCountermeasure = {
        id: `ctcm-${componentThreatId}-${countermeasureId}-${Date.now()}`,
        countermeasureId,
        componentThreatId,
        status: cmDef.isPlatformLevel ? 'platform' : 'gap',
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      setComponentThreats((prev) =>
        prev.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          // Don't add if already exists
          if (ct.countermeasures.some((cm) => cm.countermeasureId === countermeasureId)) {
            return ct
          }
          return {
            ...ct,
            updatedAt: timestamp,
            countermeasures: [...ct.countermeasures, newCm],
          }
        })
      )
    },
    []
  )

  // Remove countermeasure
  const handleRemoveCountermeasure = useCallback(
    (componentThreatId: string, countermeasureInstanceId: string) => {
      setComponentThreats((prev) =>
        prev.map((ct) => {
          if (ct.id !== componentThreatId) return ct
          return {
            ...ct,
            updatedAt: new Date().toISOString(),
            countermeasures: ct.countermeasures.filter((cm) => cm.id !== countermeasureInstanceId),
          }
        })
      )
    },
    []
  )

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
