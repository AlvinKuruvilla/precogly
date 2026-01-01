import { useState, useCallback, useEffect } from 'react'
import {
  Save,
  FileDown,
  FileUp,
  AlertTriangle,
} from 'lucide-react'
import { DSLEditor } from '../editor'
import { ModelDiagram } from '../diagram'
import { Button } from '../ui/Button'
import { SAMPLE_DSL, saveModel } from '../../lib/api'
import type { ArchitectureModel } from '../../types/model'
import type { ParseError } from '../../lib/dsl'

interface DSLWorkspaceProps {
  initialDsl?: string
  modelId?: string
  modelName?: string
}

export function DSLWorkspace({
  initialDsl = SAMPLE_DSL,
  modelId = crypto.randomUUID(),
  modelName = 'Untitled Model',
}: DSLWorkspaceProps) {
  // Editor state
  const [dslContent, setDslContent] = useState(initialDsl)
  const [parsedModel, setParsedModel] = useState<ArchitectureModel | null>(null)
  const [parseError, setParseError] = useState<ParseError | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // UI state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)

  // Handle parse result
  const handleParse = useCallback((result: { success: boolean; model?: ArchitectureModel; error?: ParseError }) => {
    if (result.success && result.model) {
      setParsedModel(result.model)
      setParseError(null)
    } else {
      setParseError(result.error || null)
    }
    setIsDirty(true)
  }, [])

  // Save model
  const handleSave = useCallback(async () => {
    if (!parsedModel) return

    try {
      await saveModel(modelId, modelName, dslContent, parsedModel)
      setIsDirty(false)
    } catch (err) {
      console.error('Save failed:', err)
    }
  }, [modelId, modelName, dslContent, parsedModel])

  // Export DSL
  const handleExport = useCallback(() => {
    const blob = new Blob([dslContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${modelName.toLowerCase().replace(/\s+/g, '-')}.likec4`
    a.click()
    URL.revokeObjectURL(url)
  }, [dslContent, modelName])

  // Import DSL
  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.likec4,.dsl,.txt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        setDslContent(text)
      }
    }
    input.click()
  }, [])

  // Handle resize
  const handleMouseDown = useCallback(() => {
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('workspace-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        const newWidth = ((e.clientX - rect.left) / rect.width) * 100
        setLeftPanelWidth(Math.min(Math.max(newWidth, 20), 80))
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {modelName}
            {isDirty && <span className="text-gray-400 ml-1">•</span>}
          </h1>
          {parseError && (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Parse Error</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleImport}>
            <FileUp className="w-4 h-4 mr-1" />
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <FileDown className="w-4 h-4 mr-1" />
            Export
          </Button>
          <div className="w-px h-6 bg-gray-200" />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!parsedModel || !isDirty}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div id="workspace-container" className="flex flex-1 overflow-hidden">
        {/* Left panel - Editor */}
        <div
          className="flex flex-col bg-white border-r border-gray-200"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="flex items-center px-4 py-2 border-b border-gray-200 bg-gray-50">
            <span className="text-sm font-medium text-gray-700">DSL Editor</span>
          </div>
          <DSLEditor
            value={dslContent}
            onChange={setDslContent}
            onParse={handleParse}
            className="flex-1"
          />
        </div>

        {/* Resize handle */}
        <div
          className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Right panel - Diagram */}
        <div
          className="flex flex-col bg-white"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="flex items-center px-4 py-2 border-b border-gray-200 bg-gray-50">
            <span className="text-sm font-medium text-gray-700">Diagram</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ModelDiagram model={parsedModel} />
          </div>
        </div>
      </div>
    </div>
  )
}
