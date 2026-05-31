---
name: dark-mode-engineering
description: "Complete technical reference for dark mode implementation. Load for /siteasy build, /siteasy tokens, and any theming work."
version: 1.6.0
---

# Dark Mode Engineering

*Complete technical reference for dark mode implementation. Load for `/siteasy build`, `/siteasy tokens`, and any theming work.*

---

## Dark Mode Is Not Inverted Light Mode

The most important thing to understand before writing a single line:

| Light mode | Dark mode |
|------------|-----------|
| Depth via shadow | Depth via **lighter** surfaces |
| Vibrant accent colors | Slightly **desaturated** accents |
| Dark text, light backgrounds | Light text, dark backgrounds |
| Font weight as-is | Body text one weight **lighter** |
| White background (`oklch 99%+`) | **Never pure black** — use `oklch 12–18%` |
| Saturated brand accents | Reduce chroma by 10–20% |

In dark mode, elevation is communicated by surface lightness — darker = deeper, lighter = elevated. The surface scale goes: base `12%` → raised `18%` → overlay `24%` → tooltip `30%`.

---

## The Token Architecture

Use semantic tokens only. Never duplicate: change the semantic layer, not the primitives.

```css
/* Primitives — defined once, never changed */
:root {
  --blue-400: oklch(65% 0.16 250);
  --blue-500: oklch(57% 0.18 250);
  --neutral-50:  oklch(98% 0.005 250);
  --neutral-900: oklch(17% 0.005 250);
  --neutral-950: oklch(12% 0.005 250);
}

/* Light mode semantic tokens */
:root {
  --color-surface-base:   var(--neutral-50);
  --color-text-primary:   var(--neutral-900);
  --color-accent:         var(--blue-500);
  --color-shadow:         oklch(0% 0 0 / 0.08);
}

/* Dark mode — override semantic layer only */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-base:   var(--neutral-950);
    --color-text-primary:   var(--neutral-50);
    --color-accent:         var(--blue-400);  /* Lighter + slightly less chroma */
    --color-shadow:         none;             /* No shadows in dark mode */
  }
}
```

---

## System Preference + Manual Toggle Without Flash

The flash problem: if the browser renders the page before reading the saved theme preference, users see a white flash before dark mode kicks in. The solution is a blocking script in `<head>`.

### Vanilla HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- BLOCKING script — must run before any CSS or rendering -->
  <script>
    (function() {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = saved || (prefersDark ? 'dark' : 'light');
      document.documentElement.dataset.theme = theme;
    })();
  </script>
  <!-- CSS loads after script — no flash -->
  <link rel="stylesheet" href="styles.css">
</head>
```

```css
/* Default: system preference */
@media (prefers-color-scheme: dark) {
  :root { /* dark tokens */ }
}

/* Manual override — beats media query */
:root[data-theme="light"] { /* force light tokens */ }
:root[data-theme="dark"]  { /* force dark tokens */ }
```

```js
// Toggle function
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}

// Remove saved preference (revert to system)
function clearTheme() {
  delete document.documentElement.dataset.theme;
  localStorage.removeItem('theme');
}
```

### Next.js App Router

Next.js Server Components render HTML on the server, so `localStorage` isn't available. Use a cookie instead, readable server-side, or the `next-themes` library which handles this correctly.

```tsx
// app/layout.tsx — inline script approach
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t) document.documentElement.dataset.theme = t;
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` prevents React from complaining when `data-theme` is set client-side before hydration.

---

## `color-scheme` Property

Without `color-scheme`, browser-native UI (form inputs, scrollbars, `<select>`, date pickers) stays light-themed even when your custom styles are dark. Set it.

```css
/* Adaptive */
:root { color-scheme: light dark; }

/* Force with manual toggle */
:root[data-theme="dark"]  { color-scheme: dark; }
:root[data-theme="light"] { color-scheme: light; }
```

Also useful for automatic `<canvas>` background and system dialog colors.

---

## Dark Mode Surface Elevation Scale

In light mode, shadows communicate depth. In dark mode, lighter surfaces = higher elevation.

```css
/* Light mode: shadows */
--color-surface-base:    oklch(99% 0.005 250);
--color-surface-subtle:  oklch(96% 0.005 250);
--color-surface-raised:  oklch(99% 0.005 250);  /* with shadow */
--shadow-raised:         0 4px 12px oklch(0% 0 0 / 0.08);

/* Dark mode: lighter = higher, no shadows */
@media (prefers-color-scheme: dark) {
  --color-surface-base:    oklch(12% 0.005 250);
  --color-surface-subtle:  oklch(15% 0.005 250);
  --color-surface-raised:  oklch(20% 0.005 250);
  --color-surface-overlay: oklch(25% 0.005 250);
  --shadow-raised:         none;
}
```

Modals, popovers, and dropdowns use `--color-surface-overlay` in dark mode — not a shadow, just a lighter surface.

---

## Accent Colors in Dark Mode

Accents need to be lighter and slightly less saturated in dark mode to:
1. Maintain contrast against dark surfaces (light accent on dark background vs. dark accent on light)
2. Avoid the "neon on dark" look that happens with high-chroma colours

```css
/* Light mode accent */
--color-accent: oklch(57% 0.18 250);  /* Relatively dark, high chroma */

