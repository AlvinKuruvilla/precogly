# Hierarchical DFD Design

## Overview

This document describes the hierarchical DFD (Data Flow Diagram) approach for threat modeling. Instead of flat, independent DFDs that can cause component duplication, DFDs are organized in a parent-child hierarchy where child DFDs "decompose" specific components from their parent.

This design also supports **image-based workflows** where users can skip the DFD editor entirely and work directly with uploaded whiteboard photos, manually adding components and threats.

## Core Concepts

### System Component (Auto-Created Root)

Every threat model has an auto-created **System Component** that serves as the root of the component hierarchy. This enables:

- **System-level threats**: Threats that apply to the system as a whole, not a specific component
- **Image-based workflows**: Users can add threats without creating DFD components
- **Unified hierarchy**: All components (from DFDs or manually added) nest under the system root

### Three Workflows

| Workflow | Description | Uses DFD Editor |
|----------|-------------|-----------------|
| **Full DFD** | Create DFDs with components, auto-generate threats | Yes |
| **Image + Manual** | Upload whiteboard photo, manually add components/threats | No |
| **Threats Only** | Skip components entirely, add threats to system component | No |

### DFD Types

1. **Primary DFD**: The first DFD created - a system-level view
2. **Decomposition DFDs**: Zoom into a specific component from the parent
3. **Reference DFDs**: Documentation only - not included in threat analysis

## Concrete Example

**Scenario**: Modeling an e-commerce platform

```
Primary DFD: "E-Commerce System Overview"
├── Components: Web App, API Gateway, Payment Service, User Database, Order Database
├── Threats: 15 system-level threats auto-generated
│
├── Decomposition DFD: "Payment Service Internals" (decomposes: Payment Service)
│   ├── Components: Stripe Connector, Fraud Detection, Transaction Logger
│   ├── Threats: 8 threats (nested under Payment Service in analysis view)
│
├── Decomposition DFD: "API Gateway Details" (decomposes: API Gateway)
│   ├── Components: Rate Limiter, Auth Middleware, Request Validator
│   ├── Threats: 6 threats (nested under API Gateway in analysis view)
│
└── Reference DFD: "Legacy Billing System" (documentation only)
    ├── Components: Old Billing DB, SOAP Interface
    └── Threats: Not included in threat analysis
```

**Threat Analysis View** (aggregated):

```
E-Commerce System
├── Web App (3 threats)
├── API Gateway (4 threats)
│   └── [Expand] API Gateway Details
│       ├── Rate Limiter (2 threats)
│       ├── Auth Middleware (3 threats)
│       └── Request Validator (1 threat)
├── Payment Service (5 threats)
│   └── [Expand] Payment Service Internals
│       ├── Stripe Connector (3 threats)
│       ├── Fraud Detection (4 threats)
│       └── Transaction Logger (1 threat)
├── User Database (2 threats)
└── Order Database (1 threat)

Total: 29 threats across 2 levels
```

## Concrete Example: Image-Based Workflow

**Scenario**: Team conducted a whiteboard threat modeling session, wants to capture results without recreating the DFD digitally.

```
Threat Model: "Mobile Banking App"
│
├── 📷 Attachments:
│   ├── whiteboard-photo-1.jpg (system overview)
│   └── whiteboard-photo-2.jpg (auth flow detail)
│
├── 🖥️ System Component (auto-created)
│   ├── System-level threats:
│   │   ├── T1: Insufficient logging across services
│   │   └── T2: No centralized secret management
│   │
│   └── Manual Components:
│       ├── Mobile App (3 threats)
│       ├── API Gateway (4 threats)
│       ├── Auth Service (5 threats)
│       │   └── Child Components (from decomposition):
│       │       ├── Token Manager (2 threats)
│       │       └── Session Store (1 threat)
│       └── Core Banking API (3 threats)
```

**Threat Analysis View**:

```
Mobile Banking App
├── [System-Level] (2 threats)          ← threats without specific component
├── Mobile App (3 threats)              ← manually added
├── API Gateway (4 threats)             ← manually added
├── Auth Service (5 threats)            ← manually added
│   └── [Expand] Auth Service Details   ← optional decomposition DFD
│       ├── Token Manager (2 threats)
│       └── Session Store (1 threat)
└── Core Banking API (3 threats)        ← manually added

Total: 20 threats
Attachments: 2 whiteboard photos
```

## User Workflow

### Creating the First DFD

1. User creates a new threat model
2. User clicks "Create DFD"
3. Primary DFD is created - user adds components, data flows, trust boundaries
4. Threats and countermeasures auto-populate (or user can choose manual mode)

### Creating Additional DFDs

1. User clicks "Create DFD" again
2. System shows prompt:

```
┌─────────────────────────────────────────────────────────────┐
│  You already have a DFD for this threat model.              │
│                                                             │
│  What kind of DFD would you like to create?                 │
│                                                             │
│  ○ Decomposition - Zoom into a component from an existing   │
│    DFD to model its internals in more detail                │
│                                                             │
│  ○ Reference - A separate diagram for documentation only    │
│    (won't add components to threat analysis)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

3. If "Decomposition" selected:
   - User sees dropdown of components from existing DFDs
   - Selecting a component creates a child DFD linked to that component
   - New components/threats in this DFD nest under the parent component

4. If "Reference" selected:
   - DFD is created but marked as reference-only
   - Components and threats are visible but excluded from aggregated analysis

### Image-Based Workflow (No DFD Editor)

Users who prefer not to use the DFD editor can work entirely with uploaded images and manual entry.

**Step 1: Upload Reference Images**

1. User creates a new threat model
2. Instead of "Create DFD", user clicks "Upload Image"
3. User uploads whiteboard photos, exported diagrams, or other reference material
4. Images are stored as attachments for reference during threat analysis

**Step 2: Add Components (Optional)**

1. User navigates to Threat Analysis workspace
2. User clicks "Add Component"
3. User enters component name and type (process, datastore, etc.)
4. Component is created under the System Component (no DFD canvas needed)

```
┌─────────────────────────────────────────────────────────────┐
│  Add Component                                              │
│                                                             │
│  Name: [API Gateway________________]                        │
│                                                             │
│  Type: ○ Process  ○ Datastore  ○ External Entity           │
│                                                             │
│  Description: [Optional description...]                     │
│                                                             │
│  [Cancel]                              [Add Component]      │
└─────────────────────────────────────────────────────────────┘
```

**Step 3: Add Threats**

Users can add threats to:
- **Specific components**: Click component → "Add Threat"
- **System level**: Click "System" → "Add Threat" (for threats that span multiple components or apply to the system as a whole)

```
┌─────────────────────────────────────────────────────────────┐
│  Add Threat                                                 │
│                                                             │
│  Target: [System-Level ▼] or [API Gateway ▼]                │
│                                                             │
│  Select from library:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☐ SQL Injection (Tampering)                         │   │
│  │ ☐ Broken Authentication (Spoofing)                  │   │
│  │ ☐ Sensitive Data Exposure (Info Disclosure)         │   │
│  │ ☐ ...                                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Or add custom threat:                                      │
│  [+ Add Custom Threat]                                      │
│                                                             │
│  ☑ Auto-generate countermeasures                           │
│                                                             │
│  [Cancel]                                  [Add Threats]    │
└─────────────────────────────────────────────────────────────┘
```

**Step 4: Manage Countermeasures**

Same as DFD-based workflow - users can:
- Accept auto-generated countermeasures
- Add custom countermeasures
- Assign owners
- Update status (gap → planned → verified)

### Manual Threat Mode

When creating any DFD, users can toggle "Manual Mode":

```
┌─────────────────────────────────────────────────────────────┐
│  Threat Generation                                          │
│                                                             │
│  ○ Auto-generate threats based on component technologies    │
│    (Recommended for most users)                             │
│                                                             │
│  ○ Manual mode - I'll add threats myself                    │
│    (For experienced threat modelers)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

