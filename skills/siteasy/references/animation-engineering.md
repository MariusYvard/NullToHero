---
name: animation-engineering
description: "Deep technical reference for motion. Load alongside motion-design.md for /siteasy animate work, and parallax.md for scroll-driven multi-layer compositions. Based on Emil."
version: 1.9.2
---

# Animation Engineering

*Deep technical reference for motion. Load alongside [motion-design.md](motion-design.md) for `/siteasy animate` work, and [parallax.md](parallax.md) for scroll-driven multi-layer compositions. Based on Emil Kowalski's design engineering philosophy, see [animations.dev](https://animations.dev/).*

---

## The First Question: Should This Animate At All?

**How often will users see this?**

| Frequency | Decision |
|-----------|----------|
| 100+ times/day — command palette, keyboard shortcuts, typing | **No animation. Ever.** |
| Tens of times/day — hover effects, list navigation | Remove or drastically reduce |
| Occasional — modals, drawers, toasts | Standard animation |
| Rare / first-time — onboarding, celebrations | Can add delight |

**Never animate keyboard-initiated actions.** Raycast has no open/close animation. That is the right call.

Every animation must answer: *why does this animate?*

Valid purposes: spatial consistency, state indication, explanation, feedback, preventing jarring changes.

If the answer is "it looks cool" and users see it often, don't animate.

---

## Easing: The Decision Tree

```
Is the element entering or exiting?
  Yes → ease-out (starts fast, feels responsive)
  No →
    Is it moving or morphing on-screen?
      Yes → ease-in-out (natural acceleration/deceleration)
    Is it a hover or color change?
      Yes → ease
    Is it constant motion (marquee, progress)?
      Yes → linear
    Default → ease-out
```

**Never use ease-in for UI animations.** It starts slow — the exact moment users are watching most closely. A dropdown with `ease-in` at 300ms *feels* slower than `ease-out` at the same duration.

**Use custom curves, not built-in CSS easings.** The built-ins are too weak.

```css
--ease-out-ui:     cubic-bezier(0.23, 1, 0.32, 1);      /* Strong, snappy UI interactions */
--ease-in-out-ui:  cubic-bezier(0.77, 0, 0.175, 1);     /* On-screen movement */
--ease-drawer:     cubic-bezier(0.32, 0.72, 0, 1);      /* iOS-like drawer reveal */
--ease-out-quart:  cubic-bezier(0.25, 1, 0.5, 1);       /* Smooth, refined (good default) */
--ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1);       /* Snappy, confident */
```

