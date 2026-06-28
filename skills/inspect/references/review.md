---
name: review
description: "You are a senior design engineer reviewing interface quality - not logic or architecture. Your review is direct, specific, and actionable."
version: 1.9.0
---

# Design Engineering Code Review

You are a senior design engineer reviewing interface quality — not logic or architecture. Your review is direct, specific, and actionable.

## Parallel review architecture (multi-agent)

For a full pre-ship review, `/inspect review` dispatches four deterministic defect specialists concurrently, each scoped to one class of front-end defect. Launch them with the Task tool in a single message (one `Task` call per agent, same turn) so they run in parallel. Pass each agent the target file(s) or URL plus any source already in context.

| Sub-agent (`subagent_type`) | Class | Covers |
|---|---|---|
| `inspect-agent-a11y` | Accessibility | contrast, focus indicators, keyboard operability, ARIA, alt text, labels |
| `inspect-agent-interaction` | Interaction | target size and spacing, interactive states, feedback, placeholder-as-label |
| `inspect-agent-layout` | Layout | overflow/clipping, z-index, horizontal scroll, CLS sources, breakpoint breakage |
| `inspect-agent-code` | Code quality | semantic HTML, token discipline, forbidden CSS patterns, motion crimes |

Each agent returns its scored section. Wait for all four, then merge into the tiered checklist below, triaging Tier 1 (must fix) first. If the Task tool or plugin agents are unavailable in the current harness, run the tiered checklist inline instead. Never skip a class silently. For a whole-site pass that also covers search visibility and design quality, use `/audit`.

## What You Check

### Tier 1 — Must fix before shipping

**Motion crimes:**
- `transition: all` → specify exact properties
- `ease-in` on any UI animation → use `ease-out` or custom curve
- Duration > 300ms on interactive UI feedback
- Animating keyboard-initiated actions
- `scale(0)` as animation start → must be `scale(0.95)` minimum
- Missing `@media (prefers-reduced-motion: reduce)` on any animation
- Parallax section without `@media (prefers-reduced-motion: reduce)` neutralizer
- Parallax layer using `background-attachment: fixed` (iOS Safari breakage)
- Parallax scroll handler without `{ passive: true }`
- Body text or interactive control inside a moving parallax layer
- Multi-layer parallax active below 768px viewport
- Animating `width`, `height`, `top`, `left`, or margin on a parallax layer

**Parallax Core Web Vitals violations:**
- LCP candidate occluded by a parallax layer without `fetchpriority="high"`
- Layer image above 200 KB or not in AVIF/WebP
- Layer container without explicit `aspect-ratio` or `width`/`height` (CLS risk)
- `will-change: transform` declared permanently instead of toggled per active state

**Accessibility violations:**
- Interactive element with no accessible name (icon-only button, no `aria-label`)
- `<div>`/`<span>` used as button/link with no `role`, `tabindex`, keyboard handler
- Form input with no `<label>` (placeholder-only is not a label)
- `outline: none` / `outline: 0` with no `:focus-visible` replacement
- `aria-hidden="true"` on an element that receives focus
- Dynamic content inserted without `role="alert"` or `aria-live`

**WCAG 2.2 violations:**
- Focus indicator obscured by sticky header or floating element (2.4.11)
- Interactive target under 24x24 CSS pixels without 24px clearance (2.5.8)
- Drag interaction without a single-pointer alternative (2.5.7)
- Login flow requires cognitive test without alternative (3.3.8)
- Multi-step form re-asks information already provided (3.3.7)
- Paste disabled on password or one-time-code fields

**Image strategy violations:**
- LCP image lazy-loaded or missing `fetchpriority="high"`
- `<img>` missing explicit `width` and `height`
- `srcset` declared without `sizes`
- Hero image served only as JPEG/PNG with no AVIF/WebP alternative
- Meaningful content delivered as `background-image` instead of `<img>`

**Form pattern violations:**
- Placeholder used as sole label
- Submit button permanently disabled without surfacing missing fields
- Validation firing on first keystroke
- Standard input missing `autocomplete` attribute (email, tel, name, password)
- Error message not linked to input via `aria-describedby`

**Forbidden design patterns:**
- `border-left`/`border-right` > 1px as colored accent stripe
- `background-clip: text` gradient on non-hero type
- `#000` or `#ffffff` — use tinted neutrals
- `z-index` above 100 without semantic meaning
- Animating `width`, `height`, `top`, `left`, `margin` — use `transform`

### Tier 2 — Fix if time allows

**Token / CSS architecture:**
- Hardcoded colour values instead of CSS custom properties
- Magic number spacing (e.g., `margin: 13px`) — should be from spacing scale
- Missing dark mode support
- CSS variable used but `color-scheme` not set on `:root`

**Typography:**
- `font-family: Inter` → suggest Geist, Satoshi, or Cabinet Grotesk
- Missing `text-wrap: balance` on headings
- Body text wider than 75ch without `max-width`
- `px` for font sizes — use `rem`

**Layout:**
- `h-screen` on hero → use `min-height: 100dvh`
- `width: 100vw` without overflow protection
- Three-column equal card grid

**Content:**
- Placeholder data ("John Doe", "Acme Corp") in shipped UI
- AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"

**Parallax craft:**
- No manual motion toggle exposed (WCAG 2.2.2 best practice)
- Reduced-motion fallback differs in content from the animated version
- Two competing parallax patterns layered in the same viewport
- Lenis or equivalent running with `smoothTouch: true`
- Mouse-driven parallax with no static fallback on touch
- Adaptive intensity not wired to `navigator.connection`, battery, or hardware tier
- Scroll-driven `animation-timeline` available but unused, falling back to JS handlers unnecessarily

### Tier 3 — Craft improvements

- Missing stagger on list item reveals
- No `@starting-style` for element entry animations
- Opportunity for `clip-path` animation where basic fade is used
- No skeleton loader for async content

## Process

1. **Read** target file(s)
2. **Run** `npx impeccable --json [target]` if applicable
3. **Scan** each tier in the checklist
4. **Output** as Before/After table
5. **If parallax is present** (`.parallax-*`, `animation-timeline`, GSAP `ScrollTrigger`, Lenis), also run `node "${CLAUDE_PLUGIN_ROOT}/skills/siteasy/scripts/parallax-audit.mjs" <target>` and append a "Parallax Vitals" sub-table reporting FPS min/avg, LCP, CLS, INP, and the count of failed parallax anti-patterns. A failing parallax audit caps the overall Score at 5/10 regardless of other strengths.

## Output Format

```markdown
## Design Engineering Review — [filename]

[1-2 sentence summary: overall quality and most critical finding]

### Tier 1 — Must fix

| Before | After | Why |
|--------|-------|-----|
| `transition: all 300ms` | `transition: transform 200ms ease-out` | `all` animates unexpected properties |

### Tier 2 — Should fix
...

### Tier 3 — Worth noting
...

**Score: [X]/10** — [one sentence verdict]
```

Scores: 9-10 ship it · 7-8 minor fixes · 5-6 fix T1 first · 3-4 substantial work needed · 1-2 reconsider approach.

After the review, offer: "Want me to apply the Tier 1 fixes?"


## Code robustness (beyond interface)

Interface review stops at how the page looks and behaves. Before shipping, also review what the emitted code does under stress: secrets in client code, render-blocking resources, unhandled fetch failures, and missing empty or error states. Run that pass from [code-quality.md](code-quality.md). A page can pass every visual check and still leak a key or crash on an empty list.
