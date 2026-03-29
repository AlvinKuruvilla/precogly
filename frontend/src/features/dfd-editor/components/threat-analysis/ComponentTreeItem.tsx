import { Cog, Database, User, ChevronRight, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ComponentThreat } from '../../types/threat-analysis'
import { deriveThreatStatus } from '../../types/threat-analysis'
import type { ComponentTreeNode } from './hierarchy-utils'
import { ComponentDataAssetsDisplay } from './ComponentDataAssetsDisplay'

const nodeTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  process: Cog,
  datastore: Database,
  humanActor: User,
  systemActor: Building2,
}

function getComponentThreatSummary(
  componentId: string,
  threats: ComponentThreat[]
): { total: number; exposed: number; addressable: number; mitigated: number } {
  const componentThreats = threats.filter(
    (t) => t.componentId === componentId && !t.dismissed
  )

  let exposed = 0
  let addressable = 0
  let mitigated = 0

  componentThreats.forEach((threat) => {
    const status = deriveThreatStatus(threat.countermeasures)
    if (status === 'exposed') exposed++
    else if (status === 'addressable') addressable++
    else mitigated++
  })

  return { total: componentThreats.length, exposed, addressable, mitigated }
}

export function ComponentTreeItem({
  treeNode,
  componentThreats,
  selectedComponentId,
  collapsedNodes,
  onSelectComponent,
  onToggleCollapsed,
}: {
  treeNode: ComponentTreeNode
  componentThreats: ComponentThreat[]
  selectedComponentId: string | null
  collapsedNodes: Set<string>
  onSelectComponent: (id: string) => void
  onToggleCollapsed: (id: string) => void
}) {
  const { node, children, depth } = treeNode
  const Icon = nodeTypeIcons[node.type as string] || Cog
  const summary = getComponentThreatSummary(node.id, componentThreats)
  const isSelected = node.id === selectedComponentId
  const technologyName = (node.data as { technology?: string }).technology
  const nodeLabel = String(node.data.label)
  const displayName = technologyName || nodeLabel
  const showSecondaryLabel = technologyName && nodeLabel !== technologyName && !nodeLabel.toLowerCase().includes('new ')
  const hasChildren = children.length > 0
  const isCollapsed = collapsedNodes.has(node.id)

  return (
    <>
      <button
        onClick={() => onSelectComponent(node.id)}
        className={cn(
          'w-full text-left p-2 rounded-md transition-colors',
          isSelected
            ? 'bg-slate-100 border border-slate-300'
            : 'hover:bg-slate-50'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Chevron for parents, spacer for leaves */}
            {hasChildren ? (
              <span
                role="button"
                className="flex-shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleCollapsed(node.id)
                }}
              >
                <ChevronRight
                  className={cn(
                    'h-3 w-3 text-muted-foreground transition-transform',
                    !isCollapsed && 'rotate-90'
                  )}
                />
              </span>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">
                {displayName}
              </div>
              {showSecondaryLabel && (
                <div className="text-xs text-muted-foreground truncate">
                  {nodeLabel}
                </div>
              )}
            </div>
          </div>
          {summary.exposed > 0 ? (
            <Badge variant="outline" className="bg-red-100 text-red-700 text-xs ml-2 flex-shrink-0">
              {summary.exposed} exposed
            </Badge>
          ) : summary.addressable > 0 ? (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs ml-2 flex-shrink-0">
              {summary.addressable} in progress
            </Badge>
          ) : summary.total > 0 ? (
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              No threats
            </span>
          ) : null}
        </div>
        {summary.total > 0 && (
          <div className="flex items-center gap-1 mt-1" style={{ marginLeft: `${hasChildren ? 24 : 20}px` }}>
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                summary.exposed > 0 ? 'bg-red-500' : 'bg-yellow-500'
              )}
            />
            <span className="text-xs text-muted-foreground">
              {summary.total}
            </span>
          </div>
        )}
      </button>
      {/* Data assets inline under selected component */}
      {isSelected && (
        <ComponentDataAssetsDisplay
          componentId={(node.data as { componentId?: number }).componentId}
        />
      )}
      {/* Recursively render children when not collapsed */}
      {hasChildren && !isCollapsed && children.map((child) => (
        <ComponentTreeItem
          key={child.node.id}
          treeNode={child}
          componentThreats={componentThreats}
          selectedComponentId={selectedComponentId}
          collapsedNodes={collapsedNodes}
          onSelectComponent={onSelectComponent}
          onToggleCollapsed={onToggleCollapsed}
        />
      ))}
    </>
  )
}