In manual mode:
- No threats are auto-generated when components are added
- Users click "Add Threat" on each component to manually select applicable threats
- Users can still use the threat library or create custom threats

---

# Technical Implementation

## 1. Backend Data Model Changes

### ThreatModel Model (Updated)

**File**: `backend/apps/diagrams/models.py`

Add auto-created system component:

```python
class ThreatModel(models.Model):
    """Threat model with auto-created system component."""

    # Existing fields...
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    organization = models.ForeignKey('organizations.Organization', ...)
    # ... other existing fields ...

    # New: Auto-created system component (root of component hierarchy)
    system_component = models.OneToOneField(
        'systems.OrgsystemComponent',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='threat_model_as_system',
        help_text="Auto-created root component representing the system"
    )

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Auto-create system component for new threat models
        if is_new and not self.system_component:
            from apps.systems.models import OrgsystemComponent
            system_comp = OrgsystemComponent.objects.create(
                name=f"{self.name} (System)",
                component_type='system',
                source='auto',
                organization=self.organization,
            )
            self.system_component = system_comp
            self.save(update_fields=['system_component'])
```

### ThreatModelAttachment Model (New)

**File**: `backend/apps/diagrams/models.py`

```python
class ThreatModelAttachment(models.Model):
    """Reference images/documents for a threat model (e.g., whiteboard photos)."""

    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    file = models.FileField(upload_to='threat_model_attachments/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(
        max_length=20,
        choices=[
            ('whiteboard', 'Whiteboard Photo'),
            ('diagram', 'Diagram Export'),
            ('document', 'Document'),
            ('other', 'Other'),
        ],
        default='whiteboard'
    )
    description = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.file_name} ({self.threat_model.name})"
```

### OrgsystemComponent Model (Updated)

**File**: `backend/apps/systems/models.py`

```python
class OrgsystemComponent(models.Model):
    """Component that can be on a DFD canvas or manually created."""

    # Existing fields...
    name = models.CharField(max_length=255)
    component_type = models.CharField(
        max_length=50,
        choices=[
            ('process', 'Process'),
            ('datastore', 'Datastore'),
            ('external_entity', 'External Entity'),
            ('system', 'System'),  # NEW: for auto-created system components
        ]
    )
    organization = models.ForeignKey('organizations.Organization', ...)

    # New fields for flexible component creation
    source = models.CharField(
        max_length=20,
        choices=[
            ('dfd', 'From DFD Editor'),
            ('manual', 'Manually Added'),
            ('auto', 'Auto-Created'),
            ('imported', 'Imported'),
        ],
        default='dfd'
    )

    # Direct link to threat model (for non-DFD components)
    threat_model = models.ForeignKey(
        'diagrams.ThreatModel',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='manual_components',
        help_text="For manually added components not on any DFD"
    )

    # Parent component (for hierarchy)
    parent_component = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='child_components',
        help_text="Parent component in hierarchy (usually the system component)"
    )

    class Meta:
        ordering = ['name']
```

### ComponentInstanceThreat Model (Updated)

**File**: `backend/apps/threats/models.py`

```python
class ComponentInstanceThreat(models.Model):
    """Threat instance - can belong to a component OR directly to threat model (system-level)."""

    # Make component optional for system-level threats
    component = models.ForeignKey(
        'systems.OrgsystemComponent',
        null=True,  # CHANGED: allow null for system-level threats
        blank=True,
        on_delete=models.CASCADE,
        related_name='threats',
    )

    # Direct threat model link for system-level threats
    threat_model = models.ForeignKey(
        'diagrams.ThreatModel',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='direct_threats',
        help_text="For system-level threats not tied to a specific component"
    )

    threat_library = models.ForeignKey('ThreatLibrary', ...)
    inherent_severity = models.CharField(max_length=20, ...)
    residual_severity = models.CharField(max_length=20, ...)
    status = models.CharField(max_length=20, ...)
    justification = models.TextField(blank=True)

    # ... other existing fields ...

    class Meta:
        # Updated constraint: unique per (component, threat) OR (threat_model, threat) for system-level
        constraints = [
            models.UniqueConstraint(
                fields=['component', 'threat_library'],
                condition=models.Q(component__isnull=False),
                name='unique_component_threat'
            ),
            models.UniqueConstraint(
                fields=['threat_model', 'threat_library'],
                condition=models.Q(component__isnull=True, threat_model__isnull=False),
                name='unique_system_threat'
            ),
        ]

    def clean(self):
        # Ensure threat has either a component or a threat_model (or both via component's threat_model)
        if not self.component and not self.threat_model:
            raise ValidationError("Threat must belong to a component or threat model")
```

### DFD Model

**File**: `backend/apps/diagrams/models.py`

