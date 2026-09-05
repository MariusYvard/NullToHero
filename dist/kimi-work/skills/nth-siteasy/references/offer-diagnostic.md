---
name: offer-diagnostic
description: "Diagnose the offer behind the page: value equation, offer anatomy, guarantee design, honest versus manufactured scarcity with source-level detection patterns, positioning chain, awareness stages and market sophistication."
version: 2.3.0
---

# Offer Diagnostic

The rest of this skill judges how a page presents an offer. This file judges whether the offer holds. A page can pass every layout, proof and copy check and still fail because the thing being sold is not worth the asking price to the person reading.

Scope boundary: [landing-patterns.md](landing-patterns.md) covers section order and call-to-action placement, `agents/siteasy-agent-claims.md` covers whether claims carry evidence. Neither asks whether the offer is buyable. Run this before either, because a repositioned offer changes what the page should say.

## The value equation

Perceived value rises with the result and with the buyer's confidence of reaching it. It falls with waiting and with work:

```
perceived value = (target result x perceived odds of reaching it)
                  / (time to result x work and trade-offs required)
```

Score each of the four levers 1 to 10 from the buyer's point of view, not the seller's. The lowest score is the binding constraint.

| Lever | Score 1 means | Score 10 means |
|---|---|---|
| Target result | The buyer does not want it enough to move | The buyer already wants it and can name it |
| Perceived odds | Nothing on the page suggests it works for people like them | They can see themselves in the evidence |
| Time to result | Months before anything visible happens | A visible result on day one |
| Work and trade-offs | Migration, retraining, internal politics | Sign up and keep working |

The deliverable is one recommendation on the binding lever. Four parallel improvements move nothing, because the constraint is still the constraint. If perceived odds scores 3 and the other three score 7, adding a feature to raise the result does not help; a guarantee, a case study from the same segment or a smaller first step does.

Frame adapted from Alex Hormozi, *$100M Offers* (2021), restated in different terms.

## Offer anatomy

Six components. Diagnose each one separately; most offers fail on two of them.

| Component | What it is | Where it fails most often |
|---|---|---|
| Core deliverable | What produces the result | Described as features, so the buyer cannot picture the result |
| Bonus stack | Items added to close named objections | Unrelated items added for volume, which read as padding |
| Guarantee | The stated exit if the result does not arrive | Buried in terms or loaded with conditions |
| Scarcity or urgency | The limit on quantity or on time | Invented and detectable in the source (see below) |
| Offer name | The label the buyer repeats to a colleague | The company name reused, which carries no promise |
| Price and payment structure | The number and how it is paid | One number, no comparison, no payment option |

## Guarantee design

### Eight types

| Type | How it works | Works when | Backfires when |
|---|---|---|---|
| Unconditional refund | Money back on request inside a window | Low price, digital delivery, fast to evaluate, refund rate already priced in | The value is consumed on first use (a report, a completed audit), so the buyer can take it and exit |
| Conditional refund | Refund if the buyer did the stated work and got no result | The result depends on buyer effort and the conditions are few and checkable | Conditions pile up and read as a refusal written in advance |
| Better than money back | Refund plus something extra kept or paid | High margin, high confidence, risk is the binding lever | The terms sound implausible for the price, which raises suspicion instead of lowering it |
| Service level commitment | A stated uptime, response time or delivery date, with a credit when missed | B2B services and infrastructure where the buyer already measures that metric | The credit is trivial next to the cost of a miss |
| Performance based | Fee tied to the result, or paid only when the result arrives | The result is measurable, attributable and inside the seller's control | Attribution is contested, which creates disputes with the best customers |
| Anti-guarantee | Sales are final, stated openly with a reason | High-touch or custom work where qualifying out casual buyers is intended | Price is low or the buyer is new to the seller, so it reads as risk transfer |
| Result or extension | Work continues at no extra fee until the stated result arrives | Marginal delivery cost is low and both sides accept one definition of the result | The definition is loose, producing an open-ended obligation |
| Comparative | Match or beat a named competitor's terms | The buyer is actively comparing and the competitor's terms are public | It invites the buyer to negotiate using a competitor discount, which sets the price |

