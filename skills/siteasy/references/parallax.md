---
name: parallax
description: "Depth illusion through differential scroll velocity. Use as the operational reference whenever a project considers parallax, scrollytelling, multi-layer depth, or scroll-driven."
version: 1.7.0
---

# Parallax Engineering (2025 to 2026)

Depth illusion through differential scroll velocity. Use as the operational reference whenever a project considers parallax, scrollytelling, multi-layer depth, or scroll-driven reveals. Pair with [animation-engineering.md](animation-engineering.md), [motion-design.md](motion-design.md), [overdrive.md](overdrive.md), and [accessibility-engineering.md](accessibility-engineering.md).

The 2026 baseline assumes hardware-accelerated composition, native CSS Scroll-Driven Animations, and full compliance with WCAG 2.2.2 (Pause, Stop, Hide). Anything below that ships disabled.

## Decision Gate

Run this gate before touching code. If any answer is unclear, call AskUserQuestion.

| Question | Required answer to proceed |
|---|---|
| Register | brand or scrollytelling. Product UIs (dashboards, settings, admin) do not get parallax. |
| Frequency of view | Page is visited occasionally, not 100+ times a day. |
| Content readability | No body text or interactive control sits inside a moving layer. |
| Vestibular budget | A static fallback exists and is at parity for content. |
| Mobile target | Either disabled below 768px or simplified to one passive layer. |
| Performance budget | LCP element is not behind the parallax curtain. INP target stays under 200ms. |

If any row fails, do not implement. Either restructure the section or downgrade to a static composition with one subtle reveal.

## Effect Typology

Six canonical patterns. Pick one per section. Stacking two patterns in the same viewport produces motion sickness and rendering jank.

| Pattern | Mechanism | Use when | Avoid when |
|---|---|---|---|
| Vertical classic | Background and foreground travel at different vertical rates | Marketing hero, single editorial section | Above critical body copy |
| Horizontal | Lateral translate driven by vertical scroll | Timelines, panoramic galleries, case study walkthroughs | Mobile (touch conflicts with horizontal swipe) |
| Mouse-driven | Layers respond to cursor coordinates with damped follow | Hero, interactive product viewer | Touch-only contexts, accessibility-first sites |
| Multi-layer (bg, mid, fg) | Three or more strata with distinct velocity vectors | Brand storytelling, cinematic intros | Whenever frame budget is uncertain |
| Zoom (scale) | Element scales with scroll progression for tunnel focus | Product reveal, single-subject narrative | Long scroll sequences (zoom fatigue) |
| Reveal (fade-in) | Opacity and Y-translate tied to viewport position | Section transitions, progressive disclosure | When content must be readable immediately by crawlers and AT |

Default ratio for vertical multi-layer: background 0.3x, midground 0.6x, foreground 1x (anchor). Foreground may exceed 1x sparingly when chasing a focal point.

## Three Implementation Paths

Pick the lightest path that satisfies the brief. Heavier paths are not better, they cost frame budget and accessibility surface.

### Path A. Pure CSS, perspective transform

Cheapest, most stable, zero JavaScript thread cost. The browser compositor handles everything.

```css
.parallax-stage {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  perspective: 1px;
  perspective-origin: 0 0;
}

.parallax-layer {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
}

/* Background recedes (slower scroll, looks distant) */
.parallax-layer.bg {
  transform: translateZ(-2px) scale(3); /* scale = 1 + (Math.abs(z) / perspective) */
}

/* Midground */
.parallax-layer.mid {
  transform: translateZ(-1px) scale(2);
}

/* Foreground anchored to scroll */
.parallax-layer.fg {
  transform: translateZ(0);
}
```

Scale compensation is `1 + (|translateZ| / perspective)`. Skip it and the scene shrinks. Use only when the section owns its own scroll container; do not stack two perspective stages.

### Path B. CSS Scroll-Driven Animations (2026 baseline)

Native API. Animations run off the main thread on the compositor, hitting 60 to 120 FPS on mid-range mobile. Falls back gracefully where unsupported.

