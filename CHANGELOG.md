# Changelog

All notable changes to NullToHero are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning follows [Semantic Versioning](https://semver.org).

---

## [Unreleased]

<!-- Add your changes here before the next release -->

---

## [1.31.0] - 2026-07-12

Connective-tissue release: the five recommendations against the "catalogue" effect. No new detection content; the existing content now routes to itself.

### Added

- Shared project state generalized: `DIRECTION.md` joins PRODUCT.md/DESIGN.md as a first-class Setup gate in `/siteasy` (read by every command, conflict surfaced instead of overridden), re-read by `craft` at reference-load time, honored by `/seo` and `/inspect`, copied into `audit-assets/` by `/audit full`, listed as an optional input by all 15 sub-agents, and weighed by the memorability agent (declared intent vs delivered page).
- Remediation routing: `tools/data/remediation-map.csv` (32 checks + 64 rules, each mapped to the command that fixes it, the reference that command loads and an optional data query); every check in SITE-AUDIT.json now carries a `fixWith` route; the audit Action Plan and `/inspect detect` cite routes and group fixes by command.
- Active data: a passive library probe (`target.libs`: GSAP, Lenis, motion, three.js, R3F, scrollama, React/Next, Vue, Svelte, Tailwind, jQuery, Alpine, WordPress) beside the scrolly probe; standardized "Resource hooks" blocks in 8 references citing exact `search.py`/`search-references.mjs` queries; two new moments (scrollytelling, WebGL) in resource-recommendations.
- Reference graph: `tools/build-index.mjs` now emits `tools/reference-graph.json` (113 nodes, 258 edges) and validate check 36 fails on stale graphs, orphan references and design-system data files cited nowhere; the 11 existing orphans were wired in (plan templates linked from plan.md, technical deep dives, print styles from adapt, testing strategy from craft, ui-reasoning.csv documented in heuristics-scoring).
- Journeys: three orchestrated pipelines as `/siteasy` commands — `ship` (polish, defect scan, deterministic audit, hardening, final audit), `overhaul` (baseline audit, triage by remediation route, execute per command, compare) and `express` (setup to launch in eight gated stages) — 3 new references chaining existing commands around the shared state.

### Fixed

- audit SKILL.md described "13 specialist sub-agents"; the plugin dispatches 15.

---

## [1.30.0] - 2026-07-12

### Added

- WebGL scene budgets in `overdrive.md` (1.11.0): draw-call ceiling (a few hundred, 1000 max, instancing beyond), demand rendering with explicit invalidation, movement regression with fps hysteresis (~200ms rest), mount-cost discipline (share geometries/materials, toggle visible, stagger construction), nested low-to-high loading and disposal rules.
- Frame-loop laws in `animation-engineering.md` (1.12.0): mutate in the loop instead of setState, delta-time advancement, zero allocation in the hot path.
- Declarative-3D architecture notes in `creative-patterns.md` (1.10.0): static constructor args, state selectors, non-reactive reads in the loop, raycast event costs.
- Animated component registries in `component-patterns.md` (1.10.0): registry code is site code (audit and fix locally), registry defaults are defaults (reduced-motion guard, factory gradients), the stable 8-family taxonomy, pure-SVG device mocks.
- Component loops and entrances in `animate.md` (1.7.0): the two duration regimes (300-400ms feedback vs 3-40s ambient loops), IO entrance parameters, accessible split-text (aria-hidden clones + intact label), localized `tabular-nums` counters, negative-delay phasing, offscreen/reduced-motion/visibility cuts for canvas backgrounds, no setInterval engines.
- Decorative loop budget in `delight.md` (1.7.0) and the registry component-zoo tell in `memorability.md` (1.25.0).
- Eight inspect rules (57-64): no setState in frame loops, no allocation in frame loops, delta-time animation, cached asset loaders, declarative constructor props, hidden marquee clones, guarded infinite decorative loops, localized number formatting.
- Two deterministic checks: `three-duplicate-copies` (distinct REVISION constants = double three.js bundle) and `frame-loop-alloc` (engine-object allocation inside useFrame/rAF windows); 3 eval fixtures (67 total, 100%).
- Motion agent +2 checklist items (loop budget and guards, demand rendering and movement regression); memorability agent +1 (registry component zoo).
- 10 resources rows (R3F ecosystem: official eslint plugin, three-stdlib, @react-spring/three, Discover three.js; magicui dependencies: cobe, canvas-confetti, tw-animate-css, react-tweet, Shiki, svg-dotted-map) and 2 refreshed notes (Motion merger lineage, Magic UI registry model). All URLs verified.

---

## [1.29.0] - 2026-07-12

### Added

- Scrub-media engineering in `parallax.md` (1.7.0): track sizing per second of footage, progress-unit thinking, four-point overlay choreography with 6-10% plateaus, blob-seek video scrubbing (lerp ~0.18, seek coalescing, iOS priming), scrub-friendly encoding (crf 20 GOP 8; 720p GOP 4 crf 23 mobile sibling), canvas frame-sequence rules, honest loaders, a reduced-motion path that skips the media download entirely, a data-story discipline block and eight new refused anti-patterns.
- Runtime-discipline section in `animation-engineering.md` (1.11.0): one rAF ticker per page, `visibilitychange` pause, lerp reference values (0.05-0.1 pointer, ~0.18 scrub), idle states for continuous scenes, capped `setPixelRatio`, bounded tuning GUIs that never ship.
- Award-genre grammar in `signature-moments.md` (1.24.0): canonical clip-path closed states, split-text stagger grammar, bounded 3D tilt, velocity-reactive marquee, capability-gated WebGL heroes, desynchronized cursor trails, plus the guardrail that the full genre set with no variation is a template, not a signature. Matching sixth template-shaped tell and the literal-element criterion in `memorability.md` (1.24.0); WebGL gating and runtime rules echoed in `overdrive.md` (1.10.0).
- Narrative-chart rules in `data-viz.md` (1.16.0): message titles, direct labels over legends, small multiples against spaghetti, one highlight color, the Okabe-Ito palette, greyscale checking and a four-part chart alt-text formula.
- Ten inspect rules (47-56): JS reduced-motion guard for JS-driven motion, one smoothing system, kept document scrollbar, custom-cursor fallback, pin scroll track, containing-block trap, autoplay video hygiene, staged image sequences, capability detection over UA sniffing, gated WebGL with a DOM fallback. Rule 37 extended to debug tooling (ScrollTrigger markers, dat.gui/lil-gui).
- Six deterministic checks in the audit engine: `video-embed-hygiene`, `motion-reduced-guard` (CSS-only guard = WARN), `scrollbar-hidden`, `frame-sequence-preload`, `mixed-script-homoglyph` and `media-weight` (HEAD-probed video/3D budgets, with a range-GET fallback), plus bundler-default titles now FAIL `title-tag`. A passive scrollytelling probe (`target.scrolly`) gives the motion and UX agents context without a verdict. `runChecks` gains a `js` input wired through fetch, analyze and eval.
- 14 eval fixtures and labels for the new checks (64 fixtures, 100% accuracy, baseline regenerated).
- Motion agent checklist +3 (linear easing on scrubs, pin track, honest loaders and idle states); memorability agent +2 (literal non-templatable signatures, award-genre template tell).
- 20 data rows: 15 in `resources.csv` (scrollytelling and WebGL tooling, Okabe-Ito), 4 in `inspiration.csv` (Zentry, SPYLT, Musab Hassan, Nicola Rennie scrollytelling), Higgsfield in `generators.csv`. All URLs verified live.

---

## [1.28.0] - 2026-07-11

### Added

- A discreet credit-line convention for built sites (craft.md, checked by ship-checklist.md): when a build produces a legal-notices, imprint or about page, it carries one small line crediting NullToHero by Marius Yvard with a `rel="nofollow noopener"` link to mariusweb.fr. Only on that page, never sitewide; the builder mentions it when presenting and removes it on request. The nofollow is deliberate, so a repeated template link cannot read as a link scheme.

---

## [1.27.0] - 2026-07-11

### Added

- Three generative kinds in `fetch-asset.mjs`, produced locally with no network call: `wave` (layered smooth waves for hero backgrounds and section dividers, `--flip` for a top divider), `blob` (organic shape, flat or gradient fill, usable as a mask) and `pattern` (7 tileable motifs: dots, grid, diagonal, plus, zigzag, rings, checker; also prints the ready `background-image` data-URI CSS). All are seeded and reproducible, the seed is recorded in the file, and the output belongs to the project (CC0), so it commits cleanly. Documented in fetch-asset.md and surfaced in the resource-recommendations backgrounds moment.

---

## [1.26.0] - 2026-07-11

Full coverage of the design-resources-for-developers catalogue tail. The head of the list was already mirrored; the tail sections were missing because the original harvest fetch truncated at 102 KB.

### Added

- 255 rows in `resources.csv` (753 to 1,008 sites, 23 to 33 categories): design-inspiration (47), design-systems (30), design-tools (53), desktop-apps (14), browser-extensions (26), image-compression (13), react-native-ui (9), ai-design (6), dev-resources (52) plus 5 more svelte-ui entries.
- `inspiration.csv` (47 reference galleries with focus and best-for columns) and `design-systems.csv` (40 published design systems with org and strengths), registered in the design-system engine: `search.py "<query>" --domain inspiration` or `--domain design-systems`.
- 19 rows in `generators.csv`: 13 image-optimizer tools and a new ai-design category (6 tools).
- Wiring into existing flows, no new commands: a calibration step in the siteasy concept reference, optional calibration inputs for the memorability agent, an image-optimizer remediation pointer in the SEO images reference and three new moments in the resource-recommendations table (references, patterns, image weight).

### Changed

- `resources.csv` statuses refreshed by check-resources: 846 live, 81 moved, 46 unverified and 35 dead over 1,008 rows. 9 of the newly added URLs are dead upstream and enter already marked, so the recommendation flow skips them.

---

## [1.25.4] - 2026-07-07

### Removed

- The `assets/previews/` image gallery (about 2 MB of PNG and GIF). These files only rendered the gallery inside the README; every asset itself stays, and `assets/gallery.html` still shows them running in a browser. The README now lists the library in text and links to the live gallery.

## [1.25.3] - 2026-07-07

Broader eval coverage and corrected resource URLs.

### Added

- Eval fixtures for the six deterministic checks that had none: `head-meta`, `compression-enabled`, `server-fingerprint`, `https-redirect`, `host-canonicalization` and `security-txt`. Each carries a pass case and a negative case, and the harness now threads the probe object so the response-driven checks are graded. The analyzer's covered checks go from 18 to 24 of 24.

### Fixed

- Corrected the URLs of eight top-tier resources whose sites had moved or returned 404: Tabler Icons, Lucide, IonIcons, Openverse, Headless UI, Material UI, Material Icons and Naive UI now point at their current addresses.

## [1.25.2] - 2026-07-07

A correctness fix for the resource liveness check, plus the refreshed data it produces.

### Fixed

- `check-resources.mjs` no longer marks a reachable site dead. It sends a browser user-agent, retries a HEAD with a GET, and condemns only a confirmed-broken URL (404, 410 or a domain that does not resolve). A wall (401, 403 or 429), a server hiccup (5xx) or a slow connection is now recorded as live or unverified. The `status` column of `resources.csv` is refreshed with the corrected result, so the recommendation flow leads with sites that truly respond.

## [1.25.1] - 2026-07-07

A hygiene pass. No new commands, agents or references; the plugin surface is unchanged. Line endings, a count guard and attribution are the only changes.

### Changed

- Every text file is normalized to LF. A `.gitattributes` (`* text=auto eol=lf` with binary overrides) and an `.editorconfig` hold the convention, ending the mixed line endings that the design-system CSVs and scripts carried. The `LICENSE` body stays byte-exact so its verified hash still matches.
- `ATTRIBUTION.md` records the build-time services `fetch-asset.mjs` can reach and credits `resources.csv` next to `generators.csv`.

### Added

- `tests/validate.js` check 35 reads the audit sub-agent count from disk and the inspect-rule count from the CSV, then fails if any figure stated in the README or the skills disagrees. The counts can no longer drift silently.

## [1.25.0] - 2026-07-06

Assets fetched, not just recommended. The build flow can now pull a license-clean asset from an open API on demand, no command and no key, then wire it in. Scraping is not attempted; sources without a clean API stay recommendations.

### Added

- `tools/design-system/scripts/fetch-asset.mjs`: fetches an icon (Iconify, 150 plus open sets), a brand mark (Simple Icons), a font (Google Fonts, self-hosted woff2), a CC0 photo (Openverse, the Met, Art Institute, Cleveland), an avatar (DiceBear), a placeholder (Lorem Picsum) or a palette (Colormind). Each result prints its licence and the saver refuses a use-only source unless forced.
- `references/fetch-asset.md`, and guidance woven into the craft flow and the resource references so the build fetches by need rather than by a command.

### Changed

- The asset step now fetches directly from an open API when one exists, falling back to recommending a site otherwise.

## [1.24.0] - 2026-07-06

Better use of the resource registry. The 753 design resource sites gain a top-pick tier, a cost and licence hint and a liveness status, plus recipes to turn a pick into wired code and an aesthetic map so recommendations fit the concept.

### Added

- `resources.csv` columns: `tier` (top or more), `cost`, `use` (a licence hint) and `status`.
- `tools/design-system/scripts/check-resources.mjs`: a maintenance script that pings every URL and refreshes the status column so dead links drop out of the recommendations.
- `references/resource-recipes.md`: from a recommended resource to self-hosted, optimized code, per asset type (fonts, icons, color, illustrations, backgrounds, animation, charts).
- An aesthetic map in `resource-recommendations.md` matching a concept mood to the best-fit sources, and a rule to lead with the top tier.

### Changed

- The resource search now surfaces the tier, cost, use and status of each site.

## [1.23.0] - 2026-07-06

Memorable, not just correct. A site can pass every check and still be forgettable. This release adds the intent layer on top of the quality guardrails: a creative direction before building, an audit dimension that scores distinctiveness, and references for signature moments, authored motion and an ownable identity.

### Added

- `/siteasy concept`: an art-direction gate that sets a committed idea, an anti-reference and one signature moment in a `DIRECTION.md` the rest of the build honors.
- A fifteenth audit sub-agent, `siteasy-agent-memorability`, in the design-quality group. It scores point of view, a signature element, distinctive type, ownable color, surprise and voice, and restraint against template-shaped design. Wired into `/audit full` and `/audit design`.
- References `concept.md`, `memorability.md`, `signature-moments.md`, `motion-choreography.md` and `brand-identity.md`, linked from the concept, critique, overdrive, animate and amplify commands and from the craft flow.

### Changed

- The build flow now opens from the direction, not a component library, and the memorability dimension checks whether that direction survived to the rendered page.

## [1.22.0] — 2026-07-06

Harvested checks and references. The deterministic pre-pass gains thirteen checks: HTML nesting validity and ARIA attribute names, early charset and head metadata, subresource integrity, open-redirect parameters, a credentialed CORS wildcard, response compression, server fingerprint headers, cookie security flags, and three passive URL probes (HTTP to HTTPS redirect, www or non-www canonical host, security.txt). The security-headers check now grades HSTS and CSP quality and reports Permissions-Policy and cross-origin isolation. Nine inspect rules cover runtime security, JavaScript resilience and print and scheme robustness, and the rule set gains why and source columns. New references document head metadata, print styles, a testing strategy, privacy and consent, and performance; remediation tool lists and a generators data set back the build path.

### Added

- Deterministic checks in `tools/audit/lib/checks.mjs`: `invalid-dom-nesting`, `invalid-aria-attribute`, `charset-early`, `head-meta`, `subresource-integrity`, `open-redirect-param`, `cors-credentialed-wildcard`, `compression-enabled`, `server-fingerprint`, `session-cookie-flags`, and the probe-backed `https-redirect`, `host-canonicalization` and `security-txt`.
- `tools/audit/fetch.mjs`: passive URL probes (HTTP to HTTPS redirect, alternate host, security.txt) written into the fetch result and read by the new checks. Nothing crafted or offensive is sent.
- References `seo/references/head-meta.md`, `seo/references/privacy-consent.md`, `seo/references/performance.md`, `siteasy/references/testing-strategy.md` and `siteasy/references/print-styles.md`.
- `tools/design-system/data/generators.csv`: 88 build and remediation tools, registered in the design-system search.
- Nine rules in `tools/data/inspect-rules.csv` plus `why` and `source` columns, and seven eval fixtures (38 total).

### Changed

- `security-headers` now parses HSTS max-age and CSP weaknesses and reports Permissions-Policy and COOP, COEP and CORP as advisory.
- Remediation tool lists appended to the image-strategy, color-and-contrast, css-architecture, inspect review and performance references.

---

## [1.21.0] — 2026-07-03

Audit reliability. The deterministic pre-pass now writes the raw and rendered HTML, the linked CSS and JS, the response headers and robots.txt to a known assets directory that every sub-agent reads with the Read tool, so agents no longer depend on a WebFetch that may be unavailable. Contrast is computed statically from design tokens and linked CSS without a headless browser, security headers and canonical or preview state are parsed deterministically, and a preview host with a production canonical is no longer a false failure.

### Added

- `tools/audit/lib/css.mjs`: a bounded CSS model (custom properties, rules, `var()` resolution) so the static contrast check resolves token colours over a known background without Playwright.
- Deterministic `security-headers` check (HSTS, CSP or X-Frame-Options, X-Content-Type-Options, Referrer-Policy) and `canonical-url` check (preview-host detection; a cross-domain canonical on a preview host recommends noindex instead of failing).
- `tools/audit/reaudit.mjs`: an incremental re-audit planner that hashes the current inputs against the previous `SITE-AUDIT.json` and re-dispatches only the dimensions whose inputs changed.
- Eval fixtures for token contrast, security headers and preview canonical (31 fixtures).

### Changed

- `fetch.mjs` captures response headers and fetches same-origin linked CSS and JS (capped), and writes `raw.html`, `rendered.html`, `styles.css`, `scripts.js`, `headers.json` and `robots.txt` to `--assets-dir`.
- Static contrast is advisory (non-critical): only the Playwright-computed contrast caps the score, so a render-free estimate never forces the Critical band.
- Every sub-agent points its Inputs at the written files, carries a strict output contract, and a severity clarifier (Critical means blocks indexing, rendering or access).
- `cost.mjs` recalibrated to model the per-agent harness overhead that dominates a run (a full audit is about 1M tokens, not 156k); `SITE-AUDIT.json` records per-artifact input hashes.

---

## [1.20.6] — 2026-06-27

README consistency. Every skill block now carries a "Common runs" line; the inspect example block is removed in favor of one.

### Changed

- Added a "Common runs" line to siteasy, inspect and audit (seo already had one).
- Removed the inspect example code block.

---

## [1.20.5] — 2026-06-27

README consistency. Each skill now ends the same way: a description and a single collapsible block, with nothing left visible after it.

### Changed

- The seo "common runs", the inspect example block and the audit pre-pass note now sit inside their skill's collapsible section.

---

## [1.20.4] — 2026-06-27

README readability. Reverted the workflow to the plain-text flow, collapsed all four command tables and folded the output samples.

### Changed

- "How a project flows" is the plain-text flow again.
- All four skill command tables (siteasy, seo, inspect, audit) are collapsible.
- "See sample output" is now collapsed by default.

---

## [1.20.3] — 2026-06-27

More README polish. A Mermaid workflow diagram, a four-skill card grid, syntax-highlighted output samples, GitHub callouts and a dark-mode demo via a picture element.

### Added

- `docs/demo-dark.gif`: a dark-theme variant of the demo, served in dark mode.
- A "See what it produces" section with sample CSS tokens, JSON-LD and an action plan.

### Changed

- "How a project flows" is now a Mermaid diagram.
- "The four skills" opens with a card grid; the long siteasy and seo command tables are collapsible.
- Key asides use GitHub [!TIP] and [!WARNING] callouts.

---

## [1.20.2] — 2026-06-27

README aesthetics. A centered header with a badge row, an animated demo of an audit, a navigation bar, collapsible secondary sections, color-coded skill badges and a footer.

### Added

- `docs/demo.gif`: an animated audit (the question, then the score, group sub-scores and findings building in).

### Changed

- README header centered with version, license, CI and plugin badges; the four skills carry color-coded badges.
- Manual install, "Set up your project" and "Requirements" are collapsible; a nav bar links the main sections; a footer added.

---

## [1.20.1] — 2026-06-27

The README comparison is now a capability table across NullToHero, design-intelligence skills, design-methodology skills and in-browser UI generators.

### Changed

- "How NullToHero compares" reformatted as a feature matrix.

---

## [1.20.0] — 2026-06-27

Attribution cleanup and documentation. Third-party attribution is consolidated onto the genuinely vendored engine; the redundant THIRD-PARTY-NOTICES.md is removed. The overview diagram is refreshed and the README gains a comparison section.

### Changed

- Attribution is carried by ATTRIBUTION.md and NOTICE alone (the vendored ui-ux-pro-max engine and impeccable). The rewritten design references carry no separate notice. Removed THIRD-PARTY-NOTICES.md.
- `docs/overview.svg` version refreshed.
- README gains a "How NullToHero compares" section.

---

## [1.19.0] — 2026-06-27

A 14th audit agent and editorial rigor. The audit gains a Claims and credibility specialist that red-teams the page's marketing claims with the Toulmin model. Plus a machine-written-copy check, a structurally-different variant mode, and a lightweight ADR practice. 59 commands, 95 references, 14 sub-agents.

### Added

- `agents/siteasy-agent-claims.md`: a 14th sub-agent for the Claims and credibility dimension, dispatched in `/audit full` and `design`. The design group is re-weighted across five agents.
- Machine-written-copy tells in `clarify.md`; a structurally-different variant mode in `live.md`.
- `docs/adr/` (a one-paragraph ADR practice, first record on deterministic scoring) and `docs/OUT-OF-SCOPE.md`.

---

## [1.18.0] — 2026-06-27

New outputs. A developer handoff spec, a pre-launch ship checklist, a self-contained HTML rendering of an audit, plus UX copy patterns and a design-system audit. One new command (handoff); 59 commands, 95 references.

### Added

- `siteasy handoff` and `references/handoff.md`: an implementable handoff contract (layout, tokens, component states, motion, responsive, edge cases, accessibility).
- `siteasy/references/ship-checklist.md` (via `launch`): pre-deploy gates, deploy steps, post-launch verification and a rollback trigger.
- `audit/references/html-report.md` (via `report`): a self-contained HTML report with inline CSS, a score gauge and severity colors.
- UX copy patterns in `clarify.md` (error, CTA, empty-state, confirmation, tone) and a design-system audit in `extract.md` (naming, hardcoded values, component completeness).

---

## [1.17.0] — 2026-06-27

Theme generator. A pure-stdlib script turns a few brand inputs into a drop-in :root stylesheet: semantic tokens with WCAG contrast checks, neutral and accent tonal ramps, an elevation ramp, a fluid type scale, spacing and radius scales, focus-visible, a reduced-motion guard and a print sheet. The generative counterpart to the tokens audit. 58 commands, 92 references.

### Added

- `tools/design-system/scripts/theme_css.py`: emit a validated :root theme from --bg, --ink, --accent (plus optional font, radius and type ratio). Failing color pairings are flagged in a CSS comment, not shipped.

### Changed

- `siteasy tokens` and the design-system README point to the theme generator for a starter stylesheet.

---

## [1.16.0] — 2026-06-27

Code quality lane. A new inspect reference reviews the robustness of emitted code (the security, performance, correctness and maintainability that interface review skips) and wires into the bundled per-stack rule base. Ten web code-quality rules added to the deterministic detector. 58 commands, 92 references.

### Added

- `inspect/references/code-quality.md`: client-side security, performance, correctness and maintainability checks, plus a pointer to `tools/design-system/scripts/search.py` for stack-specific rules.
- Ten rules (28-37) in `tools/data/inspect-rules.csv`: link safety, unsanitized HTML, client secrets, non-blocking scripts, font-display, async failure, empty and error states, null guards, semantic interactive elements, debug noise.

### Changed

- `inspect review` also points to code-quality.md for robustness beyond interface defects.

---

## [1.15.0] — 2026-06-27

Design reference depth. Five new siteasy references (data visualization accessibility, an elevation and shadow system, a semantic color system, named style systems, landing page patterns) plus a modular type scale, adapted from external MIT sources recorded in ATTRIBUTION.md. One new command (charts); 58 commands, 91 references.

### Added

- `siteasy charts` command and `references/data-viz.md`: chart accessibility grades, mandatory non-color fallbacks, render thresholds by data volume.
- `references/elevation.md`: a doubling shadow ramp, elevation tokens, dark-mode tint depth.
- `references/color-systems.md`: ink-opacity hierarchy, tonal ramps, WCAG-corrected semantic roles.
- `references/style-systems.md`: per-aesthetic hard rules and cross-style motion timings.
- `references/landing-patterns.md`: landing section orders, CTA placement, proof patterns.
- `references/typeset.md`: a modular type scale with fluid clamp() sizing and tabular figures.

---

## [1.14.0] — 2026-06-09

Deterministic pre-pass. A pure-Node ground-truth layer turns the shared fetch into objective verdicts before any agent runs: an optional JavaScript render (Playwright) so a client-rendered SPA is audited as rendered rather than as an empty shell, a static analyzer that computes the objectively decidable checks (contrast, image dimensions, viewport, robots.txt, heading order, html lang, title, meta description, 375px overflow), a machine-readable `SITE-AUDIT.json`, a CI gate, a cost ledger and a reference evaluation set. One new command; 57 commands, 86 references.

### Added
- `/audit checks [url]` and `references/checks.md`: a deterministic-only run mode that fetches once, computes the objective checks and writes `SITE-AUDIT.json`, dispatching no sub-agents. Fast, cheap and fully reproducible; it is also the ground-truth layer the agent run modes consume in their fetch phase.
- `tools/audit/fetch.mjs`: shared fetch with an optional `--render` (headless Chromium via Playwright, an optional peer dependency) and a `clientRendered` verdict, so a raw fetch of an SPA is flagged rather than silently audited as a shell.
- `tools/audit/analyze.mjs` and `tools/audit/lib/` (`html`, `contrast`, `checks`, `site-audit`): the static analyzer and its check engine. Each verdict carries a `method` of computed, static or not-measured, and maps to the sub-agent that owns the dimension.
- `tools/audit/schema/site-audit.schema.json`: the JSON Schema (draft-07) for `SITE-AUDIT.json` (scores plus per-check verdicts plus a cost ledger).
- `tools/audit/gate.mjs` and a reusable composite GitHub Action (`action.yml`): a CI gate that fails on a critical-check FAIL or below a score threshold, usable as `uses: MariusYvard/NullToHero@v1.14.0`. `.github/workflows/audit-selftest.yml` runs it on the fixtures every push.
- `tools/audit/compare.mjs`: a structural diff of two `SITE-AUDIT.json` results, so `/audit compare` diffs structured fields instead of re-parsing markdown.
- `tools/audit/cost.mjs`: an end-of-run cost ledger (agents launched, approximate tokens, elapsed time).
- `tools/audit/eval.mjs` with `tests/eval` (25 labeled HTML fixtures, `labels.json`, `baseline.json`): grades the analyzer for verdict accuracy and drift; wired into `npm test` and CI.
- `docs/CLAUDE-IN-CHROME.md`: how to use Claude in Chrome for live-site analysis and feed the rendered DOM back into the audit.
- `tests/validate.js`: checks 29-33 enforce the new wiring (the checks command, the tooling and schema, the JSON and cost wiring in the orchestration docs, the eval fixtures, the Action).

### Changed
- `skills/audit/references/full.md`: the shared fetch phase documents the optional render and the deterministic pre-pass, adds a "Ground truth from computed checks" section (agents adopt computed verdicts rather than re-judging them), and the outputs now include `SITE-AUDIT.json` and a cost ledger.
- `skills/audit/references/compare.md` prefers the structural `SITE-AUDIT.json` diff; `skills/audit/references/report.md` reads `SITE-AUDIT.json` and embeds the cost ledger.
- `agents/inspect-agent-a11y`, `inspect-agent-layout`, `seo-agent-technical`, `seo-agent-content`: a "Computed ground truth" block tells each to adopt the pre-pass verdicts for the checks it owns.
- `docs/ARCHITECTURE.md`: a "Deterministic pre-pass (ground truth)" section and an evaluation-set note under empirical tuning.

---

## [1.13.0] — 2026-06-09

Audit comparison. A new `/audit compare A B` mode diffs two targets check by check: which verdicts regressed, which improved and the resulting score deltas. It is trustworthy because 1.12.0 made the scores deterministic, so a delta is a real difference rather than jitter. One new command; 56 commands, 85 references.

### Added
- `/audit compare [A] [B] [group]` and `references/compare.md`: audits target A and target B with the same specialist group (default full, 13 agents per target), aligns their check tables one to one, and reports per-check verdict changes classified as regression or improvement with their rubric point impact, plus per-agent, per-group and overall score deltas. Each target is a URL, a local HTML file or a previously saved `SITE-AUDIT-REPORT.md` (a saved baseline is read rather than re-audited, the cheap way to compare today against a kept snapshot). Flags severity-cap changes between the two targets and writes `SITE-AUDIT-COMPARE.md`. Documents the before/after regression use and the A-vs-B benchmark use, with the cross-site caveat that two different sites do not share intent. States the cost (a full compare is about twice a single full audit).
- `tests/validate.js`: check 28 verifies the compare command is wired and that `compare.md` carries its diff sections.

---

## [1.12.0] — 2026-06-09

Deterministic audit scoring. Replaces the free-form 0-100 score each agent picked by feel with a fixed rubric computed from the check verdicts, and makes the severity cap fire on a rule instead of a judgment. Cuts run-to-run score variance on the same site. No new commands; 55 commands, 84 references.

### Changed
- All 13 sub-agents: the `## Scoring` section is now a deterministic rubric (start 100, minus 15 per FAIL, minus 7 per WARN, floored at 0, then capped at 49 if a check the agent marks critical is FAIL). The score is a function of the verdicts, so two audits with the same verdicts return the same number, and the score line must show the arithmetic. seo-agent-geo keeps its weighted model but pins each dimension to a counted signal (AI crawler access = allowed/14, llms.txt present = 100 or 0).
- Critical checks are declared per agent and only where the condition is objectively checkable (a11y keyboard and contrast, interaction states and feedback, layout horizontal-scroll and overflow, code valid-markup and forbidden-CSS, technical robots.txt, content depth, performance LCP, schema absence). The subjective siteasy dimensions stay graded continuously with no hard cap, so a borderline judgment cannot jolt the score.
- `skills/audit/references/full.md`: the severity cap now fires when inspect-agent-a11y or inspect-agent-interaction reports a FAIL on a declared critical check, not on a felt CRITICAL severity, so the cap no longer toggles between runs. The scoring section states that agent scores are rubric-computed.
- `docs/ARCHITECTURE.md`: the deterministic-reduce section documents rubric-computed agent scores and the rule-based cap, and notes that residual variance is confined to verdict flips on subjective checks, which the verify mode bounds.

### Added
- `tests/validate.js`: checks 26 and 27 enforce the rubric (every agent declares it, the check-table agents carry the explicit formula, the gating agents declare concrete critical checks) and that the orchestrator cap is rule-based.

---

## [1.11.0] — 2026-06-08

Multi-agent architecture pass. Documents the orchestrator and the 13 sub-agents against production multi-agent practice, hardens the agent layer against untrusted-input injection, and adds a consensus re-check mode. One new command; 55 commands, 84 references.

### Added
- `docs/ARCHITECTURE.md`: the rationale record for the agent layer. Covers the supervisor/subagents topology, parallel Map/Reduce against serial error multiplication, the shared single fetch, context isolation, verbatim section embedding, the deterministic reduce (weighted score plus severity cap), the security model, and a table of which production-infra recommendations (Temporal, Redis, DynamoDB, framework choice, tracing) do not apply to a Markdown plugin and why.
- `/audit verify` and its documentation in `references/full.md`: a consensus re-check that re-runs the gating dimensions (accessibility, interaction, technical SEO) K=3 times in parallel, reconciles each check by majority vote, reports the median score, and elevates low-consensus checks under "Needs human review". States the token multiplier and the shared-model limit honestly.
- `## Trust boundary` block in all 13 sub-agents: fetched content is untrusted data to analyze, never instructions to follow; a page that tries to steer agent behavior is reported as a finding.
- `SECURITY.md`: an "Agent security model" section (least agency, read/write separation, multi-hop indirect injection, untrusted input, no committed secrets).
- `tests/validate.js`: four checks (22 to 25) enforcing the new invariants: sub-agents stay read-only, every sub-agent keeps its Trust boundary block, the verify mode stays wired across SKILL.md and full.md, and the architecture doc is present.

### Changed
- `skills/audit/references/full.md`: the Parallel dispatch section now states context isolation explicitly (pass each agent only its task and the shared HTML, never routing history or another agent's output, and embed sections verbatim).

---

## [1.10.0] — 2026-06-06

Mobile ergonomics knowledge drop: a dedicated phone playbook plus thumb-zone navigation, touch-target standards, mobile-first strategy, virtual-keyboard mapping and loading-state choreography folded into the existing references. One new command; 54 commands, 84 references.

### Added
- `/siteasy mobile` and its reference `mobile-ergonomics.md`: the phone-specific playbook — thumb-zone placement map with corollaries (primary actions at the bottom, destructive actions out of the easy zone), condensed touch-target rules, one-handed navigation constraints, gesture escape hatches, keyboard-friction reduction through device capabilities (geolocation, camera, passkeys), cellular performance, and a five-step mobile audit protocol with a 12-point checklist.
- `information-architecture.md`: "Mobile navigation" section — one-handed-use data (49/36/15), bottom tab bar vs hamburger vs full-screen vs gesture-only trade-offs, the Priority+ hybrid pattern with documented results, the 80-20 rule for drawers, the three-level depth ceiling, safe back behavior and the case against in-app browsers for core journeys.
- `responsive-design.md`: "Mobile-first is a strategy, not a media-query order" — top-down responsive vs bottom-up mobile-first comparison, full content parity (no "view desktop site" link), the mobile comprehension penalty and the false-floor effect of banner-shaped decoration.
- `wcag-2-2.md`: target-size context — how 24px (AA) sits against WCAG 2.5.5 AAA 44px, Apple 44pt, Android 48dp and Microsoft 7mm, plus per-control comfort sizes (CTA, fields, icon buttons, modal close) and the 8px adjacency gap.
- `form-patterns.md`: `<fieldset>`/`<legend>` grouping for screen readers and a keyboard-trigger map pairing `type`, `inputmode` and `autocomplete` per data type (codes, phone, email, decimal, URL).
- `animation-engineering.md`: "Loading-State Choreography" — nothing under 300ms, skeleton with 1.5-2s shimmer loop from 300ms to 2s, spinner plus contextual message beyond 2s, 200ms cross-fade to content, degraded-network strategy. Explicitly scoped as ambient state outside the 300ms feedback ceiling.
- `adapt.md`: gesture affordance rule (visible hint plus button alternative for every swipe or pinch) and thumb-reach repositioning on rotation.
- `tools/data/inspect-rules.csv`: two rules — mobile keyboard triggers (`inputmode` over `type="number"` for codes) and loading-state choreography. 27 rules total.
- Agent checklists: `siteasy-agent-ux` gains thumb-reach navigation and the three-level depth check; `siteasy-agent-motion` scores skeleton timing against the 300ms/2s thresholds.

---

## [1.9.2] — 2026-06-06

Implements every finding of the v1.9.1 full audit. No new features.

### Fixed
- `LICENSE` is now the canonical Apache-2.0 text, verbatim from apache.org (appendix included). The previous file paraphrased several sections and grafted MIT wording ("publish, distribute, sublicense, and/or sell") into section 4, which broke GitHub's license detection (NOASSERTION) and contradicted the Apache-2.0 declared everywhere else.
- Removed four cross-references to commands that do not exist: `seo-agent-technical` pointed to `/inspect audit` (now `/inspect preview`), `inspect-agent-layout` to `/seo performance` (now `/seo technical`), and `siteasy-agent-visual` plus `inspect-agent-a11y` to `/siteasy colorize` (now `/siteasy amplify`, which loads the colorize reference).
- `siteasy-agent-motion` now checks UI feedback against the same 150-300ms ceiling as the siteasy design laws and `/inspect review`, with an explicit carve-out for large surfaces (modals, drawers, up to ~500ms). `animation-engineering.md` states the same distinction instead of contradicting its own duration table.
- `tools/design-system/README.md` no longer lists the `design` and `draft` CSVs removed in 1.9.1, and its domain list matches the real `--domain` choices (`prompt` never existed; `icons`, `react` and `web` were missing). Same fix in the `search.py` docstring, which also now lists all 16 stacks.
- The five SEO agent descriptions now state their dual dispatch ("dimension of /audit (and /seo audit)"), matching the nine inspect and siteasy agents.
- `/audit` writes `SITE-ACTION-PLAN.md` instead of `ACTION-PLAN.md`, so running `/audit` after `/seo audit` in the same directory no longer overwrites the SEO action plan.
- `/seo audit` documentation no longer claims "7 specialist checks": it scores 7 dimensions through 5 parallel sub-agents and now says exactly which dimension folds into which agent. Both `/seo audit` and `/audit` state that their SEO scores use different weights and are not comparable.
- `install.sh`, `install.ps1` and the feature-request template now list the `/audit` skill (added in 1.9.0 but missing there).
- Lenis attribution updated: Studio Freight is now Darkroom Engineering and the repository moved to `darkroomengineering/lenis`.
- `tools/data/inspect-rules.csv` is now valid RFC 4180 (doubled quotes instead of backslash-escaped ones), so strict CSV parsers read all 25 rules correctly.
- `search.py --persist` prints the path it actually writes: the confirmation message now runs the project and page names through `safe_slug` like the writer does.
- `seo-agent-technical` annotates its 48px touch-target line as the Google mobile guideline, with the WCAG 2.5.8 floor (24px, 44px recommended) stated alongside, so `/audit` reports no longer carry two unexplained thresholds.
- Three references pointed to `reference/live.md`; they now link `live.md` directly.

### Changed
- `docs/overview.svg` adapts to dark mode via `prefers-color-scheme` (GitHub dark palette, lightened accents) and shows the current version badge.

### CI
- Validator gains Check 8b: the LICENSE body (up to "END OF TERMS AND CONDITIONS", whitespace-normalized) must hash to the canonical Apache-2.0 text, so a non-canonical license can never ship again. 322 checks total.

---

## [1.9.1] — 2026-06-06

### Changed
- Sub-agents now run with least privilege: removed the unused `Bash` tool from all 13 agents. They only Read, Grep, Glob and WebFetch, so dropping Bash shrinks the prompt-injection-to-execution surface with no change in behavior.
- Removed the non-standard `license` key from the four `SKILL.md` frontmatters. The license is already declared in `plugin.json` and `LICENSE`.
- Rewrote `README.md` for a website-builder audience: clearer structure, an overview diagram (`docs/overview.svg`), a goal-oriented quick start and a collapsible knowledge base. Removed the per-version "What's new" sections; release history now lives in this changelog.

### Removed
- Deleted the unused design-system backups `tools/design-system/data/draft.csv` and `design.csv` (loaded by no script) and dropped them from the validator CSV exemption list.

### Fixed
- `SECURITY.md` now lists the current release line (1.9.x) as supported instead of 1.8.x.

### CI
- `release.yml` fails the release if the pushed tag does not match the `plugin.json` version, or if `CHANGELOG.md` has no section for that version.
- `validate.yml` no longer marks the reference-index build as `continue-on-error`, so a failing build now fails CI.
- Validator gains Check 12b: the `SECURITY.md` supported line and the `README` version token must match `plugin.json`. 321 checks total.

---

## [1.9.0] — 2026-06-05

### Added
- Eight specialist sub-agents: `inspect-agent-{a11y,interaction,layout,code}` for deterministic front-end defect detection, and `siteasy-agent-{ux,visual,motion,content}` for design-quality review. Each is scoped to one dimension with explicit non-overlap boundaries, mirroring the five SEO agents.
- New `audit` skill (`/audit`): a meta-orchestrator that runs a complete whole-site audit by dispatching all 13 sub-agents across search visibility, front-end defects and design quality, then merges them into one scored report with a prioritized action plan. Modes: `full`, `seo`, `defects`, `design`, `quick`, `report`.
- `/siteasy audit` and `/inspect review` now expose a parallel multi-agent architecture that dispatches their four agents, with an inline fallback.
- Validator: Check 11b (audit skill), agent `tools` frontmatter field (Check 5), and Check 21 (quote-aware CSV column integrity). 319 checks total.

### Changed
- Renamed the five SEO agent files from `agents/audit-*.md` to `agents/seo-agent-*.md` so filenames match their frontmatter `name`; `plugin.json` and `validate.js` updated accordingly. `plugin.json` now declares all 13 agents.
- Scoped the Inter-font ban to brand surfaces (product UI may use system stacks); removed Outfit from the recommended list (it stays on the brand reject list); scoped the emoji ban to shipped website output (audit-report status markers are exempt).
- Added `Edit` (and `Bash(lsof *)` for siteasy) to the `inspect` and `siteasy` allowed-tools, matching what their references use.

### Fixed
- Reconciled internal contradictions: imagery default unified on `picsum.photos`; the `ease-in` "elements leaving" row relabelled to a custom accelerate curve consistent with the keyword ban.
- Removed the redundant orphaned `siteasy/references/playwright.md` (its workflow lives in `inspect/references/preview.md`); fixed a hardcoded `parallax-audit.mjs` path in `inspect/review.md` to use `${CLAUDE_PLUGIN_ROOT}`.
- Corrected the SEO cross-skill tables: dropped the FR/EN bilingual column and fixed false "(not included)" entries that pointed away from existing commands (`/seo images`, `/seo sitemap`, `/seo hreflang`, `/seo local`).
- Fixed a dead `quality-gates.md` pointer in `page.md`, the GPTBot purpose in `geo.md` (training, not search), the WCAG large-text threshold in `color-and-contrast.md`, the touch-target figure in `sxo.md` (44px), and `seo-competitor-pages` to `/seo competitor-pages`.
- Repaired six malformed rows in the design-system CSVs (unescaped commas, a merged record, a broken quoted cell) that shifted columns under `csv.DictReader`; corrected a stale `build-index.mjs` filename note and the 1.1.0 date in this changelog.
- `siteasy/scripts/live-server.mjs` now handles `EADDRINUSE` gracefully when started directly on a busy port.

### Security
- Attributed the bundled MIT design-system component (ui-ux-pro-max-skill, Next Level Builder) in `NOTICE` and `ATTRIBUTION.md`; the existing `tools/design-system/README.md` pointer now resolves.

---

## [1.8.2] — 2026-06-01

### Fixed

- `skills/seo/references/page.md` and `skills/seo/references/competitor-pages.md` described FAQ rich results as "restricted to government and healthcare sites". That status is stale: Google removed FAQ rich results for all sites on May 7, 2026. Both files now match `references/schema.md` (FAQPage remains a valid Schema.org type Google still parses, only the SERP feature is gone).

### Added

- `skills/seo/references/schema.md`: a re-verification note on the schema-status table, so dated retirements are checked against Google Search Central before being quoted.
- `tests/validate.js` Check 20 (FAQ regression guard): fails if any SEO reference reintroduces a present-tense "FAQ restricted to gov/health" claim. The historical "previously restricted" note in `schema.md` is exempt. Validator at 261 checks.

### Changed

- README: documents the plugin-namespaced command form (`/null-to-hero:seo`, `/null-to-hero:siteasy`, `/null-to-hero:inspect`) and notes that the short forms resolve only when no other installed skill claims the same name. The installers print the namespaced fallback.
- `SECURITY.md`: supported-versions table now lists 1.8.x.

---

## [1.8.1] — 2026-06-01

### Fixed

- `skills/siteasy/references/tokens.md` — three internal links pointed to `references/design-tokens.md` and `references/dark-mode-engineering.md`. From inside the references folder these resolved to a non-existent `references/references/` path. They now link to the sibling files directly (`design-tokens.md`, `dark-mode-engineering.md`).

### Changed

- The 19 `skills/seo/references/*.md` files no longer carry `user-invocable`, `argument-hint` or `license` frontmatter. They are reference documents loaded by `seo/SKILL.md`, not standalone invocable skills, so their frontmatter now matches the siteasy and inspect reference shape (`name`, `description`, `version`).
- Added YAML frontmatter (`name`, `description`, `version`) to the six `skills/seo/references/plan-assets/*.md` industry templates for consistency with the rest of the reference set.

### Added

- `tests/validate.js` Check 19 (stale-index guard): rebuilds the reference index in memory using the same algorithm as `tools/build-index.mjs` and fails if `tools/reference-index.json` is out of date.
- `tests/validate.js` Check 12 now also verifies the `PLUGIN_VERSION` declared in `install.sh` and `install.ps1` against the manifests, closing a version-drift gap. Validator at 260 checks.

---

## [1.8.0] — 2026-06-01

### Added

- `NOTICE` — Apache 2.0 section 4(d) attribution for impeccable (Copyright 2025-2026 Paul Bakaus), carrying forward its upstream notices (Anthropic frontend-design skill, ehmo's typecraft-guide-skill).
- `tests/unit.mjs` — runtime unit tests for the siteasy live helper: `resolveInRoot` path containment (rejects absolute paths, `../` escapes, empty and non-string input) and `looksGenerated` marker detection.
- `tests/test_design_system.py` — unit tests for `safe_slug` (normalisation, traversal and unsafe-character stripping, fallback behaviour).
- `tests/validate.js` — Check 18: the README headline counts (skills, commands, reference docs) must match the real file and command totals. Now 259 checks.
- CI: both workflows run the Node and Python unit tests alongside the validator.

### Changed

- `ATTRIBUTION.md`: states impeccable's license explicitly (Apache 2.0, the same license as NullToHero) instead of the previous "verify its terms" hedge, and points to `NOTICE`.
- README: clarifies the architecture (three user-invocable skills routing to 47 sub-commands through the first argument, no separate `commands/` directory) and reworks the install section. The unverified direct `/plugin install owner/repo` path was removed (Claude Code installs plugins as `name@marketplace`), and a caveat plus a clone-first alternative were added for the `curl | bash` one-liner.
- `tools/design-system/scripts/design_system.py`: the nested `_safe_slug` helper was lifted to a module-level, importable `safe_slug` (behaviour unchanged) so it can be unit-tested.
- `skills/siteasy/scripts/live.js`: the status bar is built with `textContent` and an element style instead of `innerHTML`.
- `CONTRIBUTING.md`: the large-file soft limit is Check 13, not Check 12.

---

## [1.7.1] — 2026-06-01

### Security

- siteasy live daemon (`live-server.mjs`, `live-accept.mjs`, `live-core.mjs`): closed an arbitrary-file-write chain. Accept/discard handlers now confine writes to the project root via a new `resolveInRoot` guard (rejecting absolute paths and `../` escapes); CORS is scoped to localhost origins instead of `*`; the session token uses `crypto.randomBytes` instead of `Math.random`; request bodies are capped at 1 MiB and the long-poll timeout at 10 minutes.

### Fixed

- siteasy: `references/optimize.md` no longer presents FID as a live Core Web Vital. Replaced with INP (LCP, INP, CLS), consistent with the project's own `seo/references/technical.md` directive.
- seo: removed four dead in-doc references (`schema-types.md`, `schema/templates.json` in two files, `eeat-framework.md`); the content they pointed to was already inline.
- seo: `references/schema.md` — FAQ moved from RESTRICTED to DEPRECATED (rich results removed for all sites May 7, 2026); status date refreshed to June 2026.
- README: folded `geo quick`/`geo compare` into the `geo` row so the `/seo` table is 19 commands and the total reconciles to 47.
- `.claude-plugin/marketplace.json`: corrected the `$schema` URL to the resolving `claude-code-marketplace.json`.
- CHANGELOG: removed the unverifiable "64 reference documents" figure from the 1.0.0 entry; relabelled the format as Keep a Changelog.
- siteasy: `parallax-audit.mjs` loads Playwright lazily with a clear install message instead of crashing on a missing module; `live-accept.mjs` CLI self-detection is now Windows-safe via `pathToFileURL`.

### Changed

- Touch-target guidance unified across inspect, seo and siteasy: 24×24px CSS minimum (WCAG 2.5.8 AA), 44×44px recommended for touch.
- geo: broadened the citable-passage figure to ~120–180 words and date-stamped the industry-statistics table.
- Installers pin the manual-clone fallback to the matching release tag, with a graceful fall-back to the default branch.
- CI: added `concurrency` guards to both workflows; `release.yml` binds the tag name via `env:` instead of the implicit `GITHUB_REF_NAME`.
- `.gitignore`: added `__pycache__/` and `*.pyc`; removed the two tracked `.pyc` files from the index.

### Added

- `SECURITY.md` — disclosure policy and trust model.
- `tests/validate.js` — Check 17: in-doc `references/*.md` and `schema/*.json` pointers must resolve (would have caught the dead references above). Now 256 checks.

---

## [1.7.0] — 2026-06-01

### Fixed

- siteasy: 131 stale `/impeccable` command references across 15 reference files now point to the real `/siteasy` commands, with forked verbs remapped (craft→build, shape→plan, teach→setup, harden/optimize→launch, quieter/distill→simplify, bolder/colorize→amplify)
- seo: `/seo-technical` style cross-references corrected to `/seo technical`
- install.ps1: marketplace install is detected via `$LASTEXITCODE` instead of an unconditional success flag; command count corrected from 18 to 19
- install.sh + install.ps1: the local fallback now uses `claude plugin marketplace add` + install instead of the undocumented `claude plugin add`
- design_system.py: project and page slugs are sanitized against path traversal

### Added

- seo: the five audit specialists are real plugin agents under `agents/`, dispatched in parallel by `/seo audit` via the Task tool (with an inline sequential fallback)
- siteasy: stack-aware design-system generator wired into `/siteasy setup` (16 stacks, curated color/typography/landing data)
- siteasy: self-contained live variant mode (`live.mjs`, `live-poll.mjs`, `live-wrap.mjs`, `live-server.mjs`, `live-accept.mjs`, `live-inject.mjs`, `detect-csp.mjs`, `live.js`) replacing the broken external script references
- siteasy: `load-context.mjs` (PRODUCT.md/DESIGN.md loader with legacy `.impeccable.md` migration), unblocking `/siteasy setup` and `/siteasy document`
- `tools/reference-index.json` is now committed, and `search-references.mjs` auto-builds it when missing
- both manifests gain `$schema`; GitHub Actions pinned to commit SHAs
- ATTRIBUTION.md credits impeccable as adapted prior work
- validate.js: new content-coherence checks (no stale `/impeccable` refs, referenced scripts exist, declared agents are dispatched); now 255 checks

### Changed

- seo SKILL.md declares `allowed-tools`
- agents moved from `skills/seo/agents/` to plugin-root `agents/` with standard plugin-agent frontmatter

---

## [1.6.0] — 2026-05-31

### Added

- `skills/siteasy/references/animation-engineering.md` — View Transitions API section (same-document and cross-document, element matching, reduced-motion gating)
- `skills/siteasy/references/responsive-design.md` — container queries section (`container-type`, `@container`, `cqi` units)
- `skills/siteasy/references/css-architecture.md` — `:has()` relational selection and `color-mix()` token derivation
- Frontmatter (`name`, `description`, `version`) added to all 53 siteasy and 3 inspect reference files, clearing 56 validator warnings
- `ATTRIBUTION.md` — credit for the `impeccable` CLI (Paul Bakaus)
- Tested-version note for `impeccable` (2.3.2) in the inspect and siteasy SKILL.md

### Fixed

- `package.json` — version was stuck at 1.5.0 while all other manifests were ahead; now tracked by the validator
- `tests/validate.js` — version consistency check (Check 12) now includes `package.json`
- `.github/workflows/release.yml` — changelog extraction returned only the heading line (empty release notes on every tag); rewritten with a flag-based awk range

---

## [1.5.2] — 2026-05-30

### Fixed

- `skills/siteasy/SKILL.md` — stripped the UTF-8 BOM so Cowork can parse the frontmatter `description`. Without this, the skill description failed to load.
- Version bumped to 1.5.2 across `plugin.json`, `marketplace.json` and all three `SKILL.md`.

---

## [1.5.1] — 2026-05-30

### Fixed

- `tests/validate.js` — `parseFrontmatter` now strips the UTF-8 BOM before matching, so BOM-prefixed reference files validate correctly.
- `tests/validate.js` — lowered `FILE_INTEGRITY` minimum line thresholds to match actual file sizes, removing false truncation failures.

---

## [1.5.0] — 2026-05-30

### Added

- `tools/build-index.mjs` — generates `tools/reference-index.json`, a machine-readable manifest of all skills and references; called by both CI workflows before validation
- `package.json` — `npm test` runs build + validate; `npm run build` generates the index
- `LICENSE` — full Apache 2.0 text at repo root (GitHub license detection)
- `ATTRIBUTION.md` — credits for standards, tools and data sources referenced in skill docs
- `.gitignore` — covers OS artefacts, node_modules, editor dirs, Playwright output
- `CONTRIBUTING.md` — removed stale reference to `tools/design-system/data/google-fonts.csv`

---

## [1.4.0] — 2026-05-27

### Added — Group C: architecture, outputs, action plans

- `/seo report [url|file|generate]` — format any audit output as a client-ready Markdown report or PDF (via Cowork PDF skill); score gauges, color-coded tables, executive summary
- `skills/seo/references/action-plan.md` — standardized ACTION-PLAN output template (Quick Wins / 1-Week / 1-Month / Backlog) now used by all commands
- `skills/seo/agents/` — 5 parallel sub-agent files for `/seo audit`: `audit-technical`, `audit-content`, `audit-schema`, `audit-geo`, `audit-performance`. When the Task tool is available, `/seo audit` delegates each dimension in parallel; results are aggregated into a unified score and ACTION-PLAN

### Changed

- `skills/seo/SKILL.md` — version 1.4.0; parallel audit orchestration instructions added; `report` command added; cross-command workflow updated
- `tests/validate.js` — 3 new checks: agent file presence and frontmatter (Check 5), per-file minimum line count integrity (Check 6), regex fix to detect hyphenated command names

---

## [1.3.0] — 2026-05-27

### Added — SEO skill: 11 new commands

- `/seo sitemap` — XML sitemap validation and generation with industry templates
- `/seo images` — Image SEO audit: alt text, formats (WebP/AVIF), lazy loading, CLS, LCP
- `/seo local` — Local SEO: Google Business Profile, NAP consistency, citations, reviews, LocalBusiness schema
- `/seo hreflang` — Hreflang / i18n SEO: validation and generation for multilingual sites
- `/seo programmatic` — Programmatic SEO: URL patterns, quality gates, deduplication
- `/seo competitor-pages` — "X vs Y" and "alternatives to X" pages with feature matrices and schema
- `/seo cluster` — Semantic keyword clustering: intent-based grouping, content architecture, gap analysis
- `/seo sxo` — Search Experience Optimization: intent alignment, page-type matching, persona analysis
- `/seo drift` — SEO drift monitoring: baseline capture, change detection, history tracking
- `/seo backlinks` — Backlink profile analysis via free data sources (Moz, Bing, Common Crawl, GSC)
- `/seo ecommerce` — E-commerce SEO: product pages, category pages, faceted navigation, Product schema

### Added — GEO: new commands and improved scoring

- `/geo quick [url]` — 60-second GEO visibility snapshot with top 3 quick wins
- `/geo compare [url]` — Compare current GEO state against a stored baseline
- Weighted GEO scoring methodology (6 dimensions with explicit weights)
- Platform subscores: Google AI Overviews, ChatGPT, Perplexity, Bing Copilot (each 0-100)
- Extended AI crawler list: 14 crawlers tracked

### Added — Repo quality

- `CHANGELOG.md`, `CONTRIBUTING.md`, `install.sh`, `install.ps1`, `tests/validate.js`

---

## [1.2.0] — 2026-05-15

### Added

- Design foundations layer in `siteasy` and `inspect`
- Gestalt principles, UX research methodology, information architecture, journey mapping
- WCAG 2.2 reference — all 9 new success criteria with code patterns
- Image strategy — AVIF/WebP/SVG decision matrix, `<picture>` pattern, LCP optimization
- Form patterns — single column layout, autocomplete vocabulary, validation timing
- Three new commands: `/siteasy research`, `/siteasy ia`, `/siteasy journey`
- 25 new anti-pattern rules in `/inspect detect`

---

## [1.1.0] — 2026-05-14

### Added

- Parallax engineering reference: 6 effect typologies, 3 implementation paths
- `/siteasy parallax` command
- 14 new anti-pattern rules in `/inspect detect`

---

## [1.0.0] — 2026-04-01

### Initial release

- `/siteasy` — 24 commands for design, UX, motion, performance, and site architecture
- `/seo` — 7 commands: audit, page, plan, technical, schema, content, geo
- `/inspect` — 3 commands: detect, preview, review
- Core reference documents across siteasy, seo and inspect, Playwright-based browser preview, deterministic anti-pattern detector
