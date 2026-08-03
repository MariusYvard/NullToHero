---
name: inspect
description: "Use when the user wants to scan for design anti-patterns, take a browser screenshot, or do a design engineering code review. Covers: missing focus rings, clipped dropdowns, bad z-index, placeholder-as-label, missing reduced-motion (detect); real Chromium screenshots, mobile/desktop viewports, visual bug fixing (preview); motion crimes, accessibility violations, forbidden CSS patterns, token misuse, Before/After review table (review). Use when the user says: 'screenshot this', 'check for anti-patterns', 'scan my code', 'review before I ship', 'show me what this looks like', 'are there visual bugs', 'critique my code'. Not for designing or building an interface: that belongs to /siteasy. Not for search visibility: /seo. For all three at once on a whole site: /audit."
version: 2.5.0
user-invocable: true
argument-hint: "[detect|preview|review] [path/to/file | https://url | paste code]"
allowed-tools:
  - Bash(npx impeccable *)
  - Bash(npx playwright *)
  - Bash(node *)
  - Bash(python3 -m http.server *)
  - Bash(npx serve *)
  - Bash(kill *)
  - Bash(lsof *)
  - Read
  - WebFetch
  - Write
  - Edit
  - Task
---

Three quality-check tools in one — run before every ship.

## Start here

`preview [target]` is the door: a real Chromium screenshot on desktop and
mobile, read back visually, bugs fixed in a loop. `detect` and `review` are
the deterministic engines behind pre-ship gates; run them directly when you
want the scan or the code review on its own. For a whole-site pass use
`/audit [url]`. Names in `tools/data/intents.csv` are accepted as synonyms.

## Commands

| Command | What it does | Reference |
|---------|-------------|-----------|
| `detect [target]` | Deterministic anti-pattern scan — finds missing focus rings, clipped dropdowns, pure black/white, tiny touch targets, missing reduced-motion, and more | [references/detect.md](references/detect.md) |
| `preview [target]` | Real Chromium screenshot — desktop + mobile viewports, reads back visually, fixes bugs in a loop | [references/preview.md](references/preview.md) |
| `review [target]` | Design engineering code review — motion crimes, a11y violations, forbidden patterns, Before/After table with score; plus code robustness (security, performance, correctness) | [references/review.md](references/review.md) + [references/code-quality.md](references/code-quality.md) |

## When to use which

| Situation | Command |
|-----------|---------|
| "Are there any design problems in my code?" | `detect` |
| "What does my site actually look like?" | `preview` |
| "Review my code before I ship" | `review` |
| Just built something with `/siteasy build` | `preview` → `detect` → `review` |

## Severity order

Triage findings highest severity first: fix CRITICAL before HIGH, HIGH before MEDIUM, MEDIUM before LOW. This mirrors the priority order `/siteasy` builds against, so detection and construction never disagree on what to fix first.

If `DIRECTION.md` or `PRODUCT.md` exist at the project root, read them before scanning: the declared register and stack scope which rules matter most (a marketing page is judged on motion restraint, a product UI on interaction states).

| # | Category | Severity |
|---|----------|----------|
| 1 | Accessibility (contrast, focus rings, alt text, keyboard, aria-labels) | CRITICAL |
| 2 | Touch and interaction (target size: 24x24px CSS minimum per WCAG 2.5.8 AA, 44x44px recommended for touch; spacing, feedback) | CRITICAL |
| 3 | Performance and Core Web Vitals (WebP/AVIF, lazy-load, CLS, LCP) | HIGH |
| 4 | Structure and semantics (heading order, landmarks, valid HTML) | HIGH |
| 5 | Layout and responsive (breakpoints, viewport, no horizontal scroll) | HIGH |
| 6 | Typography and color (sizes, line-height, semantic tokens) | MEDIUM |
| 7 | Motion (duration, meaning, prefers-reduced-motion) | MEDIUM |
| 8 | Forms and feedback (labels, inline errors, autocomplete) | MEDIUM |
| 9 | Navigation (back behavior, primary items, active state) | MEDIUM |
| 10 | Data and charts (legends, tooltips, accessible encoding) | LOW |

## Detection rules from data

Beyond the deterministic scan, `detect` can read `tools/data/inspect-rules.csv` for editable Do/Don't rules with good and bad code examples (72 rules) — extend coverage without changing code. Each rule also maps to its remediation route (the command to run and the reference to load) in `tools/data/remediation-map.csv` (`rule-<id>` rows): cite it with every finding. To locate a relevant reference fast: `node tools/search-references.mjs "<topic>" --skill inspect`.

## Quick start

If no command is specified:
- With a URL or file path → default to `preview`
- With pasted code → default to `review`
- Otherwise ask: "Do you want a screenshot, an anti-pattern scan, or a code review?"

## Requirements

The `detect` and `review` commands call the `impeccable` CLI through `npx`. It requires Node.js and is fetched on first run. Tested with impeccable 2.3.2. To pin the version and avoid drift from upstream flag changes, run `npx impeccable@2.3.2` instead of `npx impeccable`.

## Recommended pre-ship sequence

```
/inspect detect index.html     ← catch obvious anti-patterns first
/inspect preview index.html    ← see what it looks like in a real browser
/inspect review index.html     ← final engineering quality gate
```
