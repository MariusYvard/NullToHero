---
name: conversion-quality
description: "Advisory 100-point conversion rubric across hook, clarity, proof and call to action, with written band descriptors, verifiable checks, a brand-maturity severity adjustment and a fixed output shape carrying alternatives and test ideas."
version: 2.3.0
---

# Conversion Quality

An advisory rubric for `/siteasy critique`. It scores whether a page sells, which is a separate question from whether it is usable or whether its claims are evidenced.

Three rubrics run on different questions and must not be merged:

| Rubric | Question | Nature |
|---|---|---|
| [heuristics-scoring.md](heuristics-scoring.md) | Is the interface usable | 10 heuristics, 0 to 4, total 40 |
| `agents/siteasy-agent-claims.md` | Are the claims evidenced | Deterministic, 100 minus 15 per FAIL |
| This file | Does the page sell what it is selling | Advisory, 4 dimensions of 25, total 100 |

Only the first two produce a deterministic verdict. This one produces edits and hypotheses.

## Four dimensions, 25 points each

### Hook and hero (25)

| Band | Descriptor |
|---|---|
| 0 to 5 | A generic slogan that could sit on any competitor's page without a single edit |
| 6 to 15 | The offer is stated but flat. It names the category rather than the gain |
| 16 to 20 | A clear value proposition carrying one concrete detail: a number, a named job or a time to result |
| 21 to 25 | Specific and tied to the exact problem the visitor arrived with, with its supporting proof inside the first screen |

### Clarity and friction (25)

| Band | Descriptor |
|---|---|
| 0 to 5 | After the first screen the visitor still cannot say what the product does or who it is for |
| 6 to 15 | The product is understandable but the next step is unclear, or the ask is larger than the stage warrants |
| 16 to 20 | One obvious path, jargon kept to terms the audience uses, the ask matches the stage of the relationship |
| 21 to 25 | A step the visitor expected has been removed: no card, no call, prefilled fields, a result before signup |

### Social proof and trust (25)

| Band | Descriptor |
|---|---|
| 0 to 5 | No proof at all, or adjectives standing in for it ("loved by teams everywhere") |
| 6 to 15 | Proof exists but is anonymous or undated: unattributed quotes, stock portraits, a bare logo band |
| 16 to 20 | Proof carries names, roles and numbers, and at least one item matches the visitor's segment |
| 21 to 25 | Proof is verifiable off the page (a linked case study, a public review profile, a named reference, an openable report) and sits next to the claim it supports |

### Call to action strength (25)

| Band | Descriptor |
|---|---|
| 0 to 5 | The label names the mechanism ("Submit", "Learn more"), or several actions compete at equal weight |
| 6 to 15 | One label states an outcome, but it appears once and sits below the fold |
| 16 to 20 | A single primary action repeated at each decision point, with secondary actions visibly quieter |
| 21 to 25 | The label states the outcome and the size of the step, with reassurance text within one line of the button |

## Verifiable checks

Score the bands against observations, not impressions. Each check below produces an answer that two reviewers would agree on.

- Three-second test. Show the first screen for three seconds, then ask two questions: what is sold and to whom. A missing answer to either caps hook and hero at 15, whatever the wording quality.
- Message match. Compare the traffic source text (ad headline, email subject, search snippet, referring link text) with the H1 word for word. A promise present in the source and absent from the H1 is a mismatch, and it is measurable rather than a matter of taste.
- Proof carries numbers and names. Count the adjectives in the proof block that have no number, date or named source attached. More than two is a deduction in social proof and trust.
- No manufactured urgency. Run the source-level detection patterns in [offer-diagnostic.md](offer-diagnostic.md). One confirmed hit caps social proof and trust at 15, because a detectable fake discounts the true claims beside it.
- One primary action. Count the elements using the primary button style and list their destinations. More than one distinct destination caps call to action strength at 15.
- Reassurance near the button. Check for microcopy within one line of the primary button stating the cost of the step ("No card required", "Cancel anytime", "Takes two minutes"). Absent is a deduction, not a cap.
- Objection coverage. Run the table in [objections.md](objections.md). A blocking objection with no owning element is a deduction in clarity and friction.

