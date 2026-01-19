import type { Node, Edge } from '@xyflow/react'

// Re-export domain types for convenience
export {
  type DiagramNodeType,
  type TrustLevel,
  type TrustBoundaryType,
  type TrustBoundaryZoneType,
  type TrustBoundaryConfig,
  type DataClassification,
  type Protocol,
  type DataSensitivity,
  type TemplateCategory,
  type DiagramTypeValue,
  type ThreatFramework,
  TRUST_LEVEL_CONFIG,
  TRUST_BOUNDARY_TYPE_CONFIG,
  TRUST_BOUNDARY_ZONE_TYPES,
  DATA_CLASSIFICATIONS,
  PROTOCOLS,
  DATA_SENSITIVITY_CONFIG,
  TEMPLATE_CATEGORIES,
} from '@/types/domain'

import type {
  DiagramNodeType,
  TrustLevel,
  TrustBoundaryType,
  DataClassification,
  Protocol,
  DataSensitivity,
  TemplateCategory,
  DiagramTypeValue,
  ThreatFramework,
} from '@/types/domain'

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

export interface ExternalSystemNodeData extends BaseNodeData {
  systemType?: 'api' | 'legacy' | 'partner' | 'thirdParty' | 'other'
  vendor?: string
}

export interface TrustBoundaryNodeData extends BaseNodeData {
  // Zone type for the trust boundary
  boundaryType?: TrustBoundaryType
  // Legacy trust level (kept for backward compatibility)
  trustLevel?: TrustLevel
  // Technology implementing this zone (e.g., AWS VPC, Azure VNet)
  technology?: string
}

export interface SystemScopeNodeData extends BaseNodeData {
  owner?: string
  classification?: string
}

// Union type for all node data
export type DiagramNodeData =
  | ProcessNodeData
  | DataStoreNodeData
  | ActorNodeData
  | ExternalSystemNodeData
  | TrustBoundaryNodeData
  | SystemScopeNodeData

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

// Diagram entity
export interface Diagram {
  id: string
  name: string
  diagramType?: DiagramTypeValue
  canvasData?: CanvasData
  threatAnalysisData?: Record<string, unknown>
  updatedBy?: string
  updatedByEmail?: string
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

// DFD Template (local definition for editor-specific use)
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

export function isExternalSystemNode(node: DiagramNode): node is Node<ExternalSystemNodeData, 'externalSystem'> {
  return node.type === 'externalSystem'
}

export function isTrustBoundaryNode(node: DiagramNode): node is Node<TrustBoundaryNodeData, 'trustBoundary'> {
  return node.type === 'trustBoundary'
}

export function isSystemScopeNode(node: DiagramNode): node is Node<SystemScopeNodeData, 'systemScope'> {
  return node.type === 'systemScope'
}

export function isBoundaryNode(node: DiagramNode): boolean {
  return node.type === 'trustBoundary' || node.type === 'systemScope'
}