```css
@supports (animation-timeline: scroll()) {
  .parallax-bg {
    animation: shift-up linear both;
    animation-timeline: scroll(block nearest);
    animation-range: entry 0% exit 100%;
  }

  @keyframes shift-up {
    from { transform: translateY(20%); }
    to   { transform: translateY(-20%); }
  }

  .reveal-on-scroll {
    animation: rise linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 40%;
  }

  @keyframes rise {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}

@media (prefers-reduced-motion: reduce) {
  .parallax-bg,
  .reveal-on-scroll { animation: none !important; transform: none !important; opacity: 1 !important; }
}
```

Pair `scroll()` (the scroll container's progress) with `view()` (an element's position in the viewport). Use `view()` for entry reveals, `scroll()` for page-long backgrounds.

### Path C. Orchestrated JS (Lenis plus GSAP ScrollTrigger)

Reserve for projects that need pinning, scrubbed timelines, or multi-section choreography. The cost is a bundle around 50 to 80 KB gzipped plus main-thread work that must be budgeted.

```js
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => 1 - Math.pow(1 - t, 4), // ease-out-quart
  smoothWheel: true,
  smoothTouch: false, // never on mobile
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Respect reduced motion at runtime, not just CSS
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
if (reduce.matches) { lenis.destroy(); }
reduce.addEventListener('change', (e) => { if (e.matches) lenis.destroy(); });

gsap.to('.parallax-bg', {
  yPercent: -20,
  ease: 'none',
  scrollTrigger: {
    trigger: '.parallax-section',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
  },
});
```

Lenis normalizes wheel and trackpad input through lerp interpolation. Never enable `smoothTouch`, mobile scrolling must stay native. Destroy the instance when reduced-motion is active or when the section unmounts.

## Core Web Vitals Discipline

Parallax that ships with weak Core Web Vitals is the single fastest way to destroy a brand site. Treat the three vitals as preflight gates.

### LCP (Largest Contentful Paint)

The LCP candidate must not depend on a script firing. Concretely:
- Convert any background image to AVIF (with WebP fallback) and serve under 200 KB.
- Use `fetchpriority="high"` on the LCP image, and `loading="eager"` for above-the-fold layers only.
- Below-the-fold parallax layers must use `loading="lazy"` and `decoding="async"`.
- Preconnect to image CDN. Inline the LCP image's critical CSS.

### CLS (Cumulative Layout Shift)

Parallax that injects layers via JS without reserved space ships a CLS penalty. Mandatory:
- Every layer container has explicit `aspect-ratio` or width/height.
- Images carry explicit `width` and `height` attributes (not just CSS).
- Custom fonts use `font-display: swap` plus `size-adjust` or a metric-compatible fallback.
- Never animate layout properties (`height`, `margin`, `top`). Use `transform` only.

### INP (Interaction to Next Paint)

The metric that punishes naive scroll handlers. Mandatory:
- All scroll listeners use `{ passive: true }`.
- Coordinate work with `requestAnimationFrame`, never run logic synchronously inside `scroll`.
- Declare moving layers with `will-change: transform` (only while active; remove on idle to free GPU memory).
- Use `content-visibility: auto` plus `contain-intrinsic-size` on offscreen parallax sections.

Target benchmarks: LCP under 2.5s, CLS under 0.1, INP under 200ms (canonical: L-PERF-1, L-PERF-2, L-PERF-3 in tools/data/laws.csv). If any vital regresses by more than 10 percent after parallax is added, roll back.

## Vestibular Accessibility (non-negotiable)

Around 70 million people live with vestibular disorders. Parallax can trigger nausea, vertigo and migraine. The hard rules:

### 1. Honor `prefers-reduced-motion: reduce`

Drop in this CSS reset at the top of the stylesheet, then layer specific overrides:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .parallax-bg,
  .parallax-layer { transform: none !important; }
  .parallax-bg { background-attachment: scroll !important; }
}
```

Mirror the check in JavaScript for any JS-driven motion (Lenis, GSAP). CSS alone is not enough when a script computes positions.

### 2. Ship a manual toggle

Even with system-level reduced motion, expose a visible control such as "Reduce motion" in the footer or settings. Persist with `localStorage`. Required by WCAG 2.2.2 when any moving content auto-plays for more than five seconds.

```html
<button type="button" data-motion-toggle aria-pressed="false">Reduce motion</button>
```

```js
const btn = document.querySelector('[data-motion-toggle]');
const reduced = localStorage.getItem('reduceMotion') === '1';
document.documentElement.dataset.motion = reduced ? 'reduce' : 'full';
btn.setAttribute('aria-pressed', reduced);

