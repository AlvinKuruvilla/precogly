# Precogly – Remove Multi-Tenancy Complexity

## 1. Context

The current codebase is designed for a multi-tenant SaaS deployment where:
- Multiple organizations share the same database
- Library items (components, threats, countermeasures) are global and shared
- Each org "installs" packs to track which ones they use
- Soft-delete prevents breaking other orgs' data

**Reality:** In the initial product lifecycle, this will NOT be a SaaS product. Individual organizations will download and install the code for their own threat modeling needs. Only one organization exists per deployment.

## 2. Goal

Simplify the system for single-organization deployments by removing unnecessary multi-tenancy complexity while preserving the ability to re-add it later if we move to SaaS.

## 3. Current State (Multi-Tenant Design)

### 3.1 Pack Installation Flow

```
YAML files (source of truth)
     │
     ▼
Import (global) ──────────────────────────────────┐
     │                                            │
     ▼                                            ▼
LibraryPack                              ComponentLibrary (organization=null)
     │                                   ThreatLibrary (organization=null)
     │                                   CountermeasureLibrary (organization=null)
     ▼
Install (per-org)
     │
     ▼
OrganizationPackInstallation (links org → pack)
```

### 3.2 Models with `organization` FK

| Model | Purpose of `organization` field |
|-------|--------------------------------|
| `ComponentLibrary` | Null = global/shared, Set = org-specific custom |
| `ThreatLibrary` | Null = global/shared, Set = org-specific custom |
| `CountermeasureLibrary` | Null = global/shared, Set = org-specific custom |
| `DFDTemplatesLibrary` | Null = master template, Set = org-specific copy |
| `TrustBoundary` | Null = global, Set = org-specific |
| `VerificationTest` | Null = global, Set = org-specific |

### 3.3 Multi-Tenant Tracking Tables

| Table | Purpose |
|-------|---------|
| `OrganizationPackInstallation` | Tracks which orgs have which packs installed |
| `LibraryPackDependency` | Pack dependency graph |
| `PendingFrameworkOverlay` | Overlays waiting for framework installation |

### 3.4 Soft-Delete Pattern

Library items have `is_deleted` and `deleted_at` fields to support:
- Uninstalling packs without breaking other orgs' instances
- Re-installing packs and restoring soft-deleted items

Current state shows this has side effects:
- 243 of 245 ComponentLibrary records are soft-deleted
- 28 of 32 ThreatLibrary records are soft-deleted

## 4. Target State (Single-Org Design)

### 4.1 Simplified Pack Flow

```
YAML files (source of truth)
     │
     ▼
Import ──────────────────────────────────────────┐
     │                                           │
     ▼                                           ▼
LibraryPack (is_imported=true)          ComponentLibrary
                                        ThreatLibrary
                                        CountermeasureLibrary
```

- No separate "install" step
- No `OrganizationPackInstallation` table
- Library items belong to "the system" (no org FK needed)

### 4.2 Simplified Models

Remove `organization` FK from:
- `ComponentLibrary`
- `ThreatLibrary`
- `CountermeasureLibrary`
- `DFDTemplatesLibrary`
- `TrustBoundary`
- `VerificationTest`

### 4.3 Remove Soft-Delete

With only one org, we can safely hard-delete library items:
- When uninstalling a pack, delete library items
- Instances that reference deleted library items become "orphaned/custom" (FK set to NULL)
- Remove `is_deleted` and `deleted_at` fields from library models

### 4.4 Instance Self-Sufficiency

**Critical Design Decision:** When a library item is deleted, instances must survive.

Currently, instances rely on their library FK for metadata (category, type, etc.). We need to copy this metadata to instances at creation time so they remain self-sufficient if orphaned.

**Model changes required:**

```python
class OrgsystemComponent(TimestampedModel):
    component_library = models.ForeignKey(..., null=True, on_delete=models.SET_NULL)
    name = models.CharField(max_length=255)  # Already exists
    # ADD: Copy from library on create, so orphaned instances have metadata
    category = models.CharField(max_length=20, blank=True)
    component_type = models.CharField(max_length=100, blank=True)
    provider = models.CharField(max_length=100, blank=True)

class ComponentInstanceThreat(TimestampedModel):
    threat_library = models.ForeignKey(..., null=True, on_delete=models.SET_NULL)
    # ADD: Copy from library on create
    threat_name = models.CharField(max_length=255, blank=True)
    threat_description = models.TextField(blank=True)
    stride_category = models.CharField(max_length=30, blank=True)

class ComponentInstanceCountermeasure(TimestampedModel):
    countermeasure_library = models.ForeignKey(..., null=True, on_delete=models.SET_NULL)
    # ADD: Copy from library on create
    countermeasure_name = models.CharField(max_length=255, blank=True)
    countermeasure_description = models.TextField(blank=True)
    control_type = models.CharField(max_length=20, blank=True)
```

