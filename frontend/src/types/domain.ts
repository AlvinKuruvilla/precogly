/**
 * Shared domain types - single source of truth for enum values and common types.
 * These types match backend TextChoices exactly.
 */

// STRIDE Categories - kebab-case IDs matching TaxonomyEntry.external_id
export type STRIDECategory =
  | 'spoofing'
  | 'tampering'
  | 'repudiation'
  | 'information-disclosure'
  | 'denial-of-service'
  | 'elevation-of-privilege'

export const STRIDE_CATEGORIES: { value: STRIDECategory; label: string }[] = [
  { value: 'spoofing', label: 'Spoofing' },
  { value: 'tampering', label: 'Tampering' },
  { value: 'repudiation', label: 'Repudiation' },
  { value: 'information-disclosure', label: 'Information Disclosure' },
  { value: 'denial-of-service', label: 'Denial of Service' },
  { value: 'elevation-of-privilege', label: 'Elevation of Privilege' },
]

// STRIDE display configuration with colors
export const STRIDE_CONFIG: Record<
  STRIDECategory,
  { label: string; shortLabel: string; description: string; color: string }
> = {
  spoofing: {
    label: 'Spoofing',
    shortLabel: 'S',
    description: 'Pretending to be something or someone else',
    color: '#ef4444', // red
  },
  tampering: {
    label: 'Tampering',
    shortLabel: 'T',
    description: 'Modifying data or code without authorization',
    color: '#f97316', // orange
  },
  repudiation: {
    label: 'Repudiation',
    shortLabel: 'R',
    description: 'Denying having performed an action',
    color: '#eab308', // yellow
  },
  'information-disclosure': {
    label: 'Information Disclosure',
    shortLabel: 'I',
    description: 'Exposing information to unauthorized parties',
    color: '#22c55e', // green
  },
  'denial-of-service': {
    label: 'Denial of Service',
    shortLabel: 'D',
    description: 'Making a system unavailable or degraded',
    color: '#3b82f6', // blue
  },
  'elevation-of-privilege': {
    label: 'Elevation of Privilege',
    shortLabel: 'E',
    description: 'Gaining unauthorized capabilities or access',
    color: '#8b5cf6', // purple
  },
}

// Taxonomy entry from the unified taxonomy system
export interface TaxonomyEntry {
  id: number
  taxonomySlug: string
  taxonomyName: string
  externalId: string
  title: string
}

// Threat Model Status - matches backend ThreatModel.Status
export type ThreatModelStatus = 'draft' | 'inProgress' | 'pendingReview' | 'approved' | 'archived'

export const THREAT_MODEL_STATUSES: { value: ThreatModelStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'pendingReview', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
]

// Modeling Mode - matches backend ThreatModel.ModelingMode
export type ModelingMode = 'dfdBased' | 'manual' | 'hybrid'

export const MODELING_MODES: { value: ModelingMode; label: string; description: string }[] = [
  {
    value: 'dfdBased',
    label: 'DFD-Based',
    description: 'Create data flow diagrams in our editor'
  },
  {
    value: 'manual',
    label: 'Manual Entry',
    description: 'Add components and threats manually'
  },
  {
    value: 'hybrid',
    label: 'Hybrid (Both)',
    description: 'Use both approaches'
  },
]

// Installation Status - matches backend OrganizationPackInstallation.Status
export type InstallationStatus = 'installed' | 'pendingUpdate' | 'failed'

// Criticality levels
export type Criticality = 'low' | 'medium' | 'high' | 'critical'

// System types
export type SystemType = 'system' | 'process'

// Trust Levels
export type TrustLevel = 'internet' | 'trustedPartner' | 'privateSecured' | 'internal'

