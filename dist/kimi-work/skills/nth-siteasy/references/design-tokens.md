---
name: design-tokens
description: "The two-layer token architecture, the naming vocabulary that keeps two sessions consistent, and the mistakes that dissolve a token system. Load for /nth-siteasy tokens, /nth-siteasy build and /nth-siteasy extract."
version: 2.0.0
---

# Design Tokens

A model writes a token file without help. What it does not do on its own is keep the same vocabulary from one session to the next, refuse the third layer, or notice that a palette has quietly started composing colours with alpha. That is what this file carries: the architecture, the names, and the failure modes.

---

## The two-layer architecture

Every token system needs exactly two layers. Not one. Not three.

```
Primitive tokens          Semantic tokens              (Component tokens, optional)
--blue-500: #3b82f6   →   --color-primary: var(--blue-500)
--blue-600: #2563eb   →   --color-primary-hover: var(--blue-600)
--space-4: 1rem       →   --button-padding-x: var(--space-4)
```

**Primitives** are raw values, named by their value, never used directly in a component.
**Semantics** are named by role and purpose. These are what components consume.

The rule: components only ever read semantic tokens. Primitives are the palette, semantics are the vocabulary. This is what makes a rebrand one edit instead of a sweep, and it is what dark mode overrides (the semantic layer only, never the primitives).

## Name by role, never by value

```css
/* Wrong: tells you the value, not the purpose */
--blue-500: #3b82f6;
--16px: 1rem;
--gray-text: #6b7280;

/* Right: tells you when to use it */
--color-primary;
--space-md;
--color-text-secondary;
```

`--spacing-16` changes meaning the day the base unit changes. `--space-md` stays true.

Structure: `--[category]-[role]-[variant]-[state]`.

## The canonical vocabulary

Use these names. The point is not that they are the only good names, it is that two sessions, two projects and two contributors land on the same ones, and a design system whose names drift is a design system nobody trusts.

```css
--color-text-primary        --color-surface-base       --color-border-default
--color-text-secondary      --color-surface-raised     --color-border-focus
--color-text-disabled       --color-surface-overlay

--color-accent-default      --color-semantic-error
--color-accent-hover        --color-semantic-success
--color-accent-pressed      --color-semantic-warning

--space-xs   /* 4px */      --radius-sm      --shadow-sm
--space-sm   /* 8px */      --radius-md      --shadow-md
--space-md   /* 16px */     --radius-lg      --shadow-lg
--space-lg   /* 24px */     --radius-full
--space-xl   /* 32px */
--space-2xl  /* 48px */

--font-size-xs .. --font-size-2xl        --font-family-sans
--font-weight-regular / medium / bold    --font-family-mono

--duration-fast /* 100ms */  --duration-base /* 200ms */  --duration-slow /* 400ms */
--ease-out                   --ease-in-out
```

Spacing sits on the 4pt scale ([spatial-design.md](spatial-design.md)). Durations follow L-MOTION-1: feedback lands between 150 and 300ms, and 400ms is for a large surface, not a button.

## The shape of the file

Two blocks, in this order, and nothing else at the top level:

```css
:root {
  /* 1. Primitives: the palette. Nothing outside this file reads them. */
  --blue-500: oklch(0.62 0.17 250);
  --space-4: 1rem;

  /* 2. Semantics: the vocabulary. This is the only layer components touch. */
  --color-accent-default: var(--blue-500);
  --space-md: var(--space-4);
}

/* Dark mode re-points semantics only. Primitives never move. */
:root[data-theme="dark"] {
  --color-surface-base: var(--zinc-950);
  --color-text-primary: var(--zinc-50);
}
```

Set `color-scheme` or form controls and scrollbars stay light in a dark page:

```css
:root { color-scheme: light dark; }
:root[data-theme="dark"] { color-scheme: dark; }
```

The no-flash toggle, the elevation scale and the accent adjustments belong to [dark-mode-engineering.md](dark-mode-engineering.md).

## The optional third layer

Component tokens (`--button-padding-x: var(--space-md)`) earn their place only when a component needs to be themed independently of the rest. Adding them by default triples the surface for nothing.

When a token has to animate, register it so the browser interpolates a value instead of swapping a string:

```css
@property --progress { syntax: "<percentage>"; inherits: false; initial-value: 0%; }
```

## The mistakes that dissolve a token system

**Primitives used directly in components.** `background: var(--blue-500)` on a button. The semantic layer exists so a rebrand re-routes everything from one line; skip it and you edit every component.

**Naming by value.** See above. It is the most common one and it is silent until the day it is expensive.

**Too many semantic tokens.** `--color-button-primary-hover-background` is a component token wearing a semantic name. Use `--color-accent-hover` and let components compose.

**Dark mode as an inversion.** Dark mode is not `filter: invert()`. Lighter surfaces carry elevation instead of shadows, accents desaturate slightly, body weight drops a notch. The relationships change, they do not flip.

**Alpha everywhere.** Widespread `rgba()` or `oklch(x y z / a)` is usually an incomplete palette. Define an explicit colour per context: alpha over a coloured background produces a contrast ratio nobody predicted and the static contrast pass cannot judge.

**Magic numbers.** `padding: 7px 11px` is a value that escaped the scale. If the scale cannot express it, the scale is wrong or the design is.
