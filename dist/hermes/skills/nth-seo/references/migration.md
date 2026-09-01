---
name: seo-migration
description: >
  Six-step site migration protocol: freeze the current state, map the risk, build and
  validate a redirect map, QA in preproduction, run the cutover with a rollback trigger
  and diff at T+1, T+7 and T+30. Use for: "site migration", "we are changing domain",
  "replatforming", "new URL structure", "redesign without losing traffic", "redirect
  map", "we migrated and lost traffic", "CMS change SEO".
version: 2.3.0
---

# Site Migration

A migration is the only routine operation that can remove a site from search results
overnight, and almost every failure traces to one of two things: a state nobody recorded
before the change or a redirect map nobody validated. The six steps below exist to close
those two gaps. Run them in order. Steps 1 to 4 happen before anything ships.

## Step 1: freeze the state

Nothing after this step can be judged without it. A migration measured against memory is
not measured.

| Artifact | Content | How to get it |
|---|---|---|
| URL inventory | every known URL with its response code, its declared canonical and its full redirect chain | crawl, plus the sitemap, plus a Search Console page export |
| Keyword baseline | the top 100 queries with clicks, impressions, CTR and average position | Search Console export, per [search-console.md](search-console.md) |
| Traffic baseline | the top 50 URLs by organic sessions, each with its share of total organic traffic | analytics export |
| Link value flags | every URL carrying 10 or more referring domains | `/nth-seo backlinks` |
| Schema snapshot | the JSON-LD emitted by each template, one sample URL per template | crawl with structured data extraction |

Two flags come out of this step and drive everything after it. A URL carrying more than 1
percent of total organic traffic is **priority**. A URL with 10 or more referring domains
is **high value**. Both flags travel into the redirect map and into the cutover spot
checks. The 1 percent and the 10 links are dials: on a site with 30 pages the first
catches everything and on a site with 300,000 it catches nothing, so set them against the
actual traffic distribution and record the values used.

`/nth-seo drift baseline` already captures a large part of this (technical health, on-page
elements, schema, AI crawler access, internal linking). Run it first and fill the gaps
rather than starting from a blank page. Store its output alongside the exports, since
`/nth-seo drift compare` after cutover is only as good as what was captured here.

## Step 2: map the risk

Score the migration by what is actually changing. The impact figures below are planning
envelopes to budget against, not measured constants, and the recovery windows assume the
redirect map is correct. Record the observed figures afterwards and calibrate.

| Change | Impact | Recovery window |
|---|---|---|
| URL structure changes (paths, slugs, folder depth) | traffic loss of 20 to 40 percent | 2 to 12 weeks |
| Domain change | Critical: every signal has to be reassociated with a new host | 4 to 16 weeks |
| Indexing directives change (robots.txt, meta robots, canonical policy) | Critical: a wrong directive removes pages from the index regardless of everything else | days to deindex, weeks to recover |
| CMS or platform change | High: templates regenerate titles, headings, schema and internal links at once | 2 to 8 weeks |
| Template or markup change at constant URL | Medium: on-page signals move silently while URLs look untouched | 1 to 4 weeks |
| Navigation or internal link change | Medium: crawl depth and link distribution shift across the whole site | 2 to 8 weeks |
| Hosting, CDN or protocol change | Medium: response times, status codes, HSTS and mixed content | days |

A migration that changes several rows at once does not add the risks, it hides them.
When the domain, the URLs and the templates all move together, a traffic drop cannot be
attributed to any of them, and the only remaining diagnosis is a full re-audit. Where the
schedule allows, ship the rows separately with a measurable gap between them.

## Step 3: build the redirect map

One CSV, one row per old URL, four columns.

```csv
old_url,new_url,reason,priority
https://old.example.com/blog/seo-guide,https://example.com/guides/seo,path-restructure,priority
https://old.example.com/blog/seo-guide-2019,https://example.com/guides/seo,consolidation,high-value
https://old.example.com/tags/seo,,retired,low
```

Rules the map must satisfy before anyone runs it:

1. **No chains.** If A points to B and B points to C, rewrite the map so A points to C and
   B points to C. Resolve transitively until every entry reaches its destination in one
   hop. Chains lose signal at every step and multiply latency for the crawler.
2. **No loops.** No entry may have `old_url` equal to `new_url`, and no cycle may exist
   across entries. A loop returns a redirect error and takes the URL out of the index.
3. **Permanent means 301.** Use 302 only for genuinely temporary moves and record the
   date it will be revisited.
4. **One equivalent, not the homepage.** A content URL redirected to the homepage is a
   soft 404 in practice. When no equivalent exists, redirect to the closest parent
   category or leave the URL to return a real 404 with `reason` set to `retired`.
5. **Absolute URLs on both sides**, with the final protocol and the final host, so the map
   can be diffed against the crawl without normalisation.
6. **Priority carries over** from step 1. Every priority and high-value URL appears in the
   map explicitly, never covered only by a wildcard rule.

Validate the file before it ships: duplicate `old_url` values, entries whose `new_url` also
appears as an `old_url` (the chain test), self-referencing rows and any priority URL from
step 1 that is absent. All four checks are a sort and a join over the CSV.

## Step 4: preproduction QA

Run against the staging build, with the step 1 artifacts open beside it.

- Crawl staging from the full URL inventory, not from its own navigation. Navigation only
  finds what the new site links to, which is the set that was never at risk.
