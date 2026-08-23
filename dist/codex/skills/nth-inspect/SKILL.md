---
name: nth-inspect
description: "Scan a frontend for defects before shipping: design anti-patterns (missing focus rings, clipped dropdowns, z-index conflicts, placeholder-as-label, missing reduced-motion), real Chromium screenshots on mobile and desktop, and a design-engineering code review of motion, accessibility and token discipline."
license: Apache-2.0
compatibility: Requires Node.js 20+ and Python 3 for the deterministic tools, plus network access for page fetches. NTH_ROOT must point at the NullToHero checkout.
metadata:
  version: "4.0.0"
  host: codex
  source-skill: inspect
  short-description: "Scan a frontend for defects before shipping: design anti-patterns (missing focus rings, clipped dropdowns, z-index conflicts, placeholder-as-label, missing reduced-motion), real Chromium screenshots on mobile and desktop, and a design-engineering code review of motion, accessibility and token discipline."
  argument-hint: "[detect|preview|review] [path/to/file | https://url | paste code]"
---
<!-- Generated for OpenAI Codex from null-to-hero/skills/inspect/.
     Do not edit here. Edit the source and run tools/build-dist.mjs. -->

## Host notes

Invoke this skill with `$nth-inspect`, or pick it from `/skills`. Its commands are written `/nth-inspect <command>` below.

`${NTH_ROOT}` is the absolute path of the NullToHero checkout, substituted at install time. If a command still shows the literal token, the install did not run; export `NTH_ROOT` and run it again.

This host does not publish tool names to a skill. Where the text names a tool, read it as the capability: read a file, read a media file, write a file, edit a file, match paths by pattern, search file contents, fetch a URL, search the web, run a shell command, ask the user a clarifying question, delegate to a sub-agent.

Three quality-check tools in one, to run before every ship.

## Start here

`preview [target]` is the door: a real Chromium screenshot on desktop and
mobile, read back visually, bugs fixed in a loop. `detect` and `review` are
the deterministic engines behind pre-ship gates; run them directly when you
want the scan or the code review on its own. For a whole-site pass use
`/nth-audit [url]`. Names in `tools/data/intents.csv` are accepted as synonyms.

## Commands

| Command | What it does | Reference |
|---------|-------------|-----------|
| `detect [target]` | Deterministic anti-pattern scan. Finds missing focus rings, clipped dropdowns, pure black/white, tiny touch targets, missing reduced-motion, and more | [references/detect.md](references/detect.md) |
| `preview [target]` | Real Chromium screenshot. Desktop and mobile viewports, reads back visually, fixes bugs in a loop | [references/preview.md](references/preview.md) |
| `review [target]` | Design engineering code review. Motion crimes, a11y violations, forbidden patterns, Before/After table with score; plus code robustness (security, performance, correctness) | [references/review.md](references/review.md) + [references/code-quality.md](references/code-quality.md) |

## When to use which

| Situation | Command |
|-----------|---------|
| "Are there any design problems in my code?" | `detect` |
| "What does my site actually look like?" | `preview` |
| "Review my code before I ship" | `review` |
| Just built something with `/nth-siteasy build` | `preview` → `detect` → `review` |

## Severity order

Triage findings highest severity first: fix CRITICAL before HIGH, HIGH before MEDIUM, MEDIUM before LOW. This mirrors the priority order `/nth-siteasy` builds against, so detection and construction never disagree on what to fix first.

If `DIRECTION.md` or `PRODUCT.md` exist at the project root, read them before scanning: the declared register and stack scope which rules matter most (a marketing page is judged on motion restraint, a product UI on interaction states).

| # | Category | Severity |
|---|----------|----------|
| 1 | Accessibility (contrast, focus rings, alt text, keyboard, aria-labels) | CRITICAL |
| 2 | Touch and interaction (target size per L-TOUCH-1, spacing per L-TOUCH-2, feedback) | CRITICAL |
| 3 | Performance and Core Web Vitals (WebP/AVIF, lazy-load, CLS, LCP) | HIGH |
| 4 | Structure and semantics (heading order, landmarks, valid HTML) | HIGH |
| 5 | Layout and responsive (breakpoints, viewport, no horizontal scroll) | HIGH |
| 6 | Typography and color (sizes, line-height, semantic tokens) | MEDIUM |
| 7 | Motion (duration, meaning, prefers-reduced-motion) | MEDIUM |
| 8 | Forms and feedback (labels, inline errors, autocomplete) | MEDIUM |
| 9 | Navigation (back behavior, primary items, active state) | MEDIUM |
| 10 | Data and charts (legends, tooltips, accessible encoding) | LOW |

## Detection rules from data

Beyond the deterministic scan, `detect` can read `tools/data/inspect-rules.csv` for editable Do/Don't rules with good and bad code examples (86 rules), so coverage extends without changing code. `tools/data/rule-coverage.csv` says which of the 86 already execute and where: 48 in the rules engine, 18 in the static checks, 7 in the rendered probe, 3 in the three.js probe, 3 in the motion probe, and 7 that do not execute and say why in a typed class: convention, judgment, build-time or tooling. Each rule also maps to its remediation route (the command to run and the reference to load) in `tools/data/remediation-map.csv` (`rule-<id>` rows): cite it with every finding. To locate a relevant reference fast: `node tools/search-references.mjs "<topic>" --skill inspect`.

## Quick start

If no command is specified:
- With a URL or file path → default to `preview`
- With pasted code → default to `review`
- Otherwise ask: "Do you want a screenshot, an anti-pattern scan, or a code review?"

## Requirements

`detect` and `review` need Node.js and nothing else. They ran `npx impeccable@2.3.2` until v2.7.0 and no longer do: the rules are this plugin's own and live in `tools/inspect/rules.mjs`, so there is no download on first run and no upstream flag to drift.

Seven rules need a laid-out page and run in a browser instead, through `tools/inspect/rendered.mjs`. Same probe either way: a connected browser for a live or gated page, Playwright for a headless run. See [references/rendered.md](references/rendered.md).

Three more need a live three.js scene and run through `tools/inspect/three.mjs`, which measures draw calls and pixel ratio from `renderer.info` instead of inferring them from source. It needs its collector installed before the page's own three.js evaluates, so it is two steps in a connected browser and one in Playwright. See [references/three.md](references/three.md).

## Recommended pre-ship sequence

```
/nth-audit checks index.html       ← catch obvious anti-patterns first
/nth-inspect preview index.html    ← see what it looks like in a real browser
/nth-inspect review index.html     ← final engineering quality gate
```
