---
name: spatial-design
description: "8pt systems are too coarse - you'll frequently need 12px (between 8 and 16). Use 4pt for granularity: 4, 8, 12, 16, 24, 32, 48, 64, 96px."
version: 1.6.1
---

# Spatial Design

## Spacing Systems

### Use 4pt Base, Not 8pt

8pt systems are too coarse: you'll frequently need 12px (between 8 and 16). Use 4pt for granularity: 4, 8, 12, 16, 24, 32, 48, 64, 96px.

### Name Tokens Semantically

Name by relationship (`--space-sm`, `--space-lg`), not value (`--spacing-8`). Use `gap` instead of margins for sibling spacing, which eliminates margin collapse and cleanup hacks.

## Grid Systems

### The Self-Adjusting Grid

Use `repeat(auto-fit, minmax(280px, 1fr))` for responsive grids without breakpoints. For complex layouts, use named grid areas (`grid-template-areas`) and redefine them at breakpoints.

## Visual Hierarchy

### The Squint Test

Blur your eyes (or screenshot and blur). Can you still identify:
- The most important element?
- The second most important?
- Clear groupings?

If everything looks the same weight blurred, you have a hierarchy problem.

### Hierarchy Through Multiple Dimensions

| Tool | Strong Hierarchy | Weak Hierarchy |
|------|------------------|----------------|
| **Size** | 3:1 ratio or more | <2:1 ratio |
| **Weight** | Bold vs Regular | Medium vs Regular |
| **Color** | High contrast | Similar tones |
| **Position** | Top/left (primary) | Bottom/right |
| **Space** | Surrounded by white space | Crowded |

**The best hierarchy uses 2-3 dimensions at once**: A heading that's larger, bolder, AND has more space above it.

### Cards Are Not Required

Cards are overused. Spacing and alignment create visual grouping naturally. Use cards only when content is truly distinct and actionable. **Never nest cards inside cards**: use spacing, typography, and subtle dividers for hierarchy within a card.

## Container Queries

Viewport queries are for page layouts. **Container queries are for components**: give the wrapper `container-type: inline-size` and switch the component at an `@container` width, so the same card resolves correctly in a sidebar and in a main column. Around 400px is where a stacked card can afford to go two-column.

## Optical Adjustments

Text at `margin-left: 0` looks indented due to letterform whitespace, so use a negative margin (`-0.05em`) to optically align. Geometrically centered icons often look off-center; nudge them toward their direction.

### Touch Targets vs Visual Size

Buttons can look small but need large touch targets (44px minimum). Keep the visual size and grow the hit area instead, with padding or an absolutely positioned pseudo-element inset by half the shortfall: a 24px icon button reaches 44px at `inset: -10px`.

## Depth & Elevation

Create semantic z-index scales (dropdown → sticky → modal-backdrop → modal → toast → tooltip) instead of arbitrary numbers. **Key insight**: Shadows should be subtle. If you can clearly see it, it's probably too strong.

---

**Avoid**: Arbitrary spacing values outside your scale. Making all spacing equal (variety creates hierarchy). Creating hierarchy through size alone; combine size, weight, color, and space.
