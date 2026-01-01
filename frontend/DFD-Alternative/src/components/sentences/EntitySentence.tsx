import { Box, Database, Layers, Server, Trash2 } from 'lucide-react'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Checkbox } from '../ui/Checkbox'
import { Button } from '../ui/Button'
import type { EntitySentence as EntitySentenceType, Sentence, LegacySecurityTag } from '../../types'
import { ENTITY_KINDS, CONTAINER_SUBTYPES, LEGACY_TECHNOLOGIES, LEGACY_SECURITY_TAGS } from '../../types'

interface EntitySentenceProps {
  sentence: EntitySentenceType
  onChange: (updated: EntitySentenceType) => void
  onDelete: () => void
  allSentences: Sentence[]
}

const ENTITY_ICONS = {
  system: Layers,
  container: Box,
  component: Server,
}

const SUBTYPE_ICONS = {
  service: Server,
  database: Database,
  queue: Box,
  storage: Box,
}

export function EntitySentence({ sentence, onChange, onDelete, allSentences }: EntitySentenceProps) {
  // Get possible parents (systems and containers)
  const parentOptions = allSentences
    .filter((s): s is EntitySentenceType =>
      s.type === 'entity' &&
      (s.entityKind === 'system' || s.entityKind === 'container') &&
      s.id !== sentence.id
    )
    .map((s) => ({ value: s.id, label: s.name || 'Unnamed' }))

  parentOptions.unshift({ value: '', label: '(Top Level)' })

  const Icon = sentence.containerSubtype
    ? SUBTYPE_ICONS[sentence.containerSubtype]
    : ENTITY_ICONS[sentence.entityKind]

  const techOptions = LEGACY_TECHNOLOGIES.map((t: { name: string; icon: string }) => ({ value: t.name, label: t.name }))
  techOptions.unshift({ value: '', label: '(No technology)' })

  const toggleTag = (tag: LegacySecurityTag) => {
    const newTags = sentence.tags.includes(tag)
      ? sentence.tags.filter((t) => t !== tag)
      : [...sentence.tags, tag]
    onChange({ ...sentence, tags: newTags })
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <span>Inside</span>
          <Select
            value={sentence.parentId || ''}
            onChange={(value) => onChange({ ...sentence, parentId: value || null })}
            options={parentOptions}
            className="w-40"
          />
          <span>, there is a</span>
          <Select
            value={sentence.entityKind}
            onChange={(value) => onChange({ ...sentence, entityKind: value as EntitySentenceType['entityKind'] })}
            options={ENTITY_KINDS}
            className="w-32"
          />
        </div>

        {sentence.entityKind === 'container' && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 ml-4">
            <span>of type</span>
            <Select
              value={sentence.containerSubtype || 'service'}
              onChange={(value) => onChange({ ...sentence, containerSubtype: value as EntitySentenceType['containerSubtype'] })}
              options={CONTAINER_SUBTYPES}
              className="w-36"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 ml-4">
          <span>running</span>
          <Select
            value={sentence.technology}
            onChange={(value) => onChange({ ...sentence, technology: value })}
            options={techOptions}
            className="w-40"
          />
          <span>named</span>
          <Input
            value={sentence.name}
            onChange={(e) => onChange({ ...sentence, name: e.target.value })}
            placeholder="Name..."
            className="w-40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 ml-4">
          <span>that</span>
          {LEGACY_SECURITY_TAGS.map((tag: { value: LegacySecurityTag; label: string }) => (
            <Checkbox
              key={tag.value}
              checked={sentence.tags.includes(tag.value)}
              onChange={() => toggleTag(tag.value)}
              label={tag.label}
            />
          ))}
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
