---
name: typography
description: "Your line-height should be the base unit for ALL vertical spacing. If body text has line-height: 1.5 on 16px type (= 24px), spacing values should be multiples of 24px. This."
version: 1.6.0
---

# Typography

## Classic Typography Principles

### Vertical Rhythm

Your line-height should be the base unit for ALL vertical spacing. If body text has `line-height: 1.5` on `16px` type (= 24px), spacing values should be multiples of 24px. This creates subconscious harmony — text and space share a mathematical foundation.

### Modular Scale & Hierarchy

**Use fewer sizes with more contrast.** A 5-size system covers most needs:

| Role | Typical Ratio | Use Case |
|------|---------------|----------|
| xs | 0.75rem | Captions, legal |
| sm | 0.875rem | Secondary UI, metadata |
| base | 1rem | Body text |
| lg | 1.25-1.5rem | Subheadings, lead text |
| xl+ | 2-4rem | Headlines, hero text |

Popular ratios: 1.25 (major third), 1.333 (perfect fourth), 1.5 (perfect fifth). Pick one and commit.

### Readability & Measure

Use `ch` units for character-based measure (`max-width: 65ch`). Line-height scales inversely with line length — narrow columns need tighter leading, wide columns need more.

**Non-obvious**: Light text on dark backgrounds needs compensation on three axes. Bump line-height by 0.05–0.1, add a touch of letter-spacing (0.01–0.02em), and optionally step the body weight up one notch.

## Font Selection & Pairing

### Anti-reflexes worth defending against

- A technical/utilitarian brief does NOT need a serif "for warmth."
- An editorial/premium brief does NOT need the same expressive serif everyone is using right now.
- A "modern" brief does NOT need a geometric sans. The most modern thing you can do is not use the font everyone else is using.

**System fonts are underrated**: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` looks native, loads instantly, and is highly readable. Consider this for apps where performance > personality.

### Pairing Principles

**The non-obvious truth**: You often don't need a second font. One well-chosen font family in multiple weights creates cleaner hierarchy than two competing typefaces.

When pairing, contrast on multiple axes:
- Serif + Sans (structure contrast)
- Geometric + Humanist (personality contrast)
- Condensed display + Wide body (proportion contrast)

**Never pair fonts that are similar but not identical** (e.g., two geometric sans-serifs).

### Web Font Loading

```css
/* 1. Use font-display: swap for visibility */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

/* 2. Match fallback metrics to minimize shift */
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 10%;
}

body {
  font-family: 'CustomFont', 'CustomFont-Fallback', sans-serif;
}
```

**Variable fonts for 3+ weights or styles**: a single variable font file is usually smaller than three static weight files.

## Modern Web Typography

### Fluid Type

Use `clamp(min, preferred, max)` for headings and display text on marketing/content pages. Keep body text fixed even on marketing pages.

**Bound your clamp()**: keep `max-size ≤ ~2.5 × min-size`.

**Use fixed `rem` scales for app UIs**: No major app design system uses fluid type in product UI — fixed scales with optional breakpoint adjustments give the spatial predictability that container-based layouts need.

### OpenType Features

```css
/* Tabular numbers for data alignment */
.data-table { font-variant-numeric: tabular-nums; }

/* Proper fractions */
.recipe-amount { font-variant-numeric: diagonal-fractions; }

/* Small caps for abbreviations */
abbr { font-variant-caps: all-small-caps; }

/* Enable kerning */
body { font-kerning: normal; }
```

### Rendering polish

```css
/* Even out heading line lengths */
h1, h2, h3 { text-wrap: balance; }

/* Reduce orphans in long prose */
article p { text-wrap: pretty; }

/* Variable fonts: pick the right optical-size master */
body { font-optical-sizing: auto; }
```

**ALL-CAPS tracking**: Add 5–12% letter-spacing (`letter-spacing: 0.05em` to `0.12em`) to short all-caps labels and headings.

## Accessibility Considerations

- **Never disable zoom**: `user-scalable=no` breaks accessibility.
- **Use rem/em for font sizes**: Respects user browser settings. Never `px` for body text.
- **Minimum 16px body text**: Smaller than this strains eyes and fails WCAG on mobile.

---

**Avoid**: More than 2-3 font families per project. Skipping fallback font definitions. Ignoring font loading performance (FOUT/FOIT). Using decorative fonts for body text.
