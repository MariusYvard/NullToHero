---
name: image-strategy
description: "Image decisions determine Largest Contentful Paint, bandwidth cost, and perceived quality. The wrong format ships 800 KB where 80 KB would suffice. The wrong markup blocks."
version: 1.6.1
---

# Image Strategy

Image decisions determine Largest Contentful Paint, bandwidth cost, and perceived quality. The wrong format ships 800 KB where 80 KB would suffice. The wrong markup blocks rendering. This reference is the operational guide for choosing format, marking up responsive sources, prioritizing critical images, and lazy-loading the rest. Pair with [optimize.md](optimize.md), [parallax.md](parallax.md), and [responsive-design.md](responsive-design.md).

## Format Decision Matrix

Pick the format from the use case, not from habit.

| Format | Compression vs JPEG | Lossless option | Animation | Transparency | Wide gamut / HDR | Best for |
|---|---|---|---|---|---|---|
| AVIF | 50% smaller | Yes | Yes | Yes | Yes | Photos, hero images, modern stacks |
| WebP | 30% smaller | Yes | Yes | Yes | No | Universal replacement for JPEG/PNG |
| JPEG | Baseline | No | No | No | No | Legacy fallback only |
| PNG | Larger than JPEG for photos | Yes | No (use APNG, niche) | Yes | No | Pixel-perfect graphics, screenshots |
| SVG | N/A (vector) | N/A | Yes (SMIL or CSS) | Yes | N/A | Icons, logos, charts, geometric illustrations |
| GIF | Worst per pixel | Yes | Yes | Limited (1-bit) | No | Never. Replace with WebP/AVIF or video |

Decision rules:
- Photo or photographic illustration → AVIF with WebP fallback, JPEG as last resort.
- Logo, icon, geometric illustration → SVG.
- Screenshot of UI with text → PNG or WebP lossless.
- Animated decorative loop → MP4 video with `<video autoplay muted loop playsinline>`, not GIF or APNG.

Browser support 2026 baseline: AVIF in Chrome, Firefox, Safari 16+, Edge. WebP universal. Always serve a fallback for AVIF.

## The Modern `<picture>` Pattern

The canonical responsive image markup. Browser picks the first supported source.

```html
<picture>
  <source
    type="image/avif"
    srcset="
      hero-400.avif 400w,
      hero-800.avif 800w,
      hero-1200.avif 1200w,
      hero-1600.avif 1600w,
      hero-2400.avif 2400w"
    sizes="(min-width: 1200px) 1200px, 100vw">
  <source
    type="image/webp"
    srcset="
      hero-400.webp 400w,
      hero-800.webp 800w,
      hero-1200.webp 1200w,
      hero-1600.webp 1600w,
      hero-2400.webp 2400w"
    sizes="(min-width: 1200px) 1200px, 100vw">
  <img
    src="hero-1200.jpg"
    srcset="
      hero-400.jpg 400w,
      hero-800.jpg 800w,
      hero-1200.jpg 1200w,
      hero-1600.jpg 1600w,
      hero-2400.jpg 2400w"
    sizes="(min-width: 1200px) 1200px, 100vw"
    width="1200"
    height="675"
    alt="Descriptive alt that reads aloud naturally"
    fetchpriority="high"
    decoding="async">
</picture>
```

Required attributes on the final `<img>`:
- `width` and `height` as raw numbers (pixels) for aspect ratio reservation, preventing CLS.
- `alt` always present. Empty `alt=""` for decorative, non-empty for content.
- `decoding="async"` for non-critical images.
- `loading="lazy"` for below-the-fold images (omit on the LCP image).
- `fetchpriority="high"` on the LCP image candidate.

## `srcset` and `sizes` Mechanics

`srcset` lists available source files and their intrinsic widths. `sizes` tells the browser how wide the image will display at various viewports.

The browser picks the source whose intrinsic width matches `sizes` × `devicePixelRatio`.

