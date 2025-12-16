import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ComponentView } from './ComponentView'
import { TableView } from './TableView'
import type { DiagramNode, CanvasData } from '../../types'
import type {
  ComponentThreat,
  ComponentThreatCountermeasure,
  CountermeasureStatus,
} from '../../types/threat-analysis'
import { getThreatById, THREAT_DEFINITIONS } from '../../lib/threat-registry'
import {
  getCountermeasuresForThreat,
  getCountermeasureById,
} from '../../lib/countermeasure-registry'
import { getTechnologyById, TECHNOLOGIES, type TechnologyCategory } from '../../lib/technology-registry'

/**
 * Try to find a technology by ID first, then by name match
 */
function findTechnology(techValue: string | undefined) {
  if (!techValue) return null

  // First try exact ID match
  const byId = getTechnologyById(techValue)
  if (byId) return byId

  // Then try name match (case-insensitive)
  const normalizedValue = techValue.toLowerCase()
  const byName = TECHNOLOGIES.find(
    (t) => t.name.toLowerCase() === normalizedValue ||
           t.name.toLowerCase().includes(normalizedValue) ||
           normalizedValue.includes(t.name.toLowerCase())
  )
  if (byName) return byName

  return null
}

/**
 * Infer a technology category from node type and technology string
 */
function inferTechnologyCategory(
  nodeType: string,
  techValue: string | undefined
): TechnologyCategory | null {
  // Try to match from technology registry first
  const tech = findTechnology(techValue)
  if (tech) return tech.category

  // Infer from common keywords in technology string
  if (techValue) {
    const lower = techValue.toLowerCase()
    if (lower.includes('database') || lower.includes('sql') || lower.includes('db') || lower.includes('postgres') || lower.includes('mysql') || lower.includes('mongo')) return 'database'
    if (lower.includes('redis') || lower.includes('cache') || lower.includes('memcache')) return 'cache'
    if (lower.includes('s3') || lower.includes('blob') || lower.includes('storage')) return 'storage'
    if (lower.includes('lambda') || lower.includes('function') || lower.includes('serverless')) return 'compute'
    if (lower.includes('kubernetes') || lower.includes('k8s') || lower.includes('aks') || lower.includes('eks') || lower.includes('gke')) return 'compute'
    if (lower.includes('api') || lower.includes('gateway') || lower.includes('waf') || lower.includes('load balancer')) return 'networking'
    if (lower.includes('auth') || lower.includes('oauth') || lower.includes('cognito') || lower.includes('identity')) return 'auth'
    if (lower.includes('kafka') || lower.includes('queue') || lower.includes('sqs') || lower.includes('pubsub') || lower.includes('event')) return 'messaging'
  }

  // Default category based on node type
  if (nodeType === 'datastore') return 'database'
  if (nodeType === 'process') return 'backend'

  return null
}

type ViewMode = 'component' | 'table'

interface ThreatAnalysisViewProps {
  diagramId: string
  diagramTitle: string
  canvasData: CanvasData
  onBack: () => void
}

/**
 * Initialize threats and countermeasures for components based on their technologies
 */
function initializeThreatsForDiagram(
  diagramId: string,
  nodes: DiagramNode[]
): ComponentThreat[] {
  const componentThreats: ComponentThreat[] = []
  const timestamp = new Date().toISOString()

  // Get all process and datastore components (they can all have threats)
  const analyzableComponents = nodes.filter((node) =>
    node.type === 'process' || node.type === 'datastore'
  )

  analyzableComponents.forEach((node) => {
    const techValue = (node.data as { technology?: string }).technology

    // Infer the technology category from the node type and any technology string
    const category = inferTechnologyCategory(node.type as string, techValue)

    if (!category) return

    // Find threats applicable to this category
    const applicableThreats = THREAT_DEFINITIONS.filter((threat) =>
      threat.applicableTechCategories.includes(category)
    )

    applicableThreats.forEach((threatDef) => {
      const componentThreatId = `ct-${node.id}-${threatDef.id}`

      // Get countermeasures for this threat
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

  return componentThreats
}

export function ThreatAnalysisView({
  diagramId,
  diagramTitle,
  canvasData,
  onBack,
}: ThreatAnalysisViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('component')

  // Initialize component threats from diagram data
  const [componentThreats, setComponentThreats] = useState<ComponentThreat[]>(() =>
    initializeThreatsForDiagram(diagramId, canvasData.nodes)
  )

  // Selected component and threat for drill-down
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null)

  // Get components that have threats (i.e., have technology assigned)
  const componentsWithThreats = useMemo(() => {
    const componentIds = new Set(componentThreats.map((ct) => ct.componentId))
    return canvasData.nodes.filter((node) => componentIds.has(node.id))
  }, [canvasData.nodes, componentThreats])

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

  // Auto-select first component if none selected
  useMemo(() => {
    if (!selectedComponentId && componentsWithThreats.length > 0) {
      setSelectedComponentId(componentsWithThreats[0].id)
    }
  }, [selectedComponentId, componentsWithThreats])

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

  // Update countermeasure status
  const handleCountermeasureStatusChange = useCallback(
    (componentThreatId: string, countermeasureId: string, status: CountermeasureStatus) => {
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
            Back to DFD
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
            componentsWithThreats={componentsWithThreats}
            componentThreats={componentThreats}
            selectedComponentId={selectedComponentId}
            selectedThreatId={selectedThreatId}
            selectedComponentThreat={selectedComponentThreat}
            onSelectComponent={setSelectedComponentId}
            onSelectThreat={setSelectedThreatId}
            onCountermeasureStatusChange={handleCountermeasureStatusChange}
            onAssignOwner={handleAssignOwner}
            onAddCustomThreat={handleAddCustomThreat}
            onDismissThreat={handleDismissThreat}
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
