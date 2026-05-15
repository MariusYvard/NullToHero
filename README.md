# NullToHero — Cowork Plugin

> **v1.2.0** · 3 skills · 35 commands · 64 reference docs · real browser preview · deterministic anti-pattern detector

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

---

## What's new in 1.2.0

Design foundations layer added to siteasy and inspect.

- **Gestalt principles** — the seven cognitive laws governing layout perception, with a 7-question audit.
- **UX research methodology** — qualitative and quantitative methods, the five-user rule, card sorting, tree testing, SUS, A/B testing, ethics.
- **Information architecture** — findability vs discoverability, mental models, navigation patterns, 10-point IA audit.
- **Journey mapping** — empathy maps, customer journey maps with emotion curves, service blueprints, user flows.
- **WCAG 2.2 reference** — all nine new success criteria (focus not obscured, target size 24px, dragging movements, accessible authentication, redundant entry, consistent help) with code patterns.
- **Image strategy** — AVIF/WebP/SVG decision matrix, modern `<picture>` pattern, srcset and sizes mechanics, LCP optimization, alt text rules.
- **Form patterns** — single column layout, complete autocomplete vocabulary, validation timing, accessible authentication, one-time-code handling.

Three new commands in `/siteasy`: `research`, `ia`, `journey`. The `inspect` toolkit gains 25 new anti-pattern rules (WCAG 2.2, image strategy, forms).

### Earlier additions (1.1.0)

- **Parallax engineering** — six effect typologies, three implementation paths (CSS perspective, native Scroll-Driven Animations, Lenis+GSAP), Core Web Vitals discipline, AI-adaptive governance, Playwright audit script.

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
| `launch [target]` | Production hardening + Core Web Vitals optimization |
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
| `geo [url]` | Optimize for Google AI Overviews, ChatGPT, Perplexity, Bing Copilot |

**Cross-command workflows:**

- New site: `plan` → build → `technical` → `schema` → `audit`
- Existing site: `audit` → `technical` → `content` → `geo`
- Page not ranking: `page` → `content` → `schema`

---

### `/inspect` — Quality Checks

Three tools to run before every ship.

| Command | What it does |
|---------|-------------|
| `detect [target]` | Deterministic anti-pattern scan — focus rings, touch targets, reduced-motion, parallax violations, WCAG 2.2, image strategy, forms |
| `preview [target]` | Real Chromium screenshot — desktop + mobile, reads back visually, fixes bugs in a loop |
| `review [file]` | Design engineering code review — motion crimes, a11y violations, Before/After table with score |

**Recommended pre-ship sequence:**

```
/inspect detect index.html
/inspect preview index.html
/inspect review index.html
```

For parallax sections, `inspect review` also runs the Playwright audit at `skills/siteasy/scripts/parallax-audit.mjs`, measuring FPS, LCP, CLS, INP, and reduced-motion compliance under desktop and Pixel 5 profiles.

---

## Knowledge Base

NullToHero ships 64 reference documents that Claude loads on demand. Coverage by domain:

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

### SEO
audit, plan, technical, schema, content, page, geo, plan-assets (ecommerce, saas, local-service, publisher, agency, generic)

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

- **Node.js** — required for `/inspect preview`, `/inspect detect`, and the parallax audit script
- **Playwright** — auto-installed on first `/inspect preview` or `parallax-audit.mjs` run

---

## Release History

- **1.2.0** (May 2026) — Design foundations: Gestalt, UX research, IA, journey mapping, WCAG 2.2, image strategy, form patterns. Three new commands (research, ia, journey). 25 new anti-pattern rules.
- **1.1.0** (May 2026) — Parallax engineering reference and audit script. One new command (parallax). 14 new anti-pattern rules.
- **1.0.0** (initial release) — siteasy, seo, inspect skills with 31 commands and core references.

---

## License

Apache 2.0 — [github.com/MariusYvard/NullToHero](https://github.com/MariusYvard/NullToHero)
