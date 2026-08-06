---
name: siteasy
description: "Use when the user wants to design, build, plan, critique, audit, polish, clarify, simplify, amplify, animate, typeset, layout, adapt, harden, or improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Also handles UX review, Gestalt principles, UX research, personas, journey mapping, information architecture, card sorting, tree testing, cognitive load, WCAG 2.2 accessibility, image strategy (AVIF/WebP/srcset), form patterns, performance, responsive design, mobile ergonomics (thumb-zone, touch targets), theming, anti-patterns, typography, fonts, spacing, color, motion, micro-interactions, parallax, scrollytelling, scroll-driven animations, View Transitions API, container queries, modern CSS (:has(), color-mix()), UX copy, error states, edge cases, i18n, and design systems. For bland designs that need to be bolder, loud designs that should be quieter, or ambitious visual effects. Not for backend-only tasks."
version: 3.2.0
user-invocable: true
argument-hint: "[express|build|improve|fix|ship|overhaul · shape|concept|research|ia · audit|critique · animate|amplify|simplify|delight|layout|charts|overdrive|parallax|typeset|video · adapt|mobile|clarify · harden|onboard|polish · setup|document|extract|tokens · live] [target]"
allowed-tools:
  - Bash(npx impeccable *)
  - Bash(npx playwright *)
  - Bash(npx shadcn *)
  - Bash(node *)
  - Bash(python3 *)
  - Bash(npx serve *)
  - Bash(kill *)
  - Read
  - WebFetch
  - Write
  - Edit
  - Task
  - Bash(lsof *)
---

Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft. Accessible to beginners, powerful enough for experts.

Good taste is trained, not innate, the ability to see beyond the obvious and recognize what elevates. Unseen details compound: when a feature works exactly as assumed, users proceed without a second thought. That is the goal.

## Setup (non-optional)

> Several commands (`audit`, `craft`, quality passes) call the `impeccable` CLI via `npx`. Tested with impeccable 2.3.2; pin with `npx impeccable@2.3.2` to avoid upstream drift.



Before any design work or file edits, pass these gates. Skipping them produces generic output that ignores the project.

| Gate | Required check | If fail |
|---|---|---|
| Context | PRODUCT.md and DESIGN.md are read from the workspace. | Use Read to look for PRODUCT.md; if missing, run `/siteasy setup` first. |
| Conventions | On a project that already has code, its own conventions are read BEFORE any edit: a charter or style guide at the root or in `docs/` (STYLEGUIDE, STYLE, CONVENTIONS, CONTRIBUTING, BRAND, DESIGN, `.editorconfig`), the CSS custom properties already defined, the class naming convention visible in the code, and the fonts already loaded. | Read them first. They bind every command below, including the ones that only mean to improve something. |
| Direction | If DIRECTION.md exists at the project root, it is read and honored (central idea, register, signature moment). | Commands that change the visual language re-read it. If the task contradicts the committed direction, surface the conflict; never silently override it. |
| Product | PRODUCT.md exists and is not empty or placeholder (`[TODO]` markers, <200 chars). | Run `/siteasy setup`, then resume. Never invent PRODUCT.md silently from the prompt alone: ask, and if no answer is obtainable, fall back to the rule below and mark what you assumed. |
| Command | The matching command reference is loaded when a sub-command is used. | Load the reference before continuing. |
| Craft | `/siteasy build` has a user-confirmed shape brief for this task. `setup` / PRODUCT.md never counts as shape. | Run `/siteasy shape` and wait for explicit brief confirmation. |
| Mutation | All active gates above pass. | Do not edit files yet. |

### When a question cannot be answered

Every gate above starts by asking. None of them may end by waiting forever.

Ask first, with the question tool or in conversation. If no answer is obtainable, because the tool is unavailable, the user has stepped away, or (most often) they simply do not know, then: **pick the most reasonable option, state it in one line, mark it `[ASSUMED]` where the decision is recorded, and continue.** Surface every assumption again when presenting the work, so it is corrected by someone reading the result rather than by nobody.

An assumption is not a placeholder. `[TODO]` means nothing was decided and the Product gate rejects it; `[ASSUMED]` means a decision was made on thin evidence and is waiting to be confirmed. The build proceeds on the second, never on the first.

Two reasons this is a rule and not a convenience. A beginner cannot answer "what is your brand personality" or "what counts as a conversion", and that is the question failing them, not the person: stopping there abandons exactly the user this skill exists to serve. And a flow that cannot end without an answer it cannot obtain does not stay safe, it stalls, and a stalled command teaches nobody anything.

