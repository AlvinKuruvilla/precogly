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
  TrustBoundaryNode,
  SystemScopeNode,
  DataFlowEdge,
  NodeEditPanel,
  EdgeEditPanel,
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
  TrustBoundaryNodeData,
  SystemScopeNodeData,
  DiagramNodeData,
  DataFlowEdgeData,
  DiagramNode,
  DataFlowEdge as DataFlowEdgeType,
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
  isProcessNode,
  isDataStoreNode,
  isHumanActorNode,
  isSystemActorNode,
  isTrustBoundaryNode,
  isSystemScopeNode,
  isBoundaryNode,
} from './types'

// Lib utilities
export * from './lib'
