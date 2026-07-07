---
name: resource-recipes
description: "From a recommended resource to working code: how to fetch, optimize and wire each kind of asset (fonts, icons, color, illustrations, backgrounds, animation, charts)."
version: 1.24.0
---

# Resource recipes

For the sources with an open API, fetch the asset directly with the fetcher (see [fetch-asset.md](fetch-asset.md)); the recipes below then apply to what you fetched. A recommendation is only useful once the asset is in the code, optimized and self-hosted. Each recipe turns a picked resource into a wired result. Read the `use` column in resources.csv first and honor the licence, and keep attribution where the licence asks for it.

## Fonts

Self-host over a third-party CDN, it is faster, private and never breaks. Download the woff2 from the foundry or Google Fonts, subset it to the characters you ship, then declare it.

```css
@font-face {
  font-family: "Brand";
  src: url("/fonts/brand.woff2") format("woff2");
  font-weight: 400 700;
  font-display: swap;
}
```

Preload the one weight above the fold: `<link rel="preload" as="font" type="font/woff2" href="/fonts/brand.woff2" crossorigin>`. If you must use a CDN, add `<link rel="preconnect">` to its origin.

## Icons

Three ways, in order of preference. Inline the SVG for the few icons a page uses so they take `currentColor` and cost no request. Build one SVG sprite when a page uses many. Import from a tree-shaken library (Lucide, Heroicons) in a component app so unused icons drop out. Avoid loading a whole icon font for three glyphs.

## Color

Turn a picked palette into CSS custom properties, one scale per role, not scattered hex.

```css
:root {
  --accent-500: #6d28d9;
  --accent-600: #5b21b6;
  --ink: #1e293b;
  --surface: #ffffff;
}
```

Generate the tokens with `tools/design-system/scripts/theme_css.py`, which also checks the pairs for WCAG contrast.

## Illustrations

For SVG, download it, run it through SVGO, then inline it or reference it with `<img>`. For raster, convert to AVIF and WebP and serve responsive sizes.

```html
<picture>
  <source type="image/avif" srcset="hero.avif">
  <source type="image/webp" srcset="hero.webp">
  <img src="hero.jpg" width="1200" height="800" alt="...">
</picture>
```

## Backgrounds and patterns

Use the SVG as a CSS `background-image`, tint it by setting `color` on the element, and keep the file tiny. See the bundled `assets/patterns` for a fallback set.

## Animation libraries

Import only what you use, gate motion behind `prefers-reduced-motion`, and lazy-load a heavy library (GSAP, Lottie) when its section scrolls into view rather than on first paint.

## Charts

Pick the lightest library that fits the chart, load it lazily, and provide a plain table fallback for no-JS and for screen readers. See `references/data-viz.md` for chart-type choice and accessibility.

## After fetching

Optimize every asset, self-host it, record the source and licence, and prefer the redistribute-safe options from resources.csv when the file will live in the repository.