- Execute the redirect map against staging and assert two things per row: the status code
  is 301 and the final URL after one hop equals `new_url`.
- Canonical tags resolve to the production host, not the staging host. Templated canonicals
  built from the current hostname are the most common way a staging URL reaches the index.
- `robots.txt` on staging blocks everything, and removing that block is an explicit line on
  the cutover checklist rather than an assumption.
- Compare titles, H1s and meta descriptions per template against the step 1 snapshot.
  Report every template where they changed, then confirm each change was intended.
- Compare the emitted JSON-LD per template against the schema snapshot. A replatform that
  silently drops `Product` or `Organization` markup passes every visual review.
- Hreflang, if present, points at the new URLs on both sides of every pair.
- A missing page returns a real 404 or 410, not a 200 with an error message in the body.

## Step 5: cutover day

| # | Action | Verification |
|---|---|---|
| 1 | Lower DNS TTL at least 24 hours ahead | `dig` shows the reduced TTL |
| 2 | Deploy the redirect map with the switch, not after it | spot check 10 rows including every priority URL |
| 3 | Publish the production `robots.txt` and read it back from the live host | the staging block is gone, `Googlebot` is allowed |
| 4 | Submit the new sitemap, keep the old one available | both accessible, new one submitted in Search Console |
| 5 | Verify the new property in Search Console, then file Change of Address if the domain moved | property verified before traffic arrives |
| 6 | Ping the changed URLs through IndexNow | see [indexnow.md](indexnow.md) |
| 7 | Spot check the top 50 URLs from step 1 by hand | each returns 200 at its new URL in one hop |
| 8 | Start watching the 404 rate on old URLs | logs or analytics, hourly for the first day |

**Rollback trigger, day 1.** If requests to old URLs returning 404 exceed 5 percent of
total requests to old URLs over the first 24 hours, roll back and fix the map offline. The
5 percent is a dial set against the site's own traffic distribution, and the reason it is
low is that the 404s land on the highest-traffic URLs first, so the traffic share of the
failure is always worse than its URL share.

## Step 6: diff on schedule

Read-back windows are fixed here, before cutover, per [measurement.md](measurement.md).

| Window | Diff | Flag |
|---|---|---|
| T+1 | full crawl of the old URL inventory | every URL that should redirect and does not return 2xx after exactly one hop |
| T+7 | traffic per URL against the step 1 baseline | any URL down more than 30 percent, plus every priority URL regardless of size |
| T+30 | rankings and clicks per query against the keyword baseline | queries lost entirely, then queries down more than one position band |

T+1 is a correctness check and its findings are bugs, fixed the same day. T+7 is too early
to judge the migration and too late to ignore a broken redirect, so read it for outliers
rather than for a verdict. T+30 is the first window where a ranking comparison means
anything.

Run `/nth-audit compare` against the pre-migration audit for the structural diff, and
`compare` from [search-console.md](search-console.md) for the performance diff. Both need
equal-length windows ending at today minus 3 days, which for T+30 means the pre-migration
window has to be exported before cutover, not reconstructed after it.

## Seven reasons to stop

Any one of these blocks the launch or reverses it if the launch already happened.

1. A redirect chain longer than one hop anywhere in the map.
2. A URL with significant traffic and no permanent redirect, whether it was missed or was
   left pointing at a 404.
3. A canonical on a new URL pointing back to the old URL. Google is being told the old URL
   is the real one while the old URL redirects to the new one, and the pair cancels out.
4. A staging `robots.txt` live on production or a `noindex` inherited from a template.
5. A loop in the redirect map or a row whose `old_url` equals its `new_url`.
6. Content URLs redirected in bulk to the homepage instead of their closest equivalent.
7. No sitemap covering the new URL set 24 hours after cutover.

## Error handling

| Scenario | Action |
|---|---|
| No baseline was captured before the migration | Say plainly that the loss cannot be quantified. Capture the current state as the new baseline, reconstruct what the 16 months of Search Console history still hold and label everything else unavailable rather than estimating it. |
| The old site is already offline | The URL inventory has to come from the sitemap archive, Search Console and the backlink profile. Report the inventory as incomplete and name what is missing. |
| The redirect map exists but was never validated | Run the four checks from step 3 against the live site before anything else. A map that was written and never tested is an untested map regardless of who wrote it. |
| Traffic dropped and the change touched several risk rows at once | Attribution is not available. Say so, then work the checklists in order (indexing directives, redirects, canonicals, templates) rather than guessing at a cause. |
| Rankings recovered but clicks did not | Not a migration problem any more. Route to [ai-overview-recovery.md](ai-overview-recovery.md) or to `ctr-gap` for a snippet diagnosis. |
| The user asks how long recovery takes | Give the window from the step 2 row that matches what changed, labelled as a planning envelope. Do not promise a date. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|---|---|
| Pre-migration state capture and post-migration diff | `/nth-seo drift baseline`, `/nth-seo drift compare` |
| Structural before and after comparison | `/nth-audit compare` |
| Traffic, keyword and CTR baselines and diffs | [search-console.md](search-console.md) |
| Read-back windows and control sets | [measurement.md](measurement.md) |
| Redirects, canonicals, status codes | `/nth-seo technical` |
| High-value URL identification | `/nth-seo backlinks` |
| Sitemap generation and validation | `/nth-seo sitemap` |
| Instant indexing after cutover | [indexnow.md](indexnow.md) |
