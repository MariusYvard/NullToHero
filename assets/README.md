# Assets

An original, license-clean starter library you can drop into a project. Every file here is original work, so there is no attribution burden and nothing to license-check before you ship.

## Contents

- `icons/` 139 line icons on a 24 by 24 grid, 2px stroke, drawn with `currentColor` so they take the surrounding text color.
- `patterns/` 20 tileable SVG background patterns. Use as a CSS `background-image`; they inherit `currentColor` at low opacity, so set a `color` to tint them.
- `illustrations/` 18 flat spot illustrations (empty states, errors, success, 404, offline, maintenance, team, celebration, payment and more) on a 400 by 300 canvas.
- `animations/` 34 self-contained loaders and micro-animations: spinners and rings, progress, skeletons, feedback (checks, hearts, toggles) and attention cues (typing dots, pulsing badges, scroll hints). The CSS ones honor `prefers-reduced-motion`.
- `templates/` 6 starters. Four HTML and CSS pages (`landing`, `pricing`, `dashboard`, `contact`) and two React components (`react-card`, `react-modal`).

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

## Using an animation

Each animation is a standalone file. Open the `.html` ones directly, or copy the `<style>` and markup into your page. The `.svg` ones can be used inline or in an `<img>`.

## License

The icons, patterns, illustrations and animations are dedicated to the public domain under CC0 1.0: use, modify and redistribute them freely, no attribution required. The templates are released under the MIT License. See `LICENSE`. Nothing here is derived from a third-party asset set.