btn.addEventListener('click', () => {
  const next = document.documentElement.dataset.motion === 'reduce' ? 'full' : 'reduce';
  document.documentElement.dataset.motion = next;
  btn.setAttribute('aria-pressed', next === 'reduce');
  localStorage.setItem('reduceMotion', next === 'reduce' ? '1' : '0');
});
```

```css
:where([data-motion="reduce"]) .parallax-layer { transform: none !important; }
```

### 3. Preserve text contrast through motion

Moving backgrounds destroy text contrast unpredictably. Mandate:
- Text contrast ratio above 4.5:1 across the entire travel range of the layer underneath.
- Use a semi-transparent overlay (`background: oklch(0% 0 0 / 0.45)`) below text when in doubt.
- Generous internal padding (1.5rem minimum) so text never grazes the layer edge.

## Mobile Strategy: Progressive Enhancement

Treat mobile as a separate experience, not a downscaled desktop. Three tiers:

| Tier | Viewport | Parallax allowed | Implementation |
|---|---|---|---|
| Tier 1 | under 768px | None or one passive reveal | Static layout, `IntersectionObserver` for opacity-only fade-in |
| Tier 2 | 768 to 1199px | Single layer max, no scrub | CSS Scroll-Driven Animations, no Lenis |
| Tier 3 | 1200px and up plus `(hover: hover)` | Full multi-layer composition | Lenis plus GSAP allowed |

Disable patterns:

```css
@media (max-width: 767px), (prefers-reduced-motion: reduce), (pointer: coarse) {
  .parallax-stage { perspective: none; }
  .parallax-layer { transform: none !important; }
  .parallax-bg { background-attachment: scroll !important; }
}
```

Never use `background-attachment: fixed` on iOS Safari. It causes layer juddering and visible repaints. Force GPU compositing with `translate3d(0, 0, 0)` or `transform: translateZ(0)` on any layer that moves.

## Scrollytelling Architecture

Four pillars for narrative parallax sections:

1. Narrative coherence. Each scroll segment advances a single beat of the story. One animation per beat, no parallel motion.
2. Attention guidance. The fastest-moving layer carries the focal point. The slowest layer anchors the scene.
3. Rhythm management. Alternate motion segments with static rest segments. A 100vh static section between two animated segments lets the user breathe.
4. Active interactivity. Map scroll progress to content reveal, not autoplay. The user must feel they pilot the discovery.

### Beats are covered, not crossfaded

A crossfade is the default transition, which is exactly why it reads as unconsidered. N beats joined by N identical fades is the single loudest "nobody decided this" signal a scrolly can send, and readers name it long before an audit does. A beat should be **covered** by the next one, the way a cut works in film: the outgoing beat keeps moving underneath while the incoming one wipes over it, so the two layers have a spatial relationship instead of dissolving into mush.

Give each boundary its own mechanism, motivated by the story rather than picked from a move set: a blind pulling down, a window growing until it becomes the page, an iris opening out of a focal point, a hard cut on identical pixels (which reads as a freeze frame), a wipe with a coloured leading edge, a letterbox opening. `clip-path` on the incoming layer does all of these and costs one composited property. Reserve the crossfade for when two beats genuinely have no spatial relationship.

Opacity on a covered beat should be a **step**, never a ramp: it exists to unmount the layer once it is fully hidden, not to fade it. And pair it with `pointer-events: none` (rule 69) or the invisible layer keeps eating clicks.

### Beats get weights, not equal segments

Dividing the track into N equal segments is an arithmetic decision standing in for an editorial one. A beat lasts as long as it takes to read, and beats do not take the same time: a terminal that types itself out, or a step that stamps in five annotations, needs dwell that a blank sheet does not. Weight each beat, normalise, and derive the boundaries from that. Equal segments are why a beat gets cut off mid-sentence while a static one overstays.

### A hand keeps its own clock

Scroll-scrubbing is for anything the reader should feel they pilot. It is wrong for anything that imitates a human motor act, handwriting and typing above all: scrubbing ties the pen's speed to the wheel, so the stroke rate becomes whatever the reader's scroll happens to be, and no hand moves that way. Play those on a real clock, let scroll only trigger them, and vary the per-glyph timing (a capital carries more strokes than a lowercase, and the small gap after it is where a real hand lifts). The unevenness is what makes it read as written rather than wiped.

### Scrub easing (L-MOTION-3)

Scrubbed tweens are linear; the perceived easing comes from the visitor's scroll. Reusing a time-based curve here is the most common way to break that law, because the curve looks right in isolation. Concrete diagnostic: **an expo-out tween is ~90% complete at the midpoint of its scroll window** — it snaps shut and then waits while the reader is still scrolling. Sample any scrub at 50% of its range and check the visual sits near 50%. If it is nearly finished, the curve is fighting the scrollbar.

Data stories add four disciplines on top of the pillars:

- One step, one change, one takeaway. The reader must be able to say what changed between two steps; a step with no perceptible response breaks trust in the medium.
- Steps are self-contained. The narration still reads if the sticky visual never loads ("sales tripled in 2024", not "as you can see here").
- Open and close on the whole. Zoom and highlight in between so every detail stays situated. Scrollytelling is only justified when each step transforms the SAME visual; unrelated images per step is an article, not a scrolly.
- The narrative column stays readable: 300 to 400px wide, 14pt minimum, on its own background. Teaching an unfamiliar chart form works well as a scrolly: first how to read the shape, then the data.


Reference scaffold (Path B):

```html
<article class="story">
  <section class="story__beat" data-beat="1">
    <h2>First beat</h2>
    <figure class="story__visual reveal-on-scroll">...</figure>
  </section>
  <section class="story__rest"></section>
  <section class="story__beat" data-beat="2">...</section>
