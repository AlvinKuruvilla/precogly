import { useCallback } from 'react'
import type { DiagramNode } from '../types'

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// -----------------------------------------------------------------------------
// 1. Recursive Helper: Get True Absolute Position
// -----------------------------------------------------------------------------
function getAbsolutePosition(
  node: DiagramNode,
  nodesMap: Map<string, DiagramNode>
): { x: number; y: number } {
  let x = node.position.x
  let y = node.position.y
  let currentParentId = node.parentId

  // Traverse up the tree to sum up all offsets
  let iterations = 0
  while (currentParentId) {
    iterations++
    if (iterations > 100) break
    const parent = nodesMap.get(currentParentId)
    if (parent) {
      x += parent.position.x
      y += parent.position.y
      currentParentId = parent.parentId
    } else {
      break
    }
  }

  return { x, y }
}

function getAbsoluteBoundingBox(
  node: DiagramNode,
  nodesMap: Map<string, DiagramNode>
): BoundingBox {
  const { x, y } = getAbsolutePosition(node, nodesMap)

  // Prefer measured dimensions (actual rendered size) over style (may be stale/default)
  // This is important for resized boundaries where style might not be updated
  const width = node.measured?.width || (node.style?.width as number) || (node as any).width || 150
  const height = node.measured?.height || (node.style?.height as number) || (node as any).height || 60

  return { x, y, width, height }
}

// -----------------------------------------------------------------------------
// 2. Helper: Cycle Detection
// Prevent nesting a node into one of its own descendants
// -----------------------------------------------------------------------------
function isDescendant(
  potentialParentId: string,
  nodeId: string,
  nodesMap: Map<string, DiagramNode>
): boolean {
  let currentId: string | undefined = potentialParentId
  let iterations = 0

  while (currentId) {
    iterations++
    if (iterations > 100) return true // Assume cycle to prevent issues
    if (currentId === nodeId) return true
    const node = nodesMap.get(currentId)
    currentId = node?.parentId
  }
  return false
}

// -----------------------------------------------------------------------------
// 3. Helper: Get node depth (number of ancestors)
// -----------------------------------------------------------------------------
function getDepth(node: DiagramNode, nodesMap: Map<string, DiagramNode>): number {
  let depth = 0
  let parentId = node.parentId
  let iterations = 0

  while (parentId) {
    iterations++
    if (iterations > 100) break
    depth++
    const parent = nodesMap.get(parentId)
    parentId = parent?.parentId
  }
  return depth
}

