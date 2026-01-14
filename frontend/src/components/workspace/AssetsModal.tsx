import { useState } from 'react'
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  type SystemContextAsset,
  type AssetClassification,
  ASSET_CLASSIFICATION_CONFIG,
} from '@/features/dfd-editor/types/threat-analysis'

interface AssetsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: SystemContextAsset[]
  onSave: (assets: SystemContextAsset[]) => void
  disabled?: boolean
}

export function AssetsModal({
  open,
  onOpenChange,
  assets,
  onSave,
  disabled,
}: AssetsModalProps) {
  const [localAssets, setLocalAssets] = useState<SystemContextAsset[]>(assets)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Form state for add/edit
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formClassification, setFormClassification] = useState<AssetClassification>('other')

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormClassification('other')
    setEditingId(null)
    setIsAdding(false)
  }

  const handleStartAdd = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleStartEdit = (asset: SystemContextAsset) => {
    setFormName(asset.name)
    setFormDescription(asset.description)
    setFormClassification(asset.classification)
    setEditingId(asset.id)
    setIsAdding(false)
  }

  const handleSaveAsset = () => {
    if (!formName.trim()) return

    if (editingId) {
      // Update existing
      setLocalAssets((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? { ...a, name: formName.trim(), description: formDescription.trim(), classification: formClassification }
            : a
        )
      )
    } else {
      // Add new
      const newAsset: SystemContextAsset = {
        id: crypto.randomUUID(),
        name: formName.trim(),
        description: formDescription.trim(),
        classification: formClassification,
      }
      setLocalAssets((prev) => [...prev, newAsset])
    }
    resetForm()
  }

  const handleDelete = (id: string) => {
    setLocalAssets((prev) => prev.filter((a) => a.id !== id))
    if (editingId === id) {
      resetForm()
    }
  }

  const handleSaveAll = () => {
    onSave(localAssets)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalAssets(assets) // Reset to original
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Define Assets</DialogTitle>
          <DialogDescription>
            Define the primary assets that need protection in this system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Asset list */}
          <ScrollArea className="h-[250px] border rounded-md">
            <div className="p-2 space-y-1">
              {localAssets.length > 0 ? (
                localAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={cn(
                      'flex items-start justify-between p-3 rounded',
                      editingId === asset.id ? 'bg-muted' : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{asset.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                          {ASSET_CLASSIFICATION_CONFIG[asset.classification]?.label || asset.classification}
                        </span>
                      </div>
                      {asset.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {asset.description}
                        </div>
                      )}
                    </div>
                    {!disabled && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(asset)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No assets defined yet
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Add/Edit form */}
          {!disabled && (isAdding || editingId) && (
            <div className="border rounded-md p-4 space-y-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {editingId ? 'Edit Asset' : 'New Asset'}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Name</label>
                  <Input
                    placeholder="e.g., Customer Data"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Classification</label>
                  <Select
                    value={formClassification}
                    onValueChange={(v) => setFormClassification(v as AssetClassification)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_CLASSIFICATION_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Description</label>
                <Textarea
                  placeholder="Describe the asset..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveAsset}
                  disabled={!formName.trim()}
                  className="gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
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
              Add Asset
            </Button>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSaveAll}>
              Save Assets
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
