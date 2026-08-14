---
name: optimize
description: "Identify and fix performance issues to create faster, smoother user experiences."
version: 1.6.1
---

Identify and fix performance issues to create faster, smoother user experiences.

## Assess Performance Issues

Understand current performance and identify problems:

1. **Measure current state**:
   - **Core Web Vitals**: LCP, INP, CLS
   - **Load time**: time to interactive, first contentful paint
   - **Bundle size**: JavaScript, CSS, image weight
   - **Runtime performance**: frame rate, memory, CPU
   - **Network**: request count, payload sizes, waterfall

2. **Identify bottlenecks**:
   - What is slow? (initial load, interactions, animations)
   - What causes it? (large images, expensive JavaScript, layout thrashing)
   - How bad is it? (perceivable, annoying, blocking)
   - Who is affected? (all users, mobile only, slow connections)

**CRITICAL**: Measure before and after. Premature optimization wastes time. Optimize what actually matters, and take the biggest bottleneck first.

## Optimization Strategy

### Loading Performance

**Optimize images**:
- Modern formats (AVIF, WebP)
- Correct intrinsic size: never a 3000px file for a 300px slot
- `loading="lazy"` below the fold
- Responsive delivery with `srcset` and `sizes`
- Compression at 80-85% quality, usually imperceptible
- CDN for delivery

**Reduce the JavaScript bundle**:
- Code splitting, by route and by component
- Tree shaking, and removal of unused dependencies
- Dynamic imports for large components
- Lazy load non-critical code

**Optimize CSS**:
- Remove unused rules
- Critical CSS inline, the rest async
- Containment for independent regions

**Optimize fonts**:
- `font-display: swap` or `optional`
- Subset to the characters actually used
- Preload the critical face
- Limit the number of loaded weights
- System fonts are a legitimate answer here, not a concession

**Optimize the loading strategy**:
- Critical resources first, non-critical deferred
- Preload what the first screen needs
- Prefetch the likely next page
- Service worker for repeat visits
- HTTP/2 or HTTP/3 multiplexing

### Rendering Performance

**Avoid layout thrashing**: batch all reads, then all writes. Alternating an `offsetHeight` read with a style write inside one loop forces a reflow per iteration.

**Optimize rendering**:
- `contain` on independent regions
- `content-visibility: auto` on long lists
- Virtual scrolling for very long lists
- A DOM that stays shallow and small

**Reduce paint and composite**:
- Use `transform` and `opacity` for reliable movement, but allow blur, filters, masks, clip paths, shadows and color shifts when they create meaningful polish
- Avoid casual animation of layout-driving properties (`width`, `height`, `top`, `left`, margins)
- Use `will-change` sparingly, for known expensive operations
- Bound expensive paint areas: a smaller, isolated blur is a cheaper blur

### Animation Performance

- Target 16ms per frame (60fps)
- `requestAnimationFrame` for JS animation, CSS animation wherever it suffices
- Debounce or throttle scroll handlers
- Prefer IntersectionObserver to a scroll listener for viewport detection
- No long-running JavaScript while something is animating

### Network Optimization

**Reduce requests**:
- SVG sprites for icons, inline small critical assets
- Remove unused third-party scripts

**Optimize APIs**:
- Pagination instead of loading everything
- Response compression, HTTP caching headers
- CDN for static assets

**Optimize for slow connections**:
- Adaptive loading from `navigator.connection`
- Optimistic UI updates
- Request prioritization, progressive enhancement

## Core Web Vitals Optimization

Canonical thresholds: `L-PERF-1`, `L-PERF-2` and `L-PERF-3` in `tools/data/laws.csv`.

### Largest Contentful Paint (LCP < 2.5s)
- Optimize the hero image
- Inline critical CSS
- Preload key resources
- CDN, server-side rendering

### Interaction to Next Paint (INP < 200ms)
- Break up long tasks
- Defer non-critical JavaScript
- Move heavy computation to a web worker
- Cut JavaScript execution time

### Cumulative Layout Shift (CLS < 0.1)
- Set dimensions or `aspect-ratio` on images, videos and embeds
- Reserve space for ads and embeds
- Never inject content above existing content
- No animation that shifts layout

## Performance Monitoring

**Tools to use**:
- Chrome DevTools (Lighthouse, Performance panel)
- WebPageTest
- Chrome UX Report for field Core Web Vitals
- Bundle analyzers (webpack-bundle-analyzer)
- Real-user monitoring (Sentry, DataDog, New Relic)

**Key metrics**:
- LCP, INP, CLS (Core Web Vitals)
- Time to Interactive, First Contentful Paint, Total Blocking Time
- Bundle size, request count

**IMPORTANT**: Measure on real devices with real network conditions. Desktop Chrome with a fast connection isn't representative.

**NEVER**:
- Optimize without measuring (premature optimization)
- Sacrifice accessibility for performance
- Break functionality while optimizing
- Use `will-change` everywhere (creates new layers, uses memory)
- Lazy load above-fold content
- Chase micro-optimizations while a major bottleneck stands
- Forget about mobile performance (often slower devices, slower connections)

## Verify Improvements

Test that optimizations worked:

- **Before/after metrics**: compare Lighthouse scores
- **Real user monitoring**: track the improvement for real users
- **Different devices**: test on a low-end Android, not just a flagship iPhone
- **Slow connections**: throttle to 3G and test the experience
- **No regressions**: functionality still works
- **User perception**: does it *feel* faster?

Remember: Performance is a feature. Fast experiences feel more responsive, more polished, more professional. Optimize systematically, measure ruthlessly, and prioritize user-perceived performance.

## Cross-References

- Image format decision matrix and srcset patterns: [image-strategy.md](image-strategy.md)
- Parallax-specific image rules: [parallax.md](parallax.md)
- WCAG 2.2 performance-adjacent criteria: [wcag-2-2.md](wcag-2-2.md)
