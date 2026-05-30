---
name: siteasy
description: "Use when the user wants to design, build, plan, critique, audit, polish, clarify, simplify, amplify, animate, typeset, layout, adapt, harden, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Also handles UX review, Gestalt principles, UX research methodology, personas, journey mapping, information architecture, card sorting, tree testing, cognitive load, WCAG 2.2 accessibility, image strategy (AVIF/WebP/srcset), form patterns, performance, responsive design, theming, anti-patterns, typography, fonts, spacing, color, motion, micro-interactions, parallax, scrollytelling, scroll-driven animations, UX copy, error states, edge cases, i18n, and design systems. For bland designs that need to be bolder, loud designs that should be quieter, or ambitious visual effects. Not for backend-only tasks."
version: 1.5.0
user-invocable: true
argument-hint: "[build|plan|research|ia|journey · audit|critique · animate|amplify|simplify|delight|layout|overdrive|parallax|typeset · adapt|clarify · launch|onboard|polish · setup|document|extract|tokens · live] [target]"
license: "Apache-2.0"
allowed-tools:
  - Bash(npx impeccable *)
  - Bash(npx playwright *)
  - Bash(node *)
  - Bash(python3 -m http.server *)
  - Bash(python3 tools/design-system/scripts/*)
  - Bash(npx serve *)
  - Bash(kill *)
  - Read
  - Write
---

Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft. Accessible to beginners, powerful enough for experts.

Good taste is trained, not innate — the ability to see beyond the obvious and recognize what elevates. Unseen details compound: when a feature works exactly as assumed, users proceed without a second thought. That is the goal.

## Setup (non-optional)

Before any design work or file edits, pass these gates. Skipping them produces generic output that ignores the project.

| Gate | Required check | If fail |
|---|---|---|
| Context | PRODUCT.md and DESIGN.md are read from the workspace. | Use Read to look for PRODUCT.md; if missing, run `/siteasy setup` first. |
| Product | PRODUCT.md exists and is not empty or placeholder (`[TODO]` markers, <200 chars). | Run `/siteasy setup`, then resume. Never synthesize PRODUCT.md from the user's prompt alone. |
| Command | The matching command reference is loaded when a sub-command is used. | Load the reference before continuing. |
| Craft | `/siteasy build` has a user-confirmed shape brief for this task. `setup` / PRODUCT.md never counts as shape. | Run `/siteasy plan` and wait for explicit brief confirmation. |
| Mutation | All active gates above pass. | Do not edit files yet. |

### 1. Context gathering

Two files in the workspace or project root:

- **PRODUCT.md** — required. Users, brand, tone, anti-references, strategic principles.
- **DESIGN.md** — optional, strongly recommended. Colors, typography, elevation, components.

Use the Read tool to check for these files. If already read in this session, don't re-read.

If PRODUCT.md is missing, empty, or placeholder: run `/siteasy setup`, then resume. If the original task was `/siteasy build`, resume into `/siteasy plan` before any implementation.

If DESIGN.md is missing: nudge once per session (*"Run `/siteasy document` for more on-brand output"*), then proceed.

### 2. Register

Every design task is **brand** (marketing, landing, campaign, portfolio — design IS the product) or **product** (app UI, admin, dashboard, tool — design SERVES the product).

Identify before designing. Priority: (1) cue in the task itself; (2) the surface in focus; (3) `register` field in PRODUCT.md. First match wins.

Load the matching reference: [references/brand.md](references/brand.md) or [references/product.md](references/product.md). The shared design laws below apply to both.

## When to apply

**Must use** — choosing colors, type, spacing or layout; building or refactoring components (buttons, modals, forms, tables); designing pages (landing, dashboard, admin); reviewing UI for accessibility or visual consistency; adding motion or responsive behavior.

**Recommended** — the UI looks "not professional enough" but the reason is unclear; a pre-launch quality pass; aligning a design system.

**Skip** — pure backend, API or database work; non-visual scripts; infrastructure.

Decision criteria: if the task changes how a feature looks, feels, moves or is interacted with, apply this skill.

## Priority order (severity)

Resolve issues top-down. A CRITICAL accessibility failure outranks any styling or motion polish: fix priority 1 before 2, 2 before 3, and so on. `/inspect` triages by the same order, so build-time and review-time never disagree on what to fix first.

| # | Category | Severity | Must-have checks | Anti-patterns to avoid |
|---|----------|----------|------------------|------------------------|
| 1 | Accessibility | CRITICAL | Contrast 4.5:1 (3:1 large text), visible focus rings, alt text, keyboard nav, aria-label on icon-only buttons | Removing focus outlines, icon-only buttons without labels, color as the only signal |
| 2 | Touch and interaction | CRITICAL | Targets 44x44px or larger, 8px or more spacing, loading and disabled feedback | Hover-only actions, instant 0ms state changes |
| 3 | Performance and Core Web Vitals | HIGH | WebP or AVIF, lazy-load below the fold, reserve space (CLS under 0.1), LCP under 2.5s | Layout thrashing, unsized media, render-blocking scripts |
| 4 | Structure and semantics | HIGH | Sequential h1 to h6, one h1, landmarks, valid HTML | Skipped heading levels, div-only structure |
| 5 | Layout and responsive | HIGH | Mobile-first breakpoints, viewport meta, no horizontal scroll | Fixed px container widths, disabled zoom |
| 6 | Typography and color | MEDIUM | Base 16px or larger, line-height near 1.5, semantic tokens | Body text under 12px, gray-on-gray, raw hex in components |
| 7 | Motion | MEDIUM | Duration 150 to 300ms, motion conveys meaning, prefers-reduced-motion respected | Decorative-only animation, animating width or height, ignoring reduced-motion |
| 8 | Forms and feedback | MEDIUM | Visible labels, errors near the field, helper text, autocomplete | Placeholder-as-label, errors only at the top |
| 9 | Navigation | MEDIUM | Predictable back, five or fewer primary items, clear active state | Overloaded nav, broken back behavior |
| 10 | Data and charts | LOW | Legends, tooltips, accessible colors, a text alternative | Color as the only encoding |

## Finding references fast

This skill has 50+ reference docs and some are large. Don't load them whole to find a topic. Query the index:

```
node tools/search-references.mjs "<topic>" --skill siteasy
```

It returns the most relevant reference paths so you open only what the task needs. Rebuild after adding refs: `node tools/build-index.mjs`.

## Multi-stack and design system generator

The reference docs above are framework-agnostic (HTML and CSS). For framework-specific guidance or a fast, data-driven starting point, use the design-system subsystem in `tools/design-system/` (16 stacks, MIT-adapted from ui-ux-pro-max-skill; see ATTRIBUTION.md). Pure Python standard library.

Stack-specific guidance (react, nextjs, vue, svelte, astro, nuxtjs, nuxt-ui, angular, laravel, html-tailwind, shadcn, swiftui, react-native, flutter, jetpack-compose, threejs):

```
python3 tools/design-system/scripts/search.py "<topic>" --stack react
```

Generate a tailored design system from a short product brief (page pattern, style, WCAG-checked palette, type pairing, key effects, anti-patterns, pre-delivery checklist):

```
python3 tools/design-system/scripts/search.py "<brief>" --design-system -p "Project Name"
python3 tools/design-system/scripts/search.py "<brief>" --design-system --persist -p "Project Name"
```

This is the data-driven counterpart to `setup`. With `--persist` it writes the system to a MASTER file plus optional per-page overrides. Use it to seed DESIGN.md, then refine by hand. Full usage in [../../tools/design-system/README.md](../../tools/design-system/README.md).

## Shared design laws

Apply to every design, both registers. Match implementation complexity to the aesthetic vision. Interpret creatively. Vary across projects — never converge on the same choices.

### Color

- Use OKLCH. Reduce chroma as lightness approaches 0 or 100.
- Never use `#000` or `#fff`. Tint every neutral toward the brand hue (chroma 0.005–0.01).
- Pick a **color strategy** before picking colors:
  - **Restrained** — tinted neutrals + one accent ≤10%. Product default; brand minimalism.
  - **Committed** — one saturated color carries 30–60% of the surface. Brand default for identity-driven pages.
  - **Full palette** — 3–4 named roles, each used deliberately. Brand campaigns; data viz.
  - **Drenched** — the surface IS the color. Brand heroes, campaign pages.

### Theme

Dark vs. light is never a default. Write one sentence of physical scene: who uses this, where, under what ambient light, in what mood. If the sentence doesn't force the answer, add detail until it does.

### Typography

- Cap body line length at 65–75ch.
- Hierarchy through scale + weight contrast (≥1.25 ratio between steps).

### Layout

- Vary spacing for rhythm. Same padding everywhere is monotony.
- Cards are the lazy answer. Use them only when they're truly the best affordance. Nested cards are always wrong.
- Run a Gestalt audit on every composition (proximity, similarity, closure, continuity, figure-ground, common fate, symmetry). See [references/gestalt.md](references/gestalt.md).

### Motion

- Don't animate CSS layout properties.
- Ease out with exponential curves (ease-out-quart / quint / expo). No bounce, no elastic.

### Absolute bans

Match-and-refuse. If you're about to write any of these, rewrite with different structure.

- **Side-stripe borders.** `border-left` or `border-right` > 1px as a colored accent on cards, list items, callouts.
- **Gradient text.** `background-clip: text` on anything other than display-only hero type.
- **Glassmorphism as default.** Blurs and glass cards used decoratively.
- **The hero-metric template.** Big number, small label, supporting stats, gradient accent.
- **Identical card grids.** Same-sized cards with icon + heading + text, repeated endlessly.
- **Centered hero, centered text, dark image.** Use an asymmetric split instead.
- **Modal as first thought.** Exhaust inline / progressive alternatives first.
- **Inter font.** Use Geist, Outfit, Cabinet Grotesk, or Satoshi.
- **Serif fonts in software UIs or dashboards.**
- **AI Purple/Blue gradient aesthetic.** Use neutral bases (Zinc/Slate) with singular, concrete accents.
- **Pure black (#000) for large areas.** Use off-black with a hint of hue (chroma 0.005+).
- **`transition: all`.** Always specify exact properties.
- **`ease-in` on UI animations.** Use `ease-out` or a custom curve.
- **Durations > 300ms on UI feedback.**
- **Generic placeholder content.** "John Doe", "Acme Corp", "99.99%". Use realistic names, organic numbers (`47.2%`), and `picsum.photos/seed/{word}/width/height`.
- **Emojis in code, markup, or UI copy.** Replace with proper icons (Radix, Phosphor) or SVG primitives.

### Copy

- Every word earns its place. No restated headings, no intros that repeat the title.
- **No em dashes.** Use commas, colons, semicolons, or parentheses.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `build [feature]` | Build | Shape, then build a feature end-to-end | [references/craft.md](references/craft.md) + [references/css-architecture.md](references/css-architecture.md) + [references/component-patterns.md](references/component-patterns.md) |
| `plan [feature]` | Build | Plan UX/UI before writing code | [references/shape.md](references/shape.md) |
| `setup` | Build | Create PRODUCT.md and DESIGN.md context | [references/teach.md](references/teach.md) |
| `research [scope]` | Build | UX research planning, methods selection, persona and journey synthesis | [references/ux-research.md](references/ux-research.md) + [references/personas.md](references/personas.md) + [references/journey-mapping.md](references/journey-mapping.md) |
| 