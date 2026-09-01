---
name: colorize
description: "Strategically introduce color to designs that are too monochromatic, gray, or lacking in visual warmth and personality."
version: 1.9.3
---

> **Additional context needed**: existing brand colors.

Strategically introduce color to designs that are too monochromatic, gray, or lacking in visual warmth and personality.

---

## Why the palette catalogue stays unwired

`tools/design-system/data/` carries 160 ready-made palettes and 84 named styles, and this file
deliberately does not query them. The base is wired for facts, which face exists and which icon
set has the glyph, and left unwired for taste. A catalogue of palettes makes two sessions produce
the same page and makes every project using this plugin converge on the same 160 answers, which
is the failure this file exists to prevent. Derive the palette from the brief.

If you want a reference point rather than an answer, `--domain color` is one command away and
nothing stops you. Knowing why it is not the default is the point.

## Register

Brand: palette IS voice. Pick a color strategy first per SKILL.md (Restrained / Committed / Full palette / Drenched) and follow its dosage. Committed, Full palette, and Drenched deliberately exceed the ≤10% rule: that rule is Restrained only. Unexpected combinations are allowed; a dominant color can own the page when the chosen strategy calls for it.

Product: semantic-first and almost always Restrained. Accent color is reserved for primary action, current selection, and state indicators, not decoration. Every color has a consistent meaning across every screen.

---

## Assess Color Opportunity

Analyze the current state and identify opportunities:

1. **Understand current state**:
   - **Color absence**: Pure grayscale? Limited neutrals? One timid accent?
   - **Missed opportunities**: Where could color add meaning, hierarchy, or delight?
   - **Context**: What's appropriate for this domain and audience?
   - **Brand**: Are there existing brand colors we should use?

2. **Identify where color adds value**:
   - **Semantic meaning**: Success (green), error (red), warning (yellow/orange), info (blue)
   - **Hierarchy**: Drawing attention to important elements
   - **Categorization**: Different sections, types, or states
   - **Emotional tone**: Warmth, energy, trust, creativity
   - **Wayfinding**: Helping users navigate and understand structure
   - **Delight**: Moments of visual interest and personality

If any of these are unclear from the codebase, STOP and call the clarify tool to clarify.

**CRITICAL**: More color ≠ better. Strategic color beats rainbow vomit every time. Every color should have a purpose.

## Plan Color Strategy

Create a purposeful color introduction plan:

- **Color palette**: What colors match the brand/context? (Choose 2-4 colors max beyond neutrals)
- **Dominant color**: Which color owns 60% of colored elements?
- **Accent colors**: Which colors provide contrast and highlights? (30% and 10%)
- **Application strategy**: Where does each color appear and why?

**IMPORTANT**: Color should enhance hierarchy and meaning, not create chaos. Less is more when it matters more.

## Introduce Color Strategically

Add color systematically across these dimensions:

### Semantic Color
- **State indicators**: the conventional success, error, warning, info and neutral mapping. The mapping itself is not the decision; holding it identically on every screen is, and that is where products drift.
- **Status badges and progress**: tint the surface or the border, not both at full strength on the same element.

### Accent Color Application
- **Spend the accent on the primary action first.** Links, key icons and hover states come next; section headings come last, and in Product register usually not at all.
- **One accent per view.** Two accents means the user has to work out which one is the action.

### Background & Surfaces
- **Tinted backgrounds**: Replace pure gray (`#f5f5f5`) with warm neutrals (`oklch(97% 0.01 60)`) or cool tints (`oklch(97% 0.01 250)`)
- **Colored sections**: Use subtle background colors to separate areas
- **Gradient backgrounds**: Add depth with subtle, intentional gradients (not generic purple-blue)
- **Cards & surfaces**: Tint cards or surfaces slightly for warmth

**Use OKLCH for color**: It's perceptually uniform, meaning equal steps in lightness *look* equal. Great for generating harmonious scales.

