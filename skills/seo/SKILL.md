---
name: seo
description: "Use when the user wants to audit a website, analyze a page, plan an SEO strategy, fix technical SEO, add schema markup, improve content quality, optimize for AI search engines, build local SEO, handle hreflang/i18n, generate sitemaps, optimize images, run programmatic SEO, build competitor comparison pages, cluster keywords, optimize for Search Experience (SXO), monitor SEO drift, analyze backlinks, handle e-commerce SEO, or export a client report. Covers full site audits with parallel sub-agents, single-page analysis, SEO strategy with industry templates, robots.txt, sitemaps, Core Web Vitals, JSON-LD, E-E-A-T, content quality, GEO, llms.txt, AI crawler access, local SEO, hreflang, programmatic SEO, keyword clustering, SXO, drift monitoring, backlink analysis, e-commerce SEO, and PDF report export. Use for any request containing: SEO, rank, Google, search engine, schema, sitemap, robots.txt, meta tags, keywords, AI search, local SEO, hreflang, backlinks, programmatic, ecommerce, or visibility."
version: 1.7.1
user-invocable: true
argument-hint: "[audit|page|plan|technical|schema|content|geo|sitemap|images|local|hreflang|programmatic|competitor-pages|cluster|sxo|drift|backlinks|ecommerce|report] [url | business-type]"
license: "Apache-2.0"
allowed-tools:
  - Read
  - Write
  - WebFetch
  - Glob
  - Grep
  - Task
  - Bash(node *)
  - Bash(python3 *)
---

Complete SEO toolkit for websites — from zero to ranking. Run a full audit, fix technical issues, generate schema markup, optimize content, get found by AI search engines, and deliver polished client reports.

## Commands

| Command | What it does | Reference |
|---------|-------------|-----------|
| `audit [url]` | Full site SEO audit — crawls up to 500 pages, scores 7 dimensions, outputs ACTION-PLAN.md | [references/audit.md](references/audit.md) |
| `page [url]` | Deep single-page analysis — title, meta, H1-H6, schema, images, content quality, score | [references/page.md](references/page.md) |
| `plan [business-type]` | Complete SEO strategy — architecture, content pillars, keyword plan, 4-phase roadmap | [references/plan.md](references/plan.md) + [references/plan-assets/](references/plan-assets/) |
| `technical [url]` | Technical audit — robots.txt, sitemaps, Core Web Vitals, mobile, security, JS rendering | [references/technical.md](references/technical.md) |
| `schema [url]` | Detect, validate, and generate Schema.org JSON-LD — Organization, Article, Product, etc. | [references/schema.md](references/schema.md) |
| `content [url]` | E-E-A-T analysis, readability, keyword density, AI citation readiness | [references/content.md](references/content.md) |
| `geo [url]` | AI search optimization — Google AI Overviews, ChatGPT, Perplexity, llms.txt, brand signals | [references/geo.md](references/geo.md) |
| `sitemap [url]` | XML sitemap validation and generation with industry-specific templates | [references/sitemap.md](references/sitemap.md) |
| `images [url]` | Image SEO audit — alt text, formats (WebP/AVIF), lazy loading, CLS, LCP | [references/images.md](references/images.md) |
| `local [business]` | Local SEO — Google Business Profile, NAP consistency, citations, reviews, LocalBusiness schema | [references/local.md](references/local.md) |
| `hreflang [url]` | Hreflang validation and generation for multilingual and multi-region sites | [references/hreflang.md](references/hreflang.md) |
| `programmatic [url]` | Programmatic SEO — URL patterns, quality gates (warn 100+, hard stop 500+), deduplication | [references/programmatic.md](references/programmatic.md) |
| `competitor-pages [url]` | "X vs Y" and "alternatives to X" pages with feature matrices, FAQ schema, conversion hooks | [references/competitor-pages.md](references/competitor-pages.md) |
| `cluster [keyword]` | Semantic keyword clustering — intent-based grouping, content architecture, gap analysis | [references/cluster.md](references/cluster.md) |
| `sxo [url]` | Search Experience Optimization — intent alignment, page-type matching, persona analysis | [references/sxo.md](references/sxo.md) |
| `drift [url]` | SEO drift monitoring — baseline capture, change detection, history tracking | [references/drift.md](references/drift.md) |
| `backlinks [url]` | Backlink profile analysis via free data sources (Moz, Bing, Common Crawl, GSC) | [references/backlinks.md](references/backlinks.md) |
| `ecommerce [url]` | E-commerce SEO — product pages, category pages, faceted navigation, Product schema | [references/ecommerce.md](references/ecommerce.md) |
| `report [url|file|generate]` | Format any audit output as a client-ready Markdown report or PDF with score gauges | [references/report.md](references/report.md) |

## How to run a command

When the user invokes a command:
1. Load the matching reference file using the Read tool
2. Follow the instructions in that reference exactly
3. If no command is specified:
   - With a URL → default to `audit`
   - With a business type → default to `plan`
   - Otherwise ask: "Would you like a full audit, a single-page analysis, or an SEO strategy?"

## Quick reference

| User says | Run |
|-----------|-----|
| "audit my site" / "check my SEO" | `audit` |
| "analyze this page" / "on-page SEO" | `page` |
| "SEO strategy" / "I'm building a new site" | `plan` |
| "technical SEO" / "robots.txt" / "sitemap issues" | `technical` |
| "schema markup" / "structured data" / "rich results" | `schema` |
| "content quality" / "E-E-A-T" / "improve my article" | `content` |
| "AI search" / "ChatGPT visibility" / "AI Overviews" | `geo` |
| "generate sitemap" / "sitemap validation" | `sitemap` |
| "image SEO" / "alt text" / "WebP conversion" | `images` |
| "local SEO" / "Google Business Profile" / "NAP" | `local` |
| "hreflang" / "multilingual SEO" / "i18n SEO" | `hreflang` |
| "programmatic SEO" / "scale pages" / "template pages" | `programmatic` |
| "vs page" / "alternatives to X" / "comparison page" | `competitor-pages` |
| "keyword clusters" / "content architecture" / "gap analysis" | `cluster` |
| "search experience" / "intent alignment" / "SXO" | `sxo` |
| "SEO drift" / "baseline" / "track ranking changes" | `drift` |
| "backlinks" / "link profile" / "link building" | `backlinks` |
| "e-commerce SEO" / "product pages" / "faceted nav" | `ecommerce` |
| "SEO report" / "client report" / "export PDF" | `report` |

## Plan templates

The `plan` command uses industry-specific templates in [references/plan-assets/](references/plan-assets/):
- `saas.md` — SaaS / software
- `ecommerce.md` — E-commerce
- `local-service.md` — Local service businesses
- `publisher.md` — Content publishers / media
- `agency.md` — Agencies
- `generic.md` — General / unknown business type (fallback)

## Cross-command workflows

**New site from scratch:** `plan` → build the site → `technical` → `schema` → `audit`

**Existing site needs help:** `audit` → `technical` (fix blockers) → `content` → `geo`

**Page not ranking:** `page` → `content` → `schema`

**Invisible to AI search:** `geo` → `content` → `technical`

**International expansion:** `hreflang` → `technical` → `content`

**E-commerce launch:** `ecommerce` → `schema` → `technical` → `audit`

**Programmatic site:** `programmatic` → `cluster` → `plan` → `audit`

**Client deliverable:** `audit` → `report`

**Local business:** `local` → `schema` → `technical`
