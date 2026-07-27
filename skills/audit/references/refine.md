---
name: refine
description: "Bounded refinement loop for /audit: a veto gate that can block before any round, then at most three rounds revising the three lowest weighted contributions, with a full rescore, four stop conditions and a reported round counter."
version: 2.3.0
---

# Bounded Refinement

The convergence loop behind `/audit refine`. It takes a scored deliverable and a target
band, revises the dimensions that hold the most weight in the score, and stops. It owns no
rubric and no weights of its own: the dimension set, the weights and the severity cap come
from [full.md](full.md), and the band boundaries come from `band()` in
`tools/audit/lib/site-audit.mjs` (Excellent 90 and above, Good 70 to 89, Needs work 50 to
69, Critical below 50).

It is the only reference in this skill that writes to the audited deliverable. Every other
`/audit` command measures and reports. That difference is what makes the bounds below
mandatory rather than advisory: a loop that edits its own subject and re-measures it can
run forever and can tune the artifact to the measurement.

## The veto gate

Vetoes are the check verdicts that already cap or block a result elsewhere in the plugin.
They are not the lowest scores; they are the specific FAILs that `tools/audit/gate.mjs`
fails a build on, plus the two severity-cap triggers named in [full.md](full.md).

| Veto | Check | Owning agent |
|------|-------|--------------|
| Crawlability | `robots-disallow` FAIL | seo-agent-technical |
| Color contrast (AA) | `contrast-ratio` FAIL on the computed path | inspect-agent-a11y |
| Keyboard operability | FAIL | inspect-agent-a11y |
| Interactive states | FAIL | inspect-agent-interaction |
| Action feedback | FAIL | inspect-agent-interaction |

**Two or more vetoes failing means an immediate blocked exit, with zero rounds run.**

The reason is not severity theatre. It is that the loop cannot reach its target from
there. Any one of those FAILs caps the Front-end Defects sub-score at 69 by the rule in
[full.md](full.md), so with the group held at its ceiling the overall band floor is
unreachable by construction: three rounds of revision would run, cost three full rescores
and stop at exactly the same wall, having improved the dimensions nobody was blocked on. A
veto is a defect to repair, not a shortfall to polish, and the two need different work.

**Exactly one veto failing** is a documented middle case. The cap still applies, so the
target band may still be out of reach. Repair the veto first. If the caller chooses to
proceed anyway, the loop runs normally against the capped ceiling and the exit report
states the residual gap and its cause, so nobody reads a budget-exhausted exit as a
statement about the copy.

## The loop

```
vetoes = failing(VETO_CHECKS)
if vetoes.length >= 2:
    emit { outcome: "blocked", rounds: 0, vetoes }
    stop                                     # no round is run, at all

round = 0
score = scoreAll()                           # every dimension, from the rubric in full.md

while score.overall < floor(targetBand) and round < 3:
    round += 1
    weakest = dimensions
        .map(d => ({ ...d, contribution: d.score * d.weight }))
        .sort(ascending by contribution)     # tie: more headroom first
        .slice(0, 3)

    revise(weakest)                          # surgical edits only, no global rewrite

    previous = score.overall
    score = scoreAll()                       # full rescore, every dimension

    if failing(VETO_CHECKS).length >= 2:
        emit { outcome: "blocked", rounds: round }
        stop                                 # a veto that appears mid-loop stops it too

    if score.overall <= previous:
        emit { outcome: "plateau", rounds: round }
        stop

emit { outcome: score.overall >= floor(targetBand) ? "converged" : "budget-exhausted", rounds: round }
```

The target band defaults to Good, so the default floor is 70. A caller may set Excellent
and get a floor of 90, in which case exits on budget rather than on convergence are the
normal result and the outcome field says so.

## Ranking by weighted contribution

Rank by raw score and the round goes to whichever dimension shows the lowest number,
regardless of what that dimension is worth to the total. That is the failure the weighting
exists to prevent. A dimension sitting at 40 that weighs 5 percent holds 3 points of the
overall score. A dimension sitting at 70 that weighs 25 percent holds 7.5. Raw score ranks
the 40 first and sends round one there, at the smaller prize, and with a budget of three
rounds that is work the score never shows.

The ranking key is therefore the **weighted contribution**: the dimension score multiplied
by the dimension weight, sorted ascending, lowest three taken. Ties break toward the
dimension with more headroom, since headroom multiplied by weight is the number of points
a revision can actually recover.

**Effective weight.** When refining a whole-audit result, a dimension's weight is the
product of its group weight and its in-group weight, both from [full.md](full.md). For
example inspect-agent-code is `0.35 x 0.20 = 0.07`, and siteasy-agent-motion is
`0.30 x 0.15 = 0.045`. Weights are read, never chosen here. If a run needs different
weights, that is an edit to [full.md](full.md) and it applies to every command, not a local
override inside a refinement loop.

## Revision scope

Only the three selected dimensions are revised, and only by surgical edits: the specific
sentences, attributes, elements or tokens named in that dimension's findings. A global
rewrite is out of bounds even when it looks faster.

Two reasons, both operational. A rewrite invalidates every finding in the report, including
the ones from the twelve dimensions that were not selected, so the next rescore measures a
different artifact and the round-over-round trace stops meaning anything. And a rewrite
moves dimensions nobody asked it to move, which is how a refinement pass loses a passing
score in a dimension it never looked at.

## Why the rescore is full

Every round rescores every dimension, not the three that were revised.

