---
name: interaction-design
description: "Every interactive element needs these states designed:"
version: 1.6.0
---

# Interaction Design

## The Eight Interactive States

Every interactive element needs these states designed:

| State | When | Visual Treatment |
|-------|------|------------------|
| **Default** | At rest | Base styling |
| **Hover** | Pointer over (not touch) | Subtle lift, color shift |
| **Focus** | Keyboard/programmatic focus | Visible ring |
| **Active** | Being pressed | Pressed in, darker |
| **Disabled** | Not interactive | Reduced opacity, no pointer |
| **Loading** | Processing | Spinner, skeleton |
| **Error** | Invalid state | Red border, icon, message |
| **Success** | Completed | Green check, confirmation |

**The common miss**: Designing hover without focus, or vice versa. They're different. Keyboard users never see hover states.

## Focus Rings: Do Them Right

**Never `outline: none` without replacement.** Use `:focus-visible` to show focus only for keyboard users:

```css
button:focus { outline: none; }
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

Focus ring design: high contrast (3:1 minimum), 2-3px thick, offset from element, consistent across all interactive elements.

## Form Design: The Non-Obvious

**Placeholders aren't labels** — they disappear on input. Always use visible `<label>` elements. **Validate on blur**, not on every keystroke. Place errors **below** fields with `aria-describedby` connecting them.

## Modals: The Inert Approach

Use the native `<dialog>` element:

```javascript
const dialog = document.querySelector('dialog');
dialog.showModal(); // Opens with focus trap, closes on Escape
```

## The Popover API

For tooltips, dropdowns, and non-modal overlays:

```html
<button popovertarget="menu">Open menu</button>
<div id="menu" popover>
  <button>Option 1</button>
</div>
```

**Benefits**: Light-dismiss, proper stacking, no z-index wars, accessible by default.

## Dropdown & Overlay Positioning

Dropdowns inside `overflow: hidden` containers will be clipped. This is the single most common dropdown bug. Solutions:
- Use `popover` attribute (top layer)
- Use `position: fixed` with JS positioning
- CSS Anchor Positioning API (Chrome 125+)

**Anti-Patterns:**
- `position: absolute` inside `overflow: hidden` — dropdown will be clipped
- Arbitrary z-index values like `z-index: 9999` — use a semantic scale
- Rendering dropdown markup inline without an escape hatch from the parent's stacking context

## Destructive Actions: Undo > Confirm

**Undo is better than confirmation dialogs.** Remove from UI immediately, show undo toast, actually delete after toast expires. Use confirmation only for truly irreversible, high-cost, or batch operations.

## Keyboard Navigation Patterns

### Roving Tabindex

For component groups (tabs, menu items, radio groups), one item is tabbable; arrow keys move within:

```html
<div role="tablist">
  <button role="tab" tabindex="0">Tab 1</button>
  <button role="tab" tabindex="-1">Tab 2</button>
</div>
```

### Skip Links

Provide skip links for keyboard users to jump past navigation. Hide off-screen, show on focus.

---

**Avoid**: Removing focus indicators without alternatives. Using placeholder text as labels. Touch targets <44x44px. Generic error messages. Custom controls without ARIA/keyboard support.
