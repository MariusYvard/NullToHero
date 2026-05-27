---
name: seo-drift
description: >
  SEO drift monitoring — capture a baseline, compare current state, detect
  degradation over time. Use for: "SEO changes", "track ranking drops",
  "baseline SEO", "monitor SEO", "SEO regression", "detect SEO problems",
  "compare before after", "SEO drift", "SEO monitoring".
version: 1.0.0
user-invocable: true
argument-hint: "[baseline|compare|history] [url]"
---

# SEO Drift Monitoring

## Three subcommands

- **`drift baseline [url]`** — Capture the current SEO state of a site as a reference point
- **`drift compare [url]`** — Compare current state against the stored baseline, show what changed
- **`drift history [url]`** — Show the history of all snapshots and changes for a domain

---

## Baseline Capture (`drift baseline [url]`)

### What to capture

For each site, capture a structured snapshot of 8 SEO dimensions:

**1. Technical Health**
- HTTP status of homepage and top 5 pages
- robots.txt content (exact text)
- sitemap.xml location and URL count
- HTTPS redirect: http:// → https:// working?
- canonical tag on homepage
- Meta robots tag on homepage
- Page speed: approximate LCP signal (fast/slow based on response time)

**2. Indexability Signals**
- Homepage indexed? (check via `site:domain.com` or infer from crawl)
- Any `noindex` on key pages?
- Crawl depth: is the homepage reachable? Are key pages within 3 clicks?

**3. On-Page Elements (homepage + top 5 pages)**
- `<title>` tag content
- `<meta name="description">` content
- H1 content
- Word count estimate
- Primary keyword presence in title/H1

**4. Schema Markup**
- Schema types present on homepage
- Schema types present on key pages
- Validation status (any obvious errors)

**5. AI Crawler Access**
- robots.txt rules for: GPTBot, ClaudeBot, PerplexityBot, ChatGPT-User
- llms.txt: present / absent

**6. Internal Linking**
- Number of internal links on homepage
- Navigation structure (top-level items)

**7. Content Freshness**
- `<lastmod>` in sitemap for key pages
- Visible publication/update dates on articles
- Copyright year in footer

**8. Performance Indicators**
- Presence of `<link rel="preload">` or `fetchpriority="high"` for LCP
- Presence of `loading="lazy"` on images
- Web font loading strategy

### Snapshot storage

Store as `SEO-BASELINE-[domain]-[YYYY-MM-DD].md` in the project root with:
```markdown
---
domain: example.com
captured: 2026-01-15T10:30:00Z
version: 1
---
[Structured JSON-like data for each dimension]
```

---

## Comparison (`drift compare [url]`)

Compare current state to the most recent baseline. Output a diff report.

### Change severity classification

| Change type | Severity | Why it matters |
|-------------|----------|----------------|
| noindex added to key pages | 🔴 Critical | Pages will be deindexed |
| robots.txt now blocks Googlebot | 🔴 Critical | Entire site blocked from crawling |
| Redirect to wrong URL | 🔴 Critical | Traffic loss |
| AI crawlers newly blocked | 🟠 High | Loss of AI search visibility |
| H1 changed significantly | 🟠 High | Keyword targeting changed |
| Title tags changed | 🟠 High | CTR and keyword signals |
| Schema markup removed | 🟠 High | Rich results loss |
| llms.txt removed | 🟡 Medium | AI discoverability weakened |
| `<lastmod>` dates not updated | 🟡 Medium | Freshness signal degraded |
| Internal link count decreased >20% | 🟡 Medium | PageRank distribution changed |
| Word count decreased >30% | 🟡 Medium | Content thin signal |
| Performance indicators removed | 🟢 Low | LCP may have regressed |
| Footer copyright year outdated | 🟢 Low | Minor trust signal |

### Comparison output format

```markdown
## SEO Drift Report — example.com
Baseline: 2025-10-01 | Current: 2026-01-15 | Delta: 106 days

### 🔴 Critical Changes (immediate action required)
- [change description] — was: [old value] → now: [new value]

### 🟠 High-Impact Changes
- [change description]

### 🟡 Medium Changes
- [change description]

### 🟢 Minor Changes
- [change description]

### No Change
- Technical health: unchanged
- HTTPS redirect: unchanged
- [...]

### Recommendations (priority order)
1. [most urgent fix]
2. [next fix]
```

---

## History (`drift history [url]`)

List all available snapshots for a domain and show a timeline of key changes:

```markdown
## SEO History — example.com

| Date | Event | Details |
|------|-------|---------|
| 2026-01-15 | Snapshot | Baseline captured |
| 2026-02-01 | Snapshot | Compared — 2 high-impact changes found |
| 2026-03-01 | Snapshot | Compared — 1 critical change (noindex added) |
```

---

## When to use drift monitoring

**Set a baseline before:**
- A major site redesign or migration
- Switching CMS or hosting provider
- A developer "cleanup" or dependency update
- Before launching a new SEO campaign (establish before-state)

**Run a comparison after:**
- Any deployment to production
- A ranking drop (to identify what changed)
- A Google algorithm update (to see if the site was affected)
- Monthly as part of ongoing SEO maintenance

---

## Output

### Baseline Report (`SEO-BASELINE-[domain]-[date].md`)
Complete structured snapshot of all 8 SEO dimensions.

### Drift Report (`SEO-DRIFT-[domain]-[from]-[to].md`)
Change diff with severity classification and prioritized action plan.

### History Log (`SEO-HISTORY-[domain].md`)
Running log of all snapshots and their comparison results.

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No baseline found for domain | Prompt the user to run `drift baseline` first. Generate the baseline from the current state. |
| Site unavailable during comparison | Note that the comparison is incomplete due to connectivity. Report only what was accessible. |
| Multiple baselines for same domain | Use the most recent baseline unless the user specifies a date. |
| Baseline captured from a different subdomain | Flag the mismatch. Confirm whether the comparison should be cross-subdomain or same-subdomain. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Full technical audit (when drift reveals technical issues) | `/seo technical` |
| Full site audit | `/seo audit` |
| Schema validation | `/seo schema` |
| AI crawler access check | `/seo geo` |
| Content quality check | `/seo content` |
