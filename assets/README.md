# Assets

An original, license-clean starter library you can drop into a project. Every file here is original work, so there is no attribution burden and nothing to license-check before you ship.

The previews below render on GitHub. For the live version, where the animations run in real CSS and the templates open, open [`gallery.html`](gallery.html) in a browser.

## Icons (139)

Line icons on a 24 by 24 grid drawn with `currentColor`, so they take the surrounding text color. Inline the SVG, or use `<img src="assets/icons/NAME.svg" width="24" height="24" alt="...">`.

<img src="previews/icons.png" alt="All icons" width="880">

## Patterns (20)

Tileable SVG backgrounds. Set a `color` on the element to tint them, then `background-image: url("assets/patterns/NAME.svg")` with `background-repeat: repeat`.

<img src="previews/patterns.png" alt="All patterns" width="820">

## Illustrations (18)

Flat spot illustrations on a 400 by 300 canvas for empty, error and success states.

<img src="previews/illustrations.png" alt="All illustrations" width="820">

## Animations (34)

Self-contained loaders and micro-animations. The GIFs below are previews; the shipped files are lightweight CSS and SVG that honor `prefers-reduced-motion`. Open [`gallery.html`](gallery.html) to see them run in real CSS, or copy a file's `<style>` and markup.

<table>
<tr><td align="center"><img src="previews/animations/bars-equalizer.gif" width="84" alt="bars-equalizer"><br><sub>bars-equalizer</sub></td><td align="center"><img src="previews/animations/bell-shake.gif" width="84" alt="bell-shake"><br><sub>bell-shake</sub></td><td align="center"><img src="previews/animations/bouncing-ball.gif" width="84" alt="bouncing-ball"><br><sub>bouncing-ball</sub></td><td align="center"><img src="previews/animations/checkbox-tick.gif" width="84" alt="checkbox-tick"><br><sub>checkbox-tick</sub></td><td align="center"><img src="previews/animations/circular-progress.gif" width="84" alt="circular-progress"><br><sub>circular-progress</sub></td><td align="center"><img src="previews/animations/clock-spinner.gif" width="84" alt="clock-spinner"><br><sub>clock-spinner</sub></td></tr>
<tr><td align="center"><img src="previews/animations/dots.gif" width="84" alt="dots"><br><sub>dots</sub></td><td align="center"><img src="previews/animations/dual-ring.gif" width="84" alt="dual-ring"><br><sub>dual-ring</sub></td><td align="center"><img src="previews/animations/ellipsis.gif" width="84" alt="ellipsis"><br><sub>ellipsis</sub></td><td align="center"><img src="previews/animations/error-cross.gif" width="84" alt="error-cross"><br><sub>error-cross</sub></td><td align="center"><img src="previews/animations/fade-in-up.gif" width="84" alt="fade-in-up"><br><sub>fade-in-up</sub></td><td align="center"><img src="previews/animations/gradient-ring.gif" width="84" alt="gradient-ring"><br><sub>gradient-ring</sub></td></tr>
<tr><td align="center"><img src="previews/animations/heart-beat.gif" width="84" alt="heart-beat"><br><sub>heart-beat</sub></td><td align="center"><img src="previews/animations/like-burst.gif" width="84" alt="like-burst"><br><sub>like-burst</sub></td><td align="center"><img src="previews/animations/orbit.gif" width="84" alt="orbit"><br><sub>orbit</sub></td><td align="center"><img src="previews/animations/pop-in.gif" width="84" alt="pop-in"><br><sub>pop-in</sub></td><td align="center"><img src="previews/animations/progress-bar.gif" width="84" alt="progress-bar"><br><sub>progress-bar</sub></td><td align="center"><img src="previews/animations/pulse-circle.gif" width="84" alt="pulse-circle"><br><sub>pulse-circle</sub></td></tr>
<tr><td align="center"><img src="previews/animations/pulse-dot.gif" width="84" alt="pulse-dot"><br><sub>pulse-dot</sub></td><td align="center"><img src="previews/animations/ripple.gif" width="84" alt="ripple"><br><sub>ripple</sub></td><td align="center"><img src="previews/animations/scroll-hint.gif" width="84" alt="scroll-hint"><br><sub>scroll-hint</sub></td><td align="center"><img src="previews/animations/skeleton-avatar.gif" width="84" alt="skeleton-avatar"><br><sub>skeleton-avatar</sub></td><td align="center"><img src="previews/animations/skeleton-list.gif" width="84" alt="skeleton-list"><br><sub>skeleton-list</sub></td><td align="center"><img src="previews/animations/skeleton-shimmer.gif" width="84" alt="skeleton-shimmer"><br><sub>skeleton-shimmer</sub></td></tr>
<tr><td align="center"><img src="previews/animations/skeleton-table.gif" width="84" alt="skeleton-table"><br><sub>skeleton-table</sub></td><td align="center"><img src="previews/animations/skeleton-text.gif" width="84" alt="skeleton-text"><br><sub>skeleton-text</sub></td><td align="center"><img src="previews/animations/spinner.gif" width="84" alt="spinner"><br><sub>spinner</sub></td><td align="center"><img src="previews/animations/square-flip.gif" width="84" alt="square-flip"><br><sub>square-flip</sub></td><td align="center"><img src="previews/animations/step-progress.gif" width="84" alt="step-progress"><br><sub>step-progress</sub></td><td align="center"><img src="previews/animations/success-check.gif" width="84" alt="success-check"><br><sub>success-check</sub></td></tr>
<tr><td align="center"><img src="previews/animations/toggle-switch.gif" width="84" alt="toggle-switch"><br><sub>toggle-switch</sub></td><td align="center"><img src="previews/animations/typing-indicator.gif" width="84" alt="typing-indicator"><br><sub>typing-indicator</sub></td><td align="center"><img src="previews/animations/warning-pulse.gif" width="84" alt="warning-pulse"><br><sub>warning-pulse</sub></td><td align="center"><img src="previews/animations/wave-hand.gif" width="84" alt="wave-hand"><br><sub>wave-hand</sub></td></tr>
</table>

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