/* Dark mode accent */
--color-accent: oklch(68% 0.15 250);  /* Lighter, slightly less chroma */
```

The lightness typically needs to go up by 8–15% in dark mode. Chroma comes down by 0.02–0.05. Test every accent at both modes.

---

## Images and Media in Dark Mode

### Photos and Illustrations

Reduce brightness slightly in dark mode to prevent photos from being blindingly bright against a dark UI:

```css
@media (prefers-color-scheme: dark) {
  img:not([data-no-dim]),
  video:not([data-no-dim]) {
    opacity: 0.85;
    filter: brightness(0.9);
  }
}
```

### SVG Icons

SVGs that use `currentColor` adapt automatically. SVGs with hardcoded fill colours need explicit dark overrides.

```css
/* SVG using currentColor — adapts automatically */
.icon { color: var(--color-text-secondary); }

/* SVG with hardcoded colors — override */
@media (prefers-color-scheme: dark) {
  .logo path[fill="#000"] { fill: #fff; }
  .logo path[fill="#1a1a2e"] { fill: #e2e8f0; }
}
```

Better: refactor hardcoded SVG colours to use CSS variables, then override the variables.

### `<canvas>` and WebGL

Canvas doesn't automatically adapt. Provide explicit theming:

```js
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const bgColor = isDark ? '#0f0f14' : '#ffffff';
ctx.fillStyle = bgColor;
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

Listen for system preference changes:
```js
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
```

---

## Typography in Dark Mode

Two adjustments:

**1. Reduce font weight for body text.** Light text on dark backgrounds appears heavier due to halation (light bleeding into adjacent dark areas). Drop body text one weight: `500 → 400`, `700 → 600`.

```css
@media (prefers-color-scheme: dark) {
  body { font-weight: calc(var(--font-weight-regular) - 100); }
  /* Or more explicitly: */
  body { font-weight: 350; }  /* If variable font supports it */
}
```

**2. Bump line-height and letter-spacing slightly.** Light text on dark backgrounds can feel cramped. Increase `line-height` by `0.05` and `letter-spacing` by `0.01em` for body text.

```css
@media (prefers-color-scheme: dark) {
  body {
    line-height: 1.65;  /* vs 1.6 in light */
    letter-spacing: 0.01em;
  }
}
```

---

## Third-Party Content in Dark Mode

`<iframe>`, embedded maps, social widgets, and comment systems usually don't respect your dark theme. Options:

**1. CSS filter approach (imprecise but easy):**
```css
@media (prefers-color-scheme: dark) {
  .embed-wrapper iframe {
    filter: invert(1) hue-rotate(180deg);
    /* Inverts colours and rotates hue back to preserve photos */
  }
}
```

**2. Use the iframe's own dark mode API** if it provides one (e.g., Disqus, YouTube embed). Check their docs.

**3. Contain the embed** — give it a light-mode background even in dark mode:
```css
@media (prefers-color-scheme: dark) {
  .third-party-container {
    background: white;
    border-radius: var(--radius-md);
    padding: var(--space-md);
  }
}
```

---

## Dark Mode Testing Checklist

- [ ] Text contrast meets WCAG AA at all levels (4.5:1 body, 3:1 large)
- [ ] Focus rings visible against dark surfaces
- [ ] Form inputs have `color-scheme: dark` applied — native controls look correct
- [ ] Shadows removed or replaced with surface elevation
- [ ] Accent colours lighter and less saturated — no neon look
- [ ] Body font weight slightly reduced
- [ ] Images slightly dimmed
- [ ] No pure black (`#000`) — use neutral-950 or similar
- [ ] SVG icons using `currentColor` (not hardcoded fills)
- [ ] Canvas/WebGL elements re-render for dark mode
- [ ] Third-party embeds handled (or contained)
- [ ] Flash-free: blocking theme script runs before CSS
- [ ] `color-scheme` set on `:root` — scrollbars and inputs look native
- [ ] Test on actual OLED screen — pure black can cause halo around bright elements
- [ ] Test with both system preference and manual toggle
- [ ] Test the transition between modes — no jarring flash if transitions are applied

---

## Testing in Browser

```js
// Force dark mode for testing in DevTools
// Chrome: Rendering panel → Emulate CSS media feature → prefers-color-scheme: dark

// Or override via JS temporarily
const meta = document.createElement('meta');
meta.name = 'color-scheme';
meta.content = 'dark';
document.head.appendChild(meta);
```

In Playwright:
```js
await page.emulateMedia({ colorScheme: 'dark' });
await page.screenshot({ path: 'dark.png' });
```
