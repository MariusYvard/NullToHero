---
name: accessibility-engineering
description: "Deep reference for /siteasy audit, /siteasy harden, and any build work. Accessibility is not a checklist - it's a design constraint that improves every interface."
version: 1.6.0
---

# Accessibility Engineering

*Deep reference for `/siteasy audit`, `/siteasy harden`, and any build work. Accessibility is not a checklist — it's a design constraint that improves every interface.*

---

## The Mental Model

Accessibility means the interface works for people who navigate differently. Four categories:

- **Visual** — blind (screen readers), low vision (zoom, high contrast), colour blind
- **Motor** — keyboard-only, switch access, voice control (Dragon, Voice Control)
- **Cognitive** — attention, memory, reading difficulties
- **Auditory** — captions, transcripts, visual alternatives to sound

WCAG 2.1 has three levels: A (minimum), AA (standard target), AAA (enhanced). Target AA for everything. AAA where it's achievable without architectural cost.

---

## ARIA: Use Only What's Needed

ARIA overrides the accessibility tree. Bad ARIA is worse than no ARIA.

**The five rules of ARIA:**
1. Use semantic HTML first. `<button>` beats `<div role="button">` every time.
2. Never change native semantics unless necessary.
3. All interactive ARIA controls must work with keyboard.
4. Never hide focusable elements (`aria-hidden="true"` on a focused element).
5. All interactive elements must have an accessible name.

### The name triangle

Every interactive element needs an accessible name. Three ways, in priority order:

| Method | When to use | Example |
|--------|------------|---------|
| `aria-labelledby` | Name comes from visible text on page | `<input aria-labelledby="label-id">` |
| `<label>` | Standard form fields | `<label for="email">Email</label>` |
| `aria-label` | No visible label possible (icon buttons, close buttons) | `<button aria-label="Close dialog">×</button>` |
| `title` | Last resort. Not announced by all screen readers. | Avoid |

**`aria-describedby`** is for supplementary description (hint text, error messages) — it's announced after the name and role, not instead of it.

```html
<!-- Correct: label + description -->
<label for="pw">Password</label>
<input id="pw" type="password"
       aria-describedby="pw-hint pw-error">
<p id="pw-hint">Minimum 8 characters</p>
<p id="pw-error" role="alert" hidden>Too short</p>
```

---

## Keyboard Interaction Patterns by Component

### Buttons and Links

- `<button>` — activates on Space and Enter
- `<a href>` — activates on Enter only
- Never use `<div>` or `<span>` for interactive elements. If you must: `role="button"`, `tabindex="0"`, handle both `click` and `keydown` (Enter + Space).

### Modal / Dialog

```html
<dialog aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">Confirm deletion</h2>
  <p id="dialog-desc">This cannot be undone.</p>
  <button autofocus>Cancel</button>
  <button>Delete</button>
</dialog>
```

- Use native `<dialog>` — it handles focus trap and Escape natively via `showModal()`
- On open: move focus to first interactive element or the dialog itself
- On close: return focus to the element that triggered the dialog
- Escape must close
- Clicks outside modal-backdrop should close (not required, but expected)

**Focus trap (if not using `<dialog>`):**
```js
const focusable = modal.querySelectorAll(
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
const first = focusable[0];
const last = focusable[focusable.length - 1];

modal.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
});
```

### Dropdown Menu

```html
<button aria-haspopup="menu" aria-expanded="false" aria-controls="menu-id">
  Options
</button>
<ul id="menu-id" role="menu" hidden>
  <li role="menuitem" tabindex="-1">Edit</li>
  <li role="menuitem" tabindex="-1">Delete</li>
</ul>
```

