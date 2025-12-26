import { useState } from 'react'
import { ChevronDown, Send, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type {
  WorkspaceStatus,
  ThreatModelVersion,
} from '@/features/dfd-editor/types/threat-analysis'
import {
  WORKSPACE_STATUS_CONFIG,
  VERSION_TRIGGER_CONFIG,
} from '@/features/dfd-editor/types/threat-analysis'
import { cn } from '@/lib/utils'

interface WorkspaceHeaderProps {
  name: string
  status: WorkspaceStatus
  currentVersion: ThreatModelVersion
  previousVersions?: ThreatModelVersion[]
  onNameChange: (name: string) => void
  onStatusChange: (status: WorkspaceStatus) => void
  onSystemContextClick: () => void
  onSubmitForReview: () => void
}

export function WorkspaceHeader({
  name,
  status,
  currentVersion,
  previousVersions = [],
  onNameChange,
  onStatusChange,
  onSystemContextClick,
  onSubmitForReview,
}: WorkspaceHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(name)

  const statusConfig = WORKSPACE_STATUS_CONFIG[status]
  const triggerConfig = VERSION_TRIGGER_CONFIG[currentVersion.trigger]

  const handleNameSave = () => {
    if (editedName.trim()) {
      onNameChange(editedName.trim())
    } else {
      setEditedName(name)
    }
    setIsEditingName(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      setEditedName(name)
      setIsEditingName(false)
    }
  }

  return (
    <div className="border-b bg-background">
      <div className="px-6 py-4">
        {/* Top row: Title + System Context button */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Threat Modeling Workspace
            </div>
            {isEditingName ? (
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleKeyDown}
                className="text-xl font-semibold h-auto py-1 px-2 max-w-lg"
                autoFocus
              />
            ) : (
              <h1
                className="text-xl font-semibold cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -ml-2 inline-block"
                onClick={() => setIsEditingName(true)}
                title="Click to edit"
              >
                {name}
              </h1>
            )}
          </div>

          <Button
            variant="outline"
            onClick={onSystemContextClick}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            View / Manage System Context
          </Button>
        </div>

        {/* Bottom row: Version, Status, Submit button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Version dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                  <span className="text-sm">
                    Version {currentVersion.version}. Trigger: {triggerConfig.label}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem disabled className="font-medium">
                  Current Version
                </DropdownMenuItem>
                <DropdownMenuItem className="flex justify-between">
                  <span>Version {currentVersion.version}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {triggerConfig.label}
                  </Badge>
                </DropdownMenuItem>
                {previousVersions.length > 0 && (
                  <>
                    <DropdownMenuItem disabled className="font-medium mt-2">
                      Previous Versions
                    </DropdownMenuItem>
                    {previousVersions.map((v) => (
                      <DropdownMenuItem
                        key={v.version}
                        className="flex justify-between"
                      >
                        <span>Version {v.version}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {VERSION_TRIGGER_CONFIG[v.trigger].label}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                  <span className="text-sm">Status:</span>
                  <Badge variant="outline" className={cn('text-xs', statusConfig.bgColor)}>
                    {statusConfig.label}
                  </Badge>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(Object.keys(WORKSPACE_STATUS_CONFIG) as WorkspaceStatus[]).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className="flex items-center gap-2"
                  >
                    <Badge
                      variant="outline"
                      className={cn('text-xs', WORKSPACE_STATUS_CONFIG[s].bgColor)}
                    >
                      {WORKSPACE_STATUS_CONFIG[s].label}
                    </Badge>
                    {s === status && <span className="text-xs text-muted-foreground">(current)</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {previousVersions.length > 0 && (
              <Button variant="link" size="sm" className="h-8 px-2 text-blue-600">
                View Previous Versions
              </Button>
            )}
          </div>

          {/* Submit for Review button */}
          {status === 'draft' && (
            <Button
              onClick={onSubmitForReview}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Send className="h-4 w-4" />
              Submit Threat Model for Review
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
