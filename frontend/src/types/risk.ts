export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RiskStatus = 'open' | 'mitigated' | 'accepted'
export type ScoringMethodKey = 'tm_library' | 'fair' | 'owasp_rr' | 'mozilla_rra' | 'custom'

export interface Risk {
  id: number
  name: string
  description: string
  scoringMethod: ScoringMethodKey
  scoringMetadata: Record<string, unknown>
  inherentScore: number
  inherentLevel: RiskLevel
  residualScore: number | null
  residualLevel: RiskLevel | null
  status: RiskStatus
  threatCount: number
  threats?: RiskThreatEntry[]
  owner: number | null
  ownerEmail: string | null
  assignedTo: number | null
  assignedToEmail: string | null
  formatMetadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface RiskThreatEntry {
  riskThreatId: number
  threatId: number
  threatType: 'component' | 'flow'
  threatName: string
  status: string
  isDismissed: boolean
}

export interface ScoringFieldSchema {
  type: 'enum' | 'number' | 'range' | 'object' | 'text'
  values?: string[]
  min?: number
  max?: number
  required: boolean
}

export interface ScoringMethod {
  key: ScoringMethodKey
  label: string
  description: string
  metadataSchema: Record<string, ScoringFieldSchema>
  available: boolean
}

export interface CreateRiskInput {
  name: string
  description?: string
  scoringMetadata: Record<string, unknown>
  inherentScore?: number
  owner?: number | null
  assignedTo?: number | null
  componentThreatIds?: number[]
  flowThreatIds?: number[]
}

export interface UpdateRiskInput {
  name?: string
  description?: string
  scoringMetadata?: Record<string, unknown>
  inherentScore?: number
  owner?: number | null
  assignedTo?: number | null
}

export interface AddRemoveThreatsInput {
  componentThreatIds?: number[]
  flowThreatIds?: number[]
}
