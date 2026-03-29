import { Button } from '@/components/ui/button'
import {
  ProgressChecklist,
  ReferenceImageGallery,
  ReferenceImageUploader,
  RelationshipCards,
  DFDCarousel,
  SummaryCards,
  SystemContextCard,
} from '@/features/threat-models/components/workspace'
import type { ThreatModel, Diagram, System } from '@/types'
import type { ReferenceImage } from '@/features/threat-models/types/core'
import type { ProgressChecklistItem } from '@/features/dfd-editor/types/threat-analysis'

interface SummaryData {
  componentSummary: {
    total: number
    processes: number
    datastores: number
    humanActors: number
    systemActors: number
    trustZones: number
  }
  threatSummary: {
    total: number
    exposed: number
    addressable: number
    mitigated: number
  }
  countermeasureSummary: {
    total: number
    platform: number
    verified: number
    gap: number
    planned: number
    waived: number
  }
}

interface OverviewTabProps {
  threatModelId: string
  threatModel: ThreatModel
  diagrams: Diagram[]
  linkedSystems: System[]
  referencedModels: ThreatModel[]
  currentTeam: { id: number; name: string; memberCount: number } | null
  progressChecklist: ProgressChecklistItem[]
  summaries: SummaryData
  selectedDiagramId: string | null
  referenceImages: ReferenceImage[]
  isCreatingDiagram: boolean
  isUploadingImage: boolean
  onToggleChecklistItem: (itemId: string, checked: boolean) => void
  onSelectDiagram: (id: string | null) => void
  onEditDiagram: (diagramId: string) => void
  onCreateDiagram: () => void
  onUploadImage: (file: File, description: string) => Promise<void>
  onDeleteImage: (imageId: number) => Promise<void>
  onImageClick: (index: number) => void
  onManageSystems: () => void
  onManageThreatModels: () => void
  onManagePeople: () => void
  onManageDFDs: () => void
  onManageFrameworks: () => void
  onEditSystemContext: () => void
  onNavigateToThreats: () => void
}

export function OverviewTab({
  threatModelId,
  threatModel,
  diagrams,
  linkedSystems,
  referencedModels,
  currentTeam,
  progressChecklist,
  summaries,
  selectedDiagramId,
  referenceImages,
  isCreatingDiagram,
  isUploadingImage,
  onToggleChecklistItem,
  onSelectDiagram,
  onEditDiagram,
  onCreateDiagram,
  onUploadImage,
  onDeleteImage,
  onImageClick,
  onManageSystems,
  onManageThreatModels,
  onManagePeople,
  onManageDFDs,
  onManageFrameworks,
  onEditSystemContext,
  onNavigateToThreats,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Completion Status + Relationship Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Completion Status</h3>
          <ProgressChecklist
            items={progressChecklist}
            onToggle={onToggleChecklistItem}
          />
        </div>
        <RelationshipCards
          connectedSystems={linkedSystems}
          connectedThreatModels={referencedModels}
          teamMemberCount={currentTeam?.memberCount ?? 0}
          teamName={currentTeam?.name}
          dfds={diagrams}
          frameworks={threatModel.frameworks || []}
          onManageSystems={onManageSystems}
          onManageThreatModels={onManageThreatModels}
          onManagePeople={onManagePeople}
          onManageDFDs={onManageDFDs}
          onManageFrameworks={onManageFrameworks}
        />
      </div>

      {/* System Context Card */}
      <SystemContextCard
        threatModelId={threatModelId}
        onEdit={onEditSystemContext}
      />

      {/* Summary Cards */}
      <SummaryCards
        components={summaries.componentSummary}
        threats={summaries.threatSummary}
        countermeasures={summaries.countermeasureSummary}
        onComponentsClick={onNavigateToThreats}
        onThreatsClick={onNavigateToThreats}
        onCountermeasuresClick={onNavigateToThreats}
      />

      {/* DFD Carousel */}
      {diagrams.length > 0 ? (
        <DFDCarousel
          diagrams={diagrams}
          selectedDiagramId={selectedDiagramId}
          onSelectDiagram={onSelectDiagram}
          onEditDiagram={onEditDiagram}
          onCreateDiagram={onCreateDiagram}
          isCreating={isCreatingDiagram}
        />
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No DFDs created yet. Create a data flow diagram to start threat modeling.
          </p>
          <Button onClick={onCreateDiagram} disabled={isCreatingDiagram}>
            {isCreatingDiagram ? 'Creating...' : 'Create First DFD'}
          </Button>
        </div>
      )}

      {/* Reference Images */}
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Reference Images</h3>
        <p className="text-sm text-muted-foreground">
          Upload diagrams, whiteboard photos, or architecture screenshots for reference
        </p>

        <ReferenceImageUploader
          onUpload={onUploadImage}
          isUploading={isUploadingImage}
        />

        {referenceImages.length > 0 && (
          <div className="pt-4">
            <ReferenceImageGallery
              images={referenceImages}
              onImageClick={onImageClick}
              onDelete={onDeleteImage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
