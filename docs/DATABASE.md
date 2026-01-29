erDiagram

Organizations {
    int id PK
    string name
    string domain
    string plan "free/pro/enterprise"
    string business_unit_label "nullable"
    datetime created_at
    datetime updated_at
}

OrganizationMembers {
    int id PK
    int organization_id FK
    int user_id FK
    string role "admin/security_team/champion/viewer"
    datetime joined_at
}

BusinessUnits {
    int id PK
    int organization_id FK
    string name
    string code "nullable"
    string description "nullable"
    int parent_id FK "nullable"
    datetime created_at
    datetime updated_at
}

Teams {
    int id PK
    int organization_id FK
    int business_unit_id FK "nullable"
    string name
    string code "nullable"
    string description "nullable"
    boolean is_default
    datetime created_at
    datetime updated_at
}

TeamMemberships {
    int id PK
    int team_id FK
    int user_id FK
    string role "lead/member/viewer"
    datetime joined_at
}

TeamInvitations {
    int id PK
    int team_id FK
    string email
    string role "lead/member/viewer"
    string token UK
    int invited_by_id FK
    string status "pending/accepted/expired/revoked"
    datetime expires_at
    datetime accepted_at "nullable"
    datetime created_at
    datetime updated_at
}

MagicLinks {
    int id PK
    int threat_model_id FK
    string token UK
    int created_by_id FK
    datetime expires_at "nullable"
    int accessed_count
    boolean is_revoked
    datetime created_at
    datetime updated_at
}

SharedWithMe {
    int id PK
    int user_id FK
    int threat_model_id FK
    int magic_link_id FK
    datetime first_accessed_at
    datetime last_accessed_at
    int access_count
}

ShadowUsers {
    int id PK
    string session_key UK
    int user_id FK
    int organization_id FK
    int team_id FK
    string status "active/expired/converted"
    datetime expires_at
    datetime converted_at "nullable"
    datetime created_at
    datetime updated_at
}

LibraryPacks {
    int id PK
    string slug UK
    string name
    string description
    string pack_type "technology/threat/countermeasure/compliance/template/full"
    string tier "free/premium/enterprise"
    string source "official/partner/community/private"
    string version
    string author
    string repository_url "nullable"
    string documentation_url "nullable"
    string icon_url "nullable"
    array industries
    array tags
    json content
    int install_count
    boolean is_published
    datetime published_at "nullable"
    datetime created_at
    datetime updated_at
}

LibraryPackDependencies {
    int id PK
    int pack_id FK
    int depends_on_pack_id FK
    string version_constraint "nullable"
    boolean is_optional
    datetime created_at
    datetime updated_at
}

PendingFrameworkOverlays {
    int id PK
    int pack_id FK
    string framework_slug
    string overlay_file_name
    json overlay_data
    int mapping_count
    datetime created_at
    datetime updated_at
}

Orgsystems {
    int id PK
    int organization_id FK
    string name
    string owner "nullable"
    string criticality "low/medium/high/critical"
    string lifecycle_state "development/production/decommissioned"
    datetime created_at
    datetime updated_at
}

IntegrationSources {
    int id PK
    string name
    string source_type "github/cspm/terraform/sbom/manual"
    json connection_details
    string status "active/inactive/error"
    datetime last_sync_at "nullable"
    int orgsystem_id FK
    datetime created_at
    datetime updated_at
}

TrustBoundaries {
    int id PK
    string name
    int trust_level "0-100"
    string description "nullable"
    int parent_id FK "nullable"
    datetime created_at
    datetime updated_at
}

ComponentLibrary {
    int id PK
    int source_pack_id FK "nullable"
    string slug
    string qualified_slug UK
    string name
    string category "process/datastore/external/human_actor/system_actor"
    string component_type
    string provider "nullable"
    string customization_status "original/customized/detached"
    string base_item_qualified_slug "nullable"
    array aliases
    datetime created_at
    datetime updated_at
}

