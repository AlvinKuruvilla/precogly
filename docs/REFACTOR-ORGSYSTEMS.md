# Refactor: Components & Systems Architecture

## The Problem

### What's Happening

When a user saves a DFD that contains nodes with technology assigned, the system auto-creates a placeholder `Orgsystem` record:

```
User creates threat model: "HR System"
User creates DFD and adds nodes to canvas
User assigns technology to a node
User saves DFD
                    │
                    ▼
System auto-creates: Orgsystem(name="System for HR System")
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
User creates: DFD and adds nodes with technology
User saves:   DFD
                    │
                    ▼
System auto-creates: Orgsystem "System for Test Model"
                    │
                    ▼
User deletes: Threat Model "Test Model"
                    │
                    ▼
Orgsystem "System for Test Model" remains in database forever
```

**Issue 3: User has no control**

Systems are created without user knowledge or consent. Users never chose to create these systems - they just wanted to draw a diagram.

---

### Current Data Model

```
┌─────────────────────┐
│     Orgsystem       │ ◄──── Auto-created as "System for {TM.name}"
│  (placeholder)      │
└──────────┬──────────┘
           │
           │ FK (required)  ◄──── THE PROBLEM: This FK is required
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

**The Hack**: `_get_or_create_orgsystem()` in `services.py`

```python
def _get_or_create_orgsystem(threat_model):
    orgsystem, _ = Orgsystem.objects.get_or_create(
        name=f"System for {threat_model.name}",  # <-- The problem
        organization=threat_model.organization,
    )
    return orgsystem
```

---

## The Solution

### Core Insight

The root cause is that `OrgsystemComponent.orgsystem` is a **required** FK. This forces the system to create placeholder `Orgsystem` records just to satisfy the constraint.

**Fix**: Make the FK nullable. Components can exist without belonging to a system.

---

### What We're Doing

1. **Make `OrgsystemComponent.orgsystem` nullable** - Components can exist without a system
2. **Stop auto-creating placeholder systems** - Remove `_get_or_create_orgsystem()`
3. **Allow multiple systems per threat model** - Already supported via `ThreatModelOrgsystem` M:M
4. **Add explicit "No system yet" option** - Make it an intentional choice, not just an empty field
5. **Add UI to link component → system** - Users can assign components to systems from node edit panel (only shown when threat model has linked systems)

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
│                     │              └─────────────────────┘
│ Manually created    │
│ or imported         │
└──────────┬──────────┘
           │
           │ FK (NOW NULLABLE)  ◄──── THE FIX
           │
           ▼
┌─────────────────────┐
│ OrgsystemComponent  │
│                     │
│ - orgsystem (FK)    │  ◄──── null = "not linked to any system"
│ - component_library │
│ - name              │
└──────────┬──────────┘
           │
           │ FK (unchanged)
           ▼
┌─────────────────────┐
│ ComponentInstance   │
│ Threat/Countermeas. │
└─────────────────────┘
```

**Key Changes:**

| Before | After |
|--------|-------|
| `OrgsystemComponent.orgsystem` required | `OrgsystemComponent.orgsystem` nullable |
| Auto-create placeholder `Orgsystem` | No auto-creation |
| "System for X" pollutes dropdown | Only real systems appear |
| User has no control | User explicitly chooses system linkage |

---

### Use Cases Supported

**Use Case 1: Threat modeling a system that doesn't exist yet**

```
User creates threat model: "New Payment Gateway"
User draws DFD with components
                    │
                    ▼
Components created with orgsystem=NULL
No placeholder system created
User can create/link a real system later when ready
```

**Use Case 2: Process threat modeling across multiple systems**

```
User creates threat model: "Sign-in Flow"
User links to existing systems: "Web Portal", "Auth Service", "User Database"
                    │
                    ▼
ThreatModelOrgsystem M:M links created
Components can optionally be assigned to specific systems
```

**Use Case 3: Single system, single threat model**

```
User creates threat model: "Payment Processing"
User creates/selects system: "Payment Processing System"
                    │
                    ▼
ThreatModelOrgsystem link created
Components can be assigned to that system
```

---

### Frontend UX Changes

#### Threat Model Creation

Update the "Linked Systems" section to provide explicit choices:

