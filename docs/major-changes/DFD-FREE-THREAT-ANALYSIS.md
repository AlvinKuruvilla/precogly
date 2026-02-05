# Implementation Plan: DFD-Free Threat Analysis

## Overview

This plan enables users to perform threat modeling without using our DFD editor. Users can create threat models, add components, threats, countermeasures, and compliance mappings entirely through manual entry, optionally uploading reference images (e.g., whiteboard photos, draw.io exports) as visual context.

**Use Cases:**
1. Quick threat modeling during architecture review meetings
2. Threat analysis on systems where formal DFD creation is overkill
3. Teams who prefer their own diagramming tools (Lucidchart, draw.io, Miro)
4. Importing threat models from other formats/tools
5. Ad-hoc security assessments

**Key Finding:** The backend data model already supports DFD-free threat modeling. The `OrgsystemComponent` model has a `threat_model` FK specifically designed for "analysis-only components not linked to a DFD." The work is primarily:
1. Frontend UI changes to remove DFD requirements from the threat analysis workflow
2. Adding file upload capability for reference images

---

## Current State Analysis

### What Already Works (Backend)

| Capability | Status | Evidence |
|------------|--------|----------|
| ThreatModel without DFDs | Supported | DFD associations are optional (`ThreatModelDFD` is a through table) |
| Components without DFDs | Supported | `OrgsystemComponent.threat_model` FK for "analysis-only" components |
| Threats on analysis-only components | Supported | `ComponentInstanceThreat.component` FK accepts any component |
| Countermeasures | Supported | No DFD dependency |
| Compliance mappings | Supported | No DFD dependency |

### What Blocks DFD-Free Workflow (Frontend)

| Location | Issue |
|----------|-------|
| `ThreatModelDetail.tsx:644` | `diagrams.length > 0` check blocks threat analysis tab |
| `ThreatModelDetail.tsx:741-752` | Empty state prompts "Create First DFD" instead of enabling manual entry |
| `ThreatModelDetail.tsx:628-634` | Overview tab prompts DFD creation when none exist |
| Conceptual | UI assumes components come from DFD canvas, not manual entry |

### What Needs to Be Built

| Capability | Status | Effort |
|------------|--------|--------|
| Remove DFD requirement from UI | New | Medium |
| Reference image upload (backend) | New | Medium |
| Reference image upload (frontend) | New | Medium |
| Reference image gallery/viewer | New | Low |
| "DFD-free mode" indicator/workflow | New | Low |

---

## Architecture Decisions

### Decision 1: DFD-Free vs DFD-Optional Mode

**Options:**
- A) **Separate mode:** User explicitly chooses "DFD-free" or "With DFD" at creation
- B) **Unified mode:** All threat models support both, UI adapts based on whether DFDs exist

**Decision: Option B (Unified Mode)**

Rationale:
- Users can start DFD-free and add DFDs later without recreating
- Simpler mental model - one workflow that adapts
- Analysis-only components already coexist with DFD components
- Less code paths to maintain

### Decision 2: Reference Image Storage

**Options:**
- A) **Dedicated model:** `ThreatModelReferenceImage` with FileField
- B) **JSONField storage:** Store metadata in `workspace_data.uploads`, files in MEDIA_ROOT
- C) **External storage:** Upload to S3/external and store URLs

**Decision: Option A (Dedicated Model)**

Rationale:
- Cleaner data model with proper foreign key relationships
- Easier to query, filter, and manage images
- Built-in Django admin support
- Can add metadata (description, uploaded_by, position in gallery)
- Simpler permission handling through ViewSet

### Decision 3: Image Storage Backend

**Options:**
- A) **Local filesystem:** Django's default FileSystemStorage
- B) **S3/Cloud:** django-storages with S3 backend
- C) **Configurable:** Support both via environment variable

**Decision: Option A (Local) for MVP, Option C later**

Rationale:
- Local storage already configured (MEDIA_ROOT set)
- Simpler deployment for self-hosted users
- Cloud storage can be added later without schema changes
- Reference images are typically small (< 10MB)

---

## Data Model Changes

### New Model: `ThreatModelReferenceImage`