```python
class DFD(models.Model):
    """Data Flow Diagram with hierarchical support."""

    # Existing fields
    name = models.CharField(max_length=255)
    diagram_type = models.CharField(max_length=50, default="dfd")
    canvas_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, ...)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, ...)

    # New fields for hierarchy
    parent_dfd = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='child_dfds',
        help_text="Parent DFD if this is a decomposition"
    )
    parent_component = models.ForeignKey(
        'systems.OrgsystemComponent',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='decomposition_dfds',
        help_text="The component this DFD decomposes (for decomposition DFDs)"
    )
    dfd_type = models.CharField(
        max_length=20,
        choices=[
            ('primary', 'Primary'),
            ('decomposition', 'Decomposition'),
            ('reference', 'Reference'),
        ],
        default='primary'
    )
    auto_generate_threats = models.BooleanField(
        default=True,
        help_text="If False, threats must be added manually"
    )

    class Meta:
        ordering = ['-updated_at']

    def get_hierarchy_depth(self):
        """Return depth in hierarchy (0 for primary, 1+ for decompositions)."""
        depth = 0
        current = self
        while current.parent_dfd:
            depth += 1
            current = current.parent_dfd
        return depth

    def get_root_dfd(self):
        """Return the primary/root DFD in this hierarchy."""
        current = self
        while current.parent_dfd:
            current = current.parent_dfd
        return current
```

### ThreatModelDFD Join Table

**File**: `backend/apps/diagrams/models.py`

```python
class ThreatModelDFD(models.Model):
    """Association between threat model and DFD."""

    threat_model = models.ForeignKey(
        ThreatModel,
        on_delete=models.CASCADE,
        related_name="dfd_associations",
    )
    dfd = models.ForeignKey(
        DFD,
        on_delete=models.CASCADE,
        related_name="threat_model_associations",
    )
    is_root = models.BooleanField(
        default=False,
        help_text="True if this is the primary/root DFD for the threat model"
    )

    class Meta:
        unique_together = ["threat_model", "dfd"]

    def save(self, *args, **kwargs):
        # Ensure only one root DFD per threat model
        if self.is_root:
            ThreatModelDFD.objects.filter(
                threat_model=self.threat_model,
                is_root=True
            ).exclude(pk=self.pk).update(is_root=False)
        super().save(*args, **kwargs)
```

### Migration

**File**: `backend/apps/diagrams/migrations/XXXX_add_hierarchical_dfd.py`

```python
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('diagrams', 'previous_migration'),
        ('systems', 'latest_migration'),
        ('threats', 'latest_migration'),
    ]

    operations = [
        # === ThreatModel changes ===
        migrations.AddField(
            model_name='threatmodel',
            name='system_component',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='threat_model_as_system',
                to='systems.orgsystemcomponent',
            ),
        ),

        # === ThreatModelAttachment (new model) ===
        migrations.CreateModel(
            name='ThreatModelAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('file', models.FileField(upload_to='threat_model_attachments/%Y/%m/')),
                ('file_name', models.CharField(max_length=255)),
                ('file_type', models.CharField(
                    choices=[
                        ('whiteboard', 'Whiteboard Photo'),
                        ('diagram', 'Diagram Export'),
                        ('document', 'Document'),
                        ('other', 'Other'),
                    ],
                    default='whiteboard',
                    max_length=20,
                )),
                ('description', models.TextField(blank=True)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('threat_model', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='attachments',
                    to='diagrams.threatmodel',
                )),
                ('uploaded_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='users.user',
                )),
            ],
            options={'ordering': ['-uploaded_at']},
        ),

        # === DFD hierarchy fields ===
        migrations.AddField(
            model_name='dfd',
            name='parent_dfd',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='child_dfds',
                to='diagrams.dfd',
            ),
        ),
        migrations.AddField(
            model_name='dfd',
            name='parent_component',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='decomposition_dfds',
                to='systems.orgsystemcomponent',
            ),
        ),
        migrations.AddField(
            model_name='dfd',
            name='dfd_type',
            field=models.CharField(
                choices=[
                    ('primary', 'Primary'),
                    ('decomposition', 'Decomposition'),
                    ('reference', 'Reference'),
                ],
                default='primary',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='dfd',
            name='auto_generate_threats',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='threatmodeldfd',
            name='is_root',
            field=models.BooleanField(default=False),
        ),

        # === OrgsystemComponent changes ===
        migrations.AddField(
            model_name='orgsystemcomponent',
            name='source',
            field=models.CharField(
                choices=[
                    ('dfd', 'From DFD Editor'),
                    ('manual', 'Manually Added'),
                    ('auto', 'Auto-Created'),
                    ('imported', 'Imported'),
                ],
                default='dfd',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='orgsystemcomponent',
            name='threat_model',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='manual_components',
                to='diagrams.threatmodel',
            ),
        ),
        migrations.AddField(
            model_name='orgsystemcomponent',
            name='parent_component',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='child_components',
                to='systems.orgsystemcomponent',
            ),
        ),

        # === ComponentInstanceThreat changes ===
        migrations.AlterField(
            model_name='componentinstancethreat',
            name='component',
            field=models.ForeignKey(
                blank=True,
                null=True,  # Allow null for system-level threats
                on_delete=django.db.models.deletion.CASCADE,
                related_name='threats',
                to='systems.orgsystemcomponent',
            ),
        ),
        migrations.AddField(
            model_name='componentinstancethreat',
            name='threat_model',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='direct_threats',
                to='diagrams.threatmodel',
            ),
        ),

        # === Data migrations ===
        migrations.RunPython(create_system_components_for_existing),
        migrations.RunPython(mark_existing_dfds_as_primary),
    ]


def create_system_components_for_existing(apps, schema_editor):
    """Create system components for existing threat models."""
    ThreatModel = apps.get_model('diagrams', 'ThreatModel')
    OrgsystemComponent = apps.get_model('systems', 'OrgsystemComponent')

    for tm in ThreatModel.objects.filter(system_component__isnull=True):
        system_comp = OrgsystemComponent.objects.create(
            name=f"{tm.name} (System)",
            component_type='system',
            source='auto',
            organization_id=tm.organization_id,
        )
        tm.system_component = system_comp
        tm.save(update_fields=['system_component'])


def mark_existing_dfds_as_primary(apps, schema_editor):
    """Mark existing DFDs as primary and set is_root on first association."""
    ThreatModelDFD = apps.get_model('diagrams', 'ThreatModelDFD')
    DFD = apps.get_model('diagrams', 'DFD')

    # Set all existing DFDs to primary type
    DFD.objects.filter(dfd_type='').update(dfd_type='primary')

    # For each threat model, mark the oldest DFD association as root
    threat_model_ids = ThreatModelDFD.objects.values_list(
        'threat_model_id', flat=True
    ).distinct()

    for tm_id in threat_model_ids:
        oldest = ThreatModelDFD.objects.filter(
            threat_model_id=tm_id
        ).order_by('dfd__created_at').first()
        if oldest:
            oldest.is_root = True
            oldest.save()
```

