/**
 * Test if we can use the @likec4/layouts package with WASM in the browser
 */
import { useEffect, useState } from 'react'
import { GraphvizWasmAdapter } from '@likec4/layouts'

export function WasmLayoutTest() {
  const [result, setResult] = useState<string>('Loading...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testWasm() {
      try {
        const adapter = new GraphvizWasmAdapter()

        // Simple test DOT graph
        const dot = `
          digraph {
            A -> B
            B -> C
          }
        `

        const svg = await adapter.svg(dot as any)
        setResult(svg)
        adapter.dispose()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }

    testWasm()
  }, [])

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600">
        <p className="font-medium">WASM Layout Error:</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <p className="font-medium mb-2">WASM Layout Test:</p>
      <div
        className="border rounded bg-white p-4"
        dangerouslySetInnerHTML={{ __html: result }}
      />
    </div>
  )
}
