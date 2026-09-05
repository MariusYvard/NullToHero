---
name: journey-express
description: "Zero-to-landing pipeline: setup, concept, tokens, plan, build, motion, checks, launch. One signature moment, budgeted loops, gates between every step."
version: 1.0.0
---

# Journey: Express

The zero-to-landing pipeline. Eight stages, each an existing command, each writing or reading the shared project state so the landing that comes out is one designed object rather than eight stitched outputs.

## Stages

| # | Stage | Run | Exit criterion |
|---|-------|-----|----------------|
| 1 | Setup | `/nth-siteasy setup` ([teach.md](teach.md)) | `PRODUCT.md` real (no placeholders) |
| 2 | Direction | `/nth-siteasy concept` ([concept.md](concept.md)) | `DIRECTION.md` committed: one idea, one anti-reference, one signature moment |
| 3 | Tokens | `/nth-siteasy tokens` ([tokens.md](tokens.md)) | Two-layer token system aligned with the direction; no factory gradients |
| 4 | Shape | `/nth-siteasy shape` ([shape.md](shape.md), [landing-patterns.md](landing-patterns.md)) | Shape brief confirmed by the user |
| 5 | Build | `/nth-siteasy build` ([craft.md](craft.md)) | Landing built to the production bar, direction honored |
| 6 | Motion | `/nth-siteasy animate` ([animate.md](animate.md)) | The ONE signature moment from `DIRECTION.md`, decorative loops <= 2, reduced-motion guarded |
| 7 | Checks | `/nth-audit checks` | Zero CRITICAL/HIGH; deterministic floor >= 80 |
| 8 | Harden | `/nth-siteasy harden` ([ship-checklist.md](ship-checklist.md)) | Checklist clean, media within budget (video <= 10 MB) |

## Rules

- Stage 2 is not skippable: an express landing without a committed direction is a template with the plugin's fingerprints.
- Stage 6 implements the signature moment DECLARED in stage 2, never a new one invented mid-build; changing it means going back to stage 2.
- Budgets from the motion references apply as gates, not advice: loops, media weight, one wow.
- A stage-7 FAIL routes through the remediation map, fixes, re-runs stage 7.

Checkpointing: after each stage, append the stage outcome to `LOG.md` (date, stage, decision or score, open items). A resumed journey reads `LOG.md` and continues from the last green stage instead of restarting.

## Cross-References

- Shipping an existing build: [journey-ship.md](journey-ship.md)
- Reworking an existing site: [journey-overhaul.md](journey-overhaul.md)
