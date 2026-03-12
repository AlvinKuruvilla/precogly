# Reporting Architecture

## Summary

The reporting module generates audience-specific reports from a single threat model dataset. Each report type selects different sections at different depths, rendered as a web view and downloadable as PDF.

## Report Types

| Report | Audience | Purpose | Est. Pages |
|---|---|---|---|
| **Executive Summary** | CISO, security leadership, board | Risk posture, compliance status, key decisions needed | 3-5 |
| **Technical Report** | Engineers, architects, dev teams | What to fix, full threat/countermeasure detail, action items | 15-25 |
| **Compliance Report** | GRC analysts, internal/external auditors | Framework coverage, waivers, overrides, audit trail | 8-12 |
| **Full Report** | External auditors, regulatory submissions, archive | Complete threat model documentation | 25-35 |

## Section Mapping

Each report type includes a subset of the full report's sections. Depth levels: **Full** (all detail), **Summary** (counts/tables without per-item detail), **Flagged** (only items needing attention), **—** (omitted).

### Part 1: What Are We Working On?

| Section | Executive | Technical | Compliance | Full |
|---|---|---|---|---|
| System Description | Summary | Summary | Full | Full |
| In-Scope Components | — | Full | Summary | Full |
| Out-of-Scope Items | — | — | Full | Full |
| Assumptions | Flagged | Summary | Full | Full |
| Referenced Threat Models | — | Summary | Full | Full |
| Data Flow Diagrams | — | Full | — | Full |
| Reference Images | — | Full | — | Full |
| Trust Zones | — | Full | Summary | Full |
| Trust Boundaries | — | Full | Summary | Full |
| Data Assets | — | Full | Summary | Full |
| Data Asset Placement | — | Full | — | Full |
| Data Assets in Transit | — | Full | — | Full |
| Component Inventory | — | Full | — | Full |
| Data Flows | — | Full | — | Full |

### Part 2: What Can Go Wrong?

| Section | Executive | Technical | Compliance | Full |
|---|---|---|---|---|
| STRIDE Summary | Full | Full | Summary | Full |
| Component Threats (with inline CMs) | — | Full | — | Full |
| Data Flow Threats (with inline CMs) | — | Full | — | Full |
| Dismissed Threats | — | Full | Full | Full |

### Part 3: What Are We Going To Do About It?

| Section | Executive | Technical | Compliance | Full |
|---|---|---|---|---|
| Countermeasure Status Overview | Full | Full | Full | Full |
| Gaps (Requiring Attention) | Top 3 | Full | Full | Full |
| Waived Countermeasures | Count only | Full | Full | Full |
| Inherited Countermeasures | — | Full | — | Full |

### Part 4: Did We Do a Good Enough Job?

| Section | Executive | Technical | Compliance | Full |
|---|---|---|---|---|
| Risk Register | Full | Summary | Full | Full |
| Risk Detail (per-risk breakdown) | Top 3 | — | Full | Full |
| Compliance Framework Coverage | Summary | — | Full | Full |
| Compliance Requirement Gaps | Flagged | — | Full | Full |
| Instance-Level Overrides | — | — | Full | Full |
| Assumptions Review | Flagged | — | Full | Full |
| Critical Findings | Full | Full | Compliance-related | Full |
| Action Items | Top priorities | Full | Compliance-related | Full |
| Progress Checklist | — | — | Full | Full |

## Depth Level Definitions

### Full
All items rendered with complete detail. Tables show every row. Threats include inline countermeasure tables. Risks include contributing threat breakdowns.

### Summary
Aggregated view. Threat analysis shows STRIDE category counts, not individual threats. Risk register shows the table without per-risk detail breakdowns. Assumptions show the table without "Impact If Invalid" analysis.

### Flagged
Only items needing attention. Assumptions with validity = `unconfirmed` or `rejected`. Compliance requirements with status = `Gap`. Risks with residual level = `High` or `Critical`.

### Top 3 / Top Priorities
Limited to the highest-priority items. Gaps sorted by priority (Critical first), capped at 3. Risks sorted by residual score descending, capped at 3. Keeps the executive report focused on decisions, not inventory.

### Count Only
A single number or one-line summary. Example: "2 countermeasures waived" instead of the full waiver table with justifications.

### Compliance-Related
Filtered to items that reference a compliance framework. Action items without a compliance tag are excluded. Findings are limited to those affecting framework coverage.

## Report-Specific Design Notes

### Executive Summary Report

Opens with the Key Metrics dashboard (component/threat/countermeasure counts), Threat Status Breakdown, Countermeasure Status Breakdown, and Risk Posture matrix — all from the Executive Summary section of the full report.

