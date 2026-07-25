import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText, FolderOpen, Pencil, ArrowLeft, ImageDown, Settings2, Save, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useGuestEditor } from '../context/GuestEditorContext'
import { serializeGuestToCycloneDx, deserializeCycloneDxToGuest } from '../lib/cyclonedx-guest'
import {
  supportsFileSystemAccess,
  pickFileToSave,
  pickFileToOpen,
  writeToHandle,
  downloadAsFallback,
  openFileViaInput,
} from '../lib/file-system-access'
import { exportGuestWordDoc } from '../lib/guestWordExport'
import { GuestSystemContextModal } from './GuestSystemContextModal'

function titleToFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase() || 'diagram'
}

interface GuestEditorHeaderProps {
  title: string
  onTitleChange: (title: string) => void
  hasUnsavedChanges: boolean
  onMarkSaved: () => void
  onLoadFromFile: (data: { title: string; nodes: import('@/features/dfd-editor/types').DiagramNode[]; edges: import('@/features/dfd-editor/types').DiagramEdge[]; notationStyle?: import('@/features/dfd-editor/types/notation').DFDNotationStyle; systemContext?: import('../types').GuestSystemContext }) => void
  notationStyle?: import('@/features/dfd-editor/types/notation').DFDNotationStyle
  onExportImage: (format: 'png' | 'svg') => void
  onCaptureImage: () => Promise<Uint8Array | null>
  fileHandle: FileSystemFileHandle | null
  fileName: string | null
  onFileHandleChange: (handle: FileSystemFileHandle) => void
  onFileHandleClear: () => void
}

