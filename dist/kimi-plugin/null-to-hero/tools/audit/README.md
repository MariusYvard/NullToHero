# Deterministic audit pre-pass

Pure-Node tooling (no dependencies; Playwright optional) that gives `/nth-audit` a
ground-truth layer: a real fetch, computed verdicts for the objectively decidable
checks, a machine-readable result, a CI gate, a cost ledger, and an eval harness.
The model judges only what is genuinely subjective; everything here is computed.

## Scripts

| Script | Purpose |
|--------|---------|
| `fetch.mjs` | Fetch a URL or file once. `--render` loads it in headless Chromium (Playwright) so a client-rendered SPA is audited as rendered, not as an empty shell. Always reports a `clientRendered` verdict. |
| `analyze.mjs` | Run the static analyzer over a fetch result and emit a `SITE-AUDIT.json`. |
| `gate.mjs` | CI gate: exit non-zero on a critical-check FAIL or below a score threshold. |
| `compare.mjs` | Structural diff of two `SITE-AUDIT.json` results (verdict changes + score deltas). |
| `cost.mjs` | End-of-run cost ledger (agents launched, approximate tokens, elapsed). |
| `eval.mjs` | Grade the analyzer against `tests/eval` fixtures; report accuracy and drift. |
| `lib/` | `html.mjs` (tiny tag-tree parser), `contrast.mjs` (WCAG math), `checks.mjs` (the check engine), `site-audit.mjs` (JSON assembly). |
| `schema/site-audit.schema.json` | JSON Schema (draft-07) for `SITE-AUDIT.json`. |

## Computed checks

Each maps to the audit sub-agent that owns the dimension, so the orchestrator can
hand an agent its ground truth.

| Check id | Verdict basis | Agent |
|----------|---------------|-------|
| `viewport-meta` | `<meta name=viewport>` present, `width=device-width`, zoom not blocked | inspect-agent-layout |
| `img-dimensions` | `<img>` width/height (attr, inline, or aspect-ratio) | inspect-agent-layout |
| `horizontal-overflow-375` | rendered scrollWidth at 375px, or a static fixed-width heuristic | inspect-agent-layout |
| `contrast-ratio` (critical when computed) | WCAG AA ratio from computed styles; render-free it is a non-critical CSS-cascade estimate that skips what it cannot know | inspect-agent-a11y |
| `contrast-exempt-undeclared` | `data-contrast-exempt` carries a known code and a stated reason | inspect-agent-a11y |
| `html-lang` | `<html lang>` present and non-empty | inspect-agent-a11y |
| `robots-disallow` (critical) | `Disallow` rules in robots.txt matching the page | seo-agent-technical |
| `title-tag` | `<title>` presence, length, bundler-default titles | seo-agent-content |
| `meta-description` | description presence and length | seo-agent-content |
| `heading-order` | one h1, no skipped levels | seo-agent-content |

`method` on each result is `computed` (rendered), `static` (parsed from HTML/CSS),
or `not-measured` (needs a render or an input that was not supplied). A
`not-measured` check never moves a score.

## What `--render` measures

A verdict from one page at scroll 0 is a verdict about one page at scroll 0. So the
render sweeps three axes, and each default is a real defect that shipped past the
old single-shot pass:

| Axis | Default | The bug it exists for |
|------|---------|----------------------|
| pages | sitemap.xml, else same-origin links, cap 10 | a CTA failed on `/journey` while the audited home page passed |
| scroll | 5 stops, actual `scrollY` read back | a nav button re-themed past the first act and dropped to 3.68:1 |
| viewports | mobile 375 + desktop 1280 | desktop-only nav links are `display:none` at 375, so nothing measured them |

```bash
--pages 10                 # cap on discovered pages
--scroll 5                 # scroll stops per page (1 = scroll 0 only)
--viewports mobile,desktop # any of: mobile, desktop
--page-urls a,b,c          # name them yourself, skips discovery
```

`contrast-ratio.value.coverage` reports what the verdict actually covered, and
`target.pagesFetched` / `target.measured` carry it into SITE-AUDIT.json. Samples are
deduped per element per page keeping the **worst** state, so the failure count is
distinct failing elements and does not grow just because the sweep got wider.

## Per-page checks

The document-level checks (title, meta description, heading order, canonical, html
lang, viewport, img dimensions, DOM nesting, ARIA, charset, head meta, SRI, robots
path, and the rest) now run on **every discovered page** and merge to the worst
verdict. `value.perPage` lists each URL's verdict and the detail names the pages that
are not clean. One page failing fails the site: a reader lands on any of them.

This needs no `--render`: "does every page have a title" is a question raw HTML
answers, and gating it on a browser was an accident of where the code sat. Discovery
is shared with the sweep, so the two can never disagree about what "the site" means.

Site-level checks stay on the entry, and that is not laziness:

- `contrast-ratio` already sweeps every page itself
- security headers, HTTPS/host probes, robots.txt and `security.txt` are properties of
  the **origin**
- the CSS/JS bundle checks (reduced-motion, scrollbar, frame loops, three duplication)
  read the **shared bundles**

Re-asking those per page would turn one fact into N identical copies of itself.

## Quick start

```bash
# Deterministic-only audit of a page, written to SITE-AUDIT.json
node tools/audit/analyze.mjs https://example.com/ --robots --out SITE-AUDIT.json

# Render an SPA before analyzing (needs: npm i -D playwright && npx playwright install chromium)
node tools/audit/analyze.mjs https://app.example.com/ --render --robots --out SITE-AUDIT.json

# Gate a build (exit 1 on a critical FAIL or below 60)
node tools/audit/gate.mjs --report SITE-AUDIT.json --min-score 60

# Diff before/after
node tools/audit/compare.mjs before.json after.json --md

# Grade the analyzer
node tools/audit/eval.mjs
```

The whole layer is consumed by `/nth-audit checks` and by the shared fetch phase of a
full `/nth-audit`. See `skills/audit/references/checks.md`.
