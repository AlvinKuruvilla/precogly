import { useState, useEffect } from 'react'
import { Plus, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGuestEditor } from '../context/GuestEditorContext'
import { GUEST_CONTROL_TYPES } from '../types'
import type { GuestCountermeasure } from '../types'

interface GuestCountermeasureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatId: string
  threatName: string
  editCountermeasure?: GuestCountermeasure
}

export function GuestCountermeasureDialog({
  open,
  onOpenChange,
  threatId,
  threatName,
  editCountermeasure,
}: GuestCountermeasureDialogProps) {
  const guestEditor = useGuestEditor()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [controlType, setControlType] = useState<GuestCountermeasure['controlType']>('preventive')

  const isEditMode = !!editCountermeasure

  useEffect(() => {
    if (open) {
      if (editCountermeasure) {
        setName(editCountermeasure.name)
        setDescription(editCountermeasure.description)
        setControlType(editCountermeasure.controlType)
      } else {
        setName('')
        setDescription('')
        setControlType('preventive')
      }
    }
  }, [open, editCountermeasure])

  const handleSubmit = () => {
    if (!name.trim() || !guestEditor) return

    if (isEditMode) {
      guestEditor.updateCountermeasure(editCountermeasure.id, {
        name: name.trim(),
        description: description.trim(),
        controlType,
      })
    } else {
      guestEditor.addCountermeasure(threatId, name.trim(), description.trim(), controlType)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Countermeasure' : 'Add Countermeasure'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Editing countermeasure for "${threatName}"`
              : `Add a countermeasure for "${threatName}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="countermeasure-name">Name *</Label>
            <Input
              id="countermeasure-name"
              placeholder="Enter countermeasure name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) handleSubmit()
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="countermeasure-description">Description</Label>
            <Textarea
              id="countermeasure-description"
              placeholder="Describe the countermeasure..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="countermeasure-control-type">Control Type *</Label>
            <Select
              value={controlType}
              onValueChange={(v) => setControlType(v as GuestCountermeasure['controlType'])}
            >
              <SelectTrigger id="countermeasure-control-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GUEST_CONTROL_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {isEditMode ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
