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
import type { GuestThreat } from '../types'

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

interface GuestThreatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetId: string
  targetType: GuestThreat['targetType']
  targetName: string
  /** When provided, the dialog operates in edit mode */
  editThreat?: GuestThreat
}

export function GuestThreatDialog({
  open,
  onOpenChange,
  targetId,
  targetType,
  targetName,
  editThreat,
}: GuestThreatDialogProps) {
  const guestEditor = useGuestEditor()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<GuestThreat['severity']>('medium')

  const isEditMode = !!editThreat

  // Pre-fill fields when editing or reset when adding
  useEffect(() => {
    if (open) {
      if (editThreat) {
        setName(editThreat.name)
        setDescription(editThreat.description)
        setSeverity(editThreat.severity)
      } else {
        setName('')
        setDescription('')
        setSeverity('medium')
      }
    }
  }, [open, editThreat])

  const handleSubmit = () => {
    if (!name.trim() || !guestEditor) return

    if (isEditMode) {
      guestEditor.updateThreat(editThreat.id, {
        name: name.trim(),
        description: description.trim(),
        severity,
      })
    } else {
      guestEditor.addThreat(targetId, targetType, name.trim(), description.trim(), severity)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Threat' : 'Add Threat'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Editing threat on ${targetName}` : `Add a threat to ${targetName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="threat-name">Threat Name *</Label>
            <Input
              id="threat-name"
              placeholder="Enter threat name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) handleSubmit()
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threat-description">Description</Label>
            <Textarea
              id="threat-description"
              placeholder="Describe the threat..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threat-severity">Severity *</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as GuestThreat['severity'])}>
              <SelectTrigger id="threat-severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((opt) => (
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
                Add Threat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
