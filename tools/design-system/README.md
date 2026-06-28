# design-system

Data-driven design intelligence: a searchable knowledge base across 16 technology stacks plus a design system generator. Adapted from [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT, see ../../ATTRIBUTION.md). Pure Python standard library, no dependencies.

## Search the knowledge base

```
python3 tools/design-system/scripts/search.py "<query>" [--domain <domain>] [--stack <stack>] [--max-results 3]
```

Domains: style, color, chart, landing, product, ux, typography, icons, react, web, google-fonts.

Stacks (16): react, nextjs, vue, svelte, astro, nuxtjs, nuxt-ui, angular, laravel, html-tailwind, shadcn, swiftui, react-native, flutter, jetpack-compose, threejs.

```
python3 tools/design-system/scripts/search.py "card hover state" --stack shadcn
python3 tools/design-system/scripts/search.py "color palette" --domain color
```

## Generate a design system

From a short product brief, produce a tailored design system: page pattern, style, palette with WCAG-checked tokens, typography pairing, key effects, anti-patterns, and a pre-delivery checklist.

```
python3 tools/design-system/scripts/search.py "<brief>" --design-system -p "Project Name"
python3 tools/design-system/scripts/search.py "<brief>" --design-system --persist -p "Project Name" [--page "dashboard"]
```

`--persist` writes a MASTER design system file plus optional per-page override files. This is the data-driven counterpart to `/siteasy setup`, which is otherwise manual. Use the output to seed DESIGN.md, then refine by hand.

## Generate a CSS theme

From a few brand inputs, emit a drop-in `:root` stylesheet: semantic color tokens with WCAG contrast checks, neutral and accent tonal ramps, an elevation ramp, a fluid type scale, spacing and radius scales, focus-visible, a reduced-motion guard and a print sheet. Pure standard library.

```
python3 tools/design-system/scripts/theme_css.py --bg "#0B0B0C" --ink "#F5F5F4" --accent "#6E56CF" [--accent-ink "#FFFFFF"] [--font "Geist, system-ui, sans-serif"] [--radius 10] [--ratio 1.25] [--out theme.css]
```

Each color pairing is checked against WCAG; a failing pair is flagged in a CSS comment rather than shipped. Tokens are an sRGB starter, refine the palette in OKLCH. This is the generative counterpart to the `/siteasy tokens` audit.

## Files

- `scripts/` — `search.py` (CLI entry), `core.py` (CSV search engine), `design_system.py` (generator). Pure standard library.
- `data/` — CSV knowledge base: colors (WCAG-checked token sets per product type), typography (font pairings), ui-reasoning (per-product patterns with conditional decision rules), ux-guidelines, styles, products, landing, charts, icons, google-fonts, app-interface, react-performance.
- `data/stacks/` — one CSV per supported stack.
- `UI-UX-PRO-MAX-LICENSE-MIT.txt` — upstream MIT license, retained as required.
