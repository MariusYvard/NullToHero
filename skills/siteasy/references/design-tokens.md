---
name: design-tokens
description: "Reference for /siteasy tokens, /siteasy extract, and /siteasy document. A token system is the foundation of every maintainable design - build it right once, and every surface stays consistent."
version: 1.9.0
---

# Design Tokens

*Reference for `/siteasy tokens`, `/siteasy extract`, and `/siteasy document`. A token system is the foundation of every maintainable design — build it right once, and everything else follows.*

---

## The Two-Layer Architecture

Every token system needs exactly two layers. Not one. Not three.

```
Primitive tokens     →     Semantic tokens     →     (Component tokens, optional)
--blue-500: #3b82f6       --color-primary: var(--blue-500)
--blue-600: #2563eb       --color-primary-hover: var(--blue-600)
--space-4: 1rem           --button-padding-x: var(--space-4)
```

**Layer 1 — Primitives:** Raw values. Named by their value. Never used directly in components.
**Layer 2 — Semantic:** Named by their role and purpose. These are what components use.

The rule: components only consume semantic tokens. Primitives are the palette, semantics are the vocabulary.

---

## Naming Conventions

### By role, not value

```css
/* Wrong — tells you the value, not the purpose */
--blue-500: #3b82f6;
--16px: 1rem;
--gray-text: #6b7280;

/* Right — tells you when to use it */
--color-primary: ...;
--space-md: ...;
--color-text-secondary: ...;
```

### Namespace structure

```
--[category]-[role]-[variant]-[state]
```

Examples:
```css
--color-text-primary
--color-text-secondary
--color-text-disabled
--color-surface-base
--color-surface-raised
--color-surface-overlay
--color-border-default
--color-border-focus
--color-accent-default
--color-accent-hover
--color-accent-pressed
--color-semantic-error
--color-semantic-success
--color-semantic-warning
--space-xs        /* 4px */
--space-sm        /* 8px */
--space-md        /* 16px */
--space-lg        /* 24px */
--space-xl        /* 32px */
--space-2xl       /* 48px */
--radius-sm
--radius-md
--radius-lg
--radius-full
--shadow-sm
--shadow-md
--shadow-lg
--font-size-xs
--font-size-sm
--font-size-base
--font-size-lg
--font-size-xl
--font-size-2xl
--font-weight-regular
--font-weight-medium
--font-weight-bold
--font-family-sans
--font-family-mono
--duration-fast   /* 100ms */
--duration-base   /* 200ms */
--duration-slow   /* 400ms */
--ease-out
--ease-in-out
```

---

## Full Token File Structure

