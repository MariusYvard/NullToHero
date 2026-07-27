---
name: seo
description: "Use when the user wants to audit a website, analyze a page, plan an SEO strategy, fix technical SEO, add schema markup, improve content quality, optimize for AI search engines, build local SEO, handle hreflang/i18n, generate sitemaps, optimize images, run programmatic SEO, build competitor comparison pages, cluster keywords, optimize for Search Experience (SXO), monitor SEO drift, analyze backlinks, handle e-commerce SEO, or export a client report. Covers full site audits with parallel sub-agents, single-page analysis, SEO strategy with industry templates, robots.txt, sitemaps, Core Web Vitals, JSON-LD, E-E-A-T, content quality, GEO, llms.txt, AI crawler access, local SEO, hreflang, programmatic SEO, keyword clustering, SXO, drift monitoring, backlink analysis, e-commerce SEO, and PDF report export. Use for any request containing: SEO, rank, Google, search engine, schema, sitemap, robots.txt, meta tags, keywords, AI search, local SEO, hreflang, backlinks, programmatic, ecommerce, or visibility."
version: 2.3.0
user-invocable: true
argument-hint: "[audit|page|plan|technical|schema|content|geo|sitemap|images|local|hreflang|programmatic|competitor-pages|cluster|drift|backlinks|ecommerce|indexnow|performance|migrate] [url | business-type | keyword | export.csv]"
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

## Start here

Three doors cover most requests: `/seo audit [url]` to learn where you stand
(bare `/seo [url]` runs it), `/seo plan [business-type]` for the strategy, and
`/audit full [url]` when the whole site (design and defects included) should be
checked in one pass. Everything else in the table below is a specialist pass.

## Commands

| Command | What it does | Reference |
|---------|-------------|-----------|
| `audit [url]` | Full site SEO audit — crawls up to 500 pages, scores 7 dimensions, outputs ACTION-PLAN.md | [references/audit.md](references/audit.md) |
| `page [url]` | Deep single-page analysis — title, meta, H1-H6, schema, images, content quality, search-experience alignment (intent, page-type match), score | [references/page.md](references/page.md) + [references/sxo.md](references/sxo.md) |
| `plan [business-type]` | Complete SEO strategy — architecture, content pillars, keyword plan, 4-phase roadmap | [references/plan.md](references/plan.md) + [references/plan-assets/](references/plan-assets/) |
| `technical [url]` | Technical audit — robots.txt, sitemaps, Core Web Vitals, mobile, security, JS rendering | [references/technical.md](references/technical.md) |
| `schema [url]` | Detect, validate, and generate Schema.org JSON-LD — Organization, Article, Product, etc. | [references/schema.md](references/schema.md) |
| `content [url]` | E-E-A-T analysis, readability, keyword density, AI citation readiness | [references/content.md](references/content.md) |
| `geo [url]` | AI search optimization — Google AI Overviews, ChatGPT, Perplexity, llms.txt, brand signals | [references/geo.md](references/geo.md) + [references/ai-overview-recovery.md](references/ai-overview-recovery.md) |
| `sitemap [url]` | XML sitemap validation and generation with industry-specific templates | [references/sitemap.md](references/sitemap.md) |
| `indexnow [url]` | Instant-indexing pings to Bing, Yandex, Naver and Seznam — key setup, single/batch/sitemap submission; the fast lane into the indexes that feed AI answers | [references/indexnow.md](references/indexnow.md) |
| `images [url]` | Image SEO audit — alt text, formats (WebP/AVIF), lazy loading, CLS, LCP | [references/images.md](references/images.md) |
| `local [business]` | Local SEO — Google Business Profile, NAP consistency, citations, reviews, LocalBusiness schema | [references/local.md](references/local.md) |
| `hreflang [url]` | Hreflang validation and generation for multilingual and multi-region sites | [references/hreflang.md](references/hreflang.md) |
| `programmatic [url]` | Programmatic SEO — URL patterns, quality gates (warn 100+, hard stop 500+), deduplication | [references/programmatic.md](references/programmatic.md) |
| `competitor-pages [url]` | "X vs Y" and "alternatives to X" pages with feature matrices, FAQ schema, conversion hooks | [references/competitor-pages.md](references/competitor-pages.md) |
| `cluster [keyword]` | Semantic keyword clustering — intent-based grouping, content architecture, gap analysis | [references/cluster.md](references/cluster.md) |
| `drift [url]` | SEO drift monitoring — baseline capture, change detection, history tracking | [references/drift.md](references/drift.md) |
| `backlinks [url]` | Backlink profile analysis via free data sources (Moz, Bing, Common Crawl, GSC) | [references/backlinks.md](references/backlinks.md) |
| `performance [export]` | Real performance data (Search Console export): striking distance, cannibalisation, auto-calibrated CTR curve, period comparison, decay, four-quadrant refresh matrix | [references/search-console.md](references/search-console.md) + [references/measurement.md](references/measurement.md) |
| `migrate [url]` | Site migration protocol: state freeze, risk map, redirect map, cutover checklist, T+1/T+7/T+30 diffs | [references/migration.md](references/migration.md) |
| `ecommerce [url]` | E-commerce SEO — product pages, category pages, faceted navigation, Product schema | [references/ecommerce.md](references/ecommerce.md) |

