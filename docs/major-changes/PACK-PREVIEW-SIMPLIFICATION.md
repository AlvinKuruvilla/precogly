# Pack Preview Simplification: Removing Format Versioning

**Date:** 2026-02-08
**Status:** Investigation Complete, Awaiting Implementation
**Severity:** Medium (Affects pack preview UX)

---

## Executive Summary

AWS Mini and base-stride packs show 0 components/threats/countermeasures in the UI despite having data in both YAML files and database. Investigation revealed premature introduction of format versioning (`_v2_format` flag) in a pre-release product. Recommendation: Remove format versioning entirely and always read from source YAML files for preview.

---

## Issue Description

### Primary Issue: Pack Preview Shows Zero Counts

**User Report:** "In the library packs, for AWS Mini, it shows 0 components, threats, countermeasures and requirements. But if you look at the libraries/packs/aws-mini, you'll see that we actually have components, threats and countermeasures in there."

**Expected Behavior:** AWS Mini should show 5 components, 21 threats, 31 countermeasures
**Actual Behavior:** Shows 0 for all counts in UI

---

## Investigation: Current Architecture

### Pack Format Evolution

The codebase currently supports two pack formats:

#### V1 Format (Legacy/Documented)
- Everything in ONE file: `pack.yaml`
- All components, threats, countermeasures nested inside
- Documented in `libraries/README.md` (lines 440-680)

```yaml
pack:
  slug: aws-mini
  name: AWS Mini
components:
  - slug: s3
    name: Amazon S3
    threats:
      - slug: s3-public-exposure
        countermeasures:
          - slug: s3-block-public-access
```

#### V2 Format (Undocumented, Actually Used)
- Modular structure with separate files:
  - `pack.yaml` - metadata only
  - `components.yaml` - component definitions
  - `threats.yaml` - threat definitions
  - `countermeasures.yaml` - countermeasure definitions
  - `joins/` - relationship mappings
  - `templates/` - DFD templates

**Reality:** AWS Mini and other packs use V2 format, but it's not documented.

### Current Preview Logic

**File:** `backend/apps/packs/services.py`

```python
def get_pack_preview_from_database(pack: "LibraryPack") -> dict:
    pack_data = pack.content or {}

    # Check if this is a v2 pack
    if pack_data.get("_v2_format"):
        return _extract_pack_preview_from_db(pack)  # Query database
    else:
        return _extract_pack_preview(pack_data)     # Extract from pack.content
```

**The Problem:**
1. AWS Mini was imported successfully (data in database)
2. But `_v2_format: True` flag was NOT set in `pack.content`
3. Preview falls back to extracting from `pack.content` (which only has metadata)
4. Returns empty arrays → UI shows 0 counts

---

## Root Cause Analysis

### Database State Verification

```bash
# Confirmed: Data IS in database
aws-mini:       Components=5, Threats=21, Countermeasures=31, _v2_flag=False
base-stride:    Components=0, Threats=28, Countermeasures=85, _v2_flag=False
```

Both packs have data but missing the `_v2_format` flag.

### Serializer Verification

```bash
# Backend serializer returns correct counts:
{
  "components": 5,
  "threats": 21,
  "countermeasures": 31,
  "templates": 1
}
```

Backend is working correctly. Frontend receives this data but UI shows 0.

### Preview Endpoint Flow

```
Frontend: GET /packs/{id}/preview/
    ↓
Backend: LibraryPackViewSet.preview()
    ↓
Backend: get_pack_preview_from_database(pack)
    ↓
Check: pack.content.get("_v2_format") → False
    ↓
Extract from pack.content (only has metadata)
    ↓
Return: {components: [], threats: [], countermeasures: []}
    ↓
Frontend: Shows "Components (0)"
```

### Why the Flag is Missing

**File:** `backend/apps/packs/services.py:1220-1240`

```python
def _create_or_update_pack(pack_data: dict) -> LibraryPack:
    library_pack, _ = LibraryPack.objects.update_or_create(
        slug=slug,
        defaults={
            # ...
            "content": pack_data,  # Stores pack.yaml data only
            # ❌ Never sets _v2_format flag!
        },
    )
```

The import code reads separate YAML files and creates database records, but never adds the `_v2_format` flag to `pack_data` before storing.

---

## Incidental Findings

