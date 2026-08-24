---
name: animate
description: "Analyze a feature and strategically add animations and micro-interactions that enhance understanding, provide feedback, and create delight."
version: 1.7.1
---

> **Additional context needed**: performance constraints.

Analyze a feature and strategically add animations and micro-interactions that enhance understanding, provide feedback, and create delight.

---

## Register

Brand: orchestrated page-load sequences, staggered reveals, scroll-driven animation. Motion is part of the voice; one well-rehearsed entrance beats scattered micro-interactions.

Product: 150-250 ms on most transitions. Motion conveys state, feedback, reveal, loading, transitions between views. No page-load choreography; users are in a task and won't wait for it.

---

## Assess Animation Opportunities

Analyze where motion would improve the experience:

1. **Identify static areas**:
   - **Missing feedback**: Actions without visual acknowledgment (button clicks, form submission, etc.)
   - **Jarring transitions**: Instant state changes that feel abrupt (show/hide, page loads, route changes)
   - **Unclear relationships**: Spatial or hierarchical relationships that aren't obvious
   - **Lack of delight**: Functional but joyless interactions
   - **Missed guidance**: Opportunities to direct attention or explain behavior

2. **Understand the context**:
   - What's the personality? (Playful vs serious, energetic vs calm)
   - What's the performance budget? (Mobile-first? Complex page?)
   - Who's the audience? (Motion-sensitive users? Power users who want speed?)
   - What matters most? (One hero animation vs many micro-interactions?)

If any of these are unclear from the codebase, STOP and call the clarifying-question tool to clarify.

**CRITICAL**: Respect `prefers-reduced-motion`. Always provide non-animated alternatives for users who need them.

## Plan Animation Strategy

Create a purposeful animation plan:

- **Hero moment**: What's the ONE signature animation? (Page load? Hero section? Key interaction?)
- **Feedback layer**: Which interactions need acknowledgment?
- **Transition layer**: Which state changes need smoothing?
- **Delight layer**: Where can we surprise and delight?

**IMPORTANT**: One well-orchestrated experience beats scattered animations everywhere. Focus on high-impact moments.

## Implement Animations

Work the layers in order. Feedback and transitions earn their place first; entrances and delight are what you add once the functional layer is complete.

| Layer | Where it lands | Calibration |
|---|---|---|
| Entrance | Page load, hero, scroll reveals, modal and drawer entry | Stagger element reveals per L-MOTION-5; fade plus slide, not slide alone |
| Micro-interaction | Buttons, inputs, toggles, checkboxes, favorites | Hover scale 1.02-1.05; press scale per animation-engineering.md; toggles 200-300ms |
| State transition | Show/hide, expand/collapse, loading, success/error, enable/disable | Expand/collapse transitions the height container, never the content height |
| Navigation | Route changes, tabs, carousels, scroll effects | Shared-element transitions over crossfades where a spatial link exists |
| Feedback and guidance | Hover hints, drag and drop, copy confirmations, focus flow | Drag lifts (shadow plus scale); drop zones highlight before release |
| Delight | Empty states, completions, easter eggs, contextual themes | Rare-frequency surfaces only; anything seen daily drops out of this layer |

For any parallax or scroll-driven work, load [parallax.md](parallax.md) before writing code.

## Technical Implementation

### Timing & Easing

Canonical law: L-MOTION-1 (tools/data/laws.csv). Entrance choreography on page load is the one tier above the law's range, at 500-800ms.

**Easing curves (use these, not CSS defaults):**
```css
/* Recommended - natural deceleration */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);    /* Smooth, refined */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);   /* Slightly snappier */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);     /* Confident, decisive */

/* AVOID - feel dated and tacky */
/* bounce: cubic-bezier(0.34, 1.56, 0.64, 1); */
/* elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6); */
```

**Exit animations are faster than entrances.** Use ~75% of enter duration (L-MOTION-6).

### Performance
- **Motion materials**: Use transform/opacity for reliable movement, but use blur, filters, masks, shadows, and color shifts when they materially improve the effect
- **Layout safety**: Avoid casual animation of layout-driving properties (`width`, `height`, `top`, `left`, margins)
- **will-change**: Add sparingly for known expensive animations
- **Bound expensive effects**: Keep blur/filter/shadow areas small or isolated, use `contain` where appropriate
- **Monitor FPS**: Ensure 60fps on target devices

### Accessibility

Ship a `prefers-reduced-motion: reduce` block that collapses durations to near-zero and caps iteration counts. Reduced motion removes the movement, never the state change or the content.

**NEVER**:
- Use bounce or elastic easing curves, they feel dated and draw attention to the animation itself
- Animate layout properties casually (`width`, `height`, `top`, `left`, margins) when transform, FLIP, or grid-based techniques would work
- Use durations over 500ms for feedback, it feels laggy
- Animate without purpose, every animation needs a reason
- Ignore `prefers-reduced-motion`, this is an accessibility violation
- Animate everything, animation fatigue makes interfaces feel exhausting
- Block interaction during animations unless intentional

## Animated Component Loops and Entrances

Rules distilled from the animated-component ecosystem (registries, hero effects):

- Two duration regimes coexist. Feedback and entrances live at 300-400ms ease-out; ambient loops (shimmer ~3s, border beams ~6s, marquees ~40s) live at 3-40s linear. Judge a decorative loop on its reduced-motion guard and its per-view budget, not on the 300ms feedback ceiling.
- Scroll entrances: IntersectionObserver with `once: true` and a margin around -50px, near-zero base delay (~40ms), staggers per L-MOTION-5, around 50ms that compress with segment count (total duration divided by elements) so long lists do not make the reader wait.
- Split-text accessibly: per-character spans are noise for a screen reader. Hide the animated copy (`aria-hidden`) and expose the intact text (`aria-label` or a visually-hidden duplicate).
- Animated counters: `tabular-nums` so digits keep a stable width (no reflow), write `textContent` directly outside the render cycle, and format with the page locale, never a hardcoded one.
- Several beams or orbiters on one element: phase them with negative delays instead of duplicating keyframes.
- Canvas and WebGL backgrounds: cut the rAF when off-viewport (IntersectionObserver), under reduced motion and on `visibilitychange`; listen for `webglcontextlost`.
- `setInterval` is not an animation engine (background-tab throttling, drift): rAF or a CSS animation.

## Resource hooks

- Animation libraries with status and caveats: `python3 tools/design-system/scripts/search.py "animation" --domain resources`
- Ready-made loaders, reveals and micro-animations shipped with the plugin: `assets/animations/` (see [assets-library.md](assets-library.md))
- The right reference for a sub-topic: `node tools/search-references.mjs "stagger" --skill siteasy`

## Verify Quality

Test animations thoroughly:

- **Smooth at 60fps**: No jank on target devices
- **Feels natural**: Easing curves feel organic, not robotic
- **Appropriate timing**: Not too fast (jarring) or too slow (laggy)
- **Reduced motion works**: Animations disabled or simplified appropriately
- **Doesn't block**: Users can interact during/after animations
- **Adds value**: Makes interface clearer or more delightful

Remember: Motion should enhance understanding and provide feedback, not just add decoration. Animate with purpose, respect performance constraints, and always consider accessibility. Great animation is invisible, it just makes everything feel right.
