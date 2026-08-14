---
name: seo-measurement
description: >
  Measurement and attribution protocol: the four latency layers between a change and a
  visible result, read-back windows fixed before the change ships, control-group rules,
  a four-outcome decision, the answer-engine visibility loop and the evidence labels
  every metric carries. Use for: "did my SEO change work", "how long until I see
  results", "am I cited in ChatGPT", "measure AI visibility", "how do I prove this
  worked", "was that a real improvement", "how confident are these numbers".
version: 2.3.0
---

# Measurement and Attribution

A change to a page does not produce one signal. It produces four, arriving at different
speeds, meaning different things. Reading the fast one as if it were the slow one is the
most common attribution error in this discipline, and it goes in both directions: a fix
declared dead at day 3 and a rewrite credited with a rankings gain that shipped a month
before it. This file is the complement to the epistemic posture in [geo.md](geo.md).

## The four layers

| Layer | Question | Latency | Status | How to observe it |
|---|---|---|---|---|
| 1. Crawler access | did the bot fetch a 200 | immediate | precondition, not a result | server logs, a fetch with the bot user agent, robots.txt and rendering checks |
| 2. Citability | can a model that fetches live use this page | minutes | proxy only | hand the URL to an engine that retrieves live and ask it to answer from the page |
| 3. Surfacing | does the site come up when nobody hands over the URL | days to weeks | the GEO result | a fixed prompt panel, run without the URL |
| 4. Rankings and clicks | does search send traffic | weeks to months | the SEO result | a Search Console export, per [search-console.md](search-console.md) |

Layer 2 is a proxy and only a proxy. Handing an engine a URL removes retrieval, ranking
and selection from the test, which are the three things layer 3 measures. A page that
reads well when handed over can still never be retrieved. The reverse does not happen, so
a failure at layer 2 is worth acting on and a pass at layer 2 proves very little.

## The layer-1 rule

> **Never read an absent citation at layer 3 as "my content is not good enough" until
> layer 1 confirms the bot fetched a 200.** "Not crawled yet" and "crawled and not
> chosen" look identical inside an answer box and have opposite fixes. The first is a
> robots, rendering, status-code or server problem and no amount of rewriting touches it.
> The second is a content and authority problem and no amount of infrastructure work
> touches it. Diagnosing the second when it is the first spends a rewrite cycle on a page
> nobody has read.

Order of checks, every time, before any content conclusion: robots.txt allows the agent,
the URL returns 200 to that agent, the content is in the initial HTML response, the page
is indexed. Only then does an absent citation say anything about the content.

## Read-back windows

Windows are fixed before the change ships and written into the record with the change.
Choosing when to look after seeing the data is how a null result turns into a reported
win, and it is invisible in the final report.

| Change type | Read back at |
|---|---|
| Content refresh on an existing URL | day 7, 14, 28, 56 |
| New content on a new URL | day 14, 28, 56, 90 |
| Technical fix | daily for 7 days, then day 28 |
| Answer-engine surfacing panel | weekly |

Two consequences worth stating. A read-back that shows nothing is a result and gets
recorded, not skipped. And a window that has not arrived yet is not evidence of anything,
so a question asked at day 3 about a content refresh is answered with "the first
read-back is day 7", not with a number.

## Control groups

Layers 3 and 4 require a control group. Layers 1 and 2 do not, because they are
deterministic checks rather than measurements against a moving background.

A usable control is a set of pages on the same template, in the same traffic band, on
comparable topics, left untouched for the whole window. Pages chosen after the fact do
not qualify, and neither does the same page's own history, which carries the season, the
algorithm updates and the competitor moves that the control exists to subtract.

Report the delta against control, never the raw delta. A refreshed page up 12 percent in a
month when the control set rose 14 percent lost ground, and the raw number reports it as a
success. Where no control is possible, say so on the line where the number appears and
label the result `proxy`, not `measured`.

## Decision

Every test closes on one of four outcomes. Nothing stays open by default.

| Outcome | Condition | Next step |
|---|---|---|
| Promote | delta against control is positive and holds across at least two consecutive read-backs | roll the pattern out to the next set of pages, keep measuring the new set |
| Keep testing | direction is consistent but the window is too short or the sample too thin | wait for the next scheduled read-back, change nothing in the meantime |
| Rollback | delta against control is negative past the tolerance set before the change | revert, record what was reverted and why, re-measure at the next window |
| Unproven | no separation from control by the last scheduled window | archive it, do not roll out, do not report it as a win |

> Absence of significance is not proof of equivalence. `Unproven` means the test could not
> tell the difference, which is a statement about the test. It is not a finding that the
> change had no effect, and it may not be written up as one.

Changing the tolerance after seeing the data converts every outcome into Promote. Fix it
with the read-back windows, before the change ships.