```python
# backend/apps/diagrams/models.py

class ThreatModelReferenceImage(TimestampedModel):
    """Reference image for threat model (whiteboard photos, architecture diagrams, etc.)."""

    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="reference_images",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_reference_images",
    )
    image = models.ImageField(
        upload_to="reference_images/%Y/%m/",
        help_text="Reference image file (JPEG, PNG, WebP)",
    )
    filename = models.CharField(
        max_length=255,
        help_text="Original filename for display",
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description of what this image shows",
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in gallery (lower = first)",
    )

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return f"{self.filename} - {self.threat_model.name}"
```

### Model Field Addition: `ThreatModel.modeling_mode`

```python
# backend/apps/diagrams/models.py (add to ThreatModel)

class ModelingMode(models.TextChoices):
    DFD_BASED = "dfdBased", "DFD-Based"
    MANUAL = "manual", "Manual Entry"
    HYBRID = "hybrid", "Hybrid (Both)"

modeling_mode = models.CharField(
    max_length=20,
    choices=ModelingMode.choices,
    default=ModelingMode.DFD_BASED,
    help_text="Primary threat modeling approach for this model",
)
```

**Note:** This field is informational/UI hint only. It doesn't enforce restrictions - a "manual" model can still have DFDs added later.

---

## API Changes

### New Endpoints

```
POST   /api/threat-models/{id}/reference-images/     # Upload image
GET    /api/threat-models/{id}/reference-images/     # List images
GET    /api/reference-images/{id}/                   # Get image details
PATCH  /api/reference-images/{id}/                   # Update description/order
DELETE /api/reference-images/{id}/                   # Delete image
```

### New Serializers

```python
# backend/apps/diagrams/serializers.py

class ThreatModelReferenceImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    uploaded_by_email = serializers.CharField(source="uploaded_by.email", read_only=True)

    class Meta:
        model = ThreatModelReferenceImage
        fields = [
            "id",
            "threat_model",
            "image",
            "image_url",
            "filename",
            "description",
            "display_order",
            "uploaded_by",
            "uploaded_by_email",
            "created_at",
        ]
        read_only_fields = ["id", "threat_model", "uploaded_by", "created_at"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ThreatModelReferenceImageUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading reference images."""

    class Meta:
        model = ThreatModelReferenceImage
        fields = ["image", "filename", "description"]
```

### New ViewSet

```python
# backend/apps/diagrams/views.py

class ThreatModelReferenceImageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing threat model reference images."""

    serializer_class = ThreatModelReferenceImageSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseJSONParser]

    def get_queryset(self):
        # Filter by user's organization access
        user_orgs = self.request.user.organization_memberships.values_list(
            "organization_id", flat=True
        )
        return ThreatModelReferenceImage.objects.filter(
            threat_model__organization_id__in=user_orgs
        )

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="upload")
    def upload_for_threat_model(self, request, threat_model_pk=None):
        """Upload a reference image for a specific threat model."""
        threat_model = get_object_or_404(ThreatModel, pk=threat_model_pk)

        # Verify user has access to this threat model's organization
        user_orgs = request.user.organization_memberships.values_list(
            "organization_id", flat=True
        )
        if threat_model.organization_id not in user_orgs:
            return Response(
                {"detail": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ThreatModelReferenceImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image = serializer.save(
            threat_model=threat_model,
            uploaded_by=request.user,
        )

        return Response(
            ThreatModelReferenceImageSerializer(image, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
```

### URL Configuration

```python
# backend/apps/diagrams/urls.py

# Add nested route for threat model reference images
router.register(
    r"threat-models/(?P<threat_model_pk>\d+)/reference-images",
    ThreatModelReferenceImageViewSet,
    basename="threat-model-reference-images",
)

# Add direct route for individual image operations
router.register(
    r"reference-images",
    ThreatModelReferenceImageViewSet,
    basename="reference-images",
)
```

### Update ThreatModel Serializer

```python
# backend/apps/diagrams/serializers.py (update ThreatModelSerializer)

class ThreatModelSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    reference_images = ThreatModelReferenceImageSerializer(many=True, read_only=True)
    modeling_mode = serializers.CharField(required=False)

    class Meta:
        model = ThreatModel
        fields = [
            # ... existing fields ...
            "modeling_mode",
            "reference_images",
        ]
```

