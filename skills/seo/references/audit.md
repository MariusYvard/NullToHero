---
name: seo-audit
description: >
  Full website SEO audit. Crawls up to 500 pages, detects business type, runs
  7 specialist checks (technical, content, schema, images, sitemap, performance,
  AI search). Use for: "audit my site", "full SEO audit", "website analysis",
  "SEO health check".
version: 1.0.0
user-invocable: true
argument-hint: "[url]"
license: "Apache-2.0"
---

# Full Website SEO Audit

## Process

1. **Fetch homepage** via WebFetch or Bash
2. **Detect business type** — analyze homepage signals
3. **Crawl site** — follow internal links up to 500 pages, respect robots.txt
4. **Run checks** sequentially across all categories below
5. **Score** — aggregate into SEO Health Score (0–100)
6. **Report** — generate prioritized action plan

## Crawl Configuration

```
Max pages: 500
Respect robots.txt: Yes
Follow redirects: Yes (max 3 hops)
Timeout per page: 30s
Concurrent requests: 5
Delay: 1s
```

## Scoring Weights

| Category | Weight |
|----------|--------|
| Technical SEO | 22% |
| Content Quality | 23% |
| On-Page SEO | 20% |
| Schema / Structured Data | 10% |
| Performance (CWV) | 10% |
| AI Search Readiness | 10% |
| Images | 5% |

## Output Files

- `FULL-AUDIT-REPORT.md` — comprehensive findings
- `ACTION-PLAN.md` — prioritized recommendations (Critical > High > Medium > Low)

## Report Structure

### Executive Summary
- Overall SEO Health Score (0–100)
- Business type detected
- Top 5 critical issues
- Top 5 quick wins

### Technical SEO
Crawlability, indexability, security, Core Web Vitals

### Content Quality
E-E-A-T assessment, thin content, duplicate content, readability

### On-Page SEO
Title tags, meta descriptions, heading structure, internal linking

### Schema & Structured Data
Current implementation, validation errors, missing opportunities

### Performance
LCP, INP, CLS scores, resource optimization

### Images
Missing alt text, oversized images, format recommendations

### AI Search Readiness
Citability score, structural improvements, authority signals

## Priority Definitions

- **Critical** — Blocks indexing or causes penalties (fix immediately)
- **High** — Significantly impacts rankings (fix within 1 week)
- **Medium** — Optimization opportunity (fix within 1 month)
- **Low** — Nice to have (backlog)

## Error Handling

| Scenario | Action |
|----------|--------|
| URL unreachable | Report the error. Do not guess site content. Suggest verifying the URL. |
| robots.txt blocks crawling | Analyze only accessible pages, note the limitation. |
| Rate limiting (429) | Back off, reduce requests, report partial results. |
| Timeout on large sites | Cap at timeout, report findings for pages crawled. |

## Cross-Skill References

| Need | Skill |
|------|-------|
| Deep technical audit | `/seo technical` |
| Content quality analysis | `/seo content` |
| Schema & structured data | `/seo schema` |
| AI search optimization | `/seo geo` |
| Single-page deep analysis | `/seo page` |
| Post-audit SEO strategy | `/seo plan` |
