# STATUS: COMPLETE

# Threat Model Report

## Mobile Banking App

| Field                     | Value                                   |
| ------------------------- | --------------------------------------- |
| **Status**                | In Progress                             |
| **Criticality**           | Critical                                |
| **Version**               | 1.0                                     |
| **Modeling Mode**         | DFD-Based                               |
| **Risk Scoring Method**   | TM-Library (Likelihood x Impact)        |
| **Trigger**               | New System                              |
| **Owning Team**           | Platform Security                       |
| **Created By**            | jane.doe@acme.com                       |
| **Last Updated**          | March 11, 2026                          |
| **Compliance Frameworks** | PCI-DSS 4.0, SOC 2 Type II, OWASP MASVS |

---

## Executive Summary

This threat model assesses the security posture of the **Mobile Banking App**, a customer-facing mobile application that provides account management, fund transfers, bill payments, and financial notifications. The system handles highly sensitive financial and personal data, crossing multiple trust boundaries between mobile clients, API infrastructure, and core banking systems.

### Key Metrics

| Metric                   | Count |
| ------------------------ | ----- |
| Components analyzed      | 12    |
| Data flows analyzed      | 18    |
| Trust zones              | 4     |
| Trust boundaries         | 5     |
| Threats identified       | 34    |
| Countermeasures assessed | 52    |
| Risks registered         | 8     |

### Threat Status Breakdown

| Status      | Count | %   |
| ----------- | ----- | --- |
| Mitigated   | 21    | 62% |
| Addressable | 8     | 23% |
| Exposed     | 5     | 15% |

### Countermeasure Status Breakdown

| Status   | Count | %   |
| -------- | ----- | --- |
| Verified | 28    | 54% |
| Platform | 9     | 17% |
| Planned  | 8     | 15% |
| Gap      | 5     | 10% |
| Waived   | 2     | 4%  |

### Risk Posture

| Level    | Inherent | Residual |
| -------- | -------- | -------- |
| Critical | 2        | 0        |
| High     | 3        | 1        |
| Medium   | 2        | 4        |
| Low      | 1        | 3        |

---

## Part 1: What Are We Working On?

### 1.1 Scope

#### System Description

The Mobile Banking App is a native iOS/Android application that communicates with backend services via a RESTful API gateway. It enables authenticated customers to view account balances, initiate domestic and international transfers, pay bills, manage beneficiaries, and receive push notifications for transaction alerts.

| Field                  | Value                    |
| ---------------------- | ------------------------ |
| **System**             | Mobile Banking Platform  |
| **System Owner**       | Digital Banking Division |
| **System Criticality** | Critical                 |
| **Lifecycle State**    | Production               |

#### In-Scope Components

All components, data flows, and trust boundaries depicted in the DFD diagrams below are in scope for this threat model.

#### Out-of-Scope Items

| Item                         | Reason                                          |
| ---------------------------- | ----------------------------------------------- |
| Core Banking Mainframe       | Covered under separate threat model TM-2024-003 |
| Physical branch network      | Not part of the digital channel                 |
| Third-party ATM integrations | Assessed separately by vendor security team     |

#### Assumptions

| Assumption                                                                                               | Topics                                          | Validity    |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------- |
| Application Zone network is isolated and access-restricted to the platform team only                     | Auth Service, Transfer Service, Account Service | Confirmed   |
| Core Banking System validates all transaction requests independently, regardless of upstream validation  | Transfer Service, Core Banking System           | Confirmed   |
| Mobile client app binary is not tampered with (code signing and app store distribution are trusted)      | Mobile Client App                               | Unconfirmed |
| Redis session store is not directly accessible from the DMZ; only Application Zone services can reach it | Session Store, API Gateway                      | Confirmed   |
| Push notification payloads do not contain sensitive financial data (only alert text and transaction IDs) | Notification Service, Push Notification Service | Confirmed   |
| Third-party FCM/APNs infrastructure is available with 99.9% uptime                                       | Push Notification Service                       | Unconfirmed |

#### Referenced Threat Models

| Threat Model                             | Relationship |
| ---------------------------------------- | ------------ |
| Core Banking API (TM-2024-003)           | Depends On   |
| Enterprise IAM Platform (TM-2024-001)    | Depends On   |
| Payment Processing Gateway (TM-2024-007) | Related To   |

### 1.2 Architecture

#### Data Flow Diagrams

_Rendered dynamically from all DFDs attached to this threat model. Each DFD is labeled by its `name` and `diagram_type` (context / level1 / level2). A threat model may have zero or one DFD. Manual-mode threat models (including TM-Library imports) will have no DFD — this section is omitted in that case._

**Mobile Banking — Context** (Context)

> _[DFD rendered from canvas_data: Mobile Banking App as a single process with external actors: Bank Customer, Core Banking System, Payment Network, Push Notification Service, and Fraud Detection Engine]_

**Mobile Banking — Internal Architecture** (Level 1)

> _[DFD rendered from canvas_data: internal components: Mobile Client, API Gateway, Auth Service, Account Service, Transfer Service, Notification Service, Session Store, Transaction DB, and Audit Log — with all data flows and trust zone boundaries]_

