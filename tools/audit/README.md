# Deterministic audit pre-pass

Pure-Node tooling (no dependencies; Playwright optional) that gives `/audit` a
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
| `contrast-ratio` (critical) | WCAG AA ratio from computed styles, or inline color over a resolved background | inspect-agent-a11y |
| `html-lang` | `<html lang>` present and non-empty | inspect-agent-a11y |
| `robots-disallow` (critical) | `Disallow` rules in robots.txt matching the page | seo-agent-technical |
| `title-tag` | `<title>` presence, length, bundler-default titles | seo-agent-content |
| `meta-description` | description presence and length | seo-agent-content |
| `heading-order` | one h1, no skipped levels | seo-agent-content |

`method` on each result is `computed` (rendered), `static` (parsed from HTML/CSS),
or `not-measured` (needs a render or an input that was not supplied). A
`not-measured` check never moves a score.

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

The whole layer is consumed by `/audit checks` and by the shared fetch phase of a
full `/audit`. See `skills/audit/references/checks.md`.
