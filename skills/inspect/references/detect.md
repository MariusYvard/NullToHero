---
name: detect
description: "Run the deterministic impeccable detect CLI on code or a URL and present findings clearly."
version: 1.6.0
---

# Anti-Pattern Detector

Run the deterministic `impeccable detect` CLI on code or a URL and present findings clearly.

## Running the Detector

```bash
# Local file or folder
npx impeccable@2.3.2 --json path/to/file.html
npx impeccable@2.3.2 --json path/to/folder/

# URL
npx impeccable@2.3.2 --json https://example.com
```

Pin the version. Bare `npx impeccable` fetches and executes whatever the registry
serves that day, so the same page can produce two different verdicts on two days, and
the code that ran was never the code this reference was tested against. 2.3.2 is the
tested version; upstream is already at 3.x with different flags.

## Process

1. **Identify the target** from the user's message. If not specified, ask: "What file, folder, or URL should I scan?"
2. **Run** with `--json` flag
3. **Parse**: each finding has: `rule`, `severity` (error|warning|info), `message`, `location`, `suggestion`
4. **Present** grouped by severity, with concrete fix for each
5. **Offer to fix**: "Would you like me to fix any of these?"

## Output Format

```
## Anti-Pattern Report: [target]

Found [N] issues: [E] errors · [W] warnings · [I] informational

### Errors (must fix)
**[rule-name]**: [file]:[line]
[message]
→ Fix: [suggestion]

### Warnings (should fix)
...

### Info (consider fixing)
...
```

If 0 issues: "No anti-patterns detected."

## Common Anti-Patterns

- **missing-focus-ring**: Interactive elements lack visible focus indicators
- **placeholder-as-label**: `placeholder` used without a real `<label>`
- **pure-black**: `#000` or `rgb(0,0,0)` used for large surfaces
- **clipped-dropdown**: `position: absolute` inside `overflow: hidden`
- **missing-reduced-motion**: Animations without `prefers-reduced-motion` fallback
- **tiny-touch-target**: Interactive element smaller than 44×44px
- **arbitrary-z-index**: `z-index` values like 9999
- **outline-none**: `outline: none` without `:focus-visible` replacement
- **hover-only-state**: Hover styles with no equivalent focus style
- **color-only-info**: Information conveyed by color alone

## If Node.js is Not Available

> The detector requires Node.js. Install it from https://nodejs.org, then run `npx impeccable [target]`. In the meantime, I can do a manual review, share your file and I'll run `/siteasy audit` instead.

## Parallax Anti-Patterns

Detect on any page using `.parallax-*` classes, `[data-parallax]`, `animation-timeline`, GSAP `ScrollTrigger`, or Lenis. Cross-reference with `siteasy/references/parallax.md`.

- **parallax-on-text**: Body text or interactive control (CTA, form field, nav) sits inside a moving layer. Anchor controls; only decorative layers move.
- **parallax-bg-attachment-fixed**: `background-attachment: fixed` declared on a parallax layer. Breaks on iOS Safari, jank-prone everywhere. Use `position: sticky` plus `transform` instead.
- **parallax-no-reduced-motion**: Parallax styles or scripts ship without a `@media (prefers-reduced-motion: reduce)` neutralizer.
- **parallax-no-toggle**: No visible manual control to disable motion. WCAG 2.2.2 violation when motion exceeds 5 seconds.
- **parallax-mobile-leak**: Multi-layer parallax remains active below 768px or under `(pointer: coarse)`. Drop to Tier 1 (static or one passive reveal).
- **parallax-layout-animation**: Animates `width`, `height`, `top`, `left`, or margin. Use `transform` and `opacity` only.
- **parallax-non-passive-scroll**: `addEventListener('scroll', ...)` without `{ passive: true }`. INP killer.
- **parallax-lcp-occlusion**: LCP candidate is a parallax layer without `fetchpriority="high"` and explicit `width`/`height`.
- **parallax-heavy-asset**: Layer image above 200 KB or not in AVIF/WebP.
- **parallax-no-static-fallback**: Reduced-motion path leaves an empty or broken section. Must reach content parity.
- **parallax-text-contrast-drift**: Foreground text contrast falls below 4.5:1 at some point along the layer travel. Add an overlay or fix the asset.
- **parallax-stacked-effects**: Two patterns in the same viewport (e.g. horizontal scroll plus zoom plus mouse-follow). Pick one.
- **parallax-will-change-leak**: `will-change: transform` declared permanently. Set when active, remove on idle.
- **parallax-smoothtouch-enabled**: Lenis or equivalent runs with `smoothTouch: true`. Mobile scroll must stay native.