### Choosing one: four questions

1. What is the buyer's real perceived risk? Money, time, switching pain or looking wrong in front of someone. Cover the risk they name, not the one that is cheapest to offer. A money-back promise does nothing for a buyer whose risk is internal reputation.
2. What refund rate can the seller absorb? Compute at real gross margin, not revenue.
3. How sophisticated is the buyer? A buyer who has seen the category before discounts a standard 30-day refund to roughly zero. A first-time buyer reads the same line as meaningful.
4. How measurable is the result? Measurable results support conditional, performance and result-or-extension forms. Unmeasurable results support refund forms only, because there is nothing to arbitrate.

### Rules

- Two conditions maximum on a conditional guarantee. Three only when the conditions sit next to each other in the buyer's workflow (complete setup and attend the first session). Past that the buyer reads it as a way to make refunds impossible.
- Stress test: model the offer at a 10 percent invocation rate. If gross margin goes negative, the guarantee cannot ship as written. Narrow the window, change type or add one condition.
- Placement: when perceived odds is the binding lever, the guarantee belongs in body copy above the buy button, in the same block as the price. Terms and conditions is where a guarantee goes to be ignored.

## Honest scarcity and manufactured scarcity

Operational distinction: scarcity caps a quantity, urgency caps a duration. A page that limits neither has no deadline problem. A page that claims both and enforces neither has a credibility problem.

### Seven honest formats

Each is backed by a real constraint a buyer could check.

| Format | The real constraint behind it |
|---|---|
| Cohort with a fixed start date | Delivery happens live on set dates |
| Seat cap on a service | Service hours available in the period |
| Physical inventory count | The stock system, read live |
| Founding price for a stated number of accounts | A published price change after the count |
| Beta access with a waitlist | Support capacity per week |
| Launch window with a stated close date | The offer is actually withdrawn on that date |
| Bonus tied to a dated live event | It cannot be delivered after the event |

### Five-point diagnostic

1. Is the limit real, meaning something changes when it is reached?
2. Can the buyer verify it, or at least see the mechanism producing it?
3. What happens at the moment the limit is hit, stated on the page?
4. Is the seller willing to actually enforce it, including turning away money?
5. Does the same limit reappear next week with the same numbers?

A no on 1, 4 or 5 means the scarcity is manufactured and should be removed rather than reworded.

### Source-level detection

These patterns are detectable without judgement. Each names what to search for in the delivered HTML or JS and what a real implementation looks like instead.

1. **Deadline computed from load time.** Search for a date built by adding an offset to the current clock: `Date.now() + <number>`, `new Date(Date.now() + ...)`, `getTime() + 86400000`, `setTime(now.getTime() + ...)`, `addHours(new Date(), n)`, `dayjs().add(n, 'day')`, `endOf('day')`. Signal: the deadline is an offset and the base is the current clock, so every visitor gets a personal countdown. A real deadline is an absolute timestamp in the markup (`<time datetime="2026-03-01T00:00:00Z">`), a constant in config or a value returned by an API.
2. **Hard-coded stock or viewer counter.** Search for numeric literals adjacent to strings like `left in stock`, `spots remaining`, `seats left`, `people viewing`, `others are looking`. Two variants: the number is static text in the markup, or it is generated with `Math.random()` (look for `Math.floor(Math.random() *` feeding an element whose text contains one of those strings). A real counter comes from a fetch, a server render or a socket message tied to an inventory or session store.
3. **Countdown that resets on reload.** Signal: no persistence read before the timer is seeded. Nothing reads `localStorage`, `sessionStorage`, a cookie or a server value for an expiry, and the interval starts from a fresh computation on every script run. Test procedure: load, note the first rendered value, hard reload, compare. A return to the same starting value means the deadline is per page view. A near variant is still manufactured: an expiry written to `localStorage` on first visit (look for a `setItem` whose value is a timestamp read back by the timer), which gives each visitor a private deadline.
4. **Bonus that expires every evening.** Search for expiry computed as the end of the current day: `setHours(23, 59, 59)`, `endOf('day')`, a midnight rollover or a date string rendered with `toLocaleDateString()` from a value derived from `new Date()`. Combined with copy saying "today only", this means the offer never ends.
5. **Banner date that is always today or tomorrow.** Signal: the visible date string is produced at render time from the current clock rather than read from a constant or an API field.

