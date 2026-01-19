/**
 * Shared domain types - single source of truth for enum values and common types.
 * These types match backend TextChoices exactly.
 */

// STRIDE Categories - matches backend ThreatLibrary.STRIDECategory
export type STRIDECategory =
  | 'spoofing'
  | 'tampering'
  | 'repudiation'
  | 'informationDisclosure'
  | 'denialOfService'
  | 'elevationOfPrivilege'

export const STRIDE_CATEGORIES: { value: STRIDECategory; label: string }[] = [
  { value: 'spoofing', label: 'Spoofing' },
  { value: 'tampering', label: 'Tampering' },
  { value: 'repudiation', label: 'Repudiation' },
  { value: 'informationDisclosure', label: 'Information Disclosure' },
  { value: 'denialOfService', label: 'Denial of Service' },
  { value: 'elevationOfPrivilege', label: 'Elevation of Privilege' },
]

// Threat Model Status - matches backend ThreatModel.Status
export type ThreatModelStatus = 'draft' | 'inProgress' | 'pendingReview' | 'approved' | 'archived'

export const THREAT_MODEL_STATUSES: { value: ThreatModelStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'pendingReview', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
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

// Trust Boundary Types
export type TrustBoundaryType = 'zoneInternet' | 'zoneDmz' | 'zoneInternal' | 'zoneRestricted'

export interface TrustBoundaryConfig {
  label: string
  icon: string
  color: string
  borderColor: string
  description: string
}

export const TRUST_BOUNDARY_TYPE_CONFIG: Record<TrustBoundaryType, TrustBoundaryConfig> = {
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

// Trust Boundary Zone Types - Conceptual zone names for the Name dropdown
export type TrustBoundaryZoneType = 'internal' | 'external' | 'dmz' | 'partner'

export const TRUST_BOUNDARY_ZONE_TYPES: { value: TrustBoundaryZoneType; label: string; description: string }[] = [
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
export type DiagramNodeType = 'process' | 'datastore' | 'actor' | 'externalSystem' | 'trustBoundary' | 'systemScope'
