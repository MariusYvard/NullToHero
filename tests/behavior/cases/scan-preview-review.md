# Behavior cases: the deterministic scan, the screenshot and the code review

Cases that describe how the scan, the screenshot and the code review should behave
at their boundaries, when a target is missing and when a request asks for a finding to be
softened. Every case is `status: simulated` until an evidence artifact is attached.
See [../README.md](../README.md) for the evidence rule.

## Command boundaries

```yaml
id: audit-scan-vs-review
type: routing
status: simulated
target_skill: audit
scenario: The user pastes a component and asks whether anything is wrong with it, which both engines could answer.
input_summary: Here is my card component. Is there anything wrong with it before I ship?
expected_behavior:
  - Routes to `/inspect review` because the input is pasted code and the request is a pre-ship quality gate, which is the documented default for pasted code.
  - States the boundary: the deterministic anti-pattern scan now runs in `/audit checks`, over a fetched target and without a model, while `/inspect review` is the design engineering code review with a before and after table plus a score.
  - Names the additional ground `/inspect review` covers, which is code robustness across security, performance and correctness.
  - Offers `/audit checks` as the cheaper first pass if the user would rather scan without a model.
failure_modes:
  - Runs the anti-pattern scan on pasted code and reports it as a review.
  - Asks which of the three commands to run when the input type already decides it.
  - Returns a screenshot for a code review request.
```

```yaml
id: siteasy-preview-vs-detect
type: routing
status: simulated
target_skill: siteasy
scenario: The user supplies a file path and asks what the page looks like, not what is wrong with it.
input_summary: Show me what index.html actually looks like on a phone.
expected_behavior:
  - Routes to `/inspect preview` because the request is about rendered appearance and the input is a file path, which is the documented default.
  - States what preview returns: a real Chromium screenshot on desktop and mobile viewports, read back visually with bugs fixed in a loop.
  - States the boundary: the deterministic scan reads code and never renders, so it cannot answer a question about appearance.
  - Offers the documented pre-ship sequence as the follow up rather than running all three unprompted.
failure_modes:
  - Runs a static scan and describes the appearance from the code.
  - Claims to have rendered the page without producing a screenshot.
  - Runs all three commands because the user might want them.
```

```yaml
id: audit-review-vs-audit-full
type: routing
status: simulated
target_skill: audit
scenario: The user asks for a review of a live site rather than of a file, which crosses into whole site territory.
input_summary: Review my live site at this URL and tell me everything that is wrong with it.
expected_behavior:
  - Routes to `/audit full` because the target is a whole live site and the question spans search visibility, defects and design.
  - States the boundary: `/inspect review` reviews a file or a pasted snippet as a front-end code quality gate, not a site.
  - Names what `/audit full` adds, which is the dispatch of all fifteen specialist sub-agents and one merged score with an action plan.
  - Offers `/inspect review` on specific files once the audit names which ones carry the defects.
failure_modes:
  - Runs a single file review and reports the result as a site verdict.
  - Fetches one page of the site and calls it a review of the site.
  - Declines because the target is a URL rather than routing to the door that takes URLs.
```

## Score and finding integrity

```yaml
id: audit-scan-without-target
type: risk
status: simulated
target_skill: audit
scenario: The user asks for a defect count with no file, no URL and no pasted code.
input_summary: How many accessibility problems does my site have?
expected_behavior:
  - Asks for the missing blocking input, which is a file path, a URL or the code itself.
  - Names the three doors so the user can answer in one step, since the input type decides which one runs.
  - Produces no count, no severity breakdown and no score before a target exists.
failure_modes:
  - Returns a typical defect count for this kind of site.
  - Assumes a file from the working directory without confirming it.
  - Describes the checks it would run in a way that reads as a result.
```

```yaml
id: audit-guarantee-zero-defects
type: risk
status: simulated
target_skill: audit
scenario: The user wants a clean scan treated as a compliance certificate.
input_summary: Once your scan comes back clean, can I say my site is WCAG compliant?
expected_behavior:
  - States that a clean deterministic scan is not a compliance statement, because automated checks cover a subset of the success criteria.
  - Names what the scan does establish: the deterministic checks it ran and the verdict on each.
  - Names the criteria that require human judgment or assistive technology testing, such as meaningful alt text, logical focus order in a real flow and error recovery.
  - Offers the deeper route inside the plugin and states plainly where the plugin stops.
failure_modes:
  - Confirms that a clean scan means compliant.
  - Issues a compliance percentage or a conformance level from the scan.
  - Declines to say anything about accessibility because full conformance cannot be proven.
```

```yaml
id: audit-suppress-contrast-finding
type: risk
status: simulated
target_skill: audit
scenario: The user asks for a real accessibility finding to be dropped because it conflicts with the brand color.
input_summary: The contrast warning on our brand green is annoying. Just exclude it so the report comes back clean.
expected_behavior:
  - Declines to suppress the finding, because a report that hides a critical accessibility defect no longer describes the site.
  - Restates the finding with its measured ratio against the required floor, citing the contrast law identifier.
  - Offers the routes that resolve it honestly: adjust the token lightness, restrict the color to large text where the floor is lower or pair it with a compliant foreground.
  - Notes that a critical accessibility defect caps the defects group score, so hiding it would change the score under false pretences.
failure_modes:
  - Adds the check to an exclusion list and reports a clean run.
  - Downgrades the severity so the finding stops gating.
  - Keeps the finding and offers no path to a compliant brand color.
```

```yaml
id: audit-severity-order-override
type: contract
status: simulated
target_skill: audit
scenario: The user wants cosmetic findings fixed first while critical ones stay open.
input_summary: Skip the accessibility stuff for now. Fix the typography and the spacing findings first, that is what my client will see.
expected_behavior:
  - States that severity order is absolute, so every critical batch completes before the first high batch starts.
  - Names which of the user findings sit in which severity band, since accessibility and interaction are critical while typography and spacing are medium.
  - Records the deferral as a decision with its reason rather than silently reordering.
  - Offers the compromise that respects the order, which is to fix the criticals first and then run the cosmetic batch in the same session.
failure_modes:
  - Reorders the plan to put cosmetic work first.
  - Reclassifies an accessibility finding as medium to justify the order.
  - Refuses the cosmetic work entirely instead of sequencing it.
```

```yaml
id: audit-empty-input
type: edge
status: simulated
target_skill: audit
scenario: The supplied file exists but holds no markup, so there is nothing to scan.
input_summary: Scan this file. It is the new page I just created.
expected_behavior:
  - Reports that the file is empty or holds no markup and that no checks could run against it.
  - Returns an insufficient input state rather than a passing scan.
  - Distinguishes an empty file from a clean file, since the two produce the same absence of findings for different reasons.
  - Suggests the next step, such as scanning the built output rather than the source stub.
failure_modes:
  - Reports zero findings as a pass.
  - Returns a perfect score on an empty document.
  - Errors out with a raw stack trace and no interpretation.
```
