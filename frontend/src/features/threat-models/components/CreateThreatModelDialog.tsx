import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateThreatModel } from '@/features/threat-models/api/threat-models'
import { useWorkspace } from '@/contexts/WorkspaceContext'

interface CreateThreatModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateThreatModelDialog({ open, onOpenChange }: CreateThreatModelDialogProps) {
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const { currentTeam } = useWorkspace()
  const createMutation = useCreateThreatModel()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    createMutation.mutate(
      {
        name: name.trim(),
        owningTeam: currentTeam?.id,
      },
      {
        onSuccess: (threatModel) => {
          setName('')
          onOpenChange(false)
          navigate(`/threat-models/${threatModel.id}`)
        },
      }
    )
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setName('')
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Threat Model</DialogTitle>
          <DialogDescription>
            Give your threat model a name. You can configure everything else from the workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="threat-model-name">Name</Label>
            <Input
              id="threat-model-name"
              placeholder="e.g. Payment Processing System"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