export const TRUST_LEVEL_CONFIG: Record<TrustLevel, { label: string; color: string; borderColor: string }> = {
  internet: { label: 'Internet/Public', color: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
  trustedPartner: { label: 'Trusted Partner', color: 'rgba(234, 179, 8, 0.1)', borderColor: '#eab308' },
  privateSecured: { label: 'Private/Secured', color: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  internal: { label: 'Internal', color: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' },
}

// Trust Zone Types
export type TrustZoneType = 'zoneInternet' | 'zoneDmz' | 'zoneInternal' | 'zoneRestricted'

export interface TrustZoneConfig {
  label: string
  icon: string
  color: string
  borderColor: string
  description: string
}

export const TRUST_ZONE_TYPE_CONFIG: Record<TrustZoneType, TrustZoneConfig> = {
  zoneInternet: {
    label: 'Internet/Public Zone',
    icon: 'globe',
    color: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    description: 'Untrusted external network',
  },
  zoneDmz: {
    label: 'DMZ',
    icon: 'shield-half',
    color: 'rgba(249, 115, 22, 0.1)',
    borderColor: '#f97316',
    description: 'Demilitarized zone between external and internal networks',
  },
  zoneInternal: {
    label: 'Internal Network',
    icon: 'building',
    color: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
    description: 'Trusted internal network',
  },
  zoneRestricted: {
    label: 'Restricted Zone',
    icon: 'lock',
    color: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8b5cf6',
    description: 'Highly restricted, sensitive systems',
  },
}

// Trust Zone Preset Names - Conceptual zone names for the Name dropdown
export type TrustZonePresetName = 'internal' | 'external' | 'dmz' | 'partner'

export const TRUST_ZONE_PRESET_NAMES: { value: TrustZonePresetName; label: string; description: string }[] = [
  { value: 'internal', label: 'Internal', description: 'Trusted internal network or zone' },
  { value: 'external', label: 'External', description: 'Untrusted external network (internet-facing)' },
  { value: 'dmz', label: 'DMZ', description: 'Demilitarized zone between trusted and untrusted networks' },
  { value: 'partner', label: 'Partner Network', description: 'Semi-trusted partner or third-party network' },
]

// Template Categories
export type TemplateCategory =
  | 'webApplication'
  | 'mobileApplication'
  | 'microservices'
  | 'dataPipeline'
  | 'authentication'
  | 'paymentProcessing'
  | 'cloudInfrastructure'
  | 'iot'
  | 'apiGateway'
  | 'other'

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'webApplication', label: 'Web Application' },
  { value: 'mobileApplication', label: 'Mobile Application' },
  { value: 'microservices', label: 'Microservices' },
  { value: 'dataPipeline', label: 'Data Pipeline' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'paymentProcessing', label: 'Payment Processing' },
  { value: 'cloudInfrastructure', label: 'Cloud Infrastructure' },
  { value: 'iot', label: 'IoT' },
  { value: 'apiGateway', label: 'API Gateway' },
  { value: 'other', label: 'Other' },
]

// Data Classification for edges
export type DataClassification =
  | 'PII'
  | 'Customer Data'
  | 'Financial'
  | 'PHI'
  | 'Confidential'
  | 'Internal'
  | 'Public'

export const DATA_CLASSIFICATIONS: DataClassification[] = [
  'PII',
  'Customer Data',
  'Financial',
  'PHI',
  'Confidential',
  'Internal',
  'Public',
]

// Protocols for data flows
export type Protocol =
  | 'HTTP'
  | 'HTTPS'
  | 'gRPC'
  | 'WebSocket'
  | 'TCP'
  | 'UDP'
  | 'MQTT'
  | 'AMQP'
  | 'SQL'
  | 'Custom'

export const PROTOCOLS: Protocol[] = [
  'HTTP',
  'HTTPS',
  'gRPC',
  'WebSocket',
  'TCP',
  'UDP',
  'MQTT',
  'AMQP',
  'SQL',
  'Custom',
]

// Data Sensitivity for nodes
export type DataSensitivity = 'public' | 'internal' | 'confidential'

export const DATA_SENSITIVITY_CONFIG: Record<DataSensitivity, { label: string; color: string }> = {
  public: { label: 'Public', color: '#22c55e' },
  internal: { label: 'Internal', color: '#eab308' },
  confidential: { label: 'Confidential', color: '#ef4444' },
}

// Diagram types
export type DiagramTypeValue = 'context' | 'level1' | 'level2'
export type ThreatFramework = 'stride' | 'linddun' | 'cia'

// Node types for DFD
// humanActor = external human entity (customer, admin, attacker)
// systemActor = external non-human system (third-party API, partner system)
export type DiagramNodeType = 'process' | 'datastore' | 'humanActor' | 'systemActor' | 'trustZone' | 'systemScope'

// Compliance/Security Standards
export type SecurityStandard =
  | 'PCI-DSS'
  | 'SOC2'
  | 'ISO27001'
  | 'NIST'
  | 'OWASP'
  | 'GDPR'
  | 'HIPAA'
  | 'DORA'
  | 'CRA'

export const SECURITY_STANDARDS: Record<SecurityStandard, { label: string; description: string }> = {
  'PCI-DSS': {
    label: 'PCI-DSS',
    description: 'Payment Card Industry Data Security Standard',
  },
  SOC2: {
    label: 'SOC 2',
    description: 'Service Organization Control 2',
  },
  ISO27001: {
    label: 'ISO 27001',
    description: 'Information Security Management System',
  },
  NIST: {
    label: 'NIST CSF',
    description: 'NIST Cybersecurity Framework',
  },
  OWASP: {
    label: 'OWASP',
    description: 'Open Web Application Security Project',
  },
  GDPR: {
    label: 'GDPR',
    description: 'General Data Protection Regulation',
  },
  HIPAA: {
    label: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act',
  },
  DORA: {
    label: 'DORA',
    description: 'Digital Operational Resilience Act',
  },
  CRA: {
    label: 'CRA',
    description: 'Cyber Resilience Act',
  },
}
