/**
 * The categories of an existing threat, edited with TaxonomyCategoryPicker.
 * Each change is saved at once as instance taxonomy links; the library
 * threat's own categories are shown fixed.
 */
import { toast } from 'sonner'
import type { TaxonomyEntry } from '@/types/domain'
import {
  useCreateInstanceTaxonomyEntry,
  useDeleteInstanceTaxonomyEntry,
  useInstanceTaxonomyEntries,
} from '@/features/threat-models/api/threats'
import { TaxonomyCategoryPicker } from './TaxonomyCategoryPicker'
import { diffTaxonomyLinks } from './taxonomy-picker-utils'

interface ThreatTaxonomyEditorProps {
  threatModelId: string
  threatId: number
  libraryEntries: TaxonomyEntry[]
  disabled?: boolean
}

export function ThreatTaxonomyEditor({
  threatModelId,
  threatId,
  libraryEntries,
  disabled = false,
}: ThreatTaxonomyEditorProps) {
  const { data: instanceLinks = [], isLoading } = useInstanceTaxonomyEntries(threatId)
  const createLink = useCreateInstanceTaxonomyEntry()
  const deleteLink = useDeleteInstanceTaxonomyEntry()
  const saving = createLink.isPending || deleteLink.isPending

  const handleChange = async (wantedEntryIds: number[]) => {
    const { entryIdsToCreate, linkIdsToDelete } = diffTaxonomyLinks(instanceLinks, wantedEntryIds)
    try {
      await Promise.all([
        ...entryIdsToCreate.map((taxonomyEntry) => createLink.mutateAsync({ taxonomyEntry, threat: threatId })),
        ...linkIdsToDelete.map((linkId) => deleteLink.mutateAsync(linkId)),
      ])
    } catch {
      toast.error('Could not save the categories. Try again.')
    }
  }

  return (
    <TaxonomyCategoryPicker
      threatModelId={threatModelId}
      value={instanceLinks.map((link) => link.taxonomyEntry)}
      onChange={handleChange}
      lockedEntries={libraryEntries}
      disabled={disabled || isLoading || saving}
    />
  )
}
