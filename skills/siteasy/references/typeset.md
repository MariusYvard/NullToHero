---
name: typeset
description: "Assess and improve typography that feels generic, inconsistent, or poorly structured - turning default-looking text into intentional, well-crafted type."
version: 1.9.3
---

Assess and improve typography that feels generic, inconsistent, or poorly structured — turning default-looking text into intentional, well-crafted type.

---

## Register

Brand: run the font selection procedure in [brand.md](brand.md). Pairing follows the brand's lane (display serif + sans body for editorial/luxury, one committed sans for tech, etc.). Fluid `clamp()` scale, ≥1.25 ratio between steps.

Product: system fonts and familiar sans stacks are legitimate here. One well-tuned family typically carries the whole UI. Fixed `rem` scale, 1.125–1.2 ratio between more closely-spaced steps.

---

## Assess Current Typography

Analyze what's weak or generic about the current type:

1. **Font choices**: invisible defaults (Inter, Roboto, Arial, Open Sans, system stacks)? Does the face match the brand personality, or is a playful brand wearing a corporate typeface? More than 2-3 families is almost always a mess.
2. **Hierarchy**: heading, body and caption distinguishable at a glance? Sizes too close together (14px, 15px, 16px) make muddy hierarchy, and Medium against Regular is a weight contrast nobody sees.
3. **Sizing and scale**: a committed scale or arbitrary sizes? Body text at 16px or more? Fixed `rem` scales for app UIs, fluid `clamp()` for marketing and content headings.
4. **Readability**: line length per L-TYPE-2, line-height suited to the face and the context, enough contrast against the background.
5. **Consistency**: same role styled the same way throughout, each weight doing one job (not bold in one section and semibold in another for the same role), letter-spacing intentional rather than default everywhere.

**CRITICAL**: The goal isn't to make text "fancier" — it's to make it clearer, more readable, and more intentional. Good typography is invisible; bad typography is distracting.

## Plan Typography Improvements

Consult the [typography reference](typography.md) for detailed guidance on scales, pairing, and loading strategies.

Create a systematic plan:

- **Font selection**: Do fonts need replacing? What fits the brand/context?
- **Type scale**: Establish a modular scale (e.g., 1.25 ratio) with clear hierarchy
- **Weight strategy**: Which weights serve which roles? (Regular for body, Semibold for labels, Bold for headings — or whatever fits)
- **Spacing**: Line-heights, letter-spacing, and margins between typographic elements

## Improve Typography Systematically

### Font Selection

If fonts need replacing, pair with genuine contrast (serif + sans, geometric + humanist), or commit to a single family in several weights. The failure is the middle ground: two faces close enough to look like an accident.

### Establish Hierarchy

Build a clear type scale:
- **5 sizes cover most needs**: caption, secondary, body, subheading, heading
- **Combine dimensions**: size + weight + color + space. Size alone is the weakest hierarchy there is
- **App UIs**: Use a fixed `rem`-based type scale, optionally adjusted at 1-2 breakpoints. Fluid sizing undermines the spatial predictability that dense, container-based layouts need
- **Marketing / content pages**: Use fluid sizing via `clamp(min, preferred, max)` for headings and display text. Keep body text fixed

### Fix Readability

- Set `max-width` on text containers using `ch` units (`max-width: 65ch`)
- Adjust line-height per context: tighter for headings (1.1-1.2), looser for body (1.5-1.7)
- Increase line-height slightly for light-on-dark text
- Ensure body text meets L-TYPE-1

### Refine Details

- Apply proper `letter-spacing`: slightly open for small caps and uppercase, default or tight for large display text
- Use semantic token names (`--text-body`, `--text-heading`), not value names (`--font-16`)

### Weight Consistency

- Define clear roles for each weight and stick to them
- Don't use more than 3-4 weights (Regular, Medium, Semibold, Bold is plenty)
- Load only the weights you actually use (each weight adds to page load)

**NEVER**:
- Use more than 2-3 font families
- Pick sizes arbitrarily — commit to a scale
- Set body text below 16px
- Use decorative/display fonts for body text
- Disable browser zoom (`user-scalable=no`)
- Use `px` for font sizes — use `rem` to respect user settings
- Default to Inter/Roboto/Open Sans when personality matters
- Pair fonts that are similar but not identical (two geometric sans-serifs)

## Verify Typography Improvements

Heading, body and caption identifiable instantly. Body comfortable over a long passage. Same-role elements styled identically. Type reflects the brand. Web fonts load without layout shift. Text meets WCAG contrast and survives a zoom to 200%.

Remember: Typography is the foundation of interface design — it carries the majority of information. Getting it right is the highest-leverage improvement you can make.

## Live-mode signature params

Each variant MUST declare a `scale` param controlling the hierarchy ratio. Express all font sizes in the variant's scoped CSS through `calc(var(--p-scale, 1) * <base>)` or, better, scale the type ramp via `clamp(min, calc(var(--p-scale, 1) * Npx), max)`. Users slide from subdued to commanding.

```json
{"id":"scale","kind":"range","min":0.85,"max":1.3,"step":0.05,"default":1,"label":"Scale"}
```

Where the variant riffs on a specific pairing, expose the pairing choice as a `steps` param (e.g. "serif display + sans body" vs. "mono display + sans body" vs. "all-sans"). Each branch routes through `:scope[data-p-pairing="X"]` selectors in scoped CSS.

See [live.md](live.md) for the full params contract.

## Modular type scale

Pick one ratio and derive every size from a single base, rather than choosing sizes by hand. The base is the body size (commonly 16px or 1rem). Each step multiplies or divides by the ratio.

| Ratio | Name | Feel |
|---|---|---|
| 1.200 | Minor third | Compact, dense dashboards and tools |
| 1.250 | Major third | Balanced, the safe default for most sites |
| 1.333 | Perfect fourth | Expressive, marketing and editorial |
| 1.414 | Augmented fourth | Dramatic, big display headings |

From a 16px base at 1.250: 16, 20, 25, 31, 39, 49, 61. Round to whole pixels and stop at the number of steps the design actually uses; an unused step is not a size.

### Make it fluid

Collapse the desktop scale to a smaller mobile scale with `clamp()` so headings shrink with the viewport instead of stepping at fixed breakpoints:

```css
:root {
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);   /* body */
  --step-3: clamp(1.6rem, 1.3rem + 1.5vw, 2.4rem);     /* h2 */
  --step-5: clamp(2.4rem, 1.8rem + 3vw, 3.8rem);       /* hero */
}
```

The fixed pixel ladder is the fallback to reason about; `clamp()` is what ships.

### Tabular figures for changing numbers

Counters, prices, timers and data columns use `font-variant-numeric: tabular-nums` so each digit occupies the same width and the layout does not jitter as values change. Proportional figures are correct for running prose, wrong for anything that updates in place.

For sites to source this from at build time, see [resource-recommendations.md](resource-recommendations.md).