#### Reference Images

_Rendered dynamically from all `ThreatModelReferenceImage` records, ordered by `display_order`. These are user-uploaded supplementary diagrams — C4 models, sequence diagrams, network topology exports, whiteboard photos, or any other visual context that supports the threat model. Each image shows its `filename` as a caption with its optional `description` below._

**Cloud Infrastructure Deployment** — `aws-deployment-architecture.png`

> _[Uploaded reference image: C4 container diagram showing AWS deployment — ALB, ECS Fargate services, RDS, ElastiCache, with VPC boundaries and security groups]_

Cloud deployment topology exported from Structurizr, showing how the application components map to AWS services and the network boundaries between them.

**Network Segmentation** — `network-firewall-topology.png`

> _[Uploaded reference image: Network diagram showing firewall rules, VPN tunnels, and subnet segmentation between DMZ, application, and data tiers]_

Whiteboard diagram captured during architecture review session with the infrastructure team.

**Authentication Sequence** — `auth-flow-sequence.png`

> _[Uploaded reference image: Sequence diagram showing login flow — mobile client, API gateway, auth service, session store, with token exchange steps]_

Sequence diagram exported from Mermaid showing the full OAuth2 + MFA authentication flow.

#### Trust Zones

| Trust Zone       | Trust Level | Description                                             |
| ---------------- | ----------- | ------------------------------------------------------- |
| Untrusted Client | 15          | End-user mobile devices, outside organizational control |
| DMZ              | 45          | Internet-facing API gateway and load balancers          |
| Application Zone | 70          | Internal application services and microservices         |
| Data Zone        | 90          | Databases, key management, and core banking integration |

#### Trust Boundaries

| Boundary           | Zone A           | Zone B           | Access Controls                               |
| ------------------ | ---------------- | ---------------- | --------------------------------------------- |
| Client → DMZ       | Untrusted Client | DMZ              | TLS 1.3, certificate pinning, API key         |
| DMZ → App Zone     | DMZ              | Application Zone | mTLS, JWT validation, WAF                     |
| App → Data Zone    | Application Zone | Data Zone        | mTLS, service accounts, network ACLs          |
| App → Core Banking | Application Zone | Data Zone        | VPN tunnel, IP allowlist, client certificates |
| App → Push Service | Application Zone | Untrusted Client | FCM/APNs TLS, encrypted payload               |

### 1.3 Data Assets

| Data Asset               | Classification | Confidentiality | Integrity | Availability | Compliance Tags |
| ------------------------ | -------------- | --------------- | --------- | ------------ | --------------- |
| Customer Credentials     | Restricted     | High            | High      | High         | PCI-DSS, SOC 2  |
| Account Balances         | Confidential   | High            | High      | Medium       | PCI-DSS         |
| Transaction Records      | Confidential   | High            | High      | High         | PCI-DSS, SOC 2  |
| PII (Name, Address, SSN) | Restricted     | High            | Medium    | Medium       | SOC 2, GDPR     |
| Session Tokens           | Confidential   | High            | High      | Medium       | OWASP           |
| Push Notification Tokens | Internal       | Medium          | Medium    | Low          | —               |
| Audit Logs               | Confidential   | Medium          | High      | High         | PCI-DSS, SOC 2  |

#### Data Asset Placement

| Data Asset           | Component             | State     | Encrypted            |
| -------------------- | --------------------- | --------- | -------------------- |
| Customer Credentials | Auth Service          | Processed | Yes (bcrypt)         |
| Account Balances     | Transaction DB        | At Rest   | Yes (AES-256)        |
| Transaction Records  | Transaction DB        | At Rest   | Yes (AES-256)        |
| PII                  | Transaction DB        | At Rest   | Yes (AES-256)        |
| Session Tokens       | Session Store (Redis) | At Rest   | Yes (TLS in-transit) |
| Audit Logs           | Audit Log Store       | At Rest   | Yes (AES-256)        |

#### Data Assets in Transit

_From `DataFlowAsset` — data assets linked to data flows with protection details._

| Data Asset               | Data Flow                        | Protection | Encryption Type  | Format   |
| ------------------------ | -------------------------------- | ---------- | ---------------- | -------- |
| Customer Credentials     | Mobile Client → API Gateway      | Encrypted  | TLS 1.3          | JSON     |
| Session Tokens           | API Gateway → Auth Service       | Encrypted  | mTLS             | JWT      |
| Transaction Records      | Transfer Service → Core Banking  | Encrypted  | VPN/TLS          | ISO 8583 |
| PII (Name, Address, SSN) | Account Service → Transaction DB | Encrypted  | TLS (PostgreSQL) | SQL      |
| Audit Logs               | All Services → Audit Log Store   | Encrypted  | TLS              | JSON     |
| Push Notification Tokens | Notification Service → FCM/APNs  | Encrypted  | TLS 1.3          | JSON     |

### 1.4 Component Inventory

#### Processes

