---
name: dark-mode-engineering
description: "The values dark mode needs and the traps it sets: elevation by lightness, accent and weight adjustments, the flash, and third-party content. Load for /siteasy build, /siteasy tokens, and any theming work."
version: 2.0.0
---

# Dark Mode Engineering

The syntax of a media query needs no explanation. What a model does not produce on its own is the set of adjustments that separate a dark theme from an inverted light one, and it will happily ship a page whose only dark-mode work was swapping two colours. The numbers below are the file.

---

## Dark mode is not inverted light mode

| Light mode | Dark mode |
|------------|-----------|
| Depth via shadow | Depth via **lighter** surfaces |
| Vibrant accent colours | Slightly **desaturated** accents |
| Dark text, light backgrounds | Light text, dark backgrounds |
| Font weight as-is | Body text one weight **lighter** |
| White background (`oklch 99%+`) | **Never pure black**, use `oklch 12-18%` |
| Saturated brand accents | Reduce chroma by 10-20% |

Elevation is carried by surface lightness: darker is deeper, lighter is elevated. The scale runs base `12%`, raised `18%`, overlay `24%`, tooltip `30%`.

## Token architecture

Dark mode overrides the **semantic layer only**. Primitives never move: they are the palette, and a palette that changes with the theme is two palettes. Full architecture in [design-tokens.md](design-tokens.md).

```css
:root { color-scheme: light dark; }
:root[data-theme="dark"] { color-scheme: dark; }
```

Set `color-scheme` or native form controls, scrollbars and the caret stay light in a dark page. It is one line and it is the most commonly missed one.

## Surface elevation, with values

```css
/* Light: shadows carry depth */
--color-surface-base:    oklch(99% 0.005 250);
--color-surface-subtle:  oklch(96% 0.005 250);
--shadow-raised:         0 4px 12px oklch(0% 0 0 / 0.08);

/* Dark: lightness carries depth, shadows go away */
@media (prefers-color-scheme: dark) {
  --color-surface-base:    oklch(12% 0.005 250);
  --color-surface-subtle:  oklch(15% 0.005 250);
  --color-surface-raised:  oklch(20% 0.005 250);
  --color-surface-overlay: oklch(25% 0.005 250);
  --shadow-raised:         none;
}
```

Modals, popovers and dropdowns take `--color-surface-overlay` in dark mode. Not a shadow, a lighter surface. A drop shadow on a dark background is invisible, so a component that relies on one loses its edge entirely.

## Accents

Lighter and slightly less saturated, for two reasons: contrast against a dark surface runs the other way, and high chroma on dark reads as neon.

```css
--color-accent: oklch(57% 0.18 250);   /* light mode */
--color-accent: oklch(68% 0.15 250);   /* dark mode */
```

Lightness goes up by 8 to 15 percent, chroma comes down by 0.02 to 0.05. Test every accent in both modes: the pair that passes contrast in one can fail in the other.

## Typography

Two adjustments, both from halation, the way light text bleeds into an adjacent dark field and reads heavier and tighter than it is.

**Drop body weight one notch** (500 to 400, 700 to 600; a variable font can take 350).

**Open the spacing slightly**: line-height up by `0.05` (1.6 becomes 1.65), letter-spacing up by `0.01em`. Body text only, not headings.

## Images and third-party content

Photographs at full brightness glare against a dark page. Dim slightly (`filter: brightness(0.9)` or a `0.05` overlay), never invert. Illustrations and screenshots usually need a dark variant rather than a filter: `<picture>` with a `prefers-color-scheme` source.

SVG icons must use `currentColor`, not a hardcoded fill, or they stay black on black.

Embeds (`iframe`, maps, comment systems, social widgets) do not respect your theme. In order of preference: use the vendor's own dark parameter if one exists, contain the embed on a light card that looks deliberate, or as a last resort filter it, accepting that a CSS filter on an iframe is imprecise and will mangle photographs inside it.

Canvas and WebGL do not re-render on a theme change by themselves. Wire the listener or the scene stays in the old theme.

## Checklist

- [ ] Text contrast meets AA in both modes (4.5:1 body, 3:1 large)
- [ ] Focus rings visible against dark surfaces
- [ ] `color-scheme` set, so native controls and scrollbars follow
- [ ] Shadows replaced by surface elevation
- [ ] Accents lighter and less saturated, no neon
- [ ] Body weight reduced one notch, line-height and tracking opened
- [ ] Images dimmed rather than inverted, SVGs on `currentColor`
- [ ] No pure black; `oklch 12-18%` instead
- [ ] Third-party embeds handled or contained
- [ ] Canvas and WebGL re-render on theme change
- [ ] No flash: the theme decision runs before first paint (see below)
- [ ] Tested on a real OLED screen, where pure black haloes around bright elements
- [ ] Tested with system preference AND manual toggle, and the transition between them

## The flash, and the only reliable fix

A theme read from storage in a normal script runs after first paint, so the page shows light for a frame and then snaps. The fix is a small blocking script in `<head>`, before any stylesheet, that sets the attribute:

```html
<script>
  const t = localStorage.getItem("theme")
    ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = t;
</script>
```

It must be inline and blocking. Deferred, async or bundled, it runs too late and the flash returns. This is the one place in a build where a render-blocking script is correct.

Suppress transitions during the switch, or every colour token animates at once and the toggle looks broken:

```css
.theme-switching * { transition: none !important; }
```

## Testing in browser

Chrome DevTools, Rendering panel, "Emulate CSS media feature: prefers-color-scheme". In Playwright: `await page.emulateMedia({ colorScheme: "dark" })`.
