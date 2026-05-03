---
name: seo
description: "Use when the user wants to audit a website, analyze a page, plan an SEO strategy, fix technical SEO, add schema markup, improve content quality, or optimize for AI search engines (ChatGPT, Perplexity, Google AI Overviews). Covers full site audits, single-page analysis, SEO strategy with industry templates, robots.txt, sitemaps, Core Web Vitals, structured data (JSON-LD), E-E-A-T, content quality, GEO, llms.txt, and AI crawler access. Use for any request containing: SEO, rank, Google, search engine, schema, sitemap, robots.txt, meta tags, keywords, AI search, or visibility."
version: 1.0.0
user-invocable: true
argument-hint: "[audit|page|plan|technical|schema|content|geo] [url | business-type]"
license: "Apache-2.0"
---

Complete SEO toolkit for websites — from zero to ranking. Run a full audit, fix technical issues, generate schema markup, optimize content, and get found by AI search engines.

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
| "technical SEO" / "robots.txt" / "sitemap" | `technical` |
| "schema markup" / "structured data" / "rich results" | `schema` |
| "content quality" / "E-E-A-T" / "improve my article" | `content` |
| "AI search" / "ChatGPT visibility" / "AI Overviews" | `geo` |

## Plan templates

The `plan` command uses industry-specific templates. Available in [references/plan-assets/](references/plan-assets/):
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