| Component            | Technology         | Trust Zone       | Data Sensitivity |
| -------------------- | ------------------ | ---------------- | ---------------- |
| API Gateway          | Kong Gateway       | DMZ              | PII, Financial   |
| Auth Service         | Node.js / Express  | Application Zone | Credentials, PII |
| Account Service      | Java / Spring Boot | Application Zone | Financial        |
| Transfer Service     | Java / Spring Boot | Application Zone | Financial        |
| Notification Service | Python / FastAPI   | Application Zone | PII              |

#### Data Stores

| Component       | Type                | Trust Zone       | Data Sensitivity |
| --------------- | ------------------- | ---------------- | ---------------- |
| Transaction DB  | PostgreSQL (RDS)    | Data Zone        | Financial, PII   |
| Session Store   | Redis (ElastiCache) | Application Zone | Session Tokens   |
| Audit Log Store | Elasticsearch       | Data Zone        | Audit, PII       |

#### External Actors

| Component                            | Type         | Trust Zone       |
| ------------------------------------ | ------------ | ---------------- |
| Bank Customer                        | Human Actor  | Untrusted Client |
| Mobile Client App                    | System Actor | Untrusted Client |
| Core Banking System                  | System Actor | Data Zone        |
| Push Notification Service (FCM/APNs) | System Actor | Untrusted Client |

### 1.5 Data Flows

| #     | Source               | Destination               | Protocol       | Encrypted | Authenticated         | Crosses Trust Boundary | Sensitive Data |
| ----- | -------------------- | ------------------------- | -------------- | --------- | --------------------- | ---------------------- | -------------- |
| DF-1  | Mobile Client App    | API Gateway               | HTTPS          | Yes       | Yes (API key + JWT)   | Yes                    | Yes            |
| DF-2  | API Gateway          | Auth Service              | gRPC/TLS       | Yes       | Yes (mTLS)            | Yes                    | Yes            |
| DF-3  | Auth Service         | Session Store             | Redis TLS      | Yes       | Yes (service account) | No                     | Yes            |
| DF-4  | API Gateway          | Account Service           | gRPC/TLS       | Yes       | Yes (mTLS)            | No                     | Yes            |
| DF-5  | Account Service      | Transaction DB            | PostgreSQL/TLS | Yes       | Yes (service account) | Yes                    | Yes            |
| DF-6  | API Gateway          | Transfer Service          | gRPC/TLS       | Yes       | Yes (mTLS)            | No                     | Yes            |
| DF-7  | Transfer Service     | Transaction DB            | PostgreSQL/TLS | Yes       | Yes (service account) | Yes                    | Yes            |
| DF-8  | Transfer Service     | Core Banking System       | SFTP/VPN       | Yes       | Yes (client cert)     | Yes                    | Yes            |
| DF-9  | Notification Service | Push Notification Service | HTTPS          | Yes       | Yes (API key)         | Yes                    | No             |
| DF-10 | All Services         | Audit Log Store           | HTTPS          | Yes       | Yes (service account) | Yes                    | Yes            |

---

## Part 2: What Can Go Wrong?

### 2.1 Summary by STRIDE Category

| STRIDE Category        | Total | Exposed | Addressable | Mitigated |
| ---------------------- | ----- | ------- | ----------- | --------- |
| Spoofing               | 6     | 1       | 1           | 4         |
| Tampering              | 5     | 0       | 2           | 3         |
| Repudiation            | 4     | 0       | 1           | 3         |
| Information Disclosure | 8     | 2       | 2           | 4         |
| Denial of Service      | 5     | 1       | 1           | 3         |
| Elevation of Privilege | 6     | 1       | 1           | 4         |

### 2.2 Threat Detail — By Component

#### API Gateway (Kong Gateway)

| #   | Threat                               | STRIDE            | Severity | Status      | Taxonomy       |
| --- | ------------------------------------ | ----------------- | -------- | ----------- | -------------- |
| T-1 | Injection via malformed API requests | Tampering         | High     | Mitigated   | CWE-89, CWE-79 |
| T-2 | DDoS through API flooding            | Denial of Service | High     | Mitigated   | CAPEC-125      |
| T-3 | Unauthorized access via JWT bypass   | Spoofing          | Critical | Addressable | CWE-287, T1078 |

**Countermeasures for T-1: Injection via malformed API requests**

| Countermeasure                               | Type       | Status   | Effectiveness | Priority | Owner              | Compliance    |
| -------------------------------------------- | ---------- | -------- | ------------- | -------- | ------------------ | ------------- |
| Input validation and sanitization            | Preventive | Verified | 0.90          | High     | jane.doe@acme.com  | PCI-DSS 6.5.1 |
| WAF rules for OWASP Top 10                   | Detective  | Verified | 0.85          | High     | raj.patel@acme.com | PCI-DSS 6.6   |
| Parameterized queries in downstream services | Preventive | Verified | 0.95          | Critical | li.chen@acme.com   | CWE-89        |

**Countermeasures for T-2: DDoS through API flooding**

