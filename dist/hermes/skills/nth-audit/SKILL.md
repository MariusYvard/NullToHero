---
name: nth-audit
description: "Run one whole-site audit that merges search visibility, front-end defects and design quality into a single scored report with a prioritized action plan. Dispatches fifteen specialist sub-agents over a shared fetch, on top of a deterministic pre-pass. Use for 'audit my whole site' or 'review my site end to end'."
license: Apache-2.0
compatibility: Requires Node.js 20+ and Python 3 for the deterministic tools, plus network access for page fetches. NTH_ROOT must point at the NullToHero checkout.
metadata:
  version: "4.0.0"
  host: hermes
  source-skill: audit
  short-description: "Run one whole-site audit that merges search visibility, front-end defects and design quality into a single scored report with a prioritized action plan. Dispatches fifteen specialist sub-agents over a shared fetch, on top of a deterministic pre-pass. Use for 'audit my whole site' or 'review my site end to end'."
  argument-hint: "[url] | full [url] [seo|defects|design|quick] | [verify|checks] [url] | review [target] | [report|learnings] [file] | compare [A] [B]"
---
<!-- Generated for Hermes Agent from null-to-hero/skills/audit/.
     Do not edit here. Edit the source and run tools/build-dist.mjs. -->

## Host notes

Invoke this skill with the `nth-audit` skill (say what you want and Hermes picks it, or load it explicitly with `skill_view`). Its commands are written `/nth-audit <command>` below.

`${NTH_ROOT}` is the absolute path of the NullToHero checkout, substituted at install time. If a command still shows the literal token, the install did not run; export `NTH_ROOT` and run it again.

Tools named below are this host's: read a file (`read_file`), read a media file (`vision_analyze`), write a file (`write_file`), edit a file (`patch`), match paths by pattern (`search_files`), search file contents (`search_files`), fetch a URL (`web_extract`), search the web (`web_search`), run a shell command (`terminal`), ask the user a clarifying question (`clarify`), delegate to a sub-agent (`delegate_task`).

This package carries skills and no separate sub-agent files: there is no Hermes equivalent of a named sub-agent directory. Where the text below asks for delegation, use the delegate_task tool: one call, one task per sub-agent in the same tasks array, so they run as real parallel sub-agents in isolated contexts — the same capability the text describes, reached a different way. The 15 audit sub-agents this skill can delegate to are themselves installed as Agent Skills (see hermes-agent/ in the repository) rather than resolved by name from a directory; delegate_task takes a free-text goal per task, not a named agent type, so describe each sub-agent's job in the goal instead of naming it.

Complete-audit toolkit for websites. One pass that orchestrates the plugin's three other skills (/nth-seo, /inspect, /nth-siteasy), dispatches all 15 specialist sub-agents across search visibility, front-end defects, and design quality, then merges their scored sections into a single Site Health Score with a prioritized action plan. The audit skill owns no detection logic of its own. It schedules the existing sub-agents, shares one fetch across them, and consolidates the results.

## Commands

| Command | What it does | Reference |
|---------|-------------|-----------|
| `full [url] [scope]` | All 15 sub-agents across SEO, defects, and design; unified report + action plan. Optional scope runs one group: `seo` (5 SEO sub-agents), `defects` (4 inspect), `design` (6 siteasy), `quick` (one per group for a fast triage) | [references/full.md](references/full.md) + [references/refine.md](references/refine.md) |
| `checks [url]` | Deterministic pre-pass only: the computed checks and the 48 rules of the rules engine, plus `SITE-AUDIT.json`, no sub-agents | [references/checks.md](references/checks.md) + [references/rules-engine.md](references/rules-engine.md) |
| `review [target]` | Design engineering code review of a file or a paste: motion crimes, accessibility violations, forbidden patterns, a Before/After table with a score, plus code robustness across security, performance and correctness | [references/review.md](references/review.md) + [references/code-quality.md](references/code-quality.md) |
| `verify [url]` | Consensus re-check: re-runs the gating dimensions (a11y, interaction, technical) K times and reconciles them by majority vote | [references/full.md](references/full.md) |
| `compare [A] [B]` | Diff two targets (before/after a site, or A vs B): per-check verdict changes and score deltas | [references/compare.md](references/compare.md) |
| `learnings [file]` | Review LEARNINGS.md candidates accumulated by real audits and turn accepted ones into rules, gates, laws or fixtures | [references/learnings.md](references/learnings.md) |
| `report [file]` | Format an existing audit into a client-ready report, a self-contained HTML page, or PDF | [references/report.md](references/report.md) + [references/html-report.md](references/html-report.md) |

