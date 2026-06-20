import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'

export interface GuestThreat {
  id: string
  targetId: string
  targetType: 'component' | 'dataflow' | 'systemScope'
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
}

export interface PrecoglyFile {
  version: '1.0'
  generator: 'precogly-guest'
  createdAt: string
  updatedAt: string
  diagram: {
    title: string
    nodes: DiagramNode[]
    edges: DiagramEdge[]
  }
  threats: GuestThreat[]
  metadata: {
    nodeCount: number
    edgeCount: number
    threatCount: number
  }
}
