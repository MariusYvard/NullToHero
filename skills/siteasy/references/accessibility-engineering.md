---
name: accessibility-engineering
description: "Deep reference for /siteasy audit, /siteasy harden, and any build work. Accessibility is not a checklist - it's a design constraint that improves every interface."
version: 1.6.1
---

# Accessibility Engineering

*Deep reference for `/siteasy audit`, `/siteasy harden`, and any build work. Accessibility is not a checklist, it's a design constraint that improves every interface.*

A current model writes a focus trap, a roving-tabindex handler and the WAI-ARIA keyboard maps correctly without being taught them, so this file no longer carries those implementations. It carries the calls that get made wrong: which pattern to prefer when several are valid, which default to refuse, the attribute wiring that is easy to get subtly wrong, and the numbers that decide a pass.

Accessibility means the interface works for people who navigate differently. Four categories:

- **Visual**: blind (screen readers), low vision (zoom, high contrast), colour blind
- **Motor**: keyboard-only, switch access, voice control (Dragon, Voice Control)
- **Cognitive**: attention, memory, reading difficulties
- **Auditory**: captions, transcripts, visual alternatives to sound

Target AA everywhere. AAA only where it costs nothing architectural.

---

## ARIA: the calls that go wrong

ARIA overrides the accessibility tree, so bad ARIA is worse than none.

1. Semantic HTML first. `<button>` beats `<div role="button">` every time.
2. Never change native semantics unless necessary.
3. Every interactive ARIA control works with the keyboard.
4. Never `aria-hidden` an element that can hold focus.
5. Every interactive element has an accessible name.

**Naming, in priority order:** `aria-labelledby` when the name already exists as visible text on the page, `<label>` for form fields, `aria-label` when no visible label is possible (icon buttons, close buttons). `title` is not a name: not every screen reader announces it. Refuse it as a naming strategy.

`aria-describedby` carries supplementary text (hint, error) and is announced *after* the name and role, never instead of it. A field with a hint and an error needs both mechanisms: the label names it, the description explains it.

```html
<label for="pw">Password</label>
<input id="pw" type="password" aria-describedby="pw-hint pw-error">
<p id="pw-hint">Minimum 8 characters</p>
<p id="pw-error" role="alert" hidden>Too short</p>
```

---

## Keyboard patterns: what to prefer, what to refuse

The WAI-ARIA Authoring Practices carry the full keyboard maps. These are the decisions the maps do not make for you, plus the attribute wiring worth having in front of you.

**Dialogs: native `<dialog>` with `showModal()`.** It gets the focus trap and the Escape key for free, and a hand-rolled trap is a thing you then maintain forever. Whatever you use: focus moves in on open, returns to the triggering element on close, and Escape closes.

```html
<dialog aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">Confirm deletion</h2>
  <p id="dialog-desc">This cannot be undone.</p>
  <button autofocus>Cancel</button>
  <button>Delete</button>
</dialog>
```

**Menus do not trap Tab.** Dialogs trap, menus do not. `Tab` closes the menu and moves on; arrow keys walk the items, `Home` and `End` jump to the ends, Escape closes and returns focus to the trigger, a printable character jumps to the matching item. Trapping Tab inside a menu is the most common over-application of the dialog pattern.

```html
<button aria-haspopup="menu" aria-expanded="false" aria-controls="menu-id">Options</button>
<ul id="menu-id" role="menu" hidden>
  <li role="menuitem" tabindex="-1">Edit</li>
  <li role="menuitem" tabindex="-1">Delete</li>
</ul>
```

**Never build an interactive element from `<div>` or `<span>`.** If a design forces it: `role`, `tabindex="0"`, and a `keydown` handler for *both* Enter and Space, because a real `<button>` fires on both and a real link only on Enter.

**Accordions get `role="region"` only when the panel is worth reaching as a landmark.** On an FAQ list it just floods the landmark map. Omit it, and toggle `aria-expanded` and `hidden` together.

```html
<button aria-expanded="false" aria-controls="panel-1" id="btn-1">Section title</button>
<div id="panel-1" aria-labelledby="btn-1" hidden>Content</div>
```

**Comboboxes keep real focus on the input.** Walk `aria-activedescendant` through the option ids as the user arrows; moving actual focus into the listbox breaks typing. This is the single most common combobox bug.

```html
<input id="search" type="text" role="combobox" aria-autocomplete="list"
       aria-expanded="false" aria-controls="results" aria-activedescendant="">
<ul id="results" role="listbox" hidden>
  <li role="option" id="opt-1">Result one</li>
</ul>
```

**Live regions are containers you inject into, never containers you unhide.** Toggling visibility on the region itself is silent in several screen readers: create and append a fresh element each time. `aria-live="polite"` waits for the current speech to finish; `role="alert"` interrupts, so reserve it for errors.

```html
<div aria-live="polite" aria-atomic="true" class="sr-only" id="toasts"></div>
<div role="alert">Something went wrong</div>
```

**Roving tabindex** (tabs, toolbars, radio groups) keeps exactly one item tabbable and moves the `0` as the arrows move focus, so the group is one stop in the tab order rather than one stop per item.

---

## Focus rings

```css
:focus { outline: none; }          /* only where you replace it */

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
  box-shadow: 0 0 0 4px var(--color-accent-muted); /* halo: survives both themes */
}
```

At least 2px thick, and 3:1 against the *adjacent* colours rather than against the page background. A single-colour ring that clears contrast on the light theme usually fails on the dark one; the halo above is what makes one declaration work on both.

---

## Skip links

