---
name: seo-images
description: >
  Image SEO audit and optimization. Checks alt text, file sizes, modern formats
  (WebP/AVIF), responsive images, lazy loading, CLS prevention, and LCP impact.
  Use for: "image SEO", "alt text", "image optimization", "image audit",
  "WebP conversion", "CLS from images", "LCP image", "lazy loading", "missing alt".
version: 1.8.2
---

# Image SEO Audit

## What this covers

Images affect four distinct SEO signals: **Core Web Vitals** (LCP, CLS), **crawlability** (alt text, file names), **bandwidth efficiency** (format, compression), and **contextual relevance** (surrounding markup, structured data).

---

## Audit Categories

### 1. Alt Text (Accessibility + Crawlability)

**Every non-decorative image must have descriptive alt text.**

| Type | Rule |
|------|------|
| Informational image | Describe what the image shows, concisely. Include primary keyword if natural. |
| Functional image (button, link) | Describe the function, not the appearance. "Submit form" not "arrow icon". |
| Decorative image | `alt=""`, an empty string. Do NOT omit the attribute; omitting is different from empty. |
| Complex image (chart, infographic) | Short alt + long description in caption or adjacent text. |

**Common issues to flag:**
- Missing `alt` attribute entirely
- Generic alt text: "image", "photo", "img001", "picture"
- Alt text = file name
- Keyword-stuffed alt text
- Alt text long enough to read as a paragraph. No current specification sets a character limit; the widely repeated 125-character cutoff traces to old JAWS behaviour, so flag for concision, not against a counter.

### 2. File Formats

Format choice, the `<picture>` fallback chain and the AVIF/WebP/SVG/PNG decision matrix are covered in full by the design-side reference (`/nth-siteasy audit`). Audit against it rather than restating it here.

The one rule to carry: never ship a GIF for animation. Replace it with `<video autoplay loop muted playsinline>`. `playsinline` is the attribute that gets forgotten, and without it iOS takes the video fullscreen instead of playing it in place.

### 3. File Size and Compression

| Image type | Target file size |
|------------|-----------------|
| Hero / banner (full width) | < 200KB |
| Blog/article inline image | < 100KB |
| Thumbnail | < 30KB |
| Product image | < 150KB |
| Icon | < 10KB (SVG preferred) |

Flag any image >500KB as critical. Flag any JPEG/PNG that has a WebP equivalent available as high priority.

When writing the fix, point to the `image-optimizer` rows of `tools/design-system/data/generators.csv` (Squoosh, TinyPNG, SVGOMG and peers) instead of naming tools from memory.

### 4. Dimensions and Responsive Images

**Never serve larger images than needed for the display size.** The `srcset` and `sizes` markup itself is specified design-side (`/nth-siteasy audit`); what follows is what the audit looks for on the page.

**Check for:**
- Missing `width` and `height` attributes → causes CLS (layout shift)
- No `srcset` on large images → wastes bandwidth on mobile
- Images larger than their display container (over-serving)
- Retina/2x images served to all devices

### 5. Core Web Vitals Impact

An unoptimized hero image is a frequent cause of LCP failure. Treat it as the first place to look, not as a ranked statistic: the LCP element is whatever the page makes largest, and on some templates that is a heading or a video poster.

On the LCP image the mechanics are design-side (`/nth-siteasy harden`): eager loading, `fetchpriority="high"`, preload. What this audit adds is the check that it is not hidden behind a lazy-loaded component. The image itself can carry every correct attribute and still paint late because the component wrapping it defers.

CLS from images is covered by the `width` and `height` check in section 4.

### 6. Lazy Loading

**Apply `loading="lazy"` to all below-the-fold images**, with `decoding="async"` to reduce main thread blocking.

**Never apply to:**
- LCP image (the largest above-the-fold image)
- Any image in the first viewport (above the fold)
- Images in the `<head>` or critical path

### 7. File Names

File names are indexed by Google and contribute weakly to relevance signals, which is the point: descriptive, lowercase, hyphenated (`blue-running-shoes-nike-pegasus.webp`, not `IMG_20240312_143052.jpg`) is the whole rule.

Rename only files already being touched. A bulk rename costs redirects and loses Image Search history for a signal this weak.

### 8. Structured Data for Images

An `ImageObject` earns its maintenance when it carries `license` and `acquireLicensePage`, which is what puts the licensable badge on the image in Google Images. Everything else in it restates markup already on the page. For articles, point the Article schema `image` property at the primary image.

### 9. Image Sitemaps (for image-heavy sites)

Add `image:image` entries to the XML sitemap only for image-heavy sites, where Google Images is a real traffic channel. On a site with a handful of illustrations per page, the entries are maintenance without a return.

---

## Scoring

| Issue | Severity |
|-------|----------|
| Missing alt text on informational images | High |
| LCP image not preloaded / using lazy loading | High |
| Images without width/height causing CLS | High |
| Images >500KB | High |
| No WebP/AVIF versions of JPEG images | Medium |
| No srcset on images >300px wide | Medium |
| Generic alt text (file name, "image") | Medium |
| GIF used for animation (use video instead) | Medium |
| No lazy loading on below-fold images | Low |
| Non-descriptive file names | Low |
| No image sitemap on image-heavy sites | Low |

---

## Output

### Image SEO Score: XX/100

### Images Audited: X total

| Category | Score | Issues Found |
|----------|-------|-------------|
| Alt Text | XX/100 | X missing, X generic |
| File Formats | XX/100 | X JPEG replaceable |
| File Sizes | XX/100 | X oversized |
| Responsive Images | XX/100 | X missing srcset |
| Core Web Vitals | XX/100 | LCP: pass/fail, CLS: pass/fail |
| Lazy Loading | XX/100 | X incorrectly lazy/eager |
| File Names | XX/100 | X non-descriptive |

### Critical Fixes (do these first)
### High Priority
### Quick Wins

---

## Error Handling

| Scenario | Action |
|----------|--------|
| URL unreachable | Report the error. Suggest verifying the URL. |
| No images found on page | Note the absence. Recommend adding relevant images with proper markup for content pages. |
| Images loaded via JavaScript | Warn that JS-rendered images may not be crawled. Recommend server-side rendering or preloading. |
| Cannot determine LCP element | Flag for manual check using Chrome DevTools → Performance tab → LCP element. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Full technical audit (includes images) | `/nth-seo audit` |
| Image structured data (Article, Product) | `/nth-seo schema` |
| Image sitemap | `/nth-seo sitemap` |
| Core Web Vitals deep dive | `/nth-seo technical` |
| Design-side image optimization (AVIF, picture element) | `/nth-siteasy audit` |
| LCP optimization | `/nth-siteasy harden` |
