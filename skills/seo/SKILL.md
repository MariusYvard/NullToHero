---
name: seo
description: "Use when the user wants to audit a website, analyze a page, plan an SEO strategy, fix technical SEO, add schema markup, improve content quality, optimize for AI search engines, generate a report, or export findings as PDF. Covers full site audits (parallel sub-agents), single-page analysis, SEO strategy with industry templates, robots.txt, sitemaps, Core Web Vitals, structured data (JSON-LD), E-E-A-T, content quality, GEO, llms.txt, AI crawler access, local SEO, hreflang, programmatic SEO, competitor comparison pages, semantic clustering, SXO, SEO drift monitoring, backlink analysis, e-commerce SEO, and formatted report generation. Use for any request containing: SEO, rank, Google, search engine, schema, sitemap, robots.txt, meta tags, keywords, AI search, local business, hreflang, backlinks, report, PDF, deliverable, or visibility."
version: 1.4.0
user-invocable: true
argument-hint: "[command] [url | business-type | keyword]"
license: "Apache-2.0"
---

Complete SEO toolkit for websites — from zero to ranking. Run a full audit with parallel sub-agents, fix technical issues, generate schema markup, optimize content, get found by AI search engines, rank locally, scale content programmatically, monitor your SEO over time, and export polished reports.

## Commands

| Command | What it does | Reference |
|---------|-------------|-----------|
| `audit [url]` | Full site SEO audit — 5 parallel sub-agents, scores 7 dimensions, outputs ACTION-PLAN.md | [references/audit.md](references/audit.md) + [agents/](agents/) |
| `page [url]` | Deep single-page analysis — title, meta, H1-H6, schema, images, content quality, score | [references/page.md](references/page.md) |
| `plan [business-type]` | Complete SEO strategy — architecture, content pillars, keyword plan, 4-phase roadmap | [references/plan.md](references/plan.md) + [references/plan-assets/](references/plan-assets/) |
| `technical [url]` | Technical audit — robots.txt, sitemaps, Core Web Vitals, mobile, security, JS rendering | [references/technical.md](references/technical.md) |
| `schema [url]` | Detect, validate, and generate Schema.org JSON-LD — Organization, Article, Product, etc. | [references/schema.md](references/schema.md) |
| `content [url]` | E-E-A-T analysis, readability, keyword density, AI citation readiness | [references/content.md](references/content.md) |
| `geo [url]` | AI search optimization — Google AI Overviews, ChatGPT, Perplexity, llms.txt, brand signals | [references/geo.md](references/geo.md) |
| `sitemap [url \| generate]` | Validate existing XML sitemap or generate a new one with industry templates | [references/sitemap.md](references/sitemap.md) |
| `images [url]` | Image SEO audit — alt text, formats, lazy loading, CLS, LCP optimization | [references/images.md](references/images.md) |
| `local [url]` | Local SEO — Google Business Profile, NAP consistency, citations, reviews, LocalBusiness schema | [references/local.md](references/local.md) |
| `hreflang [url]` | Hreflang / i18n SEO — validate and generate hreflang tags for multi-language sites | [references/hreflang.md](references/hreflang.md) |
| `programmatic [url \| plan]` | Programmatic SEO — URL patterns, template structures, quality gates, deduplication | [references/programmatic.md](references/programmatic.md) |
| `competitor-pages [url \| generate]` | Generate "X vs Y" comparison and alternatives pages with feature matrices and schema | [references/competitor-pages.md](references/competitor-pages.md) |
| `cluster [seed-keyword]` | Semantic keyword clustering — SERP-based topic grouping, content architecture | [references/cluster.md](references/cluster.md) |
| `sxo [url]` | Search Experience Optimization — page-type matching, user stories, persona alignment | [references/sxo.md](references/sxo.md) |
| `drift [url]` | SEO drift monitoring — capture baseline, compare changes, track degradation over time | [references/drift.md](references/drift.md) |
| `backlinks [url]` | Backlink profile analysis — link quality, anchor text, competitor gap (Moz, Bing, Common Crawl) | [references/backlinks.md](references/backlinks.md) |
| `ecommerce [url]` | E-commerce SEO — product schema, category pages, marketplace visibility, faceted nav | [references/ecommerce.md](references/ecommerce.md) |
| `report [url \| file \| generate]` | Format audit output as a client-ready Markdown report or export to PDF | [references/report.md](references/report.md) |