| Countermeasure                    | Type       | Status   | Effectiveness | Priority | Owner              | Compliance |
| --------------------------------- | ---------- | -------- | ------------- | -------- | ------------------ | ---------- |
| Rate limiting per client          | Preventive | Verified | 0.80          | High     | jane.doe@acme.com  | —          |
| CloudFront/Shield DDoS protection | Platform   | Platform | 0.90          | High     | raj.patel@acme.com | —          |
| Auto-scaling policies             | Corrective | Verified | 0.75          | Medium   | raj.patel@acme.com | —          |

**Countermeasures for T-3: Unauthorized access via JWT bypass**

| Countermeasure                     | Type       | Status   | Effectiveness | Priority | Owner                | Compliance  |
| ---------------------------------- | ---------- | -------- | ------------- | -------- | -------------------- | ----------- |
| JWT signature validation (RS256)   | Preventive | Verified | 0.95          | Critical | maria.silva@acme.com | PCI-DSS 8.3 |
| Token expiry enforcement (15 min)  | Preventive | Verified | 0.80          | High     | maria.silva@acme.com | —           |
| JWT algorithm confusion prevention | Preventive | Planned  | —             | Critical | maria.silva@acme.com | CWE-327     |

#### Auth Service

| #   | Threat                     | STRIDE   | Severity | Status    | Taxonomy          |
| --- | -------------------------- | -------- | -------- | --------- | ----------------- |
| T-4 | Credential stuffing attack | Spoofing | Critical | Mitigated | CWE-307, CAPEC-49 |

**Countermeasures for T-4: Credential stuffing attack**

| Countermeasure                        | Type       | Status   | Effectiveness | Priority | Owner                | Compliance    |
| ------------------------------------- | ---------- | -------- | ------------- | -------- | -------------------- | ------------- |
| Account lockout after failed attempts | Preventive | Verified | 0.85          | Critical | maria.silva@acme.com | PCI-DSS 8.1.6 |
| CAPTCHA on login after threshold      | Preventive | Verified | 0.70          | High     | maria.silva@acme.com | —             |
| Breached credential detection         | Detective  | Verified | 0.80          | High     | maria.silva@acme.com | —             |

| #   | Threat                            | STRIDE   | Severity | Status    | Taxonomy       |
| --- | --------------------------------- | -------- | -------- | --------- | -------------- |
| T-5 | Session hijacking via token theft | Spoofing | High     | Mitigated | CWE-384, T1539 |

**Countermeasures for T-5: Session hijacking via token theft**

| Countermeasure                            | Type       | Status   | Effectiveness | Priority | Owner                | Compliance  |
| ----------------------------------------- | ---------- | -------- | ------------- | -------- | -------------------- | ----------- |
| Secure, HttpOnly, SameSite cookie flags   | Preventive | Verified | 0.90          | High     | maria.silva@acme.com | OWASP MASVS |
| Session binding to device fingerprint     | Preventive | Verified | 0.75          | Medium   | maria.silva@acme.com | —           |
| Hardware security module for session keys | Preventive | Waived   | —             | Low      | — (unassigned)       | —           |

| #   | Threat                 | STRIDE   | Severity | Status    | Taxonomy |
| --- | ---------------------- | -------- | -------- | --------- | -------- |
| T-6 | Brute force on OTP/MFA | Spoofing | Medium   | Mitigated | CWE-307  |

**Countermeasures for T-6: Brute force on OTP/MFA**

| Countermeasure                     | Type       | Status   | Effectiveness | Priority | Owner                | Compliance  |
| ---------------------------------- | ---------- | -------- | ------------- | -------- | -------------------- | ----------- |
| OTP rate limiting (max 5 attempts) | Preventive | Verified | 0.90          | High     | maria.silva@acme.com | PCI-DSS 8.3 |
| Time-based OTP expiry (30s)        | Preventive | Platform | 0.85          | High     | maria.silva@acme.com | —           |

| #   | Threat                     | STRIDE      | Severity | Status      | Taxonomy |
| --- | -------------------------- | ----------- | -------- | ----------- | -------- |
| T-7 | Insufficient audit logging | Repudiation | Medium   | Addressable | CWE-778  |

**Countermeasures for T-7: Insufficient audit logging**

| Countermeasure                 | Type       | Status  | Effectiveness | Priority | Owner            | Compliance   |
| ------------------------------ | ---------- | ------- | ------------- | -------- | ---------------- | ------------ |
| Comprehensive audit logging    | Detective  | Planned | —             | High     | li.chen@acme.com | PCI-DSS 10.2 |
| Tamper-evident log storage     | Preventive | Gap     | —             | High     | — (unassigned)   | PCI-DSS 10.5 |
| Sensitive data masking in logs | Preventive | Gap     | —             | Medium   | li.chen@acme.com | SOC 2 CC6.1  |

#### Transfer Service

| #   | Threat                         | STRIDE    | Severity | Status    | Taxonomy |
| --- | ------------------------------ | --------- | -------- | --------- | -------- |
| T-8 | Transaction tampering via MITM | Tampering | Critical | Mitigated | CWE-300  |

**Countermeasures for T-8: Transaction tampering via MITM**