---

## Frontend Changes

### 1. Update ThreatModelDetail Page

**File:** `frontend/src/pages/ThreatModelDetail.tsx`

**Changes:**
- Remove `diagrams.length > 0` check that blocks threat analysis
- Show threat analysis UI even when no DFDs exist
- Add reference image gallery component
- Add "Add Component" as primary action when no DFDs

**Before (line 644):**
```tsx
) : diagrams.length > 0 ? (
```

**After:**
```tsx
) : (
```

**Before (lines 741-752):**
```tsx
) : (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <p className="text-muted-foreground mb-4">
        No DFDs created yet. Create a data flow diagram to start threat analysis.
      </p>
      <Button onClick={handleCreateDFD} disabled={createDiagramMutation.isPending}>
        {createDiagramMutation.isPending ? 'Creating...' : 'Create First DFD'}
      </Button>
    </div>
  </div>
)}
```

**After:**
```tsx
// Remove empty state - threat analysis always available
// The ComponentView already handles empty states gracefully
// Show "Add Component" prominently when no components exist
```

### 2. New Component: ReferenceImageGallery

**File:** `frontend/src/components/workspace/ReferenceImageGallery.tsx`

```tsx
interface ReferenceImageGalleryProps {
  threatModelId: string
  images: ReferenceImage[]
  onUpload: (file: File, description?: string) => Promise<void>
  onDelete: (imageId: number) => Promise<void>
  onReorder: (imageId: number, newOrder: number) => Promise<void>
  isUploading?: boolean
}

export function ReferenceImageGallery({
  threatModelId,
  images,
  onUpload,
  onDelete,
  onReorder,
  isUploading,
}: ReferenceImageGalleryProps) {
  // Dropzone for upload
  // Thumbnail grid with lightbox
  // Drag-and-drop reordering
  // Delete confirmation
}
```

### 3. New Component: ReferenceImageUploader

**File:** `frontend/src/components/workspace/ReferenceImageUploader.tsx`

```tsx
interface ReferenceImageUploaderProps {
  onUpload: (file: File, description?: string) => Promise<void>
  isUploading?: boolean
  maxSizeMB?: number
  acceptedTypes?: string[]
}

export function ReferenceImageUploader({
  onUpload,
  isUploading,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
}: ReferenceImageUploaderProps) {
  // File input with drag-and-drop
  // Preview before upload
  // Description field
  // Size/type validation
}
```

### 4. New Component: ReferenceImageViewer

**File:** `frontend/src/components/workspace/ReferenceImageViewer.tsx`

```tsx
interface ReferenceImageViewerProps {
  images: ReferenceImage[]
  initialIndex?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReferenceImageViewer({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}: ReferenceImageViewerProps) {
  // Lightbox modal
  // Navigation (prev/next)
  // Zoom controls
  // Image description display
}
```

### 5. Update API Client

**File:** `frontend/src/lib/api.ts`

Add FormData support for file uploads:

```typescript
// Add to api object
async uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<T> {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('filename', file.name)

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value)
    })
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      // Note: Don't set Content-Type - browser sets it with boundary for FormData
    },
    body: formData,
  })

  if (!response.ok) {
    throw new ApiError(response.status, await response.text())
  }

  return response.json()
}
```

### 6. New API Hooks

**File:** `frontend/src/api/reference-images.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ReferenceImage } from '@/types'

export function useReferenceImages(threatModelId: string | null) {
  return useQuery({
    queryKey: ['reference-images', threatModelId],
    queryFn: () =>
      api.get<ReferenceImage[]>(
        `/threat-models/${threatModelId}/reference-images/`
      ),
    enabled: !!threatModelId,
  })
}

export function useUploadReferenceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      threatModelId,
      file,
      description,
    }: {
      threatModelId: string
      file: File
      description?: string
    }) => {
      return api.uploadFile<ReferenceImage>(
        `/threat-models/${threatModelId}/reference-images/upload/`,
        file,
        description ? { description } : undefined
      )
    },
    onSuccess: (_, { threatModelId }) => {
      queryClient.invalidateQueries({
        queryKey: ['reference-images', threatModelId],
      })
      queryClient.invalidateQueries({
        queryKey: ['threat-model', threatModelId],
      })
    },
  })
}

export function useDeleteReferenceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (imageId: number) => {
      return api.delete(`/reference-images/${imageId}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-images'] })
    },
  })
}

