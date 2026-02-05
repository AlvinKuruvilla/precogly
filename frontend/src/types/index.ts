// Re-export domain types (single source of truth)
export * from './domain'

// Re-export pack types
export {
  type PackType,
  type PackTier,
  type PackSource,
  type PackDependency,
  type PackContentSummary,
  type LibraryPack,
  type LibraryPackListItem,
  type PackDependencyCheck,
  type PackFilters,
} from './packs'

// Re-export compliance types
export * from './compliance'

// Re-export library types (excludes DFDTemplate to avoid conflict with dfd-editor types)
export type {
  ComponentLibrary,
  ThreatLibrary,
  CountermeasureLibrary,
  DFDTemplate as LibraryDFDTemplate,
} from './libraries'

// Re-export diagram types from DFD editor feature
export * from '@/features/dfd-editor/types'

// Import types from domain for use in this file
import type { ThreatModelStatus, Criticality, SystemType, ModelingMode } from './domain'

export interface ReferenceImage {
  id: number
  threatModel: number
  image: string
  imageUrl: string
  filename: string
  description: string
  displayOrder: number
  uploadedBy: number | null
  uploadedByEmail: string | null
  createdAt: string
}

export interface ThreatModel {
  id: string
  name: string
  description: string
  criticality?: Criticality
  status: ThreatModelStatus
  modelingMode?: ModelingMode
  frameworks?: string[]
  owner?: string
  systemIds?: string[]
  referencedModelIds?: string[]
  referenceImages?: ReferenceImage[]
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  createdByEmail?: string
  workspaceData?: Record<string, unknown>
  dfds?: Array<{ id: string; name: string; diagramType?: string; updatedAt?: string }>
}

export interface CreateThreatModelInput {
  name: string
  description?: string
  criticality?: Criticality
  modelingMode?: ModelingMode
  frameworkIds?: number[]
  systemIds?: number[]
  referencedModelIds?: number[]
}

export interface DashboardStats {
  total: number
  inProgress: number
  pendingReview: number
  approved: number
}

// Note: Framework type is now exported from ./compliance with full fields

export interface System {
  id: string
  name: string
  type: SystemType
  description: string
  environment: string
}

export interface CreateSystemInput {
  name: string
  description?: string
  lifecycleState?: 'development' | 'production' | 'decommissioned'
}