This ensures:
- If library is deleted, instance still has all metadata needed for display
- UI can show "Custom Component" badge when `component_library` is NULL
- No data loss, no broken diagrams

### 4.5 Tables to Remove/Simplify

| Table | Action |
|-------|--------|
| `OrganizationPackInstallation` | Remove entirely |
| `Organization` | **Keep as singleton** - global settings, user management, audit anchor |
| `Team` | **Keep** - still useful for user grouping within single org |
| `LibraryPackDependency` | Keep (still useful for pack dependencies) |
| `PendingFrameworkOverlay` | Keep (still useful) |

**Note on Teams:** Even in single-org deployment, Teams are useful for:
- Grouping users (e.g., "Security Team" vs "Dev Team")
- Assigning ownership of threat models (`ThreatModel.owning_team`)
- Future RBAC within the organization

`isMultiOrg` will always be `false`, but `isMultiTeam` may still be `true`.
This is expected behavior - teams exist within the single org.

## 5. Implementation Plan

### Phase 1: Database Cleanup

1. **Remove soft-deleted records**
   ```sql
   DELETE FROM systems_componentlibrary WHERE is_deleted = true;
   DELETE FROM threats_threatlibrary WHERE is_deleted = true;
   DELETE FROM threats_countermeasurelibrary WHERE is_deleted = true;
   DELETE FROM diagrams_dfdtemplateslibrary WHERE is_deleted = true;
   ```

2. **Remove OrganizationPackInstallation records**
   ```sql
   DROP TABLE packs_organizationpackinstallation;
   ```

### Phase 2: Model Changes

1. **Remove `organization` FK from library models**
   - `ComponentLibrary`: Remove `organization` field
   - `ThreatLibrary`: Remove `organization` field
   - `CountermeasureLibrary`: Remove `organization` field
   - `DFDTemplatesLibrary`: Remove `organization` field
   - `TrustBoundary`: Remove `organization` field
   - `VerificationTest`: Remove `organization` field

   > **Note:** Keep `LibraryPack.owner_organization` - this is used for private/internal
   > packs and is still useful in single-org deployments.

2. **Update `qualified_slug` generation in save() methods**

   Library models have `save()` methods that use `self.organization` to generate `qualified_slug`:

   ```python
   # CURRENT (systems/models.py, threats/models.py, diagrams/models.py):
   def save(self, *args, **kwargs):
       if not self.qualified_slug and self.slug:
           if self.source_pack:
               self.qualified_slug = f"{self.source_pack.slug}/{self.slug}"
           elif self.organization:  # <-- REMOVE THIS BRANCH
               self.qualified_slug = f"org-{self.organization.id}/{self.slug}"
           else:
               self.qualified_slug = f"global/{self.slug}"
   ```

   **Update to:**
   ```python
   def save(self, *args, **kwargs):
       if not self.qualified_slug and self.slug:
           if self.source_pack:
               self.qualified_slug = f"{self.source_pack.slug}/{self.slug}"
           else:
               self.qualified_slug = f"custom/{self.slug}"  # For user-created items
   ```

   Models requiring this change:
   - `ComponentLibrary.save()`
   - `ThreatLibrary.save()`
   - `CountermeasureLibrary.save()`
   - `DFDTemplatesLibrary.save()`

3. **Remove soft-delete fields from library models**
   - Remove `is_deleted` field
   - Remove `deleted_at` field
   - Update unique constraints (remove `is_deleted=False` condition)

