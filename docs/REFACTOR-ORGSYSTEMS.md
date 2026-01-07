# Refactor: Components & Systems Architecture

## The Current Problem

### What's Happening

When a user saves a DFD that contains any nodes, the system auto-creates a placeholder `Orgsystem` record:

```
User creates threat model: "HR System"
User creates DFD and adds nodes to canvas
User saves DFD
                    │
                    ▼
System auto-creates: Orgsystem(name="System for HR System")
(Note: Orgsystem created when DFD has ANY nodes, even without technology assigned)
```

This causes several issues:

**Issue 1: Nonsensical system names for multi-system threat models**

```
Threat Model: "Integration between HR, CRM, and Payroll"
                    │
                    ▼
Auto-created: "System for Integration between HR, CRM, and Payroll"
                    │
                    ▼
Shows up in "Linked Systems" dropdown as a selectable system!
```

**Issue 2: Orphaned systems from deleted threat models**

```
User creates: Threat Model "Test Model"

User creates: DFD and adds nodes to canvas

User saves:   DFD
                    │
                    ▼
System auto-creates: Orgsystem "System for Test Model"
(Triggered by sync_dfd_nodes_to_components when DFD has any nodes)
                    │
                    ▼
User deletes: Threat Model "Test Model"
                    │
                    ▼
Orgsystem "System for Test Model" remains in database
                    │
                    ▼
Shows up in "Linked Systems" dropdown forever
```

**Issue 3: Conceptual mismatch**

The data model assumes: Systems exist first → Components belong to systems → Threat models analyze them

Reality: Users create threat models first → Draw components in DFDs → Systems are an afterthought

---

### Current Data Model

```
┌─────────────────────┐
│     Orgsystem       │ ◄──── Auto-created as "System for {TM.name}"
│  (placeholder)      │
└──────────┬──────────┘
           │
           │ FK (required)
           ▼
┌─────────────────────┐
│ OrgsystemComponent  │ ◄──── Created when DFD nodes are synced
│                     │
│ - orgsystem (FK)    │       Components MUST belong to a system
│ - component_library │
│ - name              │
└──────────┬──────────┘
           │
           │ FK
           ▼
┌─────────────────────┐
│ ComponentInstance   │
│ Threat/Countermeas. │
└─────────────────────┘
```

**The Hack**: `_get_or_create_orgsystem()` in `services.py:127-139`

```python
def _get_or_create_orgsystem(threat_model):
    orgsystem, _ = Orgsystem.objects.get_or_create(
        name=f"System for {threat_model.name}",  # <-- The problem
        organization=threat_model.organization,
    )
    return orgsystem
```

---

### Original Rationale

The original design intended to support CMDB integration:

1. Organizations import systems from ServiceNow/CMDB
2. Systems have components (real infrastructure assets)
3. Threat models analyze those pre-existing components
4. Multiple threat models can reference the same component

**Why it didn't work out**: The product workflow is threat-model-first, not system-first. Users draw DFDs before thinking about CMDB entries.

---

## The Solution

### What We're Doing

1. **Components belong to threat models**, not systems
2. **Systems are real CMDB entries** - manually created or imported, never auto-generated
3. **Linking systems to threat models is optional** - for organizational context only
4. **Components have optional external references** - flexible identifier for any asset tracking system

---

### New Data Model

```
┌─────────────────────┐              ┌─────────────────────┐
│     Orgsystem       │              │    ThreatModel      │
│   (real system)     │◄────M:M─────►│                     │
│                     │   optional   │                     │
│ - name              │    link      │ - name              │
│ - owner             │              │ - description       │
│ - criticality       │              │ - status            │
│ - lifecycle_state   │              │                     │
│                     │              └──────────┬──────────┘
│ Manually created    │                         │
│ or imported         │                         │ 1:M (owns)
└─────────────────────┘                         │
                                                ▼
                                   ┌─────────────────────────┐
                                   │  ThreatModelComponent   │
                                   │  (new table)            │
                                   │                         │
                                   │ - threat_model (FK)     │
                                   │ - component_library(FK) │
                                   │ - name                  │
                                   │ - external_id (opt)     │
                                   │ - external_url (opt)    │
                                   └────────────┬────────────┘
                                                │
                                                │ FK
                                                ▼
                                   ┌─────────────────────────┐
                                   │  ComponentInstanceThreat│
                                   │  (threats, counters)    │
                                   └─────────────────────────┘
```

