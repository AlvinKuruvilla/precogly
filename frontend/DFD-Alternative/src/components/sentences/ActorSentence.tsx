import { User, Server, Trash2 } from 'lucide-react'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import type { ActorSentence as ActorSentenceType } from '../../types'
import { ACTOR_KINDS } from '../../types'

interface ActorSentenceProps {
  sentence: ActorSentenceType
  onChange: (updated: ActorSentenceType) => void
  onDelete: () => void
}

export function ActorSentence({ sentence, onChange, onDelete }: ActorSentenceProps) {
  const Icon = sentence.actorKind === 'person' ? User : Server

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-purple-600" />
      </div>

      <div className="flex-1 flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <span>A</span>
        <Select
          value={sentence.actorKind}
          onChange={(value) => onChange({ ...sentence, actorKind: value as ActorSentenceType['actorKind'] })}
          options={ACTOR_KINDS}
          className="w-40"
        />
        <span>named</span>
        <Input
          value={sentence.name}
          onChange={(e) => onChange({ ...sentence, name: e.target.value })}
          placeholder="Name..."
          className="w-40"
        />
        <span>interacts with the system.</span>
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
