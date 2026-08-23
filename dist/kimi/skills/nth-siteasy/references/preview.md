---
name: preview
description: "Take real browser screenshots using Playwright, read them back visually, and fix what's wrong."
version: 1.6.0
---

# Browser Visual Testing

Take real browser screenshots using Playwright, read them back visually, and fix what's wrong.

## Workflow

### 1. Identify target
- **URL** (`https://...`) → use directly
- **File path** (`index.html`) → start a local server
- **Nothing** → look for `index.html` in workspace root

### 2. Start local server (local files only)
```bash
python3 -m http.server 7331 --directory /absolute/path/to/project &
sleep 1
```

### 3. Install Playwright (first run)
```bash
npx playwright install chromium 2>&1 | tail -5
# On Linux if that fails:
npx playwright install chromium --with-deps 2>&1 | tail -5
```

### 4. Take screenshots
```bash
# Desktop (always)
npx playwright screenshot --browser chromium --full-page \
  --viewport-size "1280,800" "http://localhost:7331/index.html" /tmp/pw-desktop.png

# Mobile (always)
npx playwright screenshot --browser chromium --full-page \
  --viewport-size "390,844" "http://localhost:7331/index.html" /tmp/pw-mobile.png

# Tablet (--all or --tablet only)
npx playwright screenshot --browser chromium --full-page \
  --viewport-size "768,1024" "http://localhost:7331/index.html" /tmp/pw-tablet.png
```

### 5. Read and analyze
```
Read /tmp/pw-desktop.png
Read /tmp/pw-mobile.png
```

Look for: layout breaks, overflow, typography hierarchy, color/contrast failures, spacing issues, component integrity.

## Scroll-linked and animated pages

A screenshot is a claim about a moment. On a page whose content is driven by scroll or by an animation clock, the default moment is the emptiest one, and it is easy to review a site that never ran.

**Everything scroll-linked sits at progress 0 until something scrolls.** A fresh `goto` puts you at the top, so a scrollytelling hero shows only its first beat and every later beat is pinned at its start state. Screenshotting there and concluding is reviewing a page that has not begun. Scroll to the position you mean to judge, let it settle, and only then capture.

**A hidden page runs no animation at all.** Browsers suspend `requestAnimationFrame` when `document.visibilityState === "hidden"`, and scroll libraries (Framer Motion, Lenis, GSAP ScrollTrigger) all drive their progress from rAF. In a hidden or backgrounded page the scroll position moves while the animation progress stays frozen at 0: the DOM says one thing, the pixels say another. Assert visibility before you trust any animated measurement:

```js
const state = await page.evaluate(() => document.visibilityState);
if (state !== "visible") throw new Error("page is hidden: rAF is suspended, animation state is not measurable");
```

**Verify animated state from the DOM, not from the picture.** After a programmatic scroll, a screenshot can lag the real state by seconds, and you will diagnose bugs that do not exist. `getComputedStyle`, `textContent` and a `data-*` attribute that mirrors the component's own index are cheap, synchronous and truthful. Use the screenshot for composition and the DOM for state:

```js
await page.evaluate(() => window.scrollTo(0, 3000));
await page.waitForFunction(() => document.querySelector("[data-act]")?.dataset.act === "3");
const clip = await page.evaluate(() => getComputedStyle(document.querySelector(".beat-3")).clipPath);
```

If a component's own progress is not observable from the DOM, that is worth a finding on its own: nothing about it can be asserted, only eyeballed.

### 5b. Record the motion when a still cannot carry it

Two screenshots answer questions about composition. They cannot answer a question
with a duration in it, and the usual substitute is describing the motion in prose
to somebody who cannot see it.

```bash
node tools/inspect/capture.mjs index.html --seconds 6
node tools/inspect/capture.mjs https://example.com --scroll --seconds 10
node tools/inspect/capture.mjs index.html --reduced --viewport 390x844
```

A webm lands in `./motion-capture`, named for the target and the viewport. `--scroll`
walks the page from top to bottom at eight steps a second instead of jumping, because
jumping skips every scroll-triggered reveal on the way, which is usually the thing
being recorded. `--reduced` records the same page under
`prefers-reduced-motion: reduce`, and the two files side by side are the fastest
way to show an owner what their guard actually does.

In a connected browser the equivalent needs no install: the `gif_creator` tool records
the user's own browser, which is also the only way to record a page behind a login.

Two things to say when handing one over. **It is an artefact, not a verdict**: the
findings over time come from `node tools/inspect/motion.mjs <url> --sweep`, which
drives the page across a time grid and reports stalls and transient collisions. And
a recording is one run at one viewport with one clock, so it shows what happened
rather than what happens.

### 6. Fix issues
1. Read the relevant file
2. Apply targeted fix with Edit tool
3. Re-screenshot to verify
4. Repeat until output matches intent

### 7. Clean up
```bash
kill $(lsof -ti:7331) 2>/dev/null || true
```

## Common Bug Patterns

| What you see | Likely cause | Fix |
|---|---|---|
| Horizontal scrollbar | `width: 100vw` or negative margins | `overflow-x: hidden` on `body` |
| Text overflows | No `overflow-wrap` | `overflow-wrap: break-word` |
| Image stretched | No `object-fit` | `object-fit: cover; aspect-ratio: 16/9` |
| Sticky nav covers content | No `scroll-padding-top` | `scroll-padding-top: [nav-height]` |
| Mobile text too small | Hard-coded `px` | `clamp(0.875rem, 2.5vw, 1rem)` |
| Dark mode contrast fail | Color not updated | Add `@media (prefers-color-scheme: dark)` override |