| Countermeasure             | Type       | Status   | Effectiveness | Priority | Owner              | Compliance  |
| -------------------------- | ---------- | -------- | ------------- | -------- | ------------------ | ----------- |
| End-to-end TLS 1.3         | Preventive | Verified | 0.95          | Critical | raj.patel@acme.com | PCI-DSS 4.1 |
| Transaction signing (HMAC) | Preventive | Verified | 0.90          | Critical | li.chen@acme.com   | PCI-DSS 4.1 |

| #   | Threat                                 | STRIDE                 | Severity | Status  | Taxonomy           |
| --- | -------------------------------------- | ---------------------- | -------- | ------- | ------------------ |
| T-9 | Privilege escalation to other accounts | Elevation of Privilege | Critical | Exposed | CWE-639, CAPEC-122 |

**Countermeasures for T-9: Privilege escalation to other accounts**

| Countermeasure                       | Type       | Status | Effectiveness | Priority | Owner          | Compliance  |
| ------------------------------------ | ---------- | ------ | ------------- | -------- | -------------- | ----------- |
| IDOR protection on account endpoints | Preventive | Gap    | —             | Critical | — (unassigned) | OWASP MASVS |

| #    | Threat                                 | STRIDE    | Severity | Status      | Taxonomy |
| ---- | -------------------------------------- | --------- | -------- | ----------- | -------- |
| T-10 | Race condition in concurrent transfers | Tampering | High     | Addressable | CWE-362  |

**Countermeasures for T-10: Race condition in concurrent transfers**

| Countermeasure                    | Type       | Status   | Effectiveness | Priority | Owner            | Compliance |
| --------------------------------- | ---------- | -------- | ------------- | -------- | ---------------- | ---------- |
| Database-level optimistic locking | Preventive | Planned  | —             | High     | li.chen@acme.com | —          |
| Idempotency keys on transfer API  | Preventive | Verified | 0.85          | High     | li.chen@acme.com | —          |

| #    | Threat                                  | STRIDE    | Severity | Status    | Taxonomy |
| ---- | --------------------------------------- | --------- | -------- | --------- | -------- |
| T-11 | Insufficient transfer amount validation | Tampering | High     | Mitigated | CWE-20   |

**Countermeasures for T-11: Insufficient transfer amount validation**

| Countermeasure                            | Type       | Status   | Effectiveness | Priority | Owner            | Compliance |
| ----------------------------------------- | ---------- | -------- | ------------- | -------- | ---------------- | ---------- |
| Server-side amount and balance validation | Preventive | Verified | 0.95          | Critical | li.chen@acme.com | —          |
| Daily transfer limit enforcement          | Preventive | Verified | 0.80          | High     | li.chen@acme.com | —          |

#### Transaction DB

| #    | Threat                        | STRIDE                 | Severity | Status    | Taxonomy |
| ---- | ----------------------------- | ---------------------- | -------- | --------- | -------- |
| T-12 | Data breach via SQL injection | Information Disclosure | Critical | Mitigated | CWE-89   |

**Countermeasures for T-12: Data breach via SQL injection**

| Countermeasure                    | Type       | Status   | Effectiveness | Priority | Owner              | Compliance    |
| --------------------------------- | ---------- | -------- | ------------- | -------- | ------------------ | ------------- |
| Parameterized queries / ORM usage | Preventive | Verified | 0.95          | Critical | li.chen@acme.com   | PCI-DSS 6.5.1 |
| Database user least privilege     | Preventive | Verified | 0.85          | High     | raj.patel@acme.com | PCI-DSS 7.1   |

| #    | Threat                                      | STRIDE                 | Severity | Status      | Taxonomy           |
| ---- | ------------------------------------------- | ---------------------- | -------- | ----------- | ------------------ |
| T-13 | Unauthorized data access by internal actors | Information Disclosure | High     | Addressable | CWE-284, T1078.004 |

**Countermeasures for T-13: Unauthorized data access by internal actors**

| Countermeasure                      | Type       | Status   | Effectiveness | Priority | Owner              | Compliance   |
| ----------------------------------- | ---------- | -------- | ------------- | -------- | ------------------ | ------------ |
| Role-based database access controls | Preventive | Verified | 0.80          | High     | raj.patel@acme.com | PCI-DSS 7.1  |
| Database activity monitoring (DAM)  | Detective  | Gap      | —             | High     | — (unassigned)     | PCI-DSS 10.2 |

| #    | Threat                        | STRIDE            | Severity | Status    | Taxonomy |
| ---- | ----------------------------- | ----------------- | -------- | --------- | -------- |
| T-14 | Data loss from backup failure | Denial of Service | Medium   | Mitigated | CWE-221  |

**Countermeasures for T-14: Data loss from backup failure**

| Countermeasure                                | Type       | Status   | Effectiveness | Priority | Owner              | Compliance  |
| --------------------------------------------- | ---------- | -------- | ------------- | -------- | ------------------ | ----------- |
| Automated daily backups with retention policy | Corrective | Verified | 0.90          | High     | raj.patel@acme.com | —           |
| Quarterly backup restore testing              | Detective  | Verified | 0.85          | Medium   | raj.patel@acme.com | SOC 2 CC7.5 |

