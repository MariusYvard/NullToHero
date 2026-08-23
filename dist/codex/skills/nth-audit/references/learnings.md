---
name: learnings
description: "The feedback loop from real audits back into the plugin's data: structured LEARNINGS.md candidates, then a review pass that turns accepted ones into rules, gates, laws or fixtures."
version: 1.0.0
---

# Learnings: from audits back into the data

Every real audit produces knowledge the plugin should keep: a false positive is a
candidate gate for a check, a recurring uncovered pattern is a candidate rule, a
threshold that proved wrong in practice is a candidate law change. This reference
defines the capture format and the review pass that closes the loop.

## Capture (during any audit or detect run)

When a finding is judged wrong, noisy or missing, append a candidate to
`LEARNINGS.md` at the audited project's root — never edit the plugin on the spot:

```
## 2026-07-12 · <target> · <mode>
- kind: false-positive | uncovered-pattern | threshold-drift
- where: <check id, rule id or agent dimension>
- evidence: <one factual sentence, with the offending markup or value>
- candidate: <the gate, rule, law change or fixture this suggests>
```

Rules of capture: evidence is a fact from the audited page, not an opinion; one
entry per root cause; never auto-apply anything.

## Review pass (`/nth-audit learnings`)

1. Read `LEARNINGS.md`, group entries by `where`, drop duplicates.
2. For each group, decide: accept, reject (say why in place), or needs-more-evidence
   (leave, annotate). Two independent occurrences are the bar for accepting an
   uncovered-pattern.
3. Route accepted candidates to their surface:
   - false positive on a deterministic check: a gate in `tools/audit/lib/checks.mjs`
     plus a fixture reproducing the false positive (label the correct verdict).
   - uncovered pattern: a row in `tools/data/inspect-rules.csv` (id, why, source),
     its remediation row in `tools/data/remediation-map.csv`, and — when statically
     detectable — a check with positive and negative fixtures.
   - threshold drift: change the law in `tools/data/laws.csv` and follow its
     citations (check 37 lists them by failing).
4. Discipline: `node tests/validate.js` and `node tools/audit/eval.mjs --update &&
   node tools/audit/eval.mjs --strict` green before commit; counts guards (checks 35
   and 37) updated in the same commit; the CHANGELOG entry names the learnings applied.
5. Mark applied entries in `LEARNINGS.md` with `-> applied in <version>` so the file
   stays an honest ledger.

## Cross-References

- Check engine and gates: [checks.md](checks.md)
- Rule data consumed by `/nth-audit checks`: [checks.md](checks.md)
- Report structure the findings come from: [report.md](report.md)
