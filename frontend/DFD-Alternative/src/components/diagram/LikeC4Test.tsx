/**
 * LikeC4 integration test
 *
 * NOTE: The @likec4/core Builder API uses Node.js EventEmitter which isn't
 * browser-compatible. For browser-based diagram rendering, we continue to
 * use React Flow with our custom model converter.
 *
 * LikeC4 is best used at build time (CLI/language server) to generate
 * static diagram data that can then be rendered in the browser.
 */
export function LikeC4Test() {
  return (
    <div className="p-4 bg-amber-50 text-amber-700 rounded-lg">
      <p className="font-medium">LikeC4 Integration Note</p>
      <p className="text-sm mt-2">
        The LikeC4 Builder API uses Node.js internals (EventEmitter) which aren't
        available in browsers. For this MVP, we use React Flow for diagram rendering.
      </p>
      <p className="text-sm mt-2">
        For production, consider:
      </p>
      <ul className="text-sm mt-1 list-disc list-inside">
        <li>Using LikeC4 CLI at build time to generate diagram data</li>
        <li>Using a backend service to compute layouts</li>
        <li>Using the @likec4/layouts package with WASM (graphviz)</li>
      </ul>
    </div>
  )
}
