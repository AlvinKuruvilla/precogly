erDiagram

%% ========================================
%% PRECOGLY THREAT MODELING SCHEMA
%% ========================================
%% NOTE: User FK references point to Django's auth.User model
%% (not defined here - managed by Django auth system)
%% Single-org deployments create one Organization record;
%% multi-tenant SaaS uses multiple.
%%
%% UPDATED: Dec. 27, 2025 - Added Library Packs architecture for
%% modular, installable content bundles.
%%
%% UPDATED: Dec. 27, 2025 - Reviewer feedback fixes:
%% - Added qualified_slug for namespace collision prevention
%% - Added customization tracking (status, base_item) for update/fork handling
%% - Added aliases for backward compatibility with renamed slugs
%% - Added soft delete (is_deleted, deleted_at) for deletion cascades
%% - Added LibraryPackDependency with version constraints
%%
%% UPDATED: Dec. 27, 2025 - Zombie Record Fix:
%% - Changed qualified_slug from unique to partial unique constraint
%% - Uniqueness only enforced where is_deleted=False
%% - Allows multiple soft-deleted records with same slug
%% - Enables pack reinstallation without constraint violations

    %% ===== ORGANIZATIONS (Multi-tenancy) =====
    Organizations {
        int id PK
        string Name
        string Domain
        string Plan "Free/Pro/Enterprise"
        date CreatedDate
    }

    OrganizationMembers {
        int id PK
        int OrganizationID FK
        int UserID FK "Django User"
        string Role "Admin/SecurityTeam/Champion/Viewer"
        date JoinedDate
    }

    %% ===== LIBRARY PACKS (Modular Content) =====
    %% Packs allow bundling of components, threats, countermeasures,
    %% and templates for easy installation and management.
    LibraryPacks {
        int id PK
        string Slug UK "unique identifier e.g. 'banking-technologies'"
        string Name
        string Description
        string PackType "technology/threat/countermeasure/compliance/template/full"
        string Tier "free/premium/enterprise"
        string Source "official/partner/community/private"
        string Version "semantic version e.g. '1.2.0'"
        string Author
        string RepositoryURL "nullable - GitHub or registry URL"
        string DocumentationURL "nullable"
        string IconURL "nullable"
        array Industries "e.g. ['banking', 'fintech']"
        array Tags "e.g. ['aws', 'cloud', 'serverless']"
        json Content "pack content: components, threats, etc."
        int InstallCount
        boolean IsPublished
        date PublishedAt "nullable"
        int OwnerOrganizationID FK "nullable - for private packs"
        date CreatedAt
        date UpdatedAt
    }

    LibraryPackDependencies {
        int id PK
        int PackID FK
        int DependsOnPackID FK
        string VersionConstraint "nullable - e.g. '^1.0.0', '>=2.0.0'"
        boolean IsOptional "default false"
        date CreatedAt
        date UpdatedAt
    }

    OrganizationPackInstallations {
        int id PK
        int OrganizationID FK
        int PackID FK
        string InstalledVersion
        string Status "installed/pending_update/failed"
        int InstalledByID FK "Django User"
        date InstalledAt
        date LastUpdatedAt
        string LicenseKey "nullable - for premium packs"
        date LicenseExpiresAt "nullable"
    }

    %% ===== CORE SYSTEM ENTITIES =====
    Orgsystems {
        int id PK
        int OrganizationID FK
        string Name
        string Owner
        string Criticality
        string LifecycleState "Dev/Prod/Decom"
    }

    IntegrationSources {
        int id PK
        string Name "e.g. Main App Repo"
        string Type "GitHub/CSPM/Terraform/SBOM/Manual"
        json ConnectionDetails "repo URL, account ID, etc."
        string Status "Active/Inactive/Error"
        date LastSyncDate
        int OrgsystemID FK
    }

    TrustBoundaries {
        int id PK
        int OrganizationID FK "nullable - null means global/shared"
        string Name
        int TrustLevel "0-100"
        string Description
        int ParentBoundaryID FK "nullable - for nested zones"
    }

    ComponentLibrary {
        int id PK
        int OrganizationID FK "nullable - null means global/shared"
        int SourcePackID FK "nullable - pack this came from"
        string Slug "identifier within pack e.g. 'aws-s3'"
        string QualifiedSlug "partial UK where is_deleted=false"
        string Name
        string Category "Process/Store/External"
        string ComponentType
        string Provider "AWS/Azure/Internal"
        string CustomizationStatus "original/customized/detached"
        string BaseItemQualifiedSlug "nullable - original item if forked, indexed"
        array Aliases "previous slugs for backward compat"
        boolean IsDeleted "soft delete flag"
        date DeletedAt "nullable"
    }

    OrgsystemsComponents {
        int id PK
        string Name
        int OrgsystemID FK
        int ComponentLibraryID FK
        int TrustBoundaryID FK "Security zone"
        int SourceIntegrationID FK "nullable - discovery source"
    }

    %% ===== DATA CLASSIFICATION (CIA Triad) =====
    DataAssets {
        int id PK
        string Name
        string Classification
        string Confidentiality "High/Med/Low"
        string Integrity "High/Med/Low"
        string Availability "High/Med/Low"
        json ComplianceTags
    }

    ComponentDataAssets {
        int ComponentID FK
        int DataAssetID FK
        string DataState "AtRest/Processed"
        string Volume
    }

    %% ===== DATA FLOWS =====
    DataFlows {
        int id PK
        int SourceComponentID FK
        int DestComponentID FK
        string Protocol
        int Port
        boolean CrossesTrustBoundary
    }

    DataFlowAssets {
        int DataFlowID FK
        int DataAssetID FK
        string ProtectionMethod "Encrypted/Masked/Tokenized/Hashed/None"
        string EncryptionType "nullable - TLS/AES-256/etc."
        string Format "JSON/XML/Binary/CSV"
        string Sensitivity "nullable - overrides DataAsset if set"
    }

    %% ===== THREAT CATALOG (Library) =====
    ThreatLibrary {
        int id PK
        int OrganizationID FK "nullable - null means global/shared"
        int SourcePackID FK "nullable - pack this came from"
        string Slug "identifier within pack e.g. 'sql-injection'"
        string QualifiedSlug "partial UK where is_deleted=false"
        string Name
        string Description
        string STRIDE_Category
        string Source "STRIDE/CAPEC/OWASP/CWE/Custom"
        string SourceID "nullable - e.g. CAPEC-66, CWE-89"
        string CustomizationStatus "original/customized/detached"
        string BaseItemQualifiedSlug "nullable - original item if forked, indexed"
        array Aliases "previous slugs for backward compat"
        boolean IsDeleted "soft delete flag"
        date DeletedAt "nullable"
    }

    ComponentLibraryThreats {
        int ComponentLibraryID FK
        int ThreatLibraryID FK
        string DefaultSeverity
        string AppliesTo "Component/Flow/Both"
    }

    %% ===== THREAT INSTANCES (Runtime) =====
    ComponentInstanceThreats {
        int id PK
        int ComponentID FK
        int ThreatLibraryID FK
        string InherentSeverity
        string ResidualSeverity
        string Status "Open/Mitigated/Accepted"
        string Justification
    }

    DataFlowInstanceThreats {
        int id PK
        int DataFlowID FK
        int ThreatLibraryID FK
        string InherentSeverity
        string ResidualSeverity
        string Status "Open/Mitigated/Accepted"
    }

    %% ===== COUNTERMEASURE LIBRARY =====
    CountermeasureLibrary {
        int id PK
        int OrganizationID FK "nullable - null means global/shared"
        int SourcePackID FK "nullable - pack this came from"
        string Slug "identifier within pack e.g. 'encryption-at-rest'"
        string QualifiedSlug "partial UK where is_deleted=false"
        string Name
        string Description
        string Type "Technical/Procedural"
        string Cost "Low/Medium/High"
        string CustomizationStatus "original/customized/detached"
        string BaseItemQualifiedSlug "nullable - original item if forked, indexed"
        array Aliases "previous slugs for backward compat"
        boolean IsDeleted "soft delete flag"
        date DeletedAt "nullable"
    }

    %% M2M: Which threats can this countermeasure mitigate?
    CountermeasureApplicableThreats {
        int CountermeasureLibraryID FK
        int ThreatLibraryID FK
    }

    ComponentInstanceCountermeasures {
        int id PK
        int InstanceThreatID FK
        int CountermeasureLibraryID FK
        string Status "Gap/Planned/Verified/Waived"
        int VerifiedByID FK "Django User who verified"
        string EvidenceURL "link to PR, ticket, scan result"
        boolean RequiredForRelease
        int AssignedOwnerID FK "Django User"
    }

    FlowInstanceCountermeasures {
        int id PK
        int FlowThreatID FK
        int CountermeasureLibraryID FK
        string Status "Gap/Planned/Verified/Waived"
        int VerifiedByID FK "Django User who verified"
        string EvidenceURL "link to PR, ticket, scan result"
        boolean RequiredForRelease
        int AssignedOwnerID FK "Django User"
    }

    %% ===== VERIFICATION & TESTING =====
    VerificationTests {
        int id PK
        int OrganizationID FK "nullable - null means global/shared"
        string Name
        string Method "PenTest/Auto/CodeReview"
        date LastRunDate
        boolean Passed
        string Evidence
    }

    ComponentInstanceCountermeasureTests {
        int id PK
        int ComponentInstanceCountermeasureID FK
        int VerificationTestID FK
        date TestedAt
    }

    FlowInstanceCountermeasureTests {
        int id PK
        int FlowInstanceCountermeasureID FK
        int VerificationTestID FK
        date TestedAt
    }

    %% ===== PENTEST RECONCILIATION =====
    PentestFindings {
        int id PK
        int ThreatModelID FK
        string FindingDescription
        string Severity
        int MatchedThreatLibraryID FK "nullable - did we predict this?"
        int MatchedComponentInstanceCountermeasureID FK "nullable - component control that failed"
        int MatchedFlowInstanceCountermeasureID FK "nullable - flow control that failed"
        string ReconciliationStatus "Matched/Unpredicted/FalsePositive"
    }

    %% ===== COMPLIANCE FRAMEWORKS =====
    StandardFrameworks {
        int id PK
        string Name
        string Version
        string Issuer
        string Description
    }

    StandardRequirements {
        int id PK
        int FrameworkID FK
        string SectionCode
        string Description
        int ParentRequirementID FK "nullable - for hierarchical requirements"
    }

    CountermeasureLibraryStandards {
        int CountermeasureLibraryID FK
        int RequirementID FK
        string Sufficiency "Full/Partial"
    }

    %% ===== DFD TEMPLATES LIBRARY =====
    DFDTemplatesLibrary {
        int id PK
        int OrganizationID FK "nullable - null means global/shared"
        int SourcePackID FK "nullable - pack this came from"
        string Slug "identifier within pack e.g. 'banking-webapp-l1'"
        string QualifiedSlug "partial UK where is_deleted=false"
        string Name
        string Description
        string Category "WebApp/Microservices/IoT/API/Mobile"
        string Type "Context/Level1/Level2"
        int MaintainedByID FK "Django User"
        json CanvasData "ReactFlow JSON structure"
        string CustomizationStatus "original/customized/detached"
        string BaseItemQualifiedSlug "nullable - original item if forked, indexed"
        array Aliases "previous slugs for backward compat"
        boolean IsDeleted "soft delete flag"
        date DeletedAt "nullable"
        date LastUpdated
    }

    %% ===== THREAT MODELS & DFDs =====
    ThreatModels {
        int id PK
        int OrganizationID FK
        int CreatedByUserID FK "Django User"
        string Name
        string Description
        string Version
        string Status "Draft/InProgress/PendingReview/Approved/Archived"
        string Trigger "New/Incident/Pentest/Drift/FeatureAddition"
        int PreviousVersionID FK "nullable"
        json WorkspaceData "UI state, progress, system context"
        date CreatedDate
        date LastModified
    }

    ThreatModelOrgsystems {
        int ThreatModelID FK
        int OrgsystemID FK
    }

    ThreatModelRelationships {
        int id PK
        int SourceThreatModelID FK
        int TargetThreatModelID FK
        string RelationType "DependsOn/SubsystemOf/RelatedTo/SupersededBy"
    }

    DFDs {
        int id PK
        string Name
        string Type "Context/Level1/Level2"
        int UpdatedByID FK "Django User"
        int TemplateLibraryID FK "nullable - created from library template"
        json CanvasData "ReactFlow nodes and edges"
        json ThreatAnalysisData "analysis results"
        date LastUpdated
    }

    ThreatModelDFDs {
        int ThreatModelID FK
        int DFDID FK
    }

    DFDOrgsystems {
        int DFDID FK
        int OrgsystemID FK
    }

    %% ========================================
    %% RELATIONSHIPS
    %% ========================================

    %% --- Organizations (Multi-tenancy) ---
    Organizations ||--o{ OrganizationMembers : "has_members"
    Organizations ||--o{ Orgsystems : "owns"
    Organizations ||--o{ ThreatModels : "owns"
    Organizations ||--o{ ComponentLibrary : "customizes"
    Organizations ||--o{ ThreatLibrary : "customizes"
    Organizations ||--o{ CountermeasureLibrary : "customizes"
    Organizations ||--o{ DFDTemplatesLibrary : "customizes"
    Organizations ||--o{ TrustBoundaries : "defines"
    Organizations ||--o{ VerificationTests : "owns"
    Organizations ||--o{ OrganizationPackInstallations : "has_installed"
    Organizations ||--o{ LibraryPacks : "owns_private"

    %% --- Library Packs ---
    LibraryPacks ||--o{ LibraryPackDependencies : "depends_on"
    LibraryPacks ||--o{ OrganizationPackInstallations : "installed_by"
    LibraryPacks ||--o{ ComponentLibrary : "provides"
    LibraryPacks ||--o{ ThreatLibrary : "provides"
    LibraryPacks ||--o{ CountermeasureLibrary : "provides"
    LibraryPacks ||--o{ DFDTemplatesLibrary : "provides"

    %% --- Core System Hierarchy ---
    Orgsystems ||--o{ OrgsystemsComponents : "owns"
    ComponentLibrary ||--o{ OrgsystemsComponents : "instantiated_as"
    TrustBoundaries ||--o{ OrgsystemsComponents : "contains"
    TrustBoundaries ||--o| TrustBoundaries : "nested_in"
    Orgsystems ||--o{ IntegrationSources : "ingests_from"
    IntegrationSources ||--o{ OrgsystemsComponents : "discovered"

    %% --- Data Asset Mapping ---
    OrgsystemsComponents ||--o{ ComponentDataAssets : "stores"
    DataAssets ||--o{ ComponentDataAssets : "classified_as"

    %% --- Data Flows ---
    OrgsystemsComponents ||--o{ DataFlows : "source_of"
    OrgsystemsComponents ||--o{ DataFlows : "destination_of"
    DataFlows ||--o{ DataFlowAssets : "transports"
    DataAssets ||--o{ DataFlowAssets : "flows_through"

    %% --- Threat Library (Templates) ---
    ComponentLibrary ||--o{ ComponentLibraryThreats : "has_potential"
    ThreatLibrary ||--o{ ComponentLibraryThreats : "applies_to_type"

    %% --- Countermeasure to Threat Mapping ---
    CountermeasureLibrary ||--o{ CountermeasureApplicableThreats : "mitigates"
    ThreatLibrary ||--o{ CountermeasureApplicableThreats : "mitigated_by"

    %% --- Component Threat Instances ---
    OrgsystemsComponents ||--o{ ComponentInstanceThreats : "vulnerable_to"
    ThreatLibrary ||--o{ ComponentInstanceThreats : "manifests_as"

    %% --- Data Flow Threat Instances ---
    DataFlows ||--o{ DataFlowInstanceThreats : "vulnerable_to"
    ThreatLibrary ||--o{ DataFlowInstanceThreats : "manifests_as"

    %% --- Component Instance Countermeasures ---
    ComponentInstanceThreats ||--o{ ComponentInstanceCountermeasures : "mitigated_by"
    CountermeasureLibrary ||--o{ ComponentInstanceCountermeasures : "applied_to"

    %% --- Flow Instance Countermeasures ---
    DataFlowInstanceThreats ||--o{ FlowInstanceCountermeasures : "mitigated_by"
    CountermeasureLibrary ||--o{ FlowInstanceCountermeasures : "applied_to"

    %% --- Verification Testing ---
    ComponentInstanceCountermeasures ||--o{ ComponentInstanceCountermeasureTests : "verified_by"
    FlowInstanceCountermeasures ||--o{ FlowInstanceCountermeasureTests : "verified_by"
    VerificationTests ||--o{ ComponentInstanceCountermeasureTests : "validates"
    VerificationTests ||--o{ FlowInstanceCountermeasureTests : "validates"

    %% --- Pentest Reconciliation ---
    ThreatModels ||--o{ PentestFindings : "validated_by"
    ThreatLibrary ||--o{ PentestFindings : "confirmed_by"
    ComponentInstanceCountermeasures ||--o{ PentestFindings : "exposed_by"
    FlowInstanceCountermeasures ||--o{ PentestFindings : "exposed_by"

    %% --- Compliance Framework ---
    StandardFrameworks ||--o{ StandardRequirements : "contains"
    StandardRequirements ||--o| StandardRequirements : "parent_of"
    CountermeasureLibrary ||--o{ CountermeasureLibraryStandards : "satisfies"
    StandardRequirements ||--o{ CountermeasureLibraryStandards : "satisfied_by"

    %% --- Threat Model Workflow ---
    ThreatModels ||--o| ThreatModels : "previous_version"
    ThreatModels ||--o{ ThreatModelRelationships : "related_from"
    ThreatModels ||--o{ ThreatModelRelationships : "related_to"
    DFDTemplatesLibrary ||--o{ DFDs : "instantiated_as"
    ThreatModels ||--o{ ThreatModelOrgsystems : "assesses"
    Orgsystems ||--o{ ThreatModelOrgsystems : "assessed_in"
    ThreatModels ||--o{ ThreatModelDFDs : "visualized_by"
    DFDs ||--o{ ThreatModelDFDs : "used_in"
    DFDs ||--o{ DFDOrgsystems : "depicts"
    Orgsystems ||--o{ DFDOrgsystems : "shown_on"
