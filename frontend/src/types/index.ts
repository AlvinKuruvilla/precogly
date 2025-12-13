export type ThreatModelStatus = 'in_progress' | 'pending_review' | 'approved'
export type Criticality = 'low' | 'medium' | 'high' | 'critical'

export interface ThreatModel {
  id: string
  name: string
  description: string
  criticality: Criticality
  status: ThreatModelStatus
  frameworks: string[]
  owner: string
  createdAt: string
  updatedAt: string
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
