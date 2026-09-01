---
name: animation-engineering
description: "Deep technical reference for motion. Load alongside motion-design.md for /nth-siteasy animate work, and parallax.md for scroll-driven multi-layer compositions. Based on Emil Kowalski's motion principles."
version: 1.12.1
---

# Animation Engineering

*Deep technical reference for motion. Load alongside [motion-design.md](motion-design.md) for `/nth-siteasy animate` work, and [parallax.md](parallax.md) for scroll-driven multi-layer compositions. Based on Emil Kowalski's design engineering philosophy, see [animations.dev](https://animations.dev/).*

---

## The First Question: Should This Animate At All?

**How often will users see this?**

| Frequency | Decision |
|-----------|----------|
| 100+ times/day, command palette, keyboard shortcuts, typing | **No animation. Ever.** |
| Tens of times/day, hover effects, list navigation | Remove or drastically reduce |
| Occasional, modals, drawers, toasts | Standard animation |
| Rare or first-time, onboarding, celebrations | Can add delight |

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

**Never use ease-in for UI animations.** It starts slow, the exact moment users are watching most closely. A dropdown with `ease-in` at 300ms *feels* slower than `ease-out` at the same duration.

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

Canonical law: L-MOTION-1 (tools/data/laws.csv). Cite the identifier when quoting the range.

| Element | Duration |
|---------|----------|
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-500ms |
| Exit animations | ~75% of enter duration (L-MOTION-6) |

**UI feedback animations (buttons, dropdowns, toggles, small reveals) must stay under 300ms; only large-surface choreography such as modals and drawers may use the 300-500ms end of the table.** A 180ms dropdown feels more responsive than a 400ms one. Faster-spinning spinners make loading *feel* faster even when load time is identical.

**Asymmetric enter/exit:** Enter can be slow when deliberate (hold-to-delete: 2s linear). Release is always snappy (200ms ease-out). Slow where the user is deciding, fast where the system is responding.

## Loading-State Choreography

A wait of identical length feels shorter or longer depending on what is on screen. Spinners focus attention on time itself and give no clue about the incoming layout; skeletons project the structure, so the user starts parsing the page before it arrives. Loading loops are ambient state, not interactive feedback, so the 300ms feedback ceiling above does not apply to them.

| Expected wait | Show | Notes |
|---|---|---|
| Under 300ms | Nothing | A skeleton that flashes in and out is worse than a blank beat |
| 300ms to 2s | Skeleton screen | Shimmer or pulse loop at 1.5-2s per cycle; shapes match the real layout |
| Over 2s | Progress bar or spinner plus a contextual message ("Securing your payment...") | Disable the submit control while the request is in flight to prevent double sends |

Swap the skeleton for content with a cross-fade of at least 200ms; an instant swap reads as a glitch. On degraded networks, load critical text first, keep media as lightweight placeholders, and queue user actions locally for later sync.

---

## Spring Animations

Springs simulate real physics, they don't have fixed durations, they settle based on parameters. Use them for:
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

Keep bounce subtle (0.1-0.3). Avoid bounce in most UI contexts. Use it for drag-to-dismiss and playful interactions.

**Spring advantage over CSS animations:** Springs maintain velocity when interrupted. CSS keyframes restart from zero. A spring-based accordion reverses smoothly when the user changes direction mid-motion.

**Mouse-following:** run the raw pointer value through a spring (`stiffness: 100, damping: 10`) instead of using it directly; the unspringed value feels artificial. Decorative only, never functional UI.

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

`scale(0.97-0.98)` on `:active` makes the UI feel like it is truly listening. Apply to any pressable element.

### Never animate from `scale(0)`

Nothing in the real world appears from nothing. Start from `scale(0.95)` with `opacity: 0`, never `scale(0)`.

### Popovers must be origin-aware

Popovers scale from their trigger, not from center. Only modals stay centered, they are not anchored to a specific trigger.

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

