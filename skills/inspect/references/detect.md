# Anti-Pattern Detector

Run the deterministic `impeccable detect` CLI on code or a URL and present findings clearly.

## Running the Detector

```bash
# Local file or folder
npx impeccable --json path/to/file.html
npx impeccable --json path/to/folder/

# URL
npx impeccable --json https://example.com
```

## Process

1. **Identify the target** from the user's message. If not specified, ask: "What file, folder, or URL should I scan?"
2. **Run** with `--json` flag
3. **Parse** — each finding has: `rule`, `severity` (error|warning|info), `message`, `location`, `suggestion`
4. **Present** grouped by severity, with concrete fix for each
5. **Offer to fix**: "Would you like me to fix any of these?"

## Output Format

```
## Anti-Pattern Report: [target]

Found [N] issues: [E] errors · [W] warnings · [I] informational

### Errors (must fix)
**[rule-name]** — [file]:[line]
[message]
→ Fix: [suggestion]

### Warnings (should fix)
...

### Info (consider fixing)
...
```

If 0 issues: "No anti-patterns detected."

## Common Anti-Patterns

- **missing-focus-ring** — Interactive elements lack visible focus indicators
- **placeholder-as-label** — `placeholder` used without a real `<label>`
- **pure-black** — `#000` or `rgb(0,0,0)` used for large surfaces
- **clipped-dropdown** — `position: absolute` inside `overflow: hidden`
- **missing-reduced-motion** — Animations without `prefers-reduced-motion` fallback
- **tiny-touch-target** — Interactive element smaller than 44×44px
- **arbitrary-z-index** — `z-index` values like 9999
- **outline-none** — `outline: none` without `:focus-visible` replacement
- **hover-only-state** — Hover styles with no equivalent focus style
- **color-only-info** — Information conveyed by color alone

## If Node.js is Not Available

> The detector requires Node.js. Install it from https://nodejs.org, then run `npx impeccable [target]`. In the meantime, I can do a manual review — share your file and I'll run `/siteasy audit` instead.
