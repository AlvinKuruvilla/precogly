erDiagram

%% ========================================
%% PRECOGLY THREAT MODELING SCHEMA
%% ========================================

    %% ===== CORE SYSTEM ENTITIES =====
    Orgsystems {
        int id PK
        string Name
        string Owner
        string Criticality
        string LifecycleState "Dev/Prod/Decom"
    }

    TrustBoundaries {
        int id PK
        string Name
        int TrustLevel "0-100"
        string Description
    }

    ComponentDefinitions {
        int id PK
        string Name
        string Category "Process/Store/External"
        string Type
        string Provider "AWS/Azure/Internal"
    }

    OrgsystemsComponents {
        int id PK
        string Name
        int OrgsystemID FK
        int DefinitionID FK
        int TrustBoundaryID FK "Security zone"
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
        boolean IsEncrypted
    }

    %% ===== THREAT CATALOG (Library) =====
    Threats {
        int id PK
        string Name
        string Description
        string STRIDE_Category
    }

    DefinitionThreats {
        int DefinitionID FK
        int ThreatID FK
        string DefaultSeverity
        string AppliesTo "Component/Flow/Both"
    }

    %% ===== THREAT INSTANCES (Runtime) =====
    ComponentInstanceThreats {
        int id PK
        int ComponentID FK
        int ThreatID FK
        string InherentSeverity
        string ResidualSeverity
        string Status "Open/Mitigated/Accepted"
        string Justification
    }

    DataFlowInstanceThreats {
        int id PK
        int DataFlowID FK
        int ThreatID FK
        string InherentSeverity
        string ResidualSeverity
        string Status "Open/Mitigated/Accepted"
    }

    %% ===== COUNTERMEASURES & MITIGATIONS =====
    Countermeasures {
        int id PK
        string Name
        string Description
        string Type "Technical/Procedural"
        string Cost
    }

    ComponentMitigations {
        int id PK
        int InstanceThreatID FK
        int CountermeasureID FK
        string State "Proposed/Implemented"
        string VerifiedBy
    }

    FlowMitigations {
        int id PK
        int FlowThreatID FK
        int CountermeasureID FK
        string State "Proposed/Implemented"
        string VerifiedBy
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

    ComponentMitigationTests {
        int MitigationID FK
        int VerificationTestID FK
        date TestedOn
    }

    FlowMitigationTests {
        int MitigationID FK
        int VerificationTestID FK
        date TestedOn
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

    CountermeasuresStandards {
        int CountermeasureID FK
        int RequirementID FK
        string Sufficiency "Full/Partial"
    }

    %% ===== THREAT MODELS & DFDs =====
    ThreatModels {
        int id PK
        string Name
        string Version
        string Status "Draft/InProgress/Complete"
        int PreviousVersionID FK
        date CreatedDate
        date LastModified
    }

    ThreatModelOrgsystems {
        int ThreatModelID FK
        int OrgsystemID FK
    }

    DFDs {
        int id PK
        string Name
        string Type "Context/Level1/Level2"
        string UpdatedBy
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

    %% --- Core System Hierarchy ---
    Orgsystems ||--o{ OrgsystemsComponents : "owns"
    ComponentDefinitions ||--o{ OrgsystemsComponents : "instantiated_as"
    TrustBoundaries ||--o{ OrgsystemsComponents : "contains"

    %% --- Data Asset Mapping ---
    OrgsystemsComponents ||--o{ ComponentDataAssets : "stores"
    DataAssets ||--o{ ComponentDataAssets : "classified_as"

    %% --- Data Flows ---
    OrgsystemsComponents ||--o{ DataFlows : "source_of"
    OrgsystemsComponents ||--o{ DataFlows : "destination_of"
    DataFlows ||--o{ DataFlowAssets : "transports"
    DataAssets ||--o{ DataFlowAssets : "flows_through"

    %% --- Threat Library (Templates) ---
    ComponentDefinitions ||--o{ DefinitionThreats : "has_potential"
    Threats ||--o{ DefinitionThreats : "applies_to_type"

    %% --- Component Threat Instances ---
    OrgsystemsComponents ||--o{ ComponentInstanceThreats : "vulnerable_to"
    Threats ||--o{ ComponentInstanceThreats : "manifests_as"

    %% --- Data Flow Threat Instances ---
    DataFlows ||--o{ DataFlowInstanceThreats : "vulnerable_to"
    Threats ||--o{ DataFlowInstanceThreats : "manifests_as"

    %% --- Component Mitigations ---
    ComponentInstanceThreats ||--o{ ComponentMitigations : "mitigated_by"
    Countermeasures ||--o{ ComponentMitigations : "applied_to"

    %% --- Flow Mitigations ---
    DataFlowInstanceThreats ||--o{ FlowMitigations : "mitigated_by"
    Countermeasures ||--o{ FlowMitigations : "applied_to"

    %% --- Verification Testing ---
    ComponentMitigations ||--o{ ComponentMitigationTests : "verified_by"
    FlowMitigations ||--o{ FlowMitigationTests : "verified_by"
    VerificationTests ||--o{ ComponentMitigationTests : "validates"
    VerificationTests ||--o{ FlowMitigationTests : "validates"

    %% --- Compliance Framework ---
    StandardFrameworks ||--o{ StandardRequirements : "contains"
    Countermeasures ||--o{ CountermeasuresStandards : "satisfies"
    StandardRequirements ||--o{ CountermeasuresStandards : "satisfied_by"

    %% --- Threat Model Workflow ---
    ThreatModels ||--o| ThreatModels : "previous_version"
    ThreatModels ||--o{ ThreatModelOrgsystems : "assesses"
    Orgsystems ||--o{ ThreatModelOrgsystems : "assessed_in"
    ThreatModels ||--o{ ThreatModelDFDs : "visualized_by"
    DFDs ||--o{ ThreatModelDFDs : "used_in"
    DFDs ||--o{ DFDOrgsystems : "depicts"
    Orgsystems ||--o{ DFDOrgsystems : "shown_on"
