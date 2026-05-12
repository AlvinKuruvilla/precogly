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

/** Predefined abstract threat actor categories */
const PREDEFINED_ACTORS = [
  { value: 'state-actor', label: 'State Actor' },
  { value: 'hacktivist', label: 'Hacktivist' },
  { value: 'insider-threat', label: 'Insider Threat' },
  { value: 'competitor', label: 'Competitor' },
  { value: 'opportunist', label: 'Opportunist' },
  { value: 'organized-crime', label: 'Organized Crime' },
] as const

/** Prefix used to distinguish DFD actor IDs from predefined text values */
const DFD_ACTOR_PREFIX = 'dfd:'

export interface ActorImpactData {
  impactDescription: string
  threatActor: number | null
  threatActorText: string
}

interface ActorImpactPanelProps {
  threat: ComponentThreat
  actorNodes: { nodeId: string; componentId: number; name: string }[]
  onChange: (data: ActorImpactData) => void
}

export function ActorImpactPanel({
  threat,
  actorNodes,
  onChange,
}: ActorImpactPanelProps) {
  const [impactDescription, setImpactDescription] = useState(threat.impactDescription || '')
  const [customActorText, setCustomActorText] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [threatActorId, setThreatActorId] = useState<number | null>(threat.threatActorId ?? null)
  const [threatActorText, setThreatActorText] = useState(threat.threatActorText || '')

  // Derive the current select value from local state
  const deriveSelectValue = useCallback((): string => {
    if (threatActorId && threatActorId > 0) {
      return `${DFD_ACTOR_PREFIX}${threatActorId}`
    }
    if (threatActorText) {
      const predefined = PREDEFINED_ACTORS.find((a) => a.label === threatActorText)
      if (predefined) return predefined.value
      return 'custom'
    }
    return 'none'
  }, [threatActorId, threatActorText])

  // Sync local state when threat changes
  useEffect(() => {
    setImpactDescription(threat.impactDescription || '')
    setThreatActorId(threat.threatActorId ?? null)
    setThreatActorText(threat.threatActorText || '')
    const actorText = threat.threatActorText || ''
    const predefined = PREDEFINED_ACTORS.find((a) => a.label === actorText)
    if (actorText && !predefined && !(threat.threatActorId && threat.threatActorId > 0)) {
      setShowCustomInput(true)
      setCustomActorText(actorText)
    } else {
      setShowCustomInput(false)
      setCustomActorText('')
    }
  }, [threat.id, threat.impactDescription, threat.threatActorText, threat.threatActorId])

  // Notify parent whenever local state changes
  useEffect(() => {
    onChange({ impactDescription, threatActor: threatActorId, threatActorText })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impactDescription, threatActorId, threatActorText])

  const handleImpactDescriptionChange = useCallback((value: string) => {
    setImpactDescription(value)
  }, [])

  const handleActorChange = useCallback((value: string) => {
    if (value === 'none') {
      setShowCustomInput(false)
      setCustomActorText('')
      setThreatActorId(null)
      setThreatActorText('')
    } else if (value === 'custom') {
      setShowCustomInput(true)
      setCustomActorText('')
      setThreatActorId(null)
      setThreatActorText('')
    } else if (value.startsWith(DFD_ACTOR_PREFIX)) {
      setShowCustomInput(false)
      setCustomActorText('')
      const actorId = parseInt(value.slice(DFD_ACTOR_PREFIX.length), 10)
      setThreatActorId(actorId)
      setThreatActorText('')
    } else {
      setShowCustomInput(false)
      setCustomActorText('')
      const predefined = PREDEFINED_ACTORS.find((a) => a.value === value)
      setThreatActorId(null)
      setThreatActorText(predefined?.label || value)
    }
  }, [])

  const handleCustomActorTextChange = useCallback((value: string) => {
    setCustomActorText(value)
    setThreatActorId(null)
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

            <SelectGroup>
              <SelectLabel className="text-[10px]">Categories</SelectLabel>
              {PREDEFINED_ACTORS.map((actor) => (
                <SelectItem key={actor.value} value={actor.value}>
                  {actor.label}
                </SelectItem>
              ))}
            </SelectGroup>

            {actorNodes.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-[10px]">DFD Actors</SelectLabel>
                {actorNodes.map((actor) => (
                  <SelectItem
                    key={actor.componentId}
                    value={`${DFD_ACTOR_PREFIX}${actor.componentId}`}
                  >
                    {actor.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

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
