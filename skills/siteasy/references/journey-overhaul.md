---
name: journey-overhaul
description: "Audit-driven rework of an existing site: baseline audit, triage by remediation route, execute command by command, compare before/after."
version: 1.0.0
---

# Journey: Overhaul

The rework pipeline for a site that already exists. The audit is the entry point, the remediation map is the router, and the compare mode is the proof that the rework moved the score instead of the furniture.

## Stages

| # | Stage | Run | Exit criterion |
|---|-------|-----|----------------|
| 1 | Baseline | `/audit full [url]` ([../../audit/references/full.md](../../audit/references/full.md)) | `SITE-AUDIT.json` + report saved as the before-state |
| 2 | Direction check | `/siteasy concept` ([concept.md](concept.md)) if no `DIRECTION.md` exists and the rework is brand-level | A committed direction to rework toward, or an explicit decision to skip |
| 3 | Triage | Group findings by their `fixWith` route (each check carries one in `SITE-AUDIT.json`; rules map via `tools/data/remediation-map.csv`) | An ordered plan: critical first, then per-command batches, quick wins flagged |
| 4 | Execute | Run each mapped command with its reference loaded, one batch at a time | Each batch's findings addressed or consciously deferred with a reason |
| 5 | Compare | `/audit compare` before vs after ([../../audit/references/compare.md](../../audit/references/compare.md)) | No regression; the targeted deltas achieved |
| 6 | Ship | [journey-ship.md](journey-ship.md) stages 2-4 | Ship gates green |

## Rules

- Never fix findings ad hoc from the report prose: always through the mapped command, so the right reference is loaded and the fix follows the plugin's own doctrine.
- Batches are per command, not per page: one `/siteasy animate` pass fixes all motion findings at once.
- Re-audit with the SAME mode and render settings as the baseline or the compare is meaningless.

## Cross-References

- Ship gates: [journey-ship.md](journey-ship.md)
- Starting from nothing instead: [journey-express.md](journey-express.md)
