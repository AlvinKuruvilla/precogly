import type { TmBomFile } from "@/types/tmbom"
import type {
  AssumptionUI,
  ComponentUI,
  ControlUI,
  DataFlowUI,
  DataSetUI,
  RiskUI,
  ScopeUI,
  ThreatDerivedStatus,
  ThreatInstanceUI,
  ThreatPersonaUI,
  TrustBoundaryUI,
  TrustZoneUI,
  WorkspaceState,
} from "@/types/workspace"

const MITIGATED_STATUSES = new Set(["active", "approved", "assumed"])

function deriveThreatStatus(
  threatSymbolicName: string,
  controls: ControlUI[]
): ThreatDerivedStatus {
  const linkedControls = controls.filter((control) =>
    control.threats.includes(threatSymbolicName)
  )

  if (linkedControls.length === 0) return "exposed"

  const allMitigated = linkedControls.every((control) =>
    MITIGATED_STATUSES.has(control.status)
  )
  if (allMitigated) return "mitigated"

  const anySuggested = linkedControls.some(
    (control) => control.status === "suggested"
  )
  if (anySuggested) return "exposed"

  return "addressable"
}

export function parseTmBomFile(
  rawJson: TmBomFile,
  fileName: string
): WorkspaceState {
  const scope: ScopeUI = {
    title: rawJson.scope.title,
    description: rawJson.scope.description,
    businessCriticality: rawJson.scope.business_criticality,
    dataSensitivity: rawJson.scope.data_sensitivity,
    exposure: rawJson.scope.exposure,
    tier: rawJson.scope.tier,
  }

  const trustZones: TrustZoneUI[] = rawJson.trust_zones.map((tz) => ({
    symbolicName: tz.symbolic_name,
    title: tz.title,
    description: tz.description,
  }))

  const trustBoundaries: TrustBoundaryUI[] = rawJson.trust_boundaries.map(
    (tb) => ({
      trustZoneA: tb.trust_zone_a,
      trustZoneB: tb.trust_zone_b,
      accessControlMethods: tb.access_control_methods ?? [],
      authenticationMethods: tb.authentication_methods ?? [],
    })
  )

  // Unified components: actors + components + data_stores
  const actorComponents: ComponentUI[] = rawJson.actors.map((actor) => ({
    symbolicName: actor.symbolic_name,
    title: actor.title,
    description: actor.description,
    category: "actor" as const,
    actorType: actor.type,
    trustZone: actor.trust_zone ?? "",
  }))

  const regularComponents: ComponentUI[] = rawJson.components.map((comp) => ({
    symbolicName: comp.symbolic_name,
    title: comp.title,
    description: comp.description,
    category: "component" as const,
    trustZone: comp.trust_zone,
    parentComponent: comp.parent_component,
  }))

  const dataStoreComponents: ComponentUI[] = rawJson.data_stores.map((ds) => ({
    symbolicName: ds.symbolic_name,
    title: ds.title,
    description: ds.description,
    category: "dataStore" as const,
    dataStoreType: ds.type,
    trustZone: ds.trust_zone ?? "",
  }))

  const allComponents = [
    ...actorComponents,
    ...regularComponents,
    ...dataStoreComponents,
  ]

  const dataFlows: DataFlowUI[] = rawJson.data_flows.map((df) => ({
    symbolicName: df.symbolic_name,
    title: df.title,
    description: df.description,
    source: { type: df.source.type, name: df.source.object },
    destination: { type: df.destination.type, name: df.destination.object },
    hasSensitiveData: df.has_sensitive_data,
    encrypted: df.encrypted,
  }))

  const threatPersonas: ThreatPersonaUI[] = (
    rawJson.threat_personas ?? []
  ).map((tp) => ({
    symbolicName: tp.symbolic_name,
    title: tp.title,
    description: tp.description,
    isPerson: tp.is_person,
    skillLevel: tp.skill_level,
    maliciousIntent: tp.malicious_intent,
    applicabilityToOrg: tp.applicability_to_org,
  }))

  // Parse controls first (needed for threat status derivation)
  const controls: ControlUI[] = (rawJson.controls ?? []).map((ctrl) => ({
    symbolicName: ctrl.symbolic_name,
    title: ctrl.title,
    description: ctrl.description,
    threats: ctrl.threats,
    status: ctrl.status,
    priority: ctrl.priority,
    trustBoundary: ctrl.trust_boundary
      ? {
          trustZoneA: ctrl.trust_boundary.trust_zone_a,
          trustZoneB: ctrl.trust_boundary.trust_zone_b,
        }
      : undefined,
  }))

  // Expand threats: one ThreatInstanceUI per component affected
  const threats: ThreatInstanceUI[] = (rawJson.threats ?? []).flatMap(
    (threat) => {
      const componentsAffected = threat.components_affected ?? []
      if (componentsAffected.length === 0) {
        // Threat with no specific components — create a single instance
        return [
          {
            id: threat.symbolic_name,
            symbolicName: threat.symbolic_name,
            title: threat.title,
            description: threat.description,
            componentAffected: "",
            threatPersona: threat.threat_persona,
            event: threat.event,
            sources: threat.sources,
            attackMechanisms: threat.attack_mechanisms ?? [],
            weaknesses: threat.weaknesses ?? [],
            dismissed: false,
            status: deriveThreatStatus(threat.symbolic_name, controls),
            likelihood: null,
            impact: null,
            inherentScore: null,
            residualScore: null,
            riskLevel: null,
          },
        ]
      }

      return componentsAffected.map((componentName) => ({
        id: `${threat.symbolic_name}::${componentName}`,
        symbolicName: threat.symbolic_name,
        title: threat.title,
        description: threat.description,
        componentAffected: componentName,
        threatPersona: threat.threat_persona,
        event: threat.event,
        sources: threat.sources,
        attackMechanisms: threat.attack_mechanisms ?? [],
        weaknesses: threat.weaknesses ?? [],
        dismissed: false,
        status: deriveThreatStatus(threat.symbolic_name, controls),
        likelihood: null,
        impact: null,
        inherentScore: null,
        residualScore: null,
        riskLevel: null,
      }))
    }
  )

  const risks: RiskUI[] = (rawJson.risks ?? []).map((risk) => ({
    symbolicName: risk.symbolic_name,
    title: risk.title,
    description: risk.description,
    threats: risk.threats,
    likelihood: risk.likelihood,
    impact: risk.impact,
    impactDescription: risk.impact_description,
    score: risk.score,
    level: risk.level,
  }))

  const dataSets: DataSetUI[] = (rawJson.data_sets ?? []).map((ds) => ({
    symbolicName: ds.symbolic_name,
    title: ds.title,
    description: ds.description,
    placements: (ds.placements ?? []).map((p) => ({
      dataStore: p.data_store,
      encrypted: p.encrypted,
    })),
    dataSensitivity: ds.data_sensitivity ?? [],
    accessControlMethods: ds.access_control_methods ?? [],
    recordCount: ds.record_count ?? null,
  }))

  const assumptions: AssumptionUI[] = (rawJson.assumptions ?? []).map(
    (assumption) => ({
      description: assumption.description,
      topics: assumption.topics ?? [],
      validity: assumption.validity,
    })
  )

  return {
    loaded: true,
    fileName,
    version: rawJson.version,
    description: rawJson.description ?? "",
    frozen: rawJson.frozen ?? false,
    reviewedAt: rawJson.reviewed_at ?? null,
    repoLink: rawJson.repo_link ?? null,
    releaseDocsLink: rawJson.release_docs_link ?? null,
    scope,
    trustZones,
    trustBoundaries,
    components: allComponents,
    dataFlows,
    dataSets,
    threatPersonas,
    threats,
    controls,
    risks,
    assumptions,
    selectedComponentId: null,
    selectedThreatId: null,
  }
}

