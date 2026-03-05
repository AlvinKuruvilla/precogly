import type { DiagramNode } from '../../types'

export interface ComponentTreeNode {
  node: DiagramNode
  children: ComponentTreeNode[]
  depth: number
}

/**
 * Returns the process-type parent of a node, or null if parentId points to a
 * non-process (trustZone, systemScope) or if there is no parent.
 * Only process→process relationships count as component hierarchy.
 */
export function getProcessParent(
  node: DiagramNode,
  nodesMap: Map<string, DiagramNode>
): DiagramNode | null {
  if (!node.parentId) return null
  const parent = nodesMap.get(node.parentId)
  if (!parent || parent.type !== 'process') return null
  return parent
}

/**
 * Walks up process parents and returns [rootAncestor, ..., node] for breadcrumb display.
 * If the node has no process ancestors, returns [node] (length 1).
 */
export function getAncestryPath(
  nodeId: string,
  nodesMap: Map<string, DiagramNode>
): DiagramNode[] {
  const node = nodesMap.get(nodeId)
  if (!node) return []

  const path: DiagramNode[] = [node]
  const visited = new Set<string>([nodeId])

  let current = node
  while (true) {
    const parent = getProcessParent(current, nodesMap)
    if (!parent || visited.has(parent.id)) break
    visited.add(parent.id)
    path.unshift(parent)
    current = parent
  }

  return path
}

/**
 * Returns direct process children of a given node.
 */
export function getDirectProcessChildren(
  nodeId: string,
  allNodes: DiagramNode[]
): DiagramNode[] {
  return allNodes.filter(
    (n) => n.parentId === nodeId && n.type === 'process'
  )
}

/**
 * Builds a tree of ComponentTreeNode objects for the left panel.
 * Returns { treeRoots, flatNonProcess } — process nodes in a tree,
 * non-process nodes (datastores, actors) as a flat list.
 */
export function buildComponentTree(
  analyzableComponents: DiagramNode[],
  allNodes: DiagramNode[]
): { treeRoots: ComponentTreeNode[]; flatNonProcess: DiagramNode[] } {
  const nodesMap = new Map(allNodes.map((n) => [n.id, n]))
  const analyzableIds = new Set(analyzableComponents.map((n) => n.id))

  // Separate process nodes from non-process nodes
  const processNodes = analyzableComponents.filter((n) => n.type === 'process')
  const flatNonProcess = analyzableComponents.filter((n) => n.type !== 'process')

  // Build tree nodes map
  const treeNodeMap = new Map<string, ComponentTreeNode>()
  for (const node of processNodes) {
    treeNodeMap.set(node.id, { node, children: [], depth: 0 })
  }

  // Wire up parent-child relationships
  const treeRoots: ComponentTreeNode[] = []
  for (const node of processNodes) {
    const processParent = getProcessParent(node, nodesMap)
    if (processParent && treeNodeMap.has(processParent.id)) {
      treeNodeMap.get(processParent.id)!.children.push(treeNodeMap.get(node.id)!)
    } else {
      // Root-level process (no process parent or parent not in analyzable set)
      treeRoots.push(treeNodeMap.get(node.id)!)
    }
  }

  // Set depths via BFS
  const setDepths = (roots: ComponentTreeNode[], startDepth: number) => {
    const queue = roots.map((r) => ({ treeNode: r, depth: startDepth }))
    while (queue.length > 0) {
      const { treeNode, depth } = queue.shift()!
      treeNode.depth = depth
      for (const child of treeNode.children) {
        queue.push({ treeNode: child, depth: depth + 1 })
      }
    }
  }
  setDepths(treeRoots, 0)

  return { treeRoots, flatNonProcess }
}

/**
 * Build a nodesMap from an array of DiagramNodes.
 * Convenience helper to avoid repeating this pattern.
 */
export function buildNodesMap(nodes: DiagramNode[]): Map<string, DiagramNode> {
  return new Map(nodes.map((n) => [n.id, n]))
}