export function useUpdateReferenceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      imageId,
      data,
    }: {
      imageId: number
      data: { description?: string; displayOrder?: number }
    }) => {
      return api.patch<ReferenceImage>(`/reference-images/${imageId}/`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-images'] })
    },
  })
}
```

### 7. New Types

**File:** `frontend/src/types/domain.ts`

```typescript
export interface ReferenceImage {
  id: number
  threatModel: number
  image: string
  imageUrl: string
  filename: string
  description: string
  displayOrder: number
  uploadedBy: number | null
  uploadedByEmail: string | null
  createdAt: string
}

export type ModelingMode = 'dfdBased' | 'manual' | 'hybrid'

// Update ThreatModel interface
export interface ThreatModel {
  // ... existing fields ...
  modelingMode: ModelingMode
  referenceImages: ReferenceImage[]
}
```

### 8. Update CreateThreatModel Form

**File:** `frontend/src/components/threat-models/CreateThreatModelForm.tsx`

Add modeling mode selection:

```tsx
// New step or field in the form
<div className="space-y-4">
  <Label>Threat Modeling Approach</Label>
  <RadioGroup
    value={modelingMode}
    onValueChange={(value) => setModelingMode(value as ModelingMode)}
  >
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="dfdBased" id="dfd-based" />
      <Label htmlFor="dfd-based" className="font-normal">
        DFD-Based (create data flow diagrams in our editor)
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="manual" id="manual" />
      <Label htmlFor="manual" className="font-normal">
        Manual Entry (add components and threats manually)
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="hybrid" id="hybrid" />
      <Label htmlFor="hybrid" className="font-normal">
        Hybrid (use both approaches)
      </Label>
    </div>
  </RadioGroup>
  <p className="text-sm text-muted-foreground">
    You can change this later and switch between approaches at any time.
  </p>
</div>
```

---

## Migration Plan

### Database Migration

```python
# backend/apps/diagrams/migrations/XXXX_add_reference_images_and_modeling_mode.py

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('diagrams', 'XXXX_previous_migration'),
    ]

    operations = [
        # Add modeling_mode field to ThreatModel
        migrations.AddField(
            model_name='threatmodel',
            name='modeling_mode',
            field=models.CharField(
                choices=[
                    ('dfdBased', 'DFD-Based'),
                    ('manual', 'Manual Entry'),
                    ('hybrid', 'Hybrid (Both)'),
                ],
                default='dfdBased',
                max_length=20,
                help_text='Primary threat modeling approach for this model',
            ),
        ),

        # Create ThreatModelReferenceImage model
        migrations.CreateModel(
            name='ThreatModelReferenceImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('image', models.ImageField(
                    help_text='Reference image file (JPEG, PNG, WebP)',
                    upload_to='reference_images/%Y/%m/',
                )),
                ('filename', models.CharField(
                    help_text='Original filename for display',
                    max_length=255,
                )),
                ('description', models.TextField(
                    blank=True,
                    help_text='Optional description of what this image shows',
                )),
                ('display_order', models.PositiveIntegerField(
                    default=0,
                    help_text='Order in gallery (lower = first)',
                )),
                ('threat_model', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reference_images',
                    to='diagrams.threatmodel',
                )),
                ('uploaded_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='uploaded_reference_images',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['display_order', '-created_at'],
            },
        ),
    ]
```

### Data Migration (Optional)

No data migration needed - existing threat models will default to `modeling_mode='dfdBased'`.

### Rollback Plan

```bash
# Revert migration
python manage.py migrate diagrams XXXX_previous_migration

# This will:
# - Remove modeling_mode field from ThreatModel
# - Drop ThreatModelReferenceImage table (and any uploaded images)

