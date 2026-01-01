/**
 * LikeC4-based Model Diagram component
 * Renders architecture models using LikeC4's diagram components
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { LikeC4ModelProvider, LikeC4View } from '@likec4/diagram'
import '@likec4/diagram/styles.css'
import type { ArchitectureModel } from '../../types/model'
import { architectureToLikeC4, getDefaultViewId } from '../../lib/likec4/architecture-to-likec4'

interface LikeC4ModelDiagramProps {
  model: ArchitectureModel | null
  viewId?: string
  onViewChange?: (viewId: string) => void
  className?: string
}

export function LikeC4ModelDiagram({
  model,
  viewId,
  onViewChange,
  className = '',
}: LikeC4ModelDiagramProps) {
  const [likec4Model, setLikec4Model] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentViewId, setCurrentViewId] = useState<string>(viewId || 'default')

  // Convert architecture model to LikeC4 model
  useEffect(() => {
    if (!model) {
      setLikec4Model(null)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    architectureToLikeC4(model)
      .then((layoutedModel) => {
        if (!cancelled) {
          setLikec4Model(layoutedModel)
          // Set default view if not specified
          if (!viewId) {
            setCurrentViewId(getDefaultViewId(model))
          }
          setIsLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Failed to convert model to LikeC4:', e)
          setError(e instanceof Error ? e.message : 'Failed to layout diagram')
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [model, viewId])

  // Update view when prop changes
  useEffect(() => {
    if (viewId) {
      setCurrentViewId(viewId)
    }
  }, [viewId])

  // Handle view change
  const handleViewChange = useCallback(
    (newViewId: string) => {
      setCurrentViewId(newViewId)
      onViewChange?.(newViewId)
    },
    [onViewChange]
  )

  // Get available views
  const availableViews = useMemo(() => {
    if (!model) return []
    if (model.views.length === 0) {
      return [{ id: 'default', title: 'Default View' }]
    }
    return model.views.map((v) => ({ id: v.id, title: v.title || v.id }))
  }, [model])

  // No model state
  if (!model) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No Model</p>
          <p className="text-sm">Parse DSL to see the diagram</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Laying out diagram...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center text-red-500 p-4">
          <p className="text-lg font-medium">Layout Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // No layouted model yet
  if (!likec4Model) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">Preparing diagram...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* View selector */}
      {availableViews.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-600">View:</span>
          <select
            value={currentViewId}
            onChange={(e) => handleViewChange(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
          >
            {availableViews.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* LikeC4 Diagram */}
      <div className="flex-1 min-h-0">
        <LikeC4ModelProvider likec4model={likec4Model}>
          <LikeC4View
            viewId={currentViewId as any}
            fitView
            pannable
            zoomable
            controls
          />
        </LikeC4ModelProvider>
      </div>
    </div>
  )
}
