import { useState, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { cn } from '@/lib/utils'
import {
  type AssetClassification,
  ASSET_CLASSIFICATION_CONFIG,
} from '@/features/dfd-editor/types/threat-analysis'
import {
  type DataSensitivityTag,
  DATA_SENSITIVITY_TAG_CONFIG,
} from '@/types/domain'
import {
  useDataAssets,
  useCreateDataAsset,
  useUpdateDataAsset,
  useDeleteDataAsset,
} from '@/features/threat-models/api/data-assets'

interface AssetsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  disabled?: boolean
}

export function AssetsModal({
  open,
  onOpenChange,
  threatModelId,
  disabled,
}: AssetsModalProps) {
  const { data: assets = [], isLoading } = useDataAssets(threatModelId)
  const createAssetMutation = useCreateDataAsset()
  const updateAssetMutation = useUpdateDataAsset()
  const deleteAssetMutation = useDeleteDataAsset()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Form state for add/edit
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formClassification, setFormClassification] = useState<AssetClassification>('other')
  const [formDataSensitivity, setFormDataSensitivity] = useState<DataSensitivityTag[]>([])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormClassification('other')
    setFormDataSensitivity([])
    setEditingId(null)
    setIsAdding(false)
  }

  const handleStartAdd = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleStartEdit = (asset: { id: number; name: string; description: string; classification: string; dataSensitivity: string[] }) => {
    setFormName(asset.name)
    setFormDescription(asset.description)
    setFormClassification(asset.classification as AssetClassification)
    setFormDataSensitivity((asset.dataSensitivity || []) as DataSensitivityTag[])
    setEditingId(asset.id)
    setIsAdding(false)
  }

  const dataSensitivityOptions = useMemo(
    () =>
      Object.entries(DATA_SENSITIVITY_TAG_CONFIG).map(([value, config]) => ({
        value,
        label: config.label,
        description: config.description,
      })),
    []
  )

  const handleSaveAsset = () => {
    if (!formName.trim()) return

    if (editingId) {
      updateAssetMutation.mutate(
        {
          id: editingId,
          data: {
            name: formName.trim(),
            description: formDescription.trim(),
            classification: formClassification,
            dataSensitivity: formDataSensitivity,
          },
        },
        { onSuccess: () => resetForm() }
      )
    } else {
      createAssetMutation.mutate(
        {
          name: formName.trim(),
          description: formDescription.trim(),
          classification: formClassification,
          dataSensitivity: formDataSensitivity,
          threatModel: Number(threatModelId),
        },
        { onSuccess: () => resetForm() }
      )
    }
  }

  const handleDelete = (id: number) => {
    deleteAssetMutation.mutate(id)
    if (editingId === id) {
      resetForm()
    }
  }

  const isSaving = createAssetMutation.isPending || updateAssetMutation.isPending

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
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : assets.length > 0 ? (
                assets.map((asset) => (
                  <div
                    key={asset.id}
                    className={cn(
                      'flex items-start justify-between p-3 rounded',
                      editingId === asset.id ? 'bg-muted' : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{asset.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                          {ASSET_CLASSIFICATION_CONFIG[asset.classification as AssetClassification]?.label || asset.classification}
                        </span>
                        {asset.dataSensitivity?.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded"
                          >
                            {DATA_SENSITIVITY_TAG_CONFIG[tag as DataSensitivityTag]?.label || tag}
                          </span>
                        ))}
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Data Sensitivity</label>
                <MultiSelectCombobox
                  options={dataSensitivityOptions}
                  selected={formDataSensitivity}
                  onChange={setFormDataSensitivity}
                  placeholder="Select or add tags..."
                  searchPlaceholder="Search or type custom..."
                  allowCustom
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveAsset}
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
              Add Asset
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
