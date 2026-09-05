---
name: audit-report
description: >
  The plugin's single report formatter. Turns any audit output (unified /nth-audit
  runs, SEO-only runs, single-page analyses) into a client-ready Markdown
  deliverable, a self-contained HTML page, or a PDF. Applies consistent score
  bands, gauges and color coding, and lays out the report skeletons. The retired
  seo report sub-command routes here; the SEO-scope skeleton lives in this file.
version: 1.15.0
---

# Report: any audit into a deliverable

This reference formats an existing audit into a deliverable. It does not run
agents and does not re-score. It reads the audit's output files and renders a
clean Markdown document, optionally converting it to a self-contained HTML page
(see [html-report.md](html-report.md)) or a PDF.

One formatter, two skeletons: the unified skeleton for `/nth-audit` runs, the
SEO-scope skeleton for reports built from `/nth-seo` command output. The retired `report` sub-command of `/nth-seo` is a legacy
name for this reference (see `tools/data/intents.csv`); both invocations behave
identically on the same input.

## Inputs

| Source | How to handle |
|--------|---------------|
| `SITE-AUDIT-REPORT.md` (+ `SITE-ACTION-PLAN.md`, `SITE-AUDIT.json`) | Unified skeleton. Read the JSON for machine-readable scores, verdicts and the cost ledger rather than re-deriving them from prose. |
| SEO output files (`ACTION-PLAN.md`, `/nth-seo page` or `/nth-seo audit` output) | SEO-scope skeleton. |
| `[url]` with no audit output present | Run the audit first (`/nth-audit full` or the requested scope), then format. |
| `generate` | Build the report from the current conversation's analysis. |

## From audit output to deliverable

1. Read the audit output per the Inputs table.
2. Render the overall score and the group or dimension sub-scores as gauges
   with their band label (see "Score bands" and "Score gauges").
3. Lay out the findings: by group for the unified skeleton, by dimension for
   the SEO-scope skeleton.
4. Render the consolidated action plan as a single prioritized table ordered
   Critical, High, Medium, Low, with the owning dimension on each row.
5. Save as Markdown. If HTML was requested, follow [html-report.md](html-report.md).
   If PDF was requested, see "PDF mode".

## Score bands

Apply these bands to every score. They match the bands used by the specialist
agents so the report and the agents never disagree on a label.

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

## Color coding

In Markdown tables, prefix status values with `CRIT`, `WARN` or `PASS`. Put
every `CRIT` row in the critical table of the skeleton. Do not use HTML color
spans in Markdown mode; they break in most markdown renderers.

## Unified skeleton (audit runs)

```markdown
# Site Audit Report - [Site Name]
**Date:** [YYYY-MM-DD]  **Scope:** [full | seo | defects | design | quick]  **Tool:** NullToHero /nth-audit

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
[embed the six siteasy agent sections]

## Action Plan

Group items by their `fixWith.command` (from SITE-AUDIT.json): one batch per
command, critical first. Each batch names the command to run and the reference
it loads; agent-level findings without a `fixWith` join the batch whose command
owns their dimension.
| # | Priority | Issue | Dimension | Fix |
|---|----------|-------|-----------|-----|
| 1 | Critical | ... | ... | ... |

## Cost ledger
[agents launched, approximate tokens, elapsed — from SITE-AUDIT.json cost or the report's Cost ledger table]

## Appendix: Methodology
```

The appendix lists the 15 specialist sub-agents the audit can dispatch, grouped
by dimension:

- Search Visibility: seo-agent-technical, seo-agent-content, seo-agent-schema, seo-agent-performance, seo-agent-geo
- Front-end Defects: inspect-agent-a11y, inspect-agent-interaction, inspect-agent-layout, inspect-agent-code
- Design Quality: siteasy-agent-ux, siteasy-agent-visual, siteasy-agent-motion, siteasy-agent-content, siteasy-agent-claims, siteasy-agent-memorability

Note the scope when a run mode covered only one group, and note any partial
coverage carried over from the audit (see "Error handling" in [full.md](full.md)).

## SEO-scope skeleton (seo command output)

```markdown
# SEO Report — [Site Name]
**Date:** [YYYY-MM-DD]  **Analyst:** NullToHero /nth-seo  **Version:** 1.0

## Executive Summary
[2-3 sentences. Overall health, single biggest opportunity, single biggest risk.]
Overall score: [GAUGE]

## Dimension Scores
| Dimension | Score | Trend |
|-----------|-------|-------|
| Technical | XX/100 | ... |
| Content | XX/100 | ... |
| Schema | XX/100 | ... |
| GEO | XX/100 | ... |
| Performance | XX/100 | ... |
| Images | XX/100 | ... |
| Local | XX/100 (if applicable) | ... |

## Critical Issues (fix within 48h)
| # | Issue | Dimension | Impact | Fix |
|---|-------|-----------|--------|-----|

## Action Plan
### Quick Wins (< 1 hour)
### 1-Week Fixes
### 1-Month Projects
### Backlog

## Detailed Findings
[one section per sub-agent or per command run]

## About This Report
Generated by NullToHero · [github.com/MariusYvard/NullToHero](https://github.com/MariusYvard/NullToHero) · Apache 2.0
```

## PDF mode

When the user requests PDF output (e.g. "export as PDF", "make a PDF", "save as
PDF"):

1. Generate the full Markdown report first, with the file name from "File naming".
2. Inform the user: "Your Markdown report is ready. To convert to PDF, I'll use
   the Cowork PDF skill."
3. Invoke the `pdf` skill with the generated markdown file as input.
4. The PDF skill renders it with proper formatting.

If the `pdf` skill is not available, deliver the Markdown report and note: "PDF
export requires the Cowork PDF skill. Your report is available as Markdown."

## File naming

| Scope | Format | Filename |
|-------|--------|----------|
| Unified | Markdown | `SITE-AUDIT-REPORT-[domain]-[YYYY-MM-DD].md` |
| Unified | PDF | `SITE-AUDIT-REPORT-[domain]-[YYYY-MM-DD].pdf` |
| SEO | Markdown | `SEO-REPORT-[domain]-[YYYY-MM-DD].md` |
| SEO | PDF | `SEO-REPORT-[domain]-[YYYY-MM-DD].pdf` |
| Action plan only | Markdown | `ACTION-PLAN-[domain]-[YYYY-MM-DD].md` |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Produce the audit this file formats | `/nth-audit full [url]` ([full.md](full.md)) or `/nth-seo audit [url]` |
| Self-contained HTML page | [html-report.md](html-report.md) |
| Single page report | `/nth-seo page [url]` then `/nth-audit report` |
| Drift comparison report | `/nth-seo drift [url] compare` then `/nth-audit report` |
| PDF conversion | `pdf` skill (Cowork) |