Resources: [easing.dev](https://easing.dev/), [easings.co](https://easings.co/)

---

## Duration Reference

| Element | Duration |
|---------|----------|
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |
| Exit animations | ~75% of enter duration |

**UI feedback animations (buttons, dropdowns, toggles, small reveals) must stay under 300ms; only large-surface choreography such as modals and drawers may use the 300-500ms end of the table.** A 180ms dropdown feels more responsive than a 400ms one. Faster-spinning spinners make loading *feel* faster even when load time is identical.

**Asymmetric enter/exit:** Enter can be slow when deliberate (hold-to-delete: 2s linear). Release is always snappy (200ms ease-out). Slow where the user is deciding, fast where the system is responding.

---

## Spring Animations

Springs simulate real physics — they don't have fixed durations, they settle based on parameters. Use them for:
- Drag interactions with momentum
- Elements that should feel "alive"
- Gestures that can be interrupted mid-animation
- Decorative mouse-tracking

**Apple's approach (easier to reason about):**
```js
{ type: "spring", duration: 0.5, bounce: 0.2 }
```

**Traditional physics:**
```js
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Keep bounce subtle (0.1–0.3). Avoid bounce in most UI contexts. Use it for drag-to-dismiss and playful interactions.

**Spring advantage over CSS animations:** Springs maintain velocity when interrupted. CSS keyframes restart from zero. A spring-based accordion reverses smoothly when the user changes direction mid-motion.

**Mouse-following with spring (decorative only):**
```jsx
import { useSpring } from 'framer-motion';

// Without spring: feels artificial
const rotation = mouseX * 0.1;

// With spring: feels natural, has momentum
const springRotation = useSpring(mouseX * 0.1, { stiffness: 100, damping: 10 });
```

This is *decorative*. Don't use it for functional UI.

---

## Component Rules

### Buttons must feel responsive

```css
.button {
  transition: transform 160ms ease-out;
}
.button:active {
  transform: scale(0.97);
}
```

`scale(0.97–0.98)` on `:active` makes the UI feel like it is truly listening. Apply to any pressable element.

### Never animate from `scale(0)`

Nothing in the real world appears from nothing. Start from `scale(0.95)` with opacity:

```css
/* Wrong */
.entering { transform: scale(0); }

/* Right */
.entering { transform: scale(0.95); opacity: 0; }
```

### Popovers must be origin-aware

Popovers scale from their trigger, not from center. Only modals stay centered — they are not anchored to a specific trigger.

```css
/* Radix UI */
.popover { transform-origin: var(--radix-popover-content-transform-origin); }

/* Base UI */
.popover { transform-origin: var(--transform-origin); }
```

### Tooltips: skip delay on subsequent hovers

First hover delays (prevent accidental activation). Once any tooltip is open, adjacent ones appear instantly with no animation.

```css
.tooltip[data-instant] { transition-duration: 0ms; }
```

### Blur to mask imperfect crossfades

When a crossfade between two states looks off — two distinct objects overlapping — add `filter: blur(2px)` during the transition. Blur bridges the visual gap, tricking the eye into seeing a single transformation instead of two objects swapping.

Keep blur under 20px. Heavy blur is expensive in Safari.

---

## CSS Transitions vs. Keyframes

**Use transitions for interruptible UI:**
```css
/* Interruptible — good for dynamic UI like toasts */
.toast { transition: transform 400ms ease; }
```

**Avoid keyframes for rapidly-triggered elements:**
```css
/* Not interruptible — restarts from zero on interruption */
@keyframes slideIn { from { transform: translateY(100%); } }
```

### @starting-style — the modern CSS entry animation

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 400ms ease, transform 400ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

Replaces the React `useEffect → setMounted(true)` pattern. Use where browser support allows.

---

## clip-path: The Underused Tool

`clip-path: inset(top right bottom left)` clips a rectangle. Each value "eats" into the element from that side.

```css
/* Hidden from right, reveal left-to-right */
.hidden   { clip-path: inset(0 100% 0 0); }
.visible  { clip-path: inset(0 0 0 0); }
```

### Hold-to-delete pattern

```css
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms ease-out;       /* release: fast */
}
.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear;            /* hold: deliberate */
}
```

### Tabs with perfect color transitions

Duplicate the tab list. Style the copy as active (different background/color). Clip the copy so only the active tab shows. Animate the clip on tab change. Perfectly synchronized color transition that timing individual colors can never achieve.

### Image reveals on scroll

```css
.image {
  clip-path: inset(0 0 100% 0);   /* hidden from bottom */
  transition: clip-path 600ms var(--ease-out-ui);
}
.image.in-view { clip-path: inset(0 0 0 0); }
```

---

## CSS Transform Mastery

**`translateY` with percentages** — relative to the element's own height. Use `translateY(100%)` to hide a drawer below the fold, regardless of its actual size. Prefer percentages over hardcoded pixels.

**`scale()` affects children** — unlike `width`/`height`, scale transforms children proportionally. A button press scales its icon and label. This is a feature.

**3D transforms for depth:**
```css
.wrapper { transform-style: preserve-3d; }

