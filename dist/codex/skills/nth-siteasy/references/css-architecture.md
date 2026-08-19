---
name: css-architecture
description: "Which CSS architecture to reach for, and why: layer order, isolation, token flow and the decisions that outlive a framework. Load for /nth-siteasy build, /nth-siteasy extract, and any work touching a project's CSS foundation."
version: 2.0.0
---

# CSS Architecture

What to reach for, and why. Not how the features work: a current model writes `@layer`, `@scope`, `:has()`, `@property`, container queries and `color-mix()` correctly without being taught their syntax. What it does not do on its own is *choose* them over the older answer, and that choice is what this file carries.

Measured, so the claim is checkable: on a component demanding all eight of those features, output was equivalent with and without this file loaded. On an open question ("my rule is ignored, I put `!important` everywhere"), the answer WITH this file reached for cascade layers and a migration path, and the answer without it explained specificity and stopped there. Both were correct. Only one was architecture.

---

## The decision tree

```
New project, greenfield:
  → @layer reset, base, tokens, components, utilities, overrides
  → CSS custom properties for all tokens
  → Native nesting
  → Logical properties everywhere

Existing codebase with specificity hell:
  → Add @layer at the entry point, put existing CSS in @layer legacy
  → Add new styles in @layer components (above legacy)
  → Migrate gradually, never in one pass

Component library:
  → @scope for isolation
  → @layer components for all component styles
  → Component-level custom properties for variants

Design system with themes:
  → @property for animatable tokens
  → Two-layer token architecture (primitive, then semantic)
  → Dark mode by overriding the semantic layer only
```

## The layer order, and why that one

```css
@layer reset, base, tokens, components, utilities, overrides;
```

Declare it once, at the top of the entry point, before any rule. Order is priority: later layers win regardless of selector weight, which is the whole point. A utility class of one word beats a three-class component selector, and nobody has to count specificity again.

The rule that follows: **stop writing `!important`.** In a layered sheet it is never the answer, and every `!important` already in the codebase is a lever you have spent and cannot spend twice. When a page has fallen into that trap, the exit is the migration path in the tree above, not a stronger selector.

Third-party CSS goes in its own layer so it can never outrank yours:

```css
@import url("vendor.css") layer(vendor);
@layer vendor, base, components;
```

## Isolation: `@scope`, not deeper selectors

Scope a component to its subtree instead of prefixing every rule with a block class. The point is not brevity, it is that scoped selectors keep the specificity of what they actually target: a `p` inside a scoped block still weighs 0,0,1, so the page can still override it.

```css
@scope (.panel) to (.panel-footer) { p { color: var(--color-text-secondary); } }
```

The lower boundary matters as much as the upper one. Without it, a scoped rule reaches into a footer or a slot that belongs to the page, which is the bug that makes people abandon scoping and go back to prefixes.

Reach for `@scope` before reaching for a naming convention. BEM exists to simulate this in a language that could not do it; the language can now.

## Base styles: zero specificity on purpose

Wrap resets and element defaults in `:where()` so they weigh nothing and any later rule beats them without a fight.

```css
:where(ul, ol) { list-style: none; padding: 0; margin: 0; }
:where(a) { color: inherit; text-decoration: none; }
```

A reset that has to be overridden is a reset that was written wrong.

## Logical properties by default

Write `padding-inline`, `margin-block`, `border-inline-start`, `max-inline-size`. Not because a right-to-left version is planned, but because the physical names encode an assumption that stops being true the day it is, and rewriting a stylesheet under that pressure is a bad afternoon.

One caution, since the parent skill bans it: a coloured `border-inline-start` above 1px is the side-stripe border, logical name or not. The property is the lesson, not the decoration.

## Container queries for anything reusable

A component that reads the viewport is a component that breaks when someone puts it in a sidebar. Give it a container and query that.

```css
.panel { container-type: inline-size; container-name: panel; }
@container panel (min-width: 30rem) { .panel-grid { grid-template-columns: 1fr 1fr; } }
```

Media queries stay for page-level layout, which genuinely is about the viewport.

## One source colour, derived states

Derive hover, pressed, subtle and border from a single brand token rather than hand-picking hex values that drift apart over a year.

```css
:root { --brand: oklch(0.62 0.17 250); }
.button:hover { background: color-mix(in oklch, var(--brand) 88%, black); }
```

Mix in `oklch`, not `srgb`: it holds perceived lightness across hues, which is what stops a "10 percent darker" from looking fine on blue and muddy on yellow. When the mixed value has to animate, register it with `@property` so the browser interpolates a colour instead of swapping a string.

## Fluid values, bounded

`clamp()` for headings and display type on marketing pages. Keep `max <= ~2.5 x min`, past which the jump between a phone and a wide monitor stops reading as one design. Body text stays fixed even on marketing pages.

## Teach the reflex, not just the fix

When someone asks why a rule is ignored, hand them the way to see it for themselves: inspect the element, and read the rule list. Struck-through declarations lost, the top one won. It turns "my CSS does not work" into a question they can answer alone next time, and it takes one sentence to pass on.

## Common mistakes this file exists to prevent

- Reaching for a naming convention when the language has scoping.
- Declaring layers but putting nothing in `overrides`, so the escape hatch is missing when it is needed.
- Scoping without a lower boundary, then blaming `@scope`.
- Using `:has()` for critical layout with no sensible base style, so the page collapses where it is unsupported.
- Deep `:has()` chains: keep them shallow, they are evaluated a lot.
- Animating a custom property that was never registered, and getting a snap instead of a transition.

## External tools

- **Clippy** (visual editor for CSS clip-path shapes). https://bennettfeely.com/clippy/
- **Shadow Palette Generator** (layered realistic CSS box-shadows). https://www.joshwcomeau.com/shadow-palette/
- **CSS Grid Generator** (builds CSS Grid layouts and exports code). https://grid.layoutit.com/
- **Fancy Border Radius** (eight-value CSS border-radius from handles). https://9elements.github.io/fancy-border-radius/
- **Get Waves** (SVG wave shapes for section dividers). https://getwaves.io/
- **A Modern CSS Reset** (baseline reset for cross-browser rendering). https://piccalil.li/blog/a-modern-css-reset/
- **Critical Path CSS Generator** (extracts above-the-fold critical CSS). https://www.sitelocity.com/critical-path-css-generator
- **Neumorphism.io** (generates soft-UI CSS box-shadow code). https://neumorphism.io/
