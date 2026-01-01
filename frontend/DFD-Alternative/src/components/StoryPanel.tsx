import { User, Box, Shield, ArrowRight } from 'lucide-react'
import { Button } from './ui/Button'
import { ActorSentence, EntitySentence, BoundarySentence, FlowSentence } from './sentences'
import type { Story, Sentence, ActorSentence as ActorType, EntitySentence as EntityType, BoundarySentence as BoundaryType, FlowSentence as FlowType } from '../types'
import { generateId } from '../lib/mock-data'

interface StoryPanelProps {
  story: Story
  onChange: (story: Story) => void
}

export function StoryPanel({ story, onChange }: StoryPanelProps) {
  const updateSentence = (index: number, updated: Sentence) => {
    const newStory = [...story]
    newStory[index] = updated
    onChange(newStory)
  }

  const deleteSentence = (index: number) => {
    const newStory = story.filter((_, i) => i !== index)
    onChange(newStory)
  }

  const addActor = () => {
    const newSentence: ActorType = {
      type: 'actor',
      id: generateId(),
      actorKind: 'person',
      name: '',
      description: '',
    }
    onChange([...story, newSentence])
  }

  const addEntity = () => {
    const newSentence: EntityType = {
      type: 'entity',
      id: generateId(),
      parentId: null,
      entityKind: 'system',
      name: '',
      technology: '',
      tags: [],
      description: '',
    }
    onChange([...story, newSentence])
  }

  const addBoundary = () => {
    const newSentence: BoundaryType = {
      type: 'boundary',
      id: generateId(),
      parentId: null,
      name: '',
      boundaryKind: 'internal',
    }
    onChange([...story, newSentence])
  }

  const addFlow = () => {
    const newSentence: FlowType = {
      type: 'flow',
      id: generateId(),
      sourceId: '',
      targetId: '',
      label: '',
      dataAssets: [],
      protocol: 'HTTPS',
      encrypted: true,
      authenticated: false,
    }
    onChange([...story, newSentence])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">The Story</h2>
        <p className="text-sm text-gray-500">Define your system architecture using natural language</p>
      </div>

      {/* Sentences list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {story.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No sentences yet.</p>
            <p className="text-sm">Click a button below to start building your architecture story.</p>
          </div>
        )}

        {story.map((sentence, index) => {
          switch (sentence.type) {
            case 'actor':
              return (
                <ActorSentence
                  key={sentence.id}
                  sentence={sentence}
                  onChange={(updated) => updateSentence(index, updated)}
                  onDelete={() => deleteSentence(index)}
                />
              )
            case 'entity':
              return (
                <EntitySentence
                  key={sentence.id}
                  sentence={sentence}
                  onChange={(updated) => updateSentence(index, updated)}
                  onDelete={() => deleteSentence(index)}
                  allSentences={story}
                />
              )
            case 'boundary':
              return (
                <BoundarySentence
                  key={sentence.id}
                  sentence={sentence}
                  onChange={(updated) => updateSentence(index, updated)}
                  onDelete={() => deleteSentence(index)}
                  allSentences={story}
                />
              )
            case 'flow':
              return (
                <FlowSentence
                  key={sentence.id}
                  sentence={sentence}
                  onChange={(updated) => updateSentence(index, updated)}
                  onDelete={() => deleteSentence(index)}
                  allSentences={story}
                />
              )
            default:
              return null
          }
        })}
      </div>

      {/* Add buttons footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={addActor}>
            <User className="w-4 h-4 mr-1" />
            Actor
          </Button>
          <Button variant="secondary" size="sm" onClick={addEntity}>
            <Box className="w-4 h-4 mr-1" />
            Entity
          </Button>
          <Button variant="secondary" size="sm" onClick={addBoundary}>
            <Shield className="w-4 h-4 mr-1" />
            Boundary
          </Button>
          <Button variant="secondary" size="sm" onClick={addFlow}>
            <ArrowRight className="w-4 h-4 mr-1" />
            Flow
          </Button>
        </div>
      </div>
    </div>
  )
}