### 2.3 Threat Detail — Data Flows

| #    | Data Flow                   | Threat                         | STRIDE                 | Severity | Status    | Taxonomy |
| ---- | --------------------------- | ------------------------------ | ---------------------- | -------- | --------- | -------- |
| TF-1 | Mobile Client → API Gateway | Man-in-the-middle interception | Information Disclosure | High     | Mitigated | CWE-300  |

**Countermeasures for TF-1: Man-in-the-middle interception**

| Countermeasure                    | Type       | Status   | Effectiveness | Priority | Owner              | Compliance  |
| --------------------------------- | ---------- | -------- | ------------- | -------- | ------------------ | ----------- |
| TLS 1.3 enforcement               | Preventive | Verified | 0.95          | Critical | raj.patel@acme.com | PCI-DSS 4.1 |
| Certificate pinning in mobile app | Preventive | Verified | 0.85          | High     | jane.doe@acme.com  | OWASP MASVS |

| #    | Data Flow                   | Threat                     | STRIDE   | Severity | Status    | Taxonomy |
| ---- | --------------------------- | -------------------------- | -------- | -------- | --------- | -------- |
| TF-2 | Mobile Client → API Gateway | Certificate pinning bypass | Spoofing | Medium   | Mitigated | CWE-295  |

**Countermeasures for TF-2: Certificate pinning bypass**

| Countermeasure                          | Type       | Status   | Effectiveness | Priority | Owner             | Compliance  |
| --------------------------------------- | ---------- | -------- | ------------- | -------- | ----------------- | ----------- |
| Multi-pin with backup certificates      | Preventive | Verified | 0.80          | Medium   | jane.doe@acme.com | —           |
| Root detection and jailbreak prevention | Detective  | Verified | 0.70          | Medium   | jane.doe@acme.com | OWASP MASVS |

| #    | Data Flow                  | Threat                    | STRIDE                 | Severity | Status    | Taxonomy |
| ---- | -------------------------- | ------------------------- | ---------------------- | -------- | --------- | -------- |
| TF-3 | API Gateway → Auth Service | Internal traffic sniffing | Information Disclosure | Medium   | Mitigated | CWE-319  |

**Countermeasures for TF-3: Internal traffic sniffing**

| Countermeasure                          | Type       | Status   | Effectiveness | Priority | Owner              | Compliance  |
| --------------------------------------- | ---------- | -------- | ------------- | -------- | ------------------ | ----------- |
| mTLS between all internal services      | Preventive | Verified | 0.95          | High     | raj.patel@acme.com | —           |
| Network segmentation (Application Zone) | Preventive | Platform | 0.85          | High     | raj.patel@acme.com | PCI-DSS 1.3 |

| #    | Data Flow                       | Threat                | STRIDE                 | Severity | Status  | Taxonomy |
| ---- | ------------------------------- | --------------------- | ---------------------- | -------- | ------- | -------- |
| TF-4 | Transfer Service → Core Banking | VPN tunnel compromise | Information Disclosure | High     | Exposed | CWE-311  |

**Countermeasures for TF-4: VPN tunnel compromise**

| Countermeasure                               | Type       | Status | Effectiveness | Priority | Owner          | Compliance |
| -------------------------------------------- | ---------- | ------ | ------------- | -------- | -------------- | ---------- |
| VPN tunnel rotation and monitoring           | Preventive | Gap    | —             | High     | — (unassigned) | —          |
| Real-time anomaly detection on all endpoints | Detective  | Waived | —             | Medium   | — (unassigned) | —          |

### 2.4 Dismissed Threats

_Threats where `is_dismissed=True` on the instance. These threats were evaluated and determined not to apply to the specific component in this system's context._

| Threat                                           | Component         | Reason for Dismissal                                                                              |
| ------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------- |
| Physical device theft leading to data extraction | Mobile Client App | Handled by OS-level encryption and remote wipe capability; outside application threat model scope |

---

## Part 3: What Are We Going To Do About It?

### 3.1 Countermeasure Status Overview

| Status       | Description                                                      | Count |
| ------------ | ---------------------------------------------------------------- | ----- |
| **Verified** | Implemented and confirmed through testing or evidence            | 28    |
| **Platform** | Provided by underlying infrastructure or cloud platform          | 9     |
| **Planned**  | Approved and scheduled for implementation                        | 8     |
| **Gap**      | Identified need with no implementation plan                      | 5     |
| **Waived**   | Risk accepted or not applicable, formally documented with reason | 2     |

### 3.2 Gaps (Requiring Immediate Attention)