Six commands, six references. The agent run scopes (`full` and its group scopes `seo`, `defects`, `design`, `quick`) share the orchestration playbook in [references/full.md](references/full.md) and differ only in which agent group is dispatched; the legacy first-token form (`/nth-audit seo [url]`) remains accepted and routes to `full` with that scope. `verify` additionally re-runs the gating dimensions and reconciles them by majority vote. `checks` runs the deterministic pre-pass with no sub-agents and is documented in [references/checks.md](references/checks.md); it is also the ground-truth layer the agent modes consume in their fetch phase. `compare` diffs two targets ([references/compare.md](references/compare.md)) and `report` formats an already-produced audit ([references/report.md](references/report.md)).

## How to run a command

When the user invokes a command:
1. Read the matching reference file with the read_file tool (`full.md` for the agent run modes, `checks.md` for the deterministic pre-pass, `compare.md` for compare, `report.md` for formatting).
2. Follow the instructions in that reference exactly. Do not improvise scoring weights or skip a dimension.
3. If no command is specified:
   - With a URL, the bare invocation runs `full` against that URL.
   - A bare scope token (`seo`, `defects`, `design`, `quick`) as the first argument runs `full` with that scope; legacy names in `tools/data/intents.csv` route to their canonical command.
   - With no URL, ask the user for the site URL before dispatching any agent.

## Relationship to the other skills

The three audit groups map one-to-one onto the plugin's three other skills and reuse their sub-agents directly. There is a single source of truth per dimension and no duplicated detection logic. The audit skill changes only the scheduling (parallel, shared fetch) and the consolidation (one merged report).

| Group | Backing skill | Sub-agents reused |
|-------|---------------|-------------------|
| Search visibility | /nth-seo (see /nth-seo audit) | seo-agent-technical, seo-agent-content, seo-agent-schema, seo-agent-performance, seo-agent-geo |
| Front-end defects | /inspect (detect, review) | inspect-agent-a11y, inspect-agent-interaction, inspect-agent-layout, inspect-agent-code |
| Design quality | /nth-siteasy (see /nth-siteasy audit) | siteasy-agent-ux, siteasy-agent-visual, siteasy-agent-motion, siteasy-agent-content, siteasy-agent-claims, siteasy-agent-memorability |

Because the agents are shared, a fix surfaced here can be re-run or deepened with the owning skill (for example /nth-seo technical for a flagged crawl issue, or /nth-siteasy clarify for flagged copy) without re-auditing the whole site.

## Output

Each agent run mode produces two markdown files (see [references/full.md](references/full.md) for the templates) plus a machine-readable `SITE-AUDIT.json`:

- `SITE-AUDIT-REPORT.md` holds the full findings for every group that ran, with each agent's returned section embedded verbatim.
- `SITE-ACTION-PLAN.md` holds the consolidated, de-duplicated fix list ordered Critical, High, Medium, Low.
- `SITE-AUDIT.json` holds the machine-readable result (scores plus per-check verdicts plus a cost ledger) that powers `compare`, CI gating and score-over-time. The `checks` mode writes only this file. Schema: `tools/audit/schema/site-audit.schema.json`.

The overall Site Health Score weights Search Visibility at 35 percent, Front-end Defects at 35 percent, and Design Quality at 30 percent. Any critical accessibility or interaction defect caps the Defects group regardless of other passes. The exact weights and the cap rule live in [references/full.md](references/full.md).

## When NOT to use

| Situation | Use instead |
|-----------|-------------|
| You only need search visibility | /nth-seo audit |
| You only need the deterministic scan, no sub-agents | /nth-audit checks |
| You want to see the page in a browser | /nth-siteasy preview |
| You only need subjective design and UX review | /nth-siteasy audit |
| You want to build, fix, or redesign the interface | /nth-siteasy build |

A single-dimension request does not need all 15 agents. Routing it to the one owning skill is faster and cheaper. The audit skill is for the whole-site, cross-dimension pass.

## Canonical thresholds

L-DATA-2 in `tools/data/laws.csv` governs when this skill refuses to produce a number:
a dimension with fewer than half its inputs available reports insufficient data instead
of a score, and two such dimensions suppress the overall score. See
[references/full.md](references/full.md).