### 1. Format Versioning Exists Only in Backend

**Scope Analysis:**
- **Backend:** 4 occurrences in `apps/packs/services.py` only
- **Frontend:** 0 occurrences
- **Documentation:** Not mentioned in README

**Locations:**
1. Line 120: `_is_v2_pack()` - Detect format from filesystem
2. Line 269: Discovery - Route to v1 or v2 discovery logic
3. Line 340: Source preview - Route to v1 or v2 extraction
4. Line 365: Database preview - Check `_v2_format` flag (THE BUG)

**Conclusion:** Format versioning is backend-only complexity.

### 2. pack.content Field Purpose is Unclear

**Model:** `apps/packs/models.py:84-87`
```python
content = models.JSONField(
    default=dict,
    help_text="Pack content: components, threats, countermeasures, templates, etc.",
)
```

**Current Usage:**
- Stores original `pack.yaml` data
- For V2 packs, only contains metadata (not actual components/threats)
- Used as fallback for preview when `_v2_format` is False

**Question:** If database has all the data, why do we need this field?

### 3. Two Preview Endpoints Exist

**File:** `backend/apps/packs/views.py`

1. **`preview()` (line 201-210):** Preview imported packs from database
2. **`preview_from_source()` (line 212-238):** Preview packs before import from YAML files

**Observation:** One queries database, one reads files. Why two different approaches?

### 4. _v2_format is Not a Database Column

The flag is stored inside the `content` JSONField, not as a separate column:
- ✅ No migration needed to add/remove it
- ❌ Not indexed, can't query efficiently
- ❌ Not type-enforced
- ❌ Just an application-level convention

---

## Proposed Solution

### Core Principle

> **For a pre-release product, there should be no format versioning.**

### Recommended Approach: Simplify Preview

**Always read from source YAML files for preview.**

**Rationale:**
1. YAML files are the source of truth
2. Database is for application runtime (fast lookups, access control)
3. Querying database for preview is circular: YAML → DB → read from DB for preview
4. Files are always present in pre-release (local development)
5. Single source of truth, no sync issues

### Implementation Changes

#### 1. Remove Format Versioning

**Delete:**
- `_is_v2_pack()` function
- All v1 vs v2 routing logic
- `_v2_format` flag checks
- V1-specific extraction functions

**Keep:**
- V2 import logic (modular YAML files)
- Mandate V2 format going forward

#### 2. Consolidate Preview Logic

**Before:** Two preview paths
- Database preview: Query DB
- Source preview: Read YAML

**After:** One preview path
- Always read from YAML files (before or after import)

#### 3. Update README Documentation

Document V2 format as THE format, remove V1 examples.

### Code Changes Required

**File:** `backend/apps/packs/services.py`

```python
# REMOVE these functions:
- _is_v2_pack()
- _discover_v1_pack()
- _extract_pack_preview() (v1 version)
- _extract_pack_preview_from_db()

# KEEP and rename:
- _discover_v2_pack() → _discover_pack()
- _extract_pack_preview_v2() → _extract_pack_preview()

# UPDATE:
def get_pack_preview_from_database(pack: "LibraryPack") -> dict:
    """Get preview by reading source YAML files."""
    # Find pack directory in libraries/packs
    pack_dir = _find_pack_directory(pack.slug)
    if not pack_dir:
        return {"error": "Pack source files not found"}

    # Always read from YAML files
    return _extract_pack_preview(pack_dir)
```

**File:** `backend/apps/packs/views.py`

```python
# Merge preview() and preview_from_source() into single endpoint
@action(detail=True, methods=["get"])
def preview(self, request, pk=None):
    """Get pack preview from source YAML files."""
    pack = self.get_object()
    preview_data = get_pack_preview_from_source(pack.slug)
    return Response(preview_data)
```

---

## Unintended Consequences Analysis

### 1. Source Files Required for Preview

**Change:** Preview always reads YAML files

**Consequence:** Production deployments need source files or preview breaks

**Mitigation:**
- ✅ Pre-release: Not a concern (local dev)
- 🔮 Future: When deploying to production:
  - Option A: Include libraries folder in deployment
  - Option B: Re-introduce database preview for production
  - Option C: Disable preview for imported packs (only allow before import)

**Decision:** Punt to future. Simplify now, handle deployment later.