The exception, and it is narrow: an action that destroys or publishes still stops and waits. Overwriting a file that already exists, deleting, deploying. Assuming there costs work that cannot be recovered, which is a different thing from starting on a guess that can be corrected.

### 1. Context gathering

Three files in the workspace or project root form the shared project state every command reads first and decision-making commands write back to:

- **PRODUCT.md**: required. Users, brand, tone, anti-references, strategic principles. Written by `setup`.
- **DESIGN.md**: optional, strongly recommended. Colors, typography, elevation, components. Written by `document` and `extract`.
- **LOG.md**: optional, append-only working memory. Every command that decides or produces something appends one short entry (`## <date> /<skill> <command>` + Decisions / Artifacts / Open bullets) and reads the log first to avoid re-deciding or contradicting past entries. Journeys use it as their checkpoint state; audits append their score and report path.
- **DIRECTION.md**: optional until `/siteasy concept` runs; the committed art direction (central idea, anti-reference, signature moment). Written by `concept`, refined by `tokens` and brand decisions, read by every build and motion command, judged by `critique` and by the audit's memorability agent.

Use the Read tool to check for these files. If already read in this session, don't re-read.

If PRODUCT.md is missing, empty, or placeholder: run `/siteasy setup`, then resume. If the original task was `/siteasy build`, resume into `/siteasy shape` before any implementation.

If DIRECTION.md is missing on a brand-register project: nudge once (*"Run `/siteasy concept` so every command pulls in the same direction"*), then proceed.

If DESIGN.md is missing: nudge once per session (*"Run `/siteasy document` for more on-brand output"*), then proceed.

### 2. Register

Every design task is **brand** (marketing, landing, campaign, portfolio, design IS the product) or **product** (app UI, admin, dashboard, tool, design SERVES the product).

Identify before designing. Priority: (1) cue in the task itself; (2) the surface in focus; (3) `register` field in PRODUCT.md. First match wins.

Load the matching reference: [references/brand.md](references/brand.md) or [references/product.md](references/product.md). The shared design laws below apply to both.

## Shared design laws

Apply to every design, both registers. Match implementation complexity to the aesthetic vision. Interpret creatively. Vary across projects, never converge on the same choices.

### Color

- Use OKLCH. Reduce chroma as lightness approaches 0 or 100.
- Never use `#000` or `#fff`. Tint every neutral toward the brand hue (chroma 0.005 to 0.01).
- Pick a **color strategy** before picking colors:
  - **Restrained**: tinted neutrals + one accent ≤10%. Product default; brand minimalism.
  - **Committed**: one saturated color carries 30 to 60% of the surface. Brand default for identity-driven pages.
  - **Full palette**: 3 to 4 named roles, each used deliberately. Brand campaigns; data viz.
  - **Drenched**: the surface IS the color. Brand heroes, campaign pages.

### Theme

Dark vs. light is never a default. Write one sentence of physical scene: who uses this, where, under what ambient light, in what mood. If the sentence doesn't force the answer, add detail until it does.

### Typography

- Keep body line length between 45 and 75ch, 65 to 75ch being the optimal band (L-TYPE-2).
- Hierarchy through scale + weight contrast (≥1.25 ratio between steps).

### Layout

- Vary spacing for rhythm. Same padding everywhere is monotony.
- Cards are the lazy answer. Use them only when they're truly the best affordance. Nested cards are always wrong.
- Run a Gestalt audit on every composition (proximity, similarity, closure, continuity, figure-ground, common fate, symmetry). See [references/gestalt.md](references/gestalt.md).

### Motion

- Don't animate CSS layout properties.
- Ease out with exponential curves (ease-out-quart / quint / expo). No bounce, no elastic.

### Numeric laws (canonical)

The numeric thresholds behind these laws live once, with stable identifiers, in `tools/data/laws.csv`, cite the identifier instead of restating the number: L-MOTION-1 (feedback 150-300ms), L-MOTION-2 (2 decorative loops per view), L-MOTION-3 (linear scrub), L-TOUCH-1 (44px targets), L-TOUCH-2 (8px spacing), L-MEDIA-1 (video 10/30MB), L-MEDIA-2 (models 5MB), L-MEDIA-3 (frame sequences 50/150), L-TYPE-1 (16px body), L-TYPE-2 (65-75ch), L-CONTRAST-1 (4.5:1), L-PERF-1 (LCP 2.5s), L-PERF-2 (CLS 0.1), L-PERF-3 (INP 200ms), L-WEBGL-1 (1000 draw calls), L-WEBGL-2 (DPR cap 2), L-CONTENT-1 (editorial quality 70), L-CONTENT-2 (sentence rhythm 8-15), L-CONTENT-3 (50-75 percent prose), L-VIEWPORT-1 (dvh on full-bleed), L-VIEWPORT-2 (one viewport unit per scroll system). The validator fails if a law stops being cited anywhere (check 37): when a threshold changes, change it in laws.csv and follow the citations.

