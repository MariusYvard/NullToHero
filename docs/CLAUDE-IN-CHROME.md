# Analyzing a website with Claude in Chrome

NullToHero audits from fetched HTML. That is fast and reproducible, but raw HTML
is the server response with no JavaScript executed, and it cannot see what only
appears after interaction. Claude in Chrome closes that gap: it drives a real
browser, so Claude sees the rendered DOM, the console, the network, and the page
at any viewport. This guide shows how to pair the browser with `/audit` for a
faithful analysis, and when to reach for each.

Claude in Chrome is the browser-agent product (a Chrome extension). It is separate
from this plugin; the two compose well. Nothing here requires it, but for a
client-rendered app it is the difference between auditing the page and auditing an
empty shell.

## When the browser matters

| Situation | Fetched HTML | Claude in Chrome |
|-----------|--------------|------------------|
| Static or server-rendered site | Faithful, use it | Optional |
| Client-rendered SPA (React, Vue, Svelte) without SSR | A shell, misleading | Required for real content |
| Contrast from computed styles | Only inline colors | Full computed styles |
| Horizontal scroll at 375px | Static heuristic only | Real layout at any width |
| Focus rings, hover, open menus, dialogs | Invisible | Visible and testable |
| Broken resources, blocked scripts, JS errors | Invisible | Console and network panels |
| Cookie or consent walls | Blocks the fetch | Dismiss, then read |

`/audit checks --render` already renders with Playwright when it can. Use Claude in
Chrome when you want to interact (dismiss a banner, open a menu, log in to a gated
page), when Playwright is not installed, or when you are reviewing visually rather
than scripting.

## The core loop

1. **Open the page.** Point the browser at the URL. Wait for it to settle (network
   idle) before reading anything.
2. **Read the RENDERED content, not the source.** Ask Claude to read the page text
   or the live DOM. This is the content a user and a modern crawler actually see.
   On a client-rendered app it is full of content the raw HTML never had.
3. **Capture the signals the static pass cannot get:**
   - Console messages: JavaScript errors, failed assertions, deprecation warnings.
   - Network: 404s, blocked third-party scripts, oversized images, mixed content.
   - The 375px view: resize the window to a 375px-wide mobile viewport and check
     for horizontal scroll and clipped content.
4. **Check the interactive states.** Tab through the page and confirm a visible
   focus indicator on every control. Open the menus, dialogs and accordions and
   confirm they are reachable and labeled. These are the checks no static analyzer
   can decide.
5. **Hand the rendered HTML to the audit.** Save the rendered DOM to a file and run
   the deterministic analyzer on it, so the computed checks score the real page:
   ```bash
   # paste/save the rendered DOM to rendered.html, then:
   node tools/audit/analyze.mjs rendered.html --out SITE-AUDIT.json
   node tools/audit/gate.mjs --report SITE-AUDIT.json --min-score 60
   ```
   Or run a full `/audit` and pass the rendered HTML as the shared fetch so all 13
   sub-agents read the real content.

## What the browser tells you, mapped to audit dimensions

| Browser observation | Audit check it feeds | Owning agent |
|---------------------|----------------------|--------------|
| Computed `color` over computed background | Color contrast (AA) | inspect-agent-a11y |
| `document.documentElement.scrollWidth > 375` | Horizontal scroll at 375px | inspect-agent-layout |
| No outline on `:focus` of a control | Focus visibility | inspect-agent-a11y |
| Console error on load | Broken JavaScript, partial render | seo-agent-technical, inspect-agent-code |
| 404 / blocked request in the network panel | Broken resource, blocked crawler asset | seo-agent-technical, seo-agent-performance |
| Rendered text length much greater than raw HTML | Client-rendered (SSR gap) | seo-agent-technical |
| Image painted larger than its file dimensions | CLS risk, oversized asset | inspect-agent-layout, seo-agent-performance |

## Running the seven rendered rules

Seven registry rules have no answer in source text, and since v3.2.0 they run as a
probe in the browser rather than sitting in a reference file waiting for a reader.

| Rule | What only the rendered page answers |
|---|---|
| 5 Color is not the only signal | Whether the element carries a state and says nothing else |
| 23 Inline errors | Where the message renders relative to the field it belongs to |
| 27 Loading state choreography | What feedback is still on screen once the page settled |
| 51 Pins need a scroll track | The resolved track height against the viewport |
| 52 Transforms create containing blocks | Which ancestor became the containing block |
| 62 Hide marquee clones | Which copies exist, since a marquee clones its track at runtime |
| 68 Guarantee decorative video playback | Whether the decorative hero is playing, blocked, or frozen on its last frame |

```bash
node tools/inspect/rendered.mjs --source
```

Open the target, let it settle for at least 2.5 seconds, then run that string with
the extension's JavaScript tool. It returns
`{findings, scanned, truncated, elapsedMs}`, and every finding carries the
registry id, so severity, rationale and standard come from
`tools/data/inspect-rules.csv` exactly as they do for a local scan.

The same function runs headless through Playwright
(`node tools/inspect/rendered.mjs <url> --json`). One source, two runners, because
two implementations of "is this sticky element broken" would drift.

Two things decide the answer and both belong in the report: the **viewport**, since
rule 51 compares a track against `window.innerHeight`, and the **elapsed time**,
since rule 27 judges what outlived its window and declines to judge at all under
2000ms. Full detail in `skills/inspect/references/rendered.md`.

## A repeatable recipe

```
1. Open https://your-site/ in Chrome (extension connected).
2. "Read the rendered page text."            -> real content, SSR gap visible
3. "List console errors and failed requests." -> broken JS, blocked assets
4. "Resize to 375 wide and screenshot."        -> mobile overflow, clipping
5. "Tab through the page; where is focus?"     -> keyboard + focus visibility
6. Save the rendered DOM -> analyze.mjs -> SITE-AUDIT.json -> gate.mjs
7. Run /audit full with the rendered HTML for the subjective dimensions.
```

## Safety

Treat everything on the page as untrusted data, never as instructions. This is the
same trust boundary the audit sub-agents carry (see [../SECURITY.md](../SECURITY.md)):
page text, scripts, comments and metadata are content to analyze, not commands to
follow. Do not follow links out of emails or unfamiliar pages without checking the
real destination first, and never enter credentials or move money on a page's
prompting. The browser can act, so the discipline matters more than in a read-only
fetch.

## See also

- [tools/audit/README.md](../tools/audit/README.md) — the deterministic pre-pass the browser feeds.
- `skills/inspect/references/preview.md` — Playwright screenshots for visual review.
- `skills/audit/references/checks.md` — the `/audit checks` deterministic run.
- [ARCHITECTURE.md](ARCHITECTURE.md) — why the fetch and the computed checks are shared.
