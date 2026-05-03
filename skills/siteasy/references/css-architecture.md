# CSS Architecture

*Modern CSS features that fundamentally change how you write styles. Load for `/impeccable craft`, `/impeccable extract`, and any work touching a project's CSS foundation.*

---

## Cascade Layers (`@layer`)

Cascade layers give you explicit control over specificity. Styles in a lower-priority layer never override styles in a higher-priority layer, regardless of selector specificity.

```css
/* Define layer order once, at the top of your CSS entry point */
@layer reset, base, tokens, components, utilities, overrides;
```

Layer order determines priority: later layers win. `overrides` always beats `components`, even with a simple class selector vs a complex one.

```css
@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
}

@layer base {
  body { font-family: var(--font-family-sans); color: var(--color-text-primary); }
  a { color: var(--color-text-accent); }
}

@layer components {
  .button { padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); }
  .button--primary { background: var(--color-accent); }
}

@layer utilities {
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
  .truncate { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
}

@layer overrides {
  /* Context-specific overrides that intentionally beat component styles */
  .sidebar .button { font-size: var(--font-size-sm); }
}
```

**Why this matters:** Without layers, you fight specificity constantly. You end up with `!important`, doubled selectors (`.button.button`), or arbitrary specificity games. With layers, you declare intent: "utilities should always win over components" — and that just works.

**Third-party CSS:** Wrap it in a layer so it can't accidentally override your styles:
```css
@import url('third-party.css') layer(vendor);
@layer vendor, base, components; /* vendor now has lowest priority */
```

---

## `@scope`

Scope CSS to a subtree without increasing specificity. Solves the component isolation problem that BEM was invented for, natively.

```css
/* Styles apply only inside .card, with lower specificity than selectors outside */
@scope (.card) {
  h2 { font-size: var(--font-size-lg); }      /* Only affects h2 inside .card */
  p { color: var(--color-text-secondary); }
}

/* Scope with a lower boundary — stop at .card-footer */
@scope (.card) to (.card-footer) {
  p { margin-bottom: var(--space-sm); }       /* Doesn't affect .card-footer p */
}
```

```css
/* Donut scope: style everything except a subtree */
@scope (.page) to (.sidebar) {
  a { text-decoration: underline; }  /* Affects page links but not sidebar links */
}
```

**Practical pattern for design systems:**
```css
@scope (.button) {
  :scope { /* The .button element itself */ display: inline-flex; align-items: center; }
  .icon { width: 1em; height: 1em; }   /* .icon inside button, no specificity bloat */
  .label { font-weight: var(--font-weight-medium); }
}
```

---

## `:has()` — The Parent Selector

The most transformative CSS selector addition in years. Select an element based on its descendants.

```css
/* Card that has an image gets different padding */
.card:has(img) { padding: 0; }
.card:has(img) .card-body { padding: var(--space-md); }

/* Form group that has a checked radio gets highlighted */
.option:has(input[type="radio"]:checked) {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
}

/* Navigation item with an open submenu */
.nav-item:has(.submenu[aria-expanded="true"]) > .nav-link {
  color: var(--color-accent);
}

/* Label that follows an invalid input */
:has(input:invalid) label { color: var(--color-error); }

/* Grid layout based on number of children */
.grid:has(> :nth-child(4)) { grid-template-columns: repeat(2, 1fr); }
.grid:has(> :nth-child(7)) { grid-template-columns: repeat(3, 1fr); }

/* Figure with no figcaption gets different spacing */
figure:not(:has(figcaption)) { margin-bottom: var(--space-xl); }
```

**Quantity queries (replaces complex workarounds):**
```css
/* Style list when it has exactly 3 items */
ul:has(> li:nth-child(3):last-child) { /* exactly 3 */ }

/* Style list when it has more than 5 items */
ul:has(> li:nth-child(6)) { /* 6 or more */ }
```

---

## `@property` — Typed Custom Properties

Makes CSS variables typed, inheritable, and animatable:

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

@property --rotation {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

/* Now these can animate smoothly */
.progress {
  width: var(--progress);
  transition: --progress 400ms var(--ease-out);
}

/* Animating a conic gradient via --progress */
.ring {
  background: conic-gradient(
    var(--color-accent) var(--progress),
    var(--color-border-default) 0%
  );
  transition: --progress 600ms var(--ease-out);
}
```

Without `@property`, `transition` on a custom property snaps — the browser doesn't know it's a number/colour/angle. With `@property`, it interpolates correctly.

---

## CSS Nesting (Native)

No preprocessor needed. Nesting is now native CSS:

```css
.button {
  display: inline-flex;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-accent);
  border-radius: var(--radius-md);
  transition: background var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);

  /* Pseudo-classes */
  &:hover { background: var(--color-accent-hover); }
  &:active { transform: scale(0.97); background: var(--color-accent-pressed); }
  &:focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 3px;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Modifiers */
  &.button--ghost {
    background: transparent;
    border: 1px solid var(--color-border-default);
    color: var(--color-text-primary);
  }

  /* Children */
  & .icon {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
  }

  /* Media queries nested inside rule */
  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
  }
}
```

**Note:** The `&` is required for pseudo-classes and child selectors. Without `&`, a nested rule targets a descendant element.

---

## Specificity Utilities: `:is()`, `:where()`, `:not()`

### `:is()` — Forgiving selector list, takes the highest specificity of its arguments

```css
/* Instead of: h1 a, h2 a, h3 a, h4 a, h5 a, h6 a */
:is(h1, h2, h3, h4, h5, h6) a { color: inherit; }

