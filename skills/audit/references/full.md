---
name: audit-full
description: >
  Complete whole-site audit orchestration. Resolves the target and mode, fetches
  the homepage and key pages once, dispatches the chosen group of specialist
  sub-agents in parallel, aggregates their scored sections into a single Site
  Health Score, and writes a unified report plus a prioritized action plan.
  Backs the full, seo, defects, design, and quick run modes of /audit.
version: 1.9.0
---

# Complete Site Audit

This is the orchestration playbook for every run mode of /audit (`full`, `seo`,
`defects`, `design`, `quick`). It schedules the plugin's existing specialist
sub-agents, shares one fetch across them, and consolidates their output. It adds
no new detection logic. Each dimension is owned by one backing skill (/seo,
/inspect, /siteasy) and is the single source of truth for that dimension.

## Process

1. **Resolve target and mode.** Determine the URL and which run mode was
   requested. A bare URL with no mode keyword runs `full`. No URL means ask the
   user for the site URL before continuing.
2. **Shared fetch phase.** Fetch the content ONCE here, not inside each agent.
   Retrieve the homepage and up to N key pages (default N is 5: homepage plus the
   most linked internal pages) via WebFetch or Bash, plus `/robots.txt` and the
   XML sitemap. Keep the raw HTML of each fetched page in memory. Pass that HTML
   to every dispatched agent so no agent re-fetches the same URL. This is the
   main token and latency saving of the audit skill: one network pass feeds all
   13 agents.
3. **Dispatch the group in parallel.** For the selected mode, launch every agent
   in that group with the Task tool, one `Task` call per agent, all in a single
   message, so they run concurrently. See "Parallel dispatch" below.
4. **Collect scored sections.** Each agent returns a markdown section that
   includes its own score (0-100) and its findings. Wait for all agents in the
   group to return before aggregating.
5. **Aggregate.** Compute the three group sub-scores, then the overall Site
   Health Score, using the weights in "Scoring" below. Apply the defect severity
   cap.
6. **Write outputs.** Produce `SITE-AUDIT-REPORT.md` and `ACTION-PLAN.md` (see
   "Output files" and "Report structure"). For client formatting or PDF, defer to
   [report.md](report.md).

## Modes

Each mode dispatches a fixed set of `subagent_type` names. `full` runs all 13.

| Mode | Agents dispatched (`subagent_type`) |
|------|-------------------------------------|
| `full` | seo-agent-technical, seo-agent-content, seo-agent-schema, seo-agent-performance, seo-agent-geo, inspect-agent-a11y, inspect-agent-interaction, inspect-agent-layout, inspect-agent-code, siteasy-agent-ux, siteasy-agent-visual, siteasy-agent-motion, siteasy-agent-content |
| `seo` | seo-agent-technical, seo-agent-content, seo-agent-schema, seo-agent-performance, seo-agent-geo |
| `defects` | inspect-agent-a11y, inspect-agent-interaction, inspect-agent-layout, inspect-agent-code |
| `design` | siteasy-agent-ux, siteasy-agent-visual, siteasy-agent-motion, siteasy-agent-content |
| `quick` | seo-agent-technical, inspect-agent-a11y, siteasy-agent-ux (one representative per group) |

For `seo`, `defects`, and `design`, only that group's sub-score is reported and
no overall blend is computed. For `full` and `quick`, all groups present are
blended into the overall Site Health Score.

## Parallel dispatch

Launch all agents for the selected mode with the Task tool in ONE message, one
`Task` call per agent, so the harness runs them concurrently rather than one
after another. Pass each agent the same object: `{ url, fetched HTML for the
relevant pages, optional file path }`. The fetched HTML comes from the shared
fetch phase so no agent issues a duplicate request.

If the Task tool or the plugin's sub-agents are unavailable in the current
harness, FALL BACK to running each agent's checklist inline, in sequence, using
the same scoring weights and the same severity cap defined here. Never skip a
dimension silently. If a dimension cannot run at all, record it as partial
coverage in the report (see "Error handling") rather than omitting it.

## Scoring

Each agent returns a 0-100 score. Group sub-scores are the weighted, normalized
mean of the agent scores in that group. The weights inside each group sum to 100.

Search Visibility (SEO group):

