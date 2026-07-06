---
name: audit-checks
version: 1.14.0
description: >
  Deterministic pre-pass for /audit. Fetches the target once (optionally
  rendering JavaScript with Playwright), computes the objectively decidable
  checks (contrast, image dimensions, viewport meta, robots.txt, heading order,
  html lang, title, meta description, 375px overflow, security headers, canonical) and writes a machine
  readable SITE-AUDIT.json plus a short summary. No sub-agents run. Backs the
  /audit checks command and the shared fetch phase of every other run mode.
---

# Deterministic checks pre-pass

`/audit checks [url]` runs the computed half of an audit and nothing else. It
fetches the page once, computes the checks a machine can decide without judgment,
and writes `SITE-AUDIT.json`. It dispatches no sub-agents, so it is fast and cheap
and fully reproducible. Use it as a quick pre-flight, as the CI gate, as the
baseline for score-over-time, and as the ground-truth layer a full `/audit` hands
to its sub-agents so the model judges only what is genuinely subjective.

The detection logic is code, not prompt. Everything here is owned by the scripts
under `tools/audit/`; this reference is the playbook for invoking them.

## When to use

| Situation | Why checks fits |
|-----------|-----------------|
| Fast pre-flight before a full audit | One fetch, no agents, a few hundred ms |
| CI gate on a deploy | Deterministic pass/fail, no model variance (see gate.mjs) |
| Track a score over time | Stable numbers from the same verdicts |
| A page that may be a client-rendered SPA | `--render` audits the rendered DOM, not the shell |

For the subjective dimensions (design taste, UX flow, copy, motion) run a full
`/audit` (see [full.md](full.md)); they need the sub-agents.

## Process

1. **Resolve the target.** A URL or a local HTML file. No target means ask.
2. **Fetch once.** Run the fetch helper. Add `--render` to load the page in
   headless Chromium when the page may be client-rendered. Add `--robots` to pull
   and evaluate `/robots.txt` for a URL target.
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/tools/audit/analyze.mjs <url|file> --robots --out SITE-AUDIT.json
   # client-rendered SPA (needs Playwright): npm i -D playwright && npx playwright install chromium
   node ${CLAUDE_PLUGIN_ROOT}/tools/audit/analyze.mjs <url> --render --robots --out SITE-AUDIT.json
   ```
3. **Read the result.** `SITE-AUDIT.json` carries the per-check verdicts, the
   deterministic floor score, the target's `clientRendered` flag and a
   `partialCoverage` note when the page was client-rendered but not rendered.
4. **Summarize.** Present the deterministic floor score, its band, and the FAIL
   and WARN checks with their one-line detail. State which checks were
   `not-measured` and why (no render, no robots.txt).
5. **Optionally gate.** For CI, exit non-zero on a critical FAIL or below a
   threshold:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/tools/audit/gate.mjs --report SITE-AUDIT.json --min-score 60
   ```

## Computed checks

| Check | Verdict basis | Critical | Owning agent |
|-------|---------------|----------|--------------|
| Viewport meta | present, `width=device-width`, zoom not blocked | no | inspect-agent-layout |
| Image width/height | width and height (attribute, inline, or aspect-ratio) | no | inspect-agent-layout |
| Horizontal scroll at 375px | rendered scrollWidth, or a static fixed-width heuristic | no | inspect-agent-layout |
| Color contrast (AA) | WCAG ratio from computed styles (critical), or a render-free estimate from token and linked CSS over a known background (advisory, non-critical) | computed only | inspect-agent-a11y |
| HTML lang | `<html lang>` present and non-empty | no | inspect-agent-a11y |
| robots.txt crawlability | `Disallow` rules matching the page | yes | seo-agent-technical |
| Security headers | HSTS, CSP or X-Frame-Options, X-Content-Type-Options, Referrer-Policy parsed from the response | no | seo-agent-technical |
| Canonical / preview | canonical URL plus preview-host detection (`*.netlify.app` and a cross-domain canonical recommend noindex, not FAIL) | no | seo-agent-technical |
| Title tag | presence and length | no | seo-agent-content |
| Meta description | presence and length | no | seo-agent-content |
| Heading order | one h1, no skipped levels | no | seo-agent-content |
| HTML nesting validity | invalid parent/child and self-nesting from the parsed DOM | no | inspect-agent-code |
| ARIA attribute names | aria-* names checked against WAI-ARIA | no | inspect-agent-a11y |
| Charset declared early | meta charset present within the first 1024 bytes | no | seo-agent-technical |
| Head metadata | favicon, manifest, theme-color and color-scheme presence | no | seo-agent-technical |
| Subresource Integrity | cross-origin script and stylesheet carry an integrity hash | no | seo-agent-technical |
| Open redirect parameters | on-page link routes an off-origin URL through a redirect parameter | no | seo-agent-technical |
| CORS credentialed wildcard | Access-Control-Allow-Origin star or null combined with credentials | no | seo-agent-technical |
| Response compression | Content-Encoding gzip, brotli, deflate or zstd | no | seo-agent-performance |
| Server fingerprint headers | X-Powered-By and version-revealing Server headers | no | seo-agent-technical |
| Cookie security flags | Set-Cookie sets Secure, HttpOnly and SameSite | no | seo-agent-technical |
| HTTP to HTTPS redirect | plain HTTP redirects to HTTPS (URL probe) | no | seo-agent-technical |
| www / non-www canonical host | the alternate host redirects or does not serve (URL probe) | no | seo-agent-technical |
| security.txt | /.well-known/security.txt published (URL probe) | no | seo-agent-technical |

Each result carries a `method`: `computed` (from a render), `static` (parsed from
HTML and CSS) or `not-measured`. A `not-measured` check never moves a score; it is
reported as a coverage gap, for example contrast with no render and no resolvable
text colors, or robots.txt that was not fetched.

## Rendered fetch and the client-rendered guard

Raw HTML is the server response with no JavaScript executed. On a React or Vue app
without server-side rendering, that is an empty shell, and auditing it produces
false PASS and false FAIL. The fetch helper always classifies the page:

- `clientRendered: false` — the server sent real content; raw HTML is faithful.
- `clientRendered: true` — an empty mount node plus JS bundles, or a render that
  produced far more text than the raw response. Re-run with `--render`.
- `clientRendered: "unknown"` — little server text but no clear shell; `--render`
  to be sure.

When a page is client-rendered and `--render` was not used, the run records a
`partialCoverage` note and the summary must say the audit saw a shell. Do not
report shell-derived FAILs as real.

## Cost ledger

Because `checks` runs no agents, its cost is one fetch. Record it so cost stays
empirical:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/audit/cost.mjs --mode checks --html-bytes <bytes> --elapsed-ms <ms> --md
```

A full `/audit` records the agent-mode ledger instead (see [full.md](full.md), Cost
ledger).

## Output

| File | Contents |
|------|----------|
| `SITE-AUDIT.json` | Scores, per-check verdicts, target metadata, cost slot, partial coverage. Schema: `tools/audit/schema/site-audit.schema.json`. |

`checks` does not write the two markdown report files; those belong to the agent
run modes. To format a JSON result for a human, render the FAIL and WARN rows and
the score band.

## Cross-skill references

| Need | Where |
|------|-------|
| Full audit with all 14 sub-agents | /audit full (see [full.md](full.md)) |
| Diff two results | /audit compare (see [compare.md](compare.md)) |
| Format a result as a report or PDF | /audit report (see [report.md](report.md)) |
