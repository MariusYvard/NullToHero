---
name: seo-technical
description: >
  Technical SEO audit across 9 categories: crawlability, indexability, security,
  URL structure, mobile, Core Web Vitals, structured data, JavaScript rendering,
  international. Use for: "technical SEO", "crawl issues", "robots.txt", "Core
  Web Vitals", "mobile SEO", "canonical".
version: 1.9.1
---

# Technical SEO Audit

## Categories

### 1. Crawlability
- robots.txt and XML sitemap: exist, valid, sitemap referenced in robots.txt; noindex and canonical tags intentional and free of conflicts; important pages within 3 clicks of the homepage
- Crawl budget matters above 10k pages. Below that threshold it is not the constraint, so do not open the subject
- Index bloat: unnecessary pages consuming crawl budget
- HTTPS enforced, no mixed content, and HSTS preload list checked on high-security sites. The remaining security headers carry no ranking effect
- AI crawler management, the robots.txt tokens and what blocking each one costs: [geo.md](geo.md)

### 2. URL Structure
- Descriptive hyphenated URLs in a logical hierarchy, no content behind query parameters, 301 with no redirect chain (max 1 hop), flag over 100 characters, trailing slashes consistent

### 3. Mobile Optimization
- Responsive design: viewport meta tag, responsive CSS
- Touch targets: see L-TOUCH-1 for the floor and the recommended size, L-TOUCH-2 for spacing
- Font size: minimum 16px base
- No horizontal scroll
- Mobile-first indexing: **after July 5, 2024, Google crawls and indexes sites for Search with Googlebot Smartphone** ([Google Search Central, 2024](https://developers.google.com/search/blog/2024/06/mobile-indexing-vlast-final-final.doc)). A site whose content is not accessible on a mobile device is no longer indexable. Googlebot Desktop can still appear in server logs for a few other features (product listings, Google for Jobs), so treat "mobile only" as a statement about Search indexing, not about every Google fetch.

### 4. Core Web Vitals

Ownership: this section holds the targets; image-specific LCP/CLS tactics live in [images.md](images.md) and the remediation deep-dive in [performance.md](performance.md).

- Targets, measured at the 75th percentile of real user data: LCP within L-PERF-1, INP within L-PERF-3, CLS <0.1
- INP became a Core Web Vital and replaced FID on March 12, 2024 ([web.dev, 2024](https://web.dev/blog/inp-cwv-march-12)). September 9, 2024 was the announced deadline for moving off FID ([web.dev, 2024](https://web.dev/blog/inp-cwv-launch)), and Chrome ended FID support in its tools (PageSpeed Insights and its API, CrUX API and History API, CrUX Dashboard, web-vitals.js) in September 2024 ([web.dev, 2024](https://web.dev/blog/fid)). Do NOT reference FID anywhere.
- Use PageSpeed Insights API or CrUX data if MCP available

### 5. Structured Data
- Detection and validation: see the `/nth-seo schema` skill for full analysis

### 6. JavaScript Rendering

#### JavaScript SEO: Canonical & Indexing Guidance (December 2025)

Google updated its JavaScript SEO documentation in December 2025 with critical clarifications:

1. **Canonical conflicts:** If a canonical tag in raw HTML differs from one injected by JavaScript, Google may use EITHER one. Ensure canonical tags are identical between server-rendered HTML and JS-rendered output.
2. **noindex with JavaScript:** If raw HTML contains `<meta name="robots" content="noindex">` but JavaScript removes it, Google MAY still honor the noindex from raw HTML. Serve correct robots directives in the initial HTML response.
3. **Non-200 status codes:** Google does NOT render JavaScript on pages returning non-200 HTTP status codes. Any content or meta tags injected via JS on error pages will be invisible to Googlebot.
4. **Structured data in JavaScript:** Product, Article, and other structured data injected via JS may face delayed processing. For time-sensitive structured data (especially e-commerce Product markup), include it in the initial server-rendered HTML.

**Best practice:** Serve critical SEO elements (canonical, meta robots, structured data, title, meta description) in the initial server-rendered HTML rather than relying on JavaScript injection.

### 7. IndexNow Protocol (setup and tooling: [indexnow.md](indexnow.md))
- Check if the site supports IndexNow. Participants are listed and dated once, in `indexnow.md` (`L-INDEXNOW-1`)

## Output

### Technical Score: XX/100

### Category Breakdown
| Category | Status | Score |
|----------|--------|-------|
| Crawlability | pass/warn/fail | XX/100 |
| Indexability | pass/warn/fail | XX/100 |
| Security | pass/warn/fail | XX/100 |
| URL Structure | pass/warn/fail | XX/100 |
| Mobile | pass/warn/fail | XX/100 |
| Core Web Vitals | pass/warn/fail | XX/100 |
| Structured Data | pass/warn/fail | XX/100 |
| JS Rendering | pass/warn/fail | XX/100 |
| IndexNow | pass/warn/fail | XX/100 |

### Critical Issues (fix immediately)
### High Priority (fix within 1 week)
### Medium Priority (fix within 1 month)
### Low Priority (backlog)

## Error Handling

| Scenario | Action |
|----------|--------|
| URL unreachable | Report connection error with status code. Suggest verifying URL, checking DNS resolution, and confirming the site is publicly accessible. |
| robots.txt not found | Note that no robots.txt was detected at the root domain. Recommend creating one with appropriate directives. Continue audit on remaining categories. |
| HTTPS not configured | Flag as a critical issue. Report whether HTTP is served without redirect, mixed content exists, or SSL certificate is missing/expired. |
| Core Web Vitals data unavailable | Note that CrUX data is not available (common for low-traffic sites). Suggest using Lighthouse lab data as a proxy and recommend increasing traffic before re-testing. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|---------------|-------|
| Full SEO audit orchestration | `/nth-seo audit` |
| Live technical data (Lighthouse, on-page) | (not included) |
| Sitemap analysis | `/nth-seo sitemap` |
| Structured data validation | `/nth-seo schema` |
| Hreflang validation | `/nth-seo hreflang` |
| Site build with technical best practices | `/nth-siteasy build` |
| Fix tracking | (not included) |

## Deep dives

- Head metadata specifics (favicon, manifest, theme-color, color-scheme): [head-meta.md](head-meta.md)
- Core Web Vitals remediation in depth: [performance.md](performance.md)
- Consent, privacy signals and tracking hygiene: [privacy-consent.md](privacy-consent.md)
- Instant-indexing pings after each change: [indexnow.md](indexnow.md)

