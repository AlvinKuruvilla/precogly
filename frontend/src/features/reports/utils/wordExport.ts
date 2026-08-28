import {
  Document,
  Paragraph,
  Table,
  TextRun,
  HeadingLevel,
  ImageRun,
} from 'docx'
import type { ReportData, ReportThreat } from '../types/report'
import {
  h1,
  h2,
  h3,
  para,
  placeholder,
  spacer,
  pageBreak,
  buildTable,
  downloadDocx,
  slugify,
  createDocumentStyles,
  createNumberingConfig,
  createPageProperties,
} from './wordHelpers'

// ---------------------------------------------------------------------------
// Flatten helpers (mirrors csvExport.ts)
// ---------------------------------------------------------------------------

type ThreatWithContext = { threat: ReportThreat; context: string }

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

function flattenThreats(data: ReportData): ThreatWithContext[] {
  const out: ThreatWithContext[] = []
  for (const [context, threats] of Object.entries(data.threatAnalysis.componentThreats)) {
    for (const threat of threats) out.push({ threat, context })
  }
  for (const [context, threats] of Object.entries(data.threatAnalysis.dataFlowThreats)) {
    for (const threat of threats) out.push({ threat, context })
  }
  return out
}

type CanvasNodeForExport = {
  id: string
  type?: string
  position?: { x?: number; y?: number }
  style?: { width?: number | string; height?: number | string }
  data?: { label?: string }
}

type CanvasEdgeForExport = { source: string; target: string }

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '\"': '&quot;' }[character] || character))
}

