import { useState, useCallback } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { EmptyState } from "@/components/EmptyState"
import { ImportUpload } from "@/components/ImportUpload"
import { WorkspaceHeader } from "@/components/WorkspaceHeader"
import { ExportToast } from "@/components/ExportToast"
import { ThreatAnalysisView } from "@/components/threat-analysis/ThreatAnalysisView"
import {
  validateTmBomFile,
  parseTmBomFile,
  getPreviewStats,
  type TmBomPreviewStats,
} from "@/lib/tmbom-parser"
import type { TmBomFile } from "@/types/tmbom"
import { useWorkspaceState } from "@/hooks/useWorkspaceState"

export default function App() {
  const {
    state,
    importFile,
    selectComponent,
    selectThreat,
    addThreat,
    addControl,
    changeControlStatus,
    changeControlPriority,
    dismissThreat,
    restoreThreat,
    setThreatRisk,
    reset,
  } = useWorkspaceState()

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [pendingFileName, setPendingFileName] = useState("")
  const [pendingData, setPendingData] = useState<TmBomFile | null>(null)
  const [previewStats, setPreviewStats] = useState<TmBomPreviewStats | null>(
    null
  )
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const handleFileSelected = useCallback(async (file: File) => {
    setPendingFileName(file.name)
    setPreviewStats(null)
    setValidationErrors([])

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const validationResult = validateTmBomFile(json)
      if (!validationResult.valid) {
        setValidationErrors(validationResult.errors)
        setPendingData(null)
        setPreviewStats(null)
        setImportDialogOpen(true)
        return
      }

      setPendingData(validationResult.data)
      setPreviewStats(getPreviewStats(validationResult.data))
      setValidationErrors([])
      setImportDialogOpen(true)
    } catch {
      setValidationErrors(["Failed to parse JSON file"])
      setPendingData(null)
      setPreviewStats(null)
      setImportDialogOpen(true)
    }
  }, [])

  const handleImport = useCallback(() => {
    if (!pendingData) return
    const workspaceState = parseTmBomFile(pendingData, pendingFileName)
    importFile(workspaceState)
    setImportDialogOpen(false)
    setPendingData(null)
    setPreviewStats(null)
  }, [pendingData, pendingFileName, importFile])

  const handleBack = useCallback(() => {
    reset()
  }, [reset])

  if (!state.loaded) {
    return (
      <TooltipProvider>
        <EmptyState onFileSelected={handleFileSelected} />
        <ImportUpload
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          fileName={pendingFileName}
          stats={previewStats}
          validationErrors={validationErrors}
          onImport={handleImport}
        />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col">
        <WorkspaceHeader
          scope={state.scope}
          version={state.version}
          description={state.description}
          frozen={state.frozen}
          reviewedAt={state.reviewedAt}
          repoLink={state.repoLink}
          releaseDocsLink={state.releaseDocsLink}
          onBack={handleBack}
          onImport={() => setImportDialogOpen(true)}
          onExport={() => setExportDialogOpen(true)}
        />

        <ThreatAnalysisView
          state={state}
          onSelectComponent={selectComponent}
          onSelectThreat={selectThreat}
          onAddThreat={addThreat}
          onAddControl={addControl}
          onDismissThreat={dismissThreat}
          onRestoreThreat={restoreThreat}
          onChangeControlStatus={changeControlStatus}
          onChangeControlPriority={changeControlPriority}
          onSetThreatRisk={setThreatRisk}
        />

        <ImportUpload
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          fileName={pendingFileName}
          stats={previewStats}
          validationErrors={validationErrors}
          onImport={handleImport}
        />

        <ExportToast
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          state={state}
        />
      </div>
    </TooltipProvider>
  )
}