# Note: Uploaded image files in MEDIA_ROOT/reference_images/ will remain
# and should be cleaned up manually if needed
```

---

## Files Affected

### Backend

| File | Changes |
|------|---------|
| `backend/apps/diagrams/models.py` | Add `ThreatModelReferenceImage` model, add `modeling_mode` field to ThreatModel |
| `backend/apps/diagrams/serializers.py` | Add `ThreatModelReferenceImageSerializer`, update `ThreatModelSerializer` |
| `backend/apps/diagrams/views.py` | Add `ThreatModelReferenceImageViewSet` |
| `backend/apps/diagrams/urls.py` | Add reference image routes |
| `backend/apps/diagrams/admin.py` | Register `ThreatModelReferenceImage` |
| `backend/config/settings/base.py` | Verify MEDIA settings, add Pillow to requirements |
| `backend/requirements/base.txt` | Add `Pillow` for ImageField support |
| Migration file (auto-generated) | Schema changes |

### Frontend

| File | Changes |
|------|---------|
| `frontend/src/pages/ThreatModelDetail.tsx` | Remove DFD requirement, add reference images section |
| `frontend/src/lib/api.ts` | Add `uploadFile` method for FormData |
| `frontend/src/api/reference-images.ts` | **New file** - API hooks for reference images |
| `frontend/src/types/domain.ts` | Add `ReferenceImage`, `ModelingMode` types |
| `frontend/src/components/workspace/ReferenceImageGallery.tsx` | **New file** - Image gallery component |
| `frontend/src/components/workspace/ReferenceImageUploader.tsx` | **New file** - Upload component |
| `frontend/src/components/workspace/ReferenceImageViewer.tsx` | **New file** - Lightbox viewer |
| `frontend/src/components/workspace/index.ts` | Export new components |
| `frontend/src/components/threat-models/CreateThreatModelForm.tsx` | Add modeling mode selection |

---

## Potential Unintended Consequences

### 1. User Confusion About Workflows

**Risk:** Users may be confused about when to use DFDs vs manual entry.

**Mitigation:**
- Clear messaging during threat model creation explaining each approach
- Contextual help tooltips explaining trade-offs
- Documentation/guides for each workflow
- Suggested workflow based on system complexity

### 2. Orphaned Analysis Components

**Risk:** Components created for manual threat modeling might become orphaned if users later decide to use DFDs.

**Mitigation:**
- Already handled - analysis-only components are linked via `threat_model` FK
- Clear UI distinction between DFD components and analysis-only components
- Option to "promote" analysis components to DFD later (future enhancement)

### 3. Incomplete Threat Coverage

**Risk:** Manual entry may miss threats that automatic DFD-based generation would catch.

**Mitigation:**
- Warning message when using manual mode about potential gaps
- Suggestion to review threat library when adding components
- Option to "suggest threats" for manually added components (future enhancement)

### 4. Large Image Uploads

**Risk:** Users uploading very large images could impact storage and performance.

**Mitigation:**
- Frontend validation: max 10MB per image
- Backend validation: max file size check
- Image compression on upload (consider using Pillow to resize)
- Max images per threat model limit (suggest 20)

### 5. Image File Cleanup

**Risk:** Deleted reference images leave orphaned files in MEDIA_ROOT.

**Mitigation:**
- Use `django-cleanup` package to auto-delete files when model instances are deleted
- Or implement post_delete signal to clean up files
- Periodic cleanup job for orphaned files (optional)

### 6. Storage Costs (Future)

**Risk:** With many users uploading images, storage costs could grow.

**Mitigation:**
- Monitor storage usage
- Implement per-organization storage quotas (future)
- Add image compression to reduce file sizes
- Consider cloud storage with lifecycle policies

---

## Breaking Changes

### API Changes

| Change | Impact | Migration Path |
|--------|--------|----------------|
| New `modelingMode` field on ThreatModel | Low | Defaults to `'dfdBased'`, existing clients can ignore |
| New `referenceImages` field on ThreatModel response | Low | Empty array by default, existing clients can ignore |
| New endpoints for reference images | None | Additive, no existing endpoints changed |

### Frontend Changes

| Change | Impact | Migration Path |
|--------|--------|----------------|
| Threat analysis available without DFDs | Medium | Users who expected DFD prompt will see analysis UI instead |
| New modeling mode selection in create form | Low | Optional field with sensible default |

**No breaking changes to existing functionality.** All changes are additive.

---

## Potential Regression Errors

### 1. Threat Count Calculations

**Risk:** Summary cards and threat counts may not correctly include analysis-only components.

**Testing:**
- Verify `summaries.componentSummary` includes analysis-only components
- Verify threat counts in header badge are accurate
- Test with mix of DFD and analysis-only components

**Files to verify:**
- `frontend/src/components/workspace/useWorkspaceThreatAnalysis.ts`
- `frontend/src/pages/ThreatModelDetail.tsx` (lines 206-249)

### 2. Component Selection Logic

**Risk:** `selectedBackendInfo` derivation may fail for analysis-only components.

**Testing:**
- Verify "Add Threat" button works for analysis-only components
- Verify threat selection works for threats on analysis-only components
- Test countermeasure addition for analysis-only component threats

**Current code already handles this (lines 288-300 of ThreatModelDetail.tsx):**
```tsx
// Check if it's an analysis-only component (ID starts with "analysis-")
if (selectedComponentId.startsWith('analysis-')) {
  const backendId = parseInt(selectedComponentId.replace('analysis-', ''), 10)
  // ...
}
```

### 3. DFD Filter Dropdown

**Risk:** DFD filter may behave unexpectedly when no DFDs exist.

**Testing:**
- Verify filter dropdown doesn't appear when no DFDs
- Verify "All DFDs" option works correctly
- Test filter with analysis-only components (should show regardless of filter)

**Suggested change:** Hide DFD filter when `diagrams.length === 0`

### 4. Empty State Handling

**Risk:** Removing DFD-required empty state may cause UI issues when no components exist.

**Testing:**
- Verify graceful empty state when no DFDs AND no analysis-only components
- Verify "Add Component" button is prominently displayed
- Test the flow: create threat model -> add component -> add threat

### 5. File Upload Security

**Risk:** Malicious file uploads disguised as images.

**Testing:**
- Verify file type validation (JPEG, PNG, WebP only)
- Verify file size limits enforced
- Test with non-image files renamed to .jpg
- Verify uploaded files are served correctly

**Mitigation in code:**
```python
# In serializer or viewset
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_image(self, value):
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise serializers.ValidationError("Only JPEG, PNG, and WebP images are allowed.")
    if value.size > MAX_FILE_SIZE:
        raise serializers.ValidationError("Image must be smaller than 10MB.")
    return value