```css
/* ============================================================
   PRIMITIVES — never use these in components directly
   ============================================================ */
:root {
  /* Color palette */
  --blue-50:  oklch(97% 0.01 250);
  --blue-100: oklch(93% 0.03 250);
  --blue-200: oklch(87% 0.06 250);
  --blue-300: oklch(79% 0.10 250);
  --blue-400: oklch(68% 0.14 250);
  --blue-500: oklch(57% 0.18 250);
  --blue-600: oklch(48% 0.18 250);
  --blue-700: oklch(40% 0.16 250);
  --blue-800: oklch(32% 0.12 250);
  --blue-900: oklch(24% 0.08 250);

  /* Neutrals — always slightly tinted toward brand hue */
  --neutral-0:   oklch(100% 0.005 250);
  --neutral-50:  oklch(98%  0.005 250);
  --neutral-100: oklch(95%  0.005 250);
  --neutral-200: oklch(90%  0.007 250);
  --neutral-300: oklch(82%  0.007 250);
  --neutral-400: oklch(70%  0.008 250);
  --neutral-500: oklch(57%  0.008 250);
  --neutral-600: oklch(46%  0.008 250);
  --neutral-700: oklch(36%  0.007 250);
  --neutral-800: oklch(26%  0.005 250);
  --neutral-900: oklch(17%  0.005 250);
  --neutral-950: oklch(12%  0.005 250);

  /* Spacing scale — 4pt base */
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-24: 6rem;      /* 96px */
}

/* ============================================================
   SEMANTIC — light mode (default)
   ============================================================ */
:root {
  /* Text */
  --color-text-primary:   var(--neutral-900);
  --color-text-secondary: var(--neutral-600);
  --color-text-tertiary:  var(--neutral-400);
  --color-text-disabled:  var(--neutral-300);
  --color-text-inverse:   var(--neutral-0);
  --color-text-accent:    var(--blue-600);

  /* Surfaces */
  --color-surface-base:    var(--neutral-0);
  --color-surface-subtle:  var(--neutral-50);
  --color-surface-raised:  var(--neutral-0);
  --color-surface-overlay: var(--neutral-0);

  /* Borders */
  --color-border-default: var(--neutral-200);
  --color-border-strong:  var(--neutral-300);
  --color-border-focus:   var(--blue-500);

  /* Accent / Primary */
  --color-accent:          var(--blue-500);
  --color-accent-hover:    var(--blue-600);
  --color-accent-pressed:  var(--blue-700);
  --color-accent-subtle:   var(--blue-50);
  --color-accent-fg:       var(--neutral-0);

  /* Semantic states */
  --color-error:          oklch(53% 0.22 25);
  --color-error-subtle:   oklch(96% 0.04 25);
  --color-success:        oklch(52% 0.18 145);
  --color-success-subtle: oklch(96% 0.04 145);
  --color-warning:        oklch(72% 0.18 75);
  --color-warning-subtle: oklch(97% 0.04 75);

  /* Spacing aliases */
  --space-xs:  var(--space-1);
  --space-sm:  var(--space-2);
  --space-md:  var(--space-4);
  --space-lg:  var(--space-6);
  --space-xl:  var(--space-8);
  --space-2xl: var(--space-12);

  /* Radius */
  --radius-sm:   0.25rem;
  --radius-md:   0.5rem;
  --radius-lg:   0.75rem;
  --radius-xl:   1rem;
  --radius-2xl:  1.5rem;
  --radius-full: 9999px;

  /* Shadows — tinted toward surface */
  --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.05);
  --shadow-md: 0 4px 12px oklch(0% 0 0 / 0.08), 0 1px 3px oklch(0% 0 0 / 0.04);
  --shadow-lg: 0 16px 32px oklch(0% 0 0 / 0.10), 0 4px 8px oklch(0% 0 0 / 0.04);

  /* Typography */
  --font-family-sans: 'Geist', system-ui, sans-serif;
  --font-family-mono: 'Geist Mono', 'JetBrains Mono', monospace;
  --font-size-xs:   0.75rem;
  --font-size-sm:   0.875rem;
  --font-size-base: 1rem;
  --font-size-lg:   1.25rem;
  --font-size-xl:   1.5rem;
  --font-size-2xl:  2rem;
  --font-size-3xl:  3rem;
  --font-weight-regular: 400;
  --font-weight-medium:  500;
  --font-weight-bold:    700;
  --line-height-tight:  1.2;
  --line-height-base:   1.5;
  --line-height-loose:  1.75;

  /* Motion */
  --duration-fast:    100ms;
  --duration-base:    200ms;
  --duration-slow:    400ms;
  --ease-out:     cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out:  cubic-bezier(0.65, 0, 0.35, 1);

  /* Z-index scale — semantic names only */
  --z-dropdown:  100;
  --z-sticky:    200;
  --z-overlay:   300;
  --z-modal:     400;
  --z-toast:     500;
  --z-tooltip:   600;
}

/* ============================================================
   SEMANTIC — dark mode override
   Redefine semantic layer only. Never redefine primitives.
   ============================================================ */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary:   var(--neutral-50);
    --color-text-secondary: var(--neutral-400);
    --color-text-tertiary:  var(--neutral-600);
    --color-text-disabled:  var(--neutral-700);
    --color-text-inverse:   var(--neutral-950);

    --color-surface-base:    var(--neutral-950);
    --color-surface-subtle:  var(--neutral-900);
    --color-surface-raised:  var(--neutral-800);
    --color-surface-overlay: var(--neutral-900);

    --color-border-default:  var(--neutral-800);
    --color-border-strong:   var(--neutral-700);

    --color-accent:          var(--blue-400);
    --color-accent-hover:    var(--blue-300);
    --color-accent-subtle:   oklch(22% 0.04 250);

    /* Shadows: use lighter surfaces, not shadows, for elevation in dark mode */
    --shadow-sm: none;
    --shadow-md: none;
    --shadow-lg: none;
  }
}
```