When a crossfade between two states looks off, two distinct objects overlapping, add `filter: blur(2px)` during the transition. Blur bridges the visual gap, tricking the eye into seeing a single transformation instead of two objects swapping.

Keep blur under 20px. Heavy blur is expensive in Safari.

---

## CSS Transitions vs. Keyframes

**Use transitions for interruptible UI.** A toast on `transition: transform 400ms ease` can be caught mid-flight; the same move as `@keyframes` restarts from zero when interrupted, so keyframes are the wrong tool for anything rapidly retriggered.

`@starting-style` covers the entry case in CSS alone, replacing the React `useEffect → setMounted(true)` mount-flag pattern. Use it where browser support allows.

---

## clip-path: The Underused Tool

Each `inset()` value eats into the element from that side, so a rectangular reveal is one composited property.

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

Animate from `inset(0 0 100% 0)` to `inset(0 0 0 0)` over 600ms on `--ease-out-ui` when the element enters the viewport.

---

## CSS Transform Mastery

**`translateY` with percentages** is relative to the element's own height. Use `translateY(100%)` to hide a drawer below the fold, regardless of its actual size. Prefer percentages over hardcoded pixels.

That preference has a threshold behind it (L-MOTION-4, 375px, the narrowest viewport the plugin supports) because the failure is arithmetic and not taste. One public library splits perfectly along the line: its percentage entrances move an element by its own size and are safe at every width, and its pixel entrances start at `translate3d(-2000px, 0, 0)`, which at 375px is 5.3 viewport widths. The leftward ones are clipped and look fine. The rightward twins open a 2000px horizontal scroll region, and the exit variants keep it open for good, because `animation-fill-mode: both` parks the element where the last frame left it. Rule 73 measures any absolute translate in a keyframe against that number; percentages and viewport units are not measured at all, because they are the correct construction.

The same arithmetic governs the stagger. A stagger offsets each item by a fraction of the animation's duration, so the reveal overlaps; an accumulator that adds the full duration makes item N wait for item N-1 to finish, and the total reveal becomes the item count times the duration instead of times the delay. Eight words at a one-second default finish at 8.8 seconds. Rule 74 fires on the accumulator shape, not on the presence of a stagger, because the same file that gets word mode wrong usually gets letter mode right.

**`scale()` affects children.** Unlike `width`/`height`, scale transforms children proportionally. A button press scales its icon and label. This is a feature, not something to correct for.

---

## Gesture & Drag Interactions

**Velocity-based dismissal.** Don't require dragging past a distance threshold. A quick flick should dismiss:
```js
const timeTaken = new Date() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;
if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) { dismiss(); }
```

**Friction at boundaries.** When a user drags past the natural limit, apply damping. The more they drag, the less the element moves. Real objects decelerate; they don't hit invisible walls.

**Multi-touch protection.** Ignore additional touch points after the initial drag begins. Without this, switching fingers causes the element to jump.

**Pointer capture for drag.** Capture all pointer events once dragging starts. Ensures drag continues even when the pointer leaves the element bounds.

---

## Performance: JS vs. CSS

**Only animate `transform` and `opacity`.** These run on the GPU, skipping layout and paint.

**CSS variables on containers are expensive.** Setting `--swipe-amount` on a parent recalculates styles for all children; setting `element.style.transform` directly affects only that element.

**Framer Motion `x`/`y` props are NOT hardware-accelerated.** They use rAF on the main thread. `animate={{ transform: "translateX(100px)" }}` is GPU-accelerated where `animate={{ x: 100 }}` is not.

**CSS animations beat JS under load.** CSS animations run off the main thread. When the browser is busy (loading pages, running scripts), Framer Motion drops frames. CSS animations stay smooth. Rule: CSS for predetermined animations, JS for dynamic or interruptible ones.

