import { ArrowRight, Trash2 } from 'lucide-react'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Checkbox } from '../ui/Checkbox'
import { Button } from '../ui/Button'
import type { FlowSentence as FlowSentenceType, Sentence, ActorSentence, EntitySentence } from '../../types'
import { PROTOCOLS } from '../../types'

interface FlowSentenceProps {
  sentence: FlowSentenceType
  onChange: (updated: FlowSentenceType) => void
  onDelete: () => void
  allSentences: Sentence[]
}

export function FlowSentence({ sentence, onChange, onDelete, allSentences }: FlowSentenceProps) {
  // Get all possible sources and targets (actors and entities)
  const nodeOptions = allSentences
    .filter((s): s is ActorSentence | EntitySentence =>
      s.type === 'actor' || s.type === 'entity'
    )
    .map((s) => ({ value: s.id, label: s.name || 'Unnamed' }))

  const protocolOptions = PROTOCOLS.map((p) => ({ value: p, label: p }))

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        <ArrowRight className="w-4 h-4 text-green-600" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <Select
            value={sentence.sourceId}
            onChange={(value) => onChange({ ...sentence, sourceId: value })}
            options={nodeOptions}
            placeholder="Source..."
            className="w-40"
          />
          <span>sends</span>
          <Input
            value={sentence.dataAssets.join(', ')}
            onChange={(e) => onChange({ ...sentence, dataAssets: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="data assets..."
            className="w-48"
          />
          <span>to</span>
          <Select
            value={sentence.targetId}
            onChange={(value) => onChange({ ...sentence, targetId: value })}
            options={nodeOptions}
            placeholder="Target..."
            className="w-40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 ml-4">
          <span>via</span>
          <Select
            value={sentence.protocol}
            onChange={(value) => onChange({ ...sentence, protocol: value })}
            options={protocolOptions}
            className="w-36"
          />
          <Checkbox
            checked={sentence.encrypted}
            onChange={(checked) => onChange({ ...sentence, encrypted: checked })}
            label="encrypted"
          />
          <Checkbox
            checked={sentence.authenticated}
            onChange={(checked) => onChange({ ...sentence, authenticated: checked })}
            label="authenticated"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
