import {
  Document,
  ImageRun,
  Paragraph,
  Table,
  TextRun,
  HeadingLevel,
} from 'docx'
import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'
import { isDataFlowEdge } from '@/features/dfd-editor/types'
import type { GuestThreat, GuestCountermeasure } from '../types'
import { STRIDE_CONFIG } from '@/types/domain'
import type { STRIDECategory } from '@/types/domain'
import {
  CONTENT_WIDTH,
  h1,
  h2,
  para,
  spacer,
  pageBreak,
  buildTable,
  downloadDocx,
  slugify,
  createDocumentStyles,
  createNumberingConfig,
  createPageProperties,
} from '@/features/reports/utils/wordHelpers'

// ---------------------------------------------------------------------------
// Input data interface
// ---------------------------------------------------------------------------

export interface GuestReportData {
  title: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  threats: GuestThreat[]
  countermeasures: GuestCountermeasure[]
  diagramImage?: Uint8Array
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map node type strings to human-readable labels. */
function formatNodeType(type: string | undefined): string {
  switch (type) {
    case 'process': return 'Process'
    case 'datastore': return 'Data Store'
    case 'humanActor': return 'Human Actor'
    case 'systemActor': return 'System Actor'
    case 'trustZone': return 'Trust Zone'
    case 'systemScope': return 'System Scope'
    default: return type ?? '—'
  }
}

const ACTOR_TYPE_LABELS: Record<string, string> = {
  user: 'User',
  power_user: 'Power User',
  administrator: 'Administrator',
  engineer: 'Engineer',
  third_party: 'Third Party',
  customer: 'Customer',
}

function formatActorType(actorType: string): string {
  return ACTOR_TYPE_LABELS[actorType] ?? actorType
}

/** Resolve a target name from its ID by searching nodes and edges. */
function resolveTargetName(targetId: string, nodes: DiagramNode[], edges: DiagramEdge[]): string {
  const node = nodes.find((n) => n.id === targetId)
  if (node) return (node.data as { label?: string }).label ?? node.id
  const edge = edges.find((e) => e.id === targetId)
  if (edge) return (edge.data as { label?: string })?.label ?? edge.id
  return targetId
}

/** Format a STRIDE category value to its display label. */
function formatStrideCategory(category: STRIDECategory | undefined): string {
  if (!category) return '—'
  return STRIDE_CONFIG[category]?.label ?? category
}

/** Capitalize first letter. */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ---------------------------------------------------------------------------
// Section 1: Diagram Overview
// ---------------------------------------------------------------------------

function buildOverviewSection(data: GuestReportData): (Paragraph | Table)[] {
  return [
    h1('1. Diagram Overview'),
    spacer(),
    buildTable(
      [4680, 4680],
      ['Metric', 'Count'],
      [
        ['Components (Nodes)', String(data.nodes.filter((n) => n.type !== 'trustZone' && n.type !== 'systemScope').length)],
        ['Data Flows (Edges)', String(data.edges.filter(isDataFlowEdge).length)],
        ['Threats', String(data.threats.length)],
        ['Countermeasures', String(data.countermeasures.length)],
      ],
    ),
    spacer(),
  ]
}

// ---------------------------------------------------------------------------
// Diagram Image Section (between Overview and Component Inventory)
// ---------------------------------------------------------------------------

/** CONTENT_WIDTH in DXA = 6.5 inches at 1440 DXA/inch. Convert to pixels at 96 DPI. */
const CONTENT_WIDTH_PX = (CONTENT_WIDTH / 1440) * 96 // ≈ 624 px

function buildDiagramImageSection(diagramImage: Uint8Array): (Paragraph | Table)[] {
  // Decode PNG header to read image dimensions (width × height at bytes 16–23)
  const widthBytes = diagramImage.slice(16, 20)
  const heightBytes = diagramImage.slice(20, 24)
  const pngWidth = (widthBytes[0] << 24) | (widthBytes[1] << 16) | (widthBytes[2] << 8) | widthBytes[3]
  const pngHeight = (heightBytes[0] << 24) | (heightBytes[1] << 16) | (heightBytes[2] << 8) | heightBytes[3]

  // Scale to fit page content width while maintaining aspect ratio
  const scale = Math.min(1, CONTENT_WIDTH_PX / pngWidth)
  const displayWidth = Math.round(pngWidth * scale)
  const displayHeight = Math.round(pngHeight * scale)

  return [
    h1('Data Flow Diagram'),
    spacer(),
    new Paragraph({
      children: [
        new ImageRun({
          data: diagramImage,
          transformation: { width: displayWidth, height: displayHeight },
          type: 'png',
        }),
      ],
    }),
    spacer(),
  ]
}

// ---------------------------------------------------------------------------
// Section 2: Component Inventory
// ---------------------------------------------------------------------------

function buildComponentInventorySection(data: GuestReportData): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [h1('2. Component Inventory'), spacer()]

