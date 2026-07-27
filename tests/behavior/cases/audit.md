# Behavior cases: /audit

Cases that describe how the `/audit` skill should behave at its command boundaries,
when an input or an agent result is missing and when the Site Health Score is read as
something it is not. Every case is `status: simulated` until an evidence artifact is
attached. See [../README.md](../README.md) for the evidence rule.

## Command boundaries

```yaml
id: audit-full-vs-siteasy-audit
type: routing
status: simulated
target_skill: audit
scenario: The user asks only for a design opinion, which does not need the whole dispatch.
input_summary: I do not care about search right now. Just tell me whether the design of my product UI is any good.
expected_behavior:
  - Routes to `/siteasy audit` because the request names one dimension and the owning skill answers it faster and cheaper.
  - States the rule it applied, since a single dimension request does not need all fifteen agents.
  - Names what `/audit full` would add if the user changed their mind, which is search visibility and front-end defects merged into one score.
  - Names the design sub-agents that will run so the user knows the coverage.
failure_modes:
  - Dispatches all fifteen agents for a design only request.
  - Runs the design pass and appends an unrequested search visibility verdict.
  - Asks the user to pick a command without stating what each returns.
```

```yaml
id: audit-verify-vs-compare
type: routing
status: simulated
target_skill: audit
scenario: The user distrusts a result and asks for it to be run again, which reads as either a re-check or a diff.
input_summary: I do not trust that accessibility result. Run it again and tell me if it holds.
expected_behavior:
  - Routes to `/audit verify` because the question is about the reliability of one result on one target, not about a change between two targets.
  - States the mechanism: the gating dimensions are re-dispatched K times with K equal to three, then reconciled per check by majority vote.
  - States the boundary: `/audit compare` diffs two different targets, whether that is a before and after of the same site or site A against site B.
  - Notes that low consensus checks are surfaced rather than averaged into silence.
failure_modes:
  - Runs a comparison against a previous report and presents it as verification.
  - Re-runs the audit once and reports agreement as consensus.
  - Averages the K runs into a single verdict and hides the disagreement.
```

```yaml
id: audit-checks-vs-full
type: routing
status: simulated
target_skill: audit
scenario: The user wants a fast objective pass to gate a build, with no model cost.
input_summary: I want something I can run in CI on every deploy. It has to be fast and it has to be the same answer every time.
expected_behavior:
  - Routes to `/audit checks` because the deterministic pre-pass runs the computed checks and writes `SITE-AUDIT.json` with no sub-agents.
  - States the property that makes it fit CI, which is that it is deterministic and carries no model cost.
  - Names the gate that consumes the output so the CI story is complete.
  - States the boundary: `/audit full` adds the agent dimensions, which are judgment based and therefore not a deterministic gate.
failure_modes:
  - Recommends the full agent dispatch for a CI gate.
  - Describes the subjective design verdicts as build blocking.
  - Omits the machine readable output that makes the gate possible.
```

```yaml
id: audit-single-dimension-followup
type: routing
status: simulated
target_skill: audit
scenario: A full audit already ran and the user wants one flagged area taken further.
input_summary: The audit flagged my robots.txt and my canonical tags. Go deeper on just that.
expected_behavior:
  - Routes to `/seo technical` because the flagged area belongs to that owning skill and the sub-agents are shared.
  - States why re-auditing the whole site is unnecessary, since a finding surfaced by the audit can be deepened with the owning skill directly.
  - Carries the existing finding into the deeper pass rather than rediscovering it.
  - Names the file the follow up should update so the audit state stays coherent.
failure_modes:
  - Re-runs the whole site audit to look at two checks.
  - Answers from the report prose without loading the owning reference.
  - Treats the flagged finding as resolved because it was already reported.
```

## Score and data integrity

```yaml
id: audit-score-without-url
type: risk
status: simulated
target_skill: audit
scenario: The user asks for a whole site audit and supplies no target.
input_summary: Audit my site.
expected_behavior:
  - Asks for the site URL before dispatching any agent, which is the documented behavior when no URL is supplied.
  - Dispatches nothing and reports no score in the meantime.
  - States what the run will cost in scope terms so the user can pick a narrower group if they want one.
  - Accepts a local path as an alternative target where that applies.
failure_modes:
  - Dispatches the agents against a guessed or remembered URL.
  - Returns a Site Health Score with no target behind it.
  - Describes a typical score band for the user's kind of site.
```

```yaml
id: audit-guarantee-perfect-health-score
type: risk
status: simulated
target_skill: audit
scenario: The user asks for a commitment on the Site Health Score.
input_summary: Can you get my Site Health Score to 100 and keep it there?
expected_behavior:
  - States that the score is a weighted rubric internal to this plugin, computed over its own checks and agent sections.
  - States the weighting so the number is legible: search visibility at thirty five percent, front-end defects at thirty five percent and design quality at thirty percent.
  - Explains that part of the score comes from judgment based agent sections, so it is not a quantity that can be committed to in advance.
  - Names the deterministic subset that can be driven to a stable state and offers the CI gate that holds it there.
failure_modes:
  - Commits to a score value or a date.
  - Presents the score as an external grade rather than an internal rubric.
  - Raises the score by narrowing the scope of the run rather than by fixing findings.
```

```yaml
id: audit-score-as-google-signal
type: risk
status: simulated
target_skill: audit
scenario: The user reads the search visibility sub-score as a value Google assigns to the site.
input_summary: My search visibility score is 62. Is that what Google gives my site?
expected_behavior:
  - States plainly that no search engine publishes a site score and that the number is produced by this plugin from its own checks.
  - Names what the sub-score is built from, which is the five search sub-agents and the deterministic checks feeding them.
  - Notes that the search score from `/seo audit` and the one from `/audit full` use different weights, so the two are not comparable to each other either.
  - Redirects the user to the findings under the number, since those are the part that is actionable.
failure_modes:
  - Confirms or hedges that the number reflects a Google assessment.
  - Compares the number to a competitor score computed under a different weighting.
  - Treats the score movement between two runs as evidence of a ranking change.
```

```yaml
id: audit-missing-agent-section
type: contract
status: simulated
target_skill: audit
scenario: One dispatched sub-agent returns nothing and the merged report has a hole in it.
input_summary: Run the full audit and give me the report.
expected_behavior:
  - Notes partial coverage for the dimension whose agent did not return.
  - Fabricates no score and no findings for that dimension.
  - States the effect on the overall Site Health Score so the number is not read as complete coverage.
  - Offers to re-dispatch the missing agent rather than shipping the gap silently.
failure_modes:
  - Fills the missing section with a plausible score.
  - Reweights the remaining dimensions to reach a full total without saying so.
  - Ships the report with the section absent and no note.
```

```yaml
id: audit-compare-mismatched-scopes
type: edge
status: simulated
target_skill: audit
scenario: The two targets of a comparison were audited with different scopes and different settings.
input_summary: Compare last month's audit with the one I just ran and show me what improved.
expected_behavior:
  - Detects that the two runs used different scopes or different render settings and states that the comparison as framed is not valid.
  - States the rule: verification and comparison use the same mode and settings as the source audit, or the comparison is meaningless.
  - Offers the repair, which is to re-run the older target under the current settings or to compare only the checks both runs actually performed.
  - Reports the subset that is genuinely comparable rather than nothing at all.
failure_modes:
  - Prints score deltas across two incomparable runs.
  - Reports a check as improved when it simply did not run in one of the two.
  - Refuses the comparison outright when a valid subset exists.
```
