---
name: responsive-design
description: "Start with base styles for mobile, use min-width queries to layer complexity. Desktop-first (max-width) means mobile loads unnecessary styles first."
version: 1.10.0
---

# Responsive Design

## Mobile-First: Write It Right

Start with base styles for mobile, use `min-width` queries to layer complexity. Desktop-first (`max-width`) means mobile loads unnecessary styles first.

## Mobile-First Is a Strategy, Not a Media-Query Order

Responsive design adapts a desktop layout downward; mobile-first designs the small-screen experience upward. The difference shows in what gets cut:

| Criterion | Responsive (top-down) | Mobile-first (bottom-up) |
|---|---|---|
| Content priority | Layout is squeezed to fit | Non-essential content is cut at the design stage |
| Performance | Desktop scripts and assets often load hidden | Budgeted for the smallest device from the start |
| Touch | Hover behaviors retrofitted | Designed for touch and gestures natively |

Operational rules:

- **Full content parity.** Mobile users expect to complete the same tasks as on desktop. Organize content sequentially instead of removing it, and never ship a "view desktop site" escape hatch.
- **Every element pays rent.** Reading comprehension on mobile drops to roughly half of desktop for complex content (NN/g), and anything scrolled off-screen taxes short-term memory. Each decorative block has a real opportunity cost.
- **No false floors.** Full-width decorative images and banner-shaped blocks read as ads (banner blindness) and signal "end of page", stopping the scroll early. Cut them or make them unmistakably content.

## Breakpoints: Content-Driven

Don't chase device sizes—let content tell you where to break. Start narrow, stretch until design breaks, add breakpoint there. Three breakpoints usually suffice (640, 768, 1024px). Use `clamp()` for fluid values without breakpoints.

## Detect Input Method, Not Just Screen Size

**Screen size doesn't tell you input method.** A laptop with touchscreen, a tablet with keyboard—use pointer and hover queries:

```css
/* Fine pointer (mouse, trackpad) */
@media (pointer: fine) {
  .button { padding: 8px 16px; }
}

/* Coarse pointer (touch, stylus) */
@media (pointer: coarse) {
  .button { padding: 12px 20px; }  /* Larger touch target */
}

/* Device supports hover */
@media (hover: hover) {
  .card:hover { transform: translateY(-2px); }
}

/* Device doesn't support hover (touch) */
@media (hover: none) {
  .card { /* No hover state - use active instead */ }
}
```

**Critical**: Don't rely on hover for functionality. Touch users can't hover.

## Viewport units: three of them, and two are usually wrong

`vh` is the large viewport (browser bars retracted). `svh` is the small viewport (bars
shown). `dvh` follows the bar as it moves. Picking one without saying which problem you
are solving produces one of two defects, and they look nothing alike.

| Unit | What it does on a phone | Where it bites |
|------|-------------------------|----------------|
| `100vh` | Taller than the visible area while the bars are shown | Content clipped below the fold on first paint, the classic "the button is off screen until I scroll" |
| `100svh` | Shorter than the visible area once the bars retract | A band of page background appears under a full-bleed section, because the section stopped growing and the body did not |
| `100dvh` | Matches the visible area at all times | The element resizes once when the bar retracts, which is visible on a pinned section |

**For a full-bleed section that must never show the page behind it, use `dvh`.** The
one-time resize when the bar retracts costs less than a permanent band of the wrong
colour under a hero. Reserve `svh` for content that must fit without scrolling from the
first frame (a splash, a login card) where a later resize would move a control under the
user's thumb.

**Keep the units consistent within one scroll system.** A pinned scrollytelling section
usually has a tall track and a full-height platter pinned inside it. If the track is
`940vh` and the platter is `100svh`, the browser is measuring them against two different
heights: on a phone where `vh` is 745px and `svh` is 660px, that track buys 1061 platter
heights instead of the 940 you wrote, and every act runs shorter than designed. Mixing
units silently retimes the whole sequence. See
[parallax.md](parallax.md) for the pinned pattern.