Keyboard behaviour:
- `Enter`/`Space` on trigger: open menu, focus first item
- `ArrowDown`/`ArrowUp`: navigate items (roving tabindex or focus management)
- `Home`/`End`: jump to first/last item
- `Escape`: close, return focus to trigger
- `Tab`: close menu (don't trap tab in menus)
- Printable character: jump to item starting with that character

### Roving Tabindex

For component groups where one item is tabbable at a time (tabs, toolbars, radio groups):

```js
function rovingTabindex(container) {
  const items = [...container.querySelectorAll('[role="tab"]')];
  let current = 0;

  items.forEach((item, i) => {
    item.tabIndex = i === 0 ? 0 : -1;
    item.addEventListener('keydown', e => {
      const map = {
        ArrowRight: 1, ArrowLeft: -1,
        Home: -current, End: items.length - 1 - current
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      items[current].tabIndex = -1;
      current = (current + map[e.key] + items.length) % items.length;
      items[current].tabIndex = 0;
      items[current].focus();
    });
  });
}
```

### Accordion

```html
<button aria-expanded="false" aria-controls="panel-1" id="btn-1">
  Section title
</button>
<div id="panel-1" role="region" aria-labelledby="btn-1" hidden>
  Content
</div>
```

- Toggle `aria-expanded` and `hidden` together
- `role="region"` only if the content is a landmark worth navigating to. Omit for simple accordions.

### Combobox / Autocomplete

```html
<label for="search">Search</label>
<input id="search" type="text" role="combobox"
       aria-autocomplete="list"
       aria-expanded="false"
       aria-controls="results"
       aria-activedescendant="">
<ul id="results" role="listbox" hidden>
  <li role="option" id="opt-1">Result one</li>
</ul>
```

- `aria-activedescendant` points to the currently highlighted option ID
- Update it as the user arrows through results
- Don't move actual focus to the list — keep it on the input

### Toast / Alert

For dynamic content injected after page load, use live regions:

```html
<!-- Polite: announced after current speech finishes -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="toasts"></div>

<!-- Assertive: interrupts immediately. Only for errors. -->
<div role="alert">Something went wrong</div>
```

Inject messages into the live region container — don't toggle visibility on the container itself (some screen readers won't announce it). Create and append a new element each time.

---

## Focus Rings: The Correct Implementation

```css
/* Remove default only where you replace it */
:focus { outline: none; }

/* Show ring only for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
  border-radius: 3px;
}
```

**Requirements:**
- Minimum 3:1 contrast against adjacent colours
- At least 2px thick
- Must be visible against both light and dark backgrounds — use two-colour outline or box-shadow trick:

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  box-shadow: 0 0 0 4px var(--color-accent-muted); /* halo for contrast */
}
```

---

## Skip Links

Every page with navigation must have a skip link. Position off-screen, show on focus:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<nav>...</nav>
<main id="main-content" tabindex="-1">...</main>
```

```css
.skip-link {
  position: absolute;
  transform: translateY(-100%);
  left: 1rem;
  top: 1rem;
  padding: 0.5rem 1rem;
  background: var(--color-accent);
  color: white;
  z-index: 9999;
}
.skip-link:focus {
  transform: translateY(0);
}
```

---

## Semantic HTML Reference

Use the right element and most ARIA becomes unnecessary.

| Element | Role conveyed |
|---------|--------------|
| `<main>` | `role="main"` — one per page |
| `<nav>` | `role="navigation"` — label with `aria-label` if multiple |
| `<header>` | `role="banner"` when direct child of `<body>` |
| `<footer>` | `role="contentinfo"` when direct child of `<body>` |
| `<aside>` | `role="complementary"` |
| `<section>` | Landmark only with an accessible name (`aria-labelledby`) |
| `<article>` | Self-contained content (cards, posts) |
| `<figure>` + `<figcaption>` | Image with caption |
| `<details>` + `<summary>` | Native disclosure widget |
| `<dialog>` | Modal with built-in focus trap |
| `<output>` | Live region for calculated results |

---

## Images

```html
<!-- Informative image -->
<img src="chart.png" alt="Revenue grew 40% in Q3, driven by enterprise segment">

<!-- Decorative image — empty alt, not omitted -->
<img src="decoration.png" alt="">

<!-- Functional image (button/link) — describe the action -->
<a href="/home"><img src="logo.png" alt="Acme — go to homepage"></a>

<!-- Complex image (chart, diagram) -->
<figure>
  <img src="diagram.png" alt="System architecture" aria-describedby="diagram-desc">
  <figcaption id="diagram-desc">Three services communicate via a message queue...</figcaption>
</figure>
```

**SVG accessibility:**
```html
<svg role="img" aria-labelledby="svg-title svg-desc">
  <title id="svg-title">Upward trend</title>
  <desc id="svg-desc">Monthly users grew from 1k to 8k over 6 months</desc>
  <!-- paths -->
</svg>

<!-- Decorative SVG -->
<svg aria-hidden="true" focusable="false">...</svg>
```

