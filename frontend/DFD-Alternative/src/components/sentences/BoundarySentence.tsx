import { Shield, Trash2 } from 'lucide-react'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import type { BoundarySentence as BoundarySentenceType, Sentence, EntitySentence } from '../../types'
import { BOUNDARY_KINDS } from '../../types'

interface BoundarySentenceProps {
  sentence: BoundarySentenceType
  onChange: (updated: BoundarySentenceType) => void
  onDelete: () => void
  allSentences: Sentence[]
}

export function BoundarySentence({ sentence, onChange, onDelete, allSentences }: BoundarySentenceProps) {
  // Get possible parents (systems and containers)
  const parentOptions = allSentences
    .filter((s): s is EntitySentence =>
      s.type === 'entity' &&
      (s.entityKind === 'system' || s.entityKind === 'container')
    )
    .map((s) => ({ value: s.id, label: s.name || 'Unnamed' }))

  parentOptions.unshift({ value: '', label: '(Top Level)' })

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
        <Shield className="w-4 h-4 text-orange-600" />
      </div>

      <div className="flex-1 flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <Select
          value={sentence.parentId || ''}
          onChange={(value) => onChange({ ...sentence, parentId: value || null })}
          options={parentOptions}
          className="w-44"
        />
        <span>has a security boundary called</span>
        <Input
          value={sentence.name}
          onChange={(e) => onChange({ ...sentence, name: e.target.value })}
          placeholder="Boundary name..."
          className="w-36"
        />
        <span>of type</span>
        <Select
          value={sentence.boundaryKind}
          onChange={(value) => onChange({ ...sentence, boundaryKind: value as BoundarySentenceType['boundaryKind'] })}
          options={BOUNDARY_KINDS}
          className="w-40"
        />
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