| Countermeasure                       | Threat                             | Component                       | Priority | Owner            |
| ------------------------------------ | ---------------------------------- | ------------------------------- | -------- | ---------------- |
| IDOR protection on account endpoints | T-9: Privilege escalation          | Transfer Service                | Critical | — (unassigned)   |
| Database activity monitoring (DAM)   | T-13: Unauthorized internal access | Transaction DB                  | High     | — (unassigned)   |
| VPN tunnel rotation and monitoring   | TF-4: VPN compromise               | Transfer Service → Core Banking | High     | — (unassigned)   |
| Tamper-evident log storage           | T-7: Insufficient logging          | Auth Service                    | High     | — (unassigned)   |
| Sensitive data masking in logs       | T-7: Insufficient logging          | Auth Service                    | Medium   | li.chen@acme.com |

### 3.3 Waived Countermeasures

_Countermeasures with `status="waived"`. Every waiver requires a documented justification. This includes both risk acceptances ("relevant but we accept the risk") and not-applicable determinations ("auto-generated from library but doesn't apply to our architecture")._

| Countermeasure                               | Threat                 | Waived By      | Justification                                                                                     | Review Date |
| -------------------------------------------- | ---------------------- | -------------- | ------------------------------------------------------------------------------------------------- | ----------- |
| Hardware security module for session keys    | T-5: Session hijacking | CISO           | Cost prohibitive for current scale; software-based key management with rotation deemed sufficient | 2026-09-01  |
| Real-time anomaly detection on all endpoints | TF-4: VPN compromise   | VP Engineering | Existing rate limiting + CloudFront Shield provides adequate protection                           | 2026-06-01  |

### 3.4 Inherited Countermeasures (Zone Protection)

_Countermeasures where `is_inherited=True`. These were originally gap countermeasures on inner-zone components that were promoted to platform status because an outer zone already provides the same protection. Each is also shown inline with its threat in Part 2._

| Countermeasure                          | Threat                          | Target Component           | Target Zone      | Inherited From Component | Inherited From Zone |
| --------------------------------------- | ------------------------------- | -------------------------- | ---------------- | ------------------------ | ------------------- |
| Network segmentation (Application Zone) | TF-3: Internal traffic sniffing | API Gateway → Auth Service | Application Zone | API Gateway              | DMZ                 |
| mTLS between all internal services      | TF-3: Internal traffic sniffing | API Gateway → Auth Service | Application Zone | API Gateway              | DMZ                 |

_Note: Only countermeasures applied via the "Zone Protections" action appear here. Platform countermeasures that are assigned directly (e.g., CloudFront/Shield DDoS protection on T-2, Time-based OTP expiry on T-6) are not inherited — they are native to their component and shown only inline in Part 2._

---

## Part 4: Did We Do a Good Enough Job?

### 4.1 Risk Register

| #   | Risk                                        | Inherent Score | Inherent Level | Residual Score | Residual Level | Status      | Owner                |
| --- | ------------------------------------------- | -------------- | -------------- | -------------- | -------------- | ----------- | -------------------- |
| R-1 | Unauthorized access to customer accounts    | 88             | Critical       | 35             | Medium         | Addressable | maria.silva@acme.com |
| R-2 | Financial loss through fraudulent transfers | 92             | Critical       | 22             | Low            | Mitigated   | li.chen@acme.com     |
| R-3 | Customer data breach (PII exposure)         | 80             | Critical       | 42             | Medium         | Addressable | jane.doe@acme.com    |
| R-4 | Service unavailability during peak hours    | 65             | High           | 18             | Low            | Mitigated   | raj.patel@acme.com   |
| R-5 | Regulatory non-compliance (PCI-DSS)         | 75             | High           | 55             | High           | Addressable | jane.doe@acme.com    |
| R-6 | Insider threat to financial data            | 70             | High           | 30             | Medium         | Addressable | raj.patel@acme.com   |
| R-7 | Reputational damage from security incident  | 60             | Medium         | 28             | Medium         | Mitigated   | jane.doe@acme.com    |
| R-8 | Third-party service compromise              | 50             | Medium         | 20             | Low            | Mitigated   | maria.silva@acme.com |

#### Risk Detail — R-1: Unauthorized access to customer accounts

| Field              | Value                                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**    | An attacker gains unauthorized access to a customer's banking account through credential compromise, session hijacking, or authentication bypass, potentially leading to financial fraud and data theft. |
| **Inherent Score** | 88 (Critical)                                                                                                                                                                                            |
| **Residual Score** | 35 (Medium)                                                                                                                                                                                              |
| **Scoring Method** | TM-Library (Likelihood: 4, Impact: 5)                                                                                                                                                                    |

**Contributing Threats:**

| Threat                                      | Component        | Severity | Status      |
| ------------------------------------------- | ---------------- | -------- | ----------- |
| T-3: Unauthorized access via JWT bypass     | API Gateway      | Critical | Addressable |
| T-4: Credential stuffing attack             | Auth Service     | Critical | Mitigated   |
| T-5: Session hijacking via token theft      | Auth Service     | High     | Mitigated   |
| T-9: Privilege escalation to other accounts | Transfer Service | Critical | Exposed     |

### 4.2 Compliance Mapping

#### Framework Coverage Summary

