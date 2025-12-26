import { useState } from 'react'
import {
  Github,
  ExternalLink,
  FileText,
  Cloud,
  Package,
  Lock,
  Unlock,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { SystemContext } from '@/features/dfd-editor/types/threat-analysis'

interface SystemContextModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  systemContext: SystemContext
  onSave: (context: SystemContext) => void
}

export function SystemContextModal({
  open,
  onOpenChange,
  systemContext,
  onSave,
}: SystemContextModalProps) {
  const [description, setDescription] = useState(systemContext.description || '')
  const [scopeLocked, setScopeLocked] = useState(systemContext.scopeLocked)

  const handleSave = () => {
    onSave({
      ...systemContext,
      description,
      scopeLocked,
      scopeLockedAt: scopeLocked ? new Date().toISOString() : undefined,
    })
    onOpenChange(false)
  }

  const handleLockScope = () => {
    setScopeLocked(true)
  }

  const handleUnlockScope = () => {
    setScopeLocked(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>View / Manage System Context</DialogTitle>
          <DialogDescription>
            Define the system context for this threat model. You can connect to external sources
            or manually describe the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Integration buttons - Row 1 */}
          <div className="grid grid-cols-4 gap-3">
            <IntegrationButton
              icon={FileText}
              label="Define Assets"
              onClick={() => {}}
              disabled={scopeLocked}
            />
            <IntegrationButton
              icon={FileText}
              label="Define Out of Scope Items"
              onClick={() => {}}
              disabled={scopeLocked}
            />
            <IntegrationButton
              icon={Cloud}
              label="Connect to CSPM"
              onClick={() => {}}
              disabled={scopeLocked}
            />
            <IntegrationButton
              icon={Package}
              label="Connect to SCA (SBOM)"
              onClick={() => {}}
              disabled={scopeLocked}
            />
          </div>

          {/* Integration buttons - Row 2 */}
          <div className="grid grid-cols-4 gap-3">
            <IntegrationButton
              icon={Github}
              label="Connect to GitHub"
              onClick={() => {}}
              disabled={scopeLocked}
            />
            <IntegrationButton
              icon={ExternalLink}
              label="Connect to Jira"
              onClick={() => {}}
              disabled={scopeLocked}
            />
            <IntegrationButton
              icon={Upload}
              label="Upload PRD"
              onClick={() => {}}
              disabled={scopeLocked}
            />
            <IntegrationButton
              icon={Upload}
              label="Upload Terraform / IaC"
              onClick={() => {}}
              disabled={scopeLocked}
            />
          </div>

          {/* Manual description */}
          <div className="space-y-2">
            <Textarea
              placeholder="Or simply type out the system description ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              disabled={scopeLocked}
              className={cn(scopeLocked && 'opacity-60')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {/* Lock/Unlock Scope */}
            <div className="flex items-center gap-3">
              {scopeLocked ? (
                <Button
                  variant="outline"
                  onClick={handleUnlockScope}
                  className="gap-2"
                >
                  <Unlock className="h-4 w-4" />
                  Unlock Scope
                </Button>
              ) : (
                <Button
                  onClick={handleLockScope}
                  className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Lock className="h-4 w-4" />
                  Lock Scope
                </Button>
              )}
              <span className="text-xs text-muted-foreground max-w-[300px]">
                {scopeLocked
                  ? 'Scope is locked. Threats and controls remain editable.'
                  : 'Locks system context; threats and controls remain editable; you can unlock scope any time'}
              </span>
            </div>

            {/* Submit */}
            <Button onClick={handleSave}>Submit</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function IntegrationButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      variant="outline"
      className={cn(
        'h-auto py-3 px-4 flex flex-col items-center gap-2 text-center',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs leading-tight">{label}</span>
    </Button>
  )
}
