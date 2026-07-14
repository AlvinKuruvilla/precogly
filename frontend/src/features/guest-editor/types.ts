import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'
import type { STRIDECategory } from '@/types/domain'

export interface GuestThreat {
  id: string
  targetId: string
  targetType: 'component' | 'dataflow' | 'systemScope'
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category?: STRIDECategory
  createdAt: string
}

export interface GuestCountermeasure {
  id: string
  threatId: string
  name: string
  description: string
  controlType: 'preventive' | 'detective' | 'corrective' | 'deterrent' | 'recovery' | 'compensating' | 'procedural'
  createdAt: string
}

export const GUEST_CONTROL_TYPES = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'detective', label: 'Detective' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'deterrent', label: 'Deterrent' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'compensating', label: 'Compensating' },
  { value: 'procedural', label: 'Procedural' },
] as const

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

// TM-Library JSON format types

export interface TmLibraryEntity {
  symbolic_name: string
  name: string
  description?: string
  [key: string]: unknown
}

export interface TmLibraryDataFlow {
  symbolic_name: string
  name: string
  description?: string
  source: { type: string; name: string }
  destination: { type: string; name: string }
  [key: string]: unknown
}

export interface TmLibraryThreat {
  symbolic_name: string
  name: string
  description?: string
  severity?: string
  components_affected?: string[]
  data_flows_affected?: string[]
  [key: string]: unknown
}

export interface TmLibraryControl {
  symbolic_name: string
  name: string
  description?: string
  control_type?: string
  threats?: string[]
  [key: string]: unknown
}

export interface CanvasDataExtension {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  notationStyle?: import('@/features/dfd-editor/types/notation').DFDNotationStyle
}

export interface GuestMetadataExtension {
  generator: 'precogly-guest'
  createdAt: string
  updatedAt: string
}

export interface TmLibraryFile {
  version: string
  scope: {
    title: string
    description?: string
  }
  trust_zones: TmLibraryEntity[]
  trust_boundaries: TmLibraryEntity[]
  actors: TmLibraryEntity[]
  components: TmLibraryEntity[]
  data_stores: TmLibraryEntity[]
  data_sets: TmLibraryEntity[]
  data_flows: TmLibraryDataFlow[]
  threats: TmLibraryThreat[]
  controls: TmLibraryControl[]
  risks: TmLibraryEntity[]
  extensions: {
    'precogly.org/canvas-data': CanvasDataExtension
    'precogly.org/guest-metadata': GuestMetadataExtension
    [key: string]: unknown
  }
}
