// Node components
export * from './nodes'
import { ProcessNode } from './nodes/ProcessNode'
import { DataStoreNode } from './nodes/DataStoreNode'
import { ActorNode } from './nodes/ActorNode'
import { ExternalSystemNode } from './nodes/ExternalSystemNode'
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
  actor: ActorNode,
  externalSystem: ExternalSystemNode,
  trustBoundary: TrustBoundaryNode,
  systemScope: SystemScopeNode,
} as const

// Edge type registry for React Flow
export const edgeTypes = {
  dataFlow: DataFlowEdge,
} as const
