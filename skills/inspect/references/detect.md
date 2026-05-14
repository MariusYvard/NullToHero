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

## Parallax Anti-Patterns

Detect on any page using `.parallax-*` classes, `[data-parallax]`, `animation-timeline`, GSAP `ScrollTrigger`, or Lenis. Cross-reference with `siteasy/references/parallax.md`.

- **parallax-on-text** — Body text or interactive control (CTA, form field, nav) sits inside a moving layer. Anchor controls; only decorative layers move.
- **parallax-bg-attachment-fixed** — `background-attachment: fixed` declared on a parallax layer. Breaks on iOS Safari, jank-prone everywhere. Use `position: sticky` plus `transform` instead.
- **parallax-no-reduced-motion** — Parallax styles or scripts ship without a `@media (prefers-reduced-motion: reduce)` neutralizer.
- **parallax-no-toggle** — No visible manual control to disable motion. WCAG 2.2.2 violation when motion exceeds 5 seconds.
- **parallax-mobile-leak** — Multi-layer parallax remains active below 768px or under `(pointer: coarse)`. Drop to Tier 1 (static or one passive reveal).
- **parallax-layout-animation** — Animates `width`, `height`, `top`, `left`, or margin. Use `transform` and `opacity` only.
- **parallax-non-passive-scroll** — `addEventListener('scroll', ...)` without `{ passive: true }`. INP killer.
- **parallax-lcp-occlusion** — LCP candidate is a parallax layer without `fetchpriority="high"` and explicit `width`/`height`.
- **parallax-heavy-asset** — Layer image above 200 KB or not in AVIF/WebP.
- **parallax-no-static-fallback** — Reduced-motion path leaves an empty or broken section. Must reach content parity.
- **parallax-text-contrast-drift** — Foreground text contrast falls below 4.5:1 at some point along the layer travel. Add an overlay or fix the asset.
- **parallax-stacked-effects** — Two patterns in the same viewport (e.g. horizontal scroll plus zoom plus mouse-follow). Pick one.
- **parallax-will-change-leak** — `will-change: transform` declared permanently. Set when active, remove on idle.
- **parallax-smoothtouch-enabled** — Lenis or equivalent runs with `smoothTouch: true`. Mobile scroll must stay native.

Severity mapping:
- `error`: parallax-on-text, parallax-no-reduced-motion, parallax-layout-animation, parallax-non-passive-scroll, parallax-lcp-occlusion, parallax-smoothtouch-enabled
- `warning`: parallax-bg-attachment-fixed, parallax-no-toggle, parallax-mobile-leak, parallax-heavy-asset, parallax-text-contrast-drift, parallax-stacked-effects, parallax-will-change-leak
- `info`: parallax-no-static-fallback