**WAAPI** gives programmatic control at CSS performance: `element.animate(keyframes, { duration, fill: 'forwards', easing })` takes the same custom curves as the tokens above.

---

## Stagger

Drive per-item delay from an index custom property (`animation-delay: calc(var(--i, 0) * 50ms)`, with `style="--i: 0"` on each item) rather than hand-written nth-child rules.

**Cap total stagger at ~500ms** (10 items x 50ms). Stagger is decorative, never block interaction while it plays.

---

## Runtime Discipline: One Ticker, Idle States, Device Caps

Rules for pages that run continuous JS animation (WebGL scenes, custom cursors, scroll engines):

- **One rAF ticker per page.** A single global loop with named subscribe/unsubscribe beats three independent `requestAnimationFrame` chains (renderer plus cursor plus slider is the observed failure mode). Systems join and leave it; an audio-reactive part unsubscribes when paused.
- **Pause when hidden.** Gate the ticker on `visibilitychange`. rAF throttles in background tabs, but the queued work still lands on return.
- **Lerp reference values.** Pointer-follow feels credible at 0.05-0.1 per frame (0.05 heavy, 0.1 crisp); a scroll scrub wants ~0.18. Clamp user-driven motion (a camera never dips below the floor) and re-aim (`lookAt`) after every lerp.
- **Idle state.** Anything that animates continuously needs a resting behavior, a slow drift or a breathing wave, so the scene never freezes into a dead image when input stops.
- **Cap the pixel ratio.** `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`. Uncapped DPR renders four times the pixels on dense mobile screens for an invisible gain.
- **Mutate in the loop, never setState.** Continuous values (positions, scroll offsets, pointer trails) mutate refs or objects inside the frame loop; component state is for discrete transitions. A state update per frame or per pointermove routes 60+ renders a second through the framework for nothing.
- **Advance by delta time.** `x += 0.1` per frame runs twice as fast on a 120Hz screen as on a 60Hz one; `x += speed * delta` is refresh-rate independent. Engine objects often also need their update flag (`.needsUpdate`, `updateProjectionMatrix()`) after a mutation.
- **Zero allocation in the hot path.** No `new` and no `.clone()` inside a frame loop, allocate temporaries once (module scope or memo) and reuse them with `.set()`/`.copy()`. Sixty allocations a second is a GC hiccup on a timer.
- **Tune with a bounded GUI, ship without it.** Subjective parameters (lerp ease, parallax intensity) get a dev panel with bounded ranges (lil-gui) during design, and the panel never reaches the production bundle, same rule as ScrollTrigger `markers`.

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
| Duration > 300ms on UI | Reduce to 150-250ms |
| Hover animation without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Keyframes on rapidly-triggered element | Use CSS transitions instead |
| Framer `x`/`y` props under load | Use `transform: "translateX()"` for GPU acceleration |
| Same enter/exit speed | Exit at ~75% of enter duration |
| All elements appear at once | Add stagger, see L-MOTION-5 |

## View Transitions API

Animate between two DOM states (or two pages) without manual FLIP bookkeeping. The browser snapshots before and after, then cross-fades or morphs matched elements. Same-document work goes through `document.startViewTransition(() => updateTheDOM())`; cross-document navigation opts in from CSS alone with `@view-transition { navigation: auto; }`.

Match elements across states with `view-transition-name` so the browser tweens position and size instead of cross-fading. Then tune the morph and gate it:

```css
::view-transition-group(hero-card) { animation-duration: 250ms; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) { animation: none; }
}
```

Rules: a `view-transition-name` must be unique in a given snapshot. Keep transitions under 300ms. Feature-detect (`document.startViewTransition`) and fall back to an instant update. Reduced motion disables the animation, never the state change.

## Resource hooks

- Tuning panels and motion tooling: `python3 tools/design-system/scripts/search.py "gui" --domain resources`
- Spring and scroll engines with caveats: `python3 tools/design-system/scripts/search.py "spring" --domain resources`
