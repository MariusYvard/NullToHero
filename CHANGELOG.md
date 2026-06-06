# Changelog

All notable changes to NullToHero are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning follows [Semantic Versioning](https://semver.org).

---

## [Unreleased]

<!-- Add your changes here before the next release -->

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