### Absolute bans

Match-and-refuse. If you're about to write any of these, rewrite with different structure.

- **Side-stripe borders.** `border-left` or `border-right` > 1px as a colored accent on cards, list items, callouts.
- **Gradient text.** `background-clip: text` on anything other than display-only hero type.
- **Glassmorphism as default.** Blurs and glass cards used decoratively.
- **The hero-metric template.** Big number, small label, supporting stats, gradient accent.
- **Identical card grids.** Same-sized cards with icon + heading + text, repeated endlessly.
- **Centered hero, centered text, dark image.** Use an asymmetric split instead.
- **Modal as first thought.** Exhaust inline / progressive alternatives first.
- **Inter on brand surfaces** (and other training-data defaults like Outfit and DM Sans; see references/brand.md). Replace it with a face chosen for a stated reason tied to the concept, Cabinet Grotesk and Satoshi being two starting points. Swapping one default for another is the same miss: references/memorability.md counts Geist in the same default wave, so reaching for it without a reason trades a banned tell for an unbanned one. Product UI may use system stacks (see references/product.md).
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

## Start here

Six doors cover most requests. Nothing yet: `express [brief]`. Add to what
exists: `build [feature]`. "Make it better" without a named axis:
`improve [target]`. An audit produced findings: `fix [target]`. Finish and
publish, gates included: `ship`. Rework a whole site: `overhaul [url]`. For a
whole-site check use `/audit [url]`; to be found on Google and in AI answers,
`/seo [url]`. Everything else below is a specialist pass.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `build [feature]` | Build | Shape, then build a feature end-to-end | [references/craft.md](references/craft.md) + [references/css-architecture.md](references/css-architecture.md) + [references/component-patterns.md](references/component-patterns.md) + [references/assets-library.md](references/assets-library.md) + [references/stock-media.md](references/stock-media.md) + [references/resource-recommendations.md](references/resource-recommendations.md) + [references/resource-recipes.md](references/resource-recipes.md) + [references/fetch-asset.md](references/fetch-asset.md) + [references/sourcing-external-code.md](references/sourcing-external-code.md) |
| `shape [feature]` | Build | Shape the UX/UI before writing code | [references/shape.md](references/shape.md) + [references/landing-patterns.md](references/landing-patterns.md) + [references/offer-diagnostic.md](references/offer-diagnostic.md) |
| `setup` | Build | Create PRODUCT.md and DESIGN.md context | [references/teach.md](references/teach.md) |
| `concept [project]` | Build | Set the creative direction before building: idea, anti-reference, signature moment | [references/concept.md](references/concept.md) + [references/memorability.md](references/memorability.md) |
| `research [scope]` | Build | UX research planning, methods selection, persona and journey synthesis; generates empathy maps, journey maps and service blueprints | [references/ux-research.md](references/ux-research.md) + [references/personas.md](references/personas.md) + [references/journey-mapping.md](references/journey-mapping.md) |
| `ia [target]` | Build | Information architecture, card sorting, tree testing, navigation patterns | [references/information-architecture.md](references/information-architecture.md) |
| `document` | Build | Generate DESIGN.md from existing project code | [references/document.md](references/document.md) |
| `extract [target]` | Build | Pull reusable tokens and components into a design system; the `handoff` deliverable emits the developer spec (layout, tokens, props, states, breakpoints, motion, accessibility) | [references/extract.md](references/extract.md) + [references/handoff.md](references/handoff.md) |
| `tokens [project]` | Build | Audit or create a two-layer CSS token system, primitives + semantic layer + dark mode | [references/tokens.md](references/tokens.md) + [references/color-systems.md](references/color-systems.md) + [references/elevation.md](references/elevation.md) |
| `critique [target]` | Evaluate | UX design review with heuristic scoring | [references/critique.md](references/critique.md) + [references/memorability.md](references/memorability.md) + [references/conversion-quality.md](references/conversion-quality.md) + [references/objections.md](references/objections.md) + [references/conversion-experiments.md](references/conversion-experiments.md) |
| `audit [target]` | Evaluate | Technical quality checks (a11y, perf, responsive, WCAG 2.2, image strategy, forms) | [references/audit.md](references/audit.md) + [references/accessibility-engineering.md](references/accessibility-engineering.md) + [references/wcag-2-2.md](references/wcag-2-2.md) + [references/image-strategy.md](references/image-strategy.md) + [references/form-patterns.md](references/form-patterns.md) |
| `improve [target]` | Refine | One door for "make it better": symptom-to-axis dispatch to the right refine or enhance pass | [references/improve.md](references/improve.md) |
| `fix [target]` | Refine | Execute audit findings by remediation route: triage, per-command batches, verify | [references/fix.md](references/fix.md) |
| `polish [target]` | Refine | Final quality pass before shipping | [references/polish.md](references/polish.md) |
| `amplify [target]` | Refine | Amplify safe or bland designs, bolder typography, stronger color, more presence | [references/bolder.md](references/bolder.md) + [references/colorize.md](references/colorize.md) + [references/style-systems.md](references/style-systems.md) + [references/brand-identity.md](references/brand-identity.md) |
| `simplify [target]` | Refine | Reduce visual noise, tone down, strip to essence | [references/quieter.md](references/quieter.md) + [references/distill.md](references/distill.md) |
| `clarify [target]` | Refine | UX copy, error messages, button labels, empty states | [references/clarify.md](references/clarify.md) + [references/slop-patterns.md](references/slop-patterns.md) |
| `harden [target]` | Refine | Production hardening + performance, errors, i18n, edge cases, Core Web Vitals | [references/harden.md](references/harden.md) + [references/optimize.md](references/optimize.md) + [references/ship-checklist.md](references/ship-checklist.md) |
| `onboard [target]` | Refine | First-run flows, empty states, feature discovery, activation | [references/onboard.md](references/onboard.md) |
| `animate [target]` | Enhance | Add purposeful animations and motion | [references/animate.md](references/animate.md) + [references/animation-engineering.md](references/animation-engineering.md) + [references/motion-choreography.md](references/motion-choreography.md) + [references/motion-design.md](references/motion-design.md) |
| `typeset [target]` | Enhance | Typography audit, font selection, hierarchy | [references/typeset.md](references/typeset.md) + [references/typography.md](references/typography.md) |
| `layout [target]` | Enhance | Spacing systems, visual rhythm, grid tools | [references/layout.md](references/layout.md) |
| `charts [target]` | Enhance | Accessible data visualization: chart-type choice, a11y grades, non-color fallbacks | [references/data-viz.md](references/data-viz.md) |
| `adapt [target]` | Enhance | Mobile/tablet/desktop/print adaptation | [references/adapt.md](references/adapt.md) + [references/responsive-design.md](references/responsive-design.md) |
| `mobile [target]` | Enhance | Phone-specific ergonomics, thumb zone, touch targets, mobile navigation, virtual keyboards, mobile audit | [references/mobile-ergonomics.md](references/mobile-ergonomics.md) |
| `delight [target]` | Enhance | Micro-interactions, personality in copy, satisfying feedback | [references/delight.md](references/delight.md) + [references/creative-patterns.md](references/creative-patterns.md) |
| `overdrive [target]` | Advanced | View Transitions API, WebGL, scroll-driven animations | [references/overdrive.md](references/overdrive.md) + [references/creative-patterns.md](references/creative-patterns.md) + [references/inspiration.md](references/inspiration.md) + [references/signature-moments.md](references/signature-moments.md) |
| `video [target]` | Advanced | Guaranteed-play decorative video: classify, transcode to a canvas-decodable asset (WASM decoder), emit the drop-in component | [references/video.md](references/video.md) |
| `parallax [target]` | Advanced | Multi-layer depth, scrollytelling, AI-adaptive motion governance, WCAG 2.2.2 compliance | [references/parallax.md](references/parallax.md) |
| `live [target]` | Advanced | Interactive variant mode (requires running dev server) | [references/live.md](references/live.md) |
| `ship [scope]` | Journeys | Finish-and-ship pipeline: polish, defect scan, deterministic audit, hardening, final audit | [references/journey-ship.md](references/journey-ship.md) |
| `overhaul [url]` | Journeys | Audit-driven rework: baseline, fix by remediation route, before/after compare, ship | [references/journey-overhaul.md](references/journey-overhaul.md) |
| `express [brief]` | Journeys | Zero-to-landing: setup, concept, tokens, shape, build, motion, checks, harden | [references/journey-express.md](references/journey-express.md) |

## Running commands

When the user invokes a command:
1. Load the matching reference file(s) listed in the table above using the Read tool
2. Follow the instructions in that reference
3. Apply the shared design laws above throughout

If no command is specified, treat the request as `build` for new work, or `critique` for existing work.

Legacy names and synonyms registered in `tools/data/intents.csv` are accepted
and route to their canonical command (for example the retired `launch` name
runs `harden`).
