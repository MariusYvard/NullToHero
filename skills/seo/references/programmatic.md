---
name: seo-programmatic
description: >
  Programmatic SEO for pages generated at scale from data sources. Template
  engines, URL patterns, internal linking automation, content variations,
  deduplication, quality safeguards. Use for: "programmatic SEO", "scale pages",
  "template pages", "location pages", "data-driven pages", "programmatic content",
  "doorway pages", "thin content at scale".
version: 1.8.1
---

# Programmatic SEO

## Two modes

- **`programmatic [url]`** — Audit existing programmatic pages for quality, thin content, and cannibalization
- **`programmatic plan`** — Design a new programmatic SEO strategy from scratch

---

## What is programmatic SEO

Programmatic SEO generates large numbers of pages from structured data sources (databases, CSVs, APIs) using templates. Each page targets a specific keyword combination. Common examples:

- Job boards: "Software Engineer Jobs in [City]" — thousands of city × job title pages
- Travel: "Flights from [City A] to [City B]" — millions of route combinations
- Real estate: "[Number] Bedroom Apartments in [Neighborhood]"
- Directories: "[Business Type] in [City]" — Yelp, TripAdvisor
- Tool sites: "[Currency A] to [Currency B] converter"

---

## Quality Gates

**These apply before and during any programmatic SEO project.** This table is the anchor of
`L-PROG-1`. Four tiers, and the distance between the third and the fourth is the whole point: 500 pages
buys a full audit, 5,000 buys a refusal. Any summary that collapses them relabels the alert as the stop.

| Threshold | Action |
|-----------|--------|
| < 100 pages | Standard SEO practices apply. No special treatment needed. |
| 100–499 pages | WARNING — ensure each page has genuine unique value. Audit a 10% random sample. |
| 500–4,999 pages | HIGH ALERT — full quality audit required. Define minimum content uniqueness per page. |
| 5,000+ pages | HARD STOP — present detailed thin content prevention plan before proceeding. Google may apply site-wide quality signals. |

---

## Audit Mode

### Step 1 — Identify the programmatic pattern

Detect repeating URL patterns:
- `/jobs/[title]-[city]/`
- `/hotels/[city]/[stars]-star/`
- `/products/[category]/[brand]/`
- `/[city]/[service]/`

### Step 2 — Sample and evaluate content quality

Select a representative sample (minimum 20 pages across different variable combinations):

**Thin content signals:**
- Identical or near-identical body text across pages
- Only the [City]/[Brand]/[Variable] changes, everything else is the same
- Less than 200 words of unique content per page
- No page-specific data points beyond the template variable
- Template placeholders not filled (empty sections, "N/A" fields)
- No unique images (same stock photo on all pages)

**Doorway page signals** (Google penalty risk):
- Pages exist primarily for search engines, not users
- No unique value — just keyword combinations
- Redirect users off the page immediately
- Nearly identical experience to every other page in the set

### Step 3 — Cannibalization check

Pages targeting the same keyword intent compete against each other.

Example of cannibalization:
- `/plumber-london/` AND `/emergency-plumber-london/` AND `/london-plumber/` — all targeting the same intent.

Check for:
- Multiple pages ranking for the same query
- Pages with overlapping keyword targets
- Duplicate `<title>` tags across the set

### Step 4 — Technical checks

**Canonical strategy:**
- Each programmatic page should be self-canonical
- Paginated variants must self-canonicalize. Do not point page 2 and beyond at page 1: Google's own
  pagination guidance says "Don't use the first page of a paginated sequence as the canonical page.
  Instead, give each page its own canonical URL." And `rel="next"` / `rel="prev"` stopped being an
  indexing signal on 21 March 2019, so do not emit them for Google (other engines may still read them).
  Source: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading (verified August 2026)
- Faceted navigation parameters must either have a canonical or be blocked via robots.txt

**Index bloat prevention:**
- Low-value combinations (zero search volume, no data to fill) should be `noindex`
- Or excluded from sitemap and blocked via robots.txt
- Empty result pages ("0 jobs found") must never be indexed

**URL parameters:**
- Parameters that create duplicate content (`?sort=`, `?color=`) → canonical to base URL, or disallow the
  parameter pattern in robots.txt. The Search Console URL Parameters tool was deprecated on 28 March 2022
  and switched off a month later, so there is nothing to configure there.
  Source: https://developers.google.com/search/blog/2022/03/url-parameters-tool-deprecated (verified August 2026)
