# Changelog

All notable changes to NullToHero are documented here.
Format: [Semantic Versioning](https://semver.org)

---

## [1.3.0] — 2026-05-27

### Added — SEO skill: 11 new commands

- `/seo sitemap` — XML sitemap validation and generation with industry templates
- `/seo images` — Image SEO audit: alt text, formats (WebP/AVIF), lazy loading, CLS, LCP
- `/seo local` — Local SEO: Google Business Profile, NAP consistency, citations, reviews, LocalBusiness schema
- `/seo hreflang` — Hreflang / i18n SEO: validation and generation for multilingual sites
- `/seo programmatic` — Programmatic SEO: URL patterns, quality gates (warn at 100+, hard stop at 500+), deduplication
- `/seo competitor-pages` — "X vs Y" and "alternatives to X" pages with feature matrices and schema
- `/seo cluster` — Semantic keyword clustering: intent-based grouping, content architecture, gap analysis
- `/seo sxo` — Search Experience Optimization: intent alignment, page-type matching, persona analysis
- `/seo drift` — SEO drift monitoring: baseline capture, change detection, history tracking
- `/seo backlinks` — Backlink profile analysis via free data sources (Moz, Bing, Common Crawl, GSC)
- `/seo ecommerce` — E-commerce SEO: product pages, category pages, faceted navigation, Product schema

### Added — GEO skill: new commands and improved scoring

- `/geo quick [url]` — 60-second GEO visibility snapshot with top 3 quick wins
- `/geo compare [url]` — Compare current GEO state against a stored baseline
- Weighted GEO scoring methodology (6 dimensions with explicit weights)
- Platform subscores: Google AI Overviews, ChatGPT, Perplexity, Bing Copilot (each 0–100)
- Extended AI crawler list: 14 crawlers tracked (added Diffbot, AI2Bot, Applebot-Extended, FacebookBot, PetalBot)
- Brand authority signal data: YouTube mention correlation ~0.737, backlinks correlation ~0.266

### Added — Repo quality

- `CHANGELOG.md` — this file
- `CONTRIBUTING.md` — contributor guide
- `install.sh` — Unix/macOS/Linux manual installation script
- `install.ps1` — Windows PowerShell installation script
- `tests/validate.js` — Reference file integrity validator

### Changed

- `SKILL.md` — Updated to include all 11 new SEO commands and 2 new GEO commands, with cross-command workflows
- `references/geo.md` — Complete rewrite with weighted scoring, platform subscores, new commands

---

## [1.2.0] — 2026-05-15

### Added

- Design foundations layer in `siteasy` and `inspect`
- Gestalt principles — 7 cognitive laws, 7-question audit
- UX research methodology — qualitative/quantitative methods, 5-user rule, card sorting, tree testing, SUS, A/B testing
- Information architecture — findability vs discoverability, mental models, navigation patterns, 10-point IA audit
- Journey mapping — empathy maps, customer journey maps with emotion curves, service blueprints, user flows
- WCAG 2.2 reference — all 9 new success criteria with code patterns
- Image strategy — AVIF/WebP/SVG decision matrix, `<picture>` pattern, srcset/sizes, LCP optimization, alt text rules
- Form patterns — single column layout, complete autocomplete vocabulary, validation timing, accessible authentication, one-time-code
- Three new commands: `/siteasy research`, `/siteasy ia`, `/siteasy journey`
- 25 new anti-pattern rules in `/inspect detect` (WCAG 2.2, image strategy, forms)

---

## [1.1.0] — 2026-05-01

### Added

- Parallax engineering reference: 6 effect typologies, 3 implementation paths (CSS perspective, native Scroll-Driven Animations, Lenis+GSAP), Core Web Vitals discipline, AI-adaptive governance, Playwright audit script
- `/siteasy parallax` command
- 14 new anti-pattern rules in `/inspect detect`

---

## [1.0.0] — 2026-04-01

### Initial release

- `/siteasy` — 24 commands for design, UX, motion, performance, and site architecture
- `/seo` — 7 commands: audit, page, plan, technical, schema, content, geo
- `/inspect` — 3 commands: detect, preview, review
- 64 reference documents
- Playwright-based browser preview
- Deterministic anti-pattern detector
