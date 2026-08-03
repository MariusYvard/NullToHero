# Changelog

All notable changes to NullToHero are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning follows [Semantic Versioning](https://semver.org).

---

## [Unreleased]

<!-- Add your changes here before the next release -->

---

## [2.5.0] - 2026-08-02

The first audit by someone outside this repository. Fourteen findings, two of them in the
engine that decides verdicts, plus the seven laws that were written down and never
enforced. Everything below was measured before it was changed and re-measured after.

### Fixed

- **The contrast check passed text a browser paints at 1.82:1.** A custom property defined in ANY rule went into one page-wide map where the last definition won, so a rule that matched nothing still repainted the document: a paragraph rendering `#c0c0c0` on white came back PASS because an unused `.jamais-utilisee { --fg: #000 }` sat later in the sheet. Five releases (v1.33.0 to v1.37.0) hardened this engine against inventing FAILURES and never looked at the other direction, which is the worse one, because nobody re-checks a green verdict. Tokens are now scoped: `:root`/`html`/`body` stay the page baseline, a token on a matchable selector applies only along that element's ancestor chain (custom properties inherit, so the walk is required), and a token behind a selector this model cannot evaluate is recorded as a competing value and the sample is declined rather than answered.
- **The SSRF guard was written and called nowhere.** `lib/url-safety.mjs` is 232 lines of authority parsing, address canonicalisation and resolve-then-check whose only reference in the repo was a test asserting the file exists. Every fetch in the audit path was bare `fetch()` with `redirect: follow`, including three that follow URLs declared by the audited page itself (its stylesheets, its scripts, its video and model references). An audited page answering 302 to `169.254.169.254` handed the host's cloud credentials to the analyzer, which wrote them into the assets directory the sub-agents then read. All seven call sites now go through `safeFetch`, which revalidates every redirect hop, and the render path validates before handing anything to Chromium.
- **Five numeric laws carried two values each, so the verdict depended on which file was read.** `L-TOUCH-1` said 44x44 while its own anchor said 24x24 is the WCAG 2.5.8 floor; large text said 18px in one file and 24px elsewhere (WCAG defines it as 18pt, which is 24px); the measure law said 65-75ch while the visual agent said 45-75ch, and both run in one `/audit`; UI feedback was capped at 300ms in one place and 500ms in another; vertical spacing demanded multiples of 24px against the 4pt scale everywhere else.
- **A project's own conventions were never read on the improve path.** `improve.md` read `DESIGN.md` and `DIRECTION.md` and nothing else, while the references it loads push the other way: `bolder.md` says swap system fonts for distinctive ones, which a real charter can forbid outright. The Conventions gate now sits in `SKILL.md`, binding all 62 commands, and the charter beats the reference with the conflict reported rather than settled in silence.
- **A score of 100/100 "Excellent" while the half that judges taste had not run.** In `mode=checks`, `designQuality` is null and the headline still read 100. `overall` and `band` are withheld while any group is unscored, the note names which half is missing, and the floor stays under `deterministic.score` where `gate.mjs` reads it, so CI is unaffected.
- **Sixteen gates could stop and none could resume.** The Product gate forbade the only remaining move: "Never synthesize PRODUCT.md from the user's prompt alone", with the question tool unavailable, cannot be satisfied at all. The rule now lives once, next to the gates: ask first, and if no answer is obtainable, pick the most reasonable option, state it in one line, mark it `[ASSUMED]`, continue, and surface it again when presenting. `[ASSUMED]` is deliberately not `[TODO]`: the gate rejects the second and accepts the first. Actions that destroy or publish still wait.
- **`impeccable` ran unpinned**, so `detect.md` executed whatever the registry served that day. The repo is tested against 2.3.2; npm now serves 3.5.0 with different flags.
- **`css-architecture.md` taught logical properties using the side-stripe border the parent skill bans first in its Absolute bans.**
- **Nine statistics about the present world carried no source**, three years after the "Industry data" lesson of v1.38.0. Three were not just unsourced but wrong: AI-specific robots.txt directives are around 14% of measured domains and not 3-5% (Cloudflare, 2025), the 30-40% accessibility-automation figure conflated issues with success criteria (Deque measures 57.38% of issues), and the "December 2025 JS SEO guidance" attribution was fabricated, matching no Google document. The vestibular figures globalised a US-only measurement: 35.4% of US adults aged 40 and over, about 69 million Americans (Agrawal et al., 2009, NHANES 2001-2004).
- **Thirty-five dead links** shipped in the resource catalogue and were recommended to users mid-build. Each verdict was confirmed twice before removal.
- **Seventeen sub-agent and two skill descriptions stated what they route TO and never what they route AWAY from**, so with fifteen agents all describing themselves as auditors of a website the boundary lived only in the author's head. `check-routing --strict` now exits 0, where it had been failing.

### Added

- **Seven deterministic checks for laws that were declared and never enforced.** Of 26 canonical laws, 6 had a check behind them; a number nobody checks drifts, because nothing fails when it does, which is exactly how `L-TOUCH-1` came to contradict its own anchor. Now enforced from the stylesheet the analyzer already parses: `tap-target-size`, `tap-target-spacing`, `body-font-size`, `line-measure`, `ui-motion-duration`, `decorative-loop-budget`, `scrub-easing-linear`. Each judges ONLY what a rule explicitly declares and returns NOT_MEASURED otherwise, and declarations resolve through the token map, since `font-size: var(--font-size-base)` is the normal case here rather than the exotic one. Four false positives were found by running them against real sites and fixed rather than accepted: a 17ch hero title is not a bad measure (short measures are no longer judged at all, only over-wide ones), `a::after` is an underline and not a tap target, `min-width: 0` is a flex reset and not a zero-wide button, and a `.reveal` at 800ms is an entrance animation that `motion-design.md` explicitly sanctions.
- **`consent-required-tracker`**, which reads consent exposure from the served HTML. A page could score 100/100 while loading Google Analytics and the Meta Pixel before any choice was offered. Four verdicts, each stating its own limit: FAIL with no consent mechanism present, WARN when a consent platform ships but the tag still loads unconditionally (a CMP may hold it at runtime, which a static pass cannot see), PASS when tags carry the blocking type or a consent attribute, PASS when the only measurement can meet the exemption.
- **The consent exemption, stated from the source.** `privacy-consent.md` prescribed the whole GDPR posture and never mentioned that audience measurement can be exempt from consent, which is the cheapest answer available to a small site. Conditions now quoted from the CNIL (audience measurement only, anonymous statistics, publisher alone, no cross-referencing, no non-anonymous transmission, no cross-site tracking, 13 and 25 month lifespans, article 82), including what the exemption does NOT cover.
- Two eval fixtures, 71 in the set, each new check covered and routed in the remediation map.

### Changed

- **The resource catalogue became a licence ledger rather than a directory.** Of 1,000 distinct entries, 99 were named anywhere in the 1,180 KB corpus and 901 were reachable only by guessing the right search query. A directory of site names duplicates what the model already knows and rots on its own schedule; what it does not reliably know is whether an asset is CC0, needs attribution, or is free commercially, and that has legal consequences for the site being shipped. Now 183 entries, 33 categories, 173 KB down to 32 KB, zero dead, zero duplicate URLs. Moved entries are settled by one rule: an entry survives a redirect only when the destination is the same tool under a new name.
- The credit line on built sites is opt-in. It was added by default to the client's legal-notices page and the ship checklist verified its presence; a toolkit whose argument is verdicts you can recalculate cannot ship an unrequested promotional link.
- README: the deterministic check count said 33 while the engine emitted 42. It now says 50, which is the real number.

## [2.4.0] - 2026-07-31

Lessons from building and shipping the plugin's own site, folded back in. The site is now
the README's showcase, and the work of capturing it surfaced one place where the plugin
contradicted itself.

### Fixed

- **The plugin prescribed three different viewport units for the same job.** `parallax.md` sized its pinned track in `vh` (line 341) and its hero example in `svh` (line 464), while `inspect/references/review.md` prescribed `dvh`. Three files, three answers, no doctrine, and the disagreement is invisible on a desktop because `vh`, `svh` and `lvh` are all equal when there are no retractable browser bars. On a phone they are not: a full-bleed section sized in `svh` stops growing when the bar retracts and leaves a band of page background under it, and a `940vh` track with a `100svh` platter buys 1061 platter heights instead of the 940 that were authored, running every act short. The hero example is now `dvh` and the pinned pattern states the consistency rule.

### Added

- **`viewport-unit-consistency`**, a deterministic check. It reads height, min-height and max-height declarations only (a `vh` inside a `translate` is a different question) and warns when a stylesheet mixes the units that disagree on a phone, naming the samples. `dvh` alone or any single unit passes. New fixture `viewport-unit-mismatch.html`, 69 in the eval set.
- `L-VIEWPORT-1` (full-bleed sections are sized in `dvh`) and `L-VIEWPORT-2` (one viewport unit per scroll system), plus inspect rule 72 and its remediation route to `/siteasy adapt`.
- **Generic font families resolve per platform, so measuring one is not measuring the other.** `ui-serif` resolves to Georgia on Windows and to New York on iOS, and New York is wider: a line count taken through `canvas.measureText` in a desktop browser reported three lines where the phone rendered four. `responsive-design.md` now says to measure with the stack the target will resolve, or on the device, and to leave headroom in any height that depends on a generic family.
- **Content squeezed between two fixed obstacles.** A full-height section usually has something fixed at each end. Centring in the viewport puts the content behind both, and clearing only one end moves the defect to the other. Measure both and centre in what remains, and apply the offset at every place the content is positioned, or it jumps between states meant to look identical.
- **A sub-agent report is a lead, not a source** (`audit/references/full.md`). A sub-agent states findings with the same confidence whether it read the thing or inferred it, and confidence is not provenance. Verify before acting on any claim that would change a file, retract a published line or contradict the repo. Both failure directions have happened here: an agent asserting a defect in a line that was correct as written, and an agent blamed for an error that belonged to the supervisor who had fetched the wrong page.

### Changed

- The README's showcase section documents the seven build steps and what each produced, and links the live site from the nav, the body and the footer.

---

## [2.3.0] - 2026-07-27

Harvest of seven SEO and marketing repositories, checked against primary sources before
anything shipped. The through-line: the plugin measured what a site **is** (crawl, HTML,
contrast, schema, accessibility) and had no way to measure what a site **obtains**
(positions, clicks, citations). That gap is now closed, and a factual defect in the
crawler table is fixed.

### Fixed

- **The AI crawler table was missing the three tokens that decide whether an assistant can cite a site.** `Claude-SearchBot`, `Claude-User` and `Perplexity-User` appeared nowhere in the repository. A site that blocked `ClaudeBot` believing it only refused training was also losing Claude search citations, and `geo.md` could not say so. The table is rebuilt from operator documentation, with `Amazonbot`, `GoogleOther`, `OAI-AdsBot` and `Meta-ExternalAgent` added, a tier column, and a column recording whether each fetcher applies robots.txt at all. Two do not, by their operators' own documentation, so a robots.txt entry is not a control for them. `Claude-User` is the exception that honours it.
- Crawler reachability is now weighted rather than counted. Tier 1 carries 50 percent, tier 2 carries 25, absence of a blanket block 15, discovery files 10, and tier 3 carries none: blocking a training crawler is a licensing decision, not a visibility defect. The old `(allowed bots / 14) x 100` priced `CCBot` and `OAI-SearchBot` identically.

### Added

- **`/seo performance`**, the first command that reads real performance data. `skills/seo/scripts/gsc-analyze.mjs` ingests a Search Console CSV or JSON export (no OAuth, no Cloud project, no quota) and computes striking distance across two bands, cannibalisation, an **auto-calibrated CTR curve** built from the site's own rows rather than an untraceable market table, CTR gap, full-outer-join period comparison, decay with a volume floor, and a four-quadrant refresh matrix. `references/search-console.md` documents the window-alignment trap that silently biases every naive comparison.
- **`/seo migrate`**, a six-step migration protocol with a state freeze, a risk map, redirect chain and loop rules, a day-one rollback trigger, and T+1 / T+7 / T+30 diffs.
- **`ADVISORY`**, a fourth verdict state for signals that are measured but deliberately not scored, because the standard behind them is an IETF draft or an early-adoption feature. It is excluded from scoring exactly as `NOT_MEASURED` is. This is the door through which Content-Signal, RFC 8288 Link relations and Markdown negotiation enter without pricing sites against specs that may not ship.
- Eight AI-surface checks in `tools/audit/lib/ai-access.mjs`: per-bot robots.txt evaluation across six states (not the old binary), a differential fetch that catches an edge returning 403 to bots the robots.txt welcomes, page and header level `noai` directives, graded llms.txt validation on seven structural rules where a 403 is a misconfiguration and not an absence, Content-Signal parsing, discovery-file probing, Link-header service discovery surfaced only on API-first sites, and Markdown content negotiation.
- Deterministic content tooling, so the code scores prose and the model does not: `tools/content/score.mjs` (five weighted dimensions, sentence-rhythm measurement by standard deviation, a keyword-density calculation that counts words covered rather than occurrences over word count) and `skills/seo/scripts/scrub.mjs` (fifteen invisible codepoints, context-aware dash resolution across nine ordered rules, idempotent and self-testing).
- `skills/seo/scripts/parasite.mjs`, section-level site-reputation-abuse detection aggregated by first URL segment on the post-redirect URL, with a floor below which a section is not judged.
- `tools/audit/lib/url-safety.mjs`: SSRF guard with authority-trick rejection, address canonicalisation across decimal, hex and octal spellings, resolve-then-check on every DNS answer, and per-hop revalidation of redirect targets.
- Entity disambiguation as a first-rank GEO diagnosis, with the Wikipedia and Wikidata API calls that replace a web search prone to false negatives. `speakable` and a graded `sameAs` priority list added to `schema.md`.
- Conversion and copy references for `/siteasy`: offer diagnosis (value equation, offer anatomy, eight guarantee types, honest against fabricated scarcity with detectable code patterns), a fifteen-row objection inventory mapped to the page element that answers each, an advisory conversion rubric with brand-maturity adjustment, and a test-hypothesis catalogue. Awareness and market-sophistication scales added to `landing-patterns.md`; the seven-pass copy sweep and a scored lexical tell list added around `clarify.md`.
- A measurement protocol separating four latency layers, with the rule that a missing citation must never be read as weak content before crawler access confirms a 200 was served.
- Repository engineering: a context-budget guard and a routing guard in CI, a 49-case behavior corpus testing what the skills make the agent *say* (refusing rank guarantees, refusing to score without inputs, routing across the fuzzy command boundaries) under an evidence rule where a simulated case is explicitly non-validating, and validator checks 40 to 42 guarding crawler-registry consistency across its three homes, the ADVISORY wiring, and tool presence.

### Changed

- `/audit` now separates `status` (did it run) from `verdict` (does it ship), types missing evidence as `unknown` without renormalising weights around it, and **refuses to emit a number** for a dimension with fewer than half its inputs. A score built on air reads as a finding when it is an artefact.
- Eight canonical laws added (`L-CONTENT-1` to `4`, `L-GEO-1`, `L-GEO-2`, `L-DATA-1`, `L-DATA-2`).

### Not adopted

Deliberately left on the floor, with reasons in the harvest report: the untraceable GEO numbers present in four of the seven repositories (the 134-167 and 40-60 word passage bands, the citation multipliers), three mutually contradictory unsourced CTR-by-position curves, competing composite score rubrics, paid-API dependencies, editorial-bias instructions, and any framing of content work as detection evasion.

---

## [2.2.1] - 2026-07-19

### Fixed

- A repo-wide sweep for the truncated-description class (found five in v2.2.0's reviewed families) caught two more in files no reviewer had opened: `brand.md` ("The deliverable is the design itself - a.") and `wcag-2-2.md` ("motor impairments, and."). Both completed from their own body text. The class is now swept across all 119 references, not just the reviewed families.

---

## [2.2.0] - 2026-07-19

A content-level pass over the whole knowledge base: five parallel reviews read the references behind every command family (motion, refine and evaluate, project and build, the seo boundaries, the deterministic layer) looking for doctrine that overlaps, contradicts itself or has drifted. The conclusion that matters: no further command merges are justified. Every remaining command owns real doctrine; a clean plugin is not a smaller one, it is a bounded one. What follows closes every boundary defect the pass found.

### Fixed

- **The siteasy audit reference contradicted itself**: "a code-level audit, not a design critique" two paragraphs above the section that dispatches four design-dimension agents. The intro now describes the actual architecture and points to critique.md for the heuristic pass.
- **`/siteasy improve` could not reach `harden`**: no symptom row routed to it, so slow pages, raw errors and untranslated strings dead-ended. Row 16 added (polish moves to 17), and the dispatcher's own frontmatter now lists all 17 axes.
- **The evaluators could not recommend `mobile` or `charts`**: both "Suggested command" menus (critique and audit, two spots each) omitted them while improve routes to both.
- **content.md restated ~26 lines of geo doctrine** (AI Mode, per-engine strategy, GEO signals). Replaced with the dimension's scoring hook plus a pointer: geo.md owns the discipline.
- **Five reference descriptions ended mid-sentence** (animation-engineering "Based on Emil.", critique "anchors them to.", design-tokens "build it right once, and.", ux-research "your aesthetic.", journey-mapping "Use this reference."). All completed.
- **teach.md claimed to write two files**; it writes PRODUCT.md and delegates DESIGN.md to /siteasy document (its own Step 5), and it listed "layout" in a DESIGN.md that document.md forbids from having a Layout section.
- **docs/ARCHITECTURE.md still said 14 sub-agents** (four spots) and drew the design group with 4 agents instead of 6.
- **motion-design.md was cross-referenced by four files but bundled by none**; it now ships in the `/siteasy animate` bundle, and both duration tables cite L-MOTION-1.
- Boundary notes added where checklists brush against another command's doctrine: polish defers to harden.md and optimize.md, quieter's simplification step to distill.md, bolder's motion accents to animate and delight, overdrive's springs and View Transitions to animation-engineering.md, extract's system audit to design-tokens.md, technical.md's Core Web Vitals section names images.md and performance.md as the deep dives.
- Consistency: `express` stage list said "plan" one release after the rename to `shape`; seo's argument-hint and quick reference omitted `indexnow`; audit's hint omitted `learnings` and offered `report` a URL it does not take; inspect `review` takes `[target]`, not `[file]`; the seo action-plan output standard is now wired from the seo SKILL instead of claiming a scope nothing enforced; plan.md links cluster.

### Added

- **Check 39**: every command appears in its skill's argument-hint (this is what caught concept, indexnow and learnings), every remediation-map route points at a live command, and ARCHITECTURE.md's agent-count claims must match the agents directory.

---

## [2.1.0] - 2026-07-19

Consolidation pass over the command set, driven by the Phase 1 connectivity data (internal call counts, remediation routes, journey usage). Three commands folded into the command that already owned their ground, one renamed to kill the plugin's last name collision. Nothing deleted: every reference file stays, every retired name routes through the alias table.

### Changed

- **`/siteasy journey` folded into `/siteasy research`.** It was a pure subset: its only reference (journey-mapping.md) was already loaded by research, whose description already promised journey synthesis. Research now states it generates the artifacts (empathy maps, journey maps, service blueprints).
- **`/siteasy handoff` folded into `/siteasy extract`.** The least-connected command in the plugin (zero internal calls, zero remediation routes, zero journeys). Extract now names the handoff deliverable and loads handoff.md alongside its own reference.
- **`/seo sxo` folded into `/seo page`.** One internal call, no routes; intent-page alignment is single-page analysis. Page loads sxo.md for the search-experience dimension. The seo command floor moves 19 to 18 accordingly.
- **`/siteasy plan` renamed `/siteasy shape`**, closing the last name collision (`/siteasy plan` vs `/seo plan`, different meanings). Its reference was already called shape.md. Nine call sites migrated (craft, the critique and audit command menus, journey-express, the claims agent, the README ladder).
- 60 commands (siteasy 33, seo 18, inspect 3, audit 6); four alias rows added to `tools/data/intents.csv`, all guarded by check 38.

---

## [2.0.1] - 2026-07-19

A line-by-line read of the README against the repository, hunting the hand-written prose the checks do not guard. Four more drifts found and closed.

### Fixed

- **"What is inside" claimed 110 reference docs against an actual 119.** Check 18 verified only the first "N reference docs" occurrence (the headline), so the second one slept through releases. The check now verifies every occurrence.
- The `express` row still ended its stage list with "launch", one release after that stage and command became `harden`.
- The `overhaul` row described the pre-2.0.0 pipeline ("triage, execute"); it now names its actual stages (baseline, fix by remediation route, before/after compare, ship).
- The `detect` row promised the scan "finds focus rings"; it finds their absence.

### Changed

- The project-setup block now names all four project files: the two the user creates (`PRODUCT.md`, `DESIGN.md`) and the two that appear while working (`DIRECTION.md` from `/siteasy concept`, `LOG.md` from the journeys).

---

## [2.0.0] - 2026-07-18

v1.41.0 re-issued under the number it deserved. A command renamed (`launch` to `harden`), a command retired into an alias (the seo report formatter), four table rows folded into scopes and the whole surface reorganized around ten doors is a major change of the published surface, even though every old invocation still routes through the alias table. Same content as v1.41.0 plus the fixes below; both tags point at the same day.

### Fixed

- **The hand-maintained knowledge-base list in the README had drifted silently**: `sourcing-external-code` was never added, `indexnow` was missed at v1.40.0, and the deleted seo `report` reference was still listed. The four lists are now regenerated from the files on disk (siteasy 80, seo 23, inspect 4, audit 6; total still 119 with the six plan assets).
- The four-skills grid now shows the door commands for siteasy (`express`, `build`, `improve`) instead of a pre-doors trio.

---

## [1.41.0] - 2026-07-18

The catalog problem, addressed at the surface: 66 commands were well-connected underneath (graph, remediation map, shared state) and undiscoverable on top. A newcomer had no obvious way in, "audit" lived in three skills, and the "from zero knowledge" promise depended on already knowing the names. This release reshapes the surface around ten intent doors without deleting or breaking anything.

### Added

- **Ten doors.** The README "Pick your goal" table is now the canonical surface: express, build, improve, /audit, fix, overhaul, ship, /seo, report, preview. Each SKILL.md opens with a short "Start here" section routing the same way; everything else remains a documented specialist command in the per-skill tables.
- **`/siteasy improve`** (`improve.md`): the door for every "make it better" request that does not name an axis. A closed symptom table (16 rows, first match wins) dispatches to exactly one of the refine and enhance passes; three or more matching rows means it is a rework and routes to overhaul. One axis per pass, no blending.
- **`/siteasy fix`** (`fix.md`): the door for "the audit found problems, now make them go away". Reads `SITE-AUDIT.json` (or the action plan), groups findings by their `fixWith` remediation route, runs the mapped commands critical-first in per-command batches, verifies with a same-settings `/audit checks` re-run. Extracted from journey-overhaul's triage and execute stages; the journey now delegates to it, so the doctrine lives in one place and is callable standalone.
- **`tools/data/intents.csv`**: the versioned intent-and-alias registry. Current rows map door phrases to canonical commands; alias rows keep retired names accepted (`/siteasy launch` routes to `harden`, the retired seo report name routes to `/audit report`). Policy: any future rename adds an alias row, the old name stays accepted for at least two releases, and the deprecation is recorded here and in the CHANGELOG.
- **Check 38**: every intents.csv route points at a live command; aliases never mask a live command; retired names may not survive as canonical usage anywhere in skills/, docs/, agents/, the README or the remediation map; every README door resolves; and the marketplace description's command and sub-agent counts must match reality (they had drifted to "57 commands" and "14 sub-agents" against an actual 66 and 15).

### Changed

- **`/siteasy launch` is now `/siteasy harden`.** The old name collided with the ship journey and the express "Launch" stage while the command itself was production hardening. 13 remediation routes, both journeys, six references and the README moved to the new name; the old one remains accepted via the alias table.
- **The two report formatters are one.** `/audit report` now owns both skeletons (unified and SEO-scope) plus the PDF mechanics that previously lived in the seo reference it delegated to; `skills/seo/references/report.md` is deleted and the retired `/seo` sub-command routes to `/audit report`. 63 commands, 119 references.
- **`/audit` group runs are scopes of `full`**, not four separate table rows: `full [url] [seo|defects|design|quick]`. The legacy first-token form (`/audit seo [url]`) still works. `checks`, `verify`, `compare`, `learnings` and `report` stay as commands.
- **Stale counts in the audit skill corrected**: the frontmatter and the closing prose claimed 13 sub-agents (actual 15), the prose claimed nine commands, and the relationship table and report appendix listed 4 design agents instead of 6 (claims and memorability were missing).

---

## [1.40.0] - 2026-07-18

### Added

- IndexNow made operative: the references already told sites to ping IndexNow (technical section 9, sitemap step 3, ship-checklist) without providing the how. New `/seo indexnow` command with `indexnow.md` (participants Bing/Yandex/Naver/Seznam/Yep and the explicit Google abstention, key-file setup, single GET vs batch POST up to 10,000 URLs, response-code readings, when to ping and when not to, the GEO angle: Bing's index feeds ChatGPT search and Copilot) and `skills/seo/scripts/indexnow.mjs` (key generation, submit single/batch with dry-run, sitemap mode extracting and submitting `<loc>` entries). Existing mentions in technical.md, sitemap.md, geo.md and the ship checklist now link to the reference; the journey-ship hardening stage pings changed URLs on content and brand sites. One resources.csv row (open protocol).

---

## [1.39.0] - 2026-07-16

v1.38.0 shipped after reading **12 of the academy's 107 lessons** and phrased the verdict as though it covered the site. That is the v1.36.0 bug ("the home page vouched for the site") committed in prose, by the person who had just fixed it in code. Read all 106 lessons plus the index. The v1.38.0 conclusion held, but it had not been earned, and two things were missed.

### Added

- **`geo.md`: connect Search Console instead of inferring.** Everything this skill computes from HTML is inference from outside; GSC is where the real queries, impressions and positions are, and read-only MCP connectors for GSC and GA4 mount into Claude over Google OAuth with no vendor account. If one is connected, its numbers outrank this skill's, and the report says which was used. Missed in v1.38.0 because the chapter was called "Claude MCP" and never opened: the single most relevant thing on the site to a Claude plugin.
- Two cautions from actually inspecting one such connector: it serves **three backends down one endpoint** (your OAuth'd GSC data, their own crawler's audit, and rank-tracker figures like "AI Overview references" that cannot come from GSC and whose source is undisclosed), so know which one answered. And Google's warning that no third-party tool reads its internal systems applies to the connector too: a tool reporting "AI Overview references" is inferring, exactly as we are.
- **`backlinks.md`: the journalist-query list, verified July 2026.** Adds **Source of Sources** (free, no paid tier, the practitioner default) and **Featured** (freemium), and states Qwoted's free-tier throttle: 2 pitches/month behind a 2-hour delay, so paying sources see every query first. Recommending it without that sets someone up to lose every race. **Connectively is dead** (Cision, 9 Dec 2024) and is still recommended across the web.
- Recorded the HARO discontinuity, because it is a trap for anyone reading advice written in the gap: Cision killed HARO on 9 Dec 2024, then Featured.com bought the brand in Apr 2025 and relaunched the free query emails. Advice from that window says HARO is dead. It is not.

### Notes

- **Nearly broke a correct line by believing a subagent.** One reported HARO and Connectively both dead and "the single most concrete factual error" on the vendor's site. Verification: HARO is alive under new ownership, so the vendor was right and the agent was wrong, and `backlinks.md`'s existing HARO/SourceBottle/Qwoted line was already correct. Earlier the same day the opposite happened: an agent was accused of conflating two Google pages and turned out right, the wrong URL having been fetched. Two agents, two confident claims, two different failure directions, both caught only by checking. A subagent's report is a lead, not a source.
- The remaining 94 lessons confirmed the v1.38.0 read: 45 of them under 250 words with **5 citations across all of them**, no procedure behind any "how-to", and an internal contradiction (content clusters are 3-4 pages in the glossary and 5-7 in the 100-day plan). Nothing importable.
- Two errors in their corpus worth knowing rather than absorbing: their `dofollow-vs-nofollow` table states flatly that nofollow passes no ranking credit, contradicting its own FAQ below it and Google's 2019 hint change; and their link-building chapter sells an automated reciprocal link-exchange network inside a lesson, which is the pattern Google's link spam policy names. `backlinks.md` already warns against exactly this (L85), which is the check that mattered.
- Mirror checks run against our own references, all clean: `technical.md` states all three Core Web Vitals thresholds correctly (2.5s / 200ms / 0.1); their CWV page cites web.dev but gives only LCP. `competitor-pages.md` already records the FAQ rich-result removal, with a **more current date than the subagent had** (7 May 2026, all sites).

---

## [1.38.0] - 2026-07-16

Went to mine a vendor's SEO academy for material. Found nothing worth importing: the skill already named 9 AI crawler user-agents to its 2, and its 107 lessons run 150-250 words each with not one primary source cited across the flagship chapter. But holding it next to `geo.md` was the point, because `geo.md` had the same disease.

### Fixed

- **`geo.md`'s statistics table cited "Industry data". Of its six load-bearing rows, zero were stated accurately.** On a skill whose pitch is verdicts you can recompute, a stats table sourced to a phrase that sounds like a consensus is the one lie that costs the argument. Every "Industry data" label turned out to be concealing a single traceable vendor study, so the label was hiding a source, not standing in for a missing one:
  - **AI Overviews coverage "50%+ of all queries"** was a keyword-panel figure sold as a query figure. Real measurements span **9.5%–60%** and the spread is not a dispute, it is four different denominators: keyword databases over-weight the informational long-tail that triggers AIOs, real human query streams do not. Pew is the only non-vendor sample of actual searches (68,879 searches, 900 US adults, Mar 2025) and gives **18%**. Now a range with every sample named. Also noted: Semrush's own series is non-monotonic (24.6% Jul 2025 → 15.7% Nov), so any "growing to X" framing is unsupported by the only long time series that exists.
  - **"+527%, SparkToro"** — the figure is real, the attribution was wrong. It is **Previsible**, 19 GA4 properties, off a base of 17,076 sessions.
  - **"4.4x conversion"** — Semrush said 4.4x as *valuable*, modelled from conversion rate, in ~500 digital-marketing topics, which is Semrush's own vertical.
  - **"Ahrefs Dec 2025"** — May 2025, seven months off. The table also dropped the caveat Ahrefs leads with: correlation only, all factors moderate-to-weak. Big brands get both mentions and citations; that confounder is the whole story.
  - **"11% of domains cited by both ChatGPT and Google AIO"** — wrong engines. Profound measured ChatGPT ∩ **Perplexity**. ChatGPT ∩ AIO is not published by anyone.
- **The "40-60 word answer" rule had no primary source, and Google now contradicts its premise.** It is a descriptive artifact of vendor snippet-scrapes (that band is where Google *truncates*) reversed into a prescription. Google publishes no minimum length for featured snippets, and its generative-AI guide states there is **no ideal page length** and no requirement to chunk. Cut. A "120-180 words per block" optimum credited to unnamed "citation-extraction studies" went with it: a number nobody can trace is worse than no number, because it survives review by looking precise.

### Added

- **A "What Google says you do NOT need to do" section in `geo.md`**, from the primary source every GEO vendor talks around: Google Search Central's *Mythbusting generative AI search* ([ai-optimization-guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), updated 2026-07-10). Google states it **ignores `llms.txt`** ("neither harm nor help"), requires no chunking, requires no special schema, says chasing mentions "isn't as helpful as it might seem", and that GEO/AEO is "still SEO". Scoped honestly: this is Google speaking about Google, and it does not bind ChatGPT, Perplexity or Claude. Where the skill still recommends `llms.txt` or passage shaping, that advice is now labelled as scoped to the engines that have published no such guidance, rather than sold as universal.
- Google's warning that no third-party tool reads its internal ranking or AI systems, **applied to this plugin**: a GEO score is a heuristic we defined, never a reading of Google's systems.
- Two real requirements the industry misses: Search Console **opt-in is a hard eligibility gate** for generative AI features, and the **Generative AI performance report** is the only first-party measurement that exists. Everything else, this skill included, is inference from outside.
- Query fan-out and RAG grounding documented from Google's own description, with the trap named: do not build a page per fan-out query, Google calls that scaled content abuse.
- Agentic experiences flagged: browser agents read the **accessibility tree**, so the a11y work `/inspect` already enforces is turning into machine-readability work. Semantic HTML stops being only an ethical argument.

---

## [1.37.0] - 2026-07-15

### Fixed

- **The static contrast path invented failures, the last place that fault survived.** Render-free, `contrast-ratio` reported **4 failures, worst 1.06:1** on a page the rendered pass measures at **0**. Same mistake as the two cleaned out of the rendered path in v1.34.0, still alive here because nobody had run this path against a site that re-themes. Three causes, each now declined instead of guessed at:
  - **Light-on-light cascade artifacts.** A themed page states `--ink` light and `--paper` dark, then a light block re-points both under a selector this model does not evaluate. Catch one override and miss the other and you resolve light ink against light paper: 1.06:1 on a wordmark a viewer reads at 16:1. A `darkOnDark` guard already existed for the mirror case; its twin was missing for no reason but oversight. Nobody authors white on white on purpose, and a half-modelled cascade produces it constantly.
  - **`mix-blend-mode`.** The cascade's `color` is the source of a blend, not the paint, so a ratio from it is a number no pixel holds. The rendered path learned this in v1.35.0; this one had not.
  - **Declared exemptions were ignored.** `data-contrast-exempt` is a fact in the markup and readable without a browser, but only the rendered path honoured it, so the same page failed or passed depending on which flag you ran. Only one of those answers respected the author. A malformed exemption still excuses nothing here either: the rule is identical on both paths or it is not a rule.
- `value.notJudged` reports all three, and `NOT_MEASURED` now carries them too. A page whose only text was skipped used to report "nothing measured" with no reason, which is the same silence this detector keeps being cleaned of: "could not read this" must never look like "nothing to read".
- Static failures now name the colours, the tag and the text (`value.worstSamples`, and the detail says `#aaaaaa on #ffffff`). This path is an estimate, so it owes the reader the means to check it.

### Notes

- The 68 eval fixtures did not drift, and that is the finding rather than the reassurance: none of them covered a themed page, a blend mode or an exemption, which is exactly how the fault lived here this long. Seven unit tests now pin each case, including that a real static failure (mid-grey on white, no cascade excuse) still fails, so the guards cannot quietly grow into an amnesty.

---

## [1.36.0] - 2026-07-15

### Added

- **The document-level checks run on every page.** Title, meta description, heading order, canonical, html lang, viewport, img dimensions, DOM nesting, ARIA, charset, head meta, SRI, robots path and the rest now merge to the worst verdict across every discovered page, with `value.perPage` listing each URL and the detail naming the ones that are not clean. `runChecks` answers "is THIS page ok"; the audit's claim was about a site, and asking only the first question while phrasing the answer as the second is how a passing home page vouched for routes nobody opened. Found immediately on this plugin's own site: `/journey` shipped a 187-character meta description (over the ~160 truncation point) while `/` and `/commands` passed, so every previous audit reported PASS.
- No `--render` needed: "does every page have a title" is a question raw HTML answers, and gating it on a browser was an accident of where the code sat. Page discovery moved out of the render path and is shared by both, so the static checks and the contrast sweep can never disagree about what "the site" means.
- Aggregation is a whitelist, never a default. A new check aggregates only once someone has decided what "worst across pages" means for it. Site-level checks stay on the entry for reasons, not laziness: `contrast-ratio` already sweeps every page itself, security headers and the HTTPS/host probes are properties of the **origin**, and the reduced-motion/scrollbar/frame-loop checks read the **shared bundles**. Re-asking those per page would turn one fact into N copies of itself, which is the units error this release exists to avoid.

### Fixed

- **`security-headers` could not tell an XSS hole from a font.** It matched `'unsafe-inline'` against the whole CSP string, so `script-src 'unsafe-inline'` (an injected inline script executes) and `style-src 'unsafe-inline'` (inline `style=""` attributes, which every runtime animation library writes on every frame) produced one identical WARN. That told sites to fix something they cannot fix, next to something they should, and gave them one finding for the pair. Now per directive: `script-src` is a weakness, `style-src` is advisory with the `style-src-attr` split named, `default-src` is honoured as the fallback when `script-src` is absent, and `'unsafe-inline'` sitting next to a hash or nonce is not reported as a hole at all, because browsers ignore it there. A finding a reader cannot act on differently should not be reported the same.

---

## [1.35.0] - 2026-07-15

### Added

- **`--render` measures the site, not one corner of it.** It rendered a single page, at scroll 0, at 375px wide, and reported a verdict phrased as though it covered the site. Three axes, and each default is a defect that shipped straight past the old pass:
  - **Pages.** `sitemap.xml` if there is one (the list a site declares about itself beats guessing), else same-origin links from the entry page, capped at 10. `/journey` shipped a CTA at 3.68:1 while the audited home page passed.
  - **Scroll.** 5 stops per page. A nav button read 5.86:1 over the first act and 3.68:1 once the dark page slid under it, and only one of those states existed at scroll 0. `scrollTo` is a request, not a fact, so each stop reads back the real `window.scrollY` and records that: a smooth-scroll library that animates or ignores the jump gets measured where the page actually went, and stops that land on the same pixel collapse instead of being counted twice.
  - **Viewports.** 375 and 1280. The desktop nav links are `display:none` at 375, so nothing had ever measured them: they were 2.69:1.
  - Tunable: `--pages N`, `--scroll N`, `--viewports mobile,desktop`, `--page-urls a,b,c`. Proven on a fixture carrying one defect per axis: the old settings report PASS with 0 failures, the new default reports FAIL with 4.
- **`value.coverage` on `contrast-ratio`**, plus `target.pagesFetched` and `target.measured` in SITE-AUDIT.json. "Contrast passes" and "contrast passes across 3 pages, 30 scroll states, mobile and desktop" are different claims and only one of them is falsifiable. `pagesFetched` had been hardcoded to `1` while the schema advertised the field.
- **`value.worstSamples`**: page, viewport, scrollY and text for each failure. Sweeping is worthless if the report cannot say which state to look at, since that is the half a reader has to reproduce.

### Fixed

- **Ratios were fabricated for text under `mix-blend-mode`.** `getComputedStyle` returns the SOURCE colour; under `difference` what lands on screen is `|backdrop - source|`. A caption computing as 3.47:1 was painting at 3.88:1. Both fail, so the verdict survived on luck. Blend the other way and we would fail readable text with a number no pixel ever held, which is the exact sin this detector was cleaned of in v1.34.0. Blended text is now reported unmeasurable and named, because implementing 16 blend modes against a backdrop we already only estimate buys less than admitting we cannot see.
- **`unmeasured` counted attempts, not elements**, so it read 490 against 1 failure: 30 scroll states re-drop the same offscreen paragraph 30 times. Two numbers in different units side by side is the same units error the sample dedupe exists to prevent, and it read as "the audit is blind" when the truth was "the audit looked 30 times". Now: distinct elements that no state ever measured, with reasons. 490 became 10.

### Changed

- Samples are deduped per element per page, keeping the **worst** state. Without it, sweeping ten states turns one defect into ten and the failure count grows with how hard you looked, which would punish the thoroughness this release adds. Worst is `ratio/threshold`, not raw ratio: responsive type moves the threshold, so 3.9:1 is a pass as large desktop text and a failure as normal mobile text.
- Static checks (title, meta description, heading order, canonical, robots) still read the entry page only. They are per-page questions and aggregating them is a different job; `pagesFetched` states the difference rather than hiding it.

---

## [1.34.0] - 2026-07-15

### Fixed

- **The contrast detector invented failures.** `contrast-ratio` reported 14 samples below AA on the plugin's own site. Six were not real. Both causes were the same mistake in different clothes: asking the DOM a question only the pixels can answer.
  - **Backdrop resolved by ancestry, not by paint.** The background walk climbed `parentElement`, which answers "who is my ancestor", not "what is painted under me". Those diverge the moment a sibling layer paints below: a fixed nav over a full-bleed hero resolved to `<body>`, so dark-on-light was measured as dark-on-dark and three wordmark spans were reported at **1.11:1** when a viewer sees **16.27:1**. Now the provenance decides. If the element or an ancestor paints its own opaque background, that is the backdrop by construction (a red button is red wherever it sits) and the DOM answer stands. If the walk falls through to the root, nothing painted in between and the answer was a guess, so it is re-resolved against real screenshot pixels: the modal colour inside the element's box is what sits behind the glyphs. Offscreen, or no colour holding a majority, means unmeasurable, and it is dropped and counted rather than guessed.
  - **Elements that are never painted were counted.** `getComputedStyle` does not inherit `display:none`: a child of a hidden parent reports its own specified display, so the visibility filter waved through whole subtrees the browser never lays out. A responsive nav's desktop links were "measured" at 375px and failed. Zero-area boxes are now skipped: no box, no pixels, no reader.
- `value.unmeasured` on `contrast-ratio` reports samples whose backdrop could not be confirmed. A PASS over part of a page is not a clean page, and the two must not look alike.
- The README version badge had read **1.21.0** since v1.21.0, thirteen releases stale. It was the one version site the validator did not check, so the validator now checks it: the README carries two versions and verifying only one of them is how the other rots quietly for a year.

### Added

- **Declared contrast exemptions.** `data-contrast-exempt` plus `data-contrast-exempt-reason` let an author state that a violation is deliberate: a page depicting a defect, ghost text that is texture rather than information. The audit excludes them from the failure count and reports them in `value.exempt`, never folded in and never omitted. Codes are closed (`staging`, `decorative-ghost`, `disabled`, `logotype`, `incidental`); an unknown code or a missing reason excuses nothing and its sample stays in the failure count. **Exempt is not conformant**: WCAG 1.4.3 grants three exceptions and "it is a demonstration" is not one, so `staging` and `decorative-ghost` leave the page non-conformant at those points, by the author's choice, said out loud. An audit you can drive to zero by annotation is a machine for producing clean reports on dirty pages.
- New check `contrast-exempt-undeclared`: an exemption must carry a valid code and a written reason. The price of an exemption is stating the argument in the diff, where review sees it. Static, so it works on a page that never booted.
- Ordering matters and was nearly got backwards: the exemption shipped **after** the detector fixes, because six of those fourteen failures were bugs and an exemption offered first is the tool that buries them.
- Both directions of an accent colour, in `color-and-contrast.md`. A token read AS text and a token sitting UNDER white pull opposite ways, and verifying one while shipping both is how a palette that "passes AA" ships a CTA that does not. Sweeping `oklch(L 0.2 29)` on a near-black surface: text needs L >= 61%, white-on-it needs L <= 59%, and at 60% both fail. No single value exists, so the palette needs two. Arithmetic, not taste. Watch the hover too: one that brightens under white text is less readable than the resting state.

### Changed

- **`siteasy` and `inspect` can reach the web.** Both build and inspect interfaces, and neither had `WebFetch`: the skills that most need to read a component's documentation were the two that structurally could not. `siteasy` also gains `Bash(npx shadcn *)`, without which `component-recipes.md` documented an install command the skill was not allowed to run.
- **Freefrontend was filed as a screenshot gallery.** It sat under `brand/design-inspiration` marked `gallery, for reference only`, while its own notes said "coded starting points" and "free with source", and a bare search for it returned nothing because the search defaults to the `style` domain. It is now `build/code-examples` with its four sections (CSS 282, HTML 36, JavaScript 218, Tailwind 78, Bootstrap 65), reachable mid-build.
- New `sourcing-external-code.md`: opening the source is the job, but provenance decides what you may do with what you read. **Registry** (Magic UI, MIT, published in order to be installed): install it, then own it, and every law applies to it from that second, because it is site code now. **Reference** (Freefrontend, CodePen: other people's pens, licences per author and often unstated): read the technique, close the tab, write your own. That is the standard the skill already held for photos and fonts; code is not the one asset class where provenance stops mattering. The re-authored version is usually better anyway, since a pen carries no tokens, no reduced-motion guard and no keyboard path.
- `resource-recommendations.md` and `fetch-asset.md` said "recommend the site to open" and "rather than scraping it". True of files, which commit as-is. Not true of code, which you can read and re-implement. "Do not scrape" no longer reads as "do not look".

---

## [1.33.1] - 2026-07-15

### Fixed

- `homepage` pointed at the author's CV. The plugin has a site now: https://nulltohero.netlify.app/ — built with the plugin, and the live proof of the OKLCH fix below. The author `url` stays the CV, which is what that field is for.

### Added

- Mixing two faces in one lockup, in `typography.md`. Every instinct here is wrong and the errors all look like each other. `align-items: baseline` aligns the baselines the FONTS declare, so the typographically correct alignment is routinely the visually wrong one — and nudging the symptom buries a structural error under a second wrong number. Match cap height (measured, not font-size: a display face's caps ran 25% taller at the same size). Centre on painted ink **including shadows** (an extrusion hanging below the baseline is ink the reader sees; excluding it measures the wrong object). Fit letters on real side bearings (two faces butted together were 9.6px overlapped on one side and 9.3px apart on the other — a 19px swing, obvious as a symptom, invisible as a cause). Two things stay optical and only two: size when an effect adds mass no cap height accounts for, and kerning across a round-to-flat pair. Measurement settles geometry, not perception.

### Verified

- The v1.33.0 contrast fix, on a live all-OKLCH site. `analyze.mjs https://nulltohero.netlify.app/` now resolves **59 text samples with zero undecodable colours**, and returns a real FAIL (4/59 below AA, worst 1.06:1). Before v1.33.0 the same page produced zero samples and NOT_MEASURED: the audit could not see a single colour on a site built to the plugin's own token doctrine.

---

## [1.33.0] - 2026-07-15

Dogfooding release: everything here came from building a 7-act scrollytelling hero with the plugin, and every item is something the plugin either could not see, did not say, or said without the diagnostic that makes it checkable.

### Fixed

- **The contrast engine could not read the colour spaces the plugin prescribes.** `parseColor` handled named/hex/rgb only, so `oklch()` returned null — including `oklch(0.15 0.01 270)`, which is inspect-rules.csv rule 19's own "good" example, and the format `design-tokens.md` recommends throughout. `pickColor` was the upstream half: its regex lacked the modern functions, so `background: oklch(...)` fell through to the bare-word branch and returned the string `"oklch"`, the background resolved as unknown, and every text sample on the page was dropped before it reached the parser. A site that followed our own advice was reported NOT_MEASURED: no false pass, but no measurement either. `contrast.mjs` now parses `oklch()`, `oklab()`, `lch()`, `lab()` (Ottosson OKLab and D50 CIE Lab, Bradford-adapted) and `hsl()`/`hsla()`, pure stdlib, no dependencies; unsupported spaces still return null rather than a guess. Verified: an all-OKLCH page now FAILS on a 1.49:1 grey it previously did not measure at all.
- **Undecodable colours were dropped silently.** `checks.mjs` did `if (r) samples.push(...)`, so a ratio measured over 2 of 12 colours produced the same bare PASS as one measured over 12 of 12. Colours we cannot decode are now tracked and surfaced on every verdict, named, with an explicit "this verdict does not cover them". A deterministic detector must not let "could not read this" look identical to "this is fine".
- 25 unit tests for the parser, anchored on values with known-exact answers (the sRGB primaries through every space; `oklch(62.8% 0.258 29.23)` is CSS Color 4's own red sample) rather than on whatever the implementation happens to emit.

### Added

- Rules 69-71 (68 → 71). **69** Layout/critical: `opacity: 0` does not stop pointer events, so a faded full-bleed overlay silently swallows every click beneath it — nothing looks wrong, so it gets found by users rather than by review. **70** Motion/important: never reuse a time-based curve on a scrubbed tween; L-MOTION-3 already required linear, what was missing is the diagnostic — an expo-out tween is ~90% complete at the **midpoint** of its scroll window, so it snaps shut then waits while the reader is still scrolling. Sample any scrub at 50% of its range and check the visual sits near 50%. **71** Motion/medium: a hand keeps its own clock; scrubbing handwriting ties the pen's speed to the wheel.
- Scrollytelling doctrine in `parallax.md`, carried into the two artifacts that gate work (the Match-and-refuse list and the Audit Checklist) and into `siteasy-agent-motion`, not left as prose: beats are **covered, not crossfaded** (a fade is the default gesture, so the same fade on every boundary is the loudest signal that nobody chose any of them, and readers name it long before an audit does); beats get **weights, not equal segments** (a beat lasts as long as it takes to read, and a typing terminal does not take as long as a blank sheet).
- Scroll-linked verification doctrine in `preview.md`: a screenshot is a claim about a moment, and on a scroll-driven page the default moment is the emptiest one. Everything scroll-linked sits at progress 0 until something scrolls; a hidden page runs no `requestAnimationFrame` at all, so scroll position moves while animation progress stays frozen and the DOM disagrees with the pixels; verify animated state from the DOM, never from the picture. `fetch.mjs` now asserts `visibilityState` before trusting computed measurements.
- Font licensing in `typography.md`: read the licence in the zip, not the badge on the site. "Free for personal use" faces routinely require a licence for **promotional** use, which covers every marketing page we build, including free and open-source ones.
- Display-face subsetting in `resource-recipes.md`: the advice existed without a command or a number. Both added — `pyftsubset --text="..." --flavor=woff2`, measured at 122 KB TTF → 2.6 KB woff2 (46x), cheaper than the DNS lookup a font CDN would have cost.
- Stack gotchas: Tailwind `@theme inline` compiles utilities to the raw var name, so overriding `--color-*` does nothing, silently; re-theming needs an explicit colour class because inheritance carries the computed colour past the override; motion cannot animate SVG geometry attributes (use `clip-path`); `pathLength: 0` with a round cap paints a dot; a sticky header eats the top of a full-bleed hero and blurs the body instead of the hero.

---

## [1.32.0] - 2026-07-12

### Added

- Canonical laws registry: `tools/data/laws.csv` (16 numeric laws with stable ids: L-MOTION-*, L-TOUCH-*, L-MEDIA-*, L-TYPE-*, L-CONTRAST-1, L-PERF-*, L-WEBGL-*), a Numeric laws section in the siteasy SKILL, citations across the references, and validate check 37 (well-formed registry, unique ids, every law cited somewhere in the skills).
- Project working memory: `LOG.md` joins the shared state (append-only entries per command: decisions, artifacts, open items); journeys checkpoint to it and resume from the last green stage; `/audit full` appends its score, report path and top fixWith commands.
- Agent handoffs and reconciliation: all 15 sub-agents may emit `Handoff -> <agent>` lines instead of scoring outside their dimension; the orchestrator routes them, deduplicates by root cause (one defect counted once) and records verdict conflicts in the report appendix.
- Direction-constrained generation: `design_system.py --direction` reads DIRECTION.md/PRODUCT.md, biases the search toward the declared register, prints the constraints and flags recommendations colliding with declared anti-references.
- Learnings loop: audits capture false positives, uncovered patterns and threshold drift as structured `LEARNINGS.md` candidates (never applied mid-audit); the new `/audit learnings` command reviews them into rules, gates, laws or fixtures with the eval discipline.
- Guaranteed-play video: `/siteasy video` with `video.md` (decorative vs interactive classification, canvas + WASM decoder doctrine, fallback chain, honest tradeoffs) and `scripts/video-guardplay.mjs` (audit mode; generate mode: ffmpeg MPEG1-TS for JSMpeg by default, VP9 option, poster + native fallback clip + drop-in component with IntersectionObserver pause, reduced-motion poster, zero CLS; fetches the MIT JSMpeg decoder into the target project once). Rules 65-68 (modern formats with fallback, lazy-load below the fold, VideoObject + video sitemap, guaranteed decorative playback), remediation routes to `/siteasy video`, and the `video-embed-hygiene` check now reports the decorative/interactive classification (new fixture, 68 total).
- Component recipes: `component-recipes.md` — 22 curated registry recipes (install, canonical props from the demos, per-recipe guardrails: reduced-motion, factory gradients to tokens, localized tickers, self-hosted flags, setInterval-free gauges) linked from component-patterns and delight, with the kit warning.

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