Legacy name: `report` (the retired `/seo` sub-command) now routes to `/audit report`
([../audit/references/report.md](../audit/references/report.md) holds the SEO-scope
skeleton). Accepted names are registered in `tools/data/intents.csv`.

## How to run a command

If `PRODUCT.md` or `DIRECTION.md` exist at the project root, read them first: brand names, entities, tone and anti-references committed there drive schema `name`/`sameAs`, content voice and keyword framing.

When the user invokes a command:
1. Load the matching reference file using the Read tool
2. Follow the instructions in that reference exactly
Every command that produces recommendations formats them per [references/action-plan.md](references/action-plan.md).

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
| "index this now" / "ping Bing" / "instant indexing" | `indexnow` |
| "image SEO" / "alt text" / "WebP conversion" | `images` |
| "local SEO" / "Google Business Profile" / "NAP" | `local` |
| "hreflang" / "multilingual SEO" / "i18n SEO" | `hreflang` |
| "programmatic SEO" / "scale pages" / "template pages" | `programmatic` |
| "vs page" / "alternatives to X" / "comparison page" | `competitor-pages` |
| "keyword clusters" / "content architecture" / "gap analysis" | `cluster` |
| "search experience" / "intent alignment" / "SXO" | `page` |
| "SEO drift" / "baseline" / "track ranking changes" | `drift` |
| "backlinks" / "link profile" / "link building" | `backlinks` |
| "e-commerce SEO" / "product pages" / "faceted nav" | `ecommerce` |
| "why did traffic drop" / "Search Console" / "striking distance" / "which pages to refresh" | `performance` |
| "we are changing our URLs" / "site migration" / "replatforming" | `migrate` |
| "AI Overview is eating my clicks" | `geo` |
| "SEO report" / "client report" / "export PDF" | `/audit report` |

## Canonical thresholds

Numeric thresholds live once, with stable identifiers, in `tools/data/laws.csv`. Cite the
identifier instead of restating the number: L-CONTENT-4 (keyword density under 3 percent,
measured as words covered and not occurrences over word count), L-GEO-1 (every tier 1 AI
crawler reachable), L-GEO-2 (bot user-agents get the same HTTP status as a browser),
L-DATA-1 (compared periods of strictly equal length, ending at least three days back).
The validator fails if a law stops being cited anywhere: when a threshold changes, change
it in laws.csv and follow the citations.

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

**Traffic dropped:** `performance` → `page` → `content`

**Replatforming:** `migrate` → `technical` → `audit` → `performance`

**Client deliverable:** `audit` → `/audit report`

**Local business:** `local` → `schema` → `technical`