Revising three dimensions moves others. Rewriting a claim for siteasy-agent-claims changes
the copy that siteasy-agent-content scores. Adding a visible label for inspect-agent-a11y
changes the markup that inspect-agent-code scores. A partial rescore would splice fresh
numbers for three dimensions onto stale numbers for the rest and report an overall score
that no single state of the deliverable ever had. The full rescore is the cost of the
number being real, and it is the main reason the round budget is three and not thirty.

## Stop conditions

| Condition | Test | Outcome | Why the loop ends here |
|-----------|------|---------|------------------------|
| Converged | `overall >= floor(targetBand)` | `converged` | The loop exists to reach the floor. Past it, further rounds tune the artifact to the measurement rather than improve it. |
| Budget exhausted | `round == 3` | `budget-exhausted` | Three rounds is the bound. Report the residual gap and the last ranking so a human can decide whether the remaining distance is worth a fourth pass by hand. |
| Blocked | `failing(VETO_CHECKS) >= 2`, at entry or after any round | `blocked` | The target is unreachable while the caps hold. Checked before the plateau test, so a blocked exit is never reported as a plateau. |
| Plateau | a round returns `overall <= previous overall` | `plateau` | Early stop. The next round would rank the same dimensions over the same findings and cost another full rescore for the same result. A round that buys nothing is the signal that the cheap moves are spent. |

The plateau test uses `<=`, not `<`. A round that returns the identical score has produced
no evidence that another round would differ, and treating an exact tie as progress is how a
bounded loop spends its whole budget standing still.

## Trace

One line per round, appended to the report and to `SITE-AUDIT.json`:

```
Round 1: overall 64, weakest [dim .05 = 3.0, dim .05 = 3.5, dim .15 = 10.5], revised, 71
```

Fields, in order: the round number, the overall score entering the round, the three
selected dimensions each shown as `name weight = contribution` in the ascending order the
ranking produced, the word `revised`, then the overall score after the full rescore. A
concrete line from a whole-audit run:

```
Round 1: overall 64, weakest [siteasy-agent-motion .05 = 3.2, siteasy-agent-claims .05 = 3.5, inspect-agent-code .07 = 4.9], revised, 71
Round 2: overall 71, weakest [siteasy-agent-motion .05 = 3.6, siteasy-agent-memorability .05 = 3.8, seo-agent-geo .05 = 4.2], revised, 71
```

That second line is a plateau and the loop stops there, with `rounds: 2`.

The trace is the auditable part. It shows which dimensions each round chose, the numbers
that made them the choice and what the round bought, so a reviewer can disagree with a
ranking decision rather than only with the final score.

## Round counter in the output

The refinement block written into `SITE-AUDIT.json`:

```json
"refine": {
  "rounds": 2,
  "outcome": "plateau",
  "targetBand": "Good",
  "entryScore": 64,
  "exitScore": 71,
  "vetoesAtEntry": 0,
  "trace": ["Round 1: ...", "Round 2: ..."]
}
```

The counter is carried so that a later re-audit knows how much tuning already happened. A
deliverable at 71 after zero rounds and a deliverable at 71 after three rounds are not the
same object: the second has already spent its cheap moves, and the obvious edits are gone.
Without the counter, a re-audit re-enters the same loop, reproduces the same ranking,
reaches the same plateau and reports it as a fresh finding. With it, a re-audit that reads
`rounds: 3, outcome: "plateau"` can say so and route the work to a human instead of buying
three more rescores.

## Not implemented

Deliberate absences, recorded so they are not mistaken for oversights.

**A memory of learned rejections.** The loop does not remember which revisions were
rejected in past runs and does not avoid proposing them again. Building that would need a
labelled corpus of accepted and rejected revisions, and no such corpus exists: the plugin
has never collected one, and a handful of examples would produce a preference model
confident in proportion to how little it had seen. If such a corpus existed one day it
would be local to the audited project, because a rejection is a fact about one team's house
style and not about refinement, and it would live next to that project's `LEARNINGS.md`. It
would never be a file in this plugin. A shipped list of "revisions users tend to reject"
would apply one project's taste to every other project that installed the plugin.

**An adaptive round budget.** The bound is three, fixed, and does not extend itself when a
round produces a large gain. A budget that grows when the score is moving is a budget that
grows exactly when a loop is most likely to be optimising the measurement, and the plateau
condition already stops early in the opposite case.

**Partial rescoring.** See "Why the rescore is full". A cheaper loop is available and it
reports a number that was never true.

## Relationship to /audit verify

`verify` and `refine` are asked about different objects and answer different questions.

| | `/audit verify` | `/audit refine` |
|---|---|---|
| Question | Is this verdict stable? | Can this deliverable reach the band? |
| The artifact | Never changes | Changes between measurements |
| Sampling | K independent runs of the same agents on the same bytes | One measurement per round, on a different artifact each time |
| Reconciliation | Majority vote per check, median score | No vote: each rescore replaces the last |
| Output | Consensus annotations plus a "Needs human review" list | A revised deliverable, a trace and a round counter |
| Cost | About K times the gating group | Three full rescores at most |

`verify` replays a measurement to find out how much of a verdict is noise. `refine` moves
the thing being measured. They compose in one order only: refine, then verify. Running
`verify` first measures the stability of a verdict about an artifact that is about to be
replaced, which is a number about nothing. Running it after gives a consensus reading of
the deliverable that actually ships.