</article>
```

```css
.story__beat { min-height: 100vh; display: grid; place-items: center; }
.story__rest { min-height: 30vh; }

.story__visual {
  animation: rise linear both;
  animation-timeline: view();
  animation-range: entry 15% cover 50%;
}
```

## Scrub Media (Video and Image Sequences)

The Apple-style product fly-through: a pinned stage whose video time or frame index is driven by scroll. It is the heaviest scrollytelling pattern on the weight and decode budget, so it carries its own engineering rules.

### Track sizing and progress

- Reserve real scroll track: an N-vh container with a `position: sticky; top: 0; height: 100vh` child (no pin-spacer, no de-pin layout shift). Budget 1.5 to 2.5vh of track per second of scrubbed footage.
- Leave ~10% of the track as a dead margin at the end so the final frame settles before the stage unpins.
- Think in progress units (0 to 100% of the section), never in seconds. "The overlay enters at 60% and is gone by 100%" survives resizes and content changes; a duration does not.
- Scrubbed tweens use linear easing. The easing the visitor feels is their own scroll velocity; a dramatic curve on top reads as lag.
- Overlay choreography uses four points per message, [enter, plateau start, plateau end, exit], with plateaus of 6 to 10% of the progress and similar gaps between messages. Couple opacity, y and scale on the same points.

### Video scrub engine rules

- Load the clip as a Blob and play it through `URL.createObjectURL`. A Blob is always seekable; a static host without HTTP range support pins `video.seekable` to [0,0] and every seek snaps to frame zero.
- Smooth the target with a lerp of ~0.18 per rAF frame, and never assign `currentTime` while `video.seeking` is true; the lerp catches up when the decoder frees. Seek epsilon ~0.008s desktop, ~0.02s mobile (fewer decodes).
- iOS: a muted video that has never played will not paint a seeked frame. Keep the poster on top until the first real `seeked` event, and on the first `pointerdown`/`touchstart` (once, passive) run a muted `play()` then `pause()` on each clip.
- Encode for scrubbing: native resolution, `crf 20`, GOP 8 (`-g 8 -keyint_min 8 -sc_threshold 0`), no audio, `+faststart`. Ship a mobile sibling at 720p, GOP 4, `crf 23`; a phone's seek cost is dominated by the distance to the previous keyframe. All-intra triples the weight for nothing.
- When chaining generated or edited clips, cut on rendered frames (extract the actual last frame, `ffmpeg -sseof -0.15`), never on the original stills, or every seam pops. Never reverse the camera's velocity across a seam; scrolled in either direction it reads as a rewind.

### Image-sequence (canvas) rules

- Map progress to a frame index and redraw only when the index changes. A handler that redraws on every scroll event burns the frame budget on identical frames.
- Implement cover/contain by comparing ratios, and reset the canvas transform (`setTransform(1,0,0,1,0,0)` then `scale(dpr)`) on every DPR resize, or transforms accumulate.
- Load progressively in a window around the scroll position instead of instantiating the full set at mount. Fifty-plus `new Image()` calls up front is a network and memory burst the deterministic audit flags (`frame-sequence-preload`).

### Weight, honesty and reduced motion

- Budget: keep referenced video under ~10 MB (L-MEDIA-1; sequences: L-MEDIA-3). 30 to 50 MB heroes are the observed failure mode of the genre; the audit weighs referenced media (`media-weight`).
- Loaders report real progress (assets loaded / total). A simulated percentage that crawls to 95% on a timer is a fake wait and reads as one.
- Reduced motion means not downloading the media at all: cross-fade the posters, cut the particles, drop the lerp. A slowed-down scrub is still a scrub.
- Mobile resize guard: browsers fire `resize` when the URL bar collapses. Ignore resizes at unchanged width on coarse pointers or the stage jumps mid-scroll; keep the full relayout on `orientationchange`.

## AI-Adaptive Parallax (runtime governance)

By 2026, parallax intensity is no longer fixed at build time. It adapts to device, battery and user pace. Embed this governance layer alongside the motion code.

```js
// Adaptive parallax governance
const governance = {
  intensity: 1.0, // 0 disables, 1 is full
  reasons: [],
};

