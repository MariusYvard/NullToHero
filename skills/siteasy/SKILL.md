---
name: siteasy
description: "Use when the user wants to design, build, plan, critique, audit, polish, clarify, simplify, amplify, animate, typeset, layout, adapt, harden, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Also handles UX review, Gestalt principles, UX research methodology, personas, journey mapping, information architecture, card sorting, tree testing, cognitive load, WCAG 2.2 accessibility, image strategy (AVIF/WebP/srcset), form patterns, performance, responsive design, mobile ergonomics (thumb-zone, touch targets), theming, anti-patterns, typography, fonts, spacing, color, motion, micro-interactions, parallax, scrollytelling, scroll-driven animations, View Transitions API, container queries, modern CSS (:has(), color-mix()), UX copy, error states, edge cases, i18n, and design systems. For bland designs that need to be bolder, loud designs that should be quieter, or ambitious visual effects. Not for backend-only tasks."
version: 1.31.0
user-invocable: true
argument-hint: "[build|plan|research|ia|journey · audit|critique · animate|amplify|simplify|delight|layout|charts|overdrive|parallax|typeset · adapt|mobile|clarify · launch|onboard|polish · setup|document|extract|handoff|tokens · live] [target]"
allowed-tools:
  - Bash(npx impeccable *)
  - Bash(npx playwright *)
  - Bash(node *)
  - Bash(python3 *)
  - Bash(npx serve *)
  - Bash(kill *)
  - Read
  - Write
  - Edit
  - Task
  - Bash(lsof *)
---

Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft. Accessible to beginners, powerful enough for experts.

Good taste is trained, not innate — the ability to see beyond the obvious and recognize what elevates. Unseen details compound: when a feature works exactly as assumed, users proceed without a second thought. That is the goal.

## Setup (non-optional)

> Several commands (`audit`, `craft`, quality passes) call the `impeccable` CLI via `npx`. Tested with impeccable 2.3.2; pin with `npx impeccable@2.3.2` to avoid upstream drift.



Before any design work or file edits, pass these gates. Skipping them produces generic output that ignores the project.

| Gate | Required check | If fail |
|---|---|---|
| Context | PRODUCT.md and DESIGN.md are read from the workspace. | Use Read to look for PRODUCT.md; if missing, run `/siteasy setup` first. |
| Direction | If DIRECTION.md exists at the project root, it is read and honored (central idea, register, signature moment). | Commands that change the visual language re-read it. If the task contradicts the committed direction, surface the conflict; never silently override it. |
| Product | PRODUCT.md exists and is not empty or placeholder (`[TODO]` markers, <200 chars). | Run `/siteasy setup`, then resume. Never synthesize PRODUCT.md from the user's prompt alone. |
| Command | The matching command reference is loaded when a sub-command is used. | Load the reference before continuing. |
| Craft | `/siteasy build` has a user-confirmed shape brief for this task. `setup` / PRODUCT.md never counts as shape. | Run `/siteasy plan` and wait for explicit brief confirmation. |
| Mutation | All active gates above pass. | Do not edit files yet. |

### 1. Context gathering

Three files in the workspace or project root form the shared project state every command reads first and decision-making commands write back to:

- **PRODUCT.md** — required. Users, brand, tone, anti-references, strategic principles. Written by `setup`.
- **DESIGN.md** — optional, strongly recommended. Colors, typography, elevation, components. Written by `document` and `extract`.
- **DIRECTION.md** — optional until `/siteasy concept` runs; the committed art direction (central idea, anti-reference, signature moment). Written by `concept`, refined by `tokens` and brand decisions, read by every build and motion command, judged by `critique` and by the audit's memorability agent.

Use the Read tool to check for these files. If already read in this session, don't re-read.

If PRODUCT.md is missing, empty, or placeholder: run `/siteasy setup`, then resume. If the original task was `/siteasy build`, resume into `/siteasy plan` before any implementation.

If DIRECTION.md is missing on a brand-register project: nudge once (*"Run `/siteasy concept` so every command pulls in the same direction"*), then proceed.

If DESIGN.md is missing: nudge once per session (*"Run `/siteasy document` for more on-brand output"*), then proceed.

