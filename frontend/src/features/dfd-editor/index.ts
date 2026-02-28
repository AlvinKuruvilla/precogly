/**
 * DFD Editor Feature
 *
 * A self-contained Data Flow Diagram editor for threat modeling.
 * Can be used standalone or integrated into larger applications.
 */

// Main editor component
export { DFDEditor } from './DFDEditor'
export { DFDEditor as default } from './DFDEditor'

// Components (explicit exports to avoid name collision with types)
export {
  nodeTypes,
  edgeTypes,
  DiagramToolbar,
  TemplateBrowser,
  TechnologyCombobox,
  ProcessNode,
  DataStoreNode,
  HumanActorNode,
  SystemActorNode,
  TrustZoneNode,
  SystemScopeNode,
  DataFlowEdge,
  TrustBoundaryEdge,
  NodeEditPanel,
  EdgeEditPanel,
  TrustBoundaryEdgeEditPanel,
} from './components'

// Hooks
export * from './hooks'

// Types (use 'export type' for type-only exports)
export type {
  DiagramNodeType,
  TrustLevel,
  DataClassification,
  Protocol,
  DataSensitivity,
  BaseNodeData,
  ProcessNodeData,
  DataStoreNodeData,
  HumanActorNodeData,
  SystemActorNodeData,
  TrustZoneNodeData,
  SystemScopeNodeData,
  DiagramNodeData,
  DataFlowEdgeData,
  TrustBoundaryEdgeData,
  DiagramNode,
  DataFlowEdge as DataFlowEdgeType,
  TrustBoundaryEdge as TrustBoundaryEdgeType,
  DiagramEdge,
  AccessControlMethod,
  AuthenticationMethod,
  CanvasData,
  DiagramTypeValue,
  ThreatFramework,
  Diagram,
  CreateDiagramInput,
  TemplateCategory,
  DFDTemplate,
  CreateTemplateInput,
  ClipboardData,
} from './types'

export {
  TRUST_LEVEL_CONFIG,
  DATA_CLASSIFICATIONS,
  PROTOCOLS,
  DATA_SENSITIVITY_CONFIG,
  TEMPLATE_CATEGORIES,
  ACCESS_CONTROL_METHODS,
  AUTHENTICATION_METHODS,
  isProcessNode,
  isDataStoreNode,
  isHumanActorNode,
  isSystemActorNode,
  isTrustZoneNode,
  isSystemScopeNode,
  isContainerNode,
  isDataFlowEdge,
  isTrustBoundaryEdge,
} from './types'

// Lib utilities
export * from './lib'
