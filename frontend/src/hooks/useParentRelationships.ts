import { useCallback, useRef } from 'react'
import type { DiagramNode } from '@/types'

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface UseParentRelationshipsReturn {
  updateParentRelationships: (
    nodes: DiagramNode[],
    setNodes: React.Dispatch<React.SetStateAction<DiagramNode[]>>
  ) => void
  findParentBoundary: (
    node: DiagramNode,
    boundaries: DiagramNode[]
  ) => DiagramNode | null
}

/**
 * Gets the bounding box of a node in absolute (flow) coordinates.
 * For child nodes, converts relative position to absolute.
 */
function getAbsoluteBoundingBox(
  node: DiagramNode,
  allNodes: DiagramNode[]
): BoundingBox {
  let x = node.position.x
  let y = node.position.y

  // If node has a parent, add parent's position
  if (node.parentId) {
    const parent = allNodes.find((n) => n.id === node.parentId)
    if (parent) {
      x += parent.position.x
      y += parent.position.y
    }
  }

  // Get dimensions from style or use defaults
  const width = (node.style?.width as number) || node.measured?.width || 150
  const height = (node.style?.height as number) || node.measured?.height || 60

  return { x, y, width, height }
}

/**
 * Checks if node A is fully contained within node B
 */
function isContainedIn(nodeBox: BoundingBox, boundaryBox: BoundingBox): boolean {
  // Add some padding to make it easier to drop nodes into boundaries
  const padding = 10

  return (
    nodeBox.x >= boundaryBox.x + padding &&
    nodeBox.y >= boundaryBox.y + padding &&
    nodeBox.x + nodeBox.width <= boundaryBox.x + boundaryBox.width - padding &&
    nodeBox.y + nodeBox.height <= boundaryBox.y + boundaryBox.height - padding
  )
}

/**
 * Checks if node center is within a boundary
 */
function isCenterInBoundary(nodeBox: BoundingBox, boundaryBox: BoundingBox): boolean {
  const nodeCenterX = nodeBox.x + nodeBox.width / 2
  const nodeCenterY = nodeBox.y + nodeBox.height / 2

  return (
    nodeCenterX >= boundaryBox.x &&
    nodeCenterX <= boundaryBox.x + boundaryBox.width &&
    nodeCenterY >= boundaryBox.y &&
    nodeCenterY <= boundaryBox.y + boundaryBox.height
  )
}

export function useParentRelationships(): UseParentRelationshipsReturn {
  // Track previous parent assignments to avoid unnecessary updates
  const previousParentsRef = useRef<Map<string, string | undefined>>(new Map())

  /**
   * Find the best parent boundary for a node.
   * If multiple boundaries overlap, choose the smallest one (most specific).
   */
  const findParentBoundary = useCallback(
    (node: DiagramNode, allNodes: DiagramNode[]): DiagramNode | null => {
      // Boundaries can't have parents (for now)
      if (node.type === 'trustBoundary' || node.type === 'systemBoundary') {
        return null
      }

      const boundaries = allNodes.filter(
        (n) =>
          (n.type === 'trustBoundary' || n.type === 'systemBoundary') &&
          n.id !== node.id
      )

      if (boundaries.length === 0) return null

      const nodeBox = getAbsoluteBoundingBox(node, allNodes)
      let bestMatch: DiagramNode | null = null
      let bestArea = Infinity

      for (const boundary of boundaries) {
        const boundaryBox = getAbsoluteBoundingBox(boundary, allNodes)

        // Check if node center is in boundary (more lenient than full containment)
        if (isCenterInBoundary(nodeBox, boundaryBox)) {
          const area = boundaryBox.width * boundaryBox.height
          // Prefer smaller (more specific) boundaries
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

  /**
   * Update parent relationships for all nodes after a drag operation
   */
  const updateParentRelationships = useCallback(
    (
      nodes: DiagramNode[],
      setNodes: React.Dispatch<React.SetStateAction<DiagramNode[]>>
    ) => {
      setNodes((currentNodes) => {
        let hasChanges = false
        const newParents = new Map<string, string | undefined>()

        const updatedNodes = currentNodes.map((node) => {
          // Skip boundaries themselves
          if (node.type === 'trustBoundary' || node.type === 'systemBoundary') {
            newParents.set(node.id, undefined)
            return node
          }

          const newParent = findParentBoundary(node, currentNodes)
          const newParentId = newParent?.id

          newParents.set(node.id, newParentId)

          // Check if parent changed
          if (node.parentId !== newParentId) {
            hasChanges = true

            // Calculate new position relative to new parent (or absolute if no parent)
            let newPosition = { ...node.position }

            if (node.parentId && !newParentId) {
              // Moving out of a parent - convert to absolute position
              const oldParent = currentNodes.find((n) => n.id === node.parentId)
              if (oldParent) {
                newPosition = {
                  x: node.position.x + oldParent.position.x,
                  y: node.position.y + oldParent.position.y,
                }
              }
            } else if (!node.parentId && newParentId && newParent) {
              // Moving into a parent - convert to relative position
              newPosition = {
                x: node.position.x - newParent.position.x,
                y: node.position.y - newParent.position.y,
              }
            } else if (node.parentId && newParentId && node.parentId !== newParentId && newParent) {
              // Moving between parents - convert through absolute
              const oldParent = currentNodes.find((n) => n.id === node.parentId)
              if (oldParent) {
                const absoluteX = node.position.x + oldParent.position.x
                const absoluteY = node.position.y + oldParent.position.y
                newPosition = {
                  x: absoluteX - newParent.position.x,
                  y: absoluteY - newParent.position.y,
                }
              }
            }

            return {
              ...node,
              parentId: newParentId,
              position: newPosition,
              extent: newParentId ? 'parent' as const : undefined,
            }
          }

          return node
        })

        // Update ref for next comparison
        previousParentsRef.current = newParents

        return hasChanges ? updatedNodes : currentNodes
      })
    },
    [findParentBoundary]
  )

  return {
    updateParentRelationships,
    findParentBoundary,
  }
}
