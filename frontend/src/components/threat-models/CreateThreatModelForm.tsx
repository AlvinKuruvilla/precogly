import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import {
  useFrameworks,
  useSystems,
  useThreatModels,
  useCreateThreatModel,
} from '@/api/threat-models'
import type { Criticality, CreateThreatModelInput } from '@/types'

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
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])
  const [selectedSystems, setSelectedSystems] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  const isLoading = frameworksLoading || systemsLoading || modelsLoading

  const toggleFramework = (frameworkName: string) => {
    setSelectedFrameworks((prev) =>
      prev.includes(frameworkName)
        ? prev.filter((f) => f !== frameworkName)
        : [...prev, frameworkName]
    )
  }

  // Transform systems to combobox options
  const systemOptions = systems.map((system) => ({
    value: system.id,
    label: system.name,
    description: system.description,
    meta: system.type,
  }))

  // Transform threat models to combobox options
  const modelOptions = threatModels.map((model) => ({
    value: model.id,
    label: model.name,
    description: model.description,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const input: CreateThreatModelInput = {
      name,
      description: description || undefined,
      criticality: criticality || undefined,
      frameworks: selectedFrameworks.length > 0 ? selectedFrameworks : undefined,
      systemIds: selectedSystems.length > 0 ? selectedSystems : undefined,
      referencedModelIds: selectedModels.length > 0 ? selectedModels : undefined,
    }

    try {
      await createMutation.mutateAsync(input)
      navigate('/')
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
                    checked={selectedFrameworks.includes(framework.name)}
                    onCheckedChange={() => toggleFramework(framework.name)}
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
            Link this threat model to systems or processes from your CMDB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading systems...
            </div>
          ) : (
            <MultiSelectCombobox
              options={systemOptions}
              selected={selectedSystems}
              onChange={setSelectedSystems}
              placeholder="Search and select systems..."
              searchPlaceholder="Search systems..."
              emptyMessage="No systems found."
            />
          )}
        </CardContent>
      </Card>

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
              selected={selectedModels}
              onChange={setSelectedModels}
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
