---
name: overdrive
description: "Advanced visual effects for high-impact interfaces: the View Transitions API, WebGL, and scroll-driven animations."
version: 1.11.1
---

Start your response with:

```
──────────── ⚡ OVERDRIVE ─────────────
》》》 Entering overdrive mode...
```

Push an interface past conventional limits. This isn't just about visual effects. It's about using the full power of the browser to make any part of an interface feel extraordinary: a table that handles a million rows, a dialog that morphs from its trigger, a form that validates in real-time with streaming feedback, a page transition that feels cinematic.

**EXTRA IMPORTANT FOR THIS COMMAND**: Context determines what "extraordinary" means. A particle system on a creative portfolio is impressive. The same particle system on a settings page is embarrassing. But a settings page with instant optimistic saves and animated state transitions? That's extraordinary too. Understand the project's personality and goals before deciding what's appropriate.

### Propose Before Building

This command has the highest potential to misfire. Do NOT jump straight into implementation. You MUST:

1. **Think through 2-3 different directions**: consider different techniques, levels of ambition, and aesthetic approaches. For each direction, briefly describe what the result would look and feel like.
2. **STOP and call the AskUserQuestion tool to clarify.** to present these directions and get the user's pick before writing any code. Explain trade-offs (browser support, performance cost, complexity).
3. Only proceed with the direction the user confirms.

Skipping this step risks building something embarrassing that needs to be thrown away.

### Iterate with Browser Automation

Technically ambitious effects almost never work on the first try. You MUST actively use browser automation tools to preview your work, visually verify the result, and iterate. Do not assume the effect looks right, check it. Expect multiple rounds of refinement. The gap between "technically works" and "looks extraordinary" is closed through visual iteration, not code alone.

---

## Assess What "Extraordinary" Means Here

The right kind of technical ambition depends entirely on what you're working with. Before choosing a technique, ask: **what would make a user of THIS specific interface say "wow, that's nice"?**

### For visual/marketing surfaces
On pages, hero sections, landing pages and portfolios the "wow" is often sensory: a scroll-driven reveal, a shader background, a cinematic page transition, generative art that responds to the cursor.

### For functional UI
On tables, forms, dialogs and navigation the "wow" is in how it FEELS: a dialog that morphs from the button that triggered it via View Transitions, a data table that renders 100k rows at 60fps via virtual scrolling, a form with streaming validation that feels instant, drag-and-drop with spring physics.

### For performance-critical UI
The "wow" is invisible but felt: a search that filters 50k items without a flicker, a complex form that never blocks the main thread, an image editor that processes in near-real-time. The interface just never hesitates.

### For data-heavy interfaces
On charts and dashboards the "wow" is in fluidity: GPU-accelerated rendering via Canvas/WebGL for massive datasets, animated transitions between data states, force-directed graph layouts that settle naturally.

**The common thread**: something about the implementation goes beyond what users expect from a web interface. The technique serves the experience, not the other way around.

## The Toolkit

Implementation doctrine for spring physics and the View Transitions API lives in [animation-engineering.md](animation-engineering.md) (loaded by `/siteasy animate`); this toolkit lists when to reach for each capability.

Organized by what you're trying to achieve, not by technology name.

### Make transitions feel cinematic
- **View Transitions API** (same-document: all browsers; cross-document: no Firefox). Shared element morphing between states. A list item expanding into a detail page. A button morphing into a dialog. This is the closest thing to native FLIP animations.

### Tie animation to scroll position
- **Scroll-driven animations** (`animation-timeline: scroll()`). CSS-only, no JS. Parallax, progress bars, reveal sequences all driven by scroll position. (Chrome/Edge/Safari; Firefox: flag only, always provide a static fallback). For full multi-layer parallax, scrollytelling architecture, and AI-adaptive governance, load [parallax.md](parallax.md) first.

### Render beyond CSS
- **WebGL** (all browsers). Shader effects, post-processing, particle systems. Libraries: Three.js, OGL (lightweight), regl. Use for effects CSS can't express. Gate it behind measured capability (GPU tier via detect-gpu, a quick fps sample, pointer type) with the DOM version as the default state; drive shader uniforms with scroll or drag velocity so the effect dies out when the user stops; keep models under ~5 MB with Draco/meshopt.
- **WebGPU** (Chrome/Edge; Safari partial; Firefox: flag only). Next-gen GPU compute. More powerful than WebGL but limited browser support. Always fall back to WebGL2.

