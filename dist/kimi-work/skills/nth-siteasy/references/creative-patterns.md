---
name: creative-patterns
description: "Arsenal of bold creative techniques for /nth-siteasy overdrive, delight, and build. Use selectively; the point is intentionality, not novelty for its own sake."
version: 1.10.1
---

# Creative Patterns

*Arsenal of high-end UI patterns for `/nth-siteasy overdrive`, `/nth-siteasy delight`, and ambitious `/nth-siteasy build` work. Use selectively — the point is intentionality, not implementing everything at once.*

---

## Dialing In the Ambition Level

Before choosing patterns, set the intent across three axes:

**Design Variance** (how much does the layout break from convention?)
- 1–3: Centered, symmetrical, safe — product defaults, data-heavy UIs
- 4–7: Offset — overlapping elements, varied aspect ratios, left-aligned heroes
- 8–10: Asymmetric — masonry, fractional grid units, massive breathing room (`padding-left: 20vw`)

**Motion Intensity** (how alive does it feel?)
- 1–3: No automatic animation. `:hover` and `:active` only
- 4–7: CSS transitions, `transform`/`opacity`, load-in cascades
- 8–10: Spring physics, scroll-triggered choreography, perpetual micro-animations

**Visual Density** (how packed is the information?)
- 1–3: Art gallery mode — huge gaps, very expensive feel
- 4–7: Standard product app
- 8–10: Cockpit mode — 1px dividers, no boxes, `font-mono` for all numbers

Mobile override: at variance 4–10, any asymmetric layout above `md:` must collapse to strict single-column (`w-full px-4`) to prevent horizontal scroll.

---

## Navigation Patterns

**Mac OS Dock Magnification** — icons scale fluidly on hover, everything around them subtly shifts

**Magnetic Button** — button physically pulls toward the cursor. Use Framer Motion `useMotionValue` and `useTransform` *outside* the React render cycle. Never `useState` for magnetic hover — it collapses on mobile.

**Dynamic Island** — pill-shaped component that morphs to show status/alerts. Use Framer `layoutId` for the shape transition.

**Contextual Radial Menu** — circular menu expanding at the exact click coordinates

**Mega Menu Reveal** — full-screen dropdown with staggered content (`staggerChildren`)

**Floating Speed Dial** — FAB that springs into a curved arc of secondary actions

---

## Layout Patterns

**Bento Grid** — asymmetric tile-based grouping (Apple Control Center aesthetic). Grid columns `2fr 1fr 1fr`, or `repeat(3, 1fr)` with spanning cells; `gap: 1.5rem`.

Palette: `bg-[#f9fafb]` base, pure white cards with `border border-slate-200/50`, `rounded-[2.5rem]`, diffusion shadow `shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]`. Labels outside and below cards. `p-8` or `p-10` inside.

**Masonry Layout** — staggered grid without fixed row heights. Use `columns` CSS property or a JS library.

**Chroma Grid** — grid borders or tiles with continuously animating subtle color gradients

**Split Screen Scroll** — two halves sliding in opposite directions on scroll

**Curtain Reveal** — hero section parting in the middle like a curtain on scroll

**Asymmetric Hero (the standard alternative)** — text left-aligned, background image with directional fade into background color. Never: centered text over a dark image.

---

## Card Patterns

**Parallax Tilt Card** — 3D-tilting card tracking mouse coordinates. Use `rotateX`/`rotateY` with `transform-style: preserve-3d`.

**Spotlight Border Card** — border illuminates dynamically under cursor position. Track mouse with `mousemove`, update a CSS variable for the radial gradient position.

**Glassmorphism Panel (done right)** — go beyond `backdrop-blur`. Add a 1px inner border (`border-white/10`) and subtle inner shadow (`shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`) to simulate physical edge refraction. Use rarely and purposefully.

**Holographic Foil Card** — iridescent rainbow reflections shifting on hover. CSS `hue-rotate` + `background: linear-gradient` layered with `mix-blend-mode`.

**Morphing Modal** — button that seamlessly expands into its full-screen dialog. Use Framer `layoutId` between button and dialog.

---

## Scroll Animations

**Sticky Scroll Stack** — cards stick at top and physically stack over each other as user scrolls down

**Horizontal Scroll Hijack** — vertical scroll translates to smooth horizontal gallery pan

**Zoom Parallax** — background image zooms in/out as user scrolls

**Scroll Progress Path** — SVG lines that draw themselves as the user scrolls. Use `pathLength` in Framer or `stroke-dashoffset` driven by scroll position.

**Scroll-triggered image reveal** — IntersectionObserver, or Framer's `useInView` with `{ once: true, rootMargin: '-100px' }`, animating `clip-path` from `inset(0 0 100% 0)` to `inset(0 0 0 0)`.

Never use `window.addEventListener('scroll')` directly. Use IntersectionObserver or Framer's scroll hooks.

---

## Typography Patterns

**Kinetic Marquee** — infinite scrolling text band. Reverse direction or accelerate on scroll/hover.

**Text Mask Reveal** — large type as a transparent window into a video or image background. CSS `background-clip: text` (this is one valid use — for display type, not body text).

**Text Scramble** — Matrix-style character decoding. Replace characters with random ASCII on a timer, resolve to target text.

**Typewriter Effect with States** — cycle through multiple prompts with blinking cursor and processing state.

