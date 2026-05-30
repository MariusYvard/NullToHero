# NullToHero — Cowork Plugin

> **v1.5.0** · 3 skills · 47 commands · 77 reference docs · parallel audit sub-agents · report export · deterministic anti-pattern detector

**From zero knowledge to hero website.** NullToHero gives Claude a complete design, SEO and motion engineering vocabulary so anyone, even with no prior experience, can build websites that look professional, rank on Google, and pass accessibility audits.

By [Marius Yvard](https://lecvdemarius.netlify.app/) · Apache 2.0

---

## Install via marketplace

This repo is also a Claude Code marketplace. Two install paths:

**A. As a marketplace (recommended, supports auto-update)**

```
/plugin marketplace add MariusYvard/NullToHero
/plugin install null-to-hero@null-to-hero-marketplace
```

Future releases pull automatically with `/plugin marketplace update null-to-hero-marketplace`.

**B. As a direct plugin**

```
/plugin install MariusYvard/NullToHero
```

**C. Manual install (Unix/macOS/Linux)**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/MariusYvard/NullToHero/main/install.sh)
```

**D. Manual install (Windows PowerShell)**

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

---

## What's new in 1.4.0

### Parallel audit sub-agents (C1)

`/seo audit` now delegates each dimension to a dedicated sub-agent file in `skills/seo/agents/`. When the Task tool is available (Claude Code / Cowork), all 5 run in parallel — technical, content, schema, GEO, performance — then aggregate into a unified score and ACTION-PLAN. Sequential fallback when Task is unavailable.

### Report export (C2)

New `/seo report [url|file|generate]` command formats any audit output into a client-ready deliverable: Markdown with ASCII score gauges and color-coded tables, or PDF via the Cowork PDF skill.

### Standardized ACTION-PLAN (C3)

All `/seo` commands now produce action plans in a unified format: Quick Wins (< 1h), 1-Week Fixes, 1-Month Projects, Backlog. Template lives in `references/action-plan.md`.

### File integrity validator

`tests/validate.js` now checks minimum line counts per file (26 files tracked). A truncated rewrite fails the check immediately — run `node tests/validate.js` before every commit.

---

## What's new in 1.3.0

The SEO skill expands from 7 to 18 commands, the GEO command gains a weighted scoring model and two new subcommands, and the repo ships its first contributor tooling.

### New SEO commands


| Command | What it does |
|---------|-------------|
| `sitemap [url\|generate]` | XML sitemap validation and generation with industry templates |
| `images [url]` | Image SEO audit — alt text, WebP/AVIF formats, lazy loading, CLS, LCP |
| `local [url]` | Local SEO — Google Business Profile, NAP consistency, citations, reviews, LocalBusiness schema |
| `hreflang [url\|generate]` | Hreflang validation and generation for multilingual/multi-region sites |
| `programmatic [url\|plan]` | Programmatic SEO — URL patterns, quality gates (warn 100+, hard stop 500+), deduplication |
| `competitor-pages [url\|generate]` | "X vs Y" and "alternatives to X" pages with feature matrices and schema |
| `cluster [keyword]` | Semantic keyword clustering by intent, gap analysis, pillar-and-cluster architecture |
| `sxo [url]` | Search Experience Optimization — intent alignment, page-type matching, satisfaction signals |
| `drift [url] baseline\|compare\|history` | SEO drift monitoring — capture baseline, detect changes, track history |
| `backlinks [url]` | Backlink profile analysis via free sources (Moz, Bing, Common Crawl, GSC) |
| `ecommerce [url]` | E-commerce SEO — product pages, category pages, faceted navigation, Product schema |

### GEO upgrades

`/seo geo` now uses a weighted scoring model across 6 dimensions (citability 25 %, brand authority 20 %, content quality 20 %, technical 15 %, structured data 10 %, platform optimization 10 %) and reports platform subscores for Google AI Overviews, ChatGPT, Perplexity and Bing Copilot separately. Two new subcommands:

- `geo quick [url]` — 60-second GEO snapshot with top 3 quick wins
- `geo compare [url]` — delta tracking against a stored baseline

The AI crawler list expands to 14 bots: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, CCBot, anthropic-ai, Bytespider, cohere-ai, Diffbot, AI2Bot, Applebot-Extended, FacebookBot, PetalBot.

### Repo quality

- `CHANGELOG.md` — full release history
- `CONTRIBUTING.md` — contributor guide (reference format, quality standards, PR workflow)
- `install.sh` / `install.ps1` — one-line installers for Unix and Windows
- `tests/validate.js` — reference file integrity validator (`node tests/validate.js`)

### Earlier additions

**1.2.0** — Design foundations: Gestalt principles, UX research methodology, information architecture, journey mapping, WCAG 2.2, image strategy, form patterns. Three new commands (`research`, `ia`, `journey`). 25 new anti-pattern rules.

**1.1.0** — Parallax engineering reference and Playwright audit script. One new command (`parallax`). 14 new anti-pattern rules.

---

## Skills

### `/siteasy` — Design

Build, polish, and ship production-grade interfaces.

| Command | What it does |
|---------|-------------|
| `build [feature]` | Build a full UI feature end-to-end with a confirmed design brief |
| `plan [feature]` | Plan UX and visual direction before writing code |
| `research [scope]` | UX research planning, method selection, persona and journey synthesis |
| `ia [target]` | Information architecture, card sorting, tree testing, navigation patterns |
| `journey [persona]` | Generate empathy maps, journey maps, or service blueprints |
| `setup` | Create PRODUCT.md — brand, audience, tone, anti-references |
| `critique [target]` | Design review with heuristic scoring |
| `audit [target]` | Technical quality checks — a11y, performance, responsive, WCAG 2.2, image strategy, forms |
| `polish [target]` | Final quality pass before shipping |
| `amplify [target]` | Make bland designs bolder — typography, color, presence |
| `simplify [target]` | Reduce visual noise, strip to essence |
| `animate [target]` | Add purposeful motion and micro-interactions |
| `typeset [target]` | Typography audit, font selection, hierarchy |
| `layout [target]` | Spacing systems, visual rhythm, grid |
| `adapt [target]` | Mobile, tablet, desktop, print adaptation |
| `clarify [target]` | UX copy, error messages, button labels, empty states |
| `onboard [target]` | First-run flows, empty states, feature discovery |
| `delight [target]` | Micro-interactions, personality, satisfying feedback |
| `launch [target]` | Production hardening and Core Web Vitals optimization |
| `overdrive [target]` | View Transitions API, WebGL, scroll-driven animations |
| `parallax [target]` | Multi-layer depth, scrollytelling, AI-adaptive motion governance, WCAG 2.2.2 compliance |
| `document` | Generate DESIGN.md from existing project code |
| `extract [target]` | Pull reusable tokens and components into a design system |
| `tokens [project]` | Audit or create a two-layer CSS token system |
| `live [target]` | Interactive variant mode (requires running dev server) |

---

### `/seo` — Search Engine Optimization

Get found on Google and AI search engines.

| Command | What it does |
|---------|-------------|
| `audit [url]` | Full site SEO audit — crawls up to 500 pages, scores 7 dimensions, outputs ACTION-PLAN.md |
| `page [url]` | Deep single-page analysis — title, meta, H1-H6, schema, images, content score |
| `plan [business-type]` | Complete SEO strategy — architecture, content pillars, keyword plan, 4-phase roadmap |
| `technical [url]` | Robots.txt, sitemaps, Core Web Vitals, mobile, security headers, AI crawlers |
| `schema [url]` | Detect, validate, and generate Schema.org JSON-LD |
| `content [url]` | E-E-A-T, readability, keyword density, AI citation readiness |
| `geo [url]` | Weighted GEO score — Google AIO, ChatGPT, Perplexity, Bing Copilot subscores |
| `geo quick [url]` | 60-second GEO snapshot with top 3 quick wins |
| `geo compare [url]` | GEO delta tracking against a stored baseline |
| `sitemap [url\|generate]` | XML sitemap validation and generation |
| `images [url]` | Image SEO — alt text, formats, lazy loading, CLS, LCP |
| `local [url]` | Local SEO — GBP, NAP, citations, reviews, LocalBusiness schema |
| `hreflang [url\|generate]` | Hreflang validation and generation |
| `programmatic [url\|plan]` | Programmatic SEO with quality gates |
| `competitor-pages [url\|generate]` | Comparison and alternatives pages with feature matrices |
| `cluster [keyword]` | Semantic keyword clustering and content architecture |
| `sxo [url]` | Search Experience Optimization — intent alignment and satisfaction signals |
| `drift [url] baseline\|compare\|history` | SEO drift monitoring |
| `backlinks [url]` | Backlink profile analysis |
| `ecommerce [url]` | E-commerce SEO — products, categories, faceted navigation |
| `report [url\|file\|generate]` | Format audit output as Markdown deliverable or PDF |

**Cross-command workflows:**

- New site: `plan` → build → `technical` → `schema` → `sitemap` → `audit` → `report`
- Existing site: `audit` → `technical` → `content` → `geo` → `backlinks` → `report`
- Page not ranking: `page` → `content` → `schema` → `sxo`
- Local business: `local` → `schema` → `geo`
- Keyword strategy: `cluster` → `plan` → `programmatic`
- Before redesign: `drift baseline` → redesign → `drift compare`
- E-commerce: `ecommerce` → `schema` → `sitemap` → `images`
- Client deliverable: any command → `report` (Markdown) or `report` + PDF export

---

### `/inspect` — Quality Checks

Three tools to run before every ship.

| Command | What it does |
|---------|-------------|
| `detect [target]` | Deterministic anti-pattern scan — focus rings, touch targets, reduced-motion, parallax violations, WCAG 2.2, image strategy, forms |
| `preview [target]` | Real Chromium screenshot — desktop and mobile, reads back visually, fixes bugs in a loop |
| `review [file]` | Design engineering code review — motion crimes, a11y violations, Before/After table with score |

**Recommended pre-ship sequence:**

```
/inspect detect index.html
/inspect preview index.html
/inspect review index.html
```

---

## Knowledge Base

NullToHero ships 75 reference documents that Claude loads on demand.

### Design fundamentals
gestalt, cognitive-load, layout, typography, color-and-contrast, dark-mode-engineering, spatial-design, shape, polish, distill, bolder, quieter, amplify, simplify

### Methodology
ux-research, personas, journey-mapping, information-architecture, heuristics-scoring, critique, shape, teach

### Accessibility
accessibility-engineering, wcag-2-2, form-patterns

### Motion
motion-design, animation-engineering, animate, delight, parallax, overdrive, interaction-design

### Performance and assets
optimize, image-strategy, responsive-design, adapt, harden, launch

### Systems and architecture
component-patterns, creative-patterns, css-architecture, design-tokens, tokens, extract, brand, document

### SEO — core
audit, plan, technical, schema, content, page, geo

### SEO — new in 1.3.0
sitemap, images, local, hreflang, programmatic, competitor-pages, cluster, sxo, drift, backlinks, ecommerce

### SEO — plan assets
ecommerce-plan, saas, local-service, publisher, agency, generic

### Inspect
detect, preview, review

---

## The Journey

```
/siteasy research       ← understand the users
/siteasy ia             ← validate the structure
/siteasy setup          ← define brand, audience, tone
/siteasy plan           ← plan UX before coding
/seo plan               ← build SEO strategy in parallel
/seo cluster            ← define keyword architecture
     ↓