export function useParentRelationships() {
  const findParentBoundary = useCallback(
    (node: DiagramNode, allNodes: DiagramNode[]): DiagramNode | null => {
      // Create a map for fast O(1) lookups during recursion
      const nodesMap = new Map(allNodes.map((n) => [n.id, n]))

      // Filter valid candidates (Boundaries only)
      const boundaries = allNodes.filter(
        (n) =>
          (n.type === 'trustBoundary' || n.type === 'systemBoundary') &&
          n.id !== node.id
      )

      const nodeBox = getAbsoluteBoundingBox(node, nodesMap)
      let bestMatch: DiagramNode | null = null
      let bestArea = Infinity

      for (const boundary of boundaries) {
        // Cycle Check: Skip if the boundary is actually inside the node we are dragging
        if (isDescendant(boundary.id, node.id, nodesMap)) continue

        const boundaryBox = getAbsoluteBoundingBox(boundary, nodesMap)

        // Check Intersection (Center method is good for UX)
        const nodeCenterX = nodeBox.x + nodeBox.width / 2
        const nodeCenterY = nodeBox.y + nodeBox.height / 2

        const isInside =
          nodeCenterX >= boundaryBox.x &&
          nodeCenterX <= boundaryBox.x + boundaryBox.width &&
          nodeCenterY >= boundaryBox.y &&
          nodeCenterY <= boundaryBox.y + boundaryBox.height

        if (isInside) {
          const area = boundaryBox.width * boundaryBox.height
          // Specificity: Always pick the smallest parent that fits
          if (area < bestArea) {
            bestArea = area
            bestMatch = boundary
          }
        }
      }

      return bestMatch
    },
    []
  )

  const updateParentRelationships = useCallback(
    (
      _nodes: DiagramNode[],
      setNodes: React.Dispatch<React.SetStateAction<DiagramNode[]>>
    ) => {
      setNodes((currentNodes) => {
        let hasChanges = false
        const boundariesReceivingChildren = new Set<string>()

        // Track new parent assignments to prevent circular references in same update
        const newParentAssignments = new Map<string, string | undefined>()

        // Build a live map that we update as we process nodes
        // This ensures child nodes see their parent's updated state
        const liveNodesMap = new Map(currentNodes.map((n) => [n.id, n]))

        const updatedNodes = currentNodes.map((node) => {
          // If node already has a parent, check if it should be preserved
          // Only preserve if: parent exists, is a boundary, AND child is still inside parent bounds
          if (node.parentId) {
            const currentParent = liveNodesMap.get(node.parentId)
            if (currentParent && (currentParent.type === 'trustBoundary' || currentParent.type === 'systemBoundary')) {
              const nodeBox = getAbsoluteBoundingBox(node, liveNodesMap)
              const parentBox = getAbsoluteBoundingBox(currentParent, liveNodesMap)

              const nodeCenterX = nodeBox.x + nodeBox.width / 2
              const nodeCenterY = nodeBox.y + nodeBox.height / 2

              const stillInside =
                nodeCenterX >= parentBox.x &&
                nodeCenterX <= parentBox.x + parentBox.width &&
                nodeCenterY >= parentBox.y &&
                nodeCenterY <= parentBox.y + parentBox.height

              if (stillInside) {
                // Parent still exists, is valid, and child is still inside - keep the relationship
                newParentAssignments.set(node.id, node.parentId)
                // Clear extent if it was set (to allow free dragging)
                if (node.extent) {
                  hasChanges = true
                  return { ...node, extent: undefined }
                }
                return node
              }
            }
          }

          // Use liveNodesMap (which has updated nodes) for parent detection
          const allNodesForSearch = Array.from(liveNodesMap.values())
          const newParent = findParentBoundary(node, allNodesForSearch)
          let newParentId = newParent?.id

          // Check if the potential parent is already assigned as a child of this node
          // in this same update pass (prevents A→B and B→A circular reference)
          if (newParentId && newParentAssignments.get(newParentId) === node.id) {
            newParentId = undefined // Don't assign, would create cycle
          }

          // Record this assignment for future cycle checks in same pass
          newParentAssignments.set(node.id, newParentId)

          // If nothing changed, return original reference
          if (node.parentId === newParentId) return node

          hasChanges = true

          // Track boundaries receiving new children for animation
          if (newParentId && node.parentId !== newParentId) {
            boundariesReceivingChildren.add(newParentId)
          }

          // Coordinate Transformation
          // Calculate absolute position first, then convert to relative if there's a new parent
          const absPos = getAbsolutePosition(node, liveNodesMap)
          let newPos = { x: absPos.x, y: absPos.y }

          if (newParentId && newParent) {
            const parentAbsPos = getAbsolutePosition(newParent, liveNodesMap)
            newPos = {
              x: absPos.x - parentAbsPos.x,
              y: absPos.y - parentAbsPos.y,
            }
          }

          const updatedNode = {
            ...node,
            parentId: newParentId,
            position: newPos,
            extent: undefined, // Allow free dragging, parent relationship managed by position
            data: {
              ...node.data,
              // Trigger lock animation when entering a parent
              lockAnimationKey: newParentId ? Date.now() + Math.random() : undefined,
            },
          }

          // Update liveNodesMap so subsequent nodes see this node's new state
          liveNodesMap.set(node.id, updatedNode)

          return updatedNode
        })

        if (!hasChanges) return currentNodes

        // Update boundaries that received children (for receive animation)
        const finalNodes = updatedNodes.map((node) => {
          if (
            (node.type === 'trustBoundary' || node.type === 'systemBoundary') &&
            boundariesReceivingChildren.has(node.id)
          ) {
            return {
              ...node,
              data: {
                ...node.data,
                receiveChildAnimationKey: Date.now() + Math.random(),
              },
            }
          }
          return node
        })

        // Topological Sort: Parents must be before children in the array
        // This ensures proper z-indexing and React Flow rendering order
        const updatedNodesMap = new Map(finalNodes.map((n) => [n.id, n]))

        return [...finalNodes].sort(
          (a, b) => getDepth(a, updatedNodesMap) - getDepth(b, updatedNodesMap)
        )
      })
    },
    [findParentBoundary]
  )

  return { updateParentRelationships, findParentBoundary }
}
