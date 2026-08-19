---
name: audit-compare
version: 1.14.0
description: >
  Two-target comparison for /nth-audit. Audits target A and target B with the same
  specialist group, then diffs them check by check: which verdicts regressed,
  which improved and the resulting score deltas. Backs the compare run mode.
  Use for before/after the same site (regression detection) or site A against
  site B (competitive benchmark).
---

# Audit Compare

Diff two audits. `compare` runs the standard per-target audit on A and on B, then
reports the difference: per-check verdict changes, per-agent and per-group score
deltas and a single overall delta. It adds no new detection logic. Each target is
audited with the playbook in [full.md](full.md); this reference owns only the
alignment and the diff.

## Why the diff is trustworthy

Since 1.12.0 every agent score is a deterministic function of its check verdicts
(start 100, minus 15 per FAIL, minus 7 per WARN, floored, critical-FAIL capped at
49). Equal verdicts give equal scores, so a non-zero delta reflects a real
difference between A and B, not run-to-run scoring jitter. Without that property a
comparison would mostly measure noise. The residual is verdict flips, which the
diff exposes one by one rather than hiding inside a number.

## Structural diff (preferred)

When both targets have a `SITE-AUDIT.json` (the pre-pass writes one for every run,
including `checks`), diff them structurally instead of re-parsing markdown:

```bash
node ${NTH_ROOT}/tools/audit/compare.mjs A.json B.json --md
```

The helper aligns checks by `agent::id`, classifies each pair as improvement,
regression, unchanged or coverage change, attaches the rubric point impact and
computes the per-group and overall deltas as B minus A. It reads structured fields,
so it does not depend on report formatting and cannot be thrown off by a reworded
table. Use this for before/after of the same site (regression detection) and for
A versus B (benchmark). When a target has no JSON, fall back to reading the verdict
tables from its `SITE-AUDIT-REPORT.md` and align them the same way by hand.

## Inputs

- `A` and `B`. Each is a URL, a local HTML file, a saved `SITE-AUDIT.json` or a
  saved `SITE-AUDIT-REPORT.md`. A saved result is read instead of being re-audited,
  which is the cheap way to compare today against a kept baseline. Prefer
  `SITE-AUDIT.json`: it diffs structurally (see below) rather than by re-parsing
  markdown tables, so a layout change in the report cannot corrupt the diff.
- Optional group: `full` (default), `seo`, `defects`, `design` or `quick`. The
  group is applied identically to both targets so the check sets line up.

## Process

1. Resolve A, B and the group. With one target only, stop and ask for the second.
2. Audit each target with the [full.md](full.md) playbook for the chosen group:
   one shared fetch per target, parallel dispatch, deterministic rubric scores.
   When a target is a saved `SITE-AUDIT-REPORT.md`, read its embedded verdict
   tables rather than dispatching agents for it.
3. Align checks. Both targets run the same agents, so the check rows match one to
   one. Pair the A verdict and the B verdict for every check of every agent that
   ran on both.
4. Classify each paired check by direction, ordering the verdicts PASS (best),
   WARN, FAIL (worst):
   - Improvement: B is better than A (FAIL to WARN, WARN to PASS, FAIL to PASS).
   - Regression: B is worse than A (PASS to WARN, WARN to FAIL, PASS to FAIL).
   - Unchanged: same verdict on both.
5. Attach the rubric impact to each change so the score delta is explained, not
   asserted. A PASS to FAIL costs that agent 15 points, WARN to FAIL costs 8, PASS
   to WARN costs 7; improvements are the same magnitudes with the opposite sign.
6. Compute deltas as B minus A: per agent, per group and the overall Site Health
   Score. Report a positive delta as an improvement and a negative one as a
   regression.
7. Flag cap changes. If a critical accessibility or interaction check is FAIL on
   one target but not the other, state that the severity cap binds on one side
   only; this can move the group delta more than the raw checks suggest.

## Parallel dispatch

The two targets are independent, so their agent groups can run in the same
parallel batch. Launch every agent for A and every agent for B with the spawn_agent tool
in one message. A `full` compare dispatches 26 agents (13 per target). When a
target is a saved report, only the other target is dispatched.

## Output

Write `SITE-AUDIT-COMPARE.md` with this order:

1. Header. The two targets, the group used, the date and whether either side was
   a saved baseline.
2. Verdict. The overall Site Health Score for A, for B, and B minus A, stated as
   improvement or regression. For two different sites, label it a benchmark and
   add the caveat below.
3. Score deltas table.

```
| Dimension | A | B | Delta |
|-----------|---|---|-------|
| Overall Site Health | XX | YY | +/-Z |
| Search Visibility | .. | .. | .. |
| Front-end Defects | .. | .. | .. |
| Design Quality | .. | .. | .. |
| (then one row per agent that ran) | | | |
```

4. Regressions. Every check that went from a better verdict to a worse one, with
   its agent, the verdict change and the point impact. Order by impact, critical
   checks first. This is the section that matters most for a before/after.
5. Improvements. Every check that got better, same format.
6. Unchanged. A count per agent, not a full list.
7. Cap changes. Any severity-cap bind or release between the two targets.

## Cross-site caveat

Before and after the same site is the strong use: the targets share intent, so the
delta is a clean regression or improvement signal. Two different sites do not share
intent or content, so an absolute score gap measures build quality, not who is
"better" at their own job. State this in the report when A and B are different
sites and lead with the per-check diff rather than the headline number.

## Cost

`full` compare is about twice the cost of a single `full` audit, 13 agents per
target. Use a saved baseline for one side or a lighter group to cut it. State
the agent count and the token multiplier in the report so the user can weigh it.

## Cross-skill references

| Need | Where |
|------|-------|
| Audit one target | /nth-audit full (see [full.md](full.md)) |
| Higher-confidence single audit | /nth-audit verify (see [full.md](full.md)) |
| Format the comparison as a client report or PDF | /nth-audit report (see [report.md](report.md)) |
