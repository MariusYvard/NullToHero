# NullToHero — Cowork Plugin

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

**From zero knowledge to hero website.**

NullToHero gives Claude a complete design + SEO vocabulary so anyone, even with no prior experience, can build websites that look professional and rank on Google.

3 skills · 34 commands · real browser preview · deterministic anti-pattern detector

By [Marius Yvard](https://lecvdemarius.netlify.app/) · Apache 2.0

---

## Skills

### `/siteasy` — Design
Build, polish, and ship production-grade interfaces.

| Command | What it does |
|---------|-------------|
| `build [feature]` | Build a full UI feature end-to-end with a confirmed design brief |
| `plan [feature]` | Plan UX and visual direction before writing code |
| `setup` | Create PRODUCT.md — brand, audience, tone, anti-references |
| `critique [target]` | Design review with heuristic scoring |
| `audit [target]` | Technical quality checks — a11y, performance, responsive |
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
| `detect [target]` | Deterministic anti-pattern scan — focus rings, clipped dropdowns, touch targets, reduced-motion |
| `preview [target]` | Real Chromium screenshot — desktop + mobile, reads back visually, fixes bugs in a loop |
| `review [file]` | Design engineering code review — motion crimes, a11y violations, Before/After table with score |

**Recommended pre-ship sequence:**
```
/inspect detect index.html
/inspect preview index.html
/inspect review index.html
```

---

## The Journey

```
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

- **Node.js** — required for `/inspect preview` and `/inspect detect`
- **Playwright** — auto-installed on first `/inspect preview` run

---

## License

Apache 2.0 — [github.com/MariusYvard/NullToHero](https://github.com/MariusYvard/NullToHero)