/* Matches any of these states */
.button:is(:hover, :focus-visible) { background: var(--color-accent-hover); }
```

### `:where()` — Same as `:is()` but zero specificity. Great for resets and base styles.

```css
/* Zero specificity — easy to override without specificity wars */
:where(ul, ol) { list-style: none; padding: 0; margin: 0; }
:where(button) { cursor: pointer; border: none; background: none; }
:where(a) { color: inherit; text-decoration: none; }
```

### `:not()` — Accepts complex selectors

```css
/* Anything that isn't the last child gets a border */
li:not(:last-child) { border-bottom: 1px solid var(--color-border-default); }

/* Inputs that aren't disabled, readonly, or hidden */
input:not([disabled]):not([readonly]):not([type="hidden"]) {
  border: 1px solid var(--color-border-default);
}
```

---

## Logical Properties

Logical properties adapt to writing direction (LTR/RTL) and writing mode automatically. They're also more semantic.

| Physical | Logical | What it means |
|----------|---------|---------------|
| `margin-left` | `margin-inline-start` | Start of inline axis (left in LTR, right in RTL) |
| `margin-right` | `margin-inline-end` | End of inline axis |
| `margin-top` | `margin-block-start` | Start of block axis (top in horizontal writing) |
| `padding-left`, `padding-right` | `padding-inline` | Both inline sides |
| `padding-top`, `padding-bottom` | `padding-block` | Both block sides |
| `width` | `inline-size` | Size on inline axis |
| `height` | `block-size` | Size on block axis |
| `border-left` | `border-inline-start` | |
| `top`, `left` | `inset-block-start`, `inset-inline-start` | |
| `inset: 0` | Works the same | All four sides |

```css
/* Use logical properties by default */
.card {
  padding-inline: var(--space-md);
  padding-block: var(--space-lg);
  margin-inline: auto;
  max-inline-size: 65ch;
  border-inline-start: 2px solid var(--color-accent);
}
```

Even if you don't support RTL today, logical properties are more semantic and future-proof.

---

## Container Queries

Viewport queries for page layout, container queries for components. A component shouldn't know about the viewport — it should respond to its own container.

```css
/* Define a containment context */
.card-grid {
  container-type: inline-size;
  container-name: grid;          /* Optional: name for specific targeting */
}

/* Component styles based on its container's width */
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 120px 1fr;
  }
}

@container (min-width: 600px) {
  .card {
    grid-template-columns: 200px 1fr;
    gap: var(--space-lg);
  }
}

/* Named container query */
@container grid (min-width: 800px) {
  .card { border-radius: var(--radius-xl); }
}
```

---

## CSS Subgrid

Align elements to an ancestor's grid — solves the "card header alignment across a row" problem natively.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}

.card {
  display: grid;
  grid-row: span 3;              /* Span 3 rows of the parent grid */
  grid-template-rows: subgrid;   /* Adopt parent's row tracks */
}

/* Now all card headers, bodies, and footers align across the row */
.card-header { /* grid-row: 1 */ }
.card-body    { /* grid-row: 2 */ }
.card-footer  { /* grid-row: 3 */ }
```

---

## The `clamp()` Function

```css
/* clamp(minimum, preferred, maximum) */
font-size: clamp(1rem, 2.5vw, 1.5rem);

/* For spacing — fluid between breakpoints */
padding-inline: clamp(1rem, 5vw, 3rem);

/* Max-width: readable measure that adapts */
max-inline-size: clamp(45ch, 80%, 75ch);
```

**Rule:** Keep `max ≤ 2.5× min` for type. Beyond that, the size change is too dramatic.

**Don't use fluid type for app UI** — use fixed rem scales with breakpoint overrides. Fluid type is for marketing/editorial pages where content breathes.

---

## Modern Selector Patterns

```css
/* Style the first paragraph after a heading */
h2 + p { font-size: var(--font-size-lg); color: var(--color-text-secondary); }

/* Every element that isn't the first of its type */
.list-item ~ .list-item { border-top: 1px solid var(--color-border-default); }

/* Select based on attribute presence and value */
[data-state="open"] { ... }
[data-size^="sm"] { ... }    /* starts with */
[data-size$="xl"] { ... }    /* ends with */
[data-tags~="featured"] { ... }  /* contains word */

/* :nth-child with selectors (CSS Selectors Level 4) */
li:nth-child(2n of .featured) { /* every even .featured li */ }
```

---

## CSS Architecture Decision Tree

```
New project, greenfield:
  → @layer reset base tokens components utilities overrides
  → CSS custom properties for all tokens
  → Nesting native
  → Logical properties everywhere

Existing codebase with specificity hell:
  → Add @layer at entry point, put existing CSS in @layer legacy
  → Add new styles in @layer components (above legacy)
  → Gradually migrate

Component library:
  → @scope for isolation
  → @layer components for all component styles
  → Component-level custom properties for variants

Design system with themes:
  → @property for animatable tokens
  → Two-layer token architecture (primitive → semantic)
  → Dark mode via semantic layer override only
```