## 2. Backend API Changes

### Serializers

**File**: `backend/apps/diagrams/serializers.py`

```python
class DFDSerializer(serializers.ModelSerializer):
    child_dfds = serializers.SerializerMethodField()
    parent_component_name = serializers.SerializerMethodField()
    hierarchy_depth = serializers.SerializerMethodField()

    class Meta:
        model = DFD
        fields = [
            'id', 'name', 'diagram_type', 'canvas_data',
            'created_at', 'updated_at',
            # New hierarchy fields
            'parent_dfd', 'parent_component', 'parent_component_name',
            'dfd_type', 'auto_generate_threats',
            'child_dfds', 'hierarchy_depth',
        ]

    def get_child_dfds(self, obj):
        children = obj.child_dfds.all()
        return DFDSummarySerializer(children, many=True).data

    def get_parent_component_name(self, obj):
        if obj.parent_component:
            return obj.parent_component.name
        return None

    def get_hierarchy_depth(self, obj):
        return obj.get_hierarchy_depth()


class DFDSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for hierarchy display."""

    class Meta:
        model = DFD
        fields = ['id', 'name', 'dfd_type', 'parent_component']


class DFDCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating DFDs with hierarchy support."""

    class Meta:
        model = DFD
        fields = [
            'name', 'diagram_type', 'canvas_data',
            'parent_dfd', 'parent_component', 'dfd_type',
            'auto_generate_threats',
        ]

    def validate(self, data):
        dfd_type = data.get('dfd_type', 'primary')

        if dfd_type == 'decomposition':
            if not data.get('parent_dfd'):
                raise serializers.ValidationError(
                    "Decomposition DFDs must have a parent_dfd"
                )
            if not data.get('parent_component'):
                raise serializers.ValidationError(
                    "Decomposition DFDs must specify which component they decompose"
                )

        if dfd_type == 'primary' and data.get('parent_dfd'):
            raise serializers.ValidationError(
                "Primary DFDs cannot have a parent"
            )

        return data
```

### Views

**File**: `backend/apps/diagrams/views.py`

```python
class DFDViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    @action(detail=False, methods=['get'])
    def hierarchy(self, request):
        """Get DFD hierarchy for a threat model."""
        threat_model_id = request.query_params.get('threat_model_id')
        if not threat_model_id:
            return Response(
                {"error": "threat_model_id required"},
                status=400
            )

        # Get root DFDs (primary type, no parent)
        root_associations = ThreatModelDFD.objects.filter(
            threat_model_id=threat_model_id,
            dfd__dfd_type='primary'
        ).select_related('dfd')

        def build_hierarchy(dfd):
            """Recursively build DFD hierarchy."""
            data = DFDSerializer(dfd).data
            data['children'] = [
                build_hierarchy(child)
                for child in dfd.child_dfds.exclude(dfd_type='reference')
            ]
            return data

        hierarchy = [build_hierarchy(assoc.dfd) for assoc in root_associations]

        # Also include reference DFDs separately
        reference_dfds = DFD.objects.filter(
            threat_model_associations__threat_model_id=threat_model_id,
            dfd_type='reference'
        )

        return Response({
            'hierarchy': hierarchy,
            'reference_dfds': DFDSerializer(reference_dfds, many=True).data,
        })

    @action(detail=False, methods=['get'])
    def available_components(self, request):
        """Get components available for decomposition."""
        threat_model_id = request.query_params.get('threat_model_id')
        if not threat_model_id:
            return Response({"error": "threat_model_id required"}, status=400)

        # Get all components from non-reference DFDs
        dfd_ids = ThreatModelDFD.objects.filter(
            threat_model_id=threat_model_id
        ).exclude(
            dfd__dfd_type='reference'
        ).values_list('dfd_id', flat=True)

        dfds = DFD.objects.filter(id__in=dfd_ids)

        components = []
        for dfd in dfds:
            canvas_data = dfd.canvas_data or {}
            for node in canvas_data.get('nodes', []):
                if node.get('type') in ('process', 'datastore'):
                    component_id = node.get('data', {}).get('component_id')
                    if component_id:
                        components.append({
                            'component_id': component_id,
                            'node_id': node.get('id'),
                            'name': node.get('data', {}).get('label', 'Unnamed'),
                            'type': node.get('type'),
                            'dfd_id': str(dfd.id),
                            'dfd_name': dfd.name,
                        })

        # Deduplicate by component_id
        seen = set()
        unique_components = []
        for comp in components:
            if comp['component_id'] not in seen:
                seen.add(comp['component_id'])
                unique_components.append(comp)

        return Response(unique_components)


class ThreatModelViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    @action(detail=True, methods=['get'])
    def threats(self, request, pk=None):
        """Get hierarchical threats for this threat model."""
        threat_model = self.get_object()

        # Get all non-reference DFDs
        dfd_associations = threat_model.dfd_associations.select_related('dfd').exclude(
            dfd__dfd_type='reference'
        )

        # Build component hierarchy with threats
        def get_threats_for_dfd(dfd, parent_component_id=None):
            """Get threats for a DFD, respecting hierarchy."""
            canvas_data = dfd.canvas_data or {}
            components = []

            for node in canvas_data.get('nodes', []):
                if node.get('type') not in ('process', 'datastore'):
                    continue

                component_id = node.get('data', {}).get('component_id')
                if not component_id:
                    continue

                # Get threats for this component
                threats = ComponentInstanceThreat.objects.filter(
                    component_id=component_id
                ).select_related('threat_library').prefetch_related('countermeasures')

                component_data = {
                    'component_id': component_id,
                    'name': node.get('data', {}).get('label'),
                    'type': node.get('type'),
                    'dfd_id': str(dfd.id),
                    'dfd_name': dfd.name,
                    'hierarchy_depth': dfd.get_hierarchy_depth(),
                    'parent_component_id': parent_component_id,
                    'threats': [...],  # Serialized threats
                    'child_components': [],  # Populated from child DFDs
                }

                # Get child DFDs that decompose this component
                child_dfds = dfd.child_dfds.filter(
                    parent_component_id=component_id,
                    dfd_type='decomposition'
                )
                for child_dfd in child_dfds:
                    child_components = get_threats_for_dfd(child_dfd, component_id)
                    component_data['child_components'].extend(child_components)

                components.append(component_data)

            return components

        # Start from root DFDs
        result = []
        for assoc in dfd_associations:
            if assoc.dfd.dfd_type == 'primary':
                result.extend(get_threats_for_dfd(assoc.dfd))

        return Response({
            'threat_model_id': str(threat_model.id),
            'components': result,
        })
```