| Agent | Weight |
|-------|--------|
| seo-agent-technical | 25 |
| seo-agent-content | 25 |
| seo-agent-performance | 20 |
| seo-agent-schema | 15 |
| seo-agent-geo | 15 |

Front-end Defects (inspect group):

| Agent | Weight |
|-------|--------|
| inspect-agent-a11y | 30 |
| inspect-agent-interaction | 25 |
| inspect-agent-layout | 25 |
| inspect-agent-code | 20 |

Design Quality (siteasy group):

| Agent | Weight |
|-------|--------|
| siteasy-agent-ux | 30 |
| siteasy-agent-visual | 25 |
| siteasy-agent-content | 25 |
| siteasy-agent-motion | 20 |

Overall Site Health Score, stated explicitly:

```
Site Health Score = (SEO sub-score   x 0.35)
                  + (Defects sub-score x 0.35)
                  + (Design sub-score  x 0.30)
```

Severity cap (state and apply): defect findings are severity-capped. Any CRITICAL
accessibility defect (from inspect-agent-a11y) or any CRITICAL interaction defect
(from inspect-agent-interaction) caps the Defects group sub-score at the top of
the "Needs work" band (a maximum of 69), regardless of how the other defect
agents scored. The cap is applied to the group sub-score before the overall blend
so a critical defect cannot be hidden by passing layout or code checks.

## Output files

| File | Contents |
|------|----------|
| `SITE-AUDIT-REPORT.md` | Full findings for every group that ran, each agent's returned section embedded verbatim, plus the executive summary and scores. |
| `ACTION-PLAN.md` | Consolidated, de-duplicated fix list ordered Critical, High, Medium, Low, with the owning dimension noted on each row. |

For converting `SITE-AUDIT-REPORT.md` into a client-ready Markdown deliverable or
a PDF, defer to [report.md](report.md). Do not re-implement formatting here.

## Report structure

`SITE-AUDIT-REPORT.md` follows this order:

1. **Executive summary.** Overall Site Health Score, the three group sub-scores
   (Search Visibility, Front-end Defects, Design Quality), the top 5 critical
   issues across all groups, and the top 5 quick wins across all groups.
2. **Search Visibility.** Embed the returned sections from seo-agent-technical,
   seo-agent-content, seo-agent-schema, seo-agent-performance, and seo-agent-geo.
3. **Front-end Defects.** Embed the returned sections from inspect-agent-a11y,
   inspect-agent-interaction, inspect-agent-layout, and inspect-agent-code.
4. **Design Quality.** Embed the returned sections from siteasy-agent-ux,
   siteasy-agent-visual, siteasy-agent-motion, and siteasy-agent-content.
5. **Consolidated action plan.** A single cross-cutting list that de-duplicates
   overlaps between groups. The same root cause is reported once, cross-referenced
   to every dimension that surfaced it. For example an image missing explicit
   width and height attributes appears as a layout CLS defect (inspect-agent-layout)
   and as a performance signal (seo-agent-performance); list it once and note both
   dimensions rather than counting it twice.

## Priority definitions

| Priority | Meaning | Fix-time guidance |
|----------|---------|-------------------|
| Critical | Blocks indexing, breaks accessibility, or stops a core task | Fix immediately (within 48 hours) |
| High | Materially hurts rankings, usability, or perceived quality | Fix within 1 week |
| Medium | Optimization opportunity with clear benefit | Fix within 1 month |
| Low | Minor or cosmetic, safe to defer | Backlog |

## Error handling

| Scenario | Action |
|----------|--------|
| URL unreachable | Report the error. Do not guess site content. Suggest verifying the URL. |
| robots.txt blocks the crawl | Audit only the accessible pages, note the limitation in the report. |
| Rate limiting (429) | Back off, reduce concurrency, report partial results. |
| Timeout during fetch | Cap at the timeout, report findings for the pages that were retrieved. |
| An agent returns no result | Note partial coverage for that dimension. Never fabricate a score or findings for an agent that did not return. |

## Cross-skill references

| Need | Where |
|------|-------|
| Deep search-visibility audit | /seo audit |
| Deterministic front-end defect scan | /inspect detect |
| Design engineering code review | /inspect review |
| Subjective design and UX review | /siteasy audit |
| Format this audit into a report or PDF | /audit report (see [report.md](report.md)) |
