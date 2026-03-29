import { useState } from 'react'
import { Plus, RefreshCw, Trash2, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useRisks,
  useCreateRisk,
  useDeleteRisk,
  useRecalculateRisk,
  useScoringMethods,
} from '@/features/threat-models/api/risks'
import type { Risk, RiskLevel, RiskStatus, ScoringMethodKey, CreateRiskInput, ScoringMethod } from '@/types/risk'
import type { ComponentThreat } from '@/features/dfd-editor/types/threat-analysis'

interface RiskAnalysisTabProps {
  threatModelId: string
  componentThreats: ComponentThreat[]
  riskScoringMethod: ScoringMethodKey
  onScoringMethodChange: (method: ScoringMethodKey) => void
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
}

const STATUS_COLORS: Record<RiskStatus, string> = {
  open: 'bg-red-100 text-red-800 border-red-200',
  mitigated: 'bg-green-100 text-green-800 border-green-200',
  accepted: 'bg-blue-100 text-blue-800 border-blue-200',
}

function LevelBadge({ level }: { level: RiskLevel | null }) {
  if (!level) return <span className="text-muted-foreground text-sm">--</span>
  return (
    <Badge variant="outline" className={LEVEL_COLORS[level]}>
      {level}
    </Badge>
  )
}

function StatusBadge({ status }: { status: RiskStatus }) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status]}>
      {status}
    </Badge>
  )
}

function ScoreDisplay({ score, level }: { score: number | null; level: RiskLevel | null }) {
  if (score === null) return <span className="text-muted-foreground">--</span>
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-medium">{score}</span>
      <LevelBadge level={level} />
    </div>
  )
}

/**
 * Dynamic scoring form based on the selected method's metadata_schema.
 */