### Attachment Views (New)

**File**: `backend/apps/diagrams/views.py`

```python
class ThreatModelAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing threat model attachments (whiteboard photos, etc.)."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return ThreatModelAttachment.objects.filter(
            threat_model__organization__members=self.request.user
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return ThreatModelAttachmentCreateSerializer
        return ThreatModelAttachmentSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class ThreatModelAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = ThreatModelAttachment
        fields = [
            'id', 'threat_model', 'file', 'file_name', 'file_type',
            'description', 'uploaded_at', 'uploaded_by_email',
        ]


class ThreatModelAttachmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreatModelAttachment
        fields = ['threat_model', 'file', 'file_name', 'file_type', 'description']
```

### Manual Component API (New)

**File**: `backend/apps/systems/views.py`

```python
class ManualComponentViewSet(viewsets.ModelViewSet):
    """ViewSet for manually created components (not from DFD editor)."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrgsystemComponent.objects.filter(
            source='manual',
            threat_model__organization__members=self.request.user
        )

    @action(detail=False, methods=['post'])
    def create_for_threat_model(self, request):
        """Create a manual component for a threat model."""
        threat_model_id = request.data.get('threat_model_id')
        name = request.data.get('name')
        component_type = request.data.get('component_type', 'process')

        threat_model = get_object_or_404(ThreatModel, id=threat_model_id)

        # Create component under the system component
        component = OrgsystemComponent.objects.create(
            name=name,
            component_type=component_type,
            source='manual',
            threat_model=threat_model,
            parent_component=threat_model.system_component,
            organization=threat_model.organization,
        )

        return Response(
            OrgsystemComponentSerializer(component).data,
            status=201
        )
```

### System-Level Threat API (New)

**File**: `backend/apps/threats/views.py`

```python
class ComponentInstanceThreatViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    @action(detail=False, methods=['post'])
    def add_system_threat(self, request):
        """Add a system-level threat (not tied to a specific component)."""
        threat_model_id = request.data.get('threat_model_id')
        threat_library_id = request.data.get('threat_library_id')

        threat_model = get_object_or_404(ThreatModel, id=threat_model_id)

        # Check if threat already exists at system level
        existing = ComponentInstanceThreat.objects.filter(
            threat_model=threat_model,
            component__isnull=True,
            threat_library_id=threat_library_id
        ).first()

        if existing:
            return Response(
                {"error": "System-level threat already exists"},
                status=400
            )

        # Create system-level threat (no component)
        threat = ComponentInstanceThreat.objects.create(
            threat_model=threat_model,
            component=None,  # System-level
            threat_library_id=threat_library_id,
            inherent_severity='medium',
            status='identified',
        )

        if request.data.get('auto_countermeasures', True):
            generate_countermeasures_for_threat(threat)

        return Response(
            ComponentInstanceThreatSerializer(threat).data,
            status=201
        )
```

## 3. Frontend Changes

### Types

**File**: `frontend/src/types/index.ts`

```typescript
export type DFDType = 'primary' | 'decomposition' | 'reference'

export interface DFD {
  id: string
  name: string
  diagramType: string
  canvasData: CanvasData
  createdAt: string
  updatedAt: string

  // Hierarchy fields
  dfdType: DFDType
  parentDfdId?: string
  parentComponentId?: string
  parentComponentName?: string
  autoGenerateThreats: boolean
  hierarchyDepth: number
  childDfds?: DFDSummary[]
}

export interface DFDSummary {
  id: string
  name: string
  dfdType: DFDType
  parentComponentId?: string
}

export interface DFDHierarchy {
  hierarchy: DFDWithChildren[]
  referenceDfds: DFD[]
}

export interface DFDWithChildren extends DFD {
  children: DFDWithChildren[]
}

export interface AvailableComponent {
  componentId: string
  nodeId: string
  name: string
  type: 'process' | 'datastore'
  dfdId: string
  dfdName: string
}

// Image-based workflow types
export interface ThreatModelAttachment {
  id: string
  threatModelId: string
  file: string  // URL
  fileName: string
  fileType: 'whiteboard' | 'diagram' | 'document' | 'other'
  description?: string
  uploadedAt: string
  uploadedByEmail?: string
}

export interface ManualComponent {
  id: string
  name: string
  componentType: 'process' | 'datastore' | 'external_entity' | 'system'
  source: 'dfd' | 'manual' | 'auto' | 'imported'
  threatModelId?: string
  parentComponentId?: string
  threatCount?: number
}

export interface SystemLevelThreat {
  id: string
  threatModelId: string
  threatLibraryId: string
  threatName: string
  strideCategory: string
  inherentSeverity: string
  status: string
  countermeasures: Countermeasure[]
}
```

### API Functions

**File**: `frontend/src/api/diagrams.ts`