Always add `focusable="false"` on SVGs in IE/Edge — they receive focus by default.

---

## Forms

- **Label above input, always.** Placeholder is not a label — it disappears on input.
- **Validate on blur**, not on keystroke. Don't show errors until the user leaves a field.
- **Error messages below the field**, connected with `aria-describedby`.
- **Error summary at top** of form on submit failure — move focus to it.
- **Required fields**: use `required` attribute AND visible indicator. Don't rely on colour alone. Announce via `aria-required="true"` or native `required`.
- **Autocomplete attributes**: `autocomplete="email"`, `"name"`, `"current-password"` etc. — required for WCAG 1.3.5.

```html
<div>
  <label for="email">Email <span aria-hidden="true">*</span></label>
  <input id="email" type="email" required autocomplete="email"
         aria-required="true" aria-describedby="email-error">
  <p id="email-error" role="alert" hidden>Enter a valid email address</p>
</div>
```

---

## Colour Contrast

| Content | AA minimum | AAA |
|---------|-----------|-----|
| Body text (< 18px regular, < 14px bold) | 4.5:1 | 7:1 |
| Large text (≥ 18px regular, ≥ 14px bold) | 3:1 | 4.5:1 |
| UI components, icons, focus rings | 3:1 | — |
| Decorative elements | None | — |

Use [whocanuse.com](https://whocanuse.com) to test across vision types, not just contrast ratios. A colour combination can pass WCAG and still fail for deuteranopia.

---

## Motion and Vestibular

```css
@media (prefers-reduced-motion: reduce) {
  /* Keep opacity/color transitions that aid comprehension */
  .card { transition: opacity 150ms ease; }

  /* Remove movement */
  .card { animation: none; transform: none; }
}
```

Reduced motion means fewer and gentler animations — not zero. Crossfades are fine. Position changes and scale animations are not.

```jsx
const shouldReduce = useReducedMotion();
const transition = shouldReduce
  ? { duration: 0.01 }
  : { type: 'spring', duration: 0.5, bounce: 0.2 };
```

---

## Testing

### Keyboard test (do this on every component)

1. Tab to every interactive element — can you reach it?
2. Activate every button, link, control with Enter/Space
3. Use arrow keys in menus, tabs, and other composite widgets
4. Open and close every modal, drawer, dropdown with Escape
5. Verify focus returns correctly after closing overlays
6. Check focus is never lost or trapped unintentionally

### Screen reader test

**macOS + Safari — VoiceOver:**
- Turn on: `Cmd + F5`
- Navigate: `VO + Arrow` (VO = Ctrl + Option)
- Headings: `VO + Cmd + H`
- Landmarks: `VO + Cmd + L`
- Forms: `VO + Cmd + J`

**Windows + Chrome — NVDA (free):**
- Navigate: Arrow keys in browse mode
- Headings: `H`
- Forms: `F`
- Enter forms mode: `Enter` or `Space`

What to verify:
- Every form field has an announced label
- Error messages are announced when they appear
- Modal announces its title on open
- Dynamic content updates (toasts, inline messages) are announced
- Images have meaningful alt text (or are silent when decorative)

### Automated testing (catches ~30–40% of issues)

```bash
# axe-core via CLI
npx @axe-core/cli https://localhost:3000

# In test suite
import { axe } from 'jest-axe';
const results = await axe(container);
expect(results).toHaveNoViolations();
```

Automated tools are a floor, not a ceiling. Keyboard and screen reader testing is irreplaceable.

---

## Quick wins (highest ROI, lowest effort)

1. Add `alt` to all images
2. Add `<label>` to all form inputs
3. Fix colour contrast on grey text
4. Add `:focus-visible` styles everywhere `outline: none` is used
5. Add `aria-label` to icon-only buttons
6. Add `lang="en"` (or appropriate language) to `<html>`
7. Ensure heading hierarchy is sequential (no jumping from h1 to h4)
8. Add `role="alert"` to dynamically injected error messages
9. Test Tab order — does it follow visual reading order?
10. Verify `<title>` is unique and descriptive on every page

## Cross-References

- WCAG 2.2 success criteria operational reference: [wcag-2-2.md](wcag-2-2.md)
- Form-specific accessibility patterns: [form-patterns.md](form-patterns.md)
- Vestibular accessibility for motion: [parallax.md](parallax.md)
