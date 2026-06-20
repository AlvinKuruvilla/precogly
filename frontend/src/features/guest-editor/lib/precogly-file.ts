import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'
import type { GuestThreat, PrecoglyFile } from '../types'

export function serializePrecoglyFile(
  title: string,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  threats: GuestThreat[]
): string {
  const now = new Date().toISOString()
  const file: PrecoglyFile = {
    version: '1.0',
    generator: 'precogly-guest',
    createdAt: now,
    updatedAt: now,
    diagram: {
      title,
      nodes,
      edges,
    },
    threats,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      threatCount: threats.length,
    },
  }
  return JSON.stringify(file, null, 2)
}

export function deserializePrecoglyFile(json: string): PrecoglyFile {
  const parsed = JSON.parse(json)

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file: not a JSON object')
  }
  if (parsed.version !== '1.0') {
    throw new Error(`Unsupported file version: ${parsed.version}`)
  }
  if (parsed.generator !== 'precogly-guest') {
    throw new Error(`Unsupported generator: ${parsed.generator}`)
  }
  if (!parsed.diagram || !Array.isArray(parsed.diagram.nodes) || !Array.isArray(parsed.diagram.edges)) {
    throw new Error('Invalid file: missing or malformed diagram data')
  }
  if (!Array.isArray(parsed.threats)) {
    throw new Error('Invalid file: missing threats array')
  }

  return parsed as PrecoglyFile
}

export function downloadPrecoglyFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.precogly') ? filename : `${filename}.precogly`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function openPrecoglyFile(): Promise<PrecoglyFile> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.precogly'
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
          const result = deserializePrecoglyFile(reader.result as string)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })

    // Handle cancel (input element removed without selection)
    input.addEventListener('cancel', () => {
      reject(new Error('File selection cancelled'))
    })

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  })
}