**Stagger reveal on scroll:**
```css
.word {
  opacity: 0;
  transform: translateY(12px);
  animation: wordIn 400ms var(--ease-out-ui) forwards;
  animation-delay: calc(var(--i) * 40ms);
}
```

---

## Micro-Interaction Patterns

**Particle Explosion on Success** — CTA shatters into particles on completion. Use canvas or absolute-positioned divs with physics.

**Ripple Click Effect** — visual wave from exact click coordinates. Scale a circle from `transform: scale(0)` to `scale(4)` while fading out, origin set to click position.

**Directional Hover Fill** — hover color fills from the exact side the cursor entered. Track `mouseenter` direction (top/right/bottom/left), set `clip-path` or `transform` accordingly.

**Skeleton Shimmer** — shifting light gradient across placeholder boxes. Use `background: linear-gradient(90deg, ...)` animated with `background-position`.

**Mesh Gradient Background** — organic animated color blobs (lava lamp). Use radial gradients on multiple `::before`/`::after` layers animated with `@keyframes`.

---

## Bento 2.0 — The Five Card Archetypes

For SaaS dashboards and feature sections, implement these perpetual animations:

1. **Intelligent List** — infinite auto-sorting loop with `layoutId`. Items swap positions simulating AI prioritization. Use `AnimatePresence` + `layout` prop.

2. **Command Input** — AI search bar with typewriter cycling through complex prompts. Blinking cursor, processing shimmer between prompts.

3. **Live Status** — scheduling interface with "breathing" status dots (pulsing scale). Notification badge emerges with spring overshoot (`bounce: 0.3`), stays 3s, vanishes.

4. **Data Stream** — infinite horizontal carousel: `animate={{ x: ["0%", "-100%"] }}`, `transition={{ repeat: Infinity, duration: 20, ease: "linear" }}`.

5. **Focus Mode** — document view with staggered text highlight, then float-in of a floating toolbar with micro-icons.

**Performance mandate for perpetual animations:** Wrap in `React.memo`. Isolate each animated card in its own `"use client"` leaf component. Never trigger parent re-renders from infinite loops.

---

## Architecture Notes (React/Next.js)

**RSC safety** — global state only works in Client Components. Wrap providers in `"use client"`.

**Interactivity isolation** — any component with spring animations or perpetual motion must be extracted as an isolated leaf `"use client"` component. Server Components render static layouts only.

**GSAP vs Framer Motion** — never mix in the same component tree. Framer Motion for UI/Bento interactions. GSAP/ThreeJS exclusively for isolated full-page scrolltelling or canvas backgrounds, wrapped in `useEffect` cleanup blocks.

**Declarative 3D (React Three Fiber)** — the renderer is declarative, the engine underneath is not. Object props built inline (`position={new THREE.Vector3(...)}`, `geometry={new THREE.SphereGeometry(...)}`) are recreated on every render and defeat the engine's caches: pass constructor `args` and scalar shorthands instead. Subscribe to state with selectors, never whole-store subscriptions, and read fast-changing state non-reactively inside the frame loop (`getState()`), or every frame re-renders the component tree. 3D pointer events cost a raycast: keep them off large scenes, prune with a filter, and remember occlusion does not block events by default.

**Grain/noise filters** — apply only to `fixed, pointer-events-none` pseudo-elements. Never on scrolling containers — causes continuous GPU repaints.

---

## Forbidden Patterns (AI Tells)

These patterns signal "AI made this." Avoid unless explicitly requested.

### Visual
- **Neon/outer glows** — use inner borders or tinted shadows instead
- **Pure black (`#000`)** — use Off-Black, `zinc-950`, or a dark neutral with slight hue
- **Oversaturated accents** — desaturate to blend with neutrals; saturation < 80%
- **AI Purple/Blue gradient aesthetic** — blue button glows, neon gradients. Use neutral bases (Zinc/Slate) with singular, concrete accents
- **Gradient text on body copy** — reserved for display-only moments, never paragraphs
- **Custom mouse cursors** — outdated, hurt performance and accessibility

### Typography
- **Inter** — banned. Use Geist, Cabinet Grotesk, or Satoshi
- **Oversized H1 that screams** — control hierarchy through weight and color, not scale alone
- **Serif fonts on dashboards or software UIs** — use high-end sans pairings (Geist + Geist Mono, Satoshi + JetBrains Mono)

### Layout
- **Three-column equal card layout** — the generic "icon + heading + text × 3" feature row. Use 2-column zig-zag, asymmetric grid, or horizontal scroll instead
- **Centered hero with centered text over dark image** — default of all defaults. Use asymmetric split

### Content (the "Jane Doe" effect)
- **Generic names** — John Doe, Sarah Smith, User 1. Invent realistic, specific-feeling names
- **Generic SVG user avatars** — use creative placeholders or `picsum.photos/seed/{word}/80/80`
- **Predictable placeholder numbers** — 99.99%, 50%, 1234567. Use organic messy data: 47.2%, +1 (312) 847-1928
- **Startup Slop names** — Acme, Nexus, SmartFlow, SyncHub. Invent contextual brand names
- **AI copywriting clichés** — "Elevate", "Seamless", "Unleash", "Next-Gen", "Cutting-edge". Use concrete verbs
- **Unsplash links** — broken constantly. Use `https://picsum.photos/seed/{keyword}/800/600`

### Emojis
Banned in code, markup, text content, and alt text. Replace with high-quality icons (Radix, Phosphor) or SVG primitives.
