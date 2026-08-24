---
name: nth-siteasy
description: "Design, build, critique and polish a frontend interface: landing pages, dashboards, product UI, components, forms, onboarding, empty states. Covers UX and information architecture, WCAG 2.2 accessibility, typography, color, spacing, motion and micro-interactions, responsive and mobile ergonomics, UX copy, design systems and design tokens."
license: Apache-2.0
compatibility: Requires Node.js 20+ and Python 3 for the deterministic tools, plus network access for page fetches. NTH_ROOT must point at the NullToHero checkout.
metadata:
  version: "4.0.0"
  host: agents
  source-skill: siteasy
  short-description: "Design, build, critique and polish a frontend interface: landing pages, dashboards, product UI, components, forms, onboarding, empty states. Covers UX and information architecture, WCAG 2.2 accessibility, typography, color, spacing, motion and micro-interactions, responsive and mobile ergonomics, UX copy, design systems and design tokens."
  argument-hint: "[express|build|improve|fix|ship|overhaul · shape|concept|research|ia · audit|critique · animate|amplify|simplify|delight|layout|charts|overdrive|parallax|typeset|video · adapt|mobile|clarify · harden|onboard|polish · setup|document|extract|tokens · preview|live] [target]"
---
<!-- Generated for Agent Skills (open standard) from null-to-hero/skills/siteasy/.
     Do not edit here. Edit the source and run tools/build-dist.mjs. -->

## Host notes

Invoke this skill with `nth-siteasy`, or by asking for it by name. Its commands are written `/nth-siteasy <command>` below.

`${NTH_ROOT}` is the absolute path of the NullToHero checkout, substituted at install time. If a command still shows the literal token, the install did not run; export `NTH_ROOT` and run it again.

This host does not publish tool names to a skill. Where the text names a tool, read it as the capability: read a file, read a media file, write a file, edit a file, match paths by pattern, search file contents, fetch a URL, search the web, run a shell command, ask the user a clarifying question, delegate to a sub-agent.

This package carries skills and no sub-agents: the Agent Skills standard covers skills alone, and there is no common format for a sub-agent. Where the text below asks for delegation, run that dimension yourself in this session. The judgement is the same; what is lost is the parallelism and the isolated context each dimension would otherwise get.

Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft. Accessible to beginners, powerful enough for experts.

Good taste is trained, not innate, the ability to see beyond the obvious and recognize what elevates. Unseen details compound: when a feature works exactly as assumed, users proceed without a second thought. That is the goal.

## Setup (non-optional)

> Several commands (`audit`, `craft`, quality passes) call the `impeccable` CLI via `npx`. Tested with impeccable 2.3.2; pin with `npx impeccable@2.3.2` to avoid upstream drift.



Before any design work or file edits, pass these gates. Skipping them produces generic output that ignores the project.

| Gate | Required check | If fail |
|---|---|---|
| Context | PRODUCT.md and DESIGN.md are read from the workspace. | Use Read to look for PRODUCT.md; if missing, run `/nth-siteasy setup` first. |
| Conventions | On a project that already has code, its own conventions are read BEFORE any edit. Run `node "${NTH_ROOT}/skills/siteasy/scripts/load-context.mjs" .` and read the `preflight` block: framework, motion stance, fonts already loaded, custom properties already defined, Tailwind theme, each with a file and a line. Then read what the scan cannot: a charter or style guide at the root or in `docs/` (STYLEGUIDE, STYLE, CONVENTIONS, CONTRIBUTING, BRAND, DESIGN, `.editorconfig`) and the class naming convention visible in the code. | Read them first. They bind every command below, including the ones that only mean to improve something. Report what the scan found before proposing anything, and say explicitly what you will preserve and what you will introduce. |
| Direction | If DIRECTION.md exists at the project root, it is read and honored (central idea, register, signature moment). | Commands that change the visual language re-read it. If the task contradicts the committed direction, surface the conflict; never silently override it. |
| Product | PRODUCT.md exists and is not empty or placeholder (`[TODO]` markers, <200 chars). | Run `/nth-siteasy setup`, then resume. Never invent PRODUCT.md silently from the prompt alone: ask, and if no answer is obtainable, fall back to the rule below and mark what you assumed. |
| Command | The matching command reference is loaded when a sub-command is used. | Load the reference before continuing. |
| Craft | `/nth-siteasy build` has a user-confirmed shape brief for this task. `setup` / PRODUCT.md never counts as shape. | Run `/nth-siteasy shape` and wait for explicit brief confirmation. |
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

  A command that ships a page also appends one machine-readable line, so the next build can be made to differ from this one rather than being told to:

  ```
  - build 2026-08-07 shape=stat-led paper=dark display=serif-display accent=warm strategy=committed
  ```

  Five closed vocabularies, listed in `tools/siteasy/variety.mjs`. An open vocabulary makes "did this change" undecidable, which is the failure the old instruction already had. Read the log with `node "${NTH_ROOT}/tools/siteasy/variety.mjs" .` before choosing, and check a choice with `--check shape=...,paper=...`. Exit 1 means the build must move (L-VARIETY-1, L-VARIETY-2).
