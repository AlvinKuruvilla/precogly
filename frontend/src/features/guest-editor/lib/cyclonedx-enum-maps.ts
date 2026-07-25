/**
 * Enum conversion tables for CycloneDX 2.0 TM-BOM <-> Precogly guest editor mappings.
 * Port of backend's cyclonedx_enum_maps.py.
 */

// ---------------------------------------------------------------------------
// Node type <-> CycloneDX asset type
// ---------------------------------------------------------------------------

/** Maps DiagramNode.type to CycloneDX asset type string. */
export const NODE_TYPE_TO_ASSET_TYPE: Record<string, string> = {
  process: 'component',
  datastore: 'data-store',
  humanActor: 'actor',
  systemActor: 'system',
}

/** Maps CycloneDX asset type back to DiagramNode.type with sensible defaults. */
export const ASSET_TYPE_TO_NODE_TYPE: Record<string, string> = {
  component: 'process',
  process: 'process',
  function: 'process',
  container: 'process',
  service: 'process',
  subsystem: 'process',
  system: 'systemActor',
  gateway: 'process',
  api: 'process',
  device: 'process',
  infrastructure: 'process',
  model: 'process',
  'data-store': 'datastore',
  cache: 'datastore',
  queue: 'datastore',
  stream: 'datastore',
  actor: 'humanActor',
  agent: 'systemActor',
}

// ---------------------------------------------------------------------------
// Severity <-> CycloneDX risk level
// ---------------------------------------------------------------------------

export const SEVERITY_TO_CDX_RISK_LEVEL: Record<string, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
}

export const CDX_RISK_LEVEL_TO_SEVERITY: Record<string, string> = {
  none: 'low',
  info: 'low',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
}

// ---------------------------------------------------------------------------
// Control status (guest editor always exports 'recommended' for new controls)
// ---------------------------------------------------------------------------

export const CDX_STATUS_TO_CONTROL_STATUS: Record<string, string> = {
  recommended: 'gap',
  planned: 'planned',
  proposed: 'planned',
  approved: 'planned',
  'in-progress': 'in_progress',
  implemented: 'implemented',
  verified: 'verified',
  rejected: 'waived',
  decommissioned: 'decommissioned',
}