**Key Changes:**

| Before                                       | After                                             |
| -------------------------------------------- | ------------------------------------------------- |
| `OrgsystemComponent.orgsystem` (required FK) | `ThreatModelComponent.threat_model` (required FK) |
| Auto-create placeholder `Orgsystem`          | No auto-creation                                  |
| Components orphaned on TM delete             | Cascade delete with threat model                  |
| "System for X" pollutes dropdown             | Only real systems appear                          |

---

### How a New System Gets Added

Systems are **never auto-created**. They enter the database through:

**Option 1: Inline creation during threat model creation**

```
User: Creates new threat model
      │
      ├──► "Linked Systems" dropdown shows existing systems
      │
      └──► "No systems available" → Click "Add System"
                │
                ▼
           Modal appears:
           ┌─────────────────────────────┐
           │ Add New System              │
           │                             │
           │ Name: [________________]    │
           │ Description: [_________]    │
           │ Environment: [Production ▼] │
           │                             │
           │        [Cancel] [Create]    │
           └─────────────────────────────┘
                │
                ▼
           System created, available for linking
```

**Option 2: Admin/Settings page**

```
Admin: Settings → Systems → Add System
       │
       └──► Create systems in bulk or import from CMDB
```

**Option 3: Future CMDB integration**

```
Admin: Settings → Integrations → Import from ServiceNow
       │
       └──► Systems imported automatically
```

---

### How and Where Components Get Added

Components are created when a user assigns a technology to a DFD node:

```
User: Opens DFD editor
      │
      ├──► Drags "Process" node onto canvas
      │    (No component created yet - just a visual shape)
      │
      └──► Clicks node → Opens edit panel
           │
           ├──► Selects technology: "PostgreSQL Database"
           │
           └──► Saves DFD
                │
                ▼
           sync_dfd_nodes_to_components() runs:
           │
           ├──► Creates ThreatModelComponent linked to ThreatModel
           │    (NOT to Orgsystem)
           │
           └──► Auto-generates threats based on component library
```

**Component Edit Panel in DFD Editor:**

```
┌─────────────────────────────────┐
│ Edit Component                  │
├─────────────────────────────────┤
│ Name: [API Gateway           ]  │
│ Technology: [AWS API Gateway ▼] │
│ Description: [______________]   │
│                                 │
│ ▶ External Reference (Optional) │
│   Asset ID: [INFRA-API-001  ]   │
│   URL: [https://confluence...]  │
│                                 │
│              [Cancel] [Save]    │
└─────────────────────────────────┘
```

The external reference fields allow linking to any asset tracking system (CMDB, Confluence, spreadsheet, etc.) without requiring a formal integration.

---

## Summary

| Concept                | Before                           | After                      |
| ---------------------- | -------------------------------- | -------------------------- |
| Components belong to   | Orgsystem (placeholder)          | ThreatModel                |
| Systems are            | Auto-created from TM names       | Real CMDB entries          |
| Linking systems        | Implicit via component ownership | Explicit, optional M:M     |
| Deleted TM cleanup     | Orphaned systems remain          | Cascade deletes components |
| External asset linking | Not supported                    | Optional ID + URL fields   |

---

## Technical Implementation Plan

This section provides detailed instructions for implementing the refactor.

### Overview of Changes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CHANGES SUMMARY                                │
├─────────────────────────────────────────────────────────────────────────┤
│  CREATE:                                                                │
│    - ThreatModelComponent model (backend)                               │
│    - ThreatModelComponentSerializer (backend)                           │
│    - ThreatModelComponent TypeScript type (frontend)                    │
│    - AddSystemModal component (frontend)                                │
│                                                                         │
│  MODIFY:                                                                │
│    - sync_dfd_nodes_to_components() service                             │
│    - ComponentInstanceThreat model (change FK)                          │
│    - DFD editor node edit panel                                         │
│    - CreateThreatModelForm component                                    │
│    - OrgsystemViewSet (filter out orphaned placeholder systems)         │
│                                                                         │
│  DELETE:                                                                │
│    - _get_or_create_orgsystem() function                                │
│    - Orphaned Orgsystem records (data cleanup)                          │
│    - OrgsystemComponent records (after migration)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Backend Model Changes