```typescript
export async function getDFDHierarchy(threatModelId: string): Promise<DFDHierarchy> {
  return api.get(`/diagrams/hierarchy/?threat_model_id=${threatModelId}`)
}

export async function getAvailableComponents(
  threatModelId: string
): Promise<AvailableComponent[]> {
  return api.get(`/diagrams/available_components/?threat_model_id=${threatModelId}`)
}

export interface CreateDFDParams {
  threatModelId: string
  name: string
  dfdType: DFDType
  parentDfdId?: string
  parentComponentId?: string
  autoGenerateThreats?: boolean
}

export async function createDFD(params: CreateDFDParams): Promise<DFD> {
  return api.post('/diagrams/create_for_threat_model/', {
    threat_model_id: params.threatModelId,
    name: params.name,
    dfd_type: params.dfdType,
    parent_dfd: params.parentDfdId,
    parent_component: params.parentComponentId,
    auto_generate_threats: params.autoGenerateThreats ?? true,
    canvas_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  })
}

// === Image-based workflow API ===

export async function uploadAttachment(
  threatModelId: string,
  file: File,
  fileType: ThreatModelAttachment['fileType'] = 'whiteboard',
  description?: string
): Promise<ThreatModelAttachment> {
  const formData = new FormData()
  formData.append('threat_model', threatModelId)
  formData.append('file', file)
  formData.append('file_name', file.name)
  formData.append('file_type', fileType)
  if (description) formData.append('description', description)

  return api.post('/threat-model-attachments/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export async function getAttachments(threatModelId: string): Promise<ThreatModelAttachment[]> {
  return api.get(`/threat-model-attachments/?threat_model=${threatModelId}`)
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  return api.delete(`/threat-model-attachments/${attachmentId}/`)
}

export async function createManualComponent(
  threatModelId: string,
  name: string,
  componentType: ManualComponent['componentType']
): Promise<ManualComponent> {
  return api.post('/components/create_for_threat_model/', {
    threat_model_id: threatModelId,
    name,
    component_type: componentType,
  })
}

export async function addSystemLevelThreat(
  threatModelId: string,
  threatLibraryId: string,
  autoCountermeasures = true
): Promise<SystemLevelThreat> {
  return api.post('/threats/add_system_threat/', {
    threat_model_id: threatModelId,
    threat_library_id: threatLibraryId,
    auto_countermeasures: autoCountermeasures,
  })
}
```

### Create DFD Dialog Component

**File**: `frontend/src/components/diagrams/CreateDFDDialog.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getAvailableComponents, type CreateDFDParams, type DFDType } from '@/api/diagrams'

interface CreateDFDDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  hasExistingDFDs: boolean
  onSubmit: (params: CreateDFDParams) => void
  isSubmitting: boolean
}

export function CreateDFDDialog({
  open,
  onOpenChange,
  threatModelId,
  hasExistingDFDs,
  onSubmit,
  isSubmitting,
}: CreateDFDDialogProps) {
  const [name, setName] = useState('')
  const [dfdType, setDfdType] = useState<DFDType>(hasExistingDFDs ? 'decomposition' : 'primary')
  const [selectedComponentId, setSelectedComponentId] = useState<string>('')
  const [autoGenerateThreats, setAutoGenerateThreats] = useState(true)

  const { data: availableComponents = [] } = useQuery({
    queryKey: ['available-components', threatModelId],
    queryFn: () => getAvailableComponents(threatModelId),
    enabled: open && hasExistingDFDs,
  })

  const handleSubmit = () => {
    const selectedComponent = availableComponents.find(
      (c) => c.componentId === selectedComponentId
    )

    onSubmit({
      threatModelId,
      name,
      dfdType,
      parentDfdId: selectedComponent?.dfdId,
      parentComponentId: dfdType === 'decomposition' ? selectedComponentId : undefined,
      autoGenerateThreats,
    })
  }

  const isValid =
    name.trim() &&
    (dfdType !== 'decomposition' || selectedComponentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create DFD</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* DFD Name */}
          <div className="space-y-2">
            <Label htmlFor="name">DFD Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Payment Service Internals"
            />
          </div>

          {/* DFD Type Selection (only if existing DFDs) */}
          {hasExistingDFDs && (
            <div className="space-y-3">
              <Label>DFD Type</Label>
              <p className="text-sm text-muted-foreground">
                You already have a DFD for this threat model. What kind of DFD would you like to create?
              </p>
              <RadioGroup
                value={dfdType}
                onValueChange={(v) => setDfdType(v as DFDType)}
              >
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="decomposition" id="decomposition" className="mt-1" />
                  <div>
                    <Label htmlFor="decomposition" className="font-medium">
                      Decomposition
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Zoom into a component from an existing DFD to model its internals in more detail
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="reference" id="reference" className="mt-1" />
                  <div>
                    <Label htmlFor="reference" className="font-medium">
                      Reference
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      A separate diagram for documentation only (won't add components to threat analysis)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Component Selection (for decomposition) */}
          {dfdType === 'decomposition' && (
            <div className="space-y-2">
              <Label>Select Component to Decompose</Label>
              <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a component..." />
                </SelectTrigger>
                <SelectContent>
                  {availableComponents.map((comp) => (
                    <SelectItem key={comp.componentId} value={comp.componentId}>
                      {comp.name} ({comp.type}) - from {comp.dfdName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Threat Generation Mode */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="auto-threats" className="font-medium">
                Auto-generate threats
              </Label>
              <p className="text-sm text-muted-foreground">
                {autoGenerateThreats
                  ? 'Threats will be generated based on component technologies'
                  : 'You will add threats manually'}
              </p>
            </div>
            <Switch
              id="auto-threats"
              checked={autoGenerateThreats}
              onCheckedChange={setAutoGenerateThreats}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create DFD'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Updated Threat Analysis Aggregation

**File**: `frontend/src/components/workspace/useWorkspaceThreatAnalysis.ts`

Update the summaries calculation to exclude reference DFDs:

```typescript
const summaries = useMemo(() => {
  // Filter out reference DFDs
  const analyzableDiagrams = diagrams.filter(
    (d) => d.dfdType !== 'reference'
  )

  const allNodes = analyzableDiagrams.flatMap((d) => d.canvasData?.nodes || [])
  // ... rest of calculation
}, [state.componentThreats, diagrams])
```

### Hierarchical Component View

**File**: `frontend/src/features/dfd-editor/components/threat-analysis/HierarchicalComponentList.tsx`

```typescript
interface HierarchicalComponentListProps {
  components: HierarchicalComponent[]
  selectedComponentId: string | null
  onSelectComponent: (id: string) => void
}

interface HierarchicalComponent {
  componentId: string
  name: string
  type: string
  threatCount: number
  hierarchyDepth: number
  children: HierarchicalComponent[]
}