### 2. Register

Every design task is **brand** (marketing, landing, campaign, portfolio — design IS the product) or **product** (app UI, admin, dashboard, tool — design SERVES the product).

Identify before designing. Priority: (1) cue in the task itself; (2) the surface in focus; (3) `register` field in PRODUCT.md. First match wins.

Load the matching reference: [references/brand.md](references/brand.md) or [references/product.md](references/product.md). The shared design laws below apply to both.

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
- **Inter on brand surfaces** (and other training-data defaults like Outfit and DM Sans; see references/brand.md). Use Geist, Cabinet Grotesk, or Satoshi. Product UI may use system stacks (see references/product.md).
- **Serif fonts in software UIs or dashboards.**
- **AI Purple/Blue gradient aesthetic.** Use neutral bases (Zinc/Slate) with singular, concrete accents.
- **Pure black (#000) for large areas.** Use off-black with a hint of hue (chroma 0.005+).
- **`transition: all`.** Always specify exact properties.
- **`ease-in` on UI animations.** Use `ease-out` or a custom curve.
- **Durations > 300ms on UI feedback.**
- **Generic placeholder content.** "John Doe", "Acme Corp", "99.99%". Use realistic names, organic numbers (`47.2%`), and `picsum.photos/seed/{word}/width/height`.
- **Emojis in the website you build** (code, markup, or UI copy). Replace with proper icons (Radix, Phosphor) or SVG primitives. (Status markers like PASS/WARN/FAIL in audit reports are exempt.)

### Copy

- Every word earns its place. No restated headings, no intros that repeat the title.
- **No em dashes.** Use commas, colons, semicolons, or parentheses.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `build [feature]` | Build | Shape, then build a feature end-to-end | [references/craft.md](references/craft.md) + [references/css-architecture.md](references/css-architecture.md) + [references/component-patterns.md](references/component-patterns.md) + [references/assets-library.md](references/assets-library.md) + [references/stock-media.md](references/stock-media.md) + [references/resource-recommendations.md](references/resource-recommendations.md) + [references/resource-recipes.md](references/resource-recipes.md) + [references/fetch-asset.md](references/fetch-asset.md) |
| `plan [feature]` | Build | Plan UX/UI before writing code | [references/shape.md](references/shape.md) + [references/landing-patterns.md](references/landing-patterns.md) |
| `setup` | Build | Create PRODUCT.md and DESIGN.md context | [references/teach.md](references/teach.md) |
| `concept [project]` | Build | Set the creative direction before building: idea, anti-reference, signature moment | [references/concept.md](references/concept.md) + [references/memorability.md](references/memorability.md) |
| `research [scope]` | Build | UX research planning, methods selection, persona and journey synthesis | [references/ux-research.md](references/ux-research.md) + [references/personas.md](references/personas.md) + [references/journey-mapping.md](references/journey-mapping.md) |
| `ia [target]` | Build | Information architecture, card sorting, tree testing, navigation patterns | [references/information-architecture.md](references/information-architecture.md) |
| `journey [persona]` | Build | Generate empathy maps, journey maps, or service blueprints from research | [references/journey-mapping.md](references/journey-mapping.md) |
| `document` | Build | Generate DESIGN.md from existing project code | [references/document.md](references/document.md) |
| `extract [target]` | Build | Pull reusable tokens and components into a design system | [references/extract.md](references/extract.md) |
| `handoff [target]` | Build | Developer handoff spec: layout, tokens, props, states, breakpoints, edge cases, motion, accessibility | [references/handoff.md](references/handoff.md) |
| `tokens [project]` | Build | Audit or create a two-layer CSS token system — primitives + semantic layer + dark mode | [references/tokens.md](references/tokens.md) + [references/color-systems.md](references/color-systems.md) + [references/elevation.md](references/elevation.md) |
| `critique [target]` | Evaluate | UX design review with heuristic scoring | [references/critique.md](references/critique.md) + [references/memorability.md](references/memorability.md) |
| `audit [target]` | Evaluate | Technical quality checks (a11y, perf, responsive, WCAG 2.2, image strategy, forms) | [references/audit.md](references/audit.md) + [references/accessibility-engineering.md](references/accessibility-engineering.md) + [references/wcag-2-2.md](references/wcag-2-2.md) + [references/image-strategy.md](references/image-strategy.md) + [references/form-patterns.md](references/form-patterns.md) |
| `polish [target]` | Refine | Final quality pass before shipping | [references/polish.md](references/polish.md) |
| `amplify [target]` | Refine | Amplify safe or bland designs — bolder typography, stronger color, more presence | [references/bolder.md](references/bolder.md) + [references/colorize.md](references/colorize.md) + [references/style-systems.md](references/style-systems.md) + [references/brand-identity.md](references/brand-identity.md) |
| `simplify [target]` | Refine | Reduce visual noise, tone down, strip to essence | [references/quieter.md](references/quieter.md) + [references/distill.md](references/distill.md) |
| `clarify [target]` | Refine | UX copy, error messages, button labels, empty states | [references/clarify.md](references/clarify.md) |
| `launch [target]` | Refine | Production hardening + performance — errors, i18n, edge cases, Core Web Vitals | [references/harden.md](references/harden.md) + [references/optimize.md](references/optimize.md) + [references/ship-checklist.md](references/ship-checklist.md) |
| `onboard [target]` | Refine | First-run flows, empty states, feature discovery, activation | [references/onboard.md](references/onboard.md) |
| `animate [target]` | Enhance | Add purposeful animations and motion | [references/animate.md](references/animate.md) + [references/animation-engineering.md](references/animation-engineering.md) + [references/motion-choreography.md](references/motion-choreography.md) |
| `typeset [target]` | Enhance | Typography audit, font selection, hierarchy | [references/typeset.md](references/typeset.md) + [references/typography.md](references/typography.md) |
| `layout [target]` | Enhance | Spacing systems, visual rhythm, grid tools | [references/layout.md](references/layout.md) |
| `charts [target]` | Enhance | Accessible data visualization: chart-type choice, a11y grades, non-color fallbacks | [references/data-viz.md](references/data-viz.md) |
| `adapt [target]` | Enhance | Mobile/tablet/desktop/print adaptation | [references/adapt.md](references/adapt.md) + [references/responsive-design.md](references/responsive-design.md) |
| `mobile [target]` | Enhance | Phone-specific ergonomics — thumb zone, touch targets, mobile navigation, virtual keyboards, mobile audit | [references/mobile-ergonomics.md](references/mobile-ergonomics.md) |
| `delight [target]` | Enhance | Micro-interactions, personality in copy, satisfying feedback | [references/delight.md](references/delight.md) + [references/creative-patterns.md](references/creative-patterns.md) |
| `overdrive [target]` | Advanced | View Transitions API, WebGL, scroll-driven animations | [references/overdrive.md](references/overdrive.md) + [references/creative-patterns.md](references/creative-patterns.md) + [references/inspiration.md](references/inspiration.md) + [references/signature-moments.md](references/signature-moments.md) |
| `parallax [target]` | Advanced | Multi-layer depth, scrollytelling, AI-adaptive motion governance, WCAG 2.2.2 compliance | [references/parallax.md](references/parallax.md) |
| `live [target]` | Advanced | Interactive variant mode (requires running dev server) | [references/live.md](references/live.md) |
| `ship [scope]` | Journeys | Finish-and-ship pipeline: polish, defect scan, deterministic audit, hardening, final audit | [references/journey-ship.md](references/journey-ship.md) |
| `overhaul [url]` | Journeys | Audit-driven rework: baseline, triage by remediation route, execute, compare | [references/journey-overhaul.md](references/journey-overhaul.md) |
| `express [brief]` | Journeys | Zero-to-landing: setup, concept, tokens, plan, build, motion, checks, launch | [references/journey-express.md](references/journey-express.md) |

## Running commands

When the user invokes a command:
1. Load the matching reference file(s) listed in the table above using the Read tool
2. Follow the instructions in that reference
3. Apply the shared design laws above throughout

If no command is specified, treat the request as `build` for new work, or `critique` for existing work.
