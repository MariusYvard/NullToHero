---
name: component-patterns
description: "Component API conventions, the state-to-CSS boundary, and what a registry paste actually costs you. Architecture reference for /siteasy extract, /siteasy build and component-heavy design systems."
version: 2.0.0
---

# Component Patterns

A current model writes compound components, polymorphic `as` props, controlled and uncontrolled state, headless hooks, slots, forwarded refs, render props and error boundaries without a tutorial. This file does not teach those. It carries the conventions that keep an API consistent across a codebase, the styling boundary most projects get wrong, and the thing about copied registry components that costs people a production incident.

---

## The core principle

A good component does not know where it will be used. It exposes a clean API, owns its internal state, and defers everything else to its consumer. Every rule below is a consequence of that one.

## API conventions

Pick these and hold them, because the value is the consistency rather than the individual choice.

1. **Props are positive, never negative.** `isLoading`, not `isNotLoading`. `disabled`, not `notClickable`. A negated prop makes the reader invert a boolean in their head at every call site.
2. **Booleans are shorthand.** `<Button disabled>`, not `<Button disabled={true}>`.
3. **Variants, not a boolean explosion.** `<Button variant="primary" size="lg">`, never `<Button isPrimary isLarge isOutlined>`. Booleans multiply into states nobody tested; a variant enumerates the states that exist.
4. **Handlers follow `on[Event]`.**
5. **Children carry content, props carry configuration.** A `title` prop that accepts JSX is a `children` that lost its way.
6. **Defaults work out of the box.** A component needing six props to render is a function with bad ergonomics.
7. **Leave an escape hatch.** `className`, a style pass-through, or a slot. Without one, the first unforeseen need forks the component.

## Composition over configuration

The maintainable component composes small primitives rather than configuring one large one. A `<DataTable columns data pagination sorting filtering expandable virtualized />` is a framework wearing a component's name: every new need adds a prop, and no consumer can reach the piece they actually wanted. Ship `<Table>`, `<TableHeader>`, `<TableRow>` and let the page assemble them.

## The state-to-CSS boundary: data attributes

Expose component state as data attributes and style those, instead of generating class names.

```tsx
<button data-variant={variant} data-size={size} data-loading={isLoading} aria-disabled={disabled}>
```

```css
.button[data-variant="primary"] { background: var(--color-accent-default); }
.button[data-loading] { opacity: 0.7; cursor: wait; }
```

This keeps JS state and CSS styling on opposite sides of a clean line: the component announces what it is, the stylesheet decides what that looks like, and neither has to know the other's naming scheme. Radix UI, Base UI and Headless UI all converged on it.

Note the pair in that snippet. `aria-disabled` is for assistive technology, `data-loading` is for paint. State a user must perceive goes in ARIA, state only the rendering depends on goes in a data attribute. Styling from ARIA alone is tempting and wrong, because it couples the visual design to the accessibility contract.

## Animated component registries

The shadcn distribution model (shadcn/ui, Magic UI and their neighbors) copies component source into the project instead of adding a dependency. Three consequences matter:

- **The code is yours the moment it lands.** It ships under `components/`, it is versioned by your repo, and no upstream update will ever reach it. Audit it and fix it like any other file in the codebase: a flaw inherited from the registry is still your flaw in production.
- **Registry defaults are defaults.** Most animated registry components ship without a `prefers-reduced-motion` guard and with factory accent gradients. Pasting one is accepting those choices until you edit them: add the guard, bind the colours to your tokens.
- **The taxonomy is stable across libraries**: logo marquees, decorative backgrounds (SVG patterns, particles, WebGL), animated borders and beams, pointer-following spotlight cards, segmented text reveals, spring number tickers, device mockups and signature buttons. Knowing the families makes both building and auditing faster, and explains why unedited registry pages all look related.

Device mockups deserve one specific rule: prefer a pure SVG frame (server-renderable, zero hydration) over a bitmap screenshot or a client component.

Per-component install commands, canonical props and guardrails live in [component-recipes.md](component-recipes.md).

## Resource hooks

- Component libraries and registries with caveats: `python3 tools/design-system/scripts/search.py "components" --domain resources`
- How established systems solve a pattern: `python3 tools/design-system/scripts/search.py "<pattern>" --domain design-systems`