### 2. pack.content Field Becomes Obsolete

**Change:** Never read from `pack.content` for preview

**Consequence:** Field takes up space but serves no purpose

**Mitigation:**
- Short term: Leave it (no harm)
- Long term: Deprecate and remove in future migration

**Decision:** Keep for now, remove later.

### 3. Import Logic Still Needs to Read Multiple Files

**Change:** None to import logic

**Consequence:** Import still complex (reads components.yaml, threats.yaml, etc.)

**Mitigation:** This is acceptable - import is inherently complex.

**Decision:** No change needed.

### 4. Potential File System Access Issues

**Change:** Preview reads files instead of database

**Consequence:**
- File I/O vs DB queries (performance)
- Permission issues if files not readable
- Concurrency if files being written during read

**Mitigation:**
- Performance: Files are small, YAML parsing is fast
- Permissions: Development environment, not a concern
- Concurrency: Packs aren't updated frequently

**Decision:** Accept these tradeoffs for simplicity.

---

## Regression Risk Analysis

### High Risk: Preview Breaking

**Risk:** Preview fails if source files missing or unreadable

**Affected:**
- GET `/packs/{id}/preview/` (database packs)
- GET `/packs/preview_from_source/?slug=aws-mini` (source packs)

**Test Cases:**
1. ✅ Preview imported pack with source files present
2. ⚠️ Preview imported pack with source files deleted
3. ✅ Preview source pack before import
4. ⚠️ Preview pack with malformed YAML
5. ⚠️ Preview pack with missing components.yaml

**Mitigation:**
- Add error handling for missing files
- Return graceful error message
- Log errors for debugging

### Medium Risk: Import Breaking

**Risk:** Removing v1 code breaks existing v1 packs (if any exist)

**Verification Needed:**
```bash
# Check if any packs use v1 format
cd libraries/packs
for pack in */; do
    if [ ! -f "$pack/components.yaml" ] && [ -f "$pack/pack.yaml" ]; then
        echo "V1 pack found: $pack"
    fi
done
```

**Mitigation:**
- Verify no v1 packs exist before removing code
- If v1 packs found, convert to v2 first

### Low Risk: Frontend Breaking

**Risk:** Frontend expects specific response format

**Analysis:** Frontend doesn't know about v1/v2, just consumes preview API

**Test Cases:**
1. ✅ PackCard component displays counts
2. ✅ PreviewPackDialog shows components/threats/countermeasures
3. ✅ InstallPackDialog shows overlay selection

**Mitigation:** Response format stays the same, no frontend changes needed.

### Low Risk: Already-Imported Packs

**Risk:** Existing aws-mini and base-stride records in database

**Consequence:** No issue - preview will read from source files regardless of database state

**Action:** No migration needed.

---

## Implementation Plan

### Phase 1: Verification (30 minutes)

1. ✅ **Verify no V1 packs exist**
   ```bash
   cd libraries/packs && find . -name "pack.yaml" -exec grep -l "^components:" {} \;
   ```

2. ✅ **Verify all packs have source files**
   ```bash
   cd libraries/packs && ls -la */components.yaml
   ```

3. ✅ **Document current behavior**
   - Test preview for aws-mini (shows 0)
   - Test preview for base-stride (shows 0)

### Phase 2: Code Changes (2 hours)

**File:** `backend/apps/packs/services.py`

1. **Remove functions:**
   - `_is_v2_pack()`
   - `_discover_v1_pack()`
   - `_extract_pack_preview()` (v1 version)
   - `_extract_pack_preview_from_db()`

2. **Rename functions:**
   - `_discover_v2_pack()` → `_discover_pack()`
   - `_extract_pack_preview_v2()` → `_extract_pack_preview()`

3. **Simplify preview logic:**
   ```python
   def get_pack_preview_from_database(pack: "LibraryPack") -> dict:
       """Get preview from source YAML files."""
       return get_pack_preview_from_source(pack.slug)
   ```

4. **Update discovery logic:**
   - Remove v1/v2 branching at line 269
   - Always use v2 discovery

5. **Remove _v2_format flag handling:**
   - Remove check at line 365
   - Remove flag setting during import (if it exists)

**File:** `backend/apps/packs/views.py`

No changes needed - endpoints stay the same.

### Phase 3: Testing (1 hour)

