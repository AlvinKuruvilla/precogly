Django Backend Implementation Plan for Precogly

Based on the DATABASE.md schema and the frontend analysis, here's a comprehensive task list:

---

Phase 1: Project Setup & Foundation

| #   | Task                         | Details                                                                           |
| --- | ---------------------------- | --------------------------------------------------------------------------------- |
| 1.1 | Initialize Django project    | django-admin startproject precogly_backend with settings for dev/staging/prod     |
| 1.2 | Create Django apps structure | Apps: core, organizations, systems, threats, diagrams, compliance, integrations   |
| 1.3 | Configure settings           | Database (PostgreSQL), CORS, static files, environment variables (django-environ) |
| 1.4 | Set up Django REST Framework | Install DRF, configure authentication, pagination, throttling, versioning         |
| 1.5 | Configure authentication     | Django Allauth or dj-rest-auth for JWT/session auth, social login ready           |
| 1.6 | Set up development tooling   | django-debug-toolbar, django-extensions, pre-commit hooks, black/isort            |
| 1.7 | Docker configuration         | Dockerfile, docker-compose.yml for local dev with PostgreSQL, Redis               |

---

Phase 2: Database Models

Translate DATABASE.md schema to Django models:

| #    | App                 | Models                                                                                |
| ---- | ------------------- | ------------------------------------------------------------------------------------- |
| 2.1  | organizations       | Organization, OrganizationMember                                                      |
| 2.2  | systems             | Orgsystem, IntegrationSource, TrustBoundary, OrgsystemComponent                       |
| 2.3  | systems             | ComponentLibrary, DataAsset, ComponentDataAsset                                       |
| 2.4  | systems             | DataFlow, DataFlowAsset                                                               |
| 2.5  | threats             | ThreatLibrary, ComponentLibraryThreat                                                 |
| 2.6  | threats             | ComponentInstanceThreat, DataFlowInstanceThreat                                       |
| 2.7  | threats             | CountermeasureLibrary, ComponentInstanceCountermeasure, FlowInstanceCountermeasure    |
| 2.8  | diagrams            | ThreatModel, ThreatModelOrgsystem, ThreatModelRelationship                            |
| 2.9  | diagrams            | DFD, ThreatModelDFD, DFDOrgsystem, DFDTemplatesLibrary                                |
| 2.10 | compliance          | StandardFramework, StandardRequirement, CountermeasureLibraryStandard                 |
| 2.11 | threats             | VerificationTest, ComponentInstanceCountermeasureTest, FlowInstanceCountermeasureTest |
| 2.12 | threats             | PentestFinding                                                                        |
| 2.13 | Generate migrations | makemigrations + migrate for all apps                                                 |
| 2.14 | Seed data scripts   | Management commands to load threat library, countermeasures, compliance frameworks    |

---

Phase 3: Serializers & API Layer

| #    | Task                   | Endpoints                                                                  |
| ---- | ---------------------- | -------------------------------------------------------------------------- |
| 3.1  | Dashboard API          | GET /api/dashboard/stats - aggregate stats                                 |
| 3.2  | Organization APIs      | CRUD for orgs, member management, role assignment                          |
| 3.3  | Threat Model APIs      | GET/POST /api/threat-models, GET/PATCH/DELETE /api/threat-models/:id       |
| 3.4  | DFD/Diagram APIs       | GET/POST /api/diagrams, GET/PATCH /api/diagrams/:id (store ReactFlow JSON) |
| 3.5  | Component Library APIs | Browse/filter components, org-specific customization                       |
| 3.6  | Threat Library APIs    | Browse threats by STRIDE category, technology, etc.                        |
| 3.7  | Countermeasure APIs    | Browse countermeasures, compliance mappings                                |
| 3.8  | System/Orgsystem APIs  | CRUD for systems, component instances                                      |
| 3.9  | Threat Instance APIs   | CRUD for component/flow threats and countermeasures                        |
| 3.10 | Compliance APIs        | Browse frameworks, requirements                                            |
| 3.11 | Template APIs          | Browse/filter DFD templates                                                |

---

Phase 4: Business Logic & Services

| #   | Task                              | Details                                                            |
| --- | --------------------------------- | ------------------------------------------------------------------ |
| 4.1 | Threat auto-generation service    | Given a component + technology, auto-generate applicable threats   |
| 4.2 | Countermeasure suggestion service | Given a threat, suggest applicable countermeasures                 |
| 4.3 | Threat status calculation         | Derive status (exposed/addressable/mitigated) from countermeasures |
| 4.4 | Compliance gap analysis           | Calculate compliance coverage based on countermeasures             |
| 4.5 | Diagram versioning                | Track diagram changes, support version history                     |
| 4.6 | Threat model versioning           | Track threat model versions, diff between versions                 |
| 4.7 | Risk scoring                      | Calculate inherent/residual risk scores                            |
| 4.8 | Workspace state management        | Store/retrieve workspace state (progress, system context)          |

---

Phase 5: Authentication & Authorization

