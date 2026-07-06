---
name: performance
description: "Front-end performance remediation: Core Web Vitals levers, modern loading signals and the tools to measure them."
version: 1.22.0
---

# Performance

Performance is the part of quality users feel: bytes, blocking work and layout stability. The seo-agent-performance dimension flags the gaps; this reference is the fix path and the toolset.

## Core levers

- Serve modern image formats (WebP, AVIF) with width and height set, and lazy-load below the fold.
- Defer or async scripts, and declare `font-display: swap` so text paints during the font download.
- Compress text responses (gzip or brotli) and cache fingerprinted assets with a long, immutable max-age.

## External tools

- **Lighthouse** (audits performance and Core Web Vitals). https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk
- **PageSpeed Insights** (field and lab performance data for a URL). https://pagespeed.web.dev/
- **WebPageTest** (detailed load waterfall and timing metrics). https://www.webpagetest.org/
- **Squoosh** (image compression to cut payload weight). https://squoosh.app/
- **Critical Path CSS Generator** (extracts above-the-fold critical CSS). https://www.sitelocity.com/critical-path-css-generator
- **GTmetrix** (page speed and performance report). https://gtmetrix.com/
- **DebugBear Speed Test** (tests and tracks page load speed). https://www.debugbear.com/test/website-speed


## Modern performance signals

Beyond the Core Web Vitals basics, four newer signals move real metrics.

- bfcache eligibility. Remove any `unload` listener; it disqualifies the page from the back/forward cache, so a back navigation reloads instead of restoring instantly. Use `pagehide` for teardown.
- fetchpriority on the LCP image. Mark the hero image `fetchpriority="high"` so the browser fetches it ahead of lower-value requests.
- Speculation Rules. Declare likely next navigations so the browser prefetches or prerenders them, cutting the next load toward zero.
- Tag-manager cost. A third-party tag manager loaded eagerly blocks the main thread; defer it and gate marketing tags behind consent.