## Answer-engine visibility loop

Layer 3 needs a stable instrument. This is it. It runs in three phases and produces a list
of pages that own the answers, not a score.

### Phase 1: build the prompt set

Generate at least 100 buyer prompts spread over 8 intent categories, with a minimum of 10
per category. Qualify every prompt with three fields: intent category, buyer stage
(unaware, problem-aware, solution-aware, vendor-aware, ready) and a priority from 1 to 10.

| # | Intent category | Shape of the prompt |
|---|---|---|
| 1 | Problem framing | "why does X keep happening" |
| 2 | Solution discovery | "how do I solve X" |
| 3 | Category comparison | "best tools for X" |
| 4 | Head-to-head | "A versus B for X" |
| 5 | Alternatives and switching | "alternatives to A", "migrating off A" |
| 6 | Pricing and cost | "how much does X cost", "is A worth it" |
| 7 | Implementation | "how do I set up X with Y" |
| 8 | Trust and evaluation | "is A reliable", "A reviews", "A security" |

Weight the priority scores deliberately toward categories 3 to 6. That bias is a choice,
not a neutral sample: comparison and purchase prompts are where a site can be selected at
all, and a panel dominated by problem-framing prompts measures a market rather than a
site. Say so in the report.

### Phase 2: run the panel

Run the 30 highest-priority prompts (10 for a smoke test, 100 for a full panel). No URL is
given to the engine at any point in this phase. For each prompt, record:

- whether the site appears in the answer at all
- which competitors are cited, by name
- which source URLs are cited, verbatim
- the type of each source: own site, competitor, marketplace or review site, forum,
  encyclopedia, news, vendor documentation, other

> Never fabricate a URL or a citation. If a cited source cannot be re-fetched and
> confirmed, write `unverified` in its place and keep it out of every count. An invented
> citation in a visibility report is the same failure the report exists to detect.

The panel is fixed once and reused. Changing prompts between runs destroys the comparison,
so new prompts go into a second panel with its own history.

### Phase 3: trace the answer back

For every prompt where the site should appear and does not, open the third-party pages
that carry the answer and record what they have: the format, the specificity, the data
they publish, the first-party evidence they can show. The output of phase 3 is a ranked
list of pages that currently own answers the site wants, each with the one thing it does
that the site does not. That list feeds [action-plan.md](action-plan.md) directly.

## Evidence labels

Every metric that reaches a report carries one label. The label travels with the number.

| Label | Meaning |
|---|---|
| `measured` | read from a tool or an export that can be re-run and produce the same number |
| `user-provided` | supplied by the user and not independently verified |
| `calculated` | arithmetic over other labelled inputs |
| `estimated` | modelled or inferred, with no direct observation of the thing claimed |
| `proxy` | a direct observation of something adjacent to the thing claimed |

Four rules govern the labels:

1. A calculation label wins. An arithmetic result is `calculated` even when every input is
   `measured`. An export on the input side makes the input measured, not the output.
2. An estimate is never presented as a measurement. One hedge in an introduction does not
   license precision in the tables below it.
3. A metric that is unavailable is marked not applicable. It is never invented, never
   carried over from a comparable site and never replaced by an industry average.
4. Weak sources do not accumulate into a strong one. Three vendor posts citing each other
   are one unsourced claim, and reporting them as three raises confidence on nothing.

## Error handling

| Scenario | Action |
|---|---|
| No server logs available for layer 1 | Substitute a fetch with the bot user agent plus the indexing status. Label the result `proxy`. Do not proceed to a content conclusion on a page whose fetch could not be confirmed at all. |
| No control group possible | Report the raw delta, label it `proxy` and name the confound that the control would have removed (season, algorithm update, site-wide change). |
| A read-back window was missed | Record the miss and use the next scheduled window. Do not substitute a window chosen after seeing the data. |
| An engine returns a citation whose URL 404s | Write `unverified` and exclude it from counts. Record the engine and the prompt, since a pattern of dead citations is itself a finding. |
| The prompt panel was edited between runs | Treat the two runs as separate panels. Report each on its own history rather than as a trend. |
| A metric is requested that no available source produces | Say which source would produce it and what it would cost to get. Do not estimate it into the table. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|---|---|
| Real clicks, impressions and positions for layer 4 | [search-console.md](search-console.md) |
| Crawler access rules and llms.txt for layer 1 | `/seo geo` |
| Before and after site state around a change | `/seo drift baseline`, `/seo drift compare` |
| Rendering, status codes and robots for layer 1 | `/seo technical` |
| AI Overview click loss with stable rankings | [ai-overview-recovery.md](ai-overview-recovery.md) |
| Recommendation format | [action-plan.md](action-plan.md) |
