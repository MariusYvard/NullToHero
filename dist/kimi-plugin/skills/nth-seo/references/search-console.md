---
name: seo-search-console
description: >
  Source-agnostic protocol for real search performance data: the six-column input
  contract, the accepted export routes, the windowing rules that stop a partial period
  being compared against a full one, the seven derived analyses in
  skills/seo/scripts/gsc-analyze.mjs and a five-tier indexing grid. Use for: "connect Search
  Console", "GSC export", "my clicks dropped", "striking distance keywords",
  "cannibalisation", "CTR below expected", "compare two periods", "which pages are
  declining", "why is this page not indexed".
version: 2.3.0
---

# Search Console Performance Data

Every other reference in `/nth-seo` infers from the outside: HTML fetched by a crawler, scored against
rules. Search Console holds the only first-party record of what a site was shown for, how often and
at what rank. This file makes that record usable without binding the skill to one way of fetching it.

## Canonical input contract

Every analysis below reads one table with six columns. Nothing else is required.

| Column | Type | Meaning |
|---|---|---|
| `query` | text | the search query |
| `page` | URL | the page that was shown |
| `clicks` | integer | clicks in the window |
| `impressions` | integer | impressions in the window |
| `ctr` | fraction or percent | clicks divided by impressions |
| `position` | decimal | average position in the window |

An export carrying `query` and `page` on the same row is worth more than two exports carrying one
dimension each: the pair is what makes cannibalisation and per-page diagnosis possible. A missing
`ctr` is recoverable when `clicks` and `impressions` are both present.

## Accepted sources

No route is privileged by the analyses. They read rows, not credentials.

| Route | What it costs to set up | What it returns |
|---|---|---|
| Search Console UI, Performance report, Export button | nothing beyond a verified property | up to 1,000 rows per table as CSV, TSV or Sheets |
| BigQuery bulk export | a Google Cloud project, billing enabled, a one-time switch in Search Console settings | every row, appended daily, no truncation |
| Third-party MCP server | an OAuth grant plus trust in the vendor | whatever the vendor chooses to serve |
| Search Analytics API, called directly | a Cloud project, OAuth credentials and code | up to 25,000 rows per request, paged |

### Why the UI export is the recommended route

It has no authentication step, needs no Google Cloud project, consumes no quota and carries roughly
all of the analytical value. The seven analyses run on a ranked table of queries and pages, and a
1,000-row export of a site's top queries already holds the striking-distance band, the cannibalised
queries, the CTR distribution and the decay candidates. The API buys volume on very large sites and
automation on recurring reports. It does not buy a different answer, so recommend that setup work
only once the user has run the analyses on an export and wants them scheduled.

One caution on the MCP route, from [geo.md](geo.md): at least one vendor serves Search Console data,
its own crawler output and undisclosed rank-tracker figures down the same endpoint. Record which
backend produced the rows and treat anything that cannot come from Search Console as an estimate.

## API facts worth knowing

| Fact | Value | Consequence |
|---|---|---|
| Retention | 16 months in the Performance report | older data is unrecoverable, which is the argument for enabling the BigQuery export before anyone needs it |
| Finalisation lag | 2 to 3 days | the API exposes the trade through `dataState`: `final` (default, finalised only), `all` (includes fresh rows), `hourly_all` |
| UI export cap | 1,000 rows, "representative examples" | a truncated export and a small site look identical in the file |
| API row cap | `rowLimit` 1 to 25,000, default 1,000, paged with `startRow` | volume, not a different answer |
| BigQuery export | no row cap | the only route that keeps the tail |
| Quotas per site | Search Analytics 1,200 per minute; URL Inspection 2,000 per day, 600 per minute | batch inspection needs pacing |

Fresh data answers "did today's deploy break something". Final data is the only thing a period
comparison may be built on. Never mix the two inside one comparison, name which one the report used
and record the row cap that applied, since a ranking over a truncated export ranks the head of the
distribution only. URL Inspection takes one URL per call: batch sizes in circulation, 10 per call
being the common one, belong to the wrapper doing the batching rather than to Google. The 500 that
gets misquoted here is not a row cap at all, it is the sitemap index file limit (500 index files
per site, next to 50,000 URLs per sitemap file).

## The windowing trap

> **Search Console has no data for the current day, and the last day or two are still filling in.**
> A window that runs "up to today" therefore carries 1 to 2 empty days. Set it against a complete
> window and the comparison pits a partial period against a full one, manufacturing a decline out
> of missing days. Every variation threshold in this file tips over on that error, and it tips in
> the direction that looks like a real problem, which is why it survives review.

Five rules, applied to every comparison this skill produces:

