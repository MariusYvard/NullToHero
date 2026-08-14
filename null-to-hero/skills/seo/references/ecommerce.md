---
name: seo-ecommerce
description: >
  E-commerce SEO, product pages, category pages, faceted navigation, product
  schema, marketplace intelligence, review schema, inventory SEO. Use for:
  "ecommerce SEO", "product page SEO", "category page SEO", "product schema",
  "WooCommerce SEO", "Shopify SEO", "faceted navigation", "product reviews SEO",
  "out of stock SEO".
version: 1.8.2
---

# E-commerce SEO

## Audit areas

### 1. Product Pages

Product pages are the primary conversion and ranking asset. Each should be treated as a standalone landing page.

**Common product page SEO failures:**
- Description not unique per product. Manufacturer copy-paste is duplicate content: write one description per product, at the `L-WORD-1` floor for its page type.
- Thin descriptions (1-2 sentences, or just a manufacturer spec list)
- Duplicate descriptions across variants (red vs blue same product = near-duplicate content)
- Price present only in JS. The price must be in the HTML Google receives, not injected client-side, and must match the schema.
- Missing or wrong availability in schema (showing "In Stock" for sold-out products)
- No internal links to related products or categories

### 2. Category Pages

Category pages capture high-volume head terms ("men's running shoes", "wireless headphones"). They are often the most important pages for organic traffic, which is why they are audited before product pages when time is short.

### 3. Product Schema

**Product schema (required for price and availability rich results):** emit `Product` with `name`, `description`, `brand`, `sku`, `mpn`, an `image` array holding several angles rather than a single hero shot, an `offers` block and `aggregateRating` where reviews exist. Inside `offers`, `url`, `priceCurrency`, `price` and `availability` are the properties a model emits unprompted; `priceValidUntil`, `itemCondition` and `seller` are the three it omits, and the offer is incomplete without them.

`availability` must match actual stock.

**April 2025 addition: Product Certification Markup**
```json
"hasCertification": {
  "@type": "Certification",
  "issuedBy": {
    "@type": "Organization",
    "name": "Energy Star"
  },
  "name": "Energy Star Certified",
  "certificationIdentification": "ES-2024-001"
}
```

### 4. Faceted Navigation

Faceted navigation (filters: color, size, brand, price range) is one of the most common sources of duplicate content and crawl waste in e-commerce.

**Problem:** A category page with 5 color filters and 4 size filters generates 20+ URL combinations. Most are near-duplicates.

**Solution matrix:**

| Filter type | Recommended treatment |
|-------------|----------------------|
| Color / size / style variants | Canonical to base category, **or** `noindex`, **or** robots.txt. Never robots.txt combined with either of the others: a disallowed URL is never fetched, so the canonical and the noindex on it are never read. Pick the one that matches the goal, consolidate signal (canonical), keep out of the index (noindex), or save crawl budget (robots.txt). |
| Brand filter (creates distinct, rankable content) | Allow indexing if the brand page has unique content and search demand. |
| Price range filter | Block, no SEO value, pure utility. |
| Sort order (`?sort=price_asc`) | Block, pure utility, no unique content. |
| Condition filter (new/used) | Allow if substantial search demand for "used [product]". |

**Implementation:**
```html
<!-- On filtered URL /shoes/?color=red -->
<link rel="canonical" href="https://example.com/shoes/">
```
Or block in robots.txt:
```
Disallow: /*?color=
Disallow: /*?size=
Disallow: /*?sort=
```

Where the filter layer is supplied by a platform app or extension (Shopify apps, WooCommerce plugins, Magento layered navigation), confirm the robots.txt it generates is not over-blocking.

### 5. Out-of-Stock Product Handling

How to handle products that are no longer available:

| Scenario | Recommended action |
|----------|-------------------|
| Temporarily out of stock | Keep the page live. Update schema to `OutOfStock`. Show restock date or "notify me" option. |
| Permanently discontinued | 301 redirect to: (1) best successor product, (2) category page, (3) nearest alternative. |
| Seasonal product (returns next year) | Keep live with `PreOrder` or `OutOfStock` schema. Update content for the new season. |
| Product that was very well-linked | Extra important to 301 to preserve link equity. Never 404 a page with significant backlinks. |

**404 is a last resort, not a forbidden one.** Redirect to a relevant successor where one exists: the replacement product, the nearest alternative, the parent category when it genuinely answers the same intent. Where no relevant successor exists, return 410 and let the URL go. Redirecting a whole discontinued range to a generic category page is treated as a soft 404, which costs the crawl budget the redirect was meant to save.

### 6. Pagination and Crawl Budget

For large catalogs:

- Every paginated page self-canonicalizes. Canonicalizing page 2 and beyond to page 1 is the one option
  Google names and rejects: "Don't use the first page of a paginated sequence as the canonical page."
  It also hides the tail of the catalogue from the index, which on a large store is most of it.
  Source: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading (verified August 2026)
- Infinite scroll: must implement History API to create crawlable URLs or add a paginated fallback

**Crawl budget for large catalogs (>10k products):**
- Prioritize product pages with traffic or revenue over low-converting pages
- Use `sitemap` to guide Googlebot to priority pages
- Remove discontinued/noindex pages promptly (they waste crawl budget)

### 7. Review Schema (Review Snippets)

Customer reviews with aggregated ratings make a product page eligible for review snippets, the star rating Google can show in results ([Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)). Eligibility is not a guarantee that the snippet appears.

**Requirements for Google to show review snippets:**
- Ratings submitted by real users (not self-generated by the site owner for their own products, which violates Google policy)

Reviews from a third-party platform (Trustpilot, Yotpo, Bazaarvoice) that are embedded and marked up with schema are acceptable.

---

## Output

### Product Pages (sampled)
| Issue | Count | Severity |
|-------|-------|----------|
| Thin descriptions | X | High |
| Missing Product schema | X | High |
| Wrong availability in schema | X | Critical |
| Duplicate variant descriptions | X | Medium |

### Category Pages
| Issue | Count | Severity |
|-------|-------|----------|
| No introductory text | X | Medium |
| Faceted nav creating duplicates | X | High |

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Large catalog (>10k products) | Sample 50 random products + top 50 by revenue. Apply quality gates from programmatic SEO. |
| API-rendered product data | Warn that price and availability in JS may not be indexed. Recommend server-side rendering for schema. |
| Multi-currency / multi-region store | Each locale needs its own Product schema with correct `priceCurrency`. Cross-reference hreflang for international versions. |
| Marketplace (third-party sellers) | Schema should reflect the available offers from all sellers using `Offer` array in schema. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Product and review schema | `/seo schema` |
| Image SEO (product photos) | `/seo images` |
| Sitemap for product catalog | `/seo sitemap` |
| International e-commerce | `/seo hreflang` |
| Programmatic category pages | `/seo programmatic` |
| Full site audit | `/seo audit` |
