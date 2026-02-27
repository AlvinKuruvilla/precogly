// TypeScript types matching the TM-BOM JSON schema exactly
// Uses snake_case to match the raw JSON structure

export type BusinessCriticality = "minimal" | "low" | "moderate" | "high" | "maximal"
export type ControlStatus = "assumed" | "active" | "suggested" | "under_review" | "approved" | "scheduled" | "retired" | "wont_do"
export type DataSensitivity = "pii" | "phi" | "fin" | "ip" | "cred" | "biz" | "gov" | "pci" | "op"
export type Degree = "minimal" | "low" | "moderate" | "high" | "maximal"
export type Exposure = "internal" | "external"
export type Impact = "negligible" | "minor" | "moderate" | "major" | "severe"
export type Likelihood = "rare" | "unlikely" | "possible" | "likely" | "certain"
export type Priority = "none" | "low" | "medium" | "high" | "critical"
export type Tier = "mission_critical" | "business_critical" | "important" | "non_critical"
export type AccessLevel = "anonymous" | "user" | "admin"
export type AccessControlMethod = "none" | "acl" | "rbac" | "mac" | "dac" | "abac"
export type AuthenticationMethod = "none" | "password" | "otp" | "challenge_response" | "public_key" | "token" | "biometrics" | "sso" | "social"
export type DataStoreType = "sql" | "key_value" | "document" | "object" | "graph" | "time_series"
export type AttackerSkillLevel = "script_kid" | "insider" | "engineer" | "expert_engineer" | "oc_sponsored" | "state_sponsored"
export type ActorType = "system" | "user" | "power_user" | "administrator" | "engineer" | "third_party"
export type ThreatSource = "adversary" | "human_error" | "failure" | "events_beyond_org_control"
export type AssumptionValidity = "unconfirmed" | "confirmed" | "rejected"

export interface TypedSymbolicName {
  type: string
  object: string  // actual JSON uses "object", not "name" from schema
}

export interface TrustBoundaryRef {
  trust_zone_a: string
  trust_zone_b: string
}

export interface CapecRef {
  capec_id: number
  capec_title?: string
}

export interface CweRef {
  cwe_id: number
  cwe_title?: string
}

export interface TmBomScope {
  title: string
  description: string
  business_criticality: BusinessCriticality
  data_sensitivity: DataSensitivity[]
  exposure: Exposure
  tier: Tier
}

export interface TmBomTrustZone {
  symbolic_name: string
  title: string
  description: string
}

export interface TmBomTrustBoundary {
  trust_zone_a: string
  trust_zone_b: string
  access_control_methods?: AccessControlMethod[]
  authentication_methods?: AuthenticationMethod[]
  access_token_expires?: boolean
  access_token_ttl?: number
  has_refresh_token?: boolean
  refresh_token_expires?: boolean
  refresh_token_ttl?: number
  can_user_logout?: boolean
  can_system_logout?: boolean
}

export interface TmBomActor {
  symbolic_name: string
  title: string
  description: string
  type: ActorType
  permissions?: string
  trust_zone?: string
}

export interface TmBomComponent {
  symbolic_name: string
  title: string
  description: string
  parent_component?: string
  trust_zone: string
  repo_link?: string
}

export interface TmBomDataStore {
  symbolic_name: string
  title: string
  description: string
  type: DataStoreType
  vendor?: string
  product?: string
  trust_zone?: string
}

export interface TmBomDataSet {
  symbolic_name: string
  title: string
  description: string
  placements: { data_store: string; encrypted: boolean }[]
  data_sensitivity: DataSensitivity[]
  access_control_methods?: AccessControlMethod[]
  record_count?: number
}

export interface TmBomDataFlow {
  symbolic_name: string
  title: string
  description: string
  source: TypedSymbolicName
  destination: TypedSymbolicName
  has_sensitive_data: boolean
  encrypted: boolean
}

export interface TmBomThreatPersona {
  symbolic_name: string
  title: string
  description: string
  is_person: boolean
  skill_level: AttackerSkillLevel
  access_level: AccessLevel
  malicious_intent: boolean
  applicability_to_org: Degree
}

export interface TmBomThreat {
  symbolic_name: string
  title: string
  description: string
  components_affected?: string[]
  threat_persona: string
  event: string
  sources: ThreatSource[]
  attack_mechanisms?: CapecRef[]
  weaknesses?: CweRef[]
}

export interface TmBomControl {
  symbolic_name: string
  title: string
  description: string
  threats: string[]
  trust_boundary?: TrustBoundaryRef
  status: ControlStatus
  priority: Priority
}

export interface TmBomRisk {
  symbolic_name: string
  title: string
  description: string
  threats: string[]
  likelihood: Likelihood
  impact: Impact
  impact_description: string
  score: number
  level: string
}

export interface TmBomAssumption {
  description: string
  topics?: string[]
  validity: AssumptionValidity
}

export interface TmBomFile {
  $schema?: string
  version: string
  scope: TmBomScope
  description?: string
  frozen?: boolean
  released_at?: string
  product_release_date?: string
  reviewed_at?: string
  repo_link?: string
  release_docs_link?: string
  trust_zones: TmBomTrustZone[]
  trust_boundaries: TmBomTrustBoundary[]
  actors: TmBomActor[]
  components: TmBomComponent[]
  data_stores: TmBomDataStore[]
  data_sets: TmBomDataSet[]
  data_flows: TmBomDataFlow[]
  assumptions?: TmBomAssumption[]
  threat_personas?: TmBomThreatPersona[]
  threats?: TmBomThreat[]
  controls?: TmBomControl[]
  risks?: TmBomRisk[]
}