Severity mapping:
- `error`: parallax-on-text, parallax-no-reduced-motion, parallax-layout-animation, parallax-non-passive-scroll, parallax-lcp-occlusion, parallax-smoothtouch-enabled
- `warning`: parallax-bg-attachment-fixed, parallax-no-toggle, parallax-mobile-leak, parallax-heavy-asset, parallax-text-contrast-drift, parallax-stacked-effects, parallax-will-change-leak
- `info`: parallax-no-static-fallback

## WCAG 2.2 Anti-Patterns

Detect against the nine WCAG 2.2 success criteria. Cross-reference with `siteasy/references/wcag-2-2.md`.

- **focus-obscured**: Sticky header, cookie banner, or floating CTA hides the keyboard focus indicator. Violates 2.4.11. Fix with `scroll-padding-top` or `scroll-margin` on focusable elements.
- **target-size-below-24**: Interactive element under 24x24 CSS pixels without 24px clearance. Violates 2.5.8. Exceptions: inline text links, native controls, essential-size targets.
- **drag-without-alternative**: Drag-and-drop interaction with no single-pointer alternative (button, click sequence). Violates 2.5.7.
- **inaccessible-auth**: Login flow requires CAPTCHA, puzzle, or memory test without an alternative (magic link, OAuth, passkey, biometric). Violates 3.3.8. `user-select: none` or pasteblockers on password fields also fail.
- **redundant-entry**: Multi-step form re-asks for information already provided in the same session without justification. Violates 3.3.7.
- **inconsistent-help**: Help mechanisms appear in different relative order across pages. Violates 3.2.6.
- **placeholder-as-label**: Placeholder used as the only label. Fails 2.5.3 (Label in Name) and 3.3.2 (Labels or Instructions). Also fails 1.4.3 (contrast in placeholder color is typically below 4.5:1).
- **paste-disabled-password**: Password input with `onpaste="return false"`, `user-select: none`, or `autocomplete="off"`. Defeats password managers, fails 3.3.8.
- **autocomplete-missing**: Form input matching a standard autocomplete value (email, tel, name, password) without the `autocomplete` attribute. Fails 1.3.5 (Identify Input Purpose).
- **error-not-associated**: Error message not linked to its input via `aria-describedby`. Screen readers announce the input as invalid without the message.

## Image Strategy Anti-Patterns

Detect on any page serving images. Cross-reference with `siteasy/references/image-strategy.md`.

- **img-missing-dimensions**: `<img>` without explicit `width` and `height` attributes. Causes CLS.
- **lcp-image-lazy**: Largest Contentful Paint candidate has `loading="lazy"`. Defers the most important paint.
- **lcp-image-no-priority**: LCP image without `fetchpriority="high"` or `<link rel="preload">`.
- **srcset-without-sizes**: `srcset` with width descriptors but no `sizes` attribute. Browser falls back to 100vw.
- **legacy-format-only**: Hero or content image served only as JPEG or PNG without AVIF/WebP alternatives.
- **gif-animation**: Animated GIF over 200 KB. Convert to MP4 video.
- **alt-attribute-missing**: `<img>` without `alt` attribute (different from empty `alt=""`).
- **alt-not-descriptive**: `alt="image"`, `alt="photo"`, `alt="IMG_xxxx"`, or filename as alt.
- **background-image-content**: Meaningful content (text overlays excepted) served as CSS `background-image` instead of `<img>`. Inaccessible.

## Form Pattern Anti-Patterns

Detect on any `<form>`. Cross-reference with `siteasy/references/form-patterns.md`.

- **form-multi-column**: Independent fields side-by-side beyond the canonical pairs (first/last name, city/state/zip, expiry month/year).
- **submit-permanently-disabled**: Submit button `disabled` until "valid" without surfacing what is missing.
- **validation-on-keystroke**: Inline error fires on every keystroke from the first character.
- **error-summary-only**: Errors listed only at top of form, no inline indication next to the offending field.
- **inputmode-missing**: Numeric input without `inputmode="numeric"`. Mobile keyboard wrong.
- **otp-split-inputs**: One-time-code entered across 6 separate `<input>` elements instead of a single field with `autocomplete="one-time-code"`.
