import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'
import type { DFDNotationStyle } from '@/features/dfd-editor/types/notation'
import type {
  GuestThreat,
  GuestCountermeasure,
  TmLibraryFile,
  TmLibraryEntity,
  TmLibraryDataFlow,
  TmLibraryThreat,
  TmLibraryControl,
} from '../types'

// --- Node type to TM-Library entity type mapping ---

const NODE_TYPE_TO_ENTITY_TYPE: Record<string, string> = {
  humanActor: 'actor',
  systemActor: 'actor',
  process: 'component',
  datastore: 'data_store',
  trustZone: 'trust_zone',
  systemScope: 'system_scope',
}

function getEntityTypeForNode(node: DiagramNode): string {
  return NODE_TYPE_TO_ENTITY_TYPE[node.type ?? ''] ?? 'component'
}

// --- Serialization: ReactFlow state → TM-Library JSON ---

export function serializeToTmLibrary(
  title: string,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  threats: GuestThreat[],
  countermeasures: GuestCountermeasure[],
  notationStyle?: DFDNotationStyle
): string {
  const now = new Date().toISOString()

  // Build a nodeId → entity lookup for resolving data flow endpoints
  const nodeMap = new Map<string, DiagramNode>()
  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  // Actors
  const actors: TmLibraryEntity[] = nodes
    .filter((n) => n.type === 'humanActor' || n.type === 'systemActor')
    .map((n) => ({
      symbolic_name: n.id,
      name: n.data.label || n.type || '',
      description: n.data.description || '',
      actor_type: n.type === 'humanActor' ? 'human' : 'system',
    }))

  // Components (processes)
  const components: TmLibraryEntity[] = nodes
    .filter((n) => n.type === 'process')
    .map((n) => ({
      symbolic_name: n.id,
      name: n.data.label || '',
      description: n.data.description || '',
      ...(n.parentId && nodeMap.get(n.parentId)?.type === 'process'
        ? { parent_component: n.parentId }
        : {}),
    }))

  // Data stores
  const dataStores: TmLibraryEntity[] = nodes
    .filter((n) => n.type === 'datastore')
    .map((n) => ({
      symbolic_name: n.id,
      name: n.data.label || '',
      description: n.data.description || '',
    }))

  // Trust zones
  const trustZones: TmLibraryEntity[] = nodes
    .filter((n) => n.type === 'trustZone')
    .map((n) => ({
      symbolic_name: n.id,
      name: n.data.label || '',
      description: n.data.description || '',
    }))

  // Data flows
  const dataFlows: TmLibraryDataFlow[] = edges
    .filter((e): e is DiagramEdge & { type: 'dataFlow' } => e.type === 'dataFlow')
    .map((e) => {
      const sourceNode = nodeMap.get(e.source)
      const targetNode = nodeMap.get(e.target)
      const data = e.data as Record<string, unknown> | undefined
      return {
        symbolic_name: e.id,
        name: (data?.label as string) || '',
        description: (data?.description as string) || '',
        source: {
          type: sourceNode ? getEntityTypeForNode(sourceNode) : 'unknown',
          name: sourceNode?.data.label || e.source,
        },
        destination: {
          type: targetNode ? getEntityTypeForNode(targetNode) : 'unknown',
          name: targetNode?.data.label || e.target,
        },
      }
    })

  // Trust boundaries
  const trustBoundaries: TmLibraryEntity[] = edges
    .filter((e) => e.type === 'trustBoundary')
    .map((e) => ({
      symbolic_name: e.id,
      name: e.data?.label || '',
      trust_zone_a: e.source,
      trust_zone_b: e.target,
    }))

  // Threats
  const tmThreats: TmLibraryThreat[] = threats.map((t) => {
    const affectedKey =
      t.targetType === 'dataflow' ? 'data_flows_affected' : 'components_affected'
    return {
      symbolic_name: t.id,
      name: t.name,
      description: t.description,
      severity: t.severity,
      ...(t.category && { category: t.category }),
      [affectedKey]: [t.targetId],
    }
  })

  // Controls (countermeasures)
  const tmControls: TmLibraryControl[] = countermeasures.map((c) => ({
    symbolic_name: c.id,
    name: c.name,
    description: c.description,
    control_type: c.controlType,
    threats: [c.threatId],
  }))

  const file: TmLibraryFile = {
    version: '1.0',
    scope: { title },
    trust_zones: trustZones,
    trust_boundaries: trustBoundaries,
    actors,
    components,
    data_stores: dataStores,
    data_sets: [],
    data_flows: dataFlows,
    threats: tmThreats,
    controls: tmControls,
    risks: [],
    extensions: {
      'precogly.org/canvas-data': { nodes, edges, notationStyle },
      'precogly.org/guest-metadata': {
        generator: 'precogly-guest',
        createdAt: now,
        updatedAt: now,
      },
    },
  }

  return JSON.stringify(file, null, 2)
}

