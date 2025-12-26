# Precogly - Open Source Threat Modeling

## What is Precogly?

Precogly is an open-source threat modeling platform purpose-built for compliance.

It helps AppSec teams:

- **Model systems** by auto-ingesting architecture from GitHub, Terraform, and CSPM tools
- **Identify threats** using STRIDE, CAPEC, and custom threat libraries
- **Track countermeasures** with status, ownership, and evidence
- **Demonstrate compliance** by mapping controls to frameworks like PCI-DSS, SOC 2, and ISO 27001

## Goals

Precogly aims to solve three fundamental challenges in application security:

### 1. Continuous Threat Modeling

- **Derive accurate, human-understandable abstractions** by automatically ingesting data from as many systems as possible (GitHub, Terraform, CSPM tools, SBOMs, etc.)
- **Surface what matters most** - use a combination of human-written rules and AI to identify toxic combinations and surprising risks that humans might miss
- **Stay current as systems evolve** - threat models shouldn't be static documents; Precogly tracks when assumptions you've previously made are no longer true

### 2. Frictionless Security Gates

- **Ensure baseline controls before production** - whether it's a new product, a new release, or just a new feature, verify that required security controls are in place
- **Minimize human effort** - make it as easy as possible for teams to pass security checkpoints while maintaining confidence that critical controls are actually implemented
- **Clear accountability** - provide a specific checklist of controls with status tracking, evidence links, and ownership so teams know exactly what's needed for sign-off

### 3. Audit-Ready Compliance

- **Map controls to frameworks automatically** - select your compliance frameworks upfront (PCI-DSS, SOC 2, ISO 27001) and countermeasures are linked to relevant controls as you go
- **Evidence at your fingertips** - track implementation status, verification tests, and evidence URLs for every control
- **Multi-framework support** - demonstrate coverage across multiple frameworks without duplicating work

## Feature Comparison

| Feature                                                   | Open Source Tools | Commercial Tools | Precogly |
| --------------------------------------------------------- | ----------------- | ---------------- | -------- |
| Threat modeling                                           | ✅                | ✅               | ✅       |
| Open source                                               | ✅                | ❌               | ✅       |
| Enterprise support (multi-user, integrations etc.)        | ❌                | ✅               | ✅       |
| Compliance-aware                                          | ❌                | ✅               | ✅       |
| Auto-ingestion (GitHub, Terraform, CSPM)                  | ❌                | ⚠️ Limited       | ✅       |
| AI-assisted threat identification                         | ❌                | ⚠️ Limited       | ✅       |
| Pentest finding reconciliation                            | ❌                | ❌               | ✅       |
| Pre-built libraries (components, threats, controls, DFDs) | ❌                | ✅               | ✅       |

### What does "compliance-aware" mean?

Traditional threat modeling tools treat compliance as an afterthought - you model threats, then manually map them to frameworks during audit season.

Precogly flips this: when you select your compliance frameworks (e.g., PCI-DSS, SOC 2, DORA, CRA) upfront, every countermeasure you add is automatically linked to the relevant controls. When audit time comes, you can generate evidence of which controls are implemented, verified, and by whom - without scrambling to reconstruct the mapping.

## What is the tech stack for Precogly?

- **Backend** - Django + DRF
- **Database** - PostgreSQL
- **Frontend** - ReactJS + Vite
- **Canvas Editor** - React Flow
- **State/Data Fetching** - TanStack Query
- **Routing** - React Router
- **UI Components** - shadcn/ui

### Why did you choose Django?

- Django's ORM, migrations, and admin panel lets us model complex compliance, threat, and audit workflows quickly and safely.
- Django has strong, opinionated defaults for authentication, authorization, and auditability - critical for an enterprise-class product.
- Python integrates easily with agentic AI and future automation pipelines.
- Ecosystem maturity - Django is over 20 years old.

### Why did you choose ReactJS?

- Supports canvas-heavy UI like DFDs.
- Best-in-class libraries for graphs, collaboration, and enterprise UI patterns.

## What is the workflow of Precogly?

![Precogly Workflow](precogly-workflows.png)

## How do I get started?

Clone the repo. Start the Django backend. Start the React frontend. Start hacking! If you run into issues, email me - vikramsnarayan@gmail.com