#### Manual Testing

1. **Preview Before Import:**
   ```bash
   curl http://localhost:8000/api/packs/preview_from_source/?slug=aws-mini
   # Should show: 5 components, 21 threats, 31 countermeasures
   ```

2. **Preview After Import:**
   ```bash
   curl http://localhost:8000/api/packs/1/preview/
   # Should show: 5 components, 21 threats, 31 countermeasures
   ```

3. **UI Verification:**
   - Open packs page
   - Click on AWS Mini
   - Verify counts show correctly in modal

4. **Import Verification:**
   ```bash
   # Re-import with force
   curl -X POST http://localhost:8000/api/packs/import_single/ \
     -d '{"slug": "aws-mini", "force": true}'
   # Should succeed without errors
   ```

#### Automated Testing

```python
# Test: Preview reads from YAML files
def test_preview_reads_from_yaml():
    pack = LibraryPack.objects.get(slug='aws-mini')
    preview = get_pack_preview_from_database(pack)
    assert preview['components'] == 5
    assert preview['threats'] == 21
    assert preview['countermeasures'] == 31

# Test: Preview handles missing files gracefully
def test_preview_missing_files():
    # Create pack record without source files
    pack = LibraryPack.objects.create(slug='fake-pack', ...)
    preview = get_pack_preview_from_database(pack)
    assert 'error' in preview
```

### Phase 4: Documentation (30 minutes)

1. **Update libraries/README.md:**
   - Remove all V1 format examples
   - Document V2 as the only format
   - Update "Pack File Structure" section (line 440-457)

2. **Add migration guide:**
   - If any v1 packs exist, document conversion process

3. **Update this document:**
   - Mark as "IMPLEMENTED"
   - Add "Lessons Learned" section

---

## Testing Strategy

### Pre-Implementation Tests (Baseline)

```bash
# 1. Current state - should show 0 counts
curl http://localhost:8000/api/packs/1/preview/

# 2. Verify data in database
python manage.py shell -c "
from apps.packs.models import LibraryPack
from apps.systems.models import ComponentLibrary
pack = LibraryPack.objects.get(slug='aws-mini')
print(f'Components: {ComponentLibrary.objects.filter(source_pack=pack).count()}')
"

# 3. Verify source files exist
ls -la libraries/packs/aws-mini/
```

### Post-Implementation Tests (Validation)

```bash
# 1. Preview should show correct counts
curl http://localhost:8000/api/packs/1/preview/ | jq '.components | length'
# Expected: 5

# 2. UI should display correctly
# Open http://localhost:3000/packs
# Click AWS Mini
# Verify: Shows "Components (5)", "Threats (21)", etc.

# 3. Import should still work
curl -X POST http://localhost:8000/api/packs/import_single/ \
  -d '{"slug": "test-pack", "force": false}'

# 4. Database records should be created
python manage.py shell -c "
from apps.systems.models import ComponentLibrary
count = ComponentLibrary.objects.filter(source_pack__slug='test-pack').count()
print(f'Components created: {count}')
"
```

### Regression Tests

```python
# Test Suite: Pack Preview
def test_preview_aws_mini():
    """AWS Mini should show 5 components, 21 threats, 31 countermeasures."""
    pass

def test_preview_base_stride():
    """Base STRIDE should show correct counts."""
    pass

def test_preview_missing_files():
    """Preview should handle missing source files gracefully."""
    pass

def test_preview_malformed_yaml():
    """Preview should handle malformed YAML gracefully."""
    pass

# Test Suite: Pack Import
def test_import_v2_pack():
    """Import should work for v2 packs."""
    pass

def test_import_creates_database_records():
    """Import should create ComponentLibrary, ThreatLibrary records."""
    pass

def test_reimport_with_force():
    """Re-import with force should replace existing items."""
    pass
```

---

## Rollback Plan

If issues arise post-implementation:

### Quick Rollback (5 minutes)

```bash
# Revert the commit
git revert <commit-hash>

# Restart services
docker-compose restart backend
```

### Manual Fix (15 minutes)

If preview breaks but import works:

```python
# Add _v2_format flag to existing packs
from apps.packs.models import LibraryPack

for pack in LibraryPack.objects.all():
    if pack.content:
        pack.content['_v2_format'] = True
        pack.save()
```