## How to run a command

When the user invokes a command:
1. Load the matching reference file using the Read tool
2. Follow the instructions in that reference exactly
3. Every command that produces recommendations must also output an ACTION-PLAN using [references/action-plan.md](references/action-plan.md) as the template
4. If no command is specified:
   - With a URL → default to `audit`
   - With a business type → default to `plan`
   - With a keyword → default to `cluster`
   - Otherwise ask: "Would you like a full audit, a single-page analysis, or an SEO strategy?"

## Parallel audit orchestration (for `audit` command)

When running `/seo audit [url]`, spawn 5 sub-agents in parallel using the Task tool:

```
Task 1: Read agents/audit-technical.md  → analyze technical dimension
Task 2: Read agents/audit-content.md    → analyze content dimension
Task 3: Read agents/audit-schema.md     → analyze schema dimension
Task 4: Read agents/audit-geo.md        → analyze GEO dimension
Task 5: Read agents/audit-performance.md → analyze performance dimension
```

Each agent returns a scored markdown section. Aggregate the results:
- Collect all scores and compute weighted average
- Merge all "Critical issues" lists, deduplicated
- Merge all "Quick wins" lists, deduplicated
- Build unified ACTION-PLAN using action-plan.md template

If the Task tool is unavailable (e.g. running outside Claude Code), run each dimension sequentially using the same agent files.

## Quick reference

| User says | Run |
|-----------|-----|
| "audit my site" / "check my SEO" | `audit` |
| "analyze this page" / "on-page SEO" | `page` |
| "SEO strategy" / "I'm building a new site" | `plan` |
| "technical SEO" / "robots.txt" / "sitemap" | `technical` |
| "schema markup" / "structured data" / "rich results" | `schema` |
| "content quality" / "E-E-A-T" / "improve my article" | `content` |
| "AI search" / "ChatGPT visibility" / "AI Overviews" | `geo` |
| "generate sitemap" / "validate sitemap" | `sitemap` |
| "image SEO" / "alt text" / "WebP" | `images` |
| "local SEO" / "Google Business Profile" / "maps" | `local` |
| "hreflang" / "multilingual" / "international SEO" | `hreflang` |
| "programmatic SEO" / "scale pages" / "template pages" | `programmatic` |
| "vs page" / "alternatives to X" / "comparison page" | `competitor-pages` |
| "keyword clustering" / "topic clusters" / "content architecture" | `cluster` |
| "search experience" / "user intent" / "SXO" | `sxo` |
| "SEO changes" / "track ranking drops" / "baseline" | `drift` |
| "backlinks" / "link profile" / "link building" | `backlinks` |
| "ecommerce SEO" / "product pages" / "category SEO" | `ecommerce` |
| "generate report" / "export PDF" / "client deliverable" | `report` |

## Plan templates

The `plan` command uses industry-specific templates. Available in [references/plan-assets/](references/plan-assets/):
- `saas.md` — SaaS / software
- `ecommerce.md` — E-commerce
- `local-service.md` — Local service businesses
- `publisher.md` — Content publishers / media
- `agency.md` — Agencies
- `generic.md` — General / unknown business type (fallback)

## Cross-command workflows

**New site from scratch:** `plan` → build the site → `technical` → `schema` → `audit` → `report`

**Existing site needs help:** `audit` → `technical` (fix blockers) → `content` → `geo` → `report`

**Page not ranking:** `page` → `content` → `schema`

**Invisible to AI search:** `geo` → `content` → `technical`

**International expansion:** `hreflang` → `technical` → `content`

**Scale content:** `cluster` → `plan` → `programmatic`

**Local business:** `local` → `schema` → `technical`

**E-commerce launch:** `ecommerce` → `schema` → `sitemap` → `images`

**Competitive positioning:** `competitor-pages` → `cluster` → `sxo`

**Ongoing monitoring:** `drift` (baseline) → build / fix → `drift` (compare)

**Client deliverable:** any command → `report` → (optional) export as PDF
