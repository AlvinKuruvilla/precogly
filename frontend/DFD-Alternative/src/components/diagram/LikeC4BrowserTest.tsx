/**
 * Test LikeC4 in the browser with the events polyfill
 */
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Builder } from '@likec4/core/builder'
import { LikeC4ModelProvider, LikeC4View } from '@likec4/diagram'
import { layoutLikeC4Model } from '@likec4/layouts'
import '@likec4/diagram/styles.css'

export function LikeC4BrowserTest() {
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function buildAndLayoutModel() {
      try {
        // Create a simple model using the Builder API
        const computedModel = Builder
          .specification({
            elements: {
              system: {
                style: { shape: 'rectangle', color: 'blue' }
              },
              service: {
                style: { shape: 'rectangle', color: 'green' }
              }
            },
            relationships: {
              uses: {}
            }
          })
          .model(({ system, service, rel }: any, _: any) =>
            _(
              // Define app with nested children in one call
              system('app', 'My Application').with(
                service('api', 'API Service'),
                service('db', 'Database'),
                rel('app.api', 'app.db', 'stores data')
              )
            )
          )
          .views(({ view, $include }: any, _: any) =>
            _(
              view('overview', 'System Overview').with(
                $include('*')
              )
            )
          )
          .toLikeC4Model()

        // Layout the views using GraphViz WASM
        const layoutedModel = await layoutLikeC4Model(computedModel)

        setModel(layoutedModel)
        setIsLoading(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create model')
        console.error('LikeC4 model creation failed:', e)
        setIsLoading(false)
      }
    }

    buildAndLayoutModel()
  }, [])

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p className="font-medium">LikeC4 Error:</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading LikeC4...</span>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="p-4 bg-amber-50 text-amber-700 rounded-lg">
        <p className="font-medium">No Model</p>
        <p className="text-sm mt-1">Model could not be created</p>
      </div>
    )
  }

  return (
    <div className="h-[400px] border rounded-lg overflow-hidden">
      <LikeC4ModelProvider likec4model={model}>
        <LikeC4View
          viewId="overview"
          fitView
          pannable
          zoomable
        />
      </LikeC4ModelProvider>
    </div>
  )
}
