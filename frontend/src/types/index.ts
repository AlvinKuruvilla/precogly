export type ThreatModelStatus = 'in_progress' | 'pending_review' | 'approved'
export type Criticality = 'low' | 'medium' | 'high' | 'critical'
export type SystemType = 'system' | 'process'

export interface ThreatModel {
  id: string
  name: string
  description: string
  criticality: Criticality
  status: ThreatModelStatus
  frameworks: string[]
  owner: string
  systemIds?: string[]
  referencedModelIds?: string[]
  createdAt: string
  updatedAt: string
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
