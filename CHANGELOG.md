# Changelog

All notable changes to NullToHero are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning follows [Semantic Versioning](https://semver.org).

---

## [Unreleased]

<!-- Add your changes here before the next release -->

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

Design reference depth. Five new siteasy references (data visualization accessibility, an elevation and shadow system, a semantic color system, named style systems, landing page patterns) plus a modular type scale, adapted from external MIT sources recorded in THIRD-PARTY-NOTICES.md. One new command (charts); 58 commands, 91 references.

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
