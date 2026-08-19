---
name: handoff
description: "A developer handoff spec. Turns a finished design into an implementable contract: layout and measurements, tokens, component props and states, interaction and motion, responsive breakpoints, edge cases, and accessibility."
version: 1.18.0
---

# Developer Handoff

A handoff is the contract between a design and the engineer who builds it. A good one answers the questions an implementer would otherwise guess at, so the build matches intent the first time. A screenshot is not a handoff. The spec below is.

Produce it as a single document per screen or component. Reference tokens, never raw values, wherever a token exists.

## Layout and measurements

- The grid: column count, gutter, margin, and max content width.
- Spacing between major regions, as token steps (`--space-6`), not pixels invented on the spot.
- Alignment rules: what is centered, what is flush, what hangs to a baseline.
- Any intrinsic sizes: a sidebar at a fixed width, a media block at a set aspect ratio.

## Design tokens

List the tokens the screen consumes so the engineer wires variables, not constants.

- Color roles used (`--bg`, `--surface`, `--accent`, `--fg-muted`) and where each applies.
- Type steps used (`--text-lg` for the heading, `--text-base` for body) with weight and line height.
- Radius and elevation tokens per surface.
- If a value has no token yet, that is a gap to close before handoff, not a one-off hex to paste.

## Components: props, variants, states

For each component on the screen:

- Props: the inputs that change it (label, icon, size, disabled).
- Variants: the named forms (primary, secondary, ghost) and when each is used.
- States, all of them: default, hover, focus-visible, active, disabled, loading, error, empty, selected. A state with no spec is a state the engineer will invent.
- The accessible name and role if it is not obvious from the markup.

## Interaction and motion

- What each interactive element does on click, tap, hover and keyboard.
- Transitions: which property, what duration, what easing token. Stay within the 300ms UI ceiling and ease-out for entrances.
- Stagger and sequence for any group animation, in milliseconds per item.
- The reduced-motion behavior: what the element does under `prefers-reduced-motion: reduce`.

## Responsive behavior

- The breakpoints in play and what changes at each: a two-column split that stacks, a nav that collapses to a menu, type that steps down.
- What is fluid (via `clamp()`) versus what snaps at a breakpoint.
- Touch versus pointer differences: larger targets, no hover-only affordances on touch.

## Edge cases and content limits

The cases a happy-path mockup hides:

- Minimum and maximum content: a one-word title and a title that wraps to three lines.
- Long strings, other languages, and right-to-left if in scope.
- Zero, one, and many: an empty list, a single item, an overflowing one.
- Slow and failed loads: what shows while data is pending and when it errors.

## Accessibility notes

- Focus order through the screen, and any focus trap a dialog needs.
- ARIA roles and labels that the visual design implies but the markup must declare.
- Keyboard interactions: what Enter, Space, Escape and arrows do.
- Live-region announcements for async changes (a saved toast, a validation error).

## Delivery checklist

Before calling it handed off:

- [ ] Every state of every interactive element is specified, not just default.
- [ ] All values reference tokens, or the missing tokens are flagged.
- [ ] Responsive behavior is stated for each breakpoint.
- [ ] Edge cases (empty, long, error) are shown, not implied.
- [ ] Accessibility (focus, roles, keyboard) is documented.
- [ ] Nothing here duplicates the codebase; it references it.