4. **Update FK relationships to SET_NULL**

   > **DANGER ZONE: NEVER USE CASCADE HERE**
   >
   > If you use `on_delete=CASCADE` and a user uninstalls a pack, every component
   > in their existing threat models that used that pack will instantly vanish.
   > Their diagrams will break. All countermeasure work will be lost.
   >
   > **Always use `on_delete=SET_NULL` for library references.**

   Changes required:
   - `OrgsystemComponent.component_library`: Change from `PROTECT` to `SET_NULL`
   - `ComponentInstanceThreat.threat_library`: Change from `PROTECT` to `SET_NULL`
   - `ComponentInstanceCountermeasure.countermeasure_library`: Change from `PROTECT` to `SET_NULL`
   - `FlowInstanceCountermeasure.countermeasure_library`: Change from `PROTECT` to `SET_NULL`
   - `DataFlowInstanceThreat.threat_library`: Change from `PROTECT` to `SET_NULL`

   When library items are deleted:
   - Instances survive with `*_library_id = NULL`
   - They become "orphaned" or "custom" items
   - UI shows them as "Custom Component" / "Custom Threat" etc.
   - All user work (countermeasure status, assignments, notes) is preserved

5. **Add metadata fields to instance models (for self-sufficiency)**

   Copy metadata from library to instance at creation time:

   ```python
   # OrgsystemComponent - add fields:
   category = models.CharField(max_length=20, blank=True)
   component_type = models.CharField(max_length=100, blank=True)
   provider = models.CharField(max_length=100, blank=True)

   # ComponentInstanceThreat - add fields:
   threat_name = models.CharField(max_length=255, blank=True)
   threat_description = models.TextField(blank=True)
   stride_category = models.CharField(max_length=30, blank=True)

   # ComponentInstanceCountermeasure - add fields:
   countermeasure_name = models.CharField(max_length=255, blank=True)
   countermeasure_description = models.TextField(blank=True)
   control_type = models.CharField(max_length=20, blank=True)
   ```

   On instance creation, populate these from the library item. This ensures
   orphaned instances remain fully displayable.

### Phase 3: Service Layer Changes

1. **Simplify `apps/packs/services.py`**
   - Remove `_create_installation()` function
   - Remove `_restore_library_items()` function
   - Remove `_soft_delete_pack_items()` function
   - Remove `_copy_templates_for_organization()` function
   - Merge import + install into single operation
   - Add hard-delete on uninstall

2. **API Endpoint Changes**

   | Endpoint | Action |
   |----------|--------|
   | `/installed-packs/` | **Remove entirely** |
   | `/installed-packs/{id}/` | **Remove entirely** |
   | `/installed-packs/{id}/check_usage/` | **Remove entirely** |
   | `/installed-packs/{id}/active_overlays/` | Move to `/packs/{id}/active_overlays/` |
   | `/packs/{id}/install_for_org/` | **Remove entirely** |
   | `/packs/{id}/install/` | Rename to "import", no installation record |
   | `/packs/{id}/uninstall/` | Hard-delete library items (with SET_NULL for instances) |

3. **Update queries throughout codebase**
   - Remove `is_deleted=False` filters
   - Remove `organization=org` or `organization__isnull=True` filters

### Phase 4: Frontend Changes

1. **Simplify pack management UI**
   - Remove "Install" vs "Import" distinction
   - Single action: "Add Pack" / "Remove Pack"

2. **Frontend Hooks to Update/Remove**

   | Hook/File | Current Usage | Action |
   |-----------|---------------|--------|
   | `useInstalledPacks()` | Fetches `/installed-packs/` | **Remove** - use `usePacks()` instead |
   | `useInstallPack()` | Creates OrganizationPackInstallation | **Rework** - just imports pack |
   | `useUninstallPack()` | Deletes from `/installed-packs/{id}/` | **Rework** - calls pack delete |
   | `usePackUsage()` | Checks `/installed-packs/{id}/check_usage/` | **Remove or simplify** |
   | `useActiveOverlays()` | Fetches `/installed-packs/{id}/active_overlays/` | **Update endpoint** |
   | `useInstallPackForOrg()` | POST `/packs/{id}/install_for_org/` | **Remove entirely** |
   | `WorkspaceContext.tsx` | Manages org/team selection | **Simplify** - single org assumed |

3. **Remove org-scoping from API calls**
   - Library endpoints don't need org filtering
   - Remove organization ID from request headers/params where used for scoping

## 6. Migration Strategy

**All current data is test data.** Clean migration is the simplest approach:

1. Delete database
2. Apply new simplified schema (fresh Django migrations)
3. Create singleton Organization
4. Import packs from YAML

```bash
# Migration steps
python manage.py flush --no-input  # Or drop/recreate DB
python manage.py migrate
python manage.py create_org "My Company"  # New management command
python manage.py import_pack aws-mini
python manage.py import_pack owasp
# etc.
```