1. A window ends at today minus 3 days at the earliest. Not yesterday, not today.
2. The two windows are strictly the same length in days. Not "roughly a month".
3. The window length appears in the report, next to the numbers it produced.
4. Windows never overlap. A shared week is counted in both directions and damps every
   delta toward zero.
5. When fresh (non-finalised) data is used in a comparison, the report says so on the
   line where the number appears, not in a footnote.

`gsc-analyze.mjs` enforces what it can see: when two files differ in row count by more than 50
percent, `compare` and `decay` warn on stderr. That catches the gross case, not two windows of
different lengths that happen to hold similar row counts, so rules 1 and 2 stay the operator's job.

## The seven analyses

`node skills/seo/scripts/gsc-analyze.mjs <mode> <file...> [options]`. Pure Node, no dependency, no network,
no authentication. Output is JSON by default, `--markdown` for a table, `--out FILE` to write
instead of printing. Input is CSV (comma, semicolon or tab) or JSON (a plain array, an object with
a `rows` array or the API shape with `keys[]`). English and French Search Console headers are both
recognised. Under 10 usable rows every mode refuses to rank and says so with exit code 0, because
a ranking built on 9 rows is a ranking of noise.

### 1. `striking <file>`

Rows one step from a gain, split into two bands that are scored on one scale so they rank
against each other.

| Band | Condition | Lever |
|---|---|---|
| `title-lever` | position 4 to 10, impressions above 50 | already on page one, so the title and the meta description move the clicks |
| `rank-lever` | position 11 to 20, impressions above 100, CTR under 3 percent | one page away from the fold, so earn the rank first |

Opportunity score is `impressions * max(0, 0.05 - ctr)`, clamped at zero so a row that already
performs never outranks a row with real headroom. The 5 percent target and the two impression
floors are dials, not measurements: `--min-impressions` replaces both floors at once,
`--max-position` moves the ceiling (default 20), `--limit` caps the ranking (default 20).

### 2. `cannibal <file>`

Queries carried by two or more distinct pages, ranked by impressions at stake. Each row
names the page to consolidate on: the one Google already prefers, meaning best average
position, with clicks breaking a tie. `--min-pages` raises the bar above 2. Requires both
the query and the page dimension in the same export.

### 3. `ctr-curve <file>`

Expected CTR per position bucket, calibrated on this site's own rows. Buckets are 1, 2, 3, 4-5,
6-10, 11-20 and 21+, using the median rather than the mean so one viral row cannot set the
baseline. A bucket holding fewer than `--min-rows` rows (default 5) returns `insufficient-data`
and stays null, never interpolated from its neighbours. `--min-impressions` keeps thin rows out
of the medians.

### 4. `ctr-gap <file>`

Rows performing under their own site's expected CTR, ranked by the clicks that closing the gap
would return. A row is flagged when its CTR falls below `expected * tolerance` (default 0.7 via
`--tolerance`). Estimated gain is `impressions * (expected - ctr)`, and rows with a non-positive
gain are dropped. Rows sitting in an uncalibrated bucket are counted as ignored and reported as
such, never judged against a number that was never measured.

### 5. `compare <fileA> <fileB>`

Full outer join between two periods, A being the reference. Joins on query and page together
when both dimensions are present, otherwise on whichever exists. Each row carries a status of
`new`, `lost` or `changed`, click and impression deltas in absolute and percent, a CTR delta and
a position delta written as A minus B, so a positive number reads as an improvement like every
other column. A percentage is null only when the base period is zero, and the status says why.

### 6. `decay <fileA> <fileB>`

Pages losing clicks, with a diagnosis. `--threshold` sets the drop that counts (default
0.20) and `--min-clicks` the floor to be judged at all (default 10, because a 20 percent
drop on 8 clicks is weather). The order of the diagnosis is the point:

| Diagnosis | Test | Reading |
|---|---|---|
| `ranking` | average position worsened by more than 1 | the page lost rank, look at competitors, depth and internal links |
| `visibility` | impressions fell more than 10 percent at a stable position | shown for fewer queries, check indexation, seasonality and query loss |
| `serp-or-ctr` | impressions and position both held | the SERP or the snippet changed under the page |

Rank is tested first because a rank drop drags impressions down with it, and testing
impressions first would file a ranking problem under visibility.

### 7. `matrix <file>`

Four quadrants, clicks against average position, as a census rather than a top list
(`--limit` defaults to 0, meaning all).

| Quadrant | Clicks | Position | Action |
|---|---|---|---|
| `star` | high | good | protect: refresh, keep internal links pointed here |
| `overperformer` | high | weak | best upside on the site: deepen and link, move the rank |
| `underperformer` | low | good | rewrite title and meta description, then confirm the query has volume |
| `declining` | low | weak | rewrite around one intent, merge or retire |