#### 1.1 Create ThreatModelComponent Model

**File:** `backend/apps/diagrams/models.py`

**Action:** Add new model after `ThreatModel` class

```python
class ThreatModelComponent(TimestampedModel):
    """
    Component instance within a threat model.

    Created when DFD nodes are synced. Belongs to the threat model,
    not to an Orgsystem. Cascade deletes when threat model is deleted.
    """
    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="components",
    )
    component_library = models.ForeignKey(
        "systems.ComponentLibrary",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="threat_model_instances",
    )
    name = models.CharField(max_length=255)

    # Optional external reference for CMDB/asset tracking
    external_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Asset ID from external tracking system (e.g., CI0012345, INFRA-DB-001)",
    )
    external_url = models.URLField(
        null=True,
        blank=True,
        help_text="Link to asset details (Confluence, ServiceNow, AWS Console, etc.)",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.threat_model.name})"
```

#### 1.2 Update ComponentInstanceThreat Model

**File:** `backend/apps/threats/models.py`

**Action:** Change foreign key from `OrgsystemComponent` to `ThreatModelComponent`

```python
# BEFORE:
component = models.ForeignKey(
    "systems.OrgsystemComponent",
    on_delete=models.CASCADE,
    related_name="threats",
)

# AFTER:
component = models.ForeignKey(
    "diagrams.ThreatModelComponent",
    on_delete=models.CASCADE,
    related_name="threats",
)
```

#### 1.3 Update ComponentInstanceCountermeasure Model

**File:** `backend/apps/threats/models.py`

**Action:** Same FK change as above (if it references OrgsystemComponent)

#### 1.4 Register in Admin

**File:** `backend/apps/diagrams/admin.py`

**Action:** Add admin registration for ThreatModelComponent

```python
@admin.register(ThreatModelComponent)
class ThreatModelComponentAdmin(admin.ModelAdmin):
    list_display = ["name", "threat_model", "component_library", "external_id"]
    list_filter = ["threat_model", "component_library"]
    search_fields = ["name", "external_id"]
```

---

### Phase 2: Backend Serializer Changes

#### 2.1 Create ThreatModelComponentSerializer

**File:** `backend/apps/diagrams/serializers.py`

**Action:** Add new serializer

```python
class ThreatModelComponentSerializer(serializers.ModelSerializer):
    """Serializer for ThreatModelComponent model."""

    component_library_name = serializers.CharField(
        source="component_library.name",
        read_only=True
    )
    component_library_slug = serializers.CharField(
        source="component_library.qualified_slug",
        read_only=True
    )

    class Meta:
        model = ThreatModelComponent
        fields = [
            "id",
            "threat_model",
            "component_library",
            "component_library_name",
            "component_library_slug",
            "name",
            "external_id",
            "external_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "component_library_name",
            "component_library_slug",
        ]
```

#### 2.2 Update ThreatModelSerializer

**File:** `backend/apps/diagrams/serializers.py`

**Action:** Add components to ThreatModel serializer (optional, for nested display)

```python
class ThreatModelSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    components = ThreatModelComponentSerializer(many=True, read_only=True)

    class Meta:
        model = ThreatModel
        fields = [
            # ... existing fields ...
            "components",
        ]
```

---

### Phase 3: Backend Service Changes

#### 3.1 Update sync_dfd_nodes_to_components

**File:** `backend/apps/diagrams/services.py`

**Action:** Replace OrgsystemComponent creation with ThreatModelComponent

