import { useState } from 'react'
import {
  Plus,
  RefreshCw,
  Trash2,
  ChevronRight,
  Loader2,
  Zap,
  LayoutGrid,
  Table2,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
  useRisk,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useRecalculateRisk,
  useScoringMethods,
  useAutoPopulateRisks,
  useBulkUpdateRisks,
} from '@/features/threat-models/api/risks'
import type {
  Risk,
  RiskLevel,
  RiskStatus,
  ScoringMethodKey,
  CreateRiskInput,
  ScoringMethod,
} from '@/types/risk'
import type { ComponentThreat } from '@/features/dfd-editor/types/threat-analysis'

interface RiskAnalysisTabProps {
  threatModelId: string
  componentThreats: ComponentThreat[]
  riskScoringMethod: ScoringMethodKey
  onScoringMethodChange: (method: ScoringMethodKey) => void
}

type ViewMode = 'table' | 'kanban'

const KANBAN_COLUMNS: { status: RiskStatus; label: string; color: string }[] = [
  { status: 'open', label: 'Open', color: 'border-red-300 bg-red-50' },
  { status: 'in_progress', label: 'In Progress', color: 'border-blue-300 bg-blue-50' },
  { status: 'mitigated', label: 'Mitigated', color: 'border-green-300 bg-green-50' },
  { status: 'accepted', label: 'Accepted', color: 'border-purple-300 bg-purple-50' },
  { status: 'closed', label: 'Closed', color: 'border-gray-300 bg-gray-50' },
]

const LEVEL_COLORS: Record<RiskLevel, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
}

const STATUS_COLORS: Record<RiskStatus, string> = {
  open: 'bg-red-100 text-red-800 border-red-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  mitigated: 'bg-green-100 text-green-800 border-green-200',
  accepted: 'bg-purple-100 text-purple-800 border-purple-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
}

const STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  mitigated: 'Mitigated',
  accepted: 'Accepted',
  closed: 'Closed',
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
      {STATUS_LABELS[status]}
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

function OverdueBadge() {
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 gap-1">
      <AlertTriangle className="h-3 w-3" />
      Overdue
    </Badge>
  )
}

// ─── Scoring metadata form ────────────────────────────────────────────────────

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

// ─── Threat picker ────────────────────────────────────────────────────────────

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
              <span className="text-xs text-muted-foreground">{isComponent ? 'Component' : 'Flow'}</span>
            </div>
          </label>
        )
      })}
    </div>
  )
}

