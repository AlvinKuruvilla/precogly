import { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ComponentThreat } from '../../types/threat-analysis'

/** Predefined abstract threat actor categories (fallback when no personas exist) */
const PREDEFINED_ACTORS = [
  { value: 'state-actor', label: 'State Actor' },
  { value: 'hacktivist', label: 'Hacktivist' },
  { value: 'insider-threat', label: 'Insider Threat' },
  { value: 'competitor', label: 'Competitor' },
  { value: 'opportunist', label: 'Opportunist' },
  { value: 'organized-crime', label: 'Organized Crime' },
] as const

/** Prefix used to distinguish persona IDs from predefined text values */
const PERSONA_PREFIX = 'persona:'

export interface ActorImpactData {
  impactDescription: string
  threatActorText: string
}

interface ActorImpactPanelProps {
  threat: ComponentThreat
  personas: { id: number; name: string }[]
  onChange: (data: ActorImpactData) => void
}

export function ActorImpactPanel({
  threat,
  personas,
  onChange,
}: ActorImpactPanelProps) {
  const [impactDescription, setImpactDescription] = useState(threat.impactDescription || '')
  const [customActorText, setCustomActorText] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [threatActorText, setThreatActorText] = useState(threat.threatActorText || '')

  // Derive the current select value from local state
  const deriveSelectValue = useCallback((): string => {
    if (threatActorText) {
      // Check if it matches a persona name
      const matchingPersona = personas.find((p) => p.name === threatActorText)
      if (matchingPersona) return `${PERSONA_PREFIX}${matchingPersona.id}`
      // Check if it matches a predefined actor
      const predefined = PREDEFINED_ACTORS.find((a) => a.label === threatActorText)
      if (predefined) return predefined.value
      return 'custom'
    }
    return 'none'
  }, [threatActorText, personas])

  // Sync local state when threat changes
  useEffect(() => {
    setImpactDescription(threat.impactDescription || '')
    setThreatActorText(threat.threatActorText || '')
    const actorText = threat.threatActorText || ''
    const predefined = PREDEFINED_ACTORS.find((a) => a.label === actorText)
    const matchingPersona = personas.find((p) => p.name === actorText)
    if (actorText && !predefined && !matchingPersona) {
      setShowCustomInput(true)
      setCustomActorText(actorText)
    } else {
      setShowCustomInput(false)
      setCustomActorText('')
    }
  }, [threat.id, threat.impactDescription, threat.threatActorText, personas])

  // Notify parent whenever local state changes
  useEffect(() => {
    onChange({ impactDescription, threatActorText })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impactDescription, threatActorText])

  const handleImpactDescriptionChange = useCallback((value: string) => {
    setImpactDescription(value)
  }, [])

  const handleActorChange = useCallback((value: string) => {
    if (value === 'none') {
      setShowCustomInput(false)
      setCustomActorText('')
      setThreatActorText('')
    } else if (value === 'custom') {
      setShowCustomInput(true)
      setCustomActorText('')
      setThreatActorText('')
    } else if (value.startsWith(PERSONA_PREFIX)) {
      setShowCustomInput(false)
      setCustomActorText('')
      const personaId = parseInt(value.slice(PERSONA_PREFIX.length), 10)
      const persona = personas.find((p) => p.id === personaId)
      setThreatActorText(persona?.name || '')
    } else {
      setShowCustomInput(false)
      setCustomActorText('')
      const predefined = PREDEFINED_ACTORS.find((a) => a.value === value)
      setThreatActorText(predefined?.label || value)
    }
  }, [personas])

  const handleCustomActorTextChange = useCallback((value: string) => {
    setCustomActorText(value)
    setThreatActorText(value)
  }, [])

  const currentSelectValue = deriveSelectValue()

  return (
    <div className="space-y-3">
      {/* Actor */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Actor
        </label>
        <Select value={currentSelectValue} onValueChange={handleActorChange}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select actor..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">None</span>
            </SelectItem>

            {personas.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-[10px]">Threat Personas</SelectLabel>
                {personas.map((persona) => (
                  <SelectItem
                    key={persona.id}
                    value={`${PERSONA_PREFIX}${persona.id}`}
                  >
                    {persona.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            <SelectGroup>
              <SelectLabel className="text-[10px]">Categories</SelectLabel>
              {PREDEFINED_ACTORS.map((actor) => (
                <SelectItem key={actor.value} value={actor.value}>
                  {actor.label}
                </SelectItem>
              ))}
            </SelectGroup>

            <SelectItem value="custom">
              <span className="text-blue-600">Custom...</span>
            </SelectItem>
          </SelectContent>
        </Select>

        {showCustomInput && (
          <Input
            value={customActorText}
            onChange={(e) => handleCustomActorTextChange(e.target.value)}
            placeholder="Enter custom actor type..."
            className="mt-1.5 h-7 text-xs"
            autoFocus
          />
        )}
      </div>

      {/* Impact */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Attacker Impact
        </label>
        <Textarea
          value={impactDescription}
          onChange={(e) => handleImpactDescriptionChange(e.target.value)}
          placeholder="What does the attacker achieve?"
          className="text-xs min-h-[60px] resize-y"
          rows={2}
        />
      </div>
    </div>
  )
}