  // Group nodes by type — exclude container types (trustZone, systemScope)
  const componentNodes = data.nodes.filter(
    (n) => n.type !== 'trustZone' && n.type !== 'systemScope',
  )

  if (componentNodes.length > 0) {
    children.push(
      h2('2.1 Components'),
      spacer(),
      buildTable(
        [3120, 2160, 4080],
        ['Name', 'Type', 'Description'],
        componentNodes.map((node) => {
          const nodeData = node.data as { label?: string; description?: string; actorType?: string }
          const typeName = formatNodeType(node.type)
          const displayType = node.type === 'humanActor' && nodeData.actorType
            ? `${typeName}\n(${formatActorType(nodeData.actorType)})`
            : typeName
          return [
            nodeData.label ?? '—',
            displayType,
            nodeData.description ?? '—',
          ]
        }),
      ),
      spacer(),
    )
  } else {
    children.push(
      para('No components have been added to the diagram.', { italic: true }),
      spacer(),
    )
  }

  // Data flows
  const dataFlows = data.edges.filter(isDataFlowEdge)
  if (dataFlows.length > 0) {
    children.push(
      h2('2.2 Data Flows'),
      spacer(),
      buildTable(
        [3120, 3120, 3120],
        ['Name', 'Source', 'Destination'],
        dataFlows.map((edge) => {
          const edgeData = edge.data as { label?: string }
          const sourceName = resolveTargetName(edge.source, data.nodes, data.edges)
          const destName = resolveTargetName(edge.target, data.nodes, data.edges)
          return [edgeData?.label ?? '—', sourceName, destName]
        }),
      ),
      spacer(),
    )
  }

  return children
}

// ---------------------------------------------------------------------------
// Section 3: Threat Analysis
// ---------------------------------------------------------------------------

function buildThreatAnalysisSection(data: GuestReportData): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [h1('3. Threat Analysis'), spacer()]

  if (data.threats.length === 0) {
    children.push(
      para('No threats have been identified.', { italic: true }),
      spacer(),
    )
    return children
  }

  // Summary stats
  const severityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  const strideCounts: Record<string, number> = {}

  for (const threat of data.threats) {
    severityCounts[threat.severity] = (severityCounts[threat.severity] ?? 0) + 1
    if (threat.category) {
      const label = formatStrideCategory(threat.category)
      strideCounts[label] = (strideCounts[label] ?? 0) + 1
    }
  }

  children.push(
    h2('3.1 Summary'),
    spacer(),
    buildTable(
      [4680, 4680],
      ['Severity', 'Count'],
      [
        ['Critical', String(severityCounts.critical)],
        ['High', String(severityCounts.high)],
        ['Medium', String(severityCounts.medium)],
        ['Low', String(severityCounts.low)],
        ['Total', String(data.threats.length)],
      ],
    ),
    spacer(),
  )

  // STRIDE distribution
  if (Object.keys(strideCounts).length > 0) {
    children.push(
      h2('3.2 STRIDE Distribution'),
      spacer(),
      buildTable(
        [4680, 4680],
        ['STRIDE Category', 'Count'],
        Object.entries(strideCounts).map(([category, count]) => [category, String(count)]),
      ),
      spacer(),
    )
  }

  // Main threats table
  children.push(
    h2('3.3 Threat Details'),
    spacer(),
    buildTable(
      [1800, 1560, 1200, 1560, 1080, 2160],
      ['Threat Name', 'Target', 'Target Type', 'STRIDE', 'Severity', 'Description'],
      data.threats.map((threat) => [
        threat.name,
        resolveTargetName(threat.targetId, data.nodes, data.edges),
        capitalize(threat.targetType),
        formatStrideCategory(threat.category),
        capitalize(threat.severity),
        threat.description || '—',
      ]),
    ),
    spacer(),
  )

  return children
}

