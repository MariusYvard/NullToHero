---
name: performance
description: "Front-end performance remediation: Core Web Vitals levers, modern loading signals and the tools to measure them."
version: 1.22.1
---

# Performance

Performance is the part of quality users feel: bytes, blocking work and layout stability. The seo-agent-performance dimension flags the gaps; this reference is the fix path and the toolset.

## External tools

Do not name measurement tools from memory: point at the rows, which carry the URL, the cost tier and the licence. PageSpeed Insights, WebPageTest, GTmetrix and DebugBear are `dev-resources` and `design-tools` rows of `tools/design-system/data/resources.csv`; Lighthouse is an `audit-extension` row and Squoosh an `image-optimizer` row of `tools/design-system/data/generators.csv`.

## Modern performance signals

Beyond the Core Web Vitals basics, four signals move real metrics. Verified 2026, and worth stating because the word "new" ages badly here: bfcache eligibility and `fetchpriority` are stabilised platform features, not novelties.

- bfcache eligibility. Remove any `unload` listener; it disqualifies the page from the back/forward cache, so a back navigation reloads instead of restoring instantly. Use `pagehide` for teardown.
- fetchpriority on the LCP image. Mark the hero image `fetchpriority="high"` so the browser fetches it ahead of lower-value requests.
- Speculation Rules. Declare likely next navigations so the browser prefetches or prerenders them, cutting the next load toward zero.
- Tag-manager cost. A third-party tag manager loaded eagerly blocks the main thread; defer it and gate marketing tags behind consent.