---

## Manual Dark Mode Toggle

When supporting both system preference and a manual toggle:

```css
/* System preference (default) */
@media (prefers-color-scheme: dark) {
  :root { /* dark tokens */ }
}

/* Manual override — class applied to <html> */
:root[data-theme="dark"]  { /* dark tokens */ }
:root[data-theme="light"] { /* light tokens — overrides system dark */ }
```

```js
// On mount: read saved preference, fall back to system
const saved = localStorage.getItem('theme');
if (saved) document.documentElement.dataset.theme = saved;

// Toggle
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}
```

For SSR: inject a blocking script in `<head>` (before any CSS) to apply the saved theme before first paint — this prevents the light flash:
```html
<script>
  const t = localStorage.getItem('theme');
  if (t) document.documentElement.dataset.theme = t;
</script>
```

---

## Component-Level Tokens (Optional Third Layer)

Only when a component needs many tokens and lives in a design system. Not for every component.

```css
/* Button-specific tokens */
.button {
  --button-height: 2.25rem;
  --button-padding-x: var(--space-md);
  --button-radius: var(--radius-md);
  --button-font-size: var(--font-size-sm);
  --button-bg: var(--color-accent);
  --button-fg: var(--color-accent-fg);
  --button-bg-hover: var(--color-accent-hover);

  height: var(--button-height);
  padding-inline: var(--button-padding-x);
  border-radius: var(--button-radius);
  font-size: var(--button-font-size);
  background: var(--button-bg);
  color: var(--button-fg);
}

/* Size variant overrides component tokens only */
.button[data-size="sm"] {
  --button-height: 1.75rem;
  --button-padding-x: var(--space-sm);
  --button-font-size: var(--font-size-xs);
}
```

---

## Typed Custom Properties with `@property`

`@property` makes CSS custom properties typed and animatable:

```css
@property --color-accent {
  syntax: '<color>';
  inherits: true;
  initial-value: oklch(57% 0.18 250);
}

@property --progress {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

/* Now --progress can be animated smoothly */
.progress-bar {
  width: var(--progress);
  transition: --progress 300ms var(--ease-out);
}
```

Without `@property`, CSS can't interpolate custom property values in transitions — they snap instead of animating.

---

## Common Mistakes

**Using primitives directly in components.** `background: var(--blue-500)` in a button. When you change the brand colour, you update the primitive — the semantic token re-routes everything. If you skipped the semantic layer, you update every component individually.

**Naming by value.** `--spacing-16` changes meaning if you change the base unit. `--space-md` stays accurate.

**Too many semantic tokens.** Don't create `--color-button-primary-hover-background`. Use `--color-accent-hover`. Components compose tokens; they don't each need their own.

**Dark mode that inverts everything.** Dark mode is not `filter: invert()`. Dark mode uses lighter surfaces for elevation (not shadows), slightly desaturated accents, and reduced font weight for body text. The relationship between colours changes — it's not a flip.

**Alpha everywhere.** Heavy `rgba()` / `oklch(x y z / alpha)` usually means an incomplete palette. Define explicit colours for each context instead of composing with opacity at usage time. Alpha creates unpredictable contrast on coloured backgrounds.

**Missing the `color-scheme` property.** Without it, form controls and scrollbars don't adapt to dark mode:
```css
:root { color-scheme: light dark; }
/* or for forced: */
:root[data-theme="dark"] { color-scheme: dark; }
```
