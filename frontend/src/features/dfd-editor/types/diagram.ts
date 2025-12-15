import type { Node, Edge } from '@xyflow/react'

// Node Types
export type DiagramNodeType =
  | 'process'
  | 'datastore'
  | 'actor'
  | 'trustBoundary'
  | 'systemBoundary'

// Trust Levels for Trust Boundaries
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
  trustLevel: TrustLevel
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
export type DiagramType = 'architecture' | 'dataflow' | 'sequence' | 'deployment' | 'network'
export type ThreatFramework = 'stride' | 'linddun' | 'cia'

export interface Diagram {
  id: string
  threatModelId: string
  slug?: string
  title: string
  description?: string
  diagramType: DiagramType
  threatFramework: ThreatFramework
  canvasData: CanvasData
  orderIndex?: number
  createdAt: string
  updatedAt: string
}

export interface CreateDiagramInput {
  threatModelId: string
  title: string
  description?: string
  diagramType?: DiagramType
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
