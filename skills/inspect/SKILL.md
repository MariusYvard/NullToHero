---
name: inspect
description: "Use when the user wants to scan for design anti-patterns, take a browser screenshot, or do a design engineering code review. Covers: missing focus rings, clipped dropdowns, bad z-index, placeholder-as-label, missing reduced-motion (detect); real Chromium screenshots, mobile/desktop viewports, visual bug fixing (preview); motion crimes, accessibility violations, forbidden CSS patterns, token misuse, Before/After review table (review). Use when the user says: 'screenshot this', 'check for anti-patterns', 'scan my code', 'review before I ship', 'show me what this looks like', 'are there visual bugs', 'critique my code'."
version: 1.0.0
user-invocable: true
argument-hint: "[detect|preview|review] [path/to/file | https://url | paste code]"
license: "Apache-2.0"
allowed-tools:
  - Bash(npx impeccable *)
  - Bash(npx playwright *)
  - Bash(node *)
  - Bash(python3 -m http.server *)
  - Bash(npx serve *)
  - Bash(kill *)
  - Bash(lsof *)
  - Read
  - Write
---

Three quality-check tools in one — run before every ship.

## Commands

| Command | What it does | Reference |
|---------|-------------|-----------|
| `detect [target]` | Deterministic anti-pattern scan — finds focus rings, clipped dropdowns, pure black/white, tiny touch targets, missing reduced-motion, and more | [references/detect.md](references/detect.md) |
| `preview [target]` | Real Chromium screenshot — desktop + mobile viewports, reads back visually, fixes bugs in a loop | [references/preview.md](references/preview.md) |
| `review [file]` | Design engineering code review — motion crimes, a11y violations, forbidden patterns, Before/After table with score | [references/review.md](references/review.md) |

## When to use which

| Situation | Command |
|-----------|---------|
| "Are there any design problems in my code?" | `detect` |
| "What does my site actually look like?" | `preview` |
| "Review my code before I ship" | `review` |
| Just built something with `/siteasy build` | `preview` → `detect` → `review` |

## Quick start

If no command is specified:
- With a URL or file path → default to `preview`
- With pasted code → default to `review`
- Otherwise ask: "Do you want a screenshot, an anti-pattern scan, or a code review?"

## Recommended pre-ship sequence

```
/inspect detect index.html     ← catch obvious anti-patterns first
/inspect preview index.html    ← see what it looks like in a real browser
/inspect review index.html     ← final engineering quality gate
```
