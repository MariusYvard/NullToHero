---
name: audit-report
description: >
  Consolidation and formatting reference for the unified /audit output. Turns
  SITE-AUDIT-REPORT.md into a client-ready Markdown deliverable or a PDF, applies
  consistent score bands and gauges, and lays out the report skeleton. Reuses the
  SEO report PDF tooling rather than duplicating it. Use after a full, seo,
  defects, or design run, or when the user asks for a report or PDF.
version: 1.14.0
---

# Unified Audit Report

This reference formats an existing audit, produced by a run mode in
[full.md](full.md), into a deliverable. It does not run agents and does not
re-score. It reads `SITE-AUDIT-REPORT.md` (and `SITE-ACTION-PLAN.md` when present) and
renders a clean Markdown document, optionally converting it to PDF.

## From audit output to deliverable

1. Read `SITE-AUDIT-REPORT.md` for the scores and the per-group findings, and
   `SITE-ACTION-PLAN.md` for the prioritized fix list. When `SITE-AUDIT.json` is
   present, read it for the machine-readable scores, the per-check verdicts and the
   cost ledger rather than re-deriving them from the prose.
2. Render the overall Site Health Score and the three group sub-scores as gauges
   with their band label (see "Score bands" and "Score gauges").
3. Lay out the group breakdown (Search Visibility, Front-end Defects, Design
   Quality), each with its sub-score and the agent sections beneath it.
4. Render the consolidated action plan as a single prioritized table ordered
   Critical, High, Medium, Low, with the owning dimension on each row.
5. Save as Markdown. If a PDF was requested, convert it (see "PDF mode").

## Score bands

Apply these bands to the overall score and to each group sub-score. They match
the bands used by the specialist agents so the report and the agents never
disagree on a label.

| Band | Range | Meaning |
|------|-------|---------|
| Excellent | 90-100 | Strong across the dimension, only minor refinements left |
| Good | 70-89 | Solid, with a few clear improvements |
| Needs work | 50-69 | Meaningful gaps that affect outcomes |
| Critical | 0-49 | Serious problems that block results |

## Score gauges

Render each score as an ASCII bar in Markdown so it survives any renderer. Fill
`#` blocks proportionally: score divided by 10, rounded, is the number of filled
blocks out of ten.

| Example score | Gauge |
|-------|-------|
| 10/100 | `[#.........] 10/100` |
| 30/100 | `[###.......] 30/100` |
| 50/100 | `[#####.....] 50/100` |
| 73/100 | `[#######...] 73/100` |
| 86/100 | `[#########.] 86/100` |
| 100/100 | `[##########] 100/100` |

## Report skeleton

Every unified report follows this structure:

```markdown
# Site Audit Report - [Site Name]
**Date:** [YYYY-MM-DD]  **Scope:** [full | seo | defects | design | quick]  **Tool:** NullToHero /audit

## Overall Site Health Score
[GAUGE]  Band: [Excellent | Good | Needs work | Critical]

## Group Scores
| Group | Score | Band |
|-------|-------|------|
| Search Visibility | XX/100 | ... |
| Front-end Defects | XX/100 | ... |
| Design Quality | XX/100 | ... |

## Findings by Group
### Search Visibility
[embed the five SEO agent sections]
### Front-end Defects
[embed the four inspect agent sections]
### Design Quality
[embed the four siteasy agent sections]

## Action Plan
| # | Priority | Issue | Dimension | Fix |
|---|----------|-------|-----------|-----|
| 1 | Critical | ... | ... | ... |

## Cost ledger
[agents launched, approximate tokens, elapsed — from SITE-AUDIT.json cost or the report's Cost ledger table]

## Appendix: Methodology
```

The appendix lists the 13 specialist sub-agents the audit dispatched, grouped by
dimension:

- Search Visibility: seo-agent-technical, seo-agent-content, seo-agent-schema, seo-agent-performance, seo-agent-geo
- Front-end Defects: inspect-agent-a11y, inspect-agent-interaction, inspect-agent-layout, inspect-agent-code
- Design Quality: siteasy-agent-ux, siteasy-agent-visual, siteasy-agent-motion, siteasy-agent-content

Note the scope when a run mode covered only one group, and note any partial
coverage carried over from the audit (see "Error handling" in [full.md](full.md)).

## PDF mode

PDF generation reuses the SEO report tooling. Do not reimplement the PDF mechanics
here. Generate the full Markdown report first, then follow the PDF steps in
[the SEO report reference](../../seo/references/report.md), passing the unified
report file as the input. If the PDF skill is unavailable, deliver the Markdown
and say so.

## File naming

| Format | Filename |
|--------|----------|
| Markdown | `SITE-AUDIT-REPORT-[domain]-[YYYY-MM-DD].md` |
| Action plan only | `ACTION-PLAN-[domain]-[YYYY-MM-DD].md` |
| PDF | `SITE-AUDIT-REPORT-[domain]-[YYYY-MM-DD].pdf` |