```python
# REMOVE this import:
from apps.systems.models import ComponentLibrary, Orgsystem, OrgsystemComponent

# REPLACE with:
from apps.systems.models import ComponentLibrary
from apps.diagrams.models import ThreatModelComponent


def sync_dfd_nodes_to_components(dfd, threat_model):
    """
    Sync DFD canvas nodes to ThreatModelComponent records.

    UPDATED: Creates ThreatModelComponent (not OrgsystemComponent).
    No longer creates placeholder Orgsystem records.
    """
    canvas_data = dfd.canvas_data or {}
    nodes = canvas_data.get("nodes", [])

    if not nodes:
        return {
            "synced_count": 0,
            "created_count": 0,
            "threats_generated": 0,
            "node_component_map": {},
        }

    # REMOVED: orgsystem = _get_or_create_orgsystem(threat_model)

    analyzable_nodes = [
        node for node in nodes
        if node.get("type") in ("process", "datastore")
    ]

    synced_count = 0
    created_count = 0
    threats_generated = 0
    node_component_map = {}
    new_components = []

    with transaction.atomic():
        for node in analyzable_nodes:
            node_id = node.get("id")
            node_data = node.get("data", {})
            node_type = node.get("type")

            label = node_data.get("label", f"Unnamed {node_type}")
            technology = node_data.get("technology", "")

            existing_component_id = node_data.get("component_id")
            component_library = _find_component_library(technology, node_type)

            if not component_library:
                continue

            if existing_component_id:
                try:
                    # CHANGED: ThreatModelComponent instead of OrgsystemComponent
                    component = ThreatModelComponent.objects.get(id=existing_component_id)
                    component.name = label
                    component.component_library = component_library
                    component.save()
                    synced_count += 1
                except ThreatModelComponent.DoesNotExist:
                    # CHANGED: Create ThreatModelComponent
                    component = ThreatModelComponent.objects.create(
                        name=label,
                        threat_model=threat_model,  # Link to threat model, not orgsystem
                        component_library=component_library,
                    )
                    created_count += 1
                    new_components.append(component)
            else:
                # CHANGED: Create ThreatModelComponent
                component = ThreatModelComponent.objects.create(
                    name=label,
                    threat_model=threat_model,  # Link to threat model, not orgsystem
                    component_library=component_library,
                )
                created_count += 1
                new_components.append(component)
                synced_count += 1

            node_component_map[node_id] = component.id

        _update_canvas_with_component_ids(dfd, node_component_map)

        for component in new_components:
            if component.component_library:
                generated = _generate_threats_for_component(component)
                threats_generated += generated

    return {
        "synced_count": synced_count,
        "created_count": created_count,
        "threats_generated": threats_generated,
        "node_component_map": node_component_map,
    }


# DELETE this function entirely:
# def _get_or_create_orgsystem(threat_model):
#     ...
```

#### 3.2 Update _generate_threats_for_component

**File:** `backend/apps/diagrams/services.py`

**Action:** Ensure it works with ThreatModelComponent (check FK references)

---

### Phase 4: Backend View Changes

#### 4.1 Filter Orphaned Systems from Dropdown

**File:** `backend/apps/systems/views.py`

**Action:** Until data cleanup is complete, filter out placeholder systems

```python
class OrgsystemViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)

        # Filter out auto-generated placeholder systems
        return Orgsystem.objects.filter(
            organization_id__in=org_ids
        ).exclude(
            name__startswith="System for "  # Exclude placeholders
        ).select_related("organization")
```

**Note:** This is a temporary measure. After data cleanup, this filter can be removed.

---

### Phase 5: Database Migration

#### 5.1 Create Migration

**Command:** `python manage.py makemigrations diagrams`

**Expected migration operations:**
1. Create `ThreatModelComponent` table
2. Add FK from `ComponentInstanceThreat` to `ThreatModelComponent`

#### 5.2 Data Cleanup Script

**File:** Create `backend/scripts/cleanup_placeholder_systems.py`

```python
"""
One-time script to clean up placeholder Orgsystem records.
Run AFTER verifying no production data depends on them.
"""
from apps.systems.models import Orgsystem

def cleanup_placeholder_systems():
    # Find all placeholder systems
    placeholders = Orgsystem.objects.filter(name__startswith="System for ")

    count = placeholders.count()
    print(f"Found {count} placeholder systems to delete")

    # Delete them (will cascade to OrgsystemComponent if still linked)
    placeholders.delete()

    print(f"Deleted {count} placeholder systems")

if __name__ == "__main__":
    cleanup_placeholder_systems()
```

---

### Phase 6: Frontend Type Changes

#### 6.1 Add ThreatModelComponent Type