@keyframes orbit {
  from { transform: translate(-50%, -50%) rotateY(0deg)   translateZ(72px) rotateY(360deg); }
  to   { transform: translate(-50%, -50%) rotateY(360deg) translateZ(72px) rotateY(0deg); }
}
```

---

## Gesture & Drag Interactions

**Velocity-based dismissal** — don't require dragging past a distance threshold. A quick flick should dismiss:
```js
const timeTaken = new Date() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;
if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) { dismiss(); }
```

**Friction at boundaries** — when a user drags past the natural limit, apply damping. The more they drag, the less the element moves. Real objects decelerate; they don't hit invisible walls.

**Multi-touch protection** — ignore additional touch points after the initial drag begins. Without this, switching fingers causes the element to jump.

**Pointer capture for drag** — capture all pointer events once dragging starts. Ensures drag continues even when the pointer leaves the element bounds.

---

## Performance: JS vs. CSS

**Only animate `transform` and `opacity`** — these run on the GPU, skipping layout and paint.

**CSS variables on containers are expensive** — changing `--swipe-amount` on a parent recalculates styles for all children. Set `transform` directly on the element:
```js
// Expensive: triggers recalc on all children
element.style.setProperty('--swipe-amount', `${distance}px`);

// Fast: only affects this element
element.style.transform = `translateY(${distance}px)`;
```

**Framer Motion `x`/`y` props are NOT hardware-accelerated** — they use rAF on the main thread. For true GPU acceleration:
```jsx
// Not hardware accelerated
<motion.div animate={{ x: 100 }} />

// Hardware accelerated
<motion.div animate={{ transform: "translateX(100px)" }} />
```

**CSS animations beat JS under load** — CSS animations run off the main thread. When the browser is busy (loading pages, running scripts), Framer Motion drops frames. CSS animations stay smooth. Rule: CSS for predetermined animations, JS for dynamic/interruptible ones.

**WAAPI — programmatic CSS performance:**
```js
element.animate(
  [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
  { duration: 1000, fill: 'forwards', easing: 'cubic-bezier(0.77, 0, 0.175, 1)' }
);
```

---

## Stagger

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 300ms ease-out forwards;
  animation-delay: calc(var(--i, 0) * 50ms);
}
@keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
```

Set `style="--i: 0"` on each item. **Cap total stagger at ~500ms** (10 items × 50ms). Stagger is decorative — never block interaction while it plays.

---

## Review Checklist

When reviewing motion in any UI:

| Issue | Fix |
|-------|-----|
| `transition: all` | Specify exact properties: `transition: transform 200ms ease-out` |
| `scale(0)` entry | Start from `scale(0.95); opacity: 0` |
| `ease-in` on UI element | Switch to `ease-out` or custom curve |
| `transform-origin: center` on popover | Use Radix/Base UI CSS variable (modals exempt) |
| Animation on keyboard action | Remove entirely |
| Duration > 300ms on UI | Reduce to 150–250ms |
| Hover animation without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Keyframes on rapidly-triggered element | Use CSS transitions instead |
| Framer `x`/`y` props under load | Use `transform: "translateX()"` for GPU acceleration |
| Same enter/exit speed | Exit at ~75% of enter duration |
| All elements appear at once | Add stagger (30–80ms between items) |

## View Transitions API

Animate between two DOM states (or two pages) without manual FLIP bookkeeping. The browser snapshots before and after, then cross-fades or morphs matched elements.

Same-document (SPA-style state change):

```js
if (document.startViewTransition) {
  document.startViewTransition(() => updateTheDOM());
} else {
  updateTheDOM(); // graceful fallback, no animation
}
```

Cross-document (multi-page, no JS) opts in via CSS:

```css
@view-transition { navigation: auto; }
```

Match elements across states so the browser tweens position and size instead of cross-fading:

```css
.card { view-transition-name: hero-card; } /* must be unique per snapshot */
```

Tune the morph; always gate motion:

```css
::view-transition-group(hero-card) { animation-duration: 250ms; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) { animation: none; }
}
```

Rules: a `view-transition-name` must be unique in a given snapshot. Keep transitions under 300ms. Feature-detect (`document.startViewTransition`) and fall back to an instant update. Reduced motion disables the animation, never the state change.