```
┌─────────────────────────────────────────────────────────┐
│ Linked Systems                                          │
│                                                         │
│ ○ Link to existing system(s)                           │
│   [Search and select systems...              ▼]        │
│                                                         │
│ ○ Create new system                                     │
│   [Opens AddSystemModal]                                │
│                                                         │
│ ○ No system yet                                         │
│   This threat model doesn't map to a specific system   │
│   (e.g., process flows, integrations, early design)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Component Edit Panel (System Assignment)

Allow users to assign a component to a specific system. **Only shown when the threat model has linked system(s).**

```
┌─────────────────────────────────┐
│ Edit Component                  │
├─────────────────────────────────┤
│ Name: [API Gateway           ]  │
│ Technology: [AWS API Gateway ▼] │
│                                 │
│ System: [Payment System      ▼] │  ◄── Only shown if threat model
│         - Not assigned           │      has linked systems
│         - Payment System         │
│         - Auth Service           │
│                                 │
│              [Cancel] [Save]    │
└─────────────────────────────────┘
```

**Conditional display logic:**
- Threat model has linked systems → Show "System" dropdown with options + "Not assigned"
- Threat model has no linked systems → Don't show the field at all

---

## Technical Implementation

### Phase 1: Backend Model Change

**File:** `backend/apps/systems/models.py`

**Action:** Make `orgsystem` FK nullable

```python
class OrgsystemComponent(TimestampedModel):
    """Component instance in an orgsystem."""

    orgsystem = models.ForeignKey(
        Orgsystem,
        on_delete=models.CASCADE,
        related_name="components",
        null=True,      # ADD THIS
        blank=True,     # ADD THIS
    )
    # ... rest unchanged
```

---

### Phase 2: Backend Service Change

**File:** `backend/apps/diagrams/services.py`

**Action:** Remove auto-creation of placeholder systems

```python
def sync_dfd_nodes_to_components(dfd, threat_model):
    """
    Sync DFD canvas nodes to OrgsystemComponent records.

    UPDATED: No longer creates placeholder Orgsystem records.
    Components are created with orgsystem=NULL.
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
                    component = OrgsystemComponent.objects.get(id=existing_component_id)
                    component.name = label
                    component.component_library = component_library
                    component.save()
                    synced_count += 1
                except OrgsystemComponent.DoesNotExist:
                    component = OrgsystemComponent.objects.create(
                        name=label,
                        orgsystem=None,  # CHANGED: No system assigned
                        component_library=component_library,
                    )
                    created_count += 1
                    new_components.append(component)
            else:
                component = OrgsystemComponent.objects.create(
                    name=label,
                    orgsystem=None,  # CHANGED: No system assigned
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

---

### Phase 3: Database Migration

**Command:** `python manage.py makemigrations systems`

**Expected migration:**

```python
class Migration(migrations.Migration):
    dependencies = [
        ('systems', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='orgsystemcomponent',
            name='orgsystem',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='components',
                to='systems.orgsystem',
            ),
        ),
    ]
```

---

### Phase 4: Data Cleanup Migration

**File:** Create `backend/apps/systems/migrations/XXXX_cleanup_placeholder_systems.py`

```python
"""
Data migration to clean up placeholder Orgsystem records.