// 1. Hardware tier
const cores = navigator.hardwareConcurrency || 4;
const memory = navigator.deviceMemory || 4;
if (cores <= 4 || memory <= 4) {
  governance.intensity = Math.min(governance.intensity, 0.5);
  governance.reasons.push('low-tier hardware');
}

// 2. Battery state
if ('getBattery' in navigator) {
  const b = await navigator.getBattery();
  if (b.level < 0.2 && !b.charging) {
    governance.intensity = Math.min(governance.intensity, 0.3);
    governance.reasons.push('low battery');
  }
}

// 3. Network conditions
const conn = navigator.connection;
if (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType))) {
  governance.intensity = 0;
  governance.reasons.push('save-data or slow network');
}

// 4. Reduced motion (highest priority)
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  governance.intensity = 0;
  governance.reasons.push('prefers-reduced-motion');
}

// 5. User velocity (calm intense scrollers, enrich slow ones)
let lastScroll = 0, lastTime = performance.now();
addEventListener('scroll', () => {
  const now = performance.now();
  const dt = now - lastTime;
  const dy = Math.abs(scrollY - lastScroll);
  const velocity = dy / dt; // px per ms
  if (velocity > 3) { document.documentElement.style.setProperty('--parallax-scale', '0.4'); }
  else if (velocity < 0.5) { document.documentElement.style.setProperty('--parallax-scale', '1'); }
  else { document.documentElement.style.setProperty('--parallax-scale', '0.7'); }
  lastScroll = scrollY; lastTime = now;
}, { passive: true });

document.documentElement.style.setProperty('--parallax-intensity', governance.intensity);
```

```css
.parallax-layer {
  --travel: calc(20% * var(--parallax-intensity, 1) * var(--parallax-scale, 1));
  animation-range: entry 0% exit 100%;
  /* keyframes use var(--travel) instead of a hardcoded distance */
}
```

This pattern ships a single composition that self-throttles on weak hardware, low battery, slow networks, motion-sensitive users and fast-scrolling visitors. No second build, no detection-by-user-agent.

## SEO and Crawlability

Parallax sites historically lose ground on SEO when content lives inside JS-painted layers. Hard rules:

- All textual content sits in the initial HTML DOM, not injected by IntersectionObserver.
- Single-page parallax stories use semantic landmarks (`<section>`, `<article>`) and anchor URLs (`#chapter-2`) for fragment indexing.
- Hero imagery uses `<img>` with `alt` text, never CSS background-image alone for content-bearing visuals.
- Schema.org `Article` or `ImageGallery` JSON-LD declares the section structure. See [../../seo/references/schema.md](../../seo/references/schema.md).

Dwell time and reduced bounce from a well-tuned parallax page feed positive ranking signals. Janky parallax does the opposite, fast.

