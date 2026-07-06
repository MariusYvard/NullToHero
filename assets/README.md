# Assets

An original, license-clean starter library you can drop into a project. Every file here is original work, so there is no attribution burden and nothing to license-check before you ship.

## Contents

- `icons/` 42 line icons on a 24 by 24 grid, 2px stroke, drawn with `currentColor` so they take the surrounding text color.
- `patterns/` 8 tileable SVG background patterns. Use as a CSS `background-image`; they inherit `currentColor` at low opacity, so set a `color` to tint them.
- `illustrations/` 6 flat spot illustrations (empty state, 404, success, error, empty search, welcome) on a 400 by 300 canvas.
- `animations/` 5 self-contained loaders and micro-animations (spinner, dots, progress bar, skeleton shimmer, drawing checkmark). The CSS ones honor `prefers-reduced-motion`.
- `templates/landing/` a semantic, responsive, accessible one-page landing skeleton (one HTML file plus one stylesheet, no build step, no external dependency).
- `templates/react-card/` a minimal accessible React card component with sensible defaults.

## Using an icon

Inline the SVG to inherit the text color, or reference it as an image.

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

The icons, patterns, illustrations and animations are dedicated to the public domain under CC0 1.0: use, modify and redistribute them freely, no attribution required. The two templates are released under the MIT License. See `LICENSE`. Nothing here is derived from a third-party asset set.