OrgsystemComponents {
    int id PK
    string name
    int orgsystem_id FK "nullable"
    int component_library_id FK "nullable"
    int trust_boundary_id FK "nullable"
    int source_integration_id FK "nullable"
    string category "nullable, copied from library"
    string component_type "nullable, copied from library"
    string provider "nullable, copied from library"
    datetime created_at
    datetime updated_at
}

DataAssets {
    int id PK
    string name
    string classification
    string confidentiality "high/medium/low"
    string integrity "high/medium/low"
    string availability "high/medium/low"
    json compliance_tags
    datetime created_at
    datetime updated_at
}

ComponentDataAssets {
    int id PK
    int component_id FK
    int data_asset_id FK
    string data_state "at_rest/processed"
    string volume "nullable"
}

DataFlows {
    int id PK
    int source_component_id FK
    int dest_component_id FK
    string label "nullable"
    string edge_id "nullable"
    string protocol "nullable"
    int port "nullable"
    boolean encrypted
    boolean authenticated
    boolean crosses_trust_boundary
    datetime created_at
    datetime updated_at
}

DataFlowAssets {
    int id PK
    int data_flow_id FK
    int data_asset_id FK
    string protection_method "encrypted/masked/tokenized/hashed/none"
    string encryption_type "nullable"
    string format "nullable"
    string sensitivity_override "nullable"
}

ThreatLibrary {
    int id PK
    int source_pack_id FK "nullable"
    string slug
    string qualified_slug UK
    string name
    string description
    string stride_category
    string source "STRIDE/CAPEC/OWASP/CWE/Custom"
    string source_id "nullable"
    string customization_status "original/customized/detached"
    string base_item_qualified_slug "nullable"
    array aliases
    datetime created_at
    datetime updated_at
}

ComponentLibraryThreats {
    int id PK
    int component_library_id FK
    int threat_library_id FK
    string default_severity
    string applies_to "component/flow/both"
}

ComponentInstanceThreats {
    int id PK
    int component_id FK
    int threat_library_id FK "nullable"
    string inherent_severity "low/medium/high/critical"
    string residual_severity "nullable"
    string status "open/mitigated/accepted"
    string justification "nullable"
    string threat_name "nullable, copied from library"
    string threat_description "nullable, copied from library"
    string stride_category "nullable, copied from library"
    datetime created_at
    datetime updated_at
}

DataFlowInstanceThreats {
    int id PK
    int data_flow_id FK
    int threat_library_id FK "nullable"
    string inherent_severity "low/medium/high/critical"
    string residual_severity "nullable"
    string status "open/mitigated/accepted"
    string threat_name "nullable, copied from library"
    string threat_description "nullable, copied from library"
    string stride_category "nullable, copied from library"
    datetime created_at
    datetime updated_at
}

CountermeasureLibrary {
    int id PK
    int source_pack_id FK "nullable"
    string slug
    string qualified_slug UK
    string name
    string description
    string control_type "technical/procedural"
    string cost "low/medium/high"
    string customization_status "original/customized/detached"
    string base_item_qualified_slug "nullable"
    array aliases
    datetime created_at
    datetime updated_at
}

CountermeasureApplicableThreats {
    int countermeasure_library_id FK
    int threat_library_id FK
}

ComponentInstanceCountermeasures {
    int id PK
    int instance_threat_id FK
    int countermeasure_library_id FK "nullable"
    string status "gap/planned/verified/waived"
    int verified_by_id FK "nullable"
    string evidence_url "nullable"
    boolean required_for_release
    int assigned_owner_id FK "nullable"
    string countermeasure_name "nullable, copied from library"
    string countermeasure_description "nullable, copied from library"
    string control_type "nullable, copied from library"
    datetime created_at
    datetime updated_at
}

FlowInstanceCountermeasures {
    int id PK
    int flow_threat_id FK
    int countermeasure_library_id FK "nullable"
    string status "gap/planned/verified/waived"
    int verified_by_id FK "nullable"
    string evidence_url "nullable"
    boolean required_for_release
    int assigned_owner_id FK "nullable"
    string countermeasure_name "nullable, copied from library"
    string countermeasure_description "nullable, copied from library"
    string control_type "nullable, copied from library"
    datetime created_at
    datetime updated_at
}