`--traffic-high` (default 500 clicks) and `--position-good` (default 15) are the two dials. Pass
`--previous FILE` and the trend modulates priority: a drop of 20 percent or more raises it, and a
star losing a fifth of its clicks becomes CRITICAL. Under 100 clicks and past position 50 the
action switches to a 301 toward the nearest stronger page, because consolidating the signal beats
rewriting at that volume.

## The crossing that only this plugin does

No Search Console tool knows what is in the HTML. No crawler knows which queries a page
captures. Each half is available separately and neither half is a diagnosis.

A striking-distance row says "this query sits at position 7 with 4,000 impressions and a 1.2
percent CTR". `/nth-seo page` on that URL already knows the title runs to 78 characters and truncates,
the H1 does not contain the query and the page serves informational intent against a transactional
query. Joined, the finding stops being "improve the title" and becomes "position 7, 4,000
impressions, title truncated at 78 characters, no keyword in the H1: the rank is earned and the
click is lost in the snippet". One action, a named cause, a measured size.

Run the join in this order: a ranked list from `striking`, `ctr-gap` or `decay`, then `/nth-seo page`
on the top URLs from that list rather than on the whole site, then findings written as measured
symptom, on-page cause, one action. Format per [action-plan.md](action-plan.md), where the
estimated click gain from `ctr-gap` fills the impact column and is labelled `calculated`.

## Indexing grid

When URL Inspection data is available, classify each result on five tiers.

| Tier | Condition | Why |
|---|---|---|
| Critical | not indexed, yet the performance export shows impressions | the two sources contradict each other, and one of them is about a page earning visibility |
| High | Google-selected canonical differs from the declared canonical, on a page with traffic | Google ignored the declaration and consolidated elsewhere |
| Medium | blocked by robots.txt | a directive is doing something nobody intended |
| Medium | fetch failure (5xx, timeout, redirect error) | the page may be fine and the server is not |
| Low | soft exclusion (crawled and not indexed, discovered and not crawled) on a page with no traffic | often correct behaviour on thin or duplicate pages |

The canonical divergence row is the reason to run URL Inspection at all. A crawl sees the canonical
the site declares. A performance export sees which URL earns impressions. Neither one reveals that
Google read the declared canonical and picked a different URL. Only the inspection result carries
both values side by side, and the gap between them explains traffic a crawl reports as healthy.

## Error handling

| Scenario | Action |
|---|---|
| No export available | Say what is missing and how to get it: Search Console, Performance report, set the date range, Export. Do not substitute estimated volumes for measured ones. Continue with the HTML-derived analyses and label the report as inference. |
| Export has fewer than 10 usable rows | The script refuses and exits 0. Report the refusal as a fact about the export, not as a failure. Suggest a longer window or a wider filter. |
| Position column missing | `striking`, `ctr-curve` and `ctr-gap` exit 0 with `MISSING_COLUMN`. Re-export with the Position column enabled in the Performance report. |
| Page dimension missing | `cannibal` and `decay` exit 0 with `MISSING_COLUMN`. Export the query dimension together with the page dimension. |
| Row counts differ by more than 50 percent between two files | Treat the windowing trap as the first hypothesis, not a traffic collapse. Re-export both windows at equal length, both ending at today minus 3 days. |
| A CTR bucket has no baseline | Rows in that bucket are reported as ignored, with the bucket named. Do not interpolate from neighbouring buckets and do not fall back to a published market curve. |
| Export truncated at the row cap | State the cap that applied and that the tail is unmeasured. A ranking over a truncated export is a ranking over the head of the distribution only. |

## Why the CTR curve is calibrated on this site

Three widely quoted public CTR-by-position tables give three different curves and none of
them names a sample a reader could check. They average over other people's SERPs, other
people's brands and other people's intent mix. Judging a row against a number this site
could never reach produces confident nonsense in both directions: healthy rows on branded
queries get flagged, genuinely broken ones get cleared in verticals where the SERP is full
of features.

A baseline computed from the site's own rows carries the sector, the brand strength and
the SERP layout the site competes in, and it needs no external source to be traceable. The
cost is that thin buckets have no baseline, which the tool reports rather than fills in.
That trade is the one [geo.md](geo.md) makes: a number nobody can trace is worse than no
number, because it survives review by looking precise.

## CROSS-SKILL REFERENCES

| Need | Skill |
|---|---|
| On-page cause behind a measured symptom | `/nth-seo page` |
| Technical cause (robots, canonical, rendering) | `/nth-seo technical` |
| Before and after state around a change | `/nth-seo drift baseline`, `/nth-seo drift compare` |
| AI Overview click loss on stable rankings | [ai-overview-recovery.md](ai-overview-recovery.md) |
| Read-back windows and evidence labels | [measurement.md](measurement.md) |
| Recommendation format | [action-plan.md](action-plan.md) |