Follows with:
- **Flagged assumptions** — only unconfirmed/rejected, with impact statement
- **STRIDE breakdown** — the category table, no per-threat detail
- **Top 3 gaps** — highest priority countermeasure gaps with owner and related threat
- **Risk register** — full table with top 3 risk detail expansions
- **Compliance coverage** — framework summary table (coverage %)
- **Critical findings** — the 1-2 most urgent items with recommendations

Design goal: A security leader can read this in 10 minutes and know what decisions to make.

### Technical Report

Opens with system description and architecture (DFDs, reference images, trust zones, trust boundaries). This is the primary context for engineering teams.

Core of the report is Part 2 — every component and data flow threat with inline countermeasure tables. Engineers need to see exactly what threats affect their components and what countermeasures are verified, planned, or missing.

Closes with:
- **Full gaps table** — every gap countermeasure with priority and owner
- **Full waiver table** — so engineers understand what was explicitly accepted
- **Inherited countermeasures** — zone protection context
- **Risk register** — summary table (no per-risk detail)
- **All action items** — prioritized work list
- **All findings** — with recommendations

Design goal: An engineer can find their component, see its threats, and know exactly what to implement.

### Compliance Report

Opens with full scope documentation — system description, out-of-scope items, assumptions, referenced threat models. Auditors need to understand boundaries and dependencies.

Core is Part 4 — framework coverage, requirement gaps, instance-level overrides, assumptions review. This is the evidence trail.

Also includes:
- **Dismissed threats** — auditors need to verify dismissals were justified
- **Full waiver table** — every risk acceptance with justification and review date
- **Countermeasure status overview** — evidence that controls were assessed
- **Risk register with detail** — full risk breakdown for all risks
- **Progress checklist** — evidence that the process was completed

Design goal: An auditor can verify that the threat model was thorough, identify control gaps, and review all risk acceptance decisions.

## Data Architecture

### Single Fetch, Multiple Renders

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Threat Model │────▶│  Report Data API  │────▶│ Report Renderer │
│  (database)  │     │  (single fetch)   │     │  (per audience) │
└─────────────┘     └──────────────────┘     └─────────────────┘
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                              ┌──────────┐   ┌──────────┐   ┌──────────┐
                              │ Web View │   │   PDF    │   │  (future) │
                              │ (React)  │   │(WeasyPrint│   │   JSON   │
                              └──────────┘   │or browser)│   │  export  │
                                             └──────────┘   └──────────┘
```

### Report Data API

A single backend endpoint assembles the complete report dataset:

```
GET /api/threat-models/:id/report/
```

Returns all data needed by any report type: threat model metadata, scope, assumptions, components, data flows, trust zones, trust boundaries, data assets, threats with countermeasures, risks, compliance mappings, reference images, DFD metadata.

The frontend (or PDF renderer) selects which sections to render based on the chosen report type. No audience-specific backend logic — the API returns everything, the template decides what to show.

### PDF Generation

Two approaches, to be decided during implementation:

**Option A: Server-side (WeasyPrint)**
- Backend renders HTML from a Django/Jinja template per report type
- WeasyPrint converts to PDF with proper pagination, headers/footers, page numbers
- Better control over print layout, page breaks, TOC generation
- Endpoint: `GET /api/threat-models/:id/report/pdf/?type=executive`

**Option B: Client-side (browser print)**
- React renders the report with `@media print` CSS
- User clicks "Download PDF" → `window.print()` or a library like `react-to-print`
- Simpler implementation, less control over pagination
- DFD diagrams rendered as images (canvas snapshot)

**Recommendation**: Option A for production-quality PDFs (page numbers, TOC, consistent formatting across browsers). Option B as a quick MVP.

### DFD Rendering in Reports

DFDs in the web report can be rendered as:
- **Interactive**: Embedded React Flow canvas (read-only, pannable, zoomable) — web view only
- **Static image**: Server-side canvas snapshot or SVG export — for PDF and as fallback

For PDF generation, DFDs must be pre-rendered as images since PDF cannot contain interactive elements.

## Future Considerations

- **Report versioning**: Snapshot a report at a point in time for audit trail. Store the rendered data (not just a reference to current DB state).
- **Custom report templates**: Allow organizations to define their own section selection and branding.
- **Scheduled reports**: Auto-generate and email reports on a cadence (e.g., monthly executive summary).
- **Diff reports**: Show what changed between two report snapshots — new threats, resolved gaps, score changes.
- **JSON/CSV export**: Machine-readable export for integration with GRC platforms, SIEM, ticketing systems.
