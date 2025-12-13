# Workflow for Precogly

4 Phases / Actor Groups:

1. Security Team - Initial Setup

- Load users (or integrate with identity
  provider)
- Link to compliance frameworks (PCI-DSS,
  CRA, DORA, etc.)
- Load tech components (S3, Azure RDS,
  etc.)
- Load threat libraries mapped to tech
  components (e.g., SQL Injection with
  Azure policy controls)
- Load countermeasures for threats
- Optionally load CMDB (processes &
  systems like "AWS Serverless system")
- Load DFD templates and link them to
  CMDB entries

2. Security Team - Ongoing Activities

- For each tech component, define
  platform-owned controls
- Set control status: Enforced
  (blocking), Audited (monitored), Planned,
  or Missing
- Add evidence templates (policy URLs,
  config specs)
- Monitor in-progress threat models
  dashboard
- Provide ad-hoc guidance and approve
  waivers

3. Security Champion - During Threat
   Modeling

- Create/version a threat model → set
  name, criticality, select frameworks
- Link to other threat models and systems
- Add team members
- Build DFD on canvas (drag components,
  set data sensitivity:
  Public/Internal/Confidential)
- Click "Threats and Countermeasures" →
  review auto-generated items
- Assign owners to countermeasures (or
  accept risk) — red items turn yellow
- Generate compliance/audit reports

4. Security Team - After Threat Modeling

- Review and approve threat model
- Push to version control on changes
- Add assets (DFDs, threats,
  countermeasures) back into libraries for
  reuse
