---
name: fix
description: "Execute the findings of a deterministic or full audit: read SITE-AUDIT.json or SITE-ACTION-PLAN.md, group findings by their fixWith remediation route, run the mapped commands in severity order, verify with a re-run of the checks. The execution half of an overhaul, callable on its own."
version: 1.0.0
---

# Fix: execute audit findings by remediation route

The door for "the audit found problems, now make them go away". This reference
turns an audit result into batched, doctrine-backed work. It never fixes from
report prose: every fix goes through the command mapped to the finding, so the
right reference is loaded and the fix follows the plugin's own rules.

[journey-overhaul.md](journey-overhaul.md) calls this reference as its triage
and execute stages. Run it standalone whenever an audit result exists and the
user wants the findings addressed without the full rework pipeline.

## Inputs

| Input state | What to do |
|-------------|------------|
| `SITE-AUDIT.json` present | Use it. Each failed check carries a `fixWith` route (command + reference). |
| Only `SITE-ACTION-PLAN.md` or `SITE-AUDIT-REPORT.md` present | Read the plan; map each finding to its route via `tools/data/remediation-map.csv`. |
| No audit output at all | Run `/audit checks [target]` first ([../../audit/references/checks.md](../../audit/references/checks.md)), then proceed. |

## Stages

| # | Stage | Run | Exit criterion |
|---|-------|-----|----------------|
| 1 | Conventions | Read the project's own conventions: charter or style guide at the root or in `docs/` (STYLEGUIDE, STYLE, CONVENTIONS, CONTRIBUTING, BRAND, DESIGN, `.editorconfig`), the CSS custom properties already defined, the class naming convention visible in the code (BEM, utility classes, CSS modules), the fonts already loaded and used | The binding conventions are known before any batch edits a file |
| 2 | Triage | Group findings by their `fixWith` route (each check carries one in `SITE-AUDIT.json`; rules map via `tools/data/remediation-map.csv`) | An ordered plan: critical first, then per-command batches, quick wins flagged |
| 3 | Execute | Run each mapped command with its reference loaded, one batch at a time | Each batch's findings addressed or consciously deferred with a reason |
| 4 | Verify | Re-run `/audit checks` with the SAME settings as the source audit | No regression; the targeted findings resolved |

## Rules

- Project conventions are binding and outrank every generic recommendation in
  the references a batch loads. When a reference recommends what the project's
  charter forbids, the charter wins: report the conflict to the user instead of
  settling it silently. Never rename an existing token, never add a web font to
  a project that uses none, and never add motion to a project that has none,
  without asking first.
- Never fix findings ad hoc from the report prose: always through the mapped
  command, so the right reference is loaded and the fix follows the plugin's
  own doctrine.
- Batches are per command, not per page: one `/siteasy animate` pass fixes all
  motion findings at once.
- Severity order is absolute: every critical batch completes before the first
  high batch starts. Quick wins may ride along inside their command's batch,
  never as a separate ad hoc pass.
- A finding without a mapped route goes to the command that owns its dimension
  (agent-level findings name their dimension); if none exists, surface it to
  the user instead of improvising.
- Deferrals are decisions: each one is written down with its reason, not
  silently skipped.
- Verification uses the same mode and render settings as the source audit or
  the comparison is meaningless.

## Checkpointing

After each stage, append the outcome to `LOG.md` (date, stage, batch or
decision, open items). A resumed fix reads `LOG.md` and continues from the last
completed batch instead of restarting the triage.

## What this is not

- Not an improvement pass: no findings, no fix. For "make it better" without
  an audit, use [improve.md](improve.md).
- Not the full rework: no baseline, no direction check, no before/after
  compare. That pipeline is [journey-overhaul.md](journey-overhaul.md), and it
  delegates its middle stages here.
- Not a re-audit: this reference consumes audit output; producing it belongs
  to `/audit` ([../../audit/references/full.md](../../audit/references/full.md)).

## Cross-References

- Full rework pipeline around this stage: [journey-overhaul.md](journey-overhaul.md)
- Deterministic pre-pass that produces `SITE-AUDIT.json`: [../../audit/references/checks.md](../../audit/references/checks.md)
- Before/after proof once fixes land: [../../audit/references/compare.md](../../audit/references/compare.md)
- Ship gates after the fixes: [journey-ship.md](journey-ship.md)