No need for complex in-place migration since we're starting fresh.

## 7. Preserving SaaS Upgrade Path

If we later need to support multi-tenancy:

1. **Keep `Organization` model** - Just assume single org for now
2. **Keep `Orgsystem` model** - Systems within an org still make sense
3. **Document the pattern** - This document serves as a guide for re-adding multi-tenancy
4. **Use feature flags** - Could add `MULTI_TENANT_MODE` setting later

Re-adding multi-tenancy would involve:
- Adding `organization` FK back to library models
- Re-implementing `OrganizationPackInstallation`
- Adding soft-delete back
- Adding org-scoped queries

## 8. Benefits of Simplification

| Aspect | Before | After |
|--------|--------|-------|
| Pack installation | 2 steps (import + install) | 1 step (import) |
| Library queries | Filter by `is_deleted=False` and org | Direct queries |
| Uninstall behavior | Soft-delete, complex restore logic | Hard-delete, simple |
| Mental model | "Global vs org-specific" | "Everything is mine" |
| Database size | Accumulates soft-deleted records | Clean, only active records |

## 9. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss on uninstall | Use `SET_NULL` for library FKs - instances survive as orphans |
| Accidental CASCADE delete | **NEVER use CASCADE on library FKs** - explicitly documented above |
| Orphaned instances display | Copy metadata to instances at creation; show "Custom" badge in UI |
| Harder to add SaaS later | Document current multi-tenant design; keep key abstractions |

**Note:** Migration risk is low since all current data is test data. We're doing a clean database reset.

## 10. Open Questions

1. ~~**Should we keep `Organization` model at all?**~~

   **RESOLVED:** YES, keep it as a **singleton**. Reasons:
   - **Global Settings Container** - Company name, logo, default risk methodology, report branding
   - **Compliance & Audit** - Scope of installation, data residency, audit trail anchor
   - **User Management** - Users/teams already reference org, no need to refactor auth
   - **Future-Proof** - RBAC within single tenant, easier SaaS migration later

   **Implementation:**
   ```python
   class OrganizationManager(models.Manager):
       def get_current(self):
           """Get the singleton organization."""
           org = self.first()
           if not org:
               raise RuntimeError("No organization configured. Run setup.")
           return org

   class Organization(TimestampedModel):
       objects = OrganizationManager()
   ```

   Usage: `org = Organization.objects.get_current()`

2. ~~**What happens to library items when uninstalling a pack with active instances?**~~

   **RESOLVED:** Use `SET_NULL`. Instances become orphaned but survive.
   - ~~Option A: Block uninstall until instances deleted~~
   - ~~Option B: Cascade delete instances (dangerous)~~ **NEVER DO THIS**
   - **Option C: Orphan instances (set FK to null)** ✓ CHOSEN

3. ~~**Should templates be copied or referenced?**~~

   **RESOLVED:** Use **reference + fork-on-edit** pattern.

   **Current behavior (remove):**
   - Pack install → copy templates to org-specific copies
   - Each org has their own copy from the start
   - Uninstall deletes the org's copy

   **New behavior:**
   - Templates stay as master copies in `DFDTemplatesLibrary`
   - Users browse master templates in picker
   - Creating a DFD from template → DFD gets canvas_data copy (already works this way)
   - User wants to customize THE TEMPLATE itself? → Fork to "Custom Template"

   **Implementation:**
   ```python
   class DFDTemplatesLibrary(TimestampedModel):
       source_pack = models.ForeignKey(LibraryPack, null=True, ...)  # Library template
       forked_from = models.ForeignKey('self', null=True, ...)       # If custom/forked
       is_custom = models.BooleanField(default=False)

       # source_pack set, is_custom=False → Library template
       # forked_from set, is_custom=True  → Custom (forked) template
   ```

   **Benefits:**
   - No upfront duplication (most users never customize templates)
   - Simpler install/uninstall (no copy/delete operations)
   - Updates propagate (if pack updates template, users get it unless forked)
   - Clear ownership: "Library Template" vs "My Custom Template"

---

*Created: 2025-01-27*
*Updated: 2025-01-27*
*Status: Ready for Implementation - All key decisions made:*
- *Q1: Keep Organization as singleton* ✓
- *Q2: Use SET_NULL for library FKs* ✓
- *Q3: Templates use reference + fork-on-edit* ✓