```

### 6. Magic Link Sharing

**Risk:** Reference images may not be accessible via magic links.

**Testing:**
- Verify shared threat models display reference images
- Verify image URLs work without authentication (if using magic link)
- Consider: Should images be visible in shared view?

---

## Implementation Order

### Phase 1: Backend Foundation (Low Risk)

1. Add Pillow to requirements
2. Create `ThreatModelReferenceImage` model
3. Add `modeling_mode` field to `ThreatModel`
4. Create serializers and viewset
5. Add URL routes
6. Run migrations
7. Test via Django admin

### Phase 2: Frontend - Remove DFD Requirement (Medium Risk)

1. Update `ThreatModelDetail.tsx` to remove DFD checks
2. Update empty state messaging
3. Test threat analysis workflow without DFDs
4. Verify existing DFD-based workflow still works

### Phase 3: Frontend - Reference Images (Medium Risk)

1. Add `uploadFile` to API client
2. Create API hooks for reference images
3. Create `ReferenceImageUploader` component
4. Create `ReferenceImageGallery` component
5. Create `ReferenceImageViewer` component
6. Integrate into `ThreatModelDetail` page
7. Test upload/view/delete flow

### Phase 4: Frontend - Creation Flow (Low Risk)

1. Add modeling mode selection to `CreateThreatModelForm`
2. Update create API call to include `modelingMode`
3. Conditional UI hints based on selected mode

### Phase 5: Polish & Documentation

1. Add help tooltips explaining workflows
2. Update user documentation
3. Add E2E tests for new workflows
4. Performance testing with multiple large images

---

## Testing Strategy

### Manual Testing Checklist

**DFD-Free Workflow:**
- [ ] Create threat model with no DFDs
- [ ] Verify threat analysis tab is accessible
- [ ] Add analysis-only component
- [ ] Add custom threat to component
- [ ] Add countermeasure to threat
- [ ] Update countermeasure status
- [ ] Add compliance mapping
- [ ] Verify summaries update correctly

**Reference Images:**
- [ ] Upload JPEG image
- [ ] Upload PNG image
- [ ] Upload WebP image
- [ ] Reject non-image file
- [ ] Reject oversized file (> 10MB)
- [ ] View image in lightbox
- [ ] Delete image
- [ ] Reorder images (drag-and-drop)
- [ ] Add image description
- [ ] Verify images persist after page refresh

**Regression Testing:**
- [ ] Create threat model -> create DFD -> edit in DFD editor
- [ ] Existing threat models with DFDs load correctly
- [ ] Threat counts accurate with mixed components
- [ ] DFD filter works correctly
- [ ] Magic link sharing still works
- [ ] Delete threat model deletes reference images

### Automated Tests

```bash
# Backend
cd backend && python manage.py test apps.diagrams.tests.test_reference_images