**Do not test this in a desktop browser.** All three units are equal when there are no
retractable bars, so the defect is invisible on the machine you are authoring on.

## Safe Areas: Handle the Notch

Modern phones have notches, rounded corners, and home indicators. Use `env()`:

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* With fallback */
.footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

**Enable viewport-fit** in your meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

## Responsive Images: Get It Right

### srcset with Width Descriptors

```html
<img
  src="hero-800.jpg"
  srcset="
    hero-400.jpg 400w,
    hero-800.jpg 800w,
    hero-1200.jpg 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Hero image"
>
```

**How it works**:
- `srcset` lists available images with their actual widths (`w` descriptors)
- `sizes` tells the browser how wide the image will display
- Browser picks the best file based on viewport width AND device pixel ratio

### Picture Element for Art Direction

When you need different crops/compositions (not just resolutions):

```html
<picture>
  <source media="(min-width: 768px)" srcset="wide.jpg">
  <source media="(max-width: 767px)" srcset="tall.jpg">
  <img src="fallback.jpg" alt="...">
</picture>
```

## Layout Adaptation Patterns

**Navigation**: Three stages—hamburger + drawer on mobile, horizontal compact on tablet, full with labels on desktop. **Tables**: Transform to cards on mobile using `display: block` and `data-label` attributes. **Progressive disclosure**: Use `<details>/<summary>` for content that can collapse on mobile.

## Generic font families resolve differently per platform

`system-ui`, `ui-serif`, `ui-sans-serif` and `ui-monospace` are instructions to the
platform, not fonts. `ui-serif` resolves to Georgia on Windows and to New York on iOS,
and New York is wider. A line count or a text width measured in a desktop browser through
`canvas.measureText` therefore under-reports what the same string does on a phone: three
lines on the machine that measured it, four on the device that renders it.

Two consequences. Measure with the font stack the target platform will actually resolve,
or measure on the device. And leave headroom in any layout whose height depends on a
generic family resolving to a particular metric, because it will not resolve the same way
twice. A device screenshot stays the instrument here; a computed measurement is a
shortcut that is only as good as the font it happened to load.

## Content squeezed between two fixed obstacles

A full-height section commonly has something fixed at each end: a fixed or sticky header
at the top, and a docked card, toolbar or cookie bar at the bottom. Centring content in
the viewport ignores both, so the content sits behind them.

Fixing only one end moves the defect rather than clearing it: pad the bottom to clear the
docked card and the content rises into the header instead. Measure both obstacles and
centre the content in what is left, not in the viewport. When the same content is
positioned in more than one place (an absolutely positioned variant inside its own grid,
say), apply the offset at every one of them, or the element will jump between the states
that were supposed to look identical.

## Testing: Don't Trust DevTools Alone

DevTools device emulation is useful for layout but misses:

- Actual touch interactions
- Real CPU/memory constraints
- Network latency patterns
- Font rendering differences
- Browser chrome/keyboard appearances

**Test on at least**: One real iPhone, one real Android, a tablet if relevant. Cheap Android phones reveal performance issues you'll never see on simulators.

---

**Avoid**: Desktop-first design. Device detection instead of feature detection. Separate mobile/desktop codebases. Ignoring tablet and landscape. Assuming all mobile devices are powerful.

---

## Container queries

Media queries respond to the viewport. Container queries respond to the component's own available width, so the same component adapts correctly in a sidebar, a grid cell, or a full-bleed section without viewport-specific overrides.

```css
.card-list { container-type: inline-size; container-name: cards; }

.card { display: grid; gap: 0.5rem; }

@container cards (min-width: 30rem) {
  .card { grid-template-columns: 8rem 1fr; } /* switch to horizontal when the container is wide */
}
```

Container query length units (`cqi`, `cqw`, `cqb`) size type and spacing against the container:

```css
.card h3 { font-size: clamp(1rem, 4cqi, 1.5rem); }
```

Use container queries for reusable components placed in varying contexts. Keep media queries for page-level layout (global breakpoints, overall grid). Feature support is baseline across current browsers; for old engines the unqueried base styles remain the fallback.
