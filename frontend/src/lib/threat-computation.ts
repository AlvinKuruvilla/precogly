/**
 * Shared threat computation utilities.
 * Computes threats from canvas data using the threat registry.
 * Used by both authenticated and shared views.
 */

import type {
  ComponentThreat,
  ComponentThreatCountermeasure,
  CountermeasureStatus,
} from '@/features/dfd-editor/types/threat-analysis'
import {
  THREAT_DEFINITIONS,
  getThreatsForDataFlowByProperties,
  getThreatsForTrustBoundary,
} from '@/features/dfd-editor/lib/threat-registry'
import { getCountermeasuresForThreat } from '@/features/dfd-editor/lib/countermeasure-registry'
import {
  getTechnologyById,
  TECHNOLOGIES,
  type TechnologyCategory,
} from '@/features/dfd-editor/lib/technology-registry'
import type { DiagramNode, DataFlowEdge, TrustBoundaryNodeData } from '@/features/dfd-editor/types'

/**
 * Infer technology category from node type and technology string
 */
export function inferTechnologyCategory(
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
 * Initialize threats for a diagram from canvas data.
 * This uses the threat registry to compute applicable threats for each component.
 */
export function initializeThreatsForDiagram(
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
 * Compute threats for all diagrams in a threat model.
 */
export interface DiagramData {
  id: string | number
  name: string
  canvasData?: {
    nodes?: DiagramNode[]
    edges?: DataFlowEdge[]
  }
}

export function computeThreatsFromDiagrams(diagrams: DiagramData[] | undefined | null): ComponentThreat[] {
  const allThreats: ComponentThreat[] = []

  if (!diagrams || !Array.isArray(diagrams)) {
    return allThreats
  }

  diagrams.forEach((diagram) => {
    const canvasData = diagram.canvasData
    if (!canvasData) return

    const diagramThreats = initializeThreatsForDiagram(
      String(diagram.id),
      diagram.name || '',
      (canvasData.nodes || []) as DiagramNode[],
      (canvasData.edges || []) as DataFlowEdge[]
    )
    allThreats.push(...diagramThreats)
  })

  return allThreats
}