Every page with navigation carries one. Position it off-screen and reveal it on focus, never `display: none`, because a hidden element is not focusable.

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<nav>...</nav>
<main id="main-content" tabindex="-1">...</main>
```

```css
.skip-link {
  position: absolute;
  left: 1rem;
  top: 1rem;
  transform: translateY(-100%);
  padding: 0.5rem 1rem;
  background: var(--color-accent);
  color: white;
  z-index: 9999;
}
.skip-link:focus { transform: translateY(0); }
```

The target needs `tabindex="-1"` (`<main id="main-content" tabindex="-1">`), or several browsers scroll to it without moving focus and the next Tab drops the user back into the nav they were trying to skip.

---

## Semantics worth stating (the rest is obvious)

| Element | The catch |
|---------|-----------|
| `<section>` | A landmark only when it has an accessible name. Unnamed, it is a `<div>` with extra steps. |
| `<header>` / `<footer>` | `banner` / `contentinfo` only as a direct child of `<body>`. Inside an `<article>` they convey nothing. |
| `<nav>` | Needs `aria-label` the moment there are two on a page. |
| `<output>` | A live region for calculated results, polite by default. |
| `<details>` / `<dialog>` | The native disclosure and the native modal. Prefer them to the hand-built equivalents. |

---

## Alt text: the decision, not the syntax

- **Informative image:** describe the *conclusion*, not the picture. `alt="Revenue grew 40% in Q3, driven by enterprise"`, not `alt="bar chart"`.
- **Decorative image:** `alt=""`. Empty, never absent, because an absent `alt` makes some screen readers read the filename aloud.
- **Functional image** (inside a link or a button): describe the *action*, not the graphic. `alt="Acme, go to homepage"`.
- **Complex image:** short `alt` plus the real explanation in a `<figcaption>` wired through `aria-describedby`.
- **SVG:** `role="img"` with a `<title>` when it carries meaning, `aria-hidden="true"` when it does not.

```html
<svg role="img" aria-labelledby="svg-title svg-desc">
  <title id="svg-title">Upward trend</title>
  <desc id="svg-desc">Monthly users grew from 1k to 8k over 6 months</desc>
</svg>

<svg aria-hidden="true">...</svg>
```

---

## Forms

- **Label above the input, always.** A placeholder is not a label: it disappears exactly when the user needs it, and it fails at zoom.
- **Validate on blur, not on keystroke.** Errors raised mid-word punish the user for not having finished typing.
- **Error text below the field**, wired with `aria-describedby` and `role="alert"`, plus an error summary at the top of the form on submit failure with focus moved to it.
- **Required fields carry the `required` attribute and a visible indicator.** Colour alone is not an indicator.
- **`autocomplete` on every field that maps to a known token** (`email`, `name`, `current-password`). That is WCAG 1.3.5, not a convenience.

---

## Colour Contrast

| Content | AA minimum | AAA |
|---------|-----------|-----|
| Body text (< 24px regular, < 18.66px bold) | 4.5:1 | 7:1 |
| Large text (≥ 24px regular, ≥ 18.66px bold) | 3:1 | 4.5:1 |
| UI components, icons, focus rings | 3:1 | n/a |
| Decorative elements | None | n/a |

Use [whocanuse.com](https://whocanuse.com) to test across vision types, not just contrast ratios. A colour combination can pass WCAG and still fail for deuteranopia.

---

## Motion and Vestibular

Reduced motion means fewer and gentler animations, not zero. Crossfades stay. Position changes, scale and parallax go.

```css
@media (prefers-reduced-motion: reduce) {
  .card { animation-duration: 1ms !important; animation-iteration-count: 1 !important;
          transform: none; transition: opacity 150ms ease; }
}
```

Stripping every transition is its own failure: a state change with no feedback reads as a dead click. Keep the opacity and colour transitions that tell the user something happened, and drop the ones that move things across the screen.

---

## Testing

### Keyboard pass (every component, every time)

1. Tab to every interactive element. Can you reach it at all?
2. Activate every control with Enter and with Space.
3. Arrow through menus, tabs and the other composite widgets.
4. Escape out of every modal, drawer and dropdown.
5. Verify focus returns to the trigger after each overlay closes.
6. Verify focus is never lost to `<body>` and never trapped where it should not be.

### Screen reader pass

**macOS + Safari, VoiceOver:** turn on with `Cmd + F5`, navigate with `VO + Arrow` (VO = Ctrl + Option), headings `VO + Cmd + H`, landmarks `VO + Cmd + L`, forms `VO + Cmd + J`.

**Windows + Chrome, NVDA (free):** arrow keys in browse mode, `H` for headings, `F` for forms, Enter or Space to enter forms mode.

Verify, on both: every field announces a label, errors announce when they appear, the modal announces its title on open, injected content (toasts, inline messages) is announced, decorative images stay silent.

### Automated testing (partial coverage)

How much automation catches depends on what you count. Across Deque's audit sample, automated tests identified 57.38% of total issues, while automated rules covered 16 of the 50 WCAG 2.1 Level AA success criteria ([Deque Systems, 2025](https://www.deque.com/automated-accessibility-coverage-report/)). Neither figure means a page is compliant.

```bash
npx @axe-core/cli https://localhost:3000     # or jest-axe inside the test suite
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
9. Test Tab order, does it follow visual reading order?
10. Verify `<title>` is unique and descriptive on every page

## Cross-References

- WCAG 2.2 success criteria operational reference: [wcag-2-2.md](wcag-2-2.md)
- Form-specific accessibility patterns: [form-patterns.md](form-patterns.md)
- Vestibular accessibility for motion: [parallax.md](parallax.md)