## Production Snippets Library

Copy and adapt. All assume the reduced-motion reset and governance layer are already in place.

### Hero with multi-layer scroll-driven depth

```html
<header class="hero parallax-stage">
  <div class="parallax-layer bg" aria-hidden="true"><img src="bg.avif" width="1920" height="1080" alt=""></div>
  <div class="parallax-layer mid" aria-hidden="true"><img src="mid.avif" width="1920" height="1080" alt=""></div>
  <div class="parallax-layer fg">
    <h1>Headline anchored to scroll</h1>
    <p>Body copy stays still and readable.</p>
  </div>
</header>
```

```css
.hero { position: relative; height: 100svh; overflow: clip; isolation: isolate; }
.parallax-layer { position: absolute; inset: 0; }
.parallax-layer img { width: 100%; height: 100%; object-fit: cover; }

@supports (animation-timeline: scroll()) {
  .parallax-layer.bg  { animation: drift-slow  linear both; animation-timeline: scroll(); }
  .parallax-layer.mid { animation: drift-med   linear both; animation-timeline: scroll(); }
}

@keyframes drift-slow { from { transform: translateY(0); } to { transform: translateY(-10%); } }
@keyframes drift-med  { from { transform: translateY(0); } to { transform: translateY(-25%); } }
```

### Horizontal pinned timeline

```js
gsap.to('.timeline__track', {
  xPercent: -80,
  ease: 'none',
  scrollTrigger: {
    trigger: '.timeline',
    pin: true,
    scrub: 1,
    end: () => `+=${document.querySelector('.timeline__track').scrollWidth}`,
  },
});
```

### Mouse-driven hero (cursor follow, damped)

```js
const layers = document.querySelectorAll('.hero .layer');
let mx = 0, my = 0, tx = 0, ty = 0;

addEventListener('pointermove', (e) => {
  mx = (e.clientX / innerWidth - 0.5);
  my = (e.clientY / innerHeight - 0.5);
}, { passive: true });

(function tick() {
  tx += (mx - tx) * 0.08;
  ty += (my - ty) * 0.08;
  layers.forEach((el, i) => {
    const depth = (i + 1) * 6;
    el.style.transform = `translate3d(${tx * depth}px, ${ty * depth}px, 0)`;
  });
  requestAnimationFrame(tick);
})();
```

## Audit Checklist

Run before every ship. A single fail is a blocker.

| Category | Check | Pass threshold |
|---|---|---|
| Performance | LCP image format | AVIF or WebP, under 200 KB |
| Performance | LCP | under 2.5s on Moto G Power throttle |
| Performance | CLS | under 0.1 |
| Performance | INP | under 200ms p75 |
| Performance | Frame budget | 60 FPS sustained on mid-range Android |
| Accessibility | `prefers-reduced-motion` | Honored, full content parity |
| Accessibility | Manual motion toggle | Present, persistent, keyboard-reachable |
| Accessibility | Text contrast across travel | 4.5:1 minimum, measured at start, middle, end |
| Accessibility | WCAG 2.2.2 | Pause/Stop/Hide available for any motion above 5s |
| Mobile | Behavior below 768px | Static or one passive layer, no horizontal hijack |
| Mobile | Safari iOS | No `background-attachment: fixed`, no judder |
| Code | Properties animated | Only `transform` and `opacity` (plus `filter` if bounded) |
| Code | Listeners | All scroll listeners `passive: true` |
| Code | `will-change` hygiene | Set when active, removed on idle |
| SEO | Content in initial DOM | Yes, not script-injected |
| SEO | Semantic landmarks plus anchors | Present for each chapter |
| Scrollytelling | Beat transitions | Each boundary has its own mechanism; no boundary repeats another's |
| Scrollytelling | Beat pacing | Segments weighted to reading time, never N equal N-ths |
| Scrollytelling | Faded beats | Every `opacity: 0` full-bleed layer also has `pointer-events: none` |
| Scrollytelling | Scrub sampling | At 50% of any scrub's range, the visual sits near 50% (L-MOTION-3) |
| Scrub media | Referenced video weight | under 10 MB (`media-weight` check) |
| Scrub media | Autoplay hygiene | `muted` + `playsinline` + `poster` on every autoplay video |
| Scrub media | Loader honesty | progress = real assets loaded, never a simulated percentage |

