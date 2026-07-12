---
name: signature-moments
description: "A recipe library of signature interactions, the one moment a visitor remembers, each with fit, technique and guardrails."
version: 1.24.0
---

# Signature Moments

A signature moment is the single interaction a visitor keeps after the tab closes.
It is the answer to "what was that site with the...".
This library catalogues moments worth building, how to build each one tastefully, and the guardrail every one of them must clear.

## The rule

Exactly one signature moment per site.
Not zero, which is the shape of a forgettable page, and not several, which is the shape of a chaotic one.
A page with five memorable moments has none, because attention has no anchor and the moments cancel each other.
Pick one, make it good, and let everything else support it quietly.

The moment must serve the concept from `DIRECTION.md`.
A waterline that fills the screen serves a tide app.
The same effect on an accounting tool is noise, because it says nothing true about the product.
If a candidate moment cannot be traced to the central idea, it is spectacle, and spectacle without a reason reads as a template flourish rather than an identity.

One moment does not mean one animation on the whole site.
The rest of the interface still moves (hovers, transitions, reveals) but that motion is supporting choreography, held quieter than the signature so the signature stays the thing you remember.

## The catalogue

Each entry lists what it is, when it fits, a short implementation sketch and its reduced-motion and performance guardrail.

### Scroll-driven reveal
A section that animates as it enters the viewport, tied to scroll position rather than a timer.
Fits editorial and product pages that reward reading top to bottom.
Sketch:
CSS scroll-driven animations via `animation-timeline: view()` with `animation-range: entry 0% cover 40%`, so the element resolves as it crosses the fold, no scroll library needed.
Guardrail: wrap in `@media (prefers-reduced-motion: no-preference)`; the reduced-motion path shows the element in its final state with no transform.
Animate opacity and transform only.

### View Transitions morph
An element or whole page that morphs into the next instead of cutting.
Fits galleries, product grids to detail pages and multi-step flows.
Sketch: the View Transitions API, `document.startViewTransition()` for same-document changes, matched `view-transition-name` on the shared element (a thumbnail growing into a hero).
Cross-document transitions via `@view-transition { navigation: auto; }` where supported.
Guardrail: the API is progressive, unsupported browsers simply cut; gate the animation portion on reduced-motion so it becomes an instant swap.

### Sticky scroll story
A pinned visual that changes as the reader scrolls through accompanying text (scrollytelling).
Fits explainers, data narratives and onboarding that teaches a sequence.
Sketch: `position: sticky` on the visual column, steps in the text column observed with `IntersectionObserver`, each step swapping the sticky visual's state.
Budget 1.5 to 2.5vh of scroll track per second of animation; a pinned stage with barely a viewport of track shows nothing.
For scrubbed video and canvas frame sequences (the product fly-through), load [parallax.md](parallax.md), Scrub Media section, before building.
Guardrail: under reduced-motion, drop the pin and render the steps as a plain stacked sequence that still reads in order.
Keep the swapped visuals light so pinning does not stutter.

### Custom cursor
A cursor that responds to context, growing over links or trailing the pointer.
Fits portfolios and brand sites where the pointer is part of the experience.
Sketch: hide the native cursor on a dedicated layer only, track `pointermove`, move a small element with `transform: translate3d()`, scale it on hover of interactive targets.
A trailing element on two desynchronized follows (x noticeably slower than y) moves organically instead of rigidly; detecting interactive targets from the computed `cursor: pointer` style needs no class list to maintain.
Guardrail: enable only for fine pointers via `@media (pointer: fine)`, never on touch, and keep the real cursor as fallback so nothing is lost if the script fails.
Do not hide the cursor over form fields.

### Magnetic or springy buttons
A button that leans toward the pointer or settles with a spring on press.
Fits a small number of primary calls to action, not every button.
Sketch: on `pointermove` within a threshold, translate the button a few pixels toward the pointer; release with a short spring easing.
Guardrail: reduced-motion removes the pull and keeps a plain hover state; the button must remain fully usable by keyboard with a visible focus ring.
Cap the displacement so the hit area does not wander away from the pointer.

