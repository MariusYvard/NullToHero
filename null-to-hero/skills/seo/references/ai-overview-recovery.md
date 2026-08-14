---
name: seo-ai-overview-recovery
description: >
  Four-phase protocol for the case "the AI Overview is eating my clicks": segment the
  affected queries into four categories, diagnose access and content, reshape for
  structure rather than length and read back on a fixed schedule. Use for: "AI Overview
  stole my traffic", "CTR dropped but rankings are fine", "impressions up clicks down",
  "AI Overview is not citing me", "a competitor is cited instead of us", "recover from
  AI Overviews".
version: 2.3.0
---

# AI Overview Click Recovery

Two facts frame the whole protocol. Google states there is no additional requirement to
appear in AI Overviews beyond being indexed and snippet-eligible, and no third-party tool
reads its AI systems ([geo.md](geo.md) carries both citations). So this file is not a
route into the answer box. It separates the queries where the site is absent from the
answer from the queries where the answer no longer needs a click, and it fixes only the
first kind. Being cited and being clicked are different outcomes, and a page cited by an
AI Overview can still lose clicks.

## Symptom profile

The shape that sends a case here:

| Signal | Filter value |
|---|---|
| Organic CTR | down 20 to 60 percent |
| Query count showing it | at least 5 |
| Over | 2 to 4 weeks |
| Impressions | flat or rising |
| Position | still in the top 3 |

Those numbers are the dials of a filter, not a measured law about AI Overviews. Nobody has
published a traceable distribution of CTR loss by AIO presence, and the vendor figures in
circulation disagree by a factor of several. Widen or narrow the dials to fit the site and
report the values used. What identifies the case is the combination, not any one number:
clicks fall while impressions and position hold, which rules out a ranking loss and a
visibility loss at the same time.

## Phase 1: segment the queries

### Build the candidate list

Export two equal windows per [search-console.md](search-console.md), both ending at today
minus 3 days, then run `compare`:

```
node skills/seo/scripts/gsc-analyze.mjs compare before.csv after.csv --markdown --limit 50
```

Keep rows where the relative CTR change is below minus 20 percent and the impression
change is above minus 10 percent, then take the top 20 by clicks lost. `compare` emits
`ctrA`, `ctrB` and `ctr_diff`, where `ctr_diff` is the absolute difference, so the relative
change is `(ctrB - ctrA) / ctrA`. The impression change is emitted directly as
`impression_pct`. The second condition is what excludes ordinary decay: a query losing
impressions is losing visibility, which is a different problem with a different fix.

### Classify each query

Check the live SERP for each of the 20 queries by hand. No API reports AI Overview
presence, and any tool that claims to is inferring. Record the date, the device, the
country and the logged-in state with each check, then label the result `proxy` per
[measurement.md](measurement.md): AIO presence is not stable across sessions.

| Category | What the SERP shows | Priority | Reading |
|---|---|---|---|
| A | an AI Overview that cites your page | Low | you are in the answer, the click is being absorbed by the answer itself |
| B | an AI Overview that cites nobody from your site | High | you rank and you are not in the answer, which is the recoverable case |
| C | an AI Overview citing a competitor on a query you rank top 3 for | High | a specific page beat yours for the same query, and it can be inspected |
| D | no AI Overview | none here | the intent or the SERP changed some other way, so the problem is elsewhere |

Category D exits this protocol. Send it to `decay` and read the diagnosis it returns, or
to `/seo drift compare` if a deploy landed in the window. Category A gets recorded and
deprioritised: there is no reliable lever that removes a citation while keeping the rank,
and pursuing one usually means removing the content that earned the rank.

Work B and C only. If B and C together cover fewer than 5 of the 20 queries, stop and read
the stop signals at the end of this file.

## Phase 2: diagnose

### Access checklist

Run this before touching any content. A page that cannot be fetched cannot be cited, and
rewriting it changes nothing.

- `robots.txt` allows `Googlebot`. AI Overviews and AI Mode are served through Googlebot.
- `Google-Extended` is **not** required. It governs Gemini model training, not AI
  Overviews, and blocking it does not affect Search or AI Overviews. Unblock it only if
  the site intends to permit Google model training, which is a separate decision with
  separate consequences. Do not put it on a recovery checklist as a fix.
- The URL returns 200 to Googlebot, with the answering content in the initial HTML
  response rather than injected by JavaScript.
- The page is indexed, and the Google-selected canonical is the URL being worked on.
- Snippets are not suppressed: no `nosnippet`, no `max-snippet:0`, no `data-nosnippet`
  wrapping the block that answers the query.
- The property is included in Search generative AI features. That opt-in is an eligibility
  gate, not a tactic, and it outranks everything in phase 3.

### Content checklist

For each B and C query, on the page that ranks:

- The exact question in the query is answered somewhere on the page, in words a reader
  would recognise as an answer.
- The answer sits at the top of its own section, not after a preamble about the field.
- The numbers and dates on the page are current, and each one names where it came from.
- For category C, open the competitor page the AIO cites and record what it carries that
  the page does not: first-party data, a comparison table, a named author, a recent date,
  a specific figure. That difference is the finding, not "their content is better".

