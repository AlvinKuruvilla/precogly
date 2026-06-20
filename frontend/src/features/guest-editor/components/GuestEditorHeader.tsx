import { useCallback, useRef, useState } from 'react'
import { Download, FolderOpen, Pencil, Github } from 'lucide-react'
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
import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'
import { useGuestEditor } from '../context/GuestEditorContext'
import { serializePrecoglyFile, downloadPrecoglyFile, openPrecoglyFile } from '../lib/precogly-file'
import type { PrecoglyFile } from '../types'

function titleToFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase() || 'diagram'
}

interface GuestEditorHeaderProps {
  title: string
  onTitleChange: (title: string) => void
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  hasUnsavedChanges: boolean
  onMarkSaved: () => void
  onLoadFromFile: (data: PrecoglyFile) => void
}

export function GuestEditorHeader({
  title,
  onTitleChange,
  nodes,
  edges,
  hasUnsavedChanges,
  onMarkSaved,
  onLoadFromFile,
}: GuestEditorHeaderProps) {
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
    const filename = saveFilename.trim() || titleToFilename(title)
    const threats = guestEditor?.getAllThreats() ?? []
    const content = serializePrecoglyFile(title, nodes, edges, threats)
    downloadPrecoglyFile(filename, content)
    onMarkSaved()
    setShowSaveDialog(false)
  }, [saveFilename, title, nodes, edges, guestEditor, onMarkSaved])

  const handleOpen = useCallback(async () => {
    try {
      const data = await openPrecoglyFile()
      onLoadFromFile(data)
      if (guestEditor) {
        guestEditor.loadThreats(data.threats)
      }
    } catch {
      // User cancelled or invalid file - silently ignore
    }
  }, [onLoadFromFile, guestEditor])

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Guest</span>
          </div>
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
              <TooltipContent>Open a .precogly file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={handleOpenSaveDialog}>
                  <Download className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download as .precogly file</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-6 w-px bg-border mx-1" />

          <a href="https://github.com/precogly/precogly" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </Button>
          </a>
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
              <span className="text-sm text-muted-foreground shrink-0">.precogly</span>
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