export function HierarchicalComponentList({
  components,
  selectedComponentId,
  onSelectComponent,
}: HierarchicalComponentListProps) {
  const renderComponent = (component: HierarchicalComponent, depth = 0) => (
    <div key={component.componentId}>
      <button
        onClick={() => onSelectComponent(component.componentId)}
        className={cn(
          'w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2',
          selectedComponentId === component.componentId && 'bg-muted',
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {component.children.length > 0 && (
          <ChevronRight className="h-4 w-4" />
        )}
        <ComponentIcon type={component.type} />
        <span className="flex-1 truncate">{component.name}</span>
        <Badge variant="secondary">{component.threatCount}</Badge>
      </button>

      {component.children.map((child) => renderComponent(child, depth + 1))}
    </div>
  )

  return (
    <div className="divide-y">
      {components.map((comp) => renderComponent(comp))}
    </div>
  )
}
```

### Image Upload Component (New)

**File**: `frontend/src/components/workspace/ImageUpload.tsx`

```typescript
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, Image, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadAttachment, deleteAttachment } from '@/api/diagrams'
import type { ThreatModelAttachment } from '@/types'

interface ImageUploadProps {
  threatModelId: string
  attachments: ThreatModelAttachment[]
}

export function ImageUpload({ threatModelId, attachments }: ImageUploadProps) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(threatModelId, file, 'whiteboard'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', threatModelId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', threatModelId] })
    },
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    for (const file of acceptedFiles) {
      await uploadMutation.mutateAsync(file)
    }
    setUploading(false)
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
  })

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          uploading && 'opacity-50 pointer-events-none'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop whiteboard photos, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG, PDF up to 10MB
        </p>
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group border rounded-lg overflow-hidden"
            >
              {attachment.fileType === 'whiteboard' || attachment.fileType === 'diagram' ? (
                <img
                  src={attachment.file}
                  alt={attachment.fileName}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(attachment.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-2 text-xs truncate">{attachment.fileName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Add Manual Component Dialog (New)

**File**: `frontend/src/components/workspace/AddManualComponentDialog.tsx`

```typescript
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createManualComponent } from '@/api/diagrams'
import type { ManualComponent } from '@/types'

interface AddManualComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
}

export function AddManualComponentDialog({
  open,
  onOpenChange,
  threatModelId,
}: AddManualComponentDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [componentType, setComponentType] = useState<ManualComponent['componentType']>('process')

  const mutation = useMutation({
    mutationFn: () => createManualComponent(threatModelId, name, componentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-model', threatModelId] })
      queryClient.invalidateQueries({ queryKey: ['components', threatModelId] })
      setName('')
      setComponentType('process')
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Component</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Component Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., API Gateway, User Database"
            />
          </div>

          <div className="space-y-2">
            <Label>Component Type</Label>
            <RadioGroup
              value={componentType}
              onValueChange={(v) => setComponentType(v as ManualComponent['componentType'])}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="process" id="process" />
                <Label htmlFor="process">Process</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="datastore" id="datastore" />
                <Label htmlFor="datastore">Datastore</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external_entity" id="external_entity" />
                <Label htmlFor="external_entity">External Entity</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
          >
            {mutation.isPending ? 'Adding...' : 'Add Component'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Updated Threat Analysis Workspace (Image-Based Mode)

**File**: `frontend/src/components/workspace/ThreatAnalysisWorkspace.tsx`

```typescript
// Key changes to support image-based workflow:

export function ThreatAnalysisWorkspace({ threatModelId }: Props) {
  const { data: threatModel } = useThreatModel(threatModelId)
  const { data: attachments = [] } = useAttachments(threatModelId)
  const { data: dfds = [] } = useDFDs(threatModelId)

  const [addComponentOpen, setAddComponentOpen] = useState(false)
  const [addThreatOpen, setAddThreatOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<'system' | string>('system')

  // Determine workflow mode
  const hasCanvasDFDs = dfds.some((d) => d.canvasData?.nodes?.length > 0)
  const hasAttachments = attachments.length > 0
  const isImageBasedMode = hasAttachments && !hasCanvasDFDs

  return (
    <div className="flex h-full">
      {/* Left Panel: Reference Images or DFD Selector */}
      <div className="w-64 border-r p-4 space-y-4">
        {isImageBasedMode ? (
          <>
            <h3 className="font-medium">Reference Images</h3>
            <ImageUpload
              threatModelId={threatModelId}
              attachments={attachments}
            />
          </>
        ) : (
          <>
            <h3 className="font-medium">DFDs</h3>
            <DFDSelector dfds={dfds} />
          </>
        )}
      </div>

      {/* Middle Panel: Components */}
      <div className="w-72 border-r">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-medium">Components</h3>
          <Button size="sm" onClick={() => setAddComponentOpen(true)}>
            + Add
          </Button>
        </div>

        <div className="divide-y">
          {/* System-level option */}
          <button
            onClick={() => setSelectedTarget('system')}
            className={cn(
              'w-full text-left px-4 py-3 hover:bg-muted/50',
              selectedTarget === 'system' && 'bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span className="font-medium">System-Level</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Threats that span multiple components
            </p>
          </button>

          {/* Manual + DFD components */}
          {threatModel?.manualComponents?.map((comp) => (
            <ComponentListItem
              key={comp.id}
              component={comp}
              selected={selectedTarget === comp.id}
              onSelect={() => setSelectedTarget(comp.id)}
            />
          ))}
        </div>
      </div>

      {/* Right Panel: Threats for selected target */}
      <div className="flex-1">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-medium">
            Threats: {selectedTarget === 'system' ? 'System-Level' : '...'}
          </h3>
          <Button size="sm" onClick={() => setAddThreatOpen(true)}>
            + Add Threat
          </Button>
        </div>

        <ThreatList
          targetType={selectedTarget === 'system' ? 'system' : 'component'}
          targetId={selectedTarget === 'system' ? threatModelId : selectedTarget}
        />
      </div>

      <AddManualComponentDialog
        open={addComponentOpen}
        onOpenChange={setAddComponentOpen}
        threatModelId={threatModelId}
      />

      <AddThreatDialog
        open={addThreatOpen}
        onOpenChange={setAddThreatOpen}
        targetType={selectedTarget === 'system' ? 'system' : 'component'}
        targetId={selectedTarget === 'system' ? threatModelId : selectedTarget}
      />
    </div>
  )
}
```

## 4. Manual Threat Addition

### Backend Endpoint

**File**: `backend/apps/threats/views.py`

```python
class ComponentInstanceThreatViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    @action(detail=False, methods=['post'])
    def add_manual(self, request):
        """Manually add a threat to a component."""
        component_id = request.data.get('component_id')
        threat_library_id = request.data.get('threat_library_id')

        # Validate component exists
        component = get_object_or_404(OrgsystemComponent, id=component_id)

        # Check if threat already exists for this component
        existing = ComponentInstanceThreat.objects.filter(
            component=component,
            threat_library_id=threat_library_id
        ).first()

        if existing:
            return Response(
                {"error": "Threat already exists for this component"},
                status=400
            )

        # Create the threat instance
        threat = ComponentInstanceThreat.objects.create(
            component=component,
            threat_library_id=threat_library_id,
            inherent_severity='medium',  # Default, user can change
            status='identified',
        )

        # Auto-generate countermeasures for this threat
        # (optional, based on user preference)
        if request.data.get('auto_countermeasures', True):
            generate_countermeasures_for_threat(threat)

        return Response(
            ComponentInstanceThreatSerializer(threat).data,
            status=201
        )
```

### Frontend Add Threat Dialog

**File**: `frontend/src/features/dfd-editor/components/threat-analysis/AddThreatDialog.tsx`

```typescript
interface AddThreatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  componentId: string
  componentName: string
  existingThreatIds: string[]
  onAdd: (threatLibraryId: string, autoCountermeasures: boolean) => void
}

export function AddThreatDialog({
  open,
  onOpenChange,
  componentId,
  componentName,
  existingThreatIds,
  onAdd,
}: AddThreatDialogProps) {
  const [selectedThreatId, setSelectedThreatId] = useState<string>('')
  const [autoCountermeasures, setAutoCountermeasures] = useState(true)

  // Filter out already-applied threats
  const availableThreats = THREAT_DEFINITIONS.filter(
    (t) => !existingThreatIds.includes(t.id)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Threat to {componentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Threat</Label>
            <Select value={selectedThreatId} onValueChange={setSelectedThreatId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a threat..." />
              </SelectTrigger>
              <SelectContent>
                {availableThreats.map((threat) => (
                  <SelectItem key={threat.id} value={threat.id}>
                    <div>
                      <span className="font-medium">{threat.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({threat.strideCategory})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={autoCountermeasures}
              onCheckedChange={setAutoCountermeasures}
            />
            <Label>Auto-generate countermeasures</Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onAdd(selectedThreatId, autoCountermeasures)}
            disabled={!selectedThreatId}
          >
            Add Threat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## 5. DFD Templates (Future Enhancement)

For common decomposition patterns, provide templates:

```typescript
const DFD_TEMPLATES = [
  {
    id: 'microservice',
    name: 'Microservice Internals',
    description: 'Common pattern for decomposing a microservice',
    suggestedComponents: [
      { type: 'process', name: 'Request Handler' },
      { type: 'process', name: 'Business Logic' },
      { type: 'datastore', name: 'Local Cache' },
      { type: 'process', name: 'External Client' },
    ],
  },
  {
    id: 'database-cluster',
    name: 'Database Cluster',
    description: 'Primary/replica database setup',
    suggestedComponents: [
      { type: 'datastore', name: 'Primary DB' },
      { type: 'datastore', name: 'Read Replica' },
      { type: 'process', name: 'Connection Pooler' },
    ],
  },
  // ... more templates
]
```

---

## Migration Path

### Phase 1: Core Data Model (Week 1)
- Add new fields to models (DFD, ThreatModel, Component, Threat)
- Create ThreatModelAttachment model
- Run migrations with data migration for existing threat models
- Auto-create system components for existing threat models

### Phase 2: DFD Hierarchy (Week 2)
- Update DFD creation flow with type selection dialog
- Implement decomposition DFD linking
- Update threat aggregation to respect hierarchy
- Add hierarchical display in threat analysis view

### Phase 3: Image-Based Workflow (Week 3)
- Implement attachment upload/management API
- Build image upload UI component
- Add manual component creation flow
- Add system-level threat support

### Phase 4: Polish & Integration (Week 4)
- Unified workspace that supports both workflows
- Manual threat addition UI improvements
- DFD templates for common patterns
- Testing and bug fixes

## Testing Checklist

### DFD Hierarchy
- [ ] Creating first DFD marks it as primary
- [ ] Creating second DFD shows type selection dialog
- [ ] Decomposition DFD links to parent component correctly
- [ ] Reference DFDs excluded from threat analysis
- [ ] Threats nest correctly under parent components
- [ ] Deleting parent DFD cascades to children
- [ ] Migration handles existing data correctly

### System Component
- [ ] System component auto-created with new threat model
- [ ] Existing threat models get system component via migration
- [ ] System-level threats can be added
- [ ] System-level threats appear in analysis view

### Image-Based Workflow
- [ ] Can upload whiteboard photos
- [ ] Can upload multiple images
- [ ] Can delete attachments
- [ ] Images display in workspace
- [ ] Can create manual components without DFD
- [ ] Manual components appear under system component
- [ ] Can add threats to manual components
- [ ] Can add system-level threats without any components

### Manual Threat Mode
- [ ] Auto-generate toggle works on DFD creation
- [ ] Manual threat addition works for components
- [ ] Manual threat addition works for system-level
- [ ] Countermeasure auto-generation toggle works

### Integration
- [ ] Can mix DFD-based and manual components
- [ ] Threat analysis aggregates from all sources
- [ ] Component hierarchy displays correctly
- [ ] Deduplication works when same component in multiple DFDs

---

## Summary

This design provides a unified, flexible threat modeling system that supports multiple workflows:

| Workflow | Entry Point | Components | Threats |
|----------|-------------|------------|---------|
| Full DFD | Create DFD → Canvas Editor | From DFD nodes | Auto-generated |
| DFD + Manual | Create DFD → Manual mode | From DFD nodes | Manually added |
| Image-Based | Upload Photo → Add Components | Manually created | Manually added |
| Threats-Only | Threat Analysis → Add Threat | None (system-level) | Manually added |

### Key Data Model Changes

| Model | Change | Purpose |
|-------|--------|---------|
| `ThreatModel` | Add `system_component` FK | Auto-created root for hierarchy |
| `ThreatModelAttachment` | New model | Store whiteboard photos |
| `DFD` | Add `parent_dfd`, `parent_component`, `dfd_type` | Hierarchical DFDs |
| `OrgsystemComponent` | Add `source`, `threat_model`, `parent_component` | Manual components |
| `ComponentInstanceThreat` | Make `component` nullable, add `threat_model` | System-level threats |

### Component Hierarchy

```
ThreatModel
└── System Component (auto-created)
    ├── DFD Components (from canvas)
    │   └── Decomposition Components (from child DFDs)
    ├── Manual Components (user-created)
    └── [System-Level Threats] (no component)
```

### Benefits

1. **Flexibility**: Supports formal DFD modeling and quick whiteboard capture
2. **No Duplication**: Hierarchical structure prevents component duplication
3. **Progressive Disclosure**: Start simple, add detail as needed
4. **Unified Analysis**: All threats aggregate in one view regardless of source
5. **Team Collaboration**: Upload session artifacts, add findings incrementally
