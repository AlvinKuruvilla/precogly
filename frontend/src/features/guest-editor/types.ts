import type { STRIDECategory } from '@/types/domain'

export type ThreatStatus = 'open' | 'accept' | 'mitigate' | 'delegate' | 'eliminate'

export interface GuestThreat {
  id: string
  targetId: string
  targetType: 'component' | 'dataflow' | 'systemScope'
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category?: STRIDECategory
  status: ThreatStatus
  decisionRationale?: string
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

// --- System Context types ---

export interface GuestSessionMetadata {
  facilitator: string
  participants: string[]
  meetingDate: string // ISO date (YYYY-MM-DD) or empty
}

export interface GuestSystemInfo {
  description: string
  criticality: 'low' | 'medium' | 'high' | 'critical'
}

export interface GuestDataAsset {
  id: string
  name: string
  description: string
  classification: string
  confidentiality: 'low' | 'medium' | 'high'
  integrity: 'low' | 'medium' | 'high'
  availability: 'low' | 'medium' | 'high'
  complianceTags: string[]
  dataSensitivity: string[]
}

export interface GuestAssumption {
  id: string
  description: string
  validity: 'unconfirmed' | 'confirmed' | 'rejected'
  topics: string[]
}

export interface GuestOutOfScopeItem {
  id: string
  name: string
  reason: string
}

export interface GuestSystemContext {
  session: GuestSessionMetadata
  systemInfo: GuestSystemInfo
  dataAssets: GuestDataAsset[]
  assumptions: GuestAssumption[]
  outOfScopeItems: GuestOutOfScopeItem[]
}

export interface SystemContextExtension {
  session: GuestSessionMetadata
  systemInfo: GuestSystemInfo
  dataAssets: GuestDataAsset[]
  assumptions: GuestAssumption[]
  outOfScopeItems: GuestOutOfScopeItem[]
}

export const GUEST_CRITICALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const

export const GUEST_CIA_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

export const GUEST_ASSUMPTION_VALIDITY = [
  { value: 'unconfirmed', label: 'Unconfirmed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
] as const

export const GUEST_THREAT_STATUS_OPTIONS = [
  { value: 'open', label: 'Open', description: 'Not yet triaged — needs a decision' },
  { value: 'accept', label: 'Accept', description: 'Risk is tolerable — no action needed' },
  { value: 'mitigate', label: 'Mitigate', description: 'Reduce risk with countermeasures' },
  { value: 'delegate', label: 'Delegate', description: 'Transfer risk to another party' },
  { value: 'eliminate', label: 'Eliminate', description: 'Remove the threat source entirely' },
] as const

export const RATIONALE_REQUIRED_STATUSES: ThreatStatus[] = ['accept', 'delegate', 'eliminate']

export const STATUS_COLORS: Record<ThreatStatus, string> = {
  open: 'bg-gray-100 text-gray-800',
  accept: 'bg-yellow-100 text-yellow-800',
  mitigate: 'bg-green-100 text-green-800',
  delegate: 'bg-purple-100 text-purple-800',
  eliminate: 'bg-blue-100 text-blue-800',
}

export function getThreatWarning(
  threat: GuestThreat,
  countermeasureCount: number
): string | null {
  if (
    RATIONALE_REQUIRED_STATUSES.includes(threat.status) &&
    !threat.decisionRationale?.trim()
  ) {
    return `Decision rationale recommended for "${threat.status}" status`
  }
  if (threat.status === 'mitigate' && countermeasureCount === 0) {
    return 'Status is "mitigate" but no countermeasures defined'
  }
  return null
}

