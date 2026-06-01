# NullToHero — Cowork Plugin

[![validate](https://github.com/MariusYvard/NullToHero/actions/workflows/validate.yml/badge.svg)](https://github.com/MariusYvard/NullToHero/actions/workflows/validate.yml)

> **v1.7.1** · 3 skills · 47 commands · 82 reference docs · 5 parallel SEO audit sub-agents · interactive live variant mode · stack-aware design-system generator · report export · deterministic anti-pattern detector

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

## What's new in 1.7.0

### Real parallel SEO audit sub-agents

`/seo audit` dispatches five specialist sub-agents (technical, content, schema, performance, GEO) in parallel through the Task tool, then aggregates them by weight, with an inline sequential fallback. The agents live in `agents/` as standard plugin agents.

### Interactive live variant mode

`/siteasy live` ships as a self-contained system: a helper daemon (HTTP and SSE), a browser picker client, git-aware source wrapping with a generated-file guard, an accept and carbonize flow, and CSP detection. No external dependency. Pick an element in the browser, choose an action, get three variants written into source, accept the one you keep.

### Stack-aware design-system generator, wired in

The 16-stack design knowledge base under `tools/design-system/` is now invocable from `/siteasy setup` to seed a DESIGN.md starting point.

### Coherence and robustness

Command references corrected throughout (`/siteasy <cmd>`, `/seo <sub>`), installers hardened, the reference index is committed and self-healing, the `/seo` skill declares its tools, both manifests gain `$schema`, and GitHub Actions are pinned to commit SHAs. The validator gained content-coherence checks (no stale command references, referenced scripts exist, declared agents are dispatched) and now runs 255 checks.

## What's new in 1.6.0

### Modern CSS coverage

`/siteasy` references now cover the View Transitions API (same-document and cross-document, with reduced-motion gating), container queries (`container-type`, `@container`, `cqi` units) and relational CSS (`:has()`, `color-mix()` token derivation).

### Consistency and release hygiene

Frontmatter added to all 56 siteasy and inspect reference files (validator now runs clean at 0 warnings). The version-consistency check covers `package.json`, and the release workflow's changelog extraction is fixed so tagged releases ship real notes. The `impeccable` CLI is credited and its tested version documented.

## What's new in 1.5.0

### Design system generator

`tools/design-system/` ships a data-driven knowledge base across 16 technology stacks (React, Next.js, Vue, Svelte, Astro, Nuxt, Angular, Laravel, HTML+Tailwind, shadcn/ui, SwiftUI, React Native, Flutter, Jetpack Compose, Three.js, Nuxt UI). Claude can now generate a stack-specific design system scaffold without loading large reference files.

### Searchable reference index

`tools/build-index.mjs` pre-builds a lightweight index of all 82 reference documents. `tools/search-references.mjs` returns the most relevant reference path for a query — Claude loads only what it needs instead of the full doc set. This keeps context budget low on large projects.

### Priority and severity model

`/siteasy` and `/inspect` now share a 1–10 severity table (accessibility first, data/charts last). Build-time and review-time triage follow the same order — no more disagreement between what `/siteasy` builds and what `/inspect` flags.

### Validator upgrades

`tests/validate.js` gains four new checks: siteasy command→reference mapping (every declared command must have a backing file), siteasy command count minimum, CHANGELOG.md absence treated as error, and `google-fonts.csv` excluded from the large-file warning. CI now runs `node tests/validate.js` even if the index build step fails (`continue-on-error` + `if: always()`).

### 82 reference documents

Seven new reference documents ship in this release (design system schemas, inspect-rules.csv, ux-guidelines patterns). Full count: 82 documents across siteasy, seo and inspect.

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
| `live [target]` | Interactive in-browser variant mode (bundled helper daemon plus picker) |

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
| `geo [url]` | Weighted GEO score — Google AIO, ChatGPT, Perplexity, Bing Copilot subscores (sub-modes: `geo quick` 60-second snapshot, `geo compare` delta vs baseline) |
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

NullToHero ships 82 reference documents that Claude loads on demand.

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

### SEO — advanced
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

- **1.7.1** (June 2026): security and accuracy audit pass. Hardened the `/siteasy live` daemon (path-confined writes, localhost-scoped CORS, CSPRNG session token, bounded request bodies and poll timeouts); fixed an FID/INP contradiction; removed dead in-doc references; corrected the README command count; fixed the marketplace `$schema` URL; added a `SECURITY.md`, validator Check 17, CI concurrency guards, installer tag-pinning, and a `__pycache__` ignore rule. Validator at 256 checks.
- **1.7.0** (June 2026): real parallel SEO audit sub-agents, self-contained `/siteasy live` variant mode, design-system generator wired into setup, command-reference coherence, installer and supply-chain hardening, validator at 255 checks.
- **1.6.0** (May 2026) — Modern CSS (View Transitions, container queries, `:has()`, `color-mix()`), full reference frontmatter (0 validator warnings), release-pipeline fixes (package.json tracking, changelog extraction), impeccable attribution.
- **1.5.0** (May 2026) — Design system generator (16 stacks), searchable reference index, priority/severity model, validator upgrades, 82 reference docs.
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

