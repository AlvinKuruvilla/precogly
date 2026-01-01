/**
 * LikeC4 Diagram Wrapper
 *
 * NOTE: The @likec4/core package uses Node.js internals (EventEmitter) which
 * aren't browser-compatible. For the MVP, we use the React Flow-based
 * ModelDiagram component instead.
 *
 * This file is kept for future integration when we have a backend service
 * that can compute LikeC4 layouts server-side.
 */
import type { ArchitectureModel } from '../../types/model'
import { ModelDiagram } from './ModelDiagram'

interface LikeC4DiagramWrapperProps {
  model: ArchitectureModel | null
  viewId?: string
  onViewChange?: (viewId: string) => void
  className?: string
}

/**
 * For now, this just wraps ModelDiagram.
 * In the future, this could:
 * 1. Send the model to a backend service for LikeC4 layout computation
 * 2. Use WebAssembly-based graphviz for layout
 * 3. Pre-compute layouts at build time
 */
export function LikeC4DiagramWrapper({
  model,
  viewId,
  onViewChange,
  className = '',
}: LikeC4DiagramWrapperProps) {
  return (
    <ModelDiagram
      model={model}
      viewId={viewId}
      onViewChange={onViewChange}
      className={className}
    />
  )
}