/siteasy build          ← build the interface
/siteasy layout         ← fix spacing and rhythm
/siteasy adapt          ← make it responsive
     ↓
/siteasy amplify        ← make it beautiful
/siteasy animate        ← add motion
/siteasy parallax       ← depth and scrollytelling
     ↓
/inspect detect         ← catch anti-patterns
/inspect preview        ← see it in a real browser
/inspect review         ← final code quality gate
     ↓
/seo audit              ← full SEO check
/seo technical          ← fix technical blockers
/seo schema             ← add structured data
/seo sitemap            ← generate and validate sitemap
/seo images             ← image SEO pass
/seo geo                ← AI search visibility
     ↓
/siteasy launch         ← harden for production
```

---

## Context Files

NullToHero works best with two files in your project root:

- **PRODUCT.md** — who your users are, your brand, tone, anti-references. Create with `/siteasy setup`.
- **DESIGN.md** — colors, typography, components. Generate with `/siteasy document`.

---

## Requirements

- **Node.js** — required for `/inspect preview`, `/inspect detect`, and the validator (`tests/validate.js`)
- **Playwright** — auto-installed on first `/inspect preview` run

---

## Release History

- **1.4.0** (May 2026) — Group C: parallel sub-agents for `/seo audit` (5 agent files), `/seo report` command (Markdown + PDF export), standardized ACTION-PLAN template across all commands, file integrity checks in validator.
- **1.3.0** (May 2026) — 11 new SEO commands (sitemap, images, local, hreflang, programmatic, competitor-pages, cluster, sxo, drift, backlinks, ecommerce). GEO upgraded with weighted scoring, platform subscores, `/geo quick`, `/geo compare`. Installer scripts, CHANGELOG, CONTRIBUTING, reference validator.
- **1.2.0** (May 2026) — Design foundations: Gestalt, UX research, IA, journey mapping, WCAG 2.2, image strategy, form patterns. Three new commands (research, ia, journey). 25 new anti-pattern rules.
- **1.1.0** (May 2026) — Parallax engineering reference and audit script. One new command (parallax). 14 new anti-pattern rules.
- **1.0.0** (April 2026) — Initial release: siteasy, seo, inspect with 31 commands and core references.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add reference files, new commands, or bug fixes.

```bash
node tests/validate.js   # run before opening a PR
```

---

## License

Apache 2.0 — [github.com/MariusYvard/NullToHero](https://github.com/MariusYvard/NullToHero)
