---
name: journey-overhaul
description: "Audit-driven rework of an existing site: baseline audit, direction check, findings executed through the fix reference, compare before/after, ship."
version: 1.1.0
---

# Journey: Overhaul

The rework pipeline for a site that already exists. The audit is the entry point, [fix.md](fix.md) is the router and the executor, and the compare mode is the proof that the rework moved the score instead of the furniture.

## Stages

| # | Stage | Run | Exit criterion |
|---|-------|-----|----------------|
| 1 | Baseline | `/nth-audit full [url]` ([../../audit/references/full.md](../../audit/references/full.md)) | `SITE-AUDIT.json` + report saved as the before-state |
| 2 | Direction check | `/nth-siteasy concept` ([concept.md](concept.md)) if no `DIRECTION.md` exists and the rework is brand-level | A committed direction to rework toward, or an explicit decision to skip |
| 3 | Fix | `/nth-siteasy fix` ([fix.md](fix.md)): triage by remediation route, then per-command batches, critical first | Each batch's findings addressed or consciously deferred with a reason |
| 4 | Compare | `/nth-audit compare` before vs after ([../../audit/references/compare.md](../../audit/references/compare.md)) | No regression; the targeted deltas achieved |
| 5 | Ship | [journey-ship.md](journey-ship.md) stages 2-4 | Ship gates green |

## Rules

- The triage and execution doctrine (never fix from report prose, batches per command, severity order) lives in [fix.md](fix.md) and applies verbatim here.
- Re-audit with the SAME mode and render settings as the baseline or the compare is meaningless.
- A rework that changes direction mid-flight restarts at stage 2, not at stage 3: the direction decides the batches, not the other way around.

Checkpointing: after each stage, append the stage outcome to `LOG.md` (date, stage, decision or score, open items). A resumed journey reads `LOG.md` and continues from the last green stage instead of restarting.

## Cross-References

- Findings execution on its own: [fix.md](fix.md)
- Ship gates: [journey-ship.md](journey-ship.md)
- Starting from nothing instead: [journey-express.md](journey-express.md)
