import { User, Server, Box, Database, Layers, Shield, ArrowRight } from 'lucide-react'
import type { Story, ActorSentence, EntitySentence, BoundarySentence, FlowSentence, ThreatInfo } from '../types'
import { getThreatInfo } from '../lib/mock-data'
import { cn } from '../lib/utils'

interface DiagramPanelProps {
  story: Story
}

// Threat badge component
function ThreatBadge({ info }: { info: ThreatInfo | undefined }) {
  if (!info) return null

  const colors = {
    exposed: 'bg-red-500',
    assigned: 'bg-yellow-500',
    mitigated: 'bg-green-500',
  }

  return (
    <span
      className={cn(
        'absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-medium',
        colors[info.status]
      )}
    >
      {info.count}
    </span>
  )
}

// Node component for actors and entities
function DiagramNode({
  id,
  name,
  type,
  subtype,
  technology,
  tags,
}: {
  id: string
  name: string
  type: 'actor' | 'system' | 'container' | 'component'
  subtype?: string
  technology?: string
  tags?: string[]
}) {
  const threatInfo = getThreatInfo(id)

  const icons = {
    actor: User,
    system: Layers,
    container: subtype === 'database' ? Database : subtype === 'service' ? Server : Box,
    component: Server,
  }

  const colors = {
    actor: 'bg-purple-50 border-purple-300 text-purple-700',
    system: 'bg-blue-50 border-blue-300 text-blue-700',
    container: 'bg-green-50 border-green-300 text-green-700',
    component: 'bg-gray-50 border-gray-300 text-gray-700',
  }

  const Icon = icons[type]

  return (
    <div
      className={cn(
        'relative inline-flex flex-col items-center p-3 rounded-lg border-2 min-w-[100px]',
        colors[type]
      )}
    >
      <ThreatBadge info={threatInfo} />
      <Icon className="w-8 h-8 mb-1" />
      <span className="text-sm font-medium text-center">{name || 'Unnamed'}</span>
      {technology && (
        <span className="text-xs opacity-70">{technology}</span>
      )}
      {tags && tags.length > 0 && (
        <div className="flex gap-1 mt-1">
          {tags.map((tag) => (
            <span key={tag} className="text-xs bg-white/50 px-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple diagram visualization
export function DiagramPanel({ story }: DiagramPanelProps) {
  const actors = story.filter((s): s is ActorSentence => s.type === 'actor')
  const entities = story.filter((s): s is EntitySentence => s.type === 'entity')
  const boundaries = story.filter((s): s is BoundarySentence => s.type === 'boundary')
  const flows = story.filter((s): s is FlowSentence => s.type === 'flow')

  const systems = entities.filter((e) => e.entityKind === 'system')
  const topLevelContainers = entities.filter(
    (e) => e.entityKind === 'container' && !e.parentId
  )

  // Get children of a parent
  const getChildren = (parentId: string) =>
    entities.filter((e) => e.parentId === parentId)

  // Get name by ID
  const getName = (id: string): string => {
    const actor = actors.find((a) => a.id === id)
    if (actor) return actor.name || 'Unnamed'
    const entity = entities.find((e) => e.id === id)
    if (entity) return entity.name || 'Unnamed'
    return 'Unknown'
  }

  if (story.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-900 text-gray-400">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">The Diagram</h2>
          <p className="text-sm">Live preview of your architecture</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p>Add sentences to see the diagram</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">The Diagram</h2>
        <p className="text-sm text-gray-400">Live preview of your architecture</p>
      </div>

      {/* Diagram area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="min-h-full flex flex-col gap-8">
          {/* Actors row */}
          {actors.length > 0 && (
            <div className="flex flex-wrap gap-4 justify-center">
              {actors.map((actor) => (
                <DiagramNode
                  key={actor.id}
                  id={actor.id}
                  name={actor.name}
                  type="actor"
                  subtype={actor.actorKind}
                />
              ))}
            </div>
          )}

          {/* Flows from actors */}
          {flows.some((f) => actors.some((a) => a.id === f.sourceId)) && (
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-500 rotate-90" />
            </div>
          )}

          {/* Systems */}
          {systems.map((system) => {
            const children = getChildren(system.id)
            const systemBoundaries = boundaries.filter((b) => b.parentId === system.id)

            return (
              <div
                key={system.id}
                className="relative p-6 rounded-xl border-2 border-dashed border-blue-500/50 bg-blue-500/10"
              >
                <div className="absolute -top-3 left-4 px-2 bg-gray-900 text-blue-400 text-sm font-medium">
                  {system.name || 'Unnamed System'}
                </div>

                {/* Boundaries inside system */}
                {systemBoundaries.map((boundary) => (
                  <div
                    key={boundary.id}
                    className="mb-4 p-4 rounded-lg border border-dashed border-orange-500/50 bg-orange-500/5"
                  >
                    <div className="flex items-center gap-2 text-orange-400 text-sm mb-3">
                      <Shield className="w-4 h-4" />
                      {boundary.name || 'Unnamed Boundary'} ({boundary.boundaryKind})
                    </div>
                  </div>
                ))}

                {/* Containers inside system */}
                <div className="flex flex-wrap gap-4 justify-center">
                  {children
                    .filter((c) => c.entityKind === 'container')
                    .map((container) => (
                      <DiagramNode
                        key={container.id}
                        id={container.id}
                        name={container.name}
                        type="container"
                        subtype={container.containerSubtype}
                        technology={container.technology}
                        tags={container.tags}
                      />
                    ))}
                </div>
              </div>
            )
          })}

          {/* Top-level containers (no parent system) */}
          {topLevelContainers.length > 0 && (
            <div className="flex flex-wrap gap-4 justify-center">
              {topLevelContainers.map((container) => (
                <DiagramNode
                  key={container.id}
                  id={container.id}
                  name={container.name}
                  type="container"
                  subtype={container.containerSubtype}
                  technology={container.technology}
                  tags={container.tags}
                />
              ))}
            </div>
          )}

          {/* Flows summary */}
          {flows.length > 0 && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Data Flows</h3>
              <div className="space-y-1">
                {flows.map((flow) => (
                  <div key={flow.id} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-white">{getName(flow.sourceId)}</span>
                    <ArrowRight className="w-4 h-4 text-green-500" />
                    <span className="text-white">{getName(flow.targetId)}</span>
                    <span className="text-xs">
                      ({flow.protocol}
                      {flow.encrypted && ', encrypted'}
                      {flow.authenticated && ', authenticated'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" /> Exposed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500" /> Assigned
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" /> Mitigated
          </span>
        </div>
      </div>
    </div>
  )
}