- Parameters that create distinct indexable content → must have unique, crawlable URLs

---

## Planning Mode

When `/seo programmatic plan` is called:

### Step 1 — Identify the keyword matrix

Define the dimensions that generate the keyword combinations:

```
Dimension 1 (primary): Service type
  → "plumber", "electrician", "cleaner"

Dimension 2 (modifier): Location  
  → "London", "Manchester", "Birmingham"

Template: "[Service] in [Location]"
Total pages: 3 × 3 = 9 (small scale)
```

For large matrices, calculate total combinations and apply quality gates before proceeding.

### Step 2 — Define the minimum viable page

Each page must provide genuinely unique value. Define what makes each page distinct:

| Element | How to make it unique |
|---------|----------------------|
| Title / H1 | Include both variables: "Plumbers in London, UK" |
| Introduction paragraph | Reference city-specific context (population, areas served) |
| Data-driven content | Local pricing, availability, review counts specific to that location |
| Unique stats/facts | Pull from a real data source per page |
| Local reviews/testimonials | Filter to location-specific reviews |
| Map or service area | Genuine local context |
| Related pages | Internal links to nearby cities or related services |

### Step 3 — URL structure

**Pattern selection:**
```
Good:   /locations/[city]/[service]/
Good:   /[service]-in-[city]/
Avoid:  /page/?city=[city]&service=[service]  (parameter-based)
Avoid:  /[city]-[service]-[modifier]-services/  (too keyword-dense)
```

Rules:
- Use hyphens, no underscores
- Lowercase always
- Max 3-4 path segments
- Human-readable without decoding

### Step 4 — Internal linking automation

Programmatic pages must be internally linked to be crawled and pass PageRank.

**Hub-and-spoke model:**
- Category hub page → links to all city variants for a service
- City hub page → links to all service variants in that city
- Each programmatic page → links to 3-5 geographically or topically related pages

**Avoid:**
- Programmatic pages with no inbound internal links (orphans)
- Linking every page to every other page (creates crawl traps for large sets)

### Step 5 — Content generation strategy

| Scale | Approach |
|-------|---------|
| < 100 pages | Write manually or with AI assistance + human review |
| 100–1,000 pages | AI-generated with structured data injection + spot-check review |
| 1,000–10,000 pages | Automated templates + data enrichment + sample auditing |
| 10,000+ pages | Requires dedicated data infrastructure + ongoing quality monitoring |

**Data sources for unique content:**
- First-party databases (product inventory, customer reviews, local data)
- Licensed datasets (weather, census, real estate data)
- Aggregated user-generated content
- Structured data from partner APIs

---

## Output

### Audit Report
- **Programmatic SEO Health Score: XX/100**
- Pattern detected: [URL template]
- Total pages estimated: X
- Thin content rate: XX% of sampled pages
- Cannibalization issues: X groups of overlapping pages
- Technical issues: [list]
- Quality gate status: PASS / WARNING / HARD STOP

### Planning Document (`PROGRAMMATIC-PLAN.md`)
- Keyword matrix dimensions and total page count
- Minimum viable page definition
- URL structure
- Internal linking strategy
- Content generation approach
- Quality control process
- Phased rollout plan (start with 50 pilot pages, measure, then scale)

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Doorway page patterns detected | Flag as high risk. Explain Google's doorway page policy. Recommend adding genuine unique value or consolidating pages. |
| Hard stop threshold exceeded | Refuse to generate the full page set without a quality plan. Present the quality gate requirements explicitly. |
| Zero-search-volume pages | Recommend noindexing or excluding from sitemap. These consume crawl budget without returning traffic. |
| Faceted navigation creating duplicates | Recommend a canonical strategy, or robots.txt disallow rules. Never Search Console parameter handling, that tool is gone. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| URL structure and canonicals | `/seo technical` |
| Sitemap for programmatic pages | `/seo sitemap` |
| Schema for programmatic pages | `/seo schema` |
| Content quality audit | `/seo content` |
| Semantic clustering to find keyword matrix | `/seo cluster` |
| Full audit | `/seo audit` |
