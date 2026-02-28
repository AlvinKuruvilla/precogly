# Precogly Database Walkthrough

This document provides a walkthrough of the Precogly threat modeling database schema, organized by functional groups.

---

## Group 1: Organizations & Building Blocks

### Multi-tenancy

| Table Name | Description | Example |
|------------|-------------|---------|
| Organizations | Top-level tenant for multi-tenancy. Single-org deployments create one record; SaaS uses multiple. | "Acme Corp" on the "Pro" plan. |
| OrganizationMembers | Maps users to organizations with roles. | UserID: john@acme.com; Role: "SecurityTeam" |

### Core System Entities

| Table Name | Description | Example |
|------------|-------------|---------|
| Orgsystems | Top-level application or product you are modeling. | "Global HR Portal v2.0". Owned by the "People Ops" team and marked as "Critical" because it holds salary data. |
| TrustZones | Different security zones. Supports nesting via parent_id. | Public Internet; DMZ (Demilitarized Zone); Internal Network nested inside Corporate. |
| ComponentLibrary | Library of generic building blocks (catalog). Can be global (OrganizationID=null) or org-specific. | "AWS S3 Bucket"; "Nginx Web Server" |
| OrgsystemsComponents | Specific instance of a building block; combines a library component with a trust zone. | "Resume Upload Server": Uses the "Nginx" component from library. Lives in the "DMZ". |
| IntegrationSources | External sources for auto-ingesting system context. | GitHub repo "acme/hr-portal"; Terraform state from AWS account. |

---

## Group 2: Data Assets and Flows

| Table Name | Description | Example |
|------------|-------------|---------|
| DataAssets | Specific types of info the system handles, scored by the CIA triad (Confidentiality, Integrity, Availability). | "Salary Info": Confidentiality: High. Integrity: High. Availability: Medium. |
| | | "Lunch Menu": Confidentiality: Low. Integrity: Low. Availability: Medium. |
| ComponentDataAssets | Maps where the data sits. | "Employee DB" stores "Salary Info". |
| DataFlows | Connection line between two components. | Flow from the "Web Server" (Source) to the "Employee DB" (Destination). Uses TCP on port 5432. "CrossesTrustZone" is TRUE if moving from DMZ to Internal. |
| DataFlowAssets | Which data assets are carried by a specific data flow, and how each asset is protected in transit. | Flow carries "Salary Info". ProtectionMethod: "Encrypted", EncryptionType: "TLS", Format: "JSON". |

---

## Group 3: Threats

### Threat Library

| Table Name | Description | Example |
|------------|-------------|---------|
| ThreatLibrary | Framework-aligned canonical threat taxonomy (catalog). Can be global or org-specific. Tracks source (STRIDE/CAPEC/OWASP/CWE/Custom). | "SQL Injection" (Source: CWE, SourceID: CWE-89); "Weak Password Policy"; "Man-in-the-Middle Attack" |
| ComponentLibraryThreats | Links threats to component library entries. *"Which threats are applicable to this type of component?"* | ComponentLibraryID: React; ThreatLibraryID: RCE |

### Threat Instances

| Table Name | Description | Example |
|------------|-------------|---------|
| ComponentInstanceThreats | A specific threat applying to a specific component. *"Does this threat actually manifest on this specific component instance?"* | ComponentID: Prod Web App (Next.js 15.1); ThreatLibraryID: Remote Code Execution |
| DataFlowInstanceThreats | A specific threat applying to the connection. | The flow between the Web Server and DB is vulnerable to "Sniffing" (Man-in-the-Middle) because it crosses a trust zone. |

### Threat Models & DFDs

| Table Name | Description | Example |
|------------|-------------|---------|
| ThreatModels | Binder for threats and countermeasures for a system. Tracks trigger (New/Incident/Pentest/Drift/FeatureAddition). | HR Portal Security Review - v1.1 (Done in June 2025 after adding the Resume Upload feature). Trigger: "FeatureAddition". |
| ThreatModelOrgsystems | Links ThreatModels to Orgsystems (many-to-many relationship). | Threat Model (v1.1) covers the "Global HR Portal" (Orgsystem). |
| ThreatModelRelationships | Links ThreatModels to other ThreatModels for tracking dependencies and relationships. | HR Portal TM "DependsOn" Auth Service TM; Microservice TM is "SubsystemOf" Platform TM. |
| DFDTemplatesLibrary | Library of curated DFD templates maintained by security team. Can be global or org-specific. | "Web Application Template"; "Microservices Architecture Template" |
| DFDs | The visual drawing of the system. Can be created from a template. | HR System Architecture Diagram (created from "Web Application Template"). |
| ThreatModelDFDs | Link drawing to document. | HR Portal Security Review v1.1 includes the "HR System Architecture Diagram". |
| DFDOrgsystems | Link drawing to system data (many-to-many relationship). | The "HR System Architecture Diagram" depicts the "Global HR Portal". |

---

## Group 4: Countermeasures

| Table Name | Description | Example |
|------------|-------------|---------|
| CountermeasureLibrary | A catalog of generic fixes (solutions library). Can be global or org-specific. If the sentence contains a proper noun or configuration detail, it does NOT belong in the CountermeasureLibrary. | "Enforce Role-Based Access Control"; "Encrypt Data in Transit" |
| ComponentInstanceCountermeasures | Applying a specific fix to a specific threat on the component. Tracks status (Gap/Planned/Verified/Waived), evidence, and ownership. | Restrict payroll endpoints to HR and Finance roles. Status: "Verified". EvidenceURL: link to PR. |
| FlowInstanceCountermeasures | Applying a specific fix to a specific threat on the flow. Tracks status, evidence, and ownership. | Enforce TLS 1.3 with mutual authentication between HR Web App and Payroll Service. Status: "Planned". |

---

## Group 5: Verification and Compliance

| Table Name | Description | Example |
|------------|-------------|---------|
| StandardFrameworks | The rule book that we're following. | PCI-DSS; SOC 2; ISO 27001 |
| StandardRequirements | The specific rule we must follow. | SectionCode: 4.2.1; Description: "Encrypt cardholder data during transmission over open networks" |
| CountermeasureLibraryStandards | If this control is correctly implemented, it satisfies the specific rule we must follow. | CountermeasureLibraryID: "Encrypt Data in Transit"; RequirementID: PCI-DSS 4.2.1; Sufficiency: Full |
| VerificationTests | The actual test definition. | "Penetration Test Q3-2024". Method: PenTest. Result: Passed. |
| ComponentInstanceCountermeasureTests | Links verification tests to component countermeasures. | MitigationID: "Restrict payroll endpoints"; TestID: "Penetration Test Q3-2024"; TestedOn: 2024-09-15 |
| FlowInstanceCountermeasureTests | Links verification tests to flow countermeasures. | MitigationID: "Enforce TLS 1.3"; TestID: "Penetration Test Q3-2024"; TestedOn: 2024-09-15 |

---

## Group 6: Pentest Reconciliation

| Table Name | Description | Example |
|------------|-------------|---------|
| PentestFindings | Reconciles pentest findings with threat model predictions. Tracks whether threats were predicted and which controls failed. | Finding: "SQL Injection in search endpoint". Severity: High. MatchedThreatLibraryID: SQL Injection. ReconciliationStatus: "Matched" (we predicted it). |

---

## ER Diagram

See [DATABASE.md](./DATABASE.md) for the complete Mermaid ER diagram.