1. Set orgsystem=NULL for components belonging to placeholder systems
2. Delete placeholder systems (those starting with "System for ")
"""
from django.db import migrations


def cleanup_placeholder_systems(apps, schema_editor):
    Orgsystem = apps.get_model('systems', 'Orgsystem')
    OrgsystemComponent = apps.get_model('systems', 'OrgsystemComponent')

    # Find placeholder systems
    placeholders = Orgsystem.objects.filter(name__startswith="System for ")
    placeholder_ids = list(placeholders.values_list('id', flat=True))

    # Unlink components from placeholder systems
    OrgsystemComponent.objects.filter(
        orgsystem_id__in=placeholder_ids
    ).update(orgsystem=None)

    # Delete placeholder systems
    deleted_count = placeholders.delete()[0]
    print(f"Cleaned up {deleted_count} placeholder systems")


def reverse_cleanup(apps, schema_editor):
    # Cannot reverse - placeholder systems are gone
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('systems', 'XXXX_make_orgsystem_nullable'),  # Previous migration
    ]

    operations = [
        migrations.RunPython(cleanup_placeholder_systems, reverse_cleanup),
    ]
```

---

### Phase 5: Frontend Changes

#### 5.1 Update CreateThreatModelForm

**File:** `frontend/src/components/threat-models/CreateThreatModelForm.tsx`

**Action:** Add explicit system linking options

```typescript
type SystemLinkOption = 'existing' | 'create' | 'none'

// In component:
const [systemLinkOption, setSystemLinkOption] = useState<SystemLinkOption>('none')
const [showAddSystemModal, setShowAddSystemModal] = useState(false)

// In JSX:
<Card>
  <CardHeader>
    <CardTitle>Linked Systems</CardTitle>
    <CardDescription>
      Optionally link this threat model to systems from your CMDB.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <RadioGroup value={systemLinkOption} onValueChange={setSystemLinkOption}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="existing" id="existing" />
        <Label htmlFor="existing">Link to existing system(s)</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="create" id="create" />
        <Label htmlFor="create">Create new system</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="none" id="none" />
        <Label htmlFor="none">No system yet</Label>
      </div>
    </RadioGroup>

    {systemLinkOption === 'existing' && (
      <MultiSelectCombobox
        options={systemOptions}
        selected={selectedSystemIds.map(String)}
        onChange={handleSystemsChange}
        placeholder="Search and select systems..."
      />
    )}

    {systemLinkOption === 'create' && (
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowAddSystemModal(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Create New System
      </Button>
    )}

    {systemLinkOption === 'none' && (
      <p className="text-sm text-muted-foreground">
        This threat model won't be linked to any system. You can add systems later.
      </p>
    )}
  </CardContent>
</Card>
```

#### 5.2 Create AddSystemModal (if not exists)

**File:** `frontend/src/components/threat-models/AddSystemModal.tsx`

Standard modal for creating a new system with name, description, lifecycle state fields.

---

### Phase 6: Component → System Assignment UI

#### 6.1 Update Node Edit Panel

**File:** `frontend/src/features/dfd-editor/components/NodeEditPanel.tsx` (or similar)

**Action:** Add system assignment dropdown, conditionally shown

```typescript
// Get linked systems for this threat model
const { data: linkedSystems } = useThreatModelSystems(threatModelId)
const hasLinkedSystems = linkedSystems && linkedSystems.length > 0

// In JSX (only render if threat model has linked systems):
{hasLinkedSystems && (
  <div className="space-y-2">
    <Label htmlFor="system">System</Label>
    <Select
      value={nodeData.orgsystemId?.toString() || 'none'}
      onValueChange={(value) =>
        updateNodeData({ orgsystemId: value === 'none' ? null : parseInt(value) })
      }
    >
      <SelectTrigger>
        <SelectValue placeholder="Not assigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Not assigned</SelectItem>
        {linkedSystems.map((system) => (
          <SelectItem key={system.id} value={system.id.toString()}>
            {system.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      Assign this component to a linked system
    </p>
  </div>
)}
```

#### 6.2 Update sync service to preserve system assignment

**File:** `backend/apps/diagrams/services.py`

**Action:** When syncing nodes, preserve existing `orgsystem` if set

```python
# In sync_dfd_nodes_to_components():

if existing_component_id:
    try:
        component = OrgsystemComponent.objects.get(id=existing_component_id)
        component.name = label
        component.component_library = component_library
        # NOTE: Don't overwrite orgsystem - preserve user's assignment
        component.save()
        synced_count += 1
    except OrgsystemComponent.DoesNotExist:
        # ... create new with orgsystem=None
```

#### 6.3 Add API endpoint for component system assignment

**File:** `backend/apps/systems/views.py`

**Action:** Add endpoint to update component's system

```python
class OrgsystemComponentViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    @action(detail=True, methods=['patch'])
    def assign_system(self, request, pk=None):
        """Assign a component to a system (or unassign with null)."""
        component = self.get_object()
        system_id = request.data.get('orgsystem_id')

        if system_id:
            # Validate system belongs to user's org
            system = get_object_or_404(Orgsystem, id=system_id)
            component.orgsystem = system
        else:
            component.orgsystem = None

        component.save()
        return Response({'status': 'updated'})
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| `OrgsystemComponent.orgsystem` | Required FK | Nullable FK |
| Placeholder systems | Auto-created | Never created |
| User control | None | Explicit choice |
| Component → System assignment | Not possible | Via node edit panel (conditional) |
| New models | None needed | None needed |
| Migration risk | Low | Low |

---

## Testing Checklist

- [ ] Create threat model with "No system yet" option
- [ ] Create threat model and link to existing system(s)
- [ ] Create threat model and create new system inline
- [ ] Add nodes to DFD with technology → component created with `orgsystem=NULL`
- [ ] "Linked Systems" dropdown shows only real systems (no "System for X")
- [ ] Existing threat/countermeasure functionality unchanged
- [ ] DataFlow functionality unchanged
- [ ] Delete threat model → components remain (now orphaned, but not broken)
- [ ] Node edit panel: "System" dropdown hidden when threat model has no linked systems
- [ ] Node edit panel: "System" dropdown shown when threat model has linked systems
- [ ] Assign component to system via node edit panel → persists on save
- [ ] Change component system assignment → preserved after DFD re-save

---

## Future Enhancements (Optional)

1. **Bulk assignment**: "Assign all components in this DFD to system X"
2. **Orphan cleanup**: Periodic job to clean up components not referenced by any DFD
