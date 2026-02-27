import type {
  AccessControlMethod,
  AssumptionValidity,
  AttackerSkillLevel,
  AuthenticationMethod,
  CapecRef,
  ControlStatus,
  CweRef,
  DataSensitivity,
  DataStoreType,
  Degree,
  Impact,
  Likelihood,
  Priority,
  ThreatSource,
} from "./tmbom"
import type { RiskLevel } from "@/lib/risk-calculator"

export type ThreatDerivedStatus = "exposed" | "addressable" | "mitigated"

export interface ScopeUI {
  title: string
  description: string
  businessCriticality: string
  dataSensitivity: DataSensitivity[]
  exposure: string
  tier: string
}

export interface TrustZoneUI {
  symbolicName: string
  title: string
  description: string
}

export interface TrustBoundaryUI {
  trustZoneA: string
  trustZoneB: string
  accessControlMethods: AccessControlMethod[]
  authenticationMethods: AuthenticationMethod[]
}

export interface ComponentUI {
  symbolicName: string
  title: string
  description: string
  category: "actor" | "component" | "dataStore"
  actorType?: string
  dataStoreType?: DataStoreType
  trustZone: string
  parentComponent?: string
}

export interface DataFlowUI {
  symbolicName: string
  title: string
  description: string
  source: { type: string; name: string }
  destination: { type: string; name: string }
  hasSensitiveData: boolean
  encrypted: boolean
}

export interface ThreatPersonaUI {
  symbolicName: string
  title: string
  description: string
  isPerson: boolean
  skillLevel: AttackerSkillLevel
  maliciousIntent: boolean
  applicabilityToOrg: Degree
}

export interface ThreatInstanceUI {
  id: string
  symbolicName: string
  title: string
  description: string
  componentAffected: string
  threatPersona?: string
  event: string
  sources: ThreatSource[]
  attackMechanisms: CapecRef[]
  weaknesses: CweRef[]
  dismissed: boolean
  status: ThreatDerivedStatus
  likelihood: Likelihood | null
  impact: Impact | null
  inherentScore: number | null
  residualScore: number | null
  riskLevel: RiskLevel | null
}

export interface ControlUI {
  symbolicName: string
  title: string
  description: string
  threats: string[]
  status: ControlStatus
  priority: Priority
  trustBoundary?: { trustZoneA: string; trustZoneB: string }
}

export interface RiskUI {
  symbolicName: string
  title: string
  description: string
  threats: string[]
  likelihood: Likelihood
  impact: Impact
  impactDescription: string
  score: number
  level: string
}

export interface DataSetUI {
  symbolicName: string
  title: string
  description: string
  placements: { dataStore: string; encrypted: boolean }[]
  dataSensitivity: DataSensitivity[]
  accessControlMethods: AccessControlMethod[]
  recordCount: number | null
}

export interface AssumptionUI {
  description: string
  topics: string[]
  validity: AssumptionValidity
}

export interface WorkspaceState {
  loaded: boolean
  fileName: string
  version: string
  description: string
  frozen: boolean
  reviewedAt: string | null
  repoLink: string | null
  releaseDocsLink: string | null
  scope: ScopeUI
  trustZones: TrustZoneUI[]
  trustBoundaries: TrustBoundaryUI[]
  components: ComponentUI[]
  dataFlows: DataFlowUI[]
  dataSets: DataSetUI[]
  threatPersonas: ThreatPersonaUI[]
  threats: ThreatInstanceUI[]
  controls: ControlUI[]
  risks: RiskUI[]
  assumptions: AssumptionUI[]
  selectedComponentId: string | null
  selectedThreatId: string | null
}