// ---------------------------------------------------------------------------
// Section 4: Countermeasures
// ---------------------------------------------------------------------------

function buildCountermeasuresSection(data: GuestReportData): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [h1('4. Countermeasures'), spacer()]

  if (data.countermeasures.length === 0) {
    children.push(
      para('No countermeasures have been defined.', { italic: true }),
      spacer(),
    )
    return children
  }

  // Summary by control type
  const controlTypeCounts: Record<string, number> = {}
  for (const cm of data.countermeasures) {
    const label = capitalize(cm.controlType)
    controlTypeCounts[label] = (controlTypeCounts[label] ?? 0) + 1
  }

  children.push(
    h2('4.1 Summary'),
    spacer(),
    buildTable(
      [4680, 4680],
      ['Control Type', 'Count'],
      [
        ...Object.entries(controlTypeCounts).map(([type, count]) => [type, String(count)]),
        ['Total', String(data.countermeasures.length)],
      ],
    ),
    spacer(),
  )

  // Build a threat lookup map
  const threatMap = new Map(data.threats.map((t) => [t.id, t]))

  // Main countermeasures table
  children.push(
    h2('4.2 Countermeasure Details'),
    spacer(),
    buildTable(
      [2160, 1560, 2160, 3480],
      ['Countermeasure', 'Control Type', 'Associated Threat', 'Description'],
      data.countermeasures.map((cm) => {
        const associatedThreat = threatMap.get(cm.threatId)
        return [
          cm.name,
          capitalize(cm.controlType),
          associatedThreat?.name ?? '—',
          cm.description || '—',
        ]
      }),
    ),
    spacer(),
  )

  return children
}

// ---------------------------------------------------------------------------
// Section 5: Coverage Summary
// ---------------------------------------------------------------------------

function buildCoverageSummarySection(data: GuestReportData): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [h1('5. Coverage Summary'), spacer()]

  if (data.threats.length === 0) {
    children.push(
      para('No threats have been identified — coverage analysis is not applicable.', { italic: true }),
      spacer(),
    )
    return children
  }

  // Count countermeasures per threat
  const countermeasuresByThreat = new Map<string, number>()
  for (const cm of data.countermeasures) {
    countermeasuresByThreat.set(cm.threatId, (countermeasuresByThreat.get(cm.threatId) ?? 0) + 1)
  }

  const rows = data.threats.map((threat) => {
    const cmCount = countermeasuresByThreat.get(threat.id) ?? 0
    return [
      threat.name,
      capitalize(threat.severity),
      String(cmCount),
      cmCount > 0 ? 'Yes' : 'No',
    ]
  })

  const gapCount = data.threats.filter((t) => !countermeasuresByThreat.has(t.id)).length

  children.push(
    buildTable(
      [3120, 1560, 2160, 2520],
      ['Threat Name', 'Severity', '# Countermeasures', 'Covered?'],
      rows,
    ),
    spacer(),
  )

  if (gapCount > 0) {
    children.push(
      para(`${gapCount} threat${gapCount > 1 ? 's' : ''} without countermeasures — review recommended.`, { bold: true }),
      spacer(),
    )
  } else {
    children.push(
      para('All identified threats have at least one countermeasure.', { italic: true }),
      spacer(),
    )
  }

  return children
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function exportGuestWordDoc(data: GuestReportData): Promise<void> {
  const children: (Paragraph | Table)[] = [
    // Title page
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: data.title })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Threat Model Report (Guest)',
          size: 28,
          color: '444444',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          size: 24,
          color: '888888',
        }),
      ],
    }),
    spacer(),
    para('Generated from Precogly Guest Editor', { italic: true, size: 20 }),
    pageBreak(),

    // Sections
    ...buildOverviewSection(data),
    ...(data.diagramImage ? [...buildDiagramImageSection(data.diagramImage), pageBreak()] : [pageBreak()]),
    ...buildComponentInventorySection(data),
    pageBreak(),
    ...buildThreatAnalysisSection(data),
    pageBreak(),
    ...buildCountermeasuresSection(data),
    pageBreak(),
    ...buildCoverageSummarySection(data),
  ]

  const doc = new Document({
    styles: createDocumentStyles(),
    numbering: createNumberingConfig(),
    sections: [
      {
        properties: createPageProperties(),
        children,
      },
    ],
  })

  await downloadDocx(doc, `${slugify(data.title)}-guest-threat-model-report.docx`)
}