export function validateTmBomFile(
  json: unknown
): { valid: true; data: TmBomFile } | { valid: false; errors: string[] } {
  const errors: string[] = []

  if (typeof json !== "object" || json === null) {
    return { valid: false, errors: ["File is not a valid JSON object"] }
  }

  const obj = json as Record<string, unknown>

  if (!obj.scope) errors.push("Missing required field: scope")
  if (!obj.version) errors.push("Missing required field: version")
  if (!obj.trust_zones) errors.push("Missing required field: trust_zones")
  if (!obj.trust_boundaries)
    errors.push("Missing required field: trust_boundaries")
  if (!obj.actors) errors.push("Missing required field: actors")
  if (!obj.components) errors.push("Missing required field: components")
  if (!obj.data_stores) errors.push("Missing required field: data_stores")
  if (!obj.data_flows) errors.push("Missing required field: data_flows")

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: json as TmBomFile }
}

export interface TmBomPreviewStats {
  trustZones: number
  trustBoundaries: number
  actors: number
  components: number
  dataStores: number
  dataFlows: number
  threats: number
  controls: number
  risks: number
  assumptions: number
  threatPersonas: number
}

export function getPreviewStats(data: TmBomFile): TmBomPreviewStats {
  return {
    trustZones: data.trust_zones.length,
    trustBoundaries: data.trust_boundaries.length,
    actors: data.actors.length,
    components: data.components.length,
    dataStores: data.data_stores.length,
    dataFlows: data.data_flows.length,
    threats: data.threats?.length ?? 0,
    controls: data.controls?.length ?? 0,
    risks: data.risks?.length ?? 0,
    assumptions: data.assumptions?.length ?? 0,
    threatPersonas: data.threat_personas?.length ?? 0,
  }
}