VerificationTests {
    int id PK
    string name
    string method "pentest/auto/code_review"
    datetime last_run_at "nullable"
    boolean passed
    string evidence "nullable"
    datetime created_at
    datetime updated_at
}

ComponentInstanceCountermeasureTests {
    int id PK
    int component_countermeasure_id FK
    int verification_test_id FK
    datetime tested_at
}

FlowInstanceCountermeasureTests {
    int id PK
    int flow_countermeasure_id FK
    int verification_test_id FK
    datetime tested_at
}

PentestFindings {
    int id PK
    int threat_model_id FK
    string finding_description
    string severity
    int matched_threat_library_id FK "nullable"
    int matched_component_countermeasure_id FK "nullable"
    int matched_flow_countermeasure_id FK "nullable"
    string reconciliation_status "matched/unpredicted/false_positive"
    datetime created_at
    datetime updated_at
}

StandardFrameworks {
    int id PK
    string slug UK
    string name
    string version
    string issuer
    string description "nullable"
    int source_pack_id FK "nullable"
    datetime created_at
    datetime updated_at
}

StandardRequirements {
    int id PK
    int framework_id FK
    string section_code
    string description
    int parent_id FK "nullable"
    datetime created_at
    datetime updated_at
}

CountermeasureLibraryStandards {
    int id PK
    int countermeasure_library_id FK
    int requirement_id FK
    string sufficiency "full/partial"
}

DFDTemplatesLibrary {
    int id PK
    int source_pack_id FK "nullable"
    string slug
    string qualified_slug UK
    string name
    string description "nullable"
    string category "webapp/microservices/iot/api/mobile"
    string diagram_type "context/level1/level2"
    int maintained_by_id FK "nullable"
    json canvas_data
    string customization_status "original/customized/detached"
    string base_item_qualified_slug "nullable"
    array aliases
    datetime created_at
    datetime updated_at
}

ThreatModels {
    int id PK
    int organization_id FK
    int owning_team_id FK "nullable"
    int created_by_id FK "nullable"
    string name
    string description "nullable"
    string version
    string status "draft/in_progress/pending_review/approved/archived"
    string trigger "new/incident/pentest/drift/feature_addition"
    string criticality "low/medium/high/critical"
    int previous_version_id FK "nullable"
    json workspace_data
    datetime created_at
    datetime updated_at
}

ThreatModelOrgsystems {
    int id PK
    int threat_model_id FK
    int orgsystem_id FK
}

ThreatModelRelationships {
    int id PK
    int source_threat_model_id FK
    int target_threat_model_id FK
    string relation_type "depends_on/subsystem_of/related_to/superseded_by"
}

ThreatModelFrameworks {
    int id PK
    int threat_model_id FK
    int framework_id FK
}

DFDs {
    int id PK
    string name
    string diagram_type "context/level1/level2"
    int updated_by_id FK "nullable"
    int template_library_id FK "nullable"
    json canvas_data
    json threat_analysis_data
    datetime created_at
    datetime updated_at
}

ThreatModelDFDs {
    int id PK
    int threat_model_id FK
    int dfd_id FK
}

DFDOrgsystems {
    int id PK
    int dfd_id FK
    int orgsystem_id FK
}