| #   | Task                           | Details                                                 |
| --- | ------------------------------ | ------------------------------------------------------- |
| 5.1 | User registration/login        | Email + password, optional social auth                  |
| 5.2 | JWT token management           | Access/refresh tokens, token blacklisting               |
| 5.3 | Organization-based permissions | Multi-tenant isolation, users see only their org's data |
| 5.4 | Role-based access control      | Admin, SecurityTeam, Champion, Viewer roles per org     |
| 5.5 | Object-level permissions       | django-guardian or custom for fine-grained access       |
| 5.6 | API rate limiting              | Throttle classes for different user tiers               |

---

Phase 6: Frontend Integration

| #   | Task                          | Details                                                 |
| --- | ----------------------------- | ------------------------------------------------------- |
| 6.1 | Update frontend API layer     | Replace MSW mocks with real API calls                   |
| 6.2 | Configure API base URL        | Environment-based API URL configuration                 |
| 6.3 | Auth token handling           | Store JWT, attach to requests, handle refresh           |
| 6.4 | Error handling                | Standardize API error responses, frontend error display |
| 6.5 | CORS configuration            | Allow frontend origin(s)                                |
| 6.6 | API response format alignment | Ensure backend responses match frontend types           |

---

Phase 7: Data Seeding & Migration

| #   | Task                       | Details                                                                                         |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| 7.1 | Export frontend registries | Convert threat-registry.ts, countermeasure-registry.ts, technology-registry.ts to JSON/fixtures |
| 7.2 | Create Django fixtures     | Load threats, countermeasures, technologies into DB                                             |
| 7.3 | Compliance framework data  | Load PCI-DSS, SOC2, NIST, OWASP, ISO27001, HIPAA, GDPR, DORA, CRA                               |
| 7.4 | DFD templates migration    | Move JSON templates to database                                                                 |
| 7.5 | Sample data                | Demo org, sample threat models for testing                                                      |

---

Phase 8: Testing

| #   | Task                | Details                                               |
| --- | ------------------- | ----------------------------------------------------- |
| 8.1 | Model unit tests    | Test model methods, constraints, relationships        |
| 8.2 | API endpoint tests  | Test all CRUD operations, permissions                 |
| 8.3 | Service layer tests | Test business logic (threat generation, risk scoring) |
| 8.4 | Integration tests   | End-to-end API flows                                  |
| 8.5 | Factory setup       | factory_boy for test data generation                  |
| 8.6 | CI/CD pipeline      | GitHub Actions for automated testing                  |

---

Phase 9: Advanced Features

| #   | Task                 | Details                                                    |
| --- | -------------------- | ---------------------------------------------------------- |
| 9.1 | Real-time updates    | Django Channels + WebSockets for collaborative editing     |
| 9.2 | Export functionality | Export threat models to PDF, CSV, JSON                     |
| 9.3 | Import functionality | Import from CSV, previous exports                          |
| 9.4 | Audit logging        | Track who changed what, when                               |
| 9.5 | Notification system  | Email/in-app notifications for assignments, status changes |
| 9.6 | Integration APIs     | GitHub/GitLab webhooks, JIRA integration, SBOM import      |

---

Phase 10: Deployment & Operations

| #    | Task                | Details                                                       |
| ---- | ------------------- | ------------------------------------------------------------- |
| 10.1 | Production settings | Secure settings, HTTPS, HSTS, CSP headers                     |
| 10.2 | Database setup      | PostgreSQL configuration, connection pooling                  |
| 10.3 | Static/media files  | S3 or equivalent for file storage                             |
| 10.4 | Celery + Redis      | Background task processing for exports, imports, integrations |
| 10.5 | Monitoring          | Sentry for errors, Prometheus metrics                         |
| 10.6 | Documentation       | API docs with drf-spectacular (OpenAPI/Swagger)               |
| 10.7 | Deployment scripts  | Gunicorn, nginx config, or container orchestration            |

---

Recommended Tech Stack

| Layer       | Technology                                   |
| ----------- | -------------------------------------------- |
| Framework   | Django 5.x                                   |
| API         | Django REST Framework 3.15+                  |
| Auth        | dj-rest-auth + djangorestframework-simplejwt |
| Database    | PostgreSQL 16                                |
| Cache/Queue | Redis                                        |
| Task Queue  | Celery                                       |
| WebSockets  | Django Channels                              |
| API Docs    | drf-spectacular                              |
| Testing     | pytest-django, factory_boy                   |
| Permissions | django-guardian (object-level)               |

---

Suggested Starting Order

1. Phase 1 → Project setup (1-2 days)
2. Phase 2 → Models (2-3 days)
3. Phase 3.1-3.4 → Core APIs (threat models, diagrams, dashboard) (2-3 days)
4. Phase 5.1-5.3 → Basic auth (1-2 days)
5. Phase 6 → Frontend integration (1-2 days)
6. Phase 7 → Data seeding (1 day)
7. Iterate on remaining phases

This gives you a functional full-stack app with ~2 weeks of focused work, with advanced features added incrementally.

⏺ Would you like me to dive deeper into any specific phase, or should we start implementing Phase 1 (project setup)?