export function GuestEditorHeader({
  title,
  onTitleChange,
  hasUnsavedChanges,
  onMarkSaved,
  onLoadFromFile,
  notationStyle,
  onExportImage,
  onCaptureImage,
  fileHandle,
  fileName,
  onFileHandleChange,
  onFileHandleClear,
}: GuestEditorHeaderProps) {
  const navigate = useNavigate()
  const guestEditor = useGuestEditor()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // System context modal state
  const [showSystemContextModal, setShowSystemContextModal] = useState(false)

  // Save dialog state (fallback for browsers without File System Access API)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveFilename, setSaveFilename] = useState('')
  const filenameInputRef = useRef<HTMLInputElement>(null)

  const handleTitleClick = useCallback(() => {
    setTitleValue(title)
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }, [title])

  const handleTitleSave = useCallback(() => {
    const trimmedTitle = titleValue.trim()
    if (trimmedTitle && trimmedTitle !== title) {
      onTitleChange(trimmedTitle)
    }
    setIsEditingTitle(false)
  }, [titleValue, title, onTitleChange])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTitleSave()
      } else if (e.key === 'Escape') {
        setIsEditingTitle(false)
      }
    },
    [handleTitleSave]
  )

  // --- Serialize current state to CycloneDX JSON ---
  const serializeContent = useCallback(() => {
    if (!guestEditor) return ''
    const threats = guestEditor.getAllThreats()
    const countermeasures = guestEditor.getAllCountermeasures()
    const systemContext = guestEditor.getSystemContext()
    return serializeGuestToCycloneDx(
      title,
      guestEditor.nodes,
      guestEditor.edges,
      threats,
      countermeasures,
      notationStyle,
      systemContext
    )
  }, [title, guestEditor, notationStyle])

  // --- Save handler ---
  const handleSave = useCallback(async () => {
    if (!guestEditor) return
    const content = serializeContent()

    if (supportsFileSystemAccess()) {
      if (fileHandle) {
        // Silent save to existing handle
        try {
          await writeToHandle(fileHandle, content)
          onMarkSaved()
        } catch {
          // Handle might be stale (file deleted externally) — clear and re-prompt
          onFileHandleClear()
          try {
            const newHandle = await pickFileToSave(`${titleToFilename(title)}.cdx.json`)
            await writeToHandle(newHandle, content)
            onFileHandleChange(newHandle)
            onMarkSaved()
          } catch (innerError) {
            // User cancelled — silently ignore AbortError
            if (innerError instanceof DOMException && innerError.name === 'AbortError') return
          }
        }
      } else {
        // No handle yet — prompt for location
        try {
          const newHandle = await pickFileToSave(`${titleToFilename(title)}.cdx.json`)
          await writeToHandle(newHandle, content)
          onFileHandleChange(newHandle)
          onMarkSaved()
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return
        }
      }
    } else {
      // Fallback: show filename dialog
      setSaveFilename(titleToFilename(title))
      setShowSaveDialog(true)
      setTimeout(() => filenameInputRef.current?.select(), 0)
    }
  }, [guestEditor, serializeContent, fileHandle, title, onMarkSaved, onFileHandleChange, onFileHandleClear])

  // --- Save As handler (always prompts for new location) ---
  const handleSaveAs = useCallback(async () => {
    if (!guestEditor) return
    const content = serializeContent()

    if (supportsFileSystemAccess()) {
      try {
        const newHandle = await pickFileToSave(`${titleToFilename(title)}.cdx.json`)
        await writeToHandle(newHandle, content)
        onFileHandleChange(newHandle)
        onMarkSaved()
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    } else {
      setSaveFilename(titleToFilename(title))
      setShowSaveDialog(true)
      setTimeout(() => filenameInputRef.current?.select(), 0)
    }
  }, [guestEditor, serializeContent, title, onMarkSaved, onFileHandleChange])

  // --- Fallback save dialog confirm ---
  const handleConfirmSave = useCallback(() => {
    const content = serializeContent()
    const filename = saveFilename.trim() || titleToFilename(title)
    downloadAsFallback(filename, content)
    onMarkSaved()
    setShowSaveDialog(false)
  }, [saveFilename, title, serializeContent, onMarkSaved])

  // --- Open handler ---
  const handleOpen = useCallback(async () => {
    try {
      let content: string
      let handle: FileSystemFileHandle | null = null

      if (supportsFileSystemAccess()) {
        const result = await pickFileToOpen()
        content = result.content
        handle = result.handle
      } else {
        content = await openFileViaInput()
      }

      const data = deserializeCycloneDxToGuest(content)
      onLoadFromFile({
        title: data.title,
        nodes: data.nodes,
        edges: data.edges,
        notationStyle: data.notationStyle,
        systemContext: data.systemContext,
      })
      if (guestEditor) {
        guestEditor.loadThreats(data.threats)
        guestEditor.loadCountermeasures(data.countermeasures)
        if (data.systemContext) {
          guestEditor.loadSystemContext(data.systemContext)
        }
      }

      if (handle) {
        onFileHandleChange(handle)
      } else {
        onFileHandleClear()
      }
    } catch (error) {
      // User cancelled or AbortError — silently ignore
      if (error instanceof DOMException && error.name === 'AbortError') return
      // Show error for invalid files
      if (error instanceof Error && error.message) {
        alert(error.message)
      }
    }
  }, [onLoadFromFile, guestEditor, onFileHandleChange, onFileHandleClear])

  // --- Ctrl+S / Cmd+S keyboard shortcut ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const handleDownloadReport = useCallback(async () => {
    if (!guestEditor) return
    // Capture the diagram image before generating the Word doc
    const diagramImage = await onCaptureImage() ?? undefined
    await exportGuestWordDoc({
      title,
      nodes: guestEditor.nodes,
      edges: guestEditor.edges,
      threats: guestEditor.getAllThreats(),
      countermeasures: guestEditor.getAllCountermeasures(),
      diagramImage,
      systemContext: guestEditor.getSystemContext(),
    })
  }, [title, guestEditor, onCaptureImage])

  // Determine save button tooltip
  const saveTooltip = fileHandle && fileName
    ? `Save to ${fileName}`
    : 'Save as CycloneDX JSON'

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (!hasUnsavedChanges || window.confirm('Changes that you made may not be saved.')) {
                navigate('/')
              }
            }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Guest</span>
          </button>
          <div>
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="font-semibold bg-transparent border-b-2 border-primary outline-none px-0 py-0 min-w-[200px]"
                autoFocus
              />
            ) : (
              <button
                onClick={handleTitleClick}
                className="flex items-center gap-2 group text-left"
              >
                <h1 className="font-semibold">{title}</h1>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              {fileName ? fileName : 'Data Flow Diagram'}
            </p>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Unsaved</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleOpen}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open a CycloneDX JSON file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowSystemContextModal(true)}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Context
                </Button>
              </TooltipTrigger>
              <TooltipContent>Define system context, data assets, and assumptions</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download threat model report as Word document</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ImageDown className="h-4 w-4 mr-2" />
                      Export Image
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Download diagram as PNG or SVG</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExportImage('png')}>
                  Download as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportImage('svg')}>
                  Download as SVG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save button with Save As dropdown */}
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="rounded-r-none"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{saveTooltip}</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-l-none border-l border-primary-foreground/20 px-1.5"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSaveAs}>
                    <Download className="h-4 w-4 mr-2" />
                    Save As...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Save filename dialog (fallback for browsers without File System Access API) */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Diagram</DialogTitle>
            <DialogDescription>Choose a filename for your diagram.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="save-filename">Filename</Label>
            <div className="flex items-center gap-1">
              <Input
                ref={filenameInputRef}
                id="save-filename"
                value={saveFilename}
                onChange={(e) => setSaveFilename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmSave()
                }}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground shrink-0">.cdx.json</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Context modal */}
      <GuestSystemContextModal
        open={showSystemContextModal}
        onOpenChange={setShowSystemContextModal}
      />
    </>
  )
}