// --- Deserialization result ---

interface DeserializedFile {
  title: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  threats: GuestThreat[]
  countermeasures: GuestCountermeasure[]
  notationStyle?: DFDNotationStyle
}

// --- Deserialization: TM-Library JSON → in-memory state ---

function deserializeTmLibrary(json: string): DeserializedFile {
  const parsed = JSON.parse(json)

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file: not a JSON object')
  }

  // Detect legacy .precogly format
  if (parsed.generator === 'precogly-guest') {
    return deserializeLegacyFormat(parsed)
  }

  // TM-Library format
  const canvasData = parsed.extensions?.['precogly.org/canvas-data']
  if (!canvasData || !Array.isArray(canvasData.nodes) || !Array.isArray(canvasData.edges)) {
    throw new Error('Invalid file: missing precogly.org/canvas-data extension')
  }

  const title = parsed.scope?.title || 'Untitled Diagram'
  const nodes: DiagramNode[] = canvasData.nodes
  const edges: DiagramEdge[] = canvasData.edges
  const notationStyleValue = canvasData.notationStyle as DFDNotationStyle | undefined

  // Reconstruct GuestThreat[] from threats[]
  const threats: GuestThreat[] = (parsed.threats || []).map(
    (t: TmLibraryThreat): GuestThreat => {
      let targetId = ''
      let targetType: GuestThreat['targetType'] = 'component'

      if (t.data_flows_affected?.length) {
        targetId = t.data_flows_affected[0]
        targetType = 'dataflow'
      } else if (t.components_affected?.length) {
        targetId = t.components_affected[0]
        // Check if the node is a systemScope
        const node = nodes.find((n) => n.id === targetId)
        targetType = node?.type === 'systemScope' ? 'systemScope' : 'component'
      }

      const categoryValue = t.category as string | undefined

      return {
        id: t.symbolic_name,
        targetId,
        targetType,
        name: t.name,
        description: t.description || '',
        severity: (t.severity as GuestThreat['severity']) || 'medium',
        ...(categoryValue ? { category: categoryValue as GuestThreat['category'] } : {}),
        createdAt:
          parsed.extensions?.['precogly.org/guest-metadata']?.createdAt ||
          new Date().toISOString(),
      }
    }
  )

  // Reconstruct GuestCountermeasure[] from controls[]
  const countermeasures: GuestCountermeasure[] = (parsed.controls || []).map(
    (c: TmLibraryControl): GuestCountermeasure => ({
      id: c.symbolic_name,
      threatId: c.threats?.[0] || '',
      name: c.name,
      description: c.description || '',
      controlType:
        (c.control_type as GuestCountermeasure['controlType']) || 'preventive',
      createdAt:
        parsed.extensions?.['precogly.org/guest-metadata']?.createdAt ||
        new Date().toISOString(),
    })
  )

  return { title, nodes, edges, threats, countermeasures, notationStyle: notationStyleValue }
}

// --- Legacy .precogly format ---

function deserializeLegacyFormat(parsed: Record<string, unknown>): DeserializedFile {
  if (parsed.version !== '1.0') {
    throw new Error(`Unsupported legacy file version: ${parsed.version}`)
  }

  const diagram = parsed.diagram as { title: string; nodes: DiagramNode[]; edges: DiagramEdge[] } | undefined
  if (!diagram || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
    throw new Error('Invalid legacy file: missing or malformed diagram data')
  }

  const threats = Array.isArray(parsed.threats) ? (parsed.threats as GuestThreat[]) : []

  return {
    title: diagram.title,
    nodes: diagram.nodes,
    edges: diagram.edges,
    threats,
    countermeasures: [],
  }
}

// --- File download ---

export function downloadTmLibraryFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.json') ? filename : `${filename}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

// --- File open ---

export function openTmLibraryFile(): Promise<DeserializedFile> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.precogly'
    input.style.display = 'none'

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const result = deserializeTmLibrary(reader.result as string)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })

    input.addEventListener('cancel', () => {
      reject(new Error('File selection cancelled'))
    })

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  })
}
