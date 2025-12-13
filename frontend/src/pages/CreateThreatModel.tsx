import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateThreatModelForm } from '@/components/threat-models'

export function CreateThreatModel() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Threat Model</h1>
          <p className="text-muted-foreground">
            Define a new threat model for your system or process.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <CreateThreatModelForm />
      </div>
    </div>
  )
}