async function renderDfdPng(canvasData: { nodes?: unknown[]; edges?: unknown[] }): Promise<Uint8Array | null> {
  const nodes = (canvasData.nodes || []) as CanvasNodeForExport[]
  if (nodes.length === 0) return null
  const edges = (canvasData.edges || []) as CanvasEdgeForExport[]
  const positions = nodes.map((node) => ({
    node,
    x: node.position?.x ?? 0,
    y: node.position?.y ?? 0,
    width: Number(node.style?.width) || 150,
    height: Number(node.style?.height) || 70,
  }))
  const minX = Math.min(...positions.map((item) => item.x))
  const minY = Math.min(...positions.map((item) => item.y))
  const maxX = Math.max(...positions.map((item) => item.x + item.width))
  const maxY = Math.max(...positions.map((item) => item.y + item.height))
  const padding = 32
  const width = Math.max(640, maxX - minX + padding * 2)
  const height = Math.max(360, maxY - minY + padding * 2)
  const byId = new Map(positions.map((item) => [item.node.id, item]))
  const colors: Record<string, string> = { process: '#dbeafe', datastore: '#f3e8ff', humanActor: '#dcfce7', systemActor: '#e2e8f0', stickyNote: '#fef9c3' }
  const strokes: Record<string, string> = { process: '#3b82f6', datastore: '#a855f7', humanActor: '#16a34a', systemActor: '#64748b', stickyNote: '#eab308' }
  const edgeMarkup = edges.map((edge) => {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)
    if (!source || !target) return ''
    const x1 = source.x - minX + padding + source.width / 2
    const y1 = source.y - minY + padding + source.height / 2
    const x2 = target.x - minX + padding + target.width / 2
    const y2 = target.y - minY + padding + target.height / 2
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>`
  }).join('')
  const nodeMarkup = positions.map(({ node, x, y, width: nodeWidth, height: nodeHeight }) => {
    const left = x - minX + padding
    const top = y - minY + padding
    const type = node.type || 'process'
    const label = escapeXml(node.data?.label || type)
    return `<g><rect x="${left}" y="${top}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="${colors[type] || '#f8fafc'}" stroke="${strokes[type] || '#64748b'}" stroke-width="2"/><text x="${left + nodeWidth / 2}" y="${top + nodeHeight / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="14" fill="#1e293b">${label}</text></g>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#94a3b8"/></marker></defs>${edgeMarkup}${nodeMarkup}</svg>`
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const imageElement = new Image()
    imageElement.onload = () => resolve(imageElement)
    imageElement.onerror = () => reject(new Error('Unable to decode generated DFD image'))
    imageElement.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
  const canvas = document.createElement('canvas')
  const scale = Math.min(2, 1200 / width)
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  return png ? new Uint8Array(await png.arrayBuffer()) : null
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildMetadataSection(data: ReportData): (Paragraph | Table)[] {
  const m = data.metadata
  const rows = [
    ['Threat Model Name', m.name],
    ['Criticality', m.criticality],
    ['Risk Scoring Method', m.riskScoringMethod],
    ['Owning Team', m.owningTeam ?? '—'],
    ['Created By', m.createdBy ?? '—'],
    ['Created', m.createdAt ?? '—'],
    ['Last Updated', m.updatedAt ?? '—'],
    ['Frameworks', m.frameworks.map((f) => f.name).join(', ') || '—'],
  ]

  return [
    h1('1. Document Information'),
    spacer(),
    buildTable([3000, 6360], ['Field', 'Value'], rows),
    spacer(),
  ]
}

function buildSummarySection(data: ReportData): (Paragraph | Table)[] {
  const s = data.summaryMetrics
  const statusRows = Object.entries(s.threatsByStatus).map(([k, v]) => [k, String(v)])
  const cmRows = Object.entries(s.countermeasuresByStatus).map(([k, v]) => [k, String(v)])
  const riskRows = Object.entries(s.risksByLevel).map(([k, v]) => [k, String(v)])

  return [
    h1('2. Executive Summary'),
    spacer(),
    h2('2.1 Summary Metrics'),
    spacer(),
    buildTable(
      [4680, 4680],
      ['Metric', 'Count'],
      [
        ['Total Active Threats', String(s.totalActiveThreats)],
        ['Total Dismissed Threats', String(s.totalDismissedThreats)],
        ['Total Countermeasures', String(s.totalCountermeasures)],
        ['Open Gaps', String(s.totalGaps)],
        ['Waived Countermeasures', String(s.totalWaived)],
        ['Inherited Countermeasures', String(s.totalInherited)],
        ['Total Risks', String(s.totalRisks)],
      ],
    ),
    spacer(),
    h2('2.2 Threat Status Breakdown'),
    spacer(),
    buildTable([4680, 4680], ['Status', 'Count'], statusRows),
    spacer(),
    h2('2.3 Countermeasure Status Breakdown'),
    spacer(),
    buildTable([4680, 4680], ['Status', 'Count'], cmRows),
    spacer(),
    ...(riskRows.length > 0
      ? [
          h2('2.4 Risk Level Breakdown') as Paragraph | Table,
          spacer(),
          buildTable([4680, 4680], ['Level', 'Count'], riskRows),
          spacer(),
        ]
      : []),
    h2('2.5 STRIDE Distribution'),
    spacer(),
    buildTable(
      [4680, 4680],
      ['STRIDE Category', 'Count'],
      Object.entries(data.threatAnalysis.strideSummary).map(([k, v]) => [k, String(v)]),
    ),
    spacer(),
  ]
}

function buildScopeSection(data: ReportData): (Paragraph | Table)[] {
  const scope = data.scope
  const children: (Paragraph | Table)[] = [
    h1('3. Scope'),
    spacer(),
    h2('3.1 Scope Description'),
    para(scope.description || '—'),
    spacer(),
  ]

  if (scope.assumptions.length > 0) {
    children.push(
      h2('3.2 Assumptions'),
      spacer(),
      buildTable(
        [4500, 1800, 3060],
        ['Assumption', 'Validity', 'Topics'],
        scope.assumptions.map((a) => [
          a.description,
          a.validity,
          a.topics.join(', '),
        ]),
      ),
      spacer(),
    )
  }

  if (scope.outOfScopeItems.length > 0) {
    children.push(
      h2('3.3 Out of Scope'),
      spacer(),
      buildTable(
        [3120, 6240],
        ['Item', 'Reason'],
        scope.outOfScopeItems.map((i) => [i.name, i.reason]),
      ),
      spacer(),
    )
  }

  return children
}

function buildArchitectureSection(data: ReportData, dfdImages: Map<string, Uint8Array>): (Paragraph | Table)[] {
  const arch = data.architecture
  const children: (Paragraph | Table)[] = [h1('4. System Architecture'), spacer()]

  // DFD inventory table
  if (arch.dfds.length > 0) {
    children.push(
      h2('4.1 Data Flow Diagrams'),
      spacer(),
      buildTable(
        [3240, 1800, 720, 720, 2880],
        ['Diagram Name', 'Type', 'Nodes', 'Edges', 'Notes'],
        arch.dfds.map((dfd) => [
          dfd.name,
          dfd.diagramType,
          String(dfd.nodeCount),
          String(dfd.edgeCount),
          dfd.isPrimary ? 'Primary DFD' : 'Reference DFD',
        ]),
      ),
      spacer(),
    )

    // Per-DFD placeholder + node inventory
    arch.dfds.forEach((dfd, idx) => {
      children.push(
        h3(`Figure ${idx + 1}: ${dfd.name}${dfd.isPrimary ? ' (Primary)' : ''}`),
        ...(dfdImages.get(dfd.id)
          ? [new Paragraph({ children: [new ImageRun({ data: dfdImages.get(dfd.id)!, type: 'png', transformation: { width: 600, height: 360 } })] })]
          : [placeholder(`DFD diagram unavailable — ${dfd.name}`)]),
        spacer(),
      )

      // If canvasData has nodes, extract a component inventory
      const nodes = (dfd.canvasData as any)?.nodes
      if (Array.isArray(nodes) && nodes.length > 0) {
        const nodeRows = nodes
          .filter((n: any) => n?.data)
          .map((n: any) => [
            n.data?.label ?? n.data?.name ?? n.id ?? '—',
            n.type ?? '—',
          ])
        if (nodeRows.length > 0) {
          children.push(
            para('Component nodes in this diagram:', { italic: true }),
            buildTable([4680, 4680], ['Node Label', 'Type'], nodeRows),
            spacer(),
          )
        }
      }
    })
  }

  // Trust Zones
  if (arch.trustZones.length > 0) {
    children.push(
      h2('4.2 Trust Zones'),
      spacer(),
      buildTable(
        [2400, 1200, 5760],
        ['Zone Name', 'Trust Level', 'Description'],
        arch.trustZones.map((z) => [z.name, String(z.trustLevel), z.description]),
      ),
      spacer(),
    )
  }

  // Trust Boundaries
  if (arch.trustBoundaries.length > 0) {
    children.push(
      h2('4.3 Trust Boundaries'),
      spacer(),
      buildTable(
        [3120, 3120, 3120],
        ['Boundary', 'Zone A', 'Zone B'],
        arch.trustBoundaries.map((b) => [b.label, b.zoneA, b.zoneB]),
      ),
      spacer(),
    )
  }

  // Reference Images
  if (arch.referenceImages.length > 0) {
    children.push(
      h2('4.4 Reference Images'),
      spacer(),
      buildTable(
        [4680, 4680],
        ['Filename', 'Description'],
        arch.referenceImages.map((img) => [img.filename, img.description]),
      ),
      spacer(),
    )
  }

  return children
}

function buildDataAssetsSection(data: ReportData): (Paragraph | Table)[] {
  if (data.dataAssets.length === 0) return []

  return [
    h1('5. Data Assets'),
    spacer(),
    buildTable(
      [1800, 1440, 1260, 1260, 1260, 2340],
      ['Name', 'Classification', 'Confidentiality', 'Integrity', 'Availability', 'Description'],
      data.dataAssets.map((a) => [
        a.name,
        a.classification,
        a.confidentiality,
        a.integrity,
        a.availability,
        a.description,
      ]),
    ),
    spacer(),
  ]
}

function buildComponentsSection(data: ReportData): (Paragraph | Table)[] {
  const c = data.components
  const allComponents = [
    ...c.processes.map((p) => ({ ...p, _type: 'Process' })),
    ...c.dataStores.map((p) => ({ ...p, _type: 'Data Store' })),
    ...c.humanActors.map((p) => ({ ...p, _type: 'Human Actor' })),
    ...c.systemActors.map((p) => ({ ...p, _type: 'System Actor' })),
  ]

  if (allComponents.length === 0) return []

  return [
    h1('6. Component Inventory'),
    spacer(),
    buildTable(
      [2400, 1440, 1440, 1440, 2640],
      ['Name', 'Type', 'Category', 'Trust Zone', 'Description'],
      allComponents.map((c) => {
        const displayType = c._type === 'Human Actor' && c.actorType
          ? `${c._type}\n(${formatActorType(c.actorType)})`
          : c._type
        return [
          c.name,
          displayType,
          c.category,
          c.trustZone ?? '—',
          c.description,
        ]
      }),
    ),
    spacer(),
  ]
}

function buildThreatAnalysisSection(data: ReportData): (Paragraph | Table)[] {
  const allThreats = flattenThreats(data)
  if (allThreats.length === 0) return []

  const children: (Paragraph | Table)[] = [
    h1('7. Threat Analysis'),
    spacer(),
    para(
      `This section documents ${allThreats.length} identified threats across all system components and data flows.`,
    ),
    spacer(),
    buildTable(
      [3240, 2160, 960, 960, 960, 1080],
      ['Threat Name', 'Component / Data Flow', 'STRIDE', 'Inherent Severity', 'Status', 'CMs'],
      allThreats.map(({ threat, context }) => [
        threat.threatName,
        context,
        threat.strideCategory ?? '—',
        threat.inherentSeverity,
        threat.status,
        String(threat.countermeasures.length),
      ]),
    ),
    spacer(),
  ]

  // Dismissed threats
  if (data.threatAnalysis.dismissedThreats.length > 0) {
    children.push(
      h2('7.1 Dismissed Threats'),
      spacer(),
      buildTable(
        [3240, 2880, 3240],
        ['Threat Name', 'Component / Data Flow', 'Dismissal Reason'],
        data.threatAnalysis.dismissedThreats.map((t) => [
          t.threatName,
          t.componentName ?? t.flowLabel ?? '—',
          t.dismissalReason,
        ]),
      ),
      spacer(),
    )
  }

  return children
}

function buildCountermeasuresSection(data: ReportData): (Paragraph | Table)[] {
  const allThreats = flattenThreats(data)
  const rows: string[][] = []

  for (const { threat, context } of allThreats) {
    for (const cm of threat.countermeasures) {
      rows.push([
        cm.countermeasureName,
        cm.controlType,
        cm.status,
        cm.priority,
        cm.isInherited
          ? `Yes — ${cm.inheritedFromComponentName ?? cm.inheritedFromZoneName ?? ''}`
          : 'No',
        threat.threatName,
        context,
      ])
    }
  }

  if (rows.length === 0) return []

  const children: (Paragraph | Table)[] = [
    h1('8. Countermeasures'),
    spacer(),
    buildTable(
      [2160, 1080, 900, 780, 1440, 1440, 1560],
      ['Countermeasure', 'Control Type', 'Status', 'Priority', 'Inherited', 'Associated Threat', 'Component'],
      rows,
    ),
    spacer(),
  ]

  // Gaps
  if (data.countermeasureSummary.gaps.length > 0) {
    children.push(
      h2('8.1 Open Gaps'),
      spacer(),
      buildTable(
        [3240, 2160, 1440, 2520],
        ['Countermeasure', 'Component / Data Flow', 'Priority', 'Assigned Owner'],
        data.countermeasureSummary.gaps.map((g) => [
          g.countermeasureName,
          g.componentName ?? g.flowLabel ?? '—',
          g.priority,
          g.assignedOwnerEmail ?? 'Unassigned',
        ]),
      ),
      spacer(),
    )
  }

  return children
}

function buildRisksSection(data: ReportData): (Paragraph | Table)[] {
  if (data.risks.length === 0) return []

  return [
    h1('9. Risk Register'),
    spacer(),
    buildTable(
      [2160, 1200, 1200, 1200, 1200, 2400],
      ['Risk Name', 'Inherent Score', 'Inherent Level', 'Residual Score', 'Residual Level', 'Owner'],
      data.risks.map((r) => [
        r.name,
        String(r.inherentScore),
        r.inherentLevel,
        String(r.residualScore),
        r.residualLevel,
        r.ownerEmail ?? 'Unassigned',
      ]),
    ),
    spacer(),
  ]
}

function buildComplianceSection(data: ReportData): (Paragraph | Table)[] {
  if (data.compliance.frameworks.length === 0) return []

  return [
    h1('10. Compliance Coverage'),
    spacer(),
    buildTable(
      [3240, 1680, 1680, 2760],
      ['Framework', 'Total Requirements', 'Covered', 'Coverage %'],
      data.compliance.frameworks.map((fw) => [
        fw.name,
        String(fw.totalRequirements),
        String(fw.coveredRequirements),
        `${fw.coveragePercentage.toFixed(1)}%`,
      ]),
    ),
    spacer(),
  ]
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function exportWordDoc(data: ReportData, modelName: string): Promise<void> {
  const dfdImages = new Map<string, Uint8Array>()
  for (const dfd of data.architecture.dfds) {
    if (dfd.canvasData) {
      const image = await renderDfdPng(dfd.canvasData)
      if (image) dfdImages.set(dfd.id, image)
    }
  }

  const children: (Paragraph | Table)[] = [
    // Title page
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: modelName })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Cybersecurity Threat Model — Full Report',
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
    placeholder('This document is auto-generated. Review all sections before submission.'),
    pageBreak(),

    // Sections
    ...buildMetadataSection(data),
    pageBreak(),
    ...buildSummarySection(data),
    pageBreak(),
    ...buildScopeSection(data),
    pageBreak(),
    ...buildArchitectureSection(data, dfdImages),
    pageBreak(),
    ...buildDataAssetsSection(data),
    pageBreak(),
    ...buildComponentsSection(data),
    pageBreak(),
    ...buildThreatAnalysisSection(data),
    pageBreak(),
    ...buildCountermeasuresSection(data),
    pageBreak(),
    ...buildRisksSection(data),
    pageBreak(),
    ...buildComplianceSection(data),
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

  await downloadDocx(doc, `${slugify(modelName)}-threat-model-report.docx`)
}
