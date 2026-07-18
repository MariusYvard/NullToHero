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
| 1 | Triage | Group findings by their `fixWith` route (each check carries one in `SITE-AUDIT.json`; rules map via `tools/data/remediation-map.csv`) | An ordered plan: critical first, then per-command batches, quick wins flagged |
| 2 | Execute | Run each mapped command with its reference loaded, one batch at a time | Each batch's findings addressed or consciously deferred with a reason |
| 3 | Verify | Re-run `/audit checks` with the SAME settings as the source audit | No regression; the targeted findings resolved |

## Rules

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
