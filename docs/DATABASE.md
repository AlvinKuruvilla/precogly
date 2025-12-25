erDiagram

%% ========================================
%% PRECOGLY THREAT MODELING SCHEMA
%% ========================================
%% NOTE: User FK references point to Django's auth.User model
%% (not defined here - managed by Django auth system)
%% Single-org deployments create one Organization record;
%% multi-tenant SaaS uses multiple.

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
        string ConnectionDetails "repo URL, account ID, etc."
        string Status "Active/Inactive/Error"
        date LastSyncDate
        int OrgsystemID FK
    }

    TrustBoundaries {
        int id PK
        string Name
        int TrustLevel "0-100"
        string Description
        int ParentBoundaryID FK "nullable - for nested zones"
    }

    ComponentLibrary {
        int id PK
        int OrganizationID FK "nullable - null means global/shared"
        string Name
        string Category "Process/Store/External"
        string Type
        string Provider "AWS/Azure/Internal"
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
        array ComplianceTags
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
        string Name
        string Description
        string STRIDE_Category
        string Source "STRIDE/CAPEC/OWASP/CWE/Custom"
        string SourceID "nullable - e.g. CAPEC-66, CWE-89"
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
        string Name
        string Description
        string Type "Technical/Procedural"
        string Cost
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
        string Name
        string Method "PenTest/Auto/CodeReview"
        date LastRunDate
        boolean Passed
        string Evidence
    }

    ComponentInstanceCountermeasureTests {
        int ComponentInstanceCountermeasureID FK
        int VerificationTestID FK
        date TestedOn
    }

    FlowInstanceCountermeasureTests {
        int FlowInstanceCountermeasureID FK
        int VerificationTestID FK
        date TestedOn
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
    }

    StandardRequirements {
        int id PK
        int FrameworkID FK
        string SectionCode
        string Description
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
        string Name
        string Description
        string Category "WebApp/Microservices/IoT/API/Mobile"
        string Type "Context/Level1/Level2"
        int MaintainedByID FK "Django User"
        date LastUpdated
    }

    %% ===== THREAT MODELS & DFDs =====
    ThreatModels {
        int id PK
        int OrganizationID FK
        int CreatedByUserID FK "Django User"
        string Name
        string Version
        string Status "Draft/InProgress/Complete"
        string Trigger "New/Incident/Pentest/Drift/FeatureAddition"
        int PreviousVersionID FK
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
        string UpdatedBy
        date LastUpdated
        int TemplateLibraryID FK "nullable - created from library template"
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
