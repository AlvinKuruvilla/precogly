import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateSystem } from '@/features/threat-models/api/threat-models'
import type { System } from '@/types'

interface AddSystemModalProps {
  open: boolean
  onClose: () => void
  onSystemCreated: (system: System) => void
}

export function AddSystemModal({ open, onClose, onSystemCreated }: AddSystemModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lifecycleState, setLifecycleState] = useState<'development' | 'production' | 'decommissioned'>('development')

  const createMutation = useCreateSystem()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const newSystem = await createMutation.mutateAsync({
        name,
        owner: description || undefined,
        lifecycleState,
      })
      onSystemCreated(newSystem)
      handleClose()
    } catch (error) {
      console.error('Failed to create system:', error)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setLifecycleState('development')
    onClose()
  }

  const isValid = name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New System</DialogTitle>
          <DialogDescription>
            Create a new system to link with your threat model.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="system-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="system-name"
                placeholder="e.g., Payment Processing System"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-description">Description</Label>
              <Textarea
                id="system-description"
                placeholder="Describe the system..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-lifecycle">Lifecycle State</Label>
              <Select
                value={lifecycleState}
                onValueChange={(value) => setLifecycleState(value as typeof lifecycleState)}
              >
                <SelectTrigger id="system-lifecycle">
                  <SelectValue placeholder="Select lifecycle state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create System
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
