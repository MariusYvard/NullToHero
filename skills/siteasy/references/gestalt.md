---
name: gestalt
description: "The cognitive laws that govern how humans perceive visual groupings. Every layout choice activates one or more of these principles, whether the designer intends it or not. Use."
version: 1.6.0
---

# Gestalt Principles

The cognitive laws that govern how humans perceive visual groupings. Every layout choice activates one or more of these principles, whether the designer intends it or not. Use this reference whenever a composition feels cluttered, ambiguous, or arbitrary. Pair with [layout.md](layout.md), [cognitive-load.md](cognitive-load.md), and [shape.md](shape.md).

The Gestalt school (Wertheimer, Koffka, Köhler, 1920s) established the foundational claim that the brain perceives unified wholes, not isolated parts. Modern interface design rests on this premise. A page is not a list of elements, it is a perceived structure.

## The Seven Principles

| Principle | Definition | UI lever | Failure mode if violated |
|---|---|---|---|
| Proximity | Elements close in space are perceived as related | Spacing scale, gap utilities | Form labels read as belonging to the wrong field |
| Similarity | Elements sharing visual traits are perceived as a group | Color, shape, typography, weight | Inconsistent button styles fracture the action vocabulary |
| Closure | The mind completes incomplete shapes | Implied bounds, partial dividers, focus rings | Over-drawn containers add noise without informing |
| Continuity | The eye follows the smoothest path | Baselines, gridlines, motion trails | Misaligned columns force the eye to jump |
| Figure-Ground | Foreground separates from background | Contrast, elevation, depth cues | Text floats over an active background, illegible |
| Common Fate | Elements moving together are perceived as related | Stagger, shared animation timeline | Two related items animate independently, breaking the group |
| Symmetry and Order | Symmetric arrangements feel stable and balanced | Centering, mirrored layouts, balanced asymmetry | Random offsets read as broken, not intentional |

## Operational Translations

### Proximity beats borders

Spacing communicates grouping more reliably than dividers. Default to whitespace before reaching for a line.

```css
/* Bad: divider compensates for too-small gap */
.field { padding-bottom: 8px; border-bottom: 1px solid var(--border); }

/* Good: spacing alone groups field with its label, separates from next field */
.field-group { display: grid; gap: 6px; }
.field-group + .field-group { margin-top: 28px; }
```

The minimum perceptible grouping distance is roughly 2x the intra-group spacing. If `label` and `input` are 6px apart, the next field should be at least 24px away.

### Similarity is a contract

When two elements share visual traits, users infer they share behavior. Two buttons that look the same must act the same kind of way. A "Save" with a gradient and a "Delete" with the same gradient breaks the contract.

Audit checklist:
- All primary actions share one shape and weight.
- All destructive actions share one signal (color, icon).
- All meta-text uses one size, one weight, one color tone.
- Hover states on similar elements use the same transition curve.

### Closure carries weight, use it sparingly

A focus ring is a closure cue. A card outline is a closure cue. Each one adds visual weight. If the proximity and similarity already group the elements, do not add a border.

### Continuity governs alignment

A baseline grid is a continuity device. Alignment to a visible or implied vertical line lets the eye glide. Random margins break the line and add cognitive cost.

```css
:root {
  --grid: 4px;
  --gutter: calc(var(--grid) * 6); /* 24px */
}

main { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--gutter); }
```

### Figure-Ground demands contrast

When text overlays imagery or color, the figure must dominate the ground. Either:
- Increase contrast (darker overlay, lighter text)
- Reduce ground variance (blur, desaturation, solid scrim)
- Move the figure off the ground (out of the image, into a card)

Minimum contrast ratio for body text on imagery: 4.5:1 measured across the entire travel range of any moving background. See [parallax.md](parallax.md) and [color-and-contrast.md](color-and-contrast.md).

### Common Fate orchestrates motion

Stagger reveals a group. A single animation timeline ties items into a perceived unit. Independent timings shatter the group.

```css
.list-item {
  animation: rise 300ms var(--ease-out-quart) both;
  animation-delay: calc(var(--i) * 60ms);
}
```

See [animation-engineering.md](animation-engineering.md) for stagger caps and curve selection.

### Symmetry is the safe default, asymmetry is the deliberate choice

Symmetric layouts feel stable. They are correct for forms, content-heavy text, dashboards. Asymmetric layouts feel dynamic. They are correct for editorial heroes, brand campaigns, narrative sections. Asymmetric without balance feels broken.

Asymmetric layouts need a counterweight. A heavy left column needs a small but high-contrast element on the right, or generous whitespace as a passive counterweight.

## Audit Heuristics

When critiquing a layout, walk these seven questions in order:

1. Proximity. Are related items closer to each other than to unrelated items? Run a 2x rule check on every group.
2. Similarity. Do equivalent elements look equivalent? Inventory all buttons, all headings, all meta-labels.
3. Closure. Are containers earning their weight, or is whitespace enough?
4. Continuity. Do columns, baselines, and rhythms align?
5. Figure-Ground. Is the most important figure unambiguously dominant?
6. Common Fate. Do grouped items animate together?
7. Symmetry. Is the symmetry intentional? If asymmetric, is there a counterweight?

A layout that fails three or more questions reads as cluttered. Fix proximity first, similarity second, the rest follow.

## Anti-Patterns Bound by Gestalt

- Identical card grids of 9 same-sized cards where 3 are featured and 6 are filler. Similarity overrides the intended hierarchy.
- Three CTAs on the same page styled identically. The user cannot tell which is primary.
- Dashboard widgets with random rotation or scale variance. Common Fate is broken, the dashboard reads as scattered.
- Forms with inconsistent label placement (some above, some inline). Proximity rules break.
- Sticky toolbars without enough Figure-Ground separation from the scrolling content underneath.

## Cross-References

- Cognitive cost of poor grouping: [cognitive-load.md](cognitive-load.md)
- Visual rhythm and spacing systems: [layout.md](layout.md)
- Hierarchy through scale and weight: [typography.md](typography.md)
- Contrast measurement and color: [color-and-contrast.md](color-and-contrast.md)
- Component visual consistency: [component-patterns.md](component-patterns.md)
