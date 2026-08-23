---
name: journey-ship
description: "Orchestrated finish-and-ship pipeline: polish, defect scan, deterministic audit, hardening, final audit. Chains existing commands around the shared project state."
version: 1.0.0
---

# Journey: Ship

The pipeline that takes a built feature or site from "works" to "shipped". It creates nothing new: it chains existing commands in a fixed order, passes state through the shared project files (`PRODUCT.md`, `DESIGN.md`, `DIRECTION.md`, `SITE-AUDIT.json`), and refuses to advance past a failed gate.

## Stages

| # | Stage | Run | Exit criterion |
|---|-------|-----|----------------|
| 1 | Polish | `/siteasy polish` ([polish.md](polish.md)) | No open build TODOs; states and edge cases covered |
| 2 | Defect scan | `/audit checks` ([../../audit/references/checks.md](../../audit/references/checks.md)) | Zero CRITICAL and zero HIGH findings |
| 3 | Deterministic audit | `/audit checks` ([../../audit/references/checks.md](../../audit/references/checks.md)) | Floor >= 80, no critical FAIL; every FAIL routed through its remediation entry (`tools/data/remediation-map.csv`) and fixed |
| 4 | Hardening | `/siteasy harden` ([harden.md](harden.md), [optimize.md](optimize.md), [ship-checklist.md](ship-checklist.md)) | Ship checklist clean, Core Web Vitals within budget; changed URLs pinged via [/seo indexnow](../../seo/references/indexnow.md) on content and brand sites |
| 5 | Full audit (brand register only) | `/audit full` ([../../audit/references/full.md](../../audit/references/full.md)) | Band Good or better; memorability not the weakest dimension |

## Rules

- `DIRECTION.md` decides the register-dependent gates: a product UI may skip stage 5, a brand page may not.
- A FAIL at any stage routes to the mapped command from the remediation map, gets fixed there, then the SAME stage re-runs. Never advance with an open CRITICAL.
- Each stage reads the shared state fresh; nothing is carried in conversation memory.
- Save `SITE-AUDIT.json` from stage 3; stage 5 and any later `/audit compare` use it as the baseline.

Checkpointing: after each stage, append the stage outcome to `LOG.md` (date, stage, decision or score, open items). A resumed journey reads `LOG.md` and continues from the last green stage instead of restarting.

## Cross-References

- Whole-site rework instead of a ship pass: [journey-overhaul.md](journey-overhaul.md)
- Zero-to-landing: [journey-express.md](journey-express.md)
- Manual equivalent of stage 4: [ship-checklist.md](ship-checklist.md)
