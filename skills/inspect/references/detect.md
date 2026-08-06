---
name: detect
description: "Run NullToHero's own deterministic detector on local code and present findings clearly."
version: 2.0.0
---

# Anti-Pattern Detector

```bash
node tools/inspect/detect.mjs path/to/file-or-folder
node tools/inspect/detect.mjs path/ --json
node tools/inspect/detect.mjs path/ --fail-on important   # exit 1 for a hook or CI
```

Reads `.html`, `.css`, `.js`, `.jsx`, `.ts` and `.tsx`. No model call, no network, no page
execution, so it costs nothing per run and is safe to point at a repository you did not write.

## What it actually covers, and what it does not

Two sources, both deterministic. Forty rules from `tools/data/inspect-rules.csv`, so every
finding carries that registry's id, severity, rationale and standard. Plus twenty-six static
checks from `tools/audit/lib/checks.mjs`, which existed to serve `/audit` on a URL and were
never reachable from a local scan until v3.0.0. Eighteen of those checks execute a registry rule
and now report its id alongside their own.

The scope is source text, not layout. Whether a block overflows at 375px, whether a contrast
ratio survives the resolved cascade, whether an animation janks: those need a rendered page and
belong to `/inspect preview`. **A clean report here means the named defects are absent, not that
the page is good.** Say that when reporting a clean run, or the number gets read as a grade.

The registry holds 72 rules and 65 are executable: 40 in the rules engine, 18 inside the static
checks and 7 in the rendered probe, which runs in a browser because a laid-out page is the only
place their answer exists (see [rendered.md](rendered.md)). `tools/data/rule-coverage.csv` names
the executor of every rule, and the seven that have none say why in a typed class: two are
convention, three judgment, one build-time and one tooling. Those seven still need a reader, which is what the sections further down this file are
for. When a rule is implemented its prose entry stays: the CSV is the single source of severity
and rationale for every path.

The figure was wrong until v3.1.0. The v3.0.0 note published "59 remain non-executable" while
eighteen of those 59 were already running inside `checks.mjs` under a check id, with nothing in
the repository tying the two together. A guard in `tests/inspect-rules.mjs` now fails the build
when the coverage map drifts from either side, so the count cannot go stale again without a red
test.

## Lineage

Before v2.7.0 this command shelled out to `npx impeccable@2.3.2` (Apache 2.0, Paul Bakaus).
That tool is good and the pin was correct, since an unpinned `npx` makes the same page produce
two verdicts on two days. But it froze detection on an old release of someone else's project.
Nothing here is transcribed from it: these rules are NullToHero's own registry made executable.

Worth knowing when choosing what to run: the two engines cover different axes. Impeccable's
rules are largely aesthetic (gradient text, template palettes, kicker above heading). These are
correctness (WCAG, CLS, security, dead interaction). Measured on its own 65 adversarial fixtures,
this detector reports 20 findings that its rules never look for, and stays silent on the taste
defects those fixtures were built to carry. Neither is a replacement for the other.

## Process

1. **Identify the target** from the user's message. If not specified, ask: "What file or folder should I scan?"
2. **Run** with `--json`
3. **Parse**: each finding carries `id` (registry rule) or `check` (static check), `severity`,
   `rule`, `file`, `evidence`, and where available `why` and `source`
4. **Present** grouped by severity, with a concrete fix for each
5. **Then read for what the detector cannot see.** The unimplemented registry rules and the
   pattern lists below still need judgment. Do not present a clean scan as a clean page.
6. **Offer to fix**: "Would you like me to fix any of these?"

## Output Format

```
## Anti-Pattern Report: [target]

Found [N] issues: [C] critical · [I] important · [M] medium · [L] low

### Errors (must fix)
**[rule-name]**: [file]:[line]
[message]
→ Fix: [suggestion]

### Warnings (should fix)
...

### Info (consider fixing)
...
```

If 0 issues: "No named defect found. This covers the executable rules only, not layout or
resolved contrast, which need `/inspect preview`."

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

> The detector needs Node.js. Install it from https://nodejs.org, then run
> `node tools/inspect/detect.mjs [target]`. In the meantime I can review by hand: share the file
> and I will run `/siteasy audit` instead.

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