Width descriptors (`400w`, `800w`) are the intrinsic width of the source file. Never use density descriptors (`1x`, `2x`) when both viewport size and density vary. Width descriptors handle both.

`sizes` syntax: `<media-condition> <length>, ..., <default-length>`.

Examples:
```
sizes="100vw"                                    /* always full viewport */
sizes="(min-width: 1200px) 600px, 100vw"         /* 600px at large, full at small */
sizes="(min-width: 1024px) 33vw, (min-width: 600px) 50vw, 100vw" /* responsive grid */
```

Common mistake: omitting `sizes`. Without it, the browser assumes `100vw` and downloads the largest file. Always declare `sizes`.

## LCP Image: Special Treatment

The Largest Contentful Paint candidate is usually the hero image. Optimize ruthlessly.

| Lever | Action | Why |
|---|---|---|
| Format | AVIF first, WebP fallback | Smallest bytes |
| Compression | 75 to 85 quality for AVIF | Visual parity, large file reduction |
| Size cap | Under 200 KB at largest variant | LCP budget |
| Priority | `fetchpriority="high"` | Browser prioritizes the network request |
| Lazy | Never `loading="lazy"` | Defers the most important asset |
| Preload | `<link rel="preload" as="image" imagesrcset="..." imagesizes="...">` in `<head>` for critical heroes | Starts download in parallel with HTML parsing |
| Decoding | `decoding="sync"` or omit | Avoid async decoding delay |
| Source order | `<picture>` source matching the user's viewport listed first when known | Reduces parsing cost |

Preload header pattern in HTML:

```html
<link rel="preload"
      as="image"
      imagesrcset="hero-800.avif 800w, hero-1200.avif 1200w, hero-2400.avif 2400w"
      imagesizes="(min-width: 1200px) 1200px, 100vw"
      type="image/avif"
      fetchpriority="high">
```

Pair with a server-side hint if possible:

```
Link: </images/hero-1200.avif>; rel=preload; as=image; type="image/avif"; fetchpriority=high
```

Target: LCP within L-PERF-1econds at 75th percentile, measured in real user data, not synthetic.

## Lazy Loading and Below-the-Fold

Every image below the initial viewport should be lazy: `loading="lazy"` and `decoding="async"`, on top of the `srcset`, `sizes`, `width` and `height` the canonical block above already carries.

Caveats:
- Native `loading="lazy"` triggers from the viewport plus a buffer (browser-defined). Do not rely on a tight visibility margin.
- For background images and elements behind a parallax layer, use `IntersectionObserver` to mount the asset, not native lazy.
- Below the fold on the FIRST screen is the threshold. Anything within 100 vh of the viewport at load might still be eager.

## SVG Discipline

SVG is the highest-leverage format when it fits. Inline for hot assets, external file for cold ones.

Inline SVG (icons at small sizes, animated, or themed) inherits `currentColor`, so it themes for free with the text around it. An external `<img src="logo.svg">` does not, and that is the whole reason to inline an icon and leave a logo external. Give an inline decorative icon `viewBox`, explicit `width` and `height`, `aria-hidden="true"` and `focusable="false"`.

SVG optimization:
- Run through SVGO with default settings. Strip metadata, comments, hidden layers.
- Round path precision to 2 decimals. Visual parity, smaller file.
- Inline only if it is used on the critical path. Otherwise external for HTTP caching.

Never:
- Use SVG for photographs or photo-realistic images.
- Embed raster images inside an SVG. The size advantage disappears.
- Use SVG for icons larger than 64 by 64 if the design is photo-textured.

## Art Direction

When the image needs to be cropped or composed differently per viewport, use `<picture>` with `media` on the sources.

The trap: `media` and `type` multiply. One `<source>` per crop AND per format, widest `media` first, because the browser takes the first source whose `media` matches and whose `type` it supports.