A Playwright-based audit script is available at [../scripts/parallax-audit.mjs](../scripts/parallax-audit.mjs).

## Review Heuristics

When critiquing existing parallax code, score against:

| Heuristic | 10/10 | 5/10 | 1/10 |
|---|---|---|---|
| Purpose | Motion advances narrative | Motion decorative but consistent | Motion exists because trendy |
| Performance | 60 FPS on mid-range, vitals green | Occasional drops, vitals borderline | Sustained jank, vitals red |
| Accessibility | Toggle plus media query plus JS guard | Media query only | No accommodation |
| Mobile | Differentiated tiers | Same code, scaled down | Identical to desktop |
| Robustness | Static fallback equally beautiful | Fallback functional but plain | Fallback broken |
| Content | Text readable across full travel | Mostly readable | Contrast lost mid-scroll |

Sum across rows. Above 50 ships. 30 to 50 needs rework. Below 30, strip the parallax.

## Anti-Patterns to Refuse

Match-and-refuse list. If the brief implies any of these, push back before writing code.

- Parallax wrapping the LCP image without `fetchpriority="high"` and explicit dimensions.
- Parallax on body text. Text never moves at a different velocity from its anchor.
- `background-attachment: fixed` as the primary technique (iOS broken, jank-prone everywhere).
- Mouse-driven parallax that disables on touch but leaves a dead zone instead of a static fallback.
- Auto-scrolling parallax over 5 seconds with no pause control.
- Three or more layers on mobile.
- Continuous rotation, infinite zoom, or stacked horizontal-plus-vertical movement.
- Parallax behind interactive controls (CTA, form, navigation). Controls stay still, period.
- The same crossfade on every beat boundary of a scrolly. A fade is the default, so N identical fades reads as N decisions nobody made. Each boundary earns its own mechanism, or the beats are not distinct enough to be beats.
- A scrolly track cut into N equal segments. That is arithmetic standing in for editing: a beat lasts as long as it takes to read, and a typing terminal does not take as long as a blank sheet.
- A full-bleed beat faded to `opacity: 0` without `pointer-events: none`. It is invisible and still eats every click underneath (rule 69).
- Scrubbing a handwriting or typing animation. It ties the pen to the wheel, so the stroke rate is whatever the reader's scroll happens to be.
- JS scroll handler without `passive: true` or without `rAF` coalescing.
- `transition: all` on a parallax layer.
- A pin or sticky stage without scroll track (parent no taller than the viewport): the animation has zero distance and either flashes or never shows.
- A sticky or pinned element under an ancestor with `transform`, `filter` or `will-change: transform`; the ancestor becomes its containing block and the pin silently breaks.
- Waypoints or callbacks at exactly 0% or 100% of a timeline: reverse callbacks are unreliable at the bounds, place them slightly inside.
- Two smoothing systems at once (`scroll-behavior: smooth` in CSS on top of Lenis or ScrollSmoother).
- Hiding the document scrollbar (`scrollbar-width: none`, `::-webkit-scrollbar` at zero width); the position indicator and the accessibility API go with it.
- Preloading a full frame sequence at mount behind a blocking loader.
- A resize handler that recomputes layout without a width guard (the mobile URL bar collapse fires resize).

## Resource hooks

Resolve tooling from the plugin's data instead of memory:

- Scroll engines and scrollytelling libraries, with maintenance notes: `python3 tools/design-system/scripts/search.py "scrollytelling" --domain resources`
- Sites to calibrate a scrolly against: `python3 tools/design-system/scripts/search.py "scrollytelling" --domain inspiration`
- The right reference for a sub-topic: `node tools/search-references.mjs "scrub video" --skill siteasy`

## Cross-References

- Frame budget and easing curves: [animation-engineering.md](animation-engineering.md)
- Duration and motion philosophy: [motion-design.md](motion-design.md)
- Scroll-driven advanced techniques: [overdrive.md](overdrive.md)
- Reduced motion and assistive tech: [accessibility-engineering.md](accessibility-engineering.md)
- LCP, CLS, INP optimization: [optimize.md](optimize.md)
- Mobile breakpoints and adaptation: [responsive-design.md](responsive-design.md)
- Schema.org for scrollytelling: ../../seo/references/schema.md
