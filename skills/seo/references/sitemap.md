---
name: seo-sitemap
description: >
  XML sitemap validation and generation. Validates format, URLs, and structure.
  Generates new sitemaps with industry templates. Use for: "sitemap", "generate
  sitemap", "sitemap audit", "XML sitemap", "sitemap errors", "sitemap index",
  "sitemap validation", "missing sitemap".
version: 1.8.1
---

# XML Sitemap Analysis & Generation

## Two modes

- **`sitemap [url]`** — Validate an existing sitemap at the given URL
- **`sitemap generate`** — Generate a new sitemap from a crawled site or provided URL list

---

## Validation Mode

### Step 1 — Locate the sitemap

Check in this order:
1. `/sitemap.xml` (most common)
2. `/sitemap_index.xml`
3. `robots.txt` → `Sitemap:` directive (may reference non-standard path)
4. `/sitemap/` directory
5. Common CMS paths: `/wp-sitemap.xml` (WordPress), `/sitemap/sitemap.xml` (Shopify)

If none found: report as missing, recommend creation, proceed to Generation Mode guidance.

### Step 2 — Parse and validate

**Format checks:**
- Valid XML syntax (no parse errors)
- Correct namespace: `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`
- `<urlset>` or `<sitemapindex>` as root element
- Each `<url>` contains `<loc>` (required), optionally `<lastmod>`, `<changefreq>`, `<priority>`

**URL checks (per entry):**
- `<loc>` is an absolute URL (starts with https://)
- URL is accessible (200 response), not redirected, not returning 4xx/5xx
- URL is not blocked by robots.txt
- URL is not tagged with `noindex`
- URL matches the canonical version of the page

**Structural checks:**
- Total URL count ≤ 50,000 per sitemap file (Google limit)
- File size ≤ 50MB uncompressed
- Sitemap index used for sites with >50,000 URLs
- `<lastmod>` uses W3C Datetime format: `YYYY-MM-DD` or `YYYY-MM-DDThh:mm:ss+00:00`

**Quality checks:**
- Important pages present (homepage, key landing pages, product/category pages)
- Orphan URLs: pages in sitemap not linked from anywhere on the site
- Missing URLs: important pages found via crawl but absent from sitemap
- `<priority>` values: flag if all set to 1.0 (meaningless inflation — use to reflect relative importance)
- `<changefreq>` accuracy: flag "always" or "hourly" for static content

**Sitemap index checks (if present):**
- All child sitemaps are reachable
- No circular references
- Each child sitemap is individually valid

### Step 3 — Score and report

| Issue | Severity |
|-------|----------|
| Sitemap missing | Critical |
| Sitemap not referenced in robots.txt | High |
| >5% of URLs returning non-200 | High |
| noindex URLs included | High |
| Important pages missing | High |
| Invalid XML format | Critical |
| File >50MB or >50k URLs without index | High |
| Incorrect `<lastmod>` format | Medium |
| All `<priority>` = 1.0 | Medium |
| Orphan URLs in sitemap | Medium |
| `<lastmod>` older than 12 months for frequently updated content | Low |

---

## Generation Mode

### Business type detection

Detect site type from homepage signals, then use the appropriate template:

| Type | Sitemap strategy |
|------|-----------------|
| **Blog / Publisher** | Main + posts sitemap, optionally news sitemap |
| **E-commerce** | Main + products + categories + pages sitemaps |
| **SaaS / Software** | Main + blog + feature pages |
| **Local Business** | Main + location pages + blog |
| **Portfolio** | Simple single sitemap |
| **Generic** | Single sitemap with all crawlable pages |

### Standard sitemap template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about/</loc>
    <lastmod>2025-11-01</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Sitemap index template (for large sites)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2026-01-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
    <lastmod>2026-01-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2026-01-15</lastmod>
  </sitemap>
</sitemapindex>
```

### Priority guidelines

| Page type | Priority | Changefreq |
|-----------|----------|------------|
| Homepage | 1.0 | monthly |
| Top-level landing pages | 0.9 | monthly |
| Blog index, product categories | 0.8 | weekly |
| Individual blog posts | 0.7 | monthly |
| Individual product pages | 0.7–0.8 | weekly |
| Secondary pages (about, contact) | 0.6 | yearly |
| Tag/archive pages | 0.4 | weekly |

### What to exclude

Never include in a sitemap:
- Pages with `noindex` meta tag
- Paginated pages beyond page 1 (unless canonical is set correctly)
- URL parameters that create duplicates (`?sort=`, `?color=`, `?session=`)
- Admin, login, checkout pages
- 404, 301, 302 pages
- Staging / development URLs

### robots.txt integration

After generating, always provide the robots.txt directive to add:
```
Sitemap: https://example.com/sitemap.xml
```

### Submission guidance

1. Google Search Console → Sitemaps → Submit
2. Bing Webmaster Tools → Sitemaps → Submit
3. IndexNow (for Bing/Yandex/Naver) — instant notification of new/updated URLs; setup and tooling in [indexnow.md](indexnow.md)

---

## Output

### Validation Report
- **Sitemap Health Score: XX/100**
- Sitemap location confirmed or not found
- Total URLs: X
- Issues by severity
- List of broken/non-200 URLs
- List of missing important pages
- Recommended fixes

### Generation Output
- Ready-to-use XML sitemap file (`sitemap.xml`)
- Sitemap index if multiple sitemaps needed
- robots.txt `Sitemap:` directive
- Submission instructions

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No sitemap found at standard paths | Check robots.txt for custom path. If none, report as missing and proceed to generation guidance. |
| Invalid XML | Report specific parse error (line/column). Provide corrected version. |
| Sitemap too large (>50MB or >50k URLs) | Flag as critical. Generate sitemap index splitting into topical sub-sitemaps. |
| 4xx/5xx URLs in sitemap | List all affected URLs. Recommend removal from sitemap and fixing or redirecting the pages. |
| noindex pages in sitemap | List the conflicting pages. This sends mixed signals to Google. Remove from sitemap or remove the noindex tag. |
| robots.txt blocks sitemap location | Flag as critical. Both the sitemap file itself must be accessible and referenced in robots.txt. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Full technical audit including sitemap | `/seo technical` |
| Full site audit | `/seo audit` |
| Hreflang sitemaps (multi-language) | `/seo hreflang` |
| Programmatic SEO sitemap considerations | `/seo programmatic` |
| Site build with proper URL structure | `/siteasy build` |