```html
<picture>
  <source media="(min-width: 1024px)" type="image/avif" srcset="hero-wide-1600.avif 1600w, hero-wide-2400.avif 2400w" sizes="100vw">
  <source media="(min-width: 1024px)" type="image/webp" srcset="hero-wide-1600.webp 1600w, hero-wide-2400.webp 2400w" sizes="100vw">
  <source type="image/avif" srcset="hero-portrait-600.avif 600w, hero-portrait-1200.avif 1200w" sizes="100vw">
  <source type="image/webp" srcset="hero-portrait-600.webp 600w, hero-portrait-1200.webp 1200w" sizes="100vw">
  <img src="hero-portrait-600.jpg" width="1200" height="1800" alt="..." fetchpriority="high">
</picture>
```

Art direction is for true crops, not just sizes. If the desktop and mobile show the same scene, regular `srcset` is enough.

## Alt Text Rules

`alt` is not optional. It is a content attribute and a legal accessibility requirement. The decision tree per image kind (informative, decorative, functional, complex, SVG) belongs to [accessibility-engineering.md](accessibility-engineering.md). Two rulings are this file's own:

- A logo takes `alt="<Brand name>"`, not `alt="<Brand name> logo"`. The word "logo" is noise a screen reader repeats on every page.
- A decorative image takes `alt=""`, an empty string, never an omitted attribute. Omitted is not empty, and the checklist below tests for exactly that.

## Image Audit Checklist

For every shipped page:

| Check | Target |
|---|---|
| LCP image format | AVIF or WebP, with fallback |
| LCP image weight | Under 200 KB |
| LCP image preload | Present in `<head>` |
| LCP image `fetchpriority="high"` | Yes |
| LCP image NOT `loading="lazy"` | Confirm absent |
| All images have `width` and `height` | Yes |
| All images have meaningful or empty `alt` | Yes |
| Below-the-fold images `loading="lazy"` | Yes |
| `srcset` and `sizes` on responsive images | Yes |
| SVG icons inline where themed, external where cached | Per use case |
| Total image weight per page | Under 1 MB on desktop, under 500 KB on mobile |
| Hero CLS contribution | 0 |

## Anti-Patterns

- 4K hero JPEG at 1.8 MB. Replace with AVIF, halve resolution where retina is not the target.
- `<img>` without `width` and `height`. Causes CLS as soon as it loads.
- LCP image with `loading="lazy"`. Defers the most important paint.
- `srcset` without `sizes`. Browser falls back to 100vw, downloads largest.
- Animated GIF over 500 KB. Convert to MP4 video, save 80 to 95 percent of bytes.
- Background image carrying meaningful content. Use `<img>` with `alt`, not `background-image`.
- Same alt text reused across product images (`alt="product"`). Index pollution and screen reader noise.
- PNG used for photos. PNG is for graphics, not photographic content.
- Inline base64 images in HTML or CSS. Defeats caching, bloats payload.

## Cross-References

- Performance budgets and Core Web Vitals: [optimize.md](optimize.md)
- Parallax-specific image rules: [parallax.md](parallax.md)
- Responsive design and breakpoints: [responsive-design.md](responsive-design.md)
- Accessibility for non-text content: [accessibility-engineering.md](accessibility-engineering.md)
- SEO image best practices: ../../seo/references/technical.md


## External tools

Read the `image-optimizer` and `svg-optimizer` rows of `tools/design-system/data/generators.csv` (Squoosh, TinyPNG, Optimizilla, SvgOMG, Vecta Nano and peers) rather than naming a tool from memory. The CSV carries the URL and the cost column, and it is the copy the liveness check maintains. `skills/seo/references/images.md` points at the same rows.

## Where to source images

For photos and video that are free to use, see [references/stock-media.md](references/stock-media.md). Prefer the CC0 and public-domain list for anything you commit, and treat the popular free-stock sites as use-only.

For sites to source this from at build time, see [resource-recommendations.md](resource-recommendations.md).