Report each hit with file, line and the matched expression. These are findings about the page, not about intent; state the pattern, not a motive.

### When scarcity is not needed

- Cancelable subscription: the cancel path already carries the risk, and a deadline adds pressure the buyer does not need.
- Low-price impulse purchase: the price is the risk reducer.
- Premium brand: a countdown reads as need, which works against the price.
- High-trust audience with an existing relationship: pressure costs more than it gains.

Rule: forced scarcity is worse than no scarcity. A buyer who catches one invented limit discounts every other claim on the page, including the true ones.

## Positioning

Positioning is a causal chain, and each link is derived from the previous one rather than chosen freely.

1. Competitive alternatives: what the buyer would do if the product did not exist. Usually the status quo, a spreadsheet, an intern or nothing at all, not the named competitor.
2. Unique attributes: what this product has that those alternatives do not. Capabilities, not adjectives.
3. Enabled value: what those attributes let the buyer do or avoid.
4. Segments that care most: who feels that value strongly enough to act.
5. Market category: the frame that makes those strengths look obvious to that segment.

Three styles:

| Style | Move | Fits when |
|---|---|---|
| Head on | Win a known category on a dimension buyers already rank | The category is understood and the product genuinely leads on that dimension |
| Big fish, small pond | Win a subsegment of a known category | The product cannot lead overall but leads clearly for one group |
| Category creation | Name a new category and teach its criteria | Existing categories misdescribe the product, and there is budget to teach the market |

Frame adapted from April Dunford, *Obviously Awesome* (2019), restated in different terms.

## Awareness and sophistication

These are two separate scales, and confusing them produces a page written for the wrong reader. Awareness describes one visitor. Sophistication describes the market that visitor sits in. A most-aware visitor can arrive in a stage-five market, and a problem-aware visitor can arrive in a stage-one market.

Awareness stages and where the headline starts:

| Awareness stage | The visitor | Headline starts on |
|---|---|---|
| Unaware | Does not know they have the problem | The situation or the identity, with no product name |
| Problem aware | Feels the pain, has not named a solution | The problem, in their own words |
| Solution aware | Knows solutions exist, not which | The mechanism and why this approach works |
| Product aware | Knows this product, has not decided | The differentiator and the proof behind it |
| Most aware | Ready, waiting for terms | The offer itself: price, deal, deadline |

Market sophistication and the required move:

| Stage | Market state | Move |
|---|---|---|
| 1 | First to market | State the claim plainly |
| 2 | Competitors present, same claim | Enlarge the claim, make it bigger or more specific |
| 3 | Claims exhausted, nobody is believed | Introduce a mechanism that explains how |
| 4 | Mechanisms competing | Elaborate the mechanism, make it better or easier |
| 5 | Market is jaded | Shift to identification with the reader rather than the promise |

Frame adapted from Eugene Schwartz, *Breakthrough Advertising* (1966), restated in different terms; the book remains in copyright, so no phrasing is reproduced.

## Cross-references

| Need | File |
|---|---|
| Section order and CTA placement | [landing-patterns.md](landing-patterns.md) |
| Objection list and bonus mapping | [objections.md](objections.md) |
| Scoring the page against this diagnosis | [conversion-quality.md](conversion-quality.md) |
| Test hypotheses for a changed offer | [conversion-experiments.md](conversion-experiments.md) |