**File:** `frontend/src/types/index.ts`

**Action:** Add new type

```typescript
export interface ThreatModelComponent {
  id: number
  threatModel: string  // UUID of threat model
  componentLibrary: number | null
  componentLibraryName: string | null
  componentLibrarySlug: string | null
  name: string
  externalId: string | null
  externalUrl: string | null
  createdAt: string
  updatedAt: string
}
```

#### 6.2 Update System Type (if needed)

**File:** `frontend/src/types/index.ts`

**Action:** Keep as-is, System type represents real CMDB entries

---

### Phase 7: Frontend API Changes

#### 7.1 Add Component Hooks

**File:** `frontend/src/api/threat-models.ts`

**Action:** Add hooks for ThreatModelComponent

```typescript
export function useThreatModelComponents(threatModelId: string) {
  return useQuery({
    queryKey: ['threat-model-components', threatModelId],
    queryFn: () => api.get<ThreatModelComponent[]>(
      `/threat-models/${threatModelId}/components/`
    ),
    enabled: !!threatModelId,
  })
}

export function useUpdateThreatModelComponent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ThreatModelComponent> }) =>
      api.patch<ThreatModelComponent>(`/components/${id}/`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['threat-model-components'] })
    },
  })
}
```

#### 7.2 Add Create System Mutation

**File:** `frontend/src/api/threat-models.ts`

**Action:** Add mutation for inline system creation

```typescript
export function useCreateSystem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { name: string; description?: string; lifecycleState?: string }) =>
      api.post<System>('/systems/', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}
```

---

### Phase 8: Frontend Component Changes

#### 8.1 Create AddSystemModal Component

**File:** `frontend/src/components/threat-models/AddSystemModal.tsx`

**Action:** Create new component for inline system creation

```typescript
interface AddSystemModalProps {
  open: boolean
  onClose: () => void
  onSystemCreated: (system: System) => void
}

export function AddSystemModal({ open, onClose, onSystemCreated }: AddSystemModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lifecycleState, setLifecycleState] = useState('development')

  const createMutation = useCreateSystem()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newSystem = await createMutation.mutateAsync({
      name,
      description: description || undefined,
      lifecycleState,
    })
    onSystemCreated(newSystem)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New System</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {/* Form fields for name, description, lifecycleState */}
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### 8.2 Update CreateThreatModelForm

**File:** `frontend/src/components/threat-models/CreateThreatModelForm.tsx`

**Action:** Add "Add System" button when no systems available

```typescript
// Add state for modal
const [showAddSystemModal, setShowAddSystemModal] = useState(false)

