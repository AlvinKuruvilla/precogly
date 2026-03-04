import { useState, useEffect } from 'react'
import {
  FileText,
  Lock,
  Unlock,
  ShieldX,
  Package,
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
import { useThreatModel, useUpdateThreatModel } from '@/api/threat-models'
import { useDataAssets } from '@/api/data-assets'
import { useOutOfScopeItems } from '@/api/out-of-scope-items'
import { AssetsModal } from './AssetsModal'
import { OutOfScopeModal } from './OutOfScopeModal'
import type { ThreatModel } from '@/types'

type ActiveView = 'assets' | 'out-of-scope' | 'describe'

interface SystemContextModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
}

export function SystemContextModal({
  open,
  onOpenChange,
  threatModelId,
}: SystemContextModalProps) {
  const { data: threatModel } = useThreatModel(threatModelId)
  const { data: assets = [] } = useDataAssets(threatModelId)
  const { data: outOfScopeItems = [] } = useOutOfScopeItems(threatModelId)
  const updateThreatModelMutation = useUpdateThreatModel()

  const [description, setDescription] = useState('')
  const [scopeLocked, setScopeLocked] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('describe')

  // Sub-modal states
  const [assetsModalOpen, setAssetsModalOpen] = useState(false)
  const [outOfScopeModalOpen, setOutOfScopeModalOpen] = useState(false)

  // Sync state when threatModel data changes
  useEffect(() => {
    if (threatModel) {
      setDescription(threatModel.description || '')
      setScopeLocked(threatModel.scopeLocked ?? false)
    }
  }, [threatModel])

  const handleSave = () => {
    updateThreatModelMutation.mutate({
      id: threatModelId,
      data: {
        description,
        scopeLocked,
        scopeLockedAt: scopeLocked ? new Date().toISOString() : null,
      } as Partial<ThreatModel>,
    })
    onOpenChange(false)
  }

  const handleLockScope = () => {
    setScopeLocked(true)
  }

  const handleUnlockScope = () => {
    setScopeLocked(false)
  }

  const handleAssetsClick = () => {
    setActiveView('assets')
    setAssetsModalOpen(true)
  }

  const handleOutOfScopeClick = () => {
    setActiveView('out-of-scope')
    setOutOfScopeModalOpen(true)
  }

  const handleDescribeClick = () => {
    setActiveView('describe')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View / Manage System Context</DialogTitle>
            <DialogDescription>
              Define the system context for this threat model.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Context buttons */}
            <div className="grid grid-cols-3 gap-3">
              <ContextButton
                icon={Package}
                label="Define Assets"
                count={assets.length}
                onClick={handleAssetsClick}
                disabled={scopeLocked}
                active={activeView === 'assets'}
              />
              <ContextButton
                icon={ShieldX}
                label="Out of Scope"
                count={outOfScopeItems.length}
                onClick={handleOutOfScopeClick}
                disabled={scopeLocked}
                active={activeView === 'out-of-scope'}
              />
              <ContextButton
                icon={FileText}
                label="Describe System"
                onClick={handleDescribeClick}
                disabled={scopeLocked}
                active={activeView === 'describe'}
              />
            </div>

            {/* System description textarea - only shown when describe view is active */}
            {activeView === 'describe' && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Type out the system description ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  disabled={scopeLocked}
                  className={cn(scopeLocked && 'opacity-60')}
                />
              </div>
            )}

            {/* Summary when assets view is active */}
            {activeView === 'assets' && (
              <div className="border rounded-md p-4 bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  {assets.length === 0 ? (
                    'No assets defined. Click the button above to add assets.'
                  ) : (
                    <>
                      <span className="font-medium">{assets.length}</span> asset{assets.length !== 1 ? 's' : ''} defined.
                      Click the button above to manage assets.
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Summary when out-of-scope view is active */}
            {activeView === 'out-of-scope' && (
              <div className="border rounded-md p-4 bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  {outOfScopeItems.length === 0 ? (
                    'No out of scope items defined. Click the button above to add items.'
                  ) : (
                    <>
                      <span className="font-medium">{outOfScopeItems.length}</span> item{outOfScopeItems.length !== 1 ? 's' : ''} marked out of scope.
                      Click the button above to manage items.
                    </>
                  )}
                </div>
              </div>
            )}

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

      {/* Sub-modals */}
      <AssetsModal
        open={assetsModalOpen}
        onOpenChange={setAssetsModalOpen}
        threatModelId={threatModelId}
        disabled={scopeLocked}
      />

      <OutOfScopeModal
        open={outOfScopeModalOpen}
        onOpenChange={setOutOfScopeModalOpen}
        threatModelId={threatModelId}
        disabled={scopeLocked}
      />
    </>
  )
}

function ContextButton({
  icon: Icon,
  label,
  count,
  onClick,
  disabled,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <Button
      variant="outline"
      className={cn(
        'h-auto py-3 px-4 flex flex-col items-center gap-2 text-center relative',
        disabled && 'opacity-50 cursor-not-allowed',
        active && 'border-amber-500 border-2 bg-amber-50'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs leading-tight">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </Button>
  )
}
