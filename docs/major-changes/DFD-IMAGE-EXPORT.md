# DFD Image Export

**Date:** 2026-03-11
**Status:** Proposed

---

## Problem

The DFD editor currently has no way to export diagrams as images. Users need to share diagrams in reports, presentations, and documentation outside the application. The only option today is taking manual screenshots, which produces inconsistent results — the screenshot may clip nodes, include UI chrome (toolbar, edit panels, controls), or miss off-screen elements.

---

## Proposal

Add an "Export Image" feature to the DFD editor toolbar that captures the **entire diagram** (all nodes and edges, regardless of current viewport) and downloads it as a PNG or JPEG file.

### Library: `html-to-image@1.11.11`

This is the library recommended by React Flow's official documentation for image export.

**Critical:** Pin to version **1.11.11** exactly. Versions after 1.11.11 have a [known bug](https://github.com/bubkoo/html-to-image/issues/516) where images export as blank. The React Flow team pins to this version in their own examples.

### How It Works

React Flow renders nodes as HTML DOM elements and edges as SVG paths inside a `.react-flow__viewport` element. The `html-to-image` library serializes this DOM subtree into a raster image (PNG/JPEG).

The key technique (from React Flow's official [Download Image example](https://reactflow.dev/examples/misc/download-image)):

1. **Calculate bounding box** of all nodes using `getNodesBounds(nodes)` from `@xyflow/react`
2. **Compute a viewport transform** that fits all nodes into the target image dimensions using `getViewportForBounds(bounds, width, height, minZoom, maxZoom, padding)`
3. **Apply the transform** to the `.react-flow__viewport` element via `html-to-image`'s `style` option
4. **Render to data URL** via `toPng()` or `toJpeg()`
5. **Trigger download** via a temporary anchor element

This captures the full diagram regardless of the user's current scroll/zoom position.

---

## Implementation

### 1. Install dependency

```bash
npm install html-to-image@1.11.11
```

### 2. New utility: `exportDiagram.ts`

**File:** `frontend/src/features/dfd-editor/lib/export-diagram.ts`

```typescript
import { toPng, toJpeg } from 'html-to-image'
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import type { Node } from '@xyflow/react'

type ExportFormat = 'png' | 'jpeg'

interface ExportDiagramOptions {
  nodes: Node[]
  format: ExportFormat
  filename: string
  backgroundColor?: string
  quality?: number      // JPEG only, 0-1, default 0.95
  padding?: number      // Fraction of dimensions, default 0.1
}

function triggerDownload(dataUrl: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.setAttribute('download', filename)
  anchor.setAttribute('href', dataUrl)
  anchor.click()
}

export async function exportDiagram({
  nodes,
  format,
  filename,
  backgroundColor = '#ffffff',
  quality = 0.95,
  padding = 0.1,
}: ExportDiagramOptions): Promise<void> {
  if (nodes.length === 0) return

  const viewportElement = document.querySelector(
    '.react-flow__viewport'
  ) as HTMLElement | null
  if (!viewportElement) return

  const nodesBounds = getNodesBounds(nodes)

  // Size image to fit content with minimum dimensions
  const imageWidth = Math.max(nodesBounds.width + 200, 800)
  const imageHeight = Math.max(nodesBounds.height + 200, 600)

  const viewport = getViewportForBounds(
    nodesBounds,
    imageWidth,
    imageHeight,
    0.5,  // minZoom
    2,    // maxZoom
    padding,
  )

  const commonOptions = {
    backgroundColor,
    width: imageWidth,
    height: imageHeight,
    style: {
      width: String(imageWidth),
      height: String(imageHeight),
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  }

  const dataUrl = format === 'jpeg'
    ? await toJpeg(viewportElement, { ...commonOptions, quality })
    : await toPng(viewportElement, commonOptions)

  triggerDownload(dataUrl, filename)
}
```

### 3. Add export button to `DiagramToolbar.tsx`

Add a new "Export" button in the toolbar, after the Templates button and before the Analyze Threats button. Use a dropdown menu to offer format choices.

**New props on `DiagramToolbarProps`:**

```typescript
onExportImage: (format: 'png' | 'jpeg') => void
```

**UI addition** (after the Templates tooltip, before the Analyze Threats separator):

```tsx
import { Download } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

{/* Export Image dropdown */}
<DropdownMenu>
  <Tooltip>
    <TooltipTrigger asChild>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <p className="font-medium">Export as Image</p>
      <p className="text-xs text-muted-foreground">
        Download the diagram as PNG or JPEG
      </p>
    </TooltipContent>
  </Tooltip>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => onExportImage('png')}>
      Export as PNG
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => onExportImage('jpeg')}>
      Export as JPEG
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 4. Wire up in `DFDEditor.tsx`

In `DFDEditorContent`, add a handler that calls the utility:

```typescript
import { exportDiagram } from './lib/export-diagram'

const handleExportImage = useCallback(
  async (format: 'png' | 'jpeg') => {
    const diagramName = diagram?.name || 'diagram'
    const sanitizedName = diagramName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim()
    const extension = format === 'jpeg' ? 'jpg' : 'png'
    await exportDiagram({
      nodes,
      format,
      filename: `${sanitizedName}.${extension}`,
    })
  },
  [nodes, diagram?.name]
)
```

Pass to toolbar:

```tsx
<DiagramToolbar
  ...existingProps
  onExportImage={handleExportImage}
/>
```

### 5. Toolbar layout (final order)

```
[Human Actor] [System Actor] [Process] [Data Store] [Trust Zone] [System Scope]
  | [Draw Connection] [Trust Boundary]
  | [Templates] [Export]
  | [Analyze Threats]
```

---

## Considerations

### Edge animations
Animated edges (the moving dashes on data flows) will freeze in whatever position they're at during capture. This is cosmetically fine — the arrows and labels are all captured correctly. No special handling needed.

### Background grid
The React Flow `<Background>` grid renders inside the viewport and will appear in the export. The white `backgroundColor` option ensures the area outside the diagram bounds is filled white rather than transparent (PNG) or black (JPEG).

### UI controls excluded
By targeting `.react-flow__viewport` specifically, the React Flow `<Controls>` (zoom buttons), `<Panel>` elements (mode indicators), and the minimap are all naturally excluded from the export. The toolbar and edit panels are outside the ReactFlow component entirely, so they're also excluded.

### Filename
The exported file is named after the diagram title (sanitized for filesystem safety). For example, a diagram titled "Auth Service DFD" exports as `Auth Service DFD.png`.

### Empty diagram
If there are no nodes, the export is a no-op. The button could optionally be disabled when `nodes.length === 0`, but this is a minor polish item.

### ReadOnlyDFDViewer
The export utility works with any React Flow instance. If we later want export from `ReadOnlyDFDViewer` (e.g., in the threat model detail page), the same `exportDiagram` utility can be called from there — it just needs access to the nodes array and the `.react-flow__viewport` DOM element.

---

## Scope

### In scope
- PNG and JPEG export from the DFD editor toolbar
- Full-diagram capture (all nodes/edges, not just visible viewport)
- White background fill
- Diagram-title-based filename

### Out of scope (future considerations)
- SVG export — `html-to-image`'s `toSvg()` embeds HTML as `<foreignObject>`, producing a non-editable SVG. Not useful until React Flow ships a native SVG renderer.
- PDF export — would require an additional library (e.g., jsPDF). Can be added later by converting the PNG data URL to a PDF page.
- Export from ReadOnlyDFDViewer — straightforward to add later using the same utility.
- Resolution/scale options — the current approach sizes the image to fit the diagram content. A 2x scale multiplier for high-DPI/print use could be added as a dropdown option later.
- Server-side rendering — React Flow supports headless rendering via `@xyflow/react/headless` for server-side image generation. Not needed for this feature.

---

## Files Changed

| File | Change |
|---|---|
| `package.json` | Add `html-to-image@1.11.11` dependency |
| `frontend/src/features/dfd-editor/lib/export-diagram.ts` | **New file** — export utility |
| `frontend/src/features/dfd-editor/components/DiagramToolbar.tsx` | Add Export dropdown button, new `onExportImage` prop |
| `frontend/src/features/dfd-editor/DFDEditor.tsx` | Add `handleExportImage` handler, pass to toolbar |