// Update the Linked Systems card:
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
    ) : systems.length === 0 ? (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">
          No systems available to link.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddSystemModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New System
        </Button>
      </div>
    ) : (
      <>
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
          className="mt-2"
          onClick={() => setShowAddSystemModal(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add New System
        </Button>
      </>
    )}
  </CardContent>
</Card>

<AddSystemModal
  open={showAddSystemModal}
  onClose={() => setShowAddSystemModal(false)}
  onSystemCreated={(system) => {
    // Optionally auto-select the new system
    setSelectedSystemIds(prev => [...prev, system.id])
  }}
/>
```

#### 8.3 Update DFD Editor Node Panel

**File:** `frontend/src/features/dfd-editor/components/NodeEditPanel.tsx` (or similar)

**Action:** Add external reference fields

```typescript
// Add to the node edit form:
<Accordion type="single" collapsible>
  <AccordionItem value="external-ref">
    <AccordionTrigger>External Reference (Optional)</AccordionTrigger>
    <AccordionContent>
      <div className="space-y-3">
        <div>
          <Label htmlFor="externalId">Asset ID</Label>
          <Input
            id="externalId"
            placeholder="e.g., INFRA-API-001, CI0012345"
            value={nodeData.externalId || ''}
            onChange={(e) => updateNodeData({ externalId: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="externalUrl">URL</Label>
          <Input
            id="externalUrl"
            type="url"
            placeholder="https://confluence.company.com/..."
            value={nodeData.externalUrl || ''}
            onChange={(e) => updateNodeData({ externalUrl: e.target.value })}
          />
        </div>
      </div>
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

#### 8.4 Update ManageSystemsModal (Workspace Page)

**File:** `frontend/src/components/workspace/ManageModals.tsx`

**Context:** This modal appears on the Threat Model workspace/detail page when clicking "Manage" on the "Connected Systems" card. It shows the same placeholder systems problem.

**Action:** Add "Add New System" button when no systems available (or always show it)

```typescript
// Update ManageSystemsModal to include Add System capability:

interface ManageSystemsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectedSystems: System[]
  availableSystems: System[]
  onAdd: (systemId: string) => void
  onRemove: (systemId: string) => void
  onCreateSystem?: () => void  // NEW: callback to open AddSystemModal
}

export function ManageSystemsModal({
  open,
  onOpenChange,
  connectedSystems,
  availableSystems,
  onAdd,
  onRemove,
  onCreateSystem,  // NEW
}: ManageSystemsModalProps) {
  // ... existing code ...

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {/* ... existing header ... */}

        <div className="space-y-4 py-4">
          {/* Connected systems section - unchanged */}

          {/* Add systems section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Systems</h4>
            <Input
              placeholder="Search systems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((system) => (
                    // ... existing system list items ...
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available systems
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* NEW: Add System button */}
            {onCreateSystem && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={onCreateSystem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add New System
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Also update:** The parent component that renders `ManageSystemsModal` (likely in `RelationshipCards.tsx` or a workspace page component) needs to:
1. Import and render `AddSystemModal`
2. Pass `onCreateSystem` callback to `ManageSystemsModal`

---

### Phase 9: Implementation Order

Execute phases in this order to minimize breakage:

```
Step 1: Create ThreatModelComponent model and migration
        (existing code continues to work)

Step 2: Update serializers
        (no runtime impact yet)

Step 3: Update services.py to use ThreatModelComponent
        (new components use new model)

Step 4: Update frontend types and API hooks
        (prepare frontend)

Step 5: Update frontend components
        (UI uses new model)

Step 6: Add filter to exclude placeholder systems
        (clean up dropdown)

Step 7: Run data cleanup script
        (remove orphaned data)

Step 8: Remove temporary filter from Step 6
        (cleanup complete)
```

---

### Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/apps/diagrams/models.py` | MODIFY | Add `ThreatModelComponent` model |
| `backend/apps/diagrams/serializers.py` | MODIFY | Add `ThreatModelComponentSerializer` |
| `backend/apps/diagrams/services.py` | MODIFY | Update sync logic, remove `_get_or_create_orgsystem` |
| `backend/apps/diagrams/admin.py` | MODIFY | Register `ThreatModelComponent` |
| `backend/apps/threats/models.py` | MODIFY | Change FK to `ThreatModelComponent` |
| `backend/apps/systems/views.py` | MODIFY | Add temporary placeholder filter |
| `frontend/src/types/index.ts` | MODIFY | Add `ThreatModelComponent` type |
| `frontend/src/api/threat-models.ts` | MODIFY | Add component and system hooks |
| `frontend/src/components/threat-models/AddSystemModal.tsx` | CREATE | New modal component |
| `frontend/src/components/threat-models/CreateThreatModelForm.tsx` | MODIFY | Add inline system creation |
| `frontend/src/components/workspace/ManageModals.tsx` | MODIFY | Add "Add New System" to ManageSystemsModal |
| `frontend/src/features/dfd-editor/components/NodeEditPanel.tsx` | MODIFY | Add external reference fields |

---

### Testing Checklist

- [ ] Create threat model without linking systems (should work)
- [ ] Create threat model and link to existing system (should work)
- [ ] Create new system via inline modal on Create page (should work)
- [ ] Add nodes to DFD without technology (no component created)
- [ ] Add nodes to DFD with technology (ThreatModelComponent created)
- [ ] Delete threat model (components cascade delete)
- [ ] "Linked Systems" dropdown on Create page shows only real systems (no "System for X")
- [ ] "Manage Connected Systems" modal on Workspace page shows only real systems
- [ ] Create new system via "Add New System" button on Workspace page (should work)
- [ ] External reference fields save and display correctly
- [ ] Threats are properly linked to ThreatModelComponent
