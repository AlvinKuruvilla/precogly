import { useState } from 'react'
import { Plus, Trash2, Pencil, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  useOutOfScopeItems,
  useCreateOutOfScopeItem,
  useUpdateOutOfScopeItem,
  useDeleteOutOfScopeItem,
} from '@/features/threat-models/api/out-of-scope-items'

interface OutOfScopeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  disabled?: boolean
}

export function OutOfScopeModal({
  open,
  onOpenChange,
  threatModelId,
  disabled,
}: OutOfScopeModalProps) {
  const { data: items = [], isLoading } = useOutOfScopeItems(threatModelId)
  const createItemMutation = useCreateOutOfScopeItem()
  const updateItemMutation = useUpdateOutOfScopeItem()
  const deleteItemMutation = useDeleteOutOfScopeItem()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Form state for add/edit
  const [formName, setFormName] = useState('')
  const [formReason, setFormReason] = useState('')

  const resetForm = () => {
    setFormName('')
    setFormReason('')
    setEditingId(null)
    setIsAdding(false)
  }

  const handleStartAdd = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleStartEdit = (item: { id: number; name: string; reason: string }) => {
    setFormName(item.name)
    setFormReason(item.reason)
    setEditingId(item.id)
    setIsAdding(false)
  }

  const handleSaveItem = () => {
    if (!formName.trim()) return

    if (editingId) {
      updateItemMutation.mutate(
        {
          threatModelId,
          id: editingId,
          data: {
            name: formName.trim(),
            reason: formReason.trim(),
          },
        },
        { onSuccess: () => resetForm() }
      )
    } else {
      createItemMutation.mutate(
        {
          threatModelId,
          data: {
            name: formName.trim(),
            reason: formReason.trim(),
          },
        },
        { onSuccess: () => resetForm() }
      )
    }
  }

  const handleDelete = (id: number) => {
    deleteItemMutation.mutate({ threatModelId, id })
    if (editingId === id) {
      resetForm()
    }
  }

  const isSaving = createItemMutation.isPending || updateItemMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Define Out of Scope Items</DialogTitle>
          <DialogDescription>
            Specify components, systems, or areas that are explicitly excluded from this threat model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Items list */}
          <ScrollArea className="h-[250px] border rounded-md">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-start justify-between p-3 rounded',
                      editingId === item.id ? 'bg-muted' : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.name}</div>
                      {item.reason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Reason:</span> {item.reason}
                        </div>
                      )}
                    </div>
                    {!disabled && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No out of scope items defined yet
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Add/Edit form */}
          {!disabled && (isAdding || editingId) && (
            <div className="border rounded-md p-4 space-y-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {editingId ? 'Edit Item' : 'New Item'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Name</label>
                  <Input
                    placeholder="e.g., Legacy Payment Gateway"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Reason for Exclusion</label>
                  <Textarea
                    placeholder="Explain why this is out of scope..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveItem}
                  disabled={!formName.trim() || isSaving}
                  className="gap-1"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {editingId ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          )}

          {/* Add button */}
          {!disabled && !isAdding && !editingId && (
            <Button
              variant="outline"
              onClick={handleStartAdd}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Out of Scope Item
            </Button>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
