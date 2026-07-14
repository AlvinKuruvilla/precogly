import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText, FolderOpen, Pencil, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { serializeToTmLibrary, downloadTmLibraryFile, openTmLibraryFile } from '../lib/precogly-file'
import { exportGuestWordDoc } from '../lib/guestWordExport'

function titleToFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase() || 'diagram'
}

interface GuestEditorHeaderProps {
  title: string
  onTitleChange: (title: string) => void
  hasUnsavedChanges: boolean
  onMarkSaved: () => void
  onLoadFromFile: (data: { title: string; nodes: import('@/features/dfd-editor/types').DiagramNode[]; edges: import('@/features/dfd-editor/types').DiagramEdge[]; notationStyle?: import('@/features/dfd-editor/types/notation').DFDNotationStyle }) => void
  notationStyle?: import('@/features/dfd-editor/types/notation').DFDNotationStyle
}

export function GuestEditorHeader({
  title,
  onTitleChange,
  hasUnsavedChanges,
  onMarkSaved,
  onLoadFromFile,
  notationStyle,
}: GuestEditorHeaderProps) {
  const navigate = useNavigate()
  const guestEditor = useGuestEditor()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Save dialog state
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

  const handleOpenSaveDialog = useCallback(() => {
    setSaveFilename(titleToFilename(title))
    setShowSaveDialog(true)
    setTimeout(() => filenameInputRef.current?.select(), 0)
  }, [title])

  const handleConfirmSave = useCallback(() => {
    if (!guestEditor) return
    const filename = saveFilename.trim() || titleToFilename(title)
    const threats = guestEditor.getAllThreats()
    const countermeasures = guestEditor.getAllCountermeasures()
    const content = serializeToTmLibrary(
      title,
      guestEditor.nodes,
      guestEditor.edges,
      threats,
      countermeasures,
      notationStyle
    )
    downloadTmLibraryFile(filename, content)
    onMarkSaved()
    setShowSaveDialog(false)
  }, [saveFilename, title, guestEditor, onMarkSaved, notationStyle])

  const handleOpen = useCallback(async () => {
    try {
      const data = await openTmLibraryFile()
      onLoadFromFile({ title: data.title, nodes: data.nodes, edges: data.edges, notationStyle: data.notationStyle })
      if (guestEditor) {
        guestEditor.loadThreats(data.threats)
        guestEditor.loadCountermeasures(data.countermeasures)
      }
    } catch {
      // User cancelled or invalid file - silently ignore
    }
  }, [onLoadFromFile, guestEditor])

  const handleDownloadReport = useCallback(async () => {
    if (!guestEditor) return
    await exportGuestWordDoc({
      title,
      nodes: guestEditor.nodes,
      edges: guestEditor.edges,
      threats: guestEditor.getAllThreats(),
      countermeasures: guestEditor.getAllCountermeasures(),
    })
  }, [title, guestEditor])

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
              Data Flow Diagram
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
              <TooltipContent>Open a threat model JSON file</TooltipContent>
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={handleOpenSaveDialog}>
                  <Download className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download as JSON file</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Save filename dialog */}
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
              <span className="text-sm text-muted-foreground shrink-0">.json</span>
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
    </>
  )
}