// ─── Add Risk dialog ──────────────────────────────────────────────────────────

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
  const [riskStatus, setRiskStatus] = useState<RiskStatus>('open')
  const [dueDate, setDueDate] = useState('')
  const [likelihood, setLikelihood] = useState<number | ''>('')
  const [impact, setImpact] = useState<number | ''>('')
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

  const resetForm = () => {
    setName('')
    setDescription('')
    setRiskStatus('open')
    setDueDate('')
    setLikelihood('')
    setImpact('')
    setScoringMetadata({})
    setInherentScore('')
    setSelectedComponentThreatIds([])
    setSelectedFlowThreatIds([])
  }

  const handleSubmit = () => {
    const input: CreateRiskInput = {
      name,
      description,
      scoringMetadata,
      status: riskStatus,
      dueDate: dueDate || null,
      likelihood: likelihood !== '' ? Number(likelihood) : null,
      impact: impact !== '' ? Number(impact) : null,
      componentThreatIds: selectedComponentThreatIds,
      flowThreatIds: selectedFlowThreatIds,
    }
    if (isCustom && inherentScore !== '') input.inherentScore = Number(inherentScore)
    createRisk.mutate(input, {
      onSuccess: () => { onOpenChange(false); resetForm() },
    })
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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={riskStatus} onValueChange={(v) => setRiskStatus(v as RiskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Likelihood (1–5)</Label>
              <Input type="number" min={1} max={5} value={likelihood} onChange={(e) => setLikelihood(e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div className="space-y-1">
              <Label>Impact (1–5)</Label>
              <Input type="number" min={1} max={5} value={impact} onChange={(e) => setImpact(e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
          {isCustom ? (
            <div className="space-y-1">
              <Label>Inherent Score (0–100)</Label>
              <Input type="number" min={0} max={100} value={inherentScore} onChange={(e) => setInherentScore(e.target.value ? Number(e.target.value) : '')} />
            </div>
          ) : (
            <ScoringMetadataForm method={activeScoringMethod} metadata={scoringMetadata} onChange={setScoringMetadata} />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createRisk.isPending}>
            {createRisk.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Risk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Risk detail panel ────────────────────────────────────────────────────────

function RiskDetailPanel({
  risk,
  threatModelId,
  onClose,
}: {
  risk: Risk
  threatModelId: string
  onClose: () => void
}) {
  const { data: riskDetail } = useRisk(threatModelId, risk.id)
  const displayRisk = riskDetail ?? risk
  const recalculate = useRecalculateRisk(threatModelId)
  const updateRisk = useUpdateRisk(threatModelId)
  const { data: scoringMethods } = useScoringMethods()
  const scoringMethodLabel =
    scoringMethods?.find((m) => m.key === displayRisk.scoringMethod)?.label ??
    displayRisk.scoringMethod.replace(/_/g, ' ')

  const handleStatusChange = (newStatus: RiskStatus) => {
    updateRisk.mutate({ riskId: risk.id, data: { status: newStatus } })
  }

  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{displayRisk.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>&times;</Button>
        </div>
        {displayRisk.description && (
          <p className="text-sm text-muted-foreground">{displayRisk.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Inherent Risk</p>
            <ScoreDisplay score={displayRisk.inherentScore} level={displayRisk.inherentLevel} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Residual Risk</p>
            <ScoreDisplay score={displayRisk.residualScore} level={displayRisk.residualLevel} />
          </div>
        </div>

        {(displayRisk.likelihood !== null || displayRisk.impact !== null) && (
          <div className="grid grid-cols-2 gap-4">
            {displayRisk.likelihood !== null && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Likelihood</p>
                <span className="text-sm font-medium">{displayRisk.likelihood}/5</span>
              </div>
            )}
            {displayRisk.impact !== null && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Impact</p>
                <span className="text-sm font-medium">{displayRisk.impact}/5</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="flex items-center gap-2">
            <Select value={displayRisk.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => recalculate.mutate(risk.id)} disabled={recalculate.isPending}>
              <RefreshCw className={`h-3 w-3 ${recalculate.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {displayRisk.dueDate && (
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">{new Date(displayRisk.dueDate).toLocaleDateString()}</span>
              {displayRisk.isOverdue && <OverdueBadge />}
            </div>
          </div>
        )}

        {displayRisk.ownerEmail && (
          <div>
            <p className="text-xs text-muted-foreground">Owner</p>
            <p className="text-sm">{displayRisk.ownerEmail}</p>
          </div>
        )}

        {displayRisk.threats && displayRisk.threats.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Linked Threats ({displayRisk.threats.length})</p>
            <div className="space-y-1">
              {displayRisk.threats.map((threat) => (
                <div key={threat.riskThreatId} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                  <span className="truncate flex-1">{threat.threatName || `Threat #${threat.threatId}`}</span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <Badge variant="outline" className="text-xs">{threat.threatType}</Badge>
                    <Badge variant="outline" className={
                      threat.status === 'mitigated' ? 'bg-green-50 text-green-700' :
                      threat.status === 'accepted' ? 'bg-blue-50 text-blue-700' :
                      'bg-red-50 text-red-700'
                    }>{threat.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayRisk.autoPopulated && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            Auto-populated
          </Badge>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>Method: {scoringMethodLabel}</p>
          <p>Created: {new Date(displayRisk.createdAt).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Kanban board ─────────────────────────────────────────────────────────────

function KanbanCard({
  risk,
  isSelected,
  onSelect,
  onDelete,
}: {
  risk: Risk
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium leading-tight">{risk.name}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <LevelBadge level={risk.inherentLevel} />
        {risk.isOverdue && <OverdueBadge />}
        {risk.autoPopulated && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Auto</Badge>
        )}
      </div>
      {risk.dueDate && !risk.isOverdue && (
        <p className="text-xs text-muted-foreground mt-1.5">
          Due {new Date(risk.dueDate).toLocaleDateString()}
        </p>
      )}
      {risk.ownerEmail && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{risk.ownerEmail}</p>
      )}
    </div>
  )
}

function KanbanBoard({
  risks,
  selectedRiskId,
  onSelectRisk,
  onDeleteRisk,
  threatModelId,
}: {
  risks: Risk[]
  selectedRiskId: number | null
  onSelectRisk: (id: number) => void
  onDeleteRisk: (id: number) => void
  threatModelId: string
}) {
  const updateRisk = useUpdateRisk(threatModelId)

  const handleDrop = (e: React.DragEvent, targetStatus: RiskStatus) => {
    e.preventDefault()
    const riskId = Number(e.dataTransfer.getData('riskId'))
    if (riskId) updateRisk.mutate({ riskId, data: { status: targetStatus } })
  }

  return (
    <div className="grid grid-cols-5 items-start gap-4">
      {KANBAN_COLUMNS.map((col) => {
        const colRisks = risks.filter((r) => r.status === col.status)
        return (
          <div
            key={col.status}
            className={`rounded-lg border-2 ${col.color} p-3`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary" className="text-xs">{colRisks.length}</Badge>
            </div>
            <div className="space-y-2">
              {colRisks.map((risk) => (
                <div
                  key={risk.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('riskId', String(risk.id))}
                >
                  <KanbanCard
                    risk={risk}
                    isSelected={selectedRiskId === risk.id}
                    onSelect={() => onSelectRisk(risk.id)}
                    onDelete={() => onDeleteRisk(risk.id)}
                  />
                </div>
              ))}
              {colRisks.length === 0 && (
                <div className="border border-dashed rounded-md py-4 text-xs text-muted-foreground text-center">
                  Drop here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function BulkActionBar({
  selectedIds,
  threatModelId,
  onClear,
}: {
  selectedIds: number[]
  threatModelId: string
  onClear: () => void
}) {
  const bulkUpdate = useBulkUpdateRisks(threatModelId)
  const [bulkStatus, setBulkStatus] = useState<RiskStatus | ''>('')
  const [bulkDueDate, setBulkDueDate] = useState('')

  const handleApply = () => {
    if (!bulkStatus && !bulkDueDate) return
    bulkUpdate.mutate(
      {
        riskIds: selectedIds,
        ...(bulkStatus ? { status: bulkStatus } : {}),
        ...(bulkDueDate ? { dueDate: bulkDueDate } : {}),
      },
      { onSuccess: onClear }
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/60 border rounded-lg">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>
      <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as RiskStatus)}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="Set status…" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <SelectItem key={val} value={val}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        className="h-8 w-[160px]"
        value={bulkDueDate}
        onChange={(e) => setBulkDueDate(e.target.value)}
        placeholder="Set due date…"
      />
      <Button size="sm" onClick={handleApply} disabled={(!bulkStatus && !bulkDueDate) || bulkUpdate.isPending}>
        {bulkUpdate.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        Apply
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>Clear</Button>
    </div>
  )
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({
  risks,
  selectedRiskId,
  selectedIds,
  onSelectRisk,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteRisk,
}: {
  risks: Risk[]
  selectedRiskId: number | null
  selectedIds: number[]
  onSelectRisk: (id: number) => void
  onToggleSelect: (id: number) => void
  onToggleSelectAll: () => void
  onDeleteRisk: (id: number) => void
}) {
  const allSelected = risks.length > 0 && selectedIds.length === risks.length

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <button onClick={onToggleSelectAll} className="flex items-center">
                {allSelected
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4 text-muted-foreground" />
                }
              </button>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[140px]">Inherent</TableHead>
            <TableHead className="w-[140px]">Residual</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[110px]">Due Date</TableHead>
            <TableHead className="w-[80px]">Threats</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {risks.map((risk) => (
            <TableRow
              key={risk.id}
              className={`cursor-pointer ${selectedRiskId === risk.id ? 'bg-muted/50' : ''}`}
              onClick={() => onSelectRisk(risk.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(risk.id)}
                  onCheckedChange={() => onToggleSelect(risk.id)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{risk.name}</span>
                  {risk.isOverdue && <OverdueBadge />}
                  {risk.autoPopulated && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Auto</Badge>
                  )}
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
              <TableCell className="text-sm text-muted-foreground">
                {risk.dueDate ? new Date(risk.dueDate).toLocaleDateString() : '—'}
              </TableCell>
              <TableCell className="text-center text-sm text-muted-foreground">
                {risk.threatCount}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onDeleteRisk(risk.id) }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RiskAnalysisTab({
  threatModelId,
  componentThreats,
  riskScoringMethod,
  onScoringMethodChange,
}: RiskAnalysisTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null)
  const [deleteRiskId, setDeleteRiskId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: risks, isLoading } = useRisks(threatModelId)
  const { data: scoringMethods } = useScoringMethods()
  const deleteRisk = useDeleteRisk(threatModelId)
  const autoPopulate = useAutoPopulateRisks(threatModelId)

  const selectedRisk = risks?.find((r) => r.id === selectedRiskId)
  const activeScoringMethod = scoringMethods?.find((m) => m.key === riskScoringMethod)
  const overdueCount = risks?.filter((r) => r.isOverdue).length ?? 0

  const handleDelete = () => {
    if (deleteRiskId === null) return
    deleteRisk.mutate(deleteRiskId, {
      onSuccess: () => {
        setDeleteRiskId(null)
        if (selectedRiskId === deleteRiskId) setSelectedRiskId(null)
        setSelectedIds((prev) => prev.filter((id) => id !== deleteRiskId))
      },
    })
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleToggleSelectAll = () => {
    if (!risks) return
    setSelectedIds(selectedIds.length === risks.length ? [] : risks.map((r) => r.id))
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Risk Register</h2>
          <p className="text-sm text-muted-foreground">
            {risks?.length ?? 0} risk{(risks?.length ?? 0) !== 1 ? 's' : ''}
            {overdueCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">· {overdueCount} overdue</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scoring method */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Scoring:</Label>
            <Select value={riskScoringMethod} onValueChange={(v) => onScoringMethodChange(v as ScoringMethodKey)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(scoringMethods ?? []).map((method) => (
                  <SelectItem key={method.key} value={method.key} disabled={!method.available}>
                    {method.label}{!method.available && ' (Coming Soon)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* View toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('table')}
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          {/* Auto-populate */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => autoPopulate.mutate()}
            disabled={autoPopulate.isPending}
          >
            {autoPopulate.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Zap className="h-4 w-4 mr-2" />
            }
            Auto-populate
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Risk
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && viewMode === 'table' && (
        <BulkActionBar
          selectedIds={selectedIds}
          threatModelId={threatModelId}
          onClear={() => setSelectedIds([])}
        />
      )}

      {/* Empty state */}
      {!risks || risks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No risks defined yet. Use Auto-populate to pull in exposed threats, or add one manually.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => autoPopulate.mutate()} disabled={autoPopulate.isPending}>
              <Zap className="h-4 w-4 mr-2" />
              Auto-populate from Threats
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex gap-6">
          {/* Main content */}
          <div className={`flex-1 min-w-0 ${selectedRisk && viewMode === 'table' ? 'max-w-[60%]' : ''}`}>
            {viewMode === 'table' ? (
              <TableView
                risks={risks}
                selectedRiskId={selectedRiskId}
                selectedIds={selectedIds}
                onSelectRisk={setSelectedRiskId}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onDeleteRisk={setDeleteRiskId}
              />
            ) : (
              <KanbanBoard
                risks={risks}
                selectedRiskId={selectedRiskId}
                onSelectRisk={setSelectedRiskId}
                onDeleteRisk={setDeleteRiskId}
                threatModelId={threatModelId}
              />
            )}
          </div>

          {/* Detail panel (table view only) */}
          {selectedRisk && viewMode === 'table' && (
            <div className="w-[40%] shrink-0">
              <RiskDetailPanel
                risk={selectedRisk}
                threatModelId={threatModelId}
                onClose={() => setSelectedRiskId(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Detail panel for kanban (below board) */}
      {selectedRisk && viewMode === 'kanban' && (
        <RiskDetailPanel
          risk={selectedRisk}
          threatModelId={threatModelId}
          onClose={() => setSelectedRiskId(null)}
        />
      )}

      <AddRiskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        threatModelId={threatModelId}
        componentThreats={componentThreats}
        scoringMethod={riskScoringMethod}
        activeScoringMethod={activeScoringMethod}
      />

      <AlertDialog open={deleteRiskId !== null} onOpenChange={(open) => !open && setDeleteRiskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this risk and unlink all associated threats. This cannot be undone.
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