**NOTE**: This command is about enhancing how an interface FEELS, not changing what a product DOES. Adding real-time collaboration, offline support, or new backend capabilities are product decisions, not UI enhancements. Focus on making existing features feel extraordinary.

## Implement with Discipline

### Progressive enhancement is non-negotiable

Every technique must degrade gracefully, behind `@supports` or a capability probe. The experience without the enhancement must still be good.

### Performance rules

- Target 60fps. If dropping below 50, simplify.
- Respect `prefers-reduced-motion`, always. Provide a beautiful static alternative.
- Lazy-initialize heavy resources (WebGL contexts, WASM modules) only when near viewport.
- Pause off-screen rendering. Kill what you can't see.
- One rAF ticker per page: subsystems subscribe and unsubscribe, and the loop pauses on `visibilitychange`.
- Cap `setPixelRatio` at 2 (L-WEBGL-2), uncapped DPR quadruples the pixels for an invisible gain.
- Give continuous scenes an idle state (a slow drift) instead of freezing when input stops.
- Test on real mid-range devices, not just your development machine.

### WebGL scene budgets

- Draw calls: aim for a few hundred meshes, treat 1000 as the absolute ceiling (L-WEBGL-1). Repeated objects belong in an instanced mesh, one draw call carries tens of thousands of instances.
- Render on demand: a scene with nothing moving should render only when invalidated, not at 60fps forever. Imperative mutations (camera controls) are invisible to the framework, invalidate explicitly, and start a synchronous animation one frame after the invalidation or the first frame visibly jumps.
- Movement regression, the pattern of the big model viewers: while the user drags or orbits, drop resolution (down to half), skip shadows and post-processing, then restore about 200ms after the input rests. Drive it with a bounded factor and fps hysteresis (a high and a low bound, a flip limit, then a definitive floor) so quality does not ping-pong.
- Mounting costs more than rendering: a newly mounted material compiles and a new geometry is processed, which is a hitch the frame budget feels. Share geometries and materials, toggle `visible` instead of unmounting, and stagger expensive constructions instead of building everything in one frame.
- Load nested: a low-definition model is the loading state of the high-definition one (three tiers: indicator, low, high). Preload by URL before mounting; cache per URL so CPU parse and GPU upload happen once.
- Dispose GPU resources when something truly leaves, but never dispose shared or cached assets, and remember that objects injected imperatively are the injector's responsibility.

### Polish is the difference

The gap between "cool" and "extraordinary" is in the last 20% of refinement: the easing curve on a spring animation, the timing offset in a staggered reveal, the subtle secondary motion that makes a transition feel physical. Don't ship the first version that works, ship the version that feels inevitable.

**NEVER**:
- Ignore `prefers-reduced-motion`. This is an accessibility requirement, not a suggestion
- Ship effects that cause jank on mid-range devices
- Use bleeding-edge APIs without a functional fallback
- Add sound without explicit user opt-in
- Use technical ambition to mask weak design fundamentals; fix those first with other commands
- Layer multiple competing extraordinary moments, focus creates impact, excess creates noise

## Verify the Result

- **The wow test**: Show it to someone who hasn't seen it. Do they react?
- **The removal test**: Take it away. Does the experience feel diminished, or does nobody notice?
- **The device test**: Run it on a phone, a tablet, a Chromebook. Still smooth?
- **The accessibility test**: Enable reduced motion. Still beautiful?
- **The context test**: Does this make sense for THIS brand and audience?

Remember: "Technically extraordinary" isn't about using the newest API. It's about making an interface do something users didn't think a website could do.

## Resource hooks

- WebGL tooling (gating, springs, noise, loaders): `python3 tools/design-system/scripts/search.py "webgl" --domain resources`
- three.js stack rules for generated artifacts: `python3 tools/design-system/scripts/search.py "<need>" --stack threejs` (53 rules: pinning, geometry, materials, lighting, loaders, performance, disposal)

Generate against a current revision, and check the result against the probe that reads it back:

```bash
node tools/inspect/three.mjs <url> --json     # draw calls, pixel ratio, colour space, measured
```

The two used to disagree. The stack corpus pinned r128, which predates the r152 colour change and the r163 removal of WebGL 1, so it taught `renderer.outputEncoding = THREE.sRGBEncoding` at the same time as rules 79 to 81 reported that line as a silent no-op. Generation moved, because the auditor is right about the current library and the corpus was right about 2021.
- Award-level references: `python3 tools/design-system/scripts/search.py "3d" --domain inspiration`