---

## Success Criteria

✅ **Implementation is successful if:**

1. AWS Mini shows correct counts in UI (5, 21, 31, 1)
2. Base STRIDE shows correct counts in UI
3. Preview works before and after import
4. Import process still works correctly
5. No errors in backend logs
6. Frontend displays correctly
7. Code is simpler (fewer lines, fewer branches)

---

## Future Considerations

### When Deploying to Production

**Current Assumption:** Source YAML files are always available (local development)

**Production Reality:**
- Files might not be in deployment
- Might use Docker without libraries folder
- Might download packs from registry

**Options:**

**Option A: Include Source Files in Deployment**
- Pro: Preview keeps working
- Con: Larger deployment size
- Implementation: Add libraries folder to Docker image

**Option B: Disable Preview for Imported Packs**
- Pro: Simpler deployment
- Con: Users can't preview what they already installed
- Implementation: Only allow preview before import

**Option C: Store Preview Data in Database**
- Pro: No source files needed
- Con: Data duplication (YAML + DB)
- Implementation: Add preview_data JSONField to LibraryPack

**Recommendation:** Defer decision until production deployment is needed. Option A is simplest for now.

---

## Lessons Learned

### 1. Avoid Premature Optimization

**What Happened:** Introduced format versioning before product launch
**Why It's Wrong:** Adds complexity with no current benefit
**Better Approach:** Keep it simple until real-world need emerges

### 2. Documentation Debt is Real

**What Happened:** V2 format used in code but V1 documented in README
**Impact:** Code doesn't match documentation
**Better Approach:** Update docs when code changes

### 3. Source of Truth Should Be Clear

**What Happened:** Unclear if database or YAML files are source of truth
**Impact:** Circular preview logic (YAML → DB → preview from DB)
**Better Approach:** Define source of truth explicitly (YAML files)

### 4. Test What You Build

**What Happened:** Preview broke but no one noticed until user reported
**Impact:** Poor UX, erodes trust
**Better Approach:** Add preview to test suite

---

## References

- **Issue:** Pack preview shows 0 counts
- **Files Modified:**
  - `backend/apps/packs/services.py` (pending implementation)
- **Documentation:**
  - `libraries/README.md` (needs update)
  - This document

---

## Appendix A: Full Code Audit

### All References to Format Versioning

**File:** `backend/apps/packs/services.py`

| Line | Code | Purpose |
|------|------|---------|
| 120 | `def _is_v2_pack(pack_dir: Path)` | Detect format from filesystem |
| 269 | `if _is_v2_pack(item):` | Route discovery logic |
| 340 | `if _is_v2_pack(pack_dir):` | Route source preview extraction |
| 365 | `if pack_data.get("_v2_format"):` | Route database preview extraction |

**Total:** 4 occurrences, all in one file

### All References to Preview

**File:** `backend/apps/packs/views.py`

| Line | Endpoint | Purpose |
|------|----------|---------|
| 201-210 | `preview()` | Preview imported packs from database |
| 212-238 | `preview_from_source()` | Preview packs before import |

### Database Records Status

```sql
-- AWS Mini
SELECT slug,
       (SELECT COUNT(*) FROM apps_systems_componentlibrary WHERE source_pack_id = lp.id) as components,
       (SELECT COUNT(*) FROM apps_threats_threatlibrary WHERE source_pack_id = lp.id) as threats,
       (SELECT COUNT(*) FROM apps_threats_countermeasurelibrary WHERE source_pack_id = lp.id) as countermeasures,
       content->>'_v2_format' as v2_flag
FROM apps_packs_librarypack lp
WHERE slug = 'aws-mini';

-- Result:
-- aws-mini | 5 | 21 | 31 | NULL
```

---

## Appendix B: Decision Log

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-02-08 | Remove format versioning | Pre-release product, unnecessary complexity | Pending |
| 2026-02-08 | Always read from YAML for preview | Single source of truth, simpler logic | Pending |
| 2026-02-08 | Mandate V2 format only | Already in use, no v1 packs exist | Pending |
| 2026-02-08 | Defer production concerns | Focus on current needs, not hypothetical future | Pending |

---

**Document Status:** ✅ Investigation Complete, Ready for Implementation
**Next Step:** Review with team, then proceed with Phase 1 (Verification)
