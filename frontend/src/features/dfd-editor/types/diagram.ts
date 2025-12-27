import type { Node, Edge } from '@xyflow/react'

// Node Types
export type DiagramNodeType =
  | 'process'
  | 'datastore'
  | 'actor'
  | 'trustBoundary'
  | 'systemBoundary'

// Trust Levels for Trust Boundaries (legacy, kept for backward compatibility)
export type TrustLevel =
  | 'internet'
  | 'trusted_partner'
  | 'private_secured'
  | 'internal'

export const TRUST_LEVEL_CONFIG: Record<
  TrustLevel,
  { label: string; color: string; borderColor: string }
> = {
  internet: { label: 'Internet/Public', color: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
  trusted_partner: { label: 'Trusted Partner', color: 'rgba(234, 179, 8, 0.1)', borderColor: '#eab308' },
  private_secured: { label: 'Private/Secured', color: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  internal: { label: 'Internal', color: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' },
}

// Trust Boundary Types - Zone demarcations only
export type TrustBoundaryType =
  | 'zone_internet'
  | 'zone_dmz'
  | 'zone_internal'
  | 'zone_restricted'

// Trust Boundary Zone Types - Conceptual zone names for the Name dropdown
export type TrustBoundaryZoneType =
  | 'internal'
  | 'external'
  | 'dmz'
  | 'partner'

export const TRUST_BOUNDARY_ZONE_TYPES: { value: TrustBoundaryZoneType; label: string; description: string }[] = [
  { value: 'internal', label: 'Internal', description: 'Trusted internal network or zone' },
  { value: 'external', label: 'External', description: 'Untrusted external network (internet-facing)' },
  { value: 'dmz', label: 'DMZ', description: 'Demilitarized zone between trusted and untrusted networks' },
  { value: 'partner', label: 'Partner Network', description: 'Semi-trusted partner or third-party network' },
]

export interface TrustBoundaryConfig {
  label: string
  icon: string
  color: string
  borderColor: string
  description: string
}

export const TRUST_BOUNDARY_TYPE_CONFIG: Record<TrustBoundaryType, TrustBoundaryConfig> = {
  zone_internet: {
    label: 'Internet/Public Zone',
    icon: 'globe',
    color: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    description: 'Untrusted external network',
  },
  zone_dmz: {
    label: 'DMZ',
    icon: 'shield-half',
    color: 'rgba(249, 115, 22, 0.1)',
    borderColor: '#f97316',
    description: 'Demilitarized zone between external and internal networks',
  },
  zone_internal: {
    label: 'Internal Network',
    icon: 'building',
    color: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
    description: 'Trusted internal network',
  },
  zone_restricted: {
    label: 'Restricted Zone',
    icon: 'lock',
    color: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8b5cf6',
    description: 'Highly restricted, sensitive systems',
  },
}

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

export const DATA_SENSITIVITY_CONFIG: Record<
  DataSensitivity,
  { label: string; color: string }
> = {
  public: { label: 'Public', color: '#22c55e' },
  internal: { label: 'Internal', color: '#eab308' },
  confidential: { label: 'Confidential', color: '#ef4444' },
}

// Node Data Types
export interface BaseNodeData {
  label: string
  description?: string
  isNewlyInserted?: boolean
  lockAnimationKey?: number     // Timestamp to trigger lock animation (child locked into parent)
  receiveChildAnimationKey?: number  // Timestamp to trigger animation (boundary received a child)
  [key: string]: unknown  // Required for React Flow's Node<T> constraint
}

export interface ProcessNodeData extends BaseNodeData {
  technology?: string
  dataSensitivity?: DataSensitivity
}

export interface DataStoreNodeData extends BaseNodeData {
  technology?: string
  dataSensitivity?: DataSensitivity
}

export interface ActorNodeData extends BaseNodeData {
  actorType?: 'user' | 'system' | 'external'
}

export interface TrustBoundaryNodeData extends BaseNodeData {
  // Zone type for the trust boundary
  boundaryType?: TrustBoundaryType
  // Legacy trust level (kept for backward compatibility)
  trustLevel?: TrustLevel
  // Technology implementing this zone (e.g., AWS VPC, Azure VNet)
  technology?: string
}

export interface SystemBoundaryNodeData extends BaseNodeData {
  owner?: string
  classification?: string
}

// Union type for all node data
export type DiagramNodeData =
  | ProcessNodeData
  | DataStoreNodeData
  | ActorNodeData
  | TrustBoundaryNodeData
  | SystemBoundaryNodeData

// Edge Data
export interface DataFlowEdgeData {
  label?: string
  protocol?: Protocol
  dataClassification?: DataClassification[]
  encrypted?: boolean
  authenticated?: boolean
  isNewlyInserted?: boolean
  // Trust boundary crossing
  crossesBoundaryId?: string           // ID of the boundary this flow crosses
  crossesBoundaryLabel?: string        // Label of the boundary (for display)
  crossesBoundaryType?: TrustBoundaryType  // Type of the boundary
  crossesBoundaryIds?: string[]        // For flows crossing multiple boundaries
  [key: string]: unknown  // Required for React Flow's Edge<T> constraint
}

// Type aliases for React Flow nodes/edges with our data
export type DiagramNode = Node<DiagramNodeData, DiagramNodeType>
export type DataFlowEdge = Edge<DataFlowEdgeData>

// Canvas data structure
export interface CanvasData {
  nodes: DiagramNode[]
  edges: DataFlowEdge[]
}

// Diagram entity (separate from ThreatModel)
// Note: Frontend uses camelCase aliases but API returns snake_case
export type DiagramTypeValue = 'context' | 'level1' | 'level2'
export type ThreatFramework = 'stride' | 'linddun' | 'cia'

export interface Diagram {
  id: string
  name: string  // title/name of the diagram
  diagram_type?: DiagramTypeValue
  canvas_data?: CanvasData
  threat_analysis_data?: Record<string, unknown>
  updated_by?: string
  updated_by_email?: string
  created_at?: string
  updated_at?: string
  // Legacy frontend fields - kept for compatibility during transition
  title?: string
  threatModelId?: string
  canvasData?: CanvasData
  createdAt?: string
  updatedAt?: string
}

export interface CreateDiagramInput {
  threatModelId: string
  title: string
  description?: string
  diagramType?: DiagramTypeValue
  threatFramework?: ThreatFramework
}

// Template types
export type TemplateCategory =
  | 'web_application'
  | 'mobile_application'
  | 'microservices'
  | 'data_pipeline'
  | 'authentication'
  | 'payment_processing'
  | 'cloud_infrastructure'
  | 'iot'
  | 'api_gateway'
  | 'other'

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'web_application', label: 'Web Application' },
  { value: 'mobile_application', label: 'Mobile Application' },
  { value: 'microservices', label: 'Microservices' },
  { value: 'data_pipeline', label: 'Data Pipeline' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'payment_processing', label: 'Payment Processing' },
  { value: 'cloud_infrastructure', label: 'Cloud Infrastructure' },
  { value: 'iot', label: 'IoT' },
  { value: 'api_gateway', label: 'API Gateway' },
  { value: 'other', label: 'Other' },
]

export interface DFDTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  templateData: CanvasData
  createdBy: string
  isPublic: boolean
  useCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateInput {
  name: string
  description?: string
  category: TemplateCategory
  tags?: string[]
  templateData: CanvasData
}

// Clipboard data for copy/paste
export interface ClipboardData {
  nodes: DiagramNode[]
  edges: DataFlowEdge[]
}

// Type guards
export function isProcessNode(node: DiagramNode): node is Node<ProcessNodeData, 'process'> {
  return node.type === 'process'
}

export function isDataStoreNode(node: DiagramNode): node is Node<DataStoreNodeData, 'datastore'> {
  return node.type === 'datastore'
}

export function isActorNode(node: DiagramNode): node is Node<ActorNodeData, 'actor'> {
  return node.type === 'actor'
}

export function isTrustBoundaryNode(node: DiagramNode): node is Node<TrustBoundaryNodeData, 'trustBoundary'> {
  return node.type === 'trustBoundary'
}

export function isSystemBoundaryNode(node: DiagramNode): node is Node<SystemBoundaryNodeData, 'systemBoundary'> {
  return node.type === 'systemBoundary'
}

export function isBoundaryNode(node: DiagramNode): boolean {
  return node.type === 'trustBoundary' || node.type === 'systemBoundary'
}
