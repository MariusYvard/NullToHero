---
name: seo-images
description: >
  Image SEO audit and optimization. Checks alt text, file sizes, modern formats
  (WebP/AVIF), responsive images, lazy loading, CLS prevention, and LCP impact.
  Use for: "image SEO", "alt text", "image optimization", "image audit",
  "WebP conversion", "CLS from images", "LCP image", "lazy loading", "missing alt".
version: 1.0.0
user-invocable: true
argument-hint: "[url]"
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
| Decorative image | `alt=""` — empty string. Do NOT omit the attribute; omitting is different from empty. |
| Complex image (chart, infographic) | Short alt + long description in caption or adjacent text. |

**Common issues to flag:**
- Missing `alt` attribute entirely
- Generic alt text: "image", "photo", "img001", "picture"
- Alt text = file name
- Keyword-stuffed alt text
- Alt text longer than 125 characters (screen reader truncation)

### 2. File Formats

**Decision matrix (2026):**

| Format | When to use |
|--------|-------------|
| **AVIF** | Best compression, best quality. Use for photographs and complex images where browser support is acceptable. |
| **WebP** | Excellent compression, near-universal browser support. Default choice for most images. |
| **SVG** | Logos, icons, illustrations with geometric shapes. Infinitely scalable, small file size. |
| **PNG** | Transparency required + complex edges (product images with white backgrounds). |
| **JPEG** | Legacy fallback only. Replace with WebP/AVIF wherever possible. |
| **GIF** | Avoid. Use `<video autoplay loop muted playsinline>` for animations instead. |

**`<picture>` element pattern for modern formats with fallback:**
```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Descriptive alt text" width="1200" height="630" loading="eager">
</picture>
```

### 3. File Size and Compression

| Image type | Target file size |
|------------|-----------------|
| Hero / banner (full width) | < 200KB |
| Blog/article inline image | < 100KB |
| Thumbnail | < 30KB |
| Product image | < 150KB |
| Icon | < 10KB (SVG preferred) |

Flag any image >500KB as critical. Flag any JPEG/PNG that has a WebP equivalent available as high priority.

### 4. Dimensions and Responsive Images

**Never serve larger images than needed for the display size.**

**`srcset` + `sizes` pattern:**
```html
<img
  src="image-800.webp"
  srcset="image-400.webp 400w, image-800.webp 800w, image-1600.webp 1600w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
  alt="Description"
  width="800"
  height="533"
  loading="lazy"
>
```

**Check for:**
- Missing `width` and `height` attributes → causes CLS (layout shift)
- No `srcset` on large images → wastes bandwidth on mobile
- Images larger than their display container (over-serving)
- Retina/2x images served to all devices

### 5. Core Web Vitals Impact

#### LCP (Largest Contentful Paint)

The LCP element is most often a large hero image or above-the-fold image.

**For the LCP image:**
- Use `loading="eager"` (never `lazy`)
- Use `fetchpriority="high"`
- Avoid hiding behind a lazy-loaded component
- Preload it: `<link rel="preload" as="image" href="hero.webp" fetchpriority="high">`
- Serve from same origin or well-configured CDN

```html
<!-- Correct LCP image pattern -->
<img
  src="hero.webp"
  alt="Hero description"
  width="1440"
  height="600"
  loading="eager"
  fetchpriority="high"
>
```

Target: LCP < 2.5s. An unoptimized hero image is the #1 cause of LCP failures.

#### CLS (Cumulative Layout Shift)

Images without `width` and `height` attributes cause layout shifts when they load.

**Fix:** Always specify `width` and `height` on `<img>` elements matching the intrinsic dimensions. CSS can then apply `height: auto` to maintain aspect ratio.

```html
<!-- Causes CLS — no dimensions -->
<img src="photo.jpg" alt="Photo">

<!-- Prevents CLS — dimensions specified -->
<img src="photo.jpg" alt="Photo" width="800" height="533">
```

### 6. Lazy Loading

**Apply `loading="lazy"` to all below-the-fold images.**

```html
<img src="article-image.webp" alt="..." loading="lazy" width="800" height="450">
```

**Never apply to:**
- LCP image (the largest above-the-fold image)
- Any image in the first viewport (above the fold)
- Images in the `<head>` or critical path

**`decoding="async"` reduces main thread blocking:**
```html
<img src="image.webp" alt="..." loading="lazy" decoding="async" width="400" height="300">
```

### 7. File Names

File names are indexed by Google and contribute weakly to relevance signals.

**Good:** `blue-running-shoes-nike-pegasus.webp`
**Bad:** `IMG_20240312_143052.jpg`, `image001.webp`, `photo.jpg`

Rules:
- Use descriptive, hyphenated names
- Include primary keyword where natural
- No spaces, underscores, or special characters
- All lowercase

### 8. Structured Data for Images

**For images that should appear in Google Image Search:**
```json
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "contentUrl": "https://example.com/images/product-photo.webp",
  "description": "Description matching alt text",
  "name": "Human-readable image name",
  "width": 800,
  "height": 600,
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "acquireLicensePage": "https://example.com/image-rights/"
}
```

For articles and blog posts, include `image` property in Article schema pointing to the primary image.

### 9. Image Sitemaps (for image-heavy sites)

Add image metadata to XML sitemap for enhanced Google Images indexing:

```xml
<url>
  <loc>https://example.com/page/</loc>
  <image:image>
    <image:loc>https://example.com/images/photo.webp</image:loc>
    <image:title>Descriptive title</image:title>
    <image:caption>Caption text</image:caption>
  </image:image>
</url>
```

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
| Full technical audit (includes images) | `/seo audit` |
| Image structured data (Article, Product) | `/seo schema` |
| Image sitemap | `/seo sitemap` |
| Core Web Vitals deep dive | `/seo technical` |
| Design-side image optimization (AVIF, picture element) | `/siteasy audit` |
| LCP optimization | `/siteasy launch` |