## Overall bands

| Total | Reading |
|---|---|
| 80 to 100 | Solid. Remaining work is refinement, and changes should be tested rather than assumed |
| 60 to 79 | Workable, with clear fixes available. The weakest dimension names the next piece of work |
| Below 60 | The page is probably losing conversions it could hold. Fix the weakest dimension before testing anything else |

## Severity adjustment by brand maturity

The same page deserves different severity depending on what the visitor already knows about the brand. Set the tier before scoring.

| Tier | The visitor | Controls this tier relaxes | Controls it does not relax |
|---|---|---|---|
| Dominant | Arrives knowing the brand and the category | Social proof attribution (a bare logo band is enough when the names are already known), guarantee presence, proof density | Clarity, one primary action, message match, urgency honesty |
| Established | Knows the brand inside its segment, not outside | Customer logo density (a short row is enough), guarantee presence where a self-serve trial already carries the risk | Proof attribution, urgency honesty, objection coverage |
| Challenger | Does not know the brand at all | Nothing | Every claim needs an owner and a date, and a guarantee or a free trial is expected because nothing else carries the risk |

Guiding principle: before removing points, ask whether the thing is a mistake or a decision informed by data the reviewer does not have. A hero that has been unchanged for two years has probably been tested. When the answer is not knowable from the page, write the question into the report instead of taking the deduction.

## Required output

Return exactly this shape. Nothing here blocks a release.

```
Conversion quality: XX/100
  Hook and hero            XX/25
  Clarity and friction     XX/25
  Social proof and trust   XX/25
  Call to action strength  XX/25
Brand maturity tier: dominant | established | challenger
Weakest dimension: [name] - [the one observation that put it in that band]

Edits
1. [concrete edit, naming the element and the replacement text or change]
2. [concrete edit]
3. [concrete edit, optional]

Alternatives
Headline
  Option A: [text] ([why this one, which lever it moves])
  Option B: [text] ([why this one])
  Option C: [text] ([why this one], optional)
Button label
  Option A: [text] ([why this one])
  Option B: [text] ([why this one])

Test ideas
- [hypothesis, naming the metric, the direction and the mechanism]
- [hypothesis]
- [hypothesis]
```

Rules for the blocks:

- Two or three alternatives, never one. A single suggestion reads as an instruction, and the point is to give the owner a choice they can judge.
- Every alternative carries its rationale in parentheses. An option with no rationale cannot be compared to the others.
- Test ideas are hypotheses, not recommendations. Write them so they can fail. Draw from [conversion-experiments.md](conversion-experiments.md) rather than inventing new ones each run.
- The weakest dimension gets the edits. Spreading three edits across four dimensions moves nothing.

## Honesty note

Any conversion impact named in this rubric, in its edits or in its test ideas is a hypothesis to test on the page in question. It is not a guaranteed gain. Effect sizes do not carry across pages, audiences, price points or traffic sources, and a change that helped one page has no claim on another.

This rubric is advisory. It produces edits and test ideas. It never blocks a publication and it never sets a pass or fail. Its score is not comparable to the deterministic scores produced by the sub-agents in `agents/`.

When a number is quoted anywhere in a report built on this rubric, either name its source and its date or label it an order of magnitude to calibrate against the page's own data.

## Cross-references

| Need | File |
|---|---|
| Whether the offer itself holds | [offer-diagnostic.md](offer-diagnostic.md) |
| Which objection is unanswered | [objections.md](objections.md) |
| Section order behind the score | [landing-patterns.md](landing-patterns.md) |
| Usability scoring | [heuristics-scoring.md](heuristics-scoring.md) |
| Wording of the alternatives | [ux-writing.md](ux-writing.md) |
| Test hypotheses to fill the last block | [conversion-experiments.md](conversion-experiments.md) |