### Split or scramble text reveal
A headline that assembles per character or word, or scrambles then resolves.
Fits a single hero headline, used once.
Sketch: split the line into spans (CSS `::first-line` cannot do this, so wrap words or use a small splitter), stagger their opacity and transform; the scramble variant cycles glyphs briefly before locking.
The genre's grammar, if you want the award look: characters rise from a masked parent (`overflow: hidden`) from 100-200% of their height with ~0.02s stagger; words from ~300% with 2-3deg of rotation and ~0.01s stagger; whole lines with ~0.3s stagger.
Guardrail: the real text must exist in the DOM for screen readers and for no-JS; the animation only styles what is already there.
Under reduced-motion, show the finished line immediately.

### Clip-path or mask reveal
An image or block revealed through an animated shape or wipe rather than a fade.
Fits image-led sections and section transitions.
Sketch: animate `clip-path` (an `inset()` or `polygon()`) or a CSS mask on entry, so the image is uncovered along a direction that suits the composition.
Three closed states cover most reveals: a central vertical slit `polygon(50% 0, 50% 0, 50% 100%, 50% 100%)`, a left edge `polygon(0 0, 0 0, 0 100%, 0 100%)` and a floor line `polygon(0 100%, 100% 100%, 100% 100%, 0 100%)`, each opening to the full rectangle; circ-out suits banners, power4-out images, power2-out micro-hovers.
Guardrail: reduced-motion shows the image fully uncovered; ensure the element has real dimensions so no layout shift occurs when the reveal completes.

### Marquee or ticker
A continuously scrolling strip of words, logos or values.
Fits a band of proof, a tagline loop or a values statement.
Sketch: duplicate the track and translate it with a CSS animation for a seamless loop; pause on hover for readability.
A velocity-reactive variant (speed and direction follow the scroll delta, a brief burst then settle) reads as a live surface rather than a GIF.
Guardrail: reduced-motion stops the scroll and shows a static, legible row; never put load-bearing single-instance information in a moving strip.
Keep it to one band, a ticker on every section is clutter.

### 3D tilt or layered parallax hero
A hero that tilts toward the pointer or moves its layers at different rates for depth.
Fits product shots and brand heroes with a clear focal object.
Sketch: layered elements translated on scroll or pointer at differing factors, or a `perspective` container with `transform: rotateX/rotateY` driven by pointer position.
Bound the tilt to 5-10deg with 500-700px of perspective, and always tween back to zero on leave; an unreturned tilt reads as broken.
Guardrail: keep parallax subtle, large offsets cause motion discomfort and can trigger overflow; disable tilt under reduced-motion and on touch.
Animate transform only, never top or margin.

### Canvas or WebGL hero
A generative or shader-driven hero, particles, fluid, a reactive field.
Fits a site whose concept is itself technical or generative, rarely otherwise.
Sketch: a `<canvas>` with a lightweight renderer, capped device pixel ratio and paused when off-screen via `IntersectionObserver`.
Gate on measured capability (GPU tier, a quick fps sample, pointer type) with the DOM as the default state, and drive the effect's uniforms with scroll or drag velocity so it self-attenuates the moment the visitor stops.
Keep any 3D model under ~5 MB (Draco or meshopt), or the loader becomes the experience.
Guardrail: ship a static image or CSS fallback first and enhance to canvas only after load and only if not reduced-motion; provide meaningful content behind it so nothing depends on the canvas rendering.
Budget it, a heavy hero that delays interaction trades memorability for a worse first impression.

## The universal guardrail

Every moment degrades gracefully and honors `prefers-reduced-motion`.
The reduced-motion path is not an afterthought, it is a designed state: the meaning survives without the movement, the content is fully present and nothing that mattered is hidden behind the effect.
A moment that breaks the page when the script fails, blocks interaction while it plays or ignores the reduced-motion preference is not a signature.
It is a liability wearing one.

One more failure shape: the full award-genre set, slit reveals plus split-text headlines plus a pinned video circle plus a marquee, deployed together with no variation.
Each element passes review on its own; the combination is the genre's template, and a template cannot be a signature.
Pick the one that serves the concept and drop the rest.
