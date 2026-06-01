---
name: seo-ecommerce
description: >
  E-commerce SEO — product pages, category pages, faceted navigation, product
  schema, marketplace intelligence, review schema, inventory SEO. Use for:
  "ecommerce SEO", "product page SEO", "category page SEO", "product schema",
  "WooCommerce SEO", "Shopify SEO", "faceted navigation", "product reviews SEO",
  "out of stock SEO".
version: 1.8.1
---

# E-commerce SEO

## Audit areas

### 1. Product Pages

Product pages are the primary conversion and ranking asset. Each should be treated as a standalone landing page.

**On-page requirements:**

| Element | Requirement |
|---------|-------------|
| Title tag | `[Product Name] — [Brand] | [Category]` or `[Product Name] | Buy [Product] Online` |
| H1 | Exact product name matching how users search |
| URL | `/category/product-name/` — no IDs (`/p?id=12345`), no parameters in canonical URL |
| Description | Unique per product. Minimum 200 words. Not manufacturer copy-paste (duplicate content). |
| Images | Multiple angles. Alt text = product name + key attribute. WebP format. |
| Price | Visible on page, not JS-only. Matches schema. |
| Availability | In stock / out of stock clearly stated. Affects schema. |
| Reviews | Customer reviews displayed (generates UGC, increases word count, builds trust) |
| Breadcrumbs | Category > Subcategory > Product Name (with BreadcrumbList schema) |

**Common product page SEO failures:**
- Thin descriptions (1-2 sentences, or just manufacturer spec list)
- Duplicate descriptions across variants (red vs blue same product = near-duplicate content)
- Price shown only in JS (Google's crawler may not see it)
- Missing or wrong availability in schema (showing "In Stock" for sold-out products)
- No internal links to related products or categories

### 2. Category Pages

Category pages capture high-volume head terms ("men's running shoes", "wireless headphones"). They are often the most important pages for organic traffic.

**Requirements:**

| Element | Requirement |
|---------|-------------|
| H1 | Category name — the most searched form |
| Introductory text | 100-300 words describing the category. Placed above or below the product grid. |
| Filter navigation | Faceted navigation handled correctly (see section 4) |
| Product count | Show product count ("143 products") — trust signal |
| Sorting | Default sort by relevance or bestseller |
| Pagination | Use `?page=N` or `/page/N/`. Correct canonical per page. |
| Breadcrumbs | Department > Category (with schema) |

**Category page content strategy:**
- Target the head keyword as primary, plus modifiers (best, buy, price, review)
- Avoid keyword stuffing in the intro paragraph
- Include filtering/sorting options that users expect

### 3. Product Schema

**Product schema (required for price and availability rich results):**

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Noise-Cancelling Headphones XB900",
  "description": "Premium wireless headphones with 30-hour battery life...",
  "image": [
    "https://example.com/images/headphones-front.webp",
    "https://example.com/images/headphones-side.webp"
  ],
  "brand": {
    "@type": "Brand",
    "name": "SoundBrand"
  },
  "sku": "XB900-BLK",
  "mpn": "XB900",
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/headphones-xb900/",
    "priceCurrency": "USD",
    "price": "249.99",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition",
    "seller": {
      "@type": "Organization",
      "name": "Example Store"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "312",
    "bestRating": "5",
    "worstRating": "1"
  }
}
```

**Availability values (must match actual stock):**
- `https://schema.org/InStock` — available
- `https://schema.org/OutOfStock` — sold out
- `https://schema.org/PreOrder` — pre-order
- `https://schema.org/Discontinued` — permanently gone
- `https://schema.org/LimitedAvailability` — few remaining

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
| Color / size / style variants | Canonical to base category. Block with `noindex` or robots.txt. |
| Brand filter (creates distinct, rankable content) | Allow indexing if the brand page has unique content and search demand. |
| Price range filter | Block — no SEO value, pure utility. |
| Sort order (`?sort=price_asc`) | Block — pure utility, no unique content. |
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

### 5. Out-of-Stock Product Handling

How to handle products that are no longer available:

| Scenario | Recommended action |
|----------|-------------------|
| Temporarily out of stock | Keep the page live. Update schema to `OutOfStock`. Show restock date or "notify me" option. |
| Permanently discontinued | 301 redirect to: (1) best successor product, (2) category page, (3) nearest alternative. |
| Seasonal product (returns next year) | Keep live with `PreOrder` or `OutOfStock` schema. Update content for the new season. |
| Product that was very well-linked | Extra important to 301 to preserve link equity. Never 404 a page with significant backlinks. |

**Never 404 a product page directly.** Always redirect.

### 6. Pagination and Crawl Budget

For large catalogs:

- Use `?page=N` or `/page/N/` consistently
- Page 1 is the canonical; all paginated pages can be self-canonicalized or canonicalized to page 1 depending on uniqueness
- Include paginated pages in sitemap only if they have distinct content value
- Infinite scroll: must implement History API to create crawlable URLs or add a paginated fallback

**Crawl budget for large catalogs (>10k products):**
- Prioritize product pages with traffic or revenue over low-converting pages
- Use `sitemap` to guide Googlebot to priority pages
- Remove discontinued/noindex pages promptly (they waste crawl budget)

### 7. Review Schema (Review Snippets)

Customer reviews with aggregated ratings generate star snippets in SERPs, significantly improving CTR.

**Requirements for Google to show review snippets:**
- `AggregateRating` schema on product pages
- Ratings submitted by real users (not self-generated by the site owner for their own products, which violates Google policy)
- Minimum 1 review and a rating count

Reviews from a third-party platform (Trustpilot, Yotpo, Bazaarvoice) that are embedded and marked up with schema are acceptable.

---

## Platform-Specific Notes

**Shopify:**
- Built-in JSON-LD is basic. Add Yoast SEO or Schema Plus for richer markup.
- Default theme canonical handles variants correctly.
- Faceted navigation via apps: confirm robots.txt is not over-blocking.

**WooCommerce:**
- Yoast WooCommerce SEO plugin adds Product schema correctly.
- Default URLs can be configured: `/product/[slug]/` is clean.
- Pagination: uses `?paged=N` which should be canonicalized.

**Magento 2:**
- Built-in canonical tag support per product/category.
- Faceted navigation layers need explicit disallow rules or canonical configuration.

---

## Output

### E-commerce SEO Score: XX/100

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

### Priority Fixes

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
