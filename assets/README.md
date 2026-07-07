# Assets

An original, license-clean starter library you can drop into a project. Every file here is original work, so there is no attribution burden and nothing to license-check before you ship.

For a live preview, where the animations run in real CSS and the templates open, open [`gallery.html`](gallery.html) in a browser. The library is text only (SVG, CSS and HTML), so it stays light in your clone.

## Icons (139)

Line icons on a 24 by 24 grid drawn with `currentColor`, so they take the surrounding text color. Browse [`icons/`](icons/), then inline the SVG or use `<img src="assets/icons/NAME.svg" width="24" height="24" alt="...">`.

## Patterns (20)

Tileable SVG backgrounds in [`patterns/`](patterns/). Set a `color` on the element to tint them, then `background-image: url("assets/patterns/NAME.svg")` with `background-repeat: repeat`.

## Illustrations (18)

Flat spot illustrations on a 400 by 300 canvas for empty, error and success states, in [`illustrations/`](illustrations/).

## Animations (34)

Self-contained loaders and micro-animations in [`animations/`](animations/), lightweight CSS and SVG that honor `prefers-reduced-motion`. Open [`gallery.html`](gallery.html) to see them run, or copy a file's `<style>` and markup. The set: bars-equalizer, bell-shake, bouncing-ball, checkbox-tick, circular-progress, clock-spinner, dots, dual-ring, ellipsis, error-cross, fade-in-up, gradient-ring, heart-beat, like-burst, orbit, pop-in, progress-bar, pulse-circle, pulse-dot, ripple, scroll-hint, skeleton-avatar, skeleton-list, skeleton-shimmer, skeleton-table, skeleton-text, spinner, square-flip, step-progress, success-check, toggle-switch, typing-indicator, warning-pulse, wave-hand.

## Templates (6)

Starting points you adapt, not drop in verbatim. Open each in [`gallery.html`](gallery.html) or from the table.

| Template | Files |
|----------|-------|
| [`contact`](templates/contact/index.html) | index.html, styles.css |
| [`dashboard`](templates/dashboard/index.html) | index.html, styles.css |
| [`landing`](templates/landing/index.html) | index.html, styles.css |
| [`pricing`](templates/pricing/index.html) | index.html, styles.css |
| [`react-card`](templates/react-card/) | Card.css, Card.jsx |
| [`react-modal`](templates/react-modal/) | Modal.css, Modal.jsx |

## Using an icon

```html
<img src="assets/icons/search.svg" width="24" height="24" alt="Search">
```

## Using a pattern

```css
.section {
  color: #64748b;                                  /* tints the pattern */
  background-image: url("assets/patterns/dots.svg");
  background-repeat: repeat;
}
```

## License

The icons, patterns, illustrations and animations are dedicated to the public domain under CC0 1.0: use, modify and redistribute them freely, no attribution required. The templates are released under the MIT License. See [`LICENSE`](LICENSE). Nothing here is derived from a third-party asset set.
