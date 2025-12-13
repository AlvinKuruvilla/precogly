// Node types
import { ProcessNode } from './ProcessNode'
import { DataStoreNode } from './DataStoreNode'
import { ActorNode } from './ActorNode'
import { TrustBoundaryNode } from './TrustBoundaryNode'
import { SystemBoundaryNode } from './SystemBoundaryNode'

// Edge types
import { DataFlowEdge } from './DataFlowEdge'

// Panels
import { NodeEditPanel } from './NodeEditPanel'
import { EdgeEditPanel } from './EdgeEditPanel'

// Toolbar and Browser
import { DiagramToolbar } from './DiagramToolbar'
import { TemplateBrowser } from './TemplateBrowser'

// Re-export all components
export {
  ProcessNode,
  DataStoreNode,
  ActorNode,
  TrustBoundaryNode,
  SystemBoundaryNode,
  DataFlowEdge,
  NodeEditPanel,
  EdgeEditPanel,
  DiagramToolbar,
  TemplateBrowser,
}

// Node type registry for React Flow
export const nodeTypes = {
  process: ProcessNode,
  datastore: DataStoreNode,
  actor: ActorNode,
  trustBoundary: TrustBoundaryNode,
  systemBoundary: SystemBoundaryNode,
} as const

// Edge type registry for React Flow
export const edgeTypes = {
  dataFlow: DataFlowEdge,
} as const
