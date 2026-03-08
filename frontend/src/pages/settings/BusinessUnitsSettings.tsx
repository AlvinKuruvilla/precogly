/**
 * Business Units management page.
 */

import { useState } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useDeleteBusinessUnit,
} from '@/api/organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

export function BusinessUnitsSettings() {
  const { currentOrganization, isLoading: workspaceLoading, isSecurityTeam } = useWorkspace()
  const { data: businessUnits = [], isLoading: busLoading } = useBusinessUnits(
    currentOrganization?.id
  )
  const createMutation = useCreateBusinessUnit()
  const updateMutation = useUpdateBusinessUnit()
  const deleteMutation = useDeleteBusinessUnit()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingBu, setEditingBu] = useState<{ id: number; name: string; code: string; description: string } | null>(null)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newParent, setNewParent] = useState<string>('')

  const label = currentOrganization?.businessUnitLabel ?? 'Business Units'

  if (workspaceLoading || busLoading) {
    return <div>Loading...</div>
  }

  if (!currentOrganization) {
    return <div>No organization selected.</div>
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    createMutation.mutate(
      {
        organization: currentOrganization.id,
        name: newName,
        code: newCode || undefined,
        description: newDescription || undefined,
        parent: newParent ? parseInt(newParent, 10) : undefined,
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false)
          setNewName('')
          setNewCode('')
          setNewDescription('')
          setNewParent('')
        },
      }
    )
  }

  const handleEdit = () => {
    if (!editingBu || !editingBu.name.trim()) return
    updateMutation.mutate(
      {
        id: editingBu.id,
        data: {
          name: editingBu.name,
          code: editingBu.code,
          description: editingBu.description,
        },
      },
      {
        onSuccess: () => setEditingBu(null),
      }
    )
  }

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{label}</CardTitle>
              <CardDescription>
                Manage {label.toLowerCase()} in {currentOrganization.name}.
              </CardDescription>
            </div>
            {isSecurityTeam && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create {label.replace(/s$/, '')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {businessUnits.length === 0 ? (
            <p className="text-muted-foreground">No {label.toLowerCase()} found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Parent</TableHead>
                  {isSecurityTeam && <TableHead className="w-24">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessUnits.map((bu) => (
                  <TableRow key={bu.id}>
                    <TableCell className="font-medium">{bu.name}</TableCell>
                    <TableCell className="text-muted-foreground">{bu.code || '-'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {bu.description || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bu.parent
                        ? businessUnits.find((p) => p.id === bu.parent)?.name ?? '-'
                        : '-'}
                    </TableCell>
                    {isSecurityTeam && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setEditingBu({
                              id: bu.id,
                              name: bu.name,
                              code: bu.code || '',
                              description: bu.description || '',
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(bu.id, bu.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {label.replace(/s$/, '')}</DialogTitle>
            <DialogDescription>Add a new {label.toLowerCase().replace(/s$/, '')}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Engineering" />
            </div>
            <div className="space-y-2">
              <Label>Code (optional)</Label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g., ENG" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} />
            </div>
            {businessUnits.length > 0 && (
              <div className="space-y-2">
                <Label>Parent (optional)</Label>
                <Select value={newParent} onValueChange={setNewParent}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessUnits.map((bu) => (
                      <SelectItem key={bu.id} value={bu.id.toString()}>
                        {bu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingBu} onOpenChange={(open) => !open && setEditingBu(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {label.replace(/s$/, '')}</DialogTitle>
          </DialogHeader>
          {editingBu && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingBu.name}
                  onChange={(e) => setEditingBu({ ...editingBu, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={editingBu.code}
                  onChange={(e) => setEditingBu({ ...editingBu, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingBu.description}
                  onChange={(e) => setEditingBu({ ...editingBu, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBu(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editingBu?.name.trim() || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
