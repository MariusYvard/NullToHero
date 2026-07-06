# Attribution

NullToHero is built on the following open standards, tools and sources of knowledge.

## Standards and specifications

- **WCAG 2.2** — W3C Web Accessibility Guidelines. https://www.w3.org/TR/WCAG22/
- **Schema.org** — Structured data vocabulary. https://schema.org/
- **Core Web Vitals** — Google web performance metrics. https://web.dev/vitals/
- **Scroll-Driven Animations** — W3C draft spec. https://drafts.csswg.org/scroll-animations-1/

## Tools and prior work the design skills build on

- **impeccable** — design skill, anti-pattern detection CLI and live variant tooling by Paul Bakaus (Copyright 2025-2026 Paul Bakaus), licensed under the Apache License 2.0. https://github.com/pbakaus/impeccable
  The `siteasy` skill's command vocabulary, design laws and review methodology are adapted from impeccable, then remapped to the `/siteasy` and `/inspect` command sets and extended with SEO, GEO and additional design references. The `inspect` skill calls the `impeccable` CLI through `npx`, and `siteasy live` integrates with impeccable's live-mode scripts when they are installed. impeccable is Apache 2.0, the same license as NullToHero, so this adaptation is permitted; its attribution notices (including the upstream Anthropic frontend-design skill and ehmo's typecraft-guide-skill) are carried forward in [NOTICE](NOTICE) as required by Apache 2.0 section 4(d).
- **Playwright** — Microsoft, Apache 2.0. https://playwright.dev/
- **Lenis** — Darkroom Engineering (formerly Studio Freight), MIT. https://github.com/darkroomengineering/lenis
- **GSAP** — GreenSock, standard license. https://gsap.com/
- **ui-ux-pro-max-skill** — design-system knowledge base (stack guidelines and design data) by Next Level Builder, licensed under the MIT License. https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
  The `tools/design-system` generator adapts its stack knowledge base and design data. The MIT license text is retained in `tools/design-system/UI-UX-PRO-MAX-LICENSE-MIT.txt` and credited in [NOTICE](NOTICE).

## Data sources referenced in SEO references

- **Google Search Central** — official crawling and indexing documentation. https://developers.google.com/search
- **Bing Webmaster Tools** — Microsoft. https://www.bing.com/webmasters/
- **Common Crawl** — open web crawl data. https://commoncrawl.org/
- **Moz** — domain authority and backlink data. https://moz.com/

## Harvested checks, rules and references

The 1.22.0 release adds deterministic checks, inspect rules and references adapted from these open sources. Specifications and facts (HTML nesting rules, ARIA attribute names, HTTP header semantics) are not copyrightable; where prose or data was adapted it is noted and the license is honored.

- **React** (MIT, Meta Platforms, Inc.). The `invalid-dom-nesting` and `invalid-aria-attribute` checks use React DOM's enumerated WAI-ARIA attribute names and its HTML nesting rules (the WHATWG parsing spec). https://github.com/facebook/react
- **HTML5 Boilerplate** and its Apache server configs (MIT, HTML5 Boilerplate). The `charset-early`, `head-meta`, `compression-enabled`, `server-fingerprint` and header-quality checks, and the head-meta and print-styles references, adapt its head order, favicon and manifest conventions, print stylesheet and server-header guidance. https://github.com/h5bp/html5-boilerplate
- **Front-End-Checklist** (MIT, David Dias). The security, robustness, testing, privacy and i18n rules and references adapt its checklist items, rewritten in the house style. https://github.com/thedaviddias/Front-End-Checklist
- **PayloadsAllTheThings** (MIT, Swissky). The `cors-credentialed-wildcard` and `open-redirect-param` detection heuristics adapt its documented misconfiguration signals; no offensive payloads are included. https://github.com/swisskyrepo/PayloadsAllTheThings
- **design-resources-for-developers** (MIT, Brad Traversy). The `generators.csv` tool catalogue and the external-tool remediation lists adapt its curated tool names and URLs. https://github.com/bradtraversy/design-resources-for-developers
- **The Book of Secret Knowledge** (MIT, trimstray). The external validator references cite its curated tool list. https://github.com/trimstray/the-book-of-secret-knowledge

## License

NullToHero itself is licensed under Apache 2.0 (see [LICENSE](LICENSE)).
All third-party content referenced above remains under its respective license. Required attribution notices are reproduced in [NOTICE](NOTICE).