- **DIRECTION.md**: optional until `/nth-siteasy concept` runs; the committed art direction (central idea, anti-reference, signature moment). Written by `concept`, refined by `tokens` and brand decisions, read by every build and motion command, judged by `critique` and by the audit's memorability agent.

Use the file reader to check for these files. If already read in this session, don't re-read.

If PRODUCT.md is missing, empty, or placeholder: run `/nth-siteasy setup`, then resume. If the original task was `/nth-siteasy build`, resume into `/nth-siteasy shape` before any implementation.

If DIRECTION.md is missing on a brand-register project: nudge once (*"Run `/nth-siteasy concept` so every command pulls in the same direction"*), then proceed.

If DESIGN.md is missing: nudge once per session (*"Run `/nth-siteasy document` for more on-brand output"*), then proceed.

### 2. Register

Every design task is **brand** (marketing, landing, campaign, portfolio, design IS the product) or **product** (app UI, admin, dashboard, tool, design SERVES the product).

Identify before designing. Priority: (1) cue in the task itself; (2) the surface in focus; (3) `register` field in PRODUCT.md. First match wins.

Load the matching reference: [references/brand.md](references/brand.md) or [references/product.md](references/product.md). The shared design laws below apply to both.

## Shared design laws

Apply to every design, both registers. Match implementation complexity to the aesthetic vision. Interpret creatively.

Vary across projects. That used to be the whole instruction and it was unenforceable, because nothing recorded what the last project chose. It now has a state to read (the `build` line in LOG.md) and a threshold to meet (L-VARIETY-1, L-VARIETY-2). Two consecutive builds change at least two of paper band, display family, accent hue and colour strategy, and at least one of the two is paper or display: a warm accent swapped for a cool one at the same coverage, on the same paper, under the same display face, is not a different site.

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

The numeric thresholds behind these laws live once, with stable identifiers, in `tools/data/laws.csv`, cite the identifier instead of restating the number: L-MOTION-1 (feedback 150-300ms), L-MOTION-2 (2 decorative loops per view), L-MOTION-3 (linear scrub), L-MOTION-4 (375px, the narrowest viewport entrance travel is measured against), L-TOUCH-1 (44px targets), L-TOUCH-2 (8px spacing), L-MEDIA-1 (video 10/30MB), L-MEDIA-2 (models 5MB), L-MEDIA-3 (frame sequences 50/150), L-TYPE-1 (16px body), L-TYPE-2 (65-75ch), L-CONTRAST-1 (4.5:1), L-PERF-1 (LCP 2.5s), L-PERF-2 (CLS 0.1), L-PERF-3 (INP 200ms), L-WEBGL-1 (1000 draw calls), L-WEBGL-2 (DPR cap 2), L-CONTENT-1 (editorial quality 70), L-CONTENT-2 (sentence rhythm 8-15), L-CONTENT-3 (50-75 percent prose), L-VIEWPORT-1 (dvh on full-bleed), L-VIEWPORT-2 (one viewport unit per scroll system), L-VARIETY-1 (2 of 4 look axes, one visible), L-VARIETY-2 (no shape repeat inside 3 builds). The validator fails if a law stops being cited anywhere (check 37): when a threshold changes, change it in laws.csv and follow the citations.

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
whole-site check use `/nth-audit [url]`; to be found on Google and in AI answers,
`/nth-seo [url]`. Everything else below is a specialist pass.

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
| `preview [target]` | Evaluate | Real Chromium screenshot at mobile and desktop viewports, read back visually, fix the bugs in a loop | [references/preview.md](references/preview.md) |
| `live [target]` | Advanced | Interactive variant mode (requires running dev server) | [references/live.md](references/live.md) |
| `ship [scope]` | Journeys | Finish-and-ship pipeline: polish, defect scan, deterministic audit, hardening, final audit | [references/journey-ship.md](references/journey-ship.md) |
| `overhaul [url]` | Journeys | Audit-driven rework: baseline, fix by remediation route, before/after compare, ship | [references/journey-overhaul.md](references/journey-overhaul.md) |
| `express [brief]` | Journeys | Zero-to-landing: setup, concept, tokens, shape, build, motion, checks, harden | [references/journey-express.md](references/journey-express.md) |

## Running commands

When the user invokes a command:
1. Load the matching reference file(s) listed in the table above using the file reader
2. Follow the instructions in that reference
3. Apply the shared design laws above throughout

If no command is specified, treat the request as `build` for new work, or `critique` for existing work.

Legacy names and synonyms registered in `tools/data/intents.csv` are accepted
and route to their canonical command (for example the retired `launch` name
runs `harden`).
