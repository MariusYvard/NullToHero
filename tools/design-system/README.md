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

## Files

- `scripts/` — `search.py` (CLI entry), `core.py` (CSV search engine), `design_system.py` (generator). Pure standard library.
- `data/` — CSV knowledge base: colors (WCAG-checked token sets per product type), typography (font pairings), ui-reasoning (per-product patterns with conditional decision rules), ux-guidelines, styles, products, landing, charts, icons, google-fonts, app-interface, react-performance.
- `data/stacks/` — one CSV per supported stack.
- `UI-UX-PRO-MAX-LICENSE-MIT.txt` — upstream MIT license, retained as required.
