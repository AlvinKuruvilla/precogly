import { Server, FileText, Users, Package } from 'lucide-react'

interface RelationshipCardsProps {
  onManageSystems: () => void
  onManageThreatModels: () => void
  onManagePacks: () => void
  onManagePeople: () => void
}

export function RelationshipCards({
  onManageSystems,
  onManageThreatModels,
  onManagePacks,
  onManagePeople,
}: RelationshipCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={onManageSystems}
        className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Server className="h-4 w-4 shrink-0" />
        Manage Connected Systems
      </button>
      <button
        onClick={onManageThreatModels}
        className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <FileText className="h-4 w-4 shrink-0" />
        Manage Threat Models
      </button>
      <button
        onClick={onManagePacks}
        className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Package className="h-4 w-4 shrink-0" />
        Manage Connected Library Packs
      </button>
      <button
        onClick={onManagePeople}
        className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Users className="h-4 w-4 shrink-0" />
        Manage Team Members
      </button>
    </div>
  )
}
