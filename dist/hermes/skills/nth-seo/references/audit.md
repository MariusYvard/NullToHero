---
name: seo-audit
description: >
  Full website SEO audit. Crawls up to 500 pages, detects business type, scores
  7 dimensions (technical, content, on-page, schema, performance, AI search,
  images) through 5 parallel specialist sub-agents. Use for: "audit my site",
  "full SEO audit", "website analysis", "SEO health check".
version: 1.9.2
---

# Full Website SEO Audit

## Process

1. **Fetch homepage** via web_extract or Bash
2. **Detect business type** — analyze homepage signals
3. **Crawl site** — follow internal links up to 500 pages, respect robots.txt
4. **Dispatch the five specialist sub-agents in parallel** (see "Parallel audit architecture" below)
5. **Score** — aggregate each dimension into the SEO Health Score (0–100) using the weights below
6. **Report** — generate prioritized action plan

## Parallel audit architecture

The audit runs five specialist sub-agents concurrently, each scoped to one dimension. Launch them with the delegate_task in a single message (one `delegate_task` call per agent, all in the same turn) so they execute in parallel rather than one after another. Pass each agent the target URL plus any page HTML already fetched.

| Sub-agent (`goal`) | Dimension | Covers |
|---|---|---|
| `seo-agent-technical` | Technical | crawlability, indexability, HTTPS, robots.txt, sitemaps, mobile, JS rendering, security headers |
| `seo-agent-content` | Content + On-Page | E-E-A-T, titles, meta, headings, readability, thin content, AI citation readiness |
| `seo-agent-schema` | Schema | JSON-LD detection, validation, rich result eligibility |
| `seo-agent-performance` | Performance + Images | speed signals, image optimization, fonts, render-blocking, CWV readiness |
| `seo-agent-geo` | AI search | AI crawler access, llms.txt, passage citability, brand authority |

Each agent returns its dimension score and findings. Wait for all five to complete, then aggregate. If the delegate_task or plugin agents are unavailable in the current harness, fall back to running the five dimension checklists inline, in sequence, using the same scoring weights. Never skip a dimension silently.

The seven scored dimensions below map onto these five agents: images fold into performance, on-page into content and sitemap checks into technical. `/nth-audit` dispatches the same five agents but re-aggregates them with its own five weights, so its SEO sub-score is intentionally not the seven-dimension score computed here.

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
- `ACTION-PLAN.md` — prioritized recommendations (Critical > High > Medium > Low), built from the [action-plan.md](action-plan.md) template

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
| Deep technical audit | `/nth-seo technical` |
| Content quality analysis | `/nth-seo content` |
| Schema & structured data | `/nth-seo schema` |
| AI search optimization | `/nth-seo geo` |
| Single-page deep analysis | `/nth-seo page` |
| Post-audit SEO strategy | `/nth-seo plan` |