# Frontend (when tests are added)
cd frontend && npm test -- --grep "reference images"
```

---

## Verification Commands

```bash
# Backend - verify migration
cd backend && source venv/bin/activate
python manage.py makemigrations --dry-run  # Should show no changes after migration
python manage.py migrate

# Verify new model
python manage.py shell -c "
from apps.diagrams.models import ThreatModelReferenceImage, ThreatModel
print('ThreatModelReferenceImage exists:', ThreatModelReferenceImage._meta.db_table)
print('modeling_mode field:', hasattr(ThreatModel, 'modeling_mode'))
"

# Verify MEDIA_ROOT writable
python manage.py shell -c "
from django.conf import settings
from pathlib import Path
media_dir = Path(settings.MEDIA_ROOT) / 'reference_images'
media_dir.mkdir(parents=True, exist_ok=True)
print('MEDIA_ROOT:', settings.MEDIA_ROOT)
print('reference_images dir created:', media_dir.exists())
"

# Frontend - type check
cd frontend && npm run type-check

# Verify API client changes
grep -n "uploadFile" frontend/src/lib/api.ts
```

---

## Future Enhancements

1. **Threat Suggestions:** Auto-suggest threats for manually added components based on category
2. **Component Promotion:** Convert analysis-only components to DFD nodes
3. **Image Annotation:** Allow users to annotate reference images with markers linking to components
4. **OCR Integration:** Extract component names from uploaded diagrams
5. **Import/Export:** Import threat models from other formats (OWASP Threat Dragon, Microsoft TMT, etc.)
6. **Cloud Storage:** Add S3/Azure Blob storage support for reference images
7. **Image Compression:** Auto-compress large images on upload
8. **Bulk Component Import:** CSV/JSON import for components
9. **Template Components:** Pre-defined component sets for common architectures

---

## FAQ

### Q: Can users upload more than one image?

**Yes.** The design supports multiple images per threat model. Users may have various reference assets such as:
- DFD sketches from whiteboarding sessions
- Sequence flow diagrams
- Architecture overviews
- Cloud console screenshots
- Design document excerpts

The data model uses a one-to-many relationship (`ThreatModel` → `ThreatModelReferenceImage`), and includes:
- `display_order` field for arranging images in a gallery
- `ReferenceImageGallery` component with thumbnail grid and drag-and-drop reordering
- Lightbox viewer with prev/next navigation

A suggested limit of 20 images per threat model helps manage storage, but this is configurable.

### Q: Can teams that create DFDs also upload images as secondary assets?

**Yes.** This is why we chose the **Unified Mode** architecture (Decision 1). The `modeling_mode` field is purely informational - it doesn't enforce any restrictions.

Teams can use any combination:

| Workflow | DFDs | Reference Images | Analysis-Only Components |
|----------|------|------------------|--------------------------|
| Pure DFD | Yes | No | No |
| Pure manual | No | Yes | Yes |
| Hybrid | Yes | Yes | Yes |

**Example hybrid use case:** A team creates formal DFDs in the editor, but also uploads:
- A whiteboard photo from their initial architecture brainstorm
- A sequence diagram exported from their design docs
- A screenshot of their AWS infrastructure

All reference images live alongside the DFDs as supplementary context, providing a complete picture of the system being modeled.