## Phase 3: reshape

### On the word counts circulating in the industry

This protocol carries no passage-length target. Not "40 to 60 words", not "30 words", not
"134 to 167 words". Those numbers are descriptive artifacts of snippet truncation reversed
into prescription: vendors scraped featured snippets, found most paragraphs clustering
where Google truncates and published the cluster as a rule. Google states there is no ideal
page length and no requirement to chunk content. This plugin removed its own length rules
with the reasoning written down ([geo.md](geo.md) keeps that note), and reintroducing them
here through a recovery checklist would undo the same work. Counting words optimises for
the measuring instrument.

What replaces them are rules about structure and legibility, which are checkable by
reading rather than by counting.

1. The first sentence of a section answers the question its heading asks. Not context, not
   history, not a definition of the discipline.
2. The expansion that follows carries the specifics: quantities, dates, versions, named
   sources. The first sentence is the answer, the rest is the evidence for it.
3. A sub-question becomes a heading. When one paragraph quietly answers three questions,
   it is three sections that have not been split yet.
4. Each answer block reads on its own. No pronoun in it points at something outside it,
   and no sentence in it depends on the paragraph above to make sense.
5. Comparative content goes in a table. Sequential content goes in an ordered list. Prose
   is the wrong container for both, for a reader as much as for a machine.
6. Claims are attributed where they appear, with the source and the date inline, not
   collected in a footnote block at the bottom.
7. Nothing in the answering block requires JavaScript to render.

### Schema warning

Add `Review` or `AggregateRating` markup only when the page carries genuine first-party
reviews from real customers, displayed on the page. A self-assigned rating is structured
data spam under Google's policies and carries manual action risk, which costs more than
any AI Overview citation is worth. The same applies to marking up a review count the page
does not show.

`FAQPage` and `HowTo` no longer produce rich results (HowTo withdrawn September 2023, FAQ
rich results removed for all sites May 7, 2026). Adding either one as a recovery tactic
buys nothing, and `/seo schema` will flag it.

## Phase 4: read back

Windows are fixed now, before the change ships, per [measurement.md](measurement.md). Keep
a control set: queries with the same symptom that were deliberately left untouched.

| Read-back | What to expect | What to do |
|---|---|---|
| T+7 | usually nothing at all. AI Overview composition changes on Google's schedule, not the site's | record the null result, change nothing |
| T+14 | first plausible category movement, B toward A | re-classify the 20 queries, same device and country as phase 1 |
| T+28 | the decision point | apply the exit criterion below |

**Exit criterion.** The treated queries have moved to category A, or their CTR delta
against the control set has recovered to better than minus 10 percent, and either result
holds across two consecutive read-backs. Anything else closes as `Keep testing` or
`Unproven`. `Unproven` means the test could not tell, not that the change failed, and it
is not written up as a recovery.

## Stop and reframe

Three signals mean this protocol is the wrong one and continuing will produce a confident
wrong answer.

1. **Impressions are falling too.** Then the clicks are not being absorbed by an answer
   box, the page is being shown less. Run `decay` and act on the diagnosis it returns
   (`ranking` or `visibility`), not on this file.
2. **Category D dominates the sample.** If most affected queries show no AI Overview at
   all, something else changed in the SERP or in the intent behind the query. Reframe
   before spending a rewrite cycle.
3. **The control set moved with the treated set.** A CTR drop that includes the queries
   nobody touched is site-wide: a title template change, a brand event, a tracking or
   consent change. The AI Overview hypothesis is a coincidence and the cause is elsewhere.

## Error handling

| Scenario | Action |
|---|---|
| No Search Console export available | The phase 1 filter cannot be built. Say so plainly and do not substitute a guess at which queries are affected. Offer the export path from [search-console.md](search-console.md). |
| Only one period of data exists | Capture the current window as the reference and schedule the comparison. A single window cannot show a CTR change. |
| SERP checks cannot be run | Categories A to D cannot be assigned, so the protocol stops at phase 1. Report the access checklist results alone and label them as such. |
| The AI Overview cites the site but the page it cites is the wrong one | This is a canonical or an internal-linking problem, not a content one. Route to `/seo technical` and the indexing grid in [search-console.md](search-console.md). |
| The user asks for a passage word count | Give the structure rules above and the reason the length rules were removed. Do not supply a number to satisfy the request. |
| Rankings dropped during the window | Not this protocol. Position was the entry condition, so re-run phase 1 on the current data before continuing. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|---|---|
| Build the query filter and the period comparison | [search-console.md](search-console.md) |
| Read-back windows, control sets, evidence labels | [measurement.md](measurement.md) |
| Crawler access, snippet directives, generative AI opt-in | `/seo geo` |
| Rendering, status codes, canonical | `/seo technical` |
| Schema validation before adding markup | `/seo schema` |
| Recommendation format | [action-plan.md](action-plan.md) |
