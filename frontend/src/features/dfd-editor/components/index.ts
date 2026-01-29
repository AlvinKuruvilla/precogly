// Node components
export * from './nodes'
import { ProcessNode } from './nodes/ProcessNode'
import { DataStoreNode } from './nodes/DataStoreNode'
import { HumanActorNode } from './nodes/HumanActorNode'
import { SystemActorNode } from './nodes/SystemActorNode'
import { TrustBoundaryNode } from './nodes/TrustBoundaryNode'
import { SystemScopeNode } from './nodes/SystemScopeNode'

// Edge components
export * from './edges'
import { DataFlowEdge } from './edges/DataFlowEdge'

// Panel components
export * from './panels'

// Other components
export { DiagramToolbar } from './DiagramToolbar'
export { TemplateBrowser } from './TemplateBrowser'
export { TechnologyCombobox } from './technology-combobox'

// Node type registry for React Flow
export const nodeTypes = {
  process: ProcessNode,
  datastore: DataStoreNode,
  humanActor: HumanActorNode,
  systemActor: SystemActorNode,
  trustBoundary: TrustBoundaryNode,
  systemScope: SystemScopeNode,
} as const

// Edge type registry for React Flow
export const edgeTypes = {
  dataFlow: DataFlowEdge,
} as const