| Framework     | Total Requirements | Mapped | Covered (Verified/Platform) | Gaps | Coverage |
| ------------- | ------------------ | ------ | --------------------------- | ---- | -------- |
| PCI-DSS 4.0   | 42                 | 38     | 31                          | 7    | 74%      |
| SOC 2 Type II | 28                 | 25     | 21                          | 4    | 75%      |
| OWASP MASVS   | 35                 | 30     | 24                          | 6    | 69%      |

#### PCI-DSS 4.0 — Requirement Gaps

| Requirement                            | Section                           | Mapped Countermeasure             | Status   |
| -------------------------------------- | --------------------------------- | --------------------------------- | -------- |
| 6.5.1 — Injection flaws                | Build and Maintain Secure Systems | Input validation and sanitization | Verified |
| 6.6 — Public-facing web app protection | Build and Maintain Secure Systems | WAF rules for OWASP Top 10        | Verified |
| 8.3.1 — Strong authentication          | Strong Access Control             | MFA enforcement                   | Verified |
| 10.2 — Audit trail                     | Monitoring and Testing            | Comprehensive audit logging       | Planned  |
| 10.5 — Secure audit trails             | Monitoring and Testing            | Tamper-evident log storage        | Gap      |
| 11.5 — Change detection                | Monitoring and Testing            | File integrity monitoring         | Gap      |

#### Instance-Level Overrides

_Where instance-level compliance mappings (`ComponentInstanceCountermeasureStandard` / `FlowInstanceCountermeasureStandard`) override the library-level sufficiency. For example, a library says a countermeasure partially covers a requirement, but the team's specific implementation fully covers it._

| Countermeasure               | Component       | Library Sufficiency | Instance Sufficiency | Requirement |
| ---------------------------- | --------------- | ------------------- | -------------------- | ----------- |
| Encryption at rest (AES-256) | Transaction DB  | Partial             | Full                 | PCI-DSS 3.4 |
| Access logging               | Audit Log Store | Partial             | Full                 | SOC 2 CC7.2 |

### 4.3 Assumptions Review

_Assumptions from Part 1 re-evaluated here. Unconfirmed or rejected assumptions represent risk to the analysis — if a foundational assumption is wrong, threats and countermeasures built on it may need re-evaluation._

| Assumption                                            | Validity    | Impact If Invalid                                                          |
| ----------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| Application Zone network is isolated to platform team | Confirmed   | High — lateral movement threats unaccounted for                            |
| Core Banking validates transactions independently     | Confirmed   | Critical — transfer fraud if upstream validation is sole control           |
| Mobile client binary is not tampered with             | Unconfirmed | High — client-side controls (cert pinning, root detection) may be bypassed |
| Redis session store not accessible from DMZ           | Confirmed   | High — session theft at scale                                              |
| Push payloads contain no sensitive data               | Confirmed   | Medium — data leakage via notification channel                             |
| FCM/APNs 99.9% uptime                                 | Unconfirmed | Low — notification delay, not a security impact                            |

**Attention Required:**

- **Mobile client binary integrity (Unconfirmed)** — Countermeasures T-5 (cookie flags), TF-2 (cert pinning, root detection) assume the app binary hasn't been reverse-engineered or repackaged. If this assumption is rejected, these countermeasures lose effectiveness and T-3, TF-1, TF-2 may need re-scoring.

### 4.4 Findings and Recommendations

#### Critical Findings

1. **IDOR vulnerability in Transfer Service (T-9)** — The transfer endpoint lacks proper authorization checks to verify the requesting user owns the source account. This is an exposed critical-severity threat with no countermeasure in place. **Recommendation:** Implement object-level authorization checks on all account-scoped endpoints before the next release.

2. **VPN tunnel to Core Banking lacks monitoring (TF-4)** — The dedicated VPN connection to the core banking system has no active monitoring for tunnel compromise or anomalous traffic patterns. **Recommendation:** Deploy network traffic analysis and implement automated VPN key rotation.

#### Action Items

| Priority | Action                                         | Owner                | Related Threat/Risk |
| -------- | ---------------------------------------------- | -------------------- | ------------------- |
| Critical | Implement IDOR protection on account endpoints | — (unassigned)       | T-9, R-1            |
| Critical | Complete JWT algorithm confusion prevention    | maria.silva@acme.com | T-3, R-1            |
| High     | Deploy database activity monitoring            | raj.patel@acme.com   | T-13, R-6           |
| High     | Implement VPN tunnel monitoring                | raj.patel@acme.com   | TF-4, R-8           |
| High     | Complete PCI-DSS audit logging requirements    | li.chen@acme.com     | T-7, R-5            |
| Medium   | Implement sensitive data masking in logs       | li.chen@acme.com     | T-7                 |

#### Progress Checklist

| Item                     | Status   |
| ------------------------ | -------- |
| System context defined   | Complete |
| Data assets identified   | Complete |
| DFD diagrams created     | Complete |
| Components analyzed      | Complete |
| Threats identified       | Complete |
| Countermeasures assessed | Complete |
| Risks scored             | Complete |
| Compliance mapped        | Complete |
| Gaps documented          | Complete |
| Report reviewed          | Pending  |
| Submitted for approval   | Pending  |
