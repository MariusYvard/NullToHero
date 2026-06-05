# NullToHero — Cowork Plugin

[![validate](https://github.com/MariusYvard/NullToHero/actions/workflows/validate.yml/badge.svg)](https://github.com/MariusYvard/NullToHero/actions/workflows/validate.yml)

> **v1.9.0** · 4 skills · 53 commands · 83 reference docs · 13 parallel audit sub-agents (SEO + defects + design) · whole-site /audit orchestrator · interactive live variant mode · stack-aware design-system generator · report export · deterministic anti-pattern detector

**From zero knowledge to hero website.** NullToHero gives Claude a complete design, SEO and motion engineering vocabulary so anyone, even with no prior experience, can build websites that look professional, rank on Google, and pass accessibility audits.

NullToHero exposes four user-invocable skills. Claude Code namespaces plugin skills under the plugin name, so the fully-qualified commands are `/null-to-hero:siteasy`, `/null-to-hero:seo`, `/null-to-hero:inspect` and `/null-to-hero:audit`. The short forms `/siteasy`, `/seo`, `/inspect` and `/audit` also resolve as long as no other installed skill claims the same name; prefer the namespaced form if you run several plugins. Each skill routes to its sub-commands through the first argument (for example `/seo audit` or `/siteasy build`). The 53 commands listed below are these sub-commands, not separate Claude Code command files: the skills handle routing, so there is no `commands/` directory.

By [Marius Yvard](https://lecvdemarius.netlify.app/) · Apache 2.0

---

## Install via marketplace

This repo is also a Claude Code marketplace.

**A. As a marketplace (recommended, supports auto-update)**

```
/plugin marketplace add MariusYvard/NullToHero
/plugin install null-to-hero@null-to-hero-marketplace
```

Future releases pull automatically with `/plugin marketplace update null-to-hero-marketplace`.

**B. Manual install (Unix/macOS/Linux)**

```bash
git clone https://github.com/MariusYvard/NullToHero.git
bash NullToHero/install.sh
```

The one-liner `bash <(curl -fsSL https://raw.githubusercontent.com/MariusYvard/NullToHero/main/install.sh)` also works, but it executes a remote script directly. Clone and read `install.sh` first if you prefer to inspect it before running.

**C. Manual install (Windows PowerShell)**

```powershell
git clone https://github.com/MariusYvard/NullToHero.git
powershell -ExecutionPolicy Bypass -File NullToHero/install.ps1
```

---

## What's new in 1.9.0

### 13 parallel audit sub-agents

The five SEO agents are joined by four `/inspect` defect specialists (`inspect-agent-a11y`, `inspect-agent-interaction`, `inspect-agent-layout`, `inspect-agent-code`) and four `/siteasy` design-quality specialists (`siteasy-agent-ux`, `siteasy-agent-visual`, `siteasy-agent-motion`, `siteasy-agent-content`). `/siteasy audit` and `/inspect review` dispatch their agents in parallel, with an inline fallback when the Task tool is unavailable. The SEO agent files are renamed to the `seo-agent-*` convention so filenames match their dispatch names.

### New `/audit` skill

`/audit [url]` runs the whole-site audit: one shared fetch phase, all 13 sub-agents in parallel, one merged report (`SITE-AUDIT-REPORT.md`) and a prioritized `ACTION-PLAN.md`. Sub-modes `seo`, `defects`, `design` and `quick` scope the run to one agent group or a fast triage; `report` formats the result for clients.

### Correctness pass

Reconciled the font, imagery and motion contradictions between references; corrected the SEO cross-skill tables; repaired six malformed design-system CSV rows; attributed the MIT design-system component in `NOTICE` and `ATTRIBUTION.md`. Validator at 319 checks (audit skill, agent `tools` field, CSV column integrity).

---

## What's new in 1.8.2

### Correctness pass

Aligned the FAQ rich-results status across the SEO references. `references/page.md` and `references/competitor-pages.md` still described FAQ as "restricted to government and healthcare sites"; both now match `references/schema.md`, which records that Google removed FAQ rich results for all sites on May 7, 2026 (FAQPage stays a valid Schema.org type that Google still parses). Added a re-verification note to the `schema.md` status table so dated retirements get checked before they are quoted.

### Documentation and policy

The README now states the plugin-namespaced command form (`/null-to-hero:seo`) and explains that the short form depends on there being no name collision. `SECURITY.md` lists 1.8.x as the supported line.

### Validator at 261 checks

Check 20 is a regression guard: it fails if any SEO reference reintroduces a present-tense "FAQ restricted to gov/health" claim, while leaving the historical "previously restricted" note in `schema.md` untouched.

## What's new in 1.8.1

### Correctness and consistency pass

Fixed three internal links in `skills/siteasy/references/tokens.md` that resolved to a non-existent `references/references/` path. Normalised the 19 `skills/seo/references/*.md` files: they no longer declare `user-invocable`, `argument-hint` or `license`, since they are reference documents loaded by `seo/SKILL.md` rather than standalone skills. Their frontmatter now matches the siteasy and inspect references. The six `plan-assets` industry templates gain frontmatter for consistency.

### Validator at 260 checks

Check 19 is a stale-index guard: it rebuilds the reference index in memory and fails if `tools/reference-index.json` is out of date. Check 12 now also verifies the `PLUGIN_VERSION` pinned in `install.sh` and `install.ps1`, closing a version-drift gap.

## What's new in 1.8.0

### Licensing and attribution

A `NOTICE` file now carries the Apache 2.0 attribution for impeccable (Paul Bakaus) and its upstream sources (Anthropic's frontend-design skill and ehmo's typecraft-guide-skill). `ATTRIBUTION.md` states the license explicitly.

### Runtime unit tests

`tests/unit.mjs` covers the live-mode path-containment guard (`resolveInRoot`) and `tests/test_design_system.py` covers slug sanitisation (`safe_slug`). Both run in CI next to the validator, which gains Check 18 (the README headline counts must match reality). The suite is at 259 checks plus the two unit runners.

### Documentation accuracy

The install section drops an unverified direct-install path and adds a `curl | bash` caveat. The README now states the skill-and-sub-command architecture plainly.

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

### `/audit` — Whole-site

Run a complete audit across all three skills in one pass. Dispatches every specialist sub-agent, then merges the findings into one scored report.

| Command | What it does |
|---------|-------------|
| `full [url]` | All 13 sub-agents (SEO, defects, design); unified report and prioritized action plan |
| `seo [url]` | Search-visibility group only (5 SEO sub-agents) |
| `defects [url]` | Front-end defect group only (4 inspect sub-agents) |
| `design [url]` | Design-quality group only (4 siteasy sub-agents) |
| `quick [url]` | One representative sub-agent per group for fast triage |
| `report [file]` | Format an existing audit into a client-ready report or PDF |

---

## Knowledge Base

NullToHero ships 83 reference documents that Claude loads on demand.

### siteasy — design (52)
accessibility-engineering, adapt, animate, animation-engineering, audit, bolder, brand, clarify, cognitive-load, color-and-contrast, colorize, component-patterns, craft, creative-patterns, critique, css-architecture, dark-mode-engineering, delight, design-tokens, distill, document, extract, form-patterns, gestalt, harden, heuristics-scoring, image-strategy, information-architecture, inspiration, interaction-design, journey-mapping, layout, live, motion-design, onboard, optimize, overdrive, parallax, personas, polish, product, quieter, responsive-design, shape, spatial-design, teach, tokens, typeset, typography, ux-research, ux-writing, wcag-2-2

### seo — search (20)
action-plan, audit, backlinks, cluster, competitor-pages, content, drift, ecommerce, geo, hreflang, images, local, page, plan, programmatic, report, schema, sitemap, sxo, technical

### seo — plan assets (6)
agency, ecommerce, generic, local-service, publisher, saas

### inspect — defects (3)
detect, preview, review

### audit — whole-site (2)
full, report

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
- **Python 3** — required for the design-system generator (`/siteasy setup`) and the Python test suite (`tests/test_design_system.py`)

---

## Release History

- **1.9.0** (June 2026): multi-agent expansion. Added 8 specialist sub-agents (4 for `/inspect`, 4 for `/siteasy`) alongside the existing 5 SEO agents, renamed the SEO agent files to the `seo-agent-*` convention, and introduced the `/audit` meta-skill that orchestrates all 13 across search visibility, front-end defects and design quality. Audit-driven correctness pass: reconciled font, imagery and motion contradictions, corrected the SEO cross-skill tables, and attributed the MIT design-system component in `NOTICE`. Validator grows to Check 21 (audit skill, agent `tools` field, CSV integrity); 319 checks.
- **1.8.2** (June 2026): correctness pass — aligned the FAQ rich-results status across `page.md`, `competitor-pages.md` and `schema.md` (removed for all sites May 7, 2026); documented the `/null-to-hero:*` namespaced command form; refreshed the `SECURITY.md` supported-versions table to 1.8.x; validator Check 20 guards against the FAQ claim regressing (261 checks).
- **1.8.1** (June 2026): correctness pass — fixed broken `tokens.md` links, normalised SEO reference frontmatter (dropped misleading `user-invocable`/`argument-hint`), added frontmatter to the `plan-assets` templates, and grew the validator to 260 checks (stale-index guard, installer version coverage).
- **1.8.0** (June 2026): licensing and attribution pass (`NOTICE` for impeccable and its upstream sources, explicit Apache 2.0 statement in `ATTRIBUTION.md`); runtime unit tests for `resolveInRoot` and `safe_slug` wired into CI; validator Check 18 on README headline counts (259 checks); install-section accuracy fixes; `live.js` status bar uses `textContent`.
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

