import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import {
  useFrameworks,
  useSystems,
  useThreatModels,
  useCreateThreatModel,
} from '@/api/threat-models'
import { AddSystemModal } from './AddSystemModal'
import type { Criticality, CreateThreatModelInput, ModelingMode, System } from '@/types'
import { MODELING_MODES } from '@/types/domain'

type SystemLinkOption = 'existing' | 'create' | 'none'

const criticalityOptions: { value: Criticality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export function CreateThreatModelForm() {
  const navigate = useNavigate()
  const { data: frameworks = [], isLoading: frameworksLoading } = useFrameworks()
  const { data: systems = [], isLoading: systemsLoading } = useSystems()
  const { data: threatModels = [], isLoading: modelsLoading } = useThreatModels()
  const createMutation = useCreateThreatModel()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [criticality, setCriticality] = useState<Criticality | ''>('')
  const [modelingMode, setModelingMode] = useState<ModelingMode>('dfdBased')
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<number[]>([])
  const [selectedSystemIds, setSelectedSystemIds] = useState<number[]>([])
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([])

  // System linking state
  const [systemLinkOption, setSystemLinkOption] = useState<SystemLinkOption>('none')
  const [showAddSystemModal, setShowAddSystemModal] = useState(false)

  // Combined loading state (available for future use)
  const _isLoading = frameworksLoading || systemsLoading || modelsLoading
  void _isLoading

  const toggleFramework = (frameworkId: number) => {
    setSelectedFrameworkIds((prev) =>
      prev.includes(frameworkId)
        ? prev.filter((f) => f !== frameworkId)
        : [...prev, frameworkId]
    )
  }

  // Transform systems to combobox options (value as string for combobox, but we'll convert to number)
  const systemOptions = systems.map((system) => ({
    value: system.id,
    label: system.name,
    description: system.owner,
    meta: system.type,
  }))

  // Transform threat models to combobox options
  const modelOptions = threatModels.map((model) => ({
    value: model.id,
    label: model.name,
    description: model.description,
  }))

  // Handler for system selection (converts string IDs to numbers)
  const handleSystemsChange = (selectedIds: string[]) => {
    setSelectedSystemIds(selectedIds.map((id) => parseInt(id, 10)))
  }

  // Handler for referenced models selection (converts string IDs to numbers)
  const handleModelsChange = (selectedIds: string[]) => {
    setSelectedModelIds(selectedIds.map((id) => parseInt(id, 10)))
  }

  // Handler for when a new system is created via the modal
  const handleSystemCreated = (system: System) => {
    // Auto-select the newly created system and switch to "existing" option
    setSelectedSystemIds((prev) => [...prev, parseInt(system.id, 10)])
    setSystemLinkOption('existing')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const input: CreateThreatModelInput = {
      name,
      description: description || undefined,
      criticality: criticality || undefined,
      modelingMode,
      frameworkIds: selectedFrameworkIds.length > 0 ? selectedFrameworkIds : undefined,
      systemIds: selectedSystemIds.length > 0 ? selectedSystemIds : undefined,
      referencedModelIds: selectedModelIds.length > 0 ? selectedModelIds : undefined,
    }

    try {
      const newThreatModel = await createMutation.mutateAsync(input)
      navigate(`/threat-models/${newThreatModel.id}`)
    } catch (error) {
      console.error('Failed to create threat model:', error)
    }
  }

  const isValid = name.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Payment Processing System"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the system or process being modeled..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="criticality">Criticality</Label>
            <Select
              value={criticality}
              onValueChange={(value) => setCriticality(value as Criticality)}
            >
              <SelectTrigger id="criticality">
                <SelectValue placeholder="Select criticality level" />
              </SelectTrigger>
              <SelectContent>
                {criticalityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Modeling Approach */}
      <Card>
        <CardHeader>
          <CardTitle>Modeling Approach</CardTitle>
          <CardDescription>
            Choose how you'll create and analyze threats for this model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={modelingMode}
            onValueChange={(value) => setModelingMode(value as ModelingMode)}
          >
            {MODELING_MODES.map((mode) => (
              <div key={mode.value} className="flex items-start space-x-3 space-y-0 py-2">
                <RadioGroupItem value={mode.value} id={mode.value} />
                <div className="space-y-1 leading-none">
                  <Label htmlFor={mode.value} className="font-normal cursor-pointer">
                    {mode.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground mt-4">
            You can change this later and switch between approaches at any time.
          </p>
        </CardContent>
      </Card>

      {/* Compliance Frameworks */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Frameworks</CardTitle>
          <CardDescription>
            Select the frameworks this threat model should be mapped to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {frameworksLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading frameworks...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {frameworks.map((framework) => (
                <div key={framework.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`framework-${framework.id}`}
                    checked={selectedFrameworkIds.includes(framework.id)}
                    onCheckedChange={() => toggleFramework(framework.id)}
                  />
                  <Label
                    htmlFor={`framework-${framework.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {framework.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Systems */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Systems</CardTitle>
          <CardDescription>
            Optionally link this threat model to systems from your CMDB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading systems...
            </div>
          ) : (
            <>
              <RadioGroup
                value={systemLinkOption}
                onValueChange={(value) => {
                  const newOption = value as SystemLinkOption
                  setSystemLinkOption(newOption)
                  // Clear selected systems when switching to "none"
                  if (newOption === 'none') {
                    setSelectedSystemIds([])
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="font-normal cursor-pointer">
                    Link to existing system(s)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create" className="font-normal cursor-pointer">
                    Create new system
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-normal cursor-pointer">
                    No system yet
                  </Label>
                </div>
              </RadioGroup>

              {systemLinkOption === 'existing' && (
                <div className="pl-6 space-y-2">
                  <MultiSelectCombobox
                    options={systemOptions}
                    selected={selectedSystemIds.map(String)}
                    onChange={handleSystemsChange}
                    placeholder="Search and select systems..."
                    searchPlaceholder="Search systems..."
                    emptyMessage="No systems found."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddSystemModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New System
                  </Button>
                </div>
              )}

              {systemLinkOption === 'create' && (
                <div className="pl-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddSystemModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New System
                  </Button>
                </div>
              )}

              {systemLinkOption === 'none' && (
                <p className="pl-6 text-sm text-muted-foreground">
                  This threat model won't be linked to any system. You can add systems later
                  from the threat model workspace.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add System Modal */}
      <AddSystemModal
        open={showAddSystemModal}
        onClose={() => setShowAddSystemModal(false)}
        onSystemCreated={handleSystemCreated}
      />

      {/* Referenced Threat Models */}
      <Card>
        <CardHeader>
          <CardTitle>Referenced Threat Models</CardTitle>
          <CardDescription>
            Reference existing threat models for reuse and traceability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modelsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading threat models...
            </div>
          ) : threatModels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No existing threat models to reference.
            </p>
          ) : (
            <MultiSelectCombobox
              options={modelOptions}
              selected={selectedModelIds.map(String)}
              onChange={handleModelsChange}
              placeholder="Search and select threat models..."
              searchPlaceholder="Search threat models..."
              emptyMessage="No threat models found."
            />
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/')}
          disabled={createMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || createMutation.isPending}>
          {createMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create Threat Model
        </Button>
      </div>
    </form>
  )
}