Organizations ||--o{ OrganizationMembers : "has_members"
Organizations ||--o{ BusinessUnits : "has_units"
Organizations ||--o{ Teams : "has_teams"
Organizations ||--o{ Orgsystems : "owns"
Organizations ||--o{ ThreatModels : "owns"
Organizations ||--o{ ShadowUsers : "has_shadow_users"

BusinessUnits ||--o| BusinessUnits : "nested_in"
BusinessUnits ||--o{ Teams : "contains"
Teams ||--o{ TeamMemberships : "has_members"
Teams ||--o{ TeamInvitations : "has_invitations"
Teams ||--o{ ThreatModels : "owns"
Teams ||--o{ ShadowUsers : "has_shadow_users"

ThreatModels ||--o{ MagicLinks : "shared_via"
MagicLinks ||--o{ SharedWithMe : "accessed_through"

LibraryPacks ||--o{ LibraryPackDependencies : "depends_on"
LibraryPacks ||--o{ ComponentLibrary : "provides"
LibraryPacks ||--o{ ThreatLibrary : "provides"
LibraryPacks ||--o{ CountermeasureLibrary : "provides"
LibraryPacks ||--o{ DFDTemplatesLibrary : "provides"
LibraryPacks ||--o{ StandardFrameworks : "provides"
LibraryPacks ||--o{ PendingFrameworkOverlays : "has_pending"

Orgsystems ||--o{ OrgsystemComponents : "owns"
ComponentLibrary ||--o{ OrgsystemComponents : "instantiated_as"
TrustBoundaries ||--o{ OrgsystemComponents : "contains"
TrustBoundaries ||--o| TrustBoundaries : "nested_in"
Orgsystems ||--o{ IntegrationSources : "ingests_from"
IntegrationSources ||--o{ OrgsystemComponents : "discovered"

OrgsystemComponents ||--o{ ComponentDataAssets : "stores"
DataAssets ||--o{ ComponentDataAssets : "classified_as"

OrgsystemComponents ||--o{ DataFlows : "source_of"
OrgsystemComponents ||--o{ DataFlows : "destination_of"
DataFlows ||--o{ DataFlowAssets : "transports"
DataAssets ||--o{ DataFlowAssets : "flows_through"

ComponentLibrary ||--o{ ComponentLibraryThreats : "has_potential"
ThreatLibrary ||--o{ ComponentLibraryThreats : "applies_to_type"

CountermeasureLibrary ||--o{ CountermeasureApplicableThreats : "mitigates"
ThreatLibrary ||--o{ CountermeasureApplicableThreats : "mitigated_by"

OrgsystemComponents ||--o{ ComponentInstanceThreats : "vulnerable_to"
ThreatLibrary ||--o{ ComponentInstanceThreats : "manifests_as"

DataFlows ||--o{ DataFlowInstanceThreats : "vulnerable_to"
ThreatLibrary ||--o{ DataFlowInstanceThreats : "manifests_as"

ComponentInstanceThreats ||--o{ ComponentInstanceCountermeasures : "mitigated_by"
CountermeasureLibrary ||--o{ ComponentInstanceCountermeasures : "applied_to"

DataFlowInstanceThreats ||--o{ FlowInstanceCountermeasures : "mitigated_by"
CountermeasureLibrary ||--o{ FlowInstanceCountermeasures : "applied_to"

ComponentInstanceCountermeasures ||--o{ ComponentInstanceCountermeasureTests : "verified_by"
FlowInstanceCountermeasures ||--o{ FlowInstanceCountermeasureTests : "verified_by"
VerificationTests ||--o{ ComponentInstanceCountermeasureTests : "validates"
VerificationTests ||--o{ FlowInstanceCountermeasureTests : "validates"

ThreatModels ||--o{ PentestFindings : "validated_by"
ThreatLibrary ||--o{ PentestFindings : "confirmed_by"
ComponentInstanceCountermeasures ||--o{ PentestFindings : "exposed_by"
FlowInstanceCountermeasures ||--o{ PentestFindings : "exposed_by"

StandardFrameworks ||--o{ StandardRequirements : "contains"
StandardRequirements ||--o| StandardRequirements : "parent_of"
CountermeasureLibrary ||--o{ CountermeasureLibraryStandards : "satisfies"
StandardRequirements ||--o{ CountermeasureLibraryStandards : "satisfied_by"
ThreatModels ||--o{ ThreatModelFrameworks : "assessed_against"
StandardFrameworks ||--o{ ThreatModelFrameworks : "used_in"

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