### Data Visualization
- Encode categories by hue and magnitude by lightness, never magnitude by hue. A categorical palette applied to an ordered series reads as unordered and the reader stops trusting the chart.

### Borders & Accents
- **Hairline borders**: 1px colored borders on full perimeter (not side-stripes; see the absolute ban on `border-left/right > 1px`)
- **Underlines**: Color underlines for emphasis or active states
- **Dividers**: Subtle colored dividers instead of gray lines
- **Focus rings**: Colored focus indicators matching brand
- **Surface tints**: A 4-8% background wash of the accent color instead of a stripe

**NEVER**: `border-left` or `border-right` greater than 1px as a colored accent stripe. This is one of the three absolute bans in the parent skill. If you want to mark a card as "active" or "warning", use a full hairline border, a background tint, a leading glyph, or a numbered prefix, not a side stripe.

### Typography Color
- Headings, highlights and small labels may carry brand color; a brand color that only clears 3:1 is a heading color, not a body color. Check before promoting it.

### Decorative Elements
- Illustrations, geometric shapes, mesh gradients and soft organic forms in brand colors, sitting behind the content and never competing with it. Gradients are allowed here and banned in the NEVER list below when they are the generic purple-blue.

## Balance & Refinement

Ensure color addition improves rather than overwhelms:

### Maintain Hierarchy
- **Dominant color** (60%): Primary brand color or most used accent
- **Secondary color** (30%): Supporting color for variety
- **Accent color** (10%): High contrast for key moments
- **Neutrals** (remaining): Gray/black/white for structure

### Accessibility
- **Contrast ratios**: Ensure WCAG compliance (4.5:1 for text, 3:1 for UI components)
- **Don't rely on color alone**: Use icons, labels, or patterns alongside color
- **Test for color blindness**: Verify red/green combinations work for all users

### Cohesion
- **Consistent palette**: Use colors from defined palette, not arbitrary choices
- **Systematic application**: Same color meanings throughout (green always = success)
- **Temperature consistency**: Warm palette stays warm, cool stays cool

**NEVER**:
- Use every color in the rainbow (choose 2-4 colors beyond neutrals)
- Apply color randomly without semantic meaning
- Put gray text on colored backgrounds, it looks washed out; use a darker shade of the background color or transparency instead
- Use pure gray for neutrals, add a subtle color tint (warm or cool) for sophistication
- Use pure black (`#000`) or pure white (`#fff`) for large areas
- Violate WCAG contrast requirements
- Use color as the only indicator (accessibility issue)
- Make everything colorful (defeats the purpose)
- Default to purple-blue gradients (AI slop aesthetic)

## Verify Color Addition

Test that colorization improves the experience:

- **Better hierarchy**: Does color guide attention appropriately?
- **Clearer meaning**: Does color help users understand states/categories?
- **More engaging**: Does the interface feel warmer and more inviting?
- **Still accessible**: Do all color combinations meet WCAG standards?
- **Not overwhelming**: Is color balanced and purposeful?

Remember: Color is emotional and powerful. Use it to create warmth, guide attention, communicate meaning, and express personality. But restraint and strategy matter more than saturation and variety. Be colorful, but be intentional.

## Live-mode signature params

When invoked from live mode, each variant MUST declare a `color-amount` param so the user can dial between a restrained accent and a drenched surface without regeneration. Author the variant's CSS against `var(--p-color-amount, 0.5)`, typically as the alpha multiplier on backgrounds, or as a scaling factor on the chroma axis in an OKLCH expression. 0 = neutral/monochrome, 1 = full saturation / dominant coverage.

```json
{"id":"color-amount","kind":"range","min":0,"max":1,"step":0.05,"default":0.5,"label":"Color amount"}
```

Layer 1-2 variant-specific params on top: palette selection (`steps` with named options), temperature warmth, or tint vs. true color. See [live.md](live.md) for the full params contract.