function ScoringMetadataForm({
  method,
  metadata,
  onChange,
}: {
  method: ScoringMethod | undefined
  metadata: Record<string, unknown>
  onChange: (metadata: Record<string, unknown>) => void
}) {
  if (!method) return null

  return (
    <div className="space-y-3">
      {Object.entries(method.metadataSchema).map(([fieldKey, fieldSchema]) => {
        if (fieldSchema.type === 'enum' && fieldSchema.values) {
          return (
            <div key={fieldKey} className="space-y-1">
              <Label className="capitalize">{fieldKey.replace(/_/g, ' ')}</Label>
              <Select
                value={(metadata[fieldKey] as string) || ''}
                onValueChange={(value) => onChange({ ...metadata, [fieldKey]: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${fieldKey.replace(/_/g, ' ')}`} />
                </SelectTrigger>
                <SelectContent>
                  {fieldSchema.values.map((value) => (
                    <SelectItem key={value} value={value}>
                      <span className="capitalize">{value.replace(/_/g, ' ')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        }
        if (fieldSchema.type === 'text') {
          return (
            <div key={fieldKey} className="space-y-1">
              <Label className="capitalize">{fieldKey.replace(/_/g, ' ')}</Label>
              <Textarea
                value={(metadata[fieldKey] as string) || ''}
                onChange={(e) => onChange({ ...metadata, [fieldKey]: e.target.value })}
                placeholder={`Enter ${fieldKey.replace(/_/g, ' ')}`}
                rows={2}
              />
            </div>
          )
        }
        if (fieldSchema.type === 'number') {
          return (
            <div key={fieldKey} className="space-y-1">
              <Label className="capitalize">{fieldKey.replace(/_/g, ' ')}</Label>
              <Input
                type="number"
                value={(metadata[fieldKey] as number) ?? ''}
                onChange={(e) =>
                  onChange({ ...metadata, [fieldKey]: e.target.value ? Number(e.target.value) : undefined })
                }
                min={fieldSchema.min}
                max={fieldSchema.max}
              />
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

/**
 * Threat picker for selecting threats to link to a risk.
 */
function ThreatPicker({
  componentThreats,
  selectedComponentThreatIds,
  selectedFlowThreatIds,
  onToggle,
}: {
  componentThreats: ComponentThreat[]
  selectedComponentThreatIds: number[]
  selectedFlowThreatIds: number[]
  onToggle: (backendId: number, threatType: 'component' | 'dataflow') => void
}) {
  const activeThreats = componentThreats.filter((t) => !t.dismissed && t.backendThreatId)

  if (activeThreats.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No threats available to link.</p>
  }

  return (
    <div className="max-h-48 overflow-y-auto border rounded-md">
      {activeThreats.map((threat) => {
        const isComponent = threat.threatType !== 'dataflow'
        const selectedIds = isComponent ? selectedComponentThreatIds : selectedFlowThreatIds
        const isSelected = selectedIds.includes(threat.backendThreatId!)

        return (
          <label
            key={threat.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(threat.backendThreatId!, threat.threatType as 'component' | 'dataflow')}
              className="rounded"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm truncate block">
                {threat.threatName || `Threat #${threat.backendThreatId}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {isComponent ? 'Component' : 'Flow'}
              </span>
            </div>
          </label>
        )
      })}
    </div>
  )
}

/**
 * Add Risk dialog.
 */
function AddRiskDialog({
  open,
  onOpenChange,
  threatModelId,
  componentThreats,
  scoringMethod,
  activeScoringMethod,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  componentThreats: ComponentThreat[]
  scoringMethod: ScoringMethodKey
  activeScoringMethod: ScoringMethod | undefined
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scoringMetadata, setScoringMetadata] = useState<Record<string, unknown>>({})
  const [inherentScore, setInherentScore] = useState<number | ''>('')
  const [selectedComponentThreatIds, setSelectedComponentThreatIds] = useState<number[]>([])
  const [selectedFlowThreatIds, setSelectedFlowThreatIds] = useState<number[]>([])

  const createRisk = useCreateRisk(threatModelId)
  const isCustom = scoringMethod === 'custom' || !activeScoringMethod?.available

  const handleToggleThreat = (backendId: number, threatType: 'component' | 'dataflow') => {
    if (threatType === 'component') {
      setSelectedComponentThreatIds((prev) =>
        prev.includes(backendId) ? prev.filter((id) => id !== backendId) : [...prev, backendId]
      )
    } else {
      setSelectedFlowThreatIds((prev) =>
        prev.includes(backendId) ? prev.filter((id) => id !== backendId) : [...prev, backendId]
      )
    }
  }

  const handleSubmit = () => {
    const input: CreateRiskInput = {
      name,
      description,
      scoringMetadata,
      componentThreatIds: selectedComponentThreatIds,
      flowThreatIds: selectedFlowThreatIds,
    }
    if (isCustom && inherentScore !== '') {
      input.inherentScore = Number(inherentScore)
    }

    createRisk.mutate(input, {
      onSuccess: () => {
        onOpenChange(false)
        resetForm()
      },
    })
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setScoringMetadata({})
    setInherentScore('')
    setSelectedComponentThreatIds([])
    setSelectedFlowThreatIds([])
  }

  const canSubmit = name.trim() && (isCustom ? inherentScore !== '' : true)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Risk</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Data Breach via API Exploitation" />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
          </div>

          {activeScoringMethod && (
            <div className="space-y-1">
              <Label>Scoring Method</Label>
              <p className="text-sm text-muted-foreground">
                {activeScoringMethod.label}
              </p>
            </div>
          )}

          {isCustom ? (
            <div className="space-y-1">
              <Label>Inherent Score (0-100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={inherentScore}
                onChange={(e) => setInherentScore(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
          ) : (
            <ScoringMetadataForm
              method={activeScoringMethod}
              metadata={scoringMetadata}
              onChange={setScoringMetadata}
            />
          )}

          <div className="space-y-1">
            <Label>Link Threats (optional)</Label>
            <ThreatPicker
              componentThreats={componentThreats}
              selectedComponentThreatIds={selectedComponentThreatIds}
              selectedFlowThreatIds={selectedFlowThreatIds}
              onToggle={handleToggleThreat}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createRisk.isPending}>
            {createRisk.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Risk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Risk detail side panel.
 */
function RiskDetailPanel({
  risk,
  threatModelId,
  onClose,
}: {
  risk: Risk
  threatModelId: string
  onClose: () => void
}) {
  const recalculate = useRecalculateRisk(threatModelId)

  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{risk.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            &times;
          </Button>
        </div>
        {risk.description && (
          <p className="text-sm text-muted-foreground">{risk.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Inherent Risk</p>
            <ScoreDisplay score={risk.inherentScore} level={risk.inherentLevel} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Residual Risk</p>
            <ScoreDisplay score={risk.residualScore} level={risk.residualLevel} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Status:</p>
          <StatusBadge status={risk.status} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => recalculate.mutate(risk.id)}
            disabled={recalculate.isPending}
          >
            <RefreshCw className={`h-3 w-3 ${recalculate.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {risk.ownerEmail && (
          <div>
            <p className="text-xs text-muted-foreground">Owner</p>
            <p className="text-sm">{risk.ownerEmail}</p>
          </div>
        )}
        {risk.assignedToEmail && (
          <div>
            <p className="text-xs text-muted-foreground">Assigned To</p>
            <p className="text-sm">{risk.assignedToEmail}</p>
          </div>
        )}

        {risk.threats && risk.threats.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Linked Threats ({risk.threats.length})
            </p>
            <div className="space-y-1">
              {risk.threats.map((threat) => (
                <div
                  key={threat.riskThreatId}
                  className="flex items-center justify-between text-sm border rounded px-2 py-1"
                >
                  <span className="truncate flex-1">
                    {threat.threatName || `Threat #${threat.threatId}`}
                  </span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <Badge variant="outline" className="text-xs">
                      {threat.threatType}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        threat.status === 'mitigated'
                          ? 'bg-green-50 text-green-700'
                          : threat.status === 'accepted'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-700'
                      }
                    >
                      {threat.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>Method: {risk.scoringMethod.replace(/_/g, ' ')}</p>
          <p>Created: {new Date(risk.createdAt).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Main Risk Analysis Tab component.
 */
export function RiskAnalysisTab({ threatModelId, componentThreats, riskScoringMethod, onScoringMethodChange }: RiskAnalysisTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null)
  const [deleteRiskId, setDeleteRiskId] = useState<number | null>(null)

  const { data: risks, isLoading } = useRisks(threatModelId)
  const { data: scoringMethods } = useScoringMethods()
  const deleteRisk = useDeleteRisk(threatModelId)

  const selectedRisk = risks?.find((r) => r.id === selectedRiskId)
  const activeScoringMethod = scoringMethods?.find((m) => m.key === riskScoringMethod)

  const handleDelete = () => {
    if (deleteRiskId === null) return
    deleteRisk.mutate(deleteRiskId, {
      onSuccess: () => {
        setDeleteRiskId(null)
        if (selectedRiskId === deleteRiskId) setSelectedRiskId(null)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Risk Register</h2>
          <p className="text-sm text-muted-foreground">
            {risks?.length ?? 0} risk{(risks?.length ?? 0) !== 1 ? 's' : ''} identified
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Scoring Method:</Label>
            <Select
              value={riskScoringMethod}
              onValueChange={(value) => onScoringMethodChange(value as ScoringMethodKey)}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(scoringMethods ?? []).map((method) => (
                  <SelectItem key={method.key} value={method.key} disabled={!method.available}>
                    {method.label}
                    {!method.available && ' (Coming Soon)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Risk
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Risk Table */}
        <div className={`flex-1 ${selectedRisk ? 'max-w-[60%]' : ''}`}>
          {!risks || risks.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                No risks defined yet. Create a risk to start building the risk register.
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Risk
              </Button>
            </Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[140px]">Inherent</TableHead>
                    <TableHead className="w-[140px]">Residual</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Threats</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((risk) => (
                    <TableRow
                      key={risk.id}
                      className={`cursor-pointer ${selectedRiskId === risk.id ? 'bg-muted/50' : ''}`}
                      onClick={() => setSelectedRiskId(risk.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{risk.name}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <ScoreDisplay score={risk.inherentScore} level={risk.inherentLevel} />
                      </TableCell>
                      <TableCell>
                        <ScoreDisplay score={risk.residualScore} level={risk.residualLevel} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={risk.status} />
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {risk.threatCount}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteRiskId(risk.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedRisk && (
          <div className="w-[40%]">
            <RiskDetailPanel
              risk={selectedRisk}
              threatModelId={threatModelId}
              onClose={() => setSelectedRiskId(null)}
            />
          </div>
        )}
      </div>

      {/* Add Risk Dialog */}
      <AddRiskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        threatModelId={threatModelId}
        componentThreats={componentThreats}
        scoringMethod={riskScoringMethod}
        activeScoringMethod={activeScoringMethod}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteRiskId !== null} onOpenChange={(open) => !open && setDeleteRiskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this risk and unlink all associated threats.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteRisk.isPending}>
              {deleteRisk.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
