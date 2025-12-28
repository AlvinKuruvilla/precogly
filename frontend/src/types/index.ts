// Re-export pack types
export * from './packs'

// Re-export library types (excludes DFDTemplate to avoid conflict with dfd-editor types)
export type {
  ComponentLibrary,
  ThreatLibrary,
  CountermeasureLibrary,
  DFDTemplate as LibraryDFDTemplate,
} from './libraries'

export type ThreatModelStatus = 'in_progress' | 'pending_review' | 'approved'
export type Criticality = 'low' | 'medium' | 'high' | 'critical'
export type SystemType = 'system' | 'process'

// Re-export diagram types from DFD editor feature
export * from '@/features/dfd-editor/types'

export interface ThreatModel {
  id: string
  name: string
  description: string
  criticality?: Criticality
  status: ThreatModelStatus
  frameworks?: string[]
  owner?: string
  systemIds?: string[]
  referencedModelIds?: string[]
  createdAt?: string
  updatedAt?: string
  // Backend snake_case fields
  created_at?: string
  updated_at?: string
  created_by?: string
  created_by_email?: string
  workspace_data?: Record<string, unknown>
  dfds?: Array<{ id: string; name: string; diagram_type?: string; updated_at?: string }>
}

export interface CreateThreatModelInput {
  name: string
  description?: string
  criticality?: Criticality
  frameworks?: string[]
  systemIds?: string[]
  referencedModelIds?: string[]
}

export interface DashboardStats {
  total: number
  inProgress: number
  pendingReview: number
  approved: number
}

export interface Framework {
  id: string
  name: string
  description: string
}

export interface System {
  id: string
  name: string
  type: SystemType
  description: string
  environment: string
}
