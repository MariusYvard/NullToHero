---
name: playwright
description: "Screenshot a UI in a real Chromium browser, read the image visually, identify design bugs and layout issues, then fix them in the source. Loop until the output is correct."
version: 1.6.0
---

# Preview — Browser Visual Testing with Playwright

## Purpose

Screenshot a UI in a real Chromium browser, read the image visually, identify design bugs and layout issues, then fix them in the source. Loop until the output is correct.

This is the only command that closes the loop between code and rendered output. Use it after `craft`, `polish`, `animate`, or any command that produces HTML/CSS, to verify the result looks right before calling it done.

---

## Step 1 — Identify the Target

The target can be:
- A **URL**: `https://example.com` or `http://localhost:3000`
- A **local HTML file**: `index.html`, `src/app.html`, etc.
- **Nothing** — look for `index.html` in the workspace root

If a local file is the target, you need a server (see Step 2). If it's already a URL, skip to Step 3.

---

## Step 2 — Serve Local Files

**Quickest option (Python, no install):**
```bash
python3 -m http.server 7331 --directory /path/to/project &
sleep 1
```

**If the project uses a build tool**, ask the user to run their dev server, then use `http://localhost:[port]` as the target. Don't try to run build tools yourself unless the user explicitly asks.

**Kill the server when done:**
```bash
kill $(lsof -ti:7331) 2>/dev/null || true
```

---

## Step 3 — Install Playwright Browsers

Check if already installed:
```bash
npx playwright --version 2>/dev/null && echo "installed" || echo "missing"
```

If missing or first use, install Chromium:
```bash
npx playwright install chromium
```

On Linux, add `--with-deps` if the above fails:
```bash
npx playwright install chromium --with-deps
```

---

## Step 4 — Capture Screenshots

### Desktop (1280×800)
```bash
npx playwright screenshot --browser chromium --full-page \
  --viewport-size "1280,800" \
  "http://localhost:7331/index.html" \
  /tmp/preview-desktop.png
```

### Mobile (390×844 — iPhone 14)
```bash
npx playwright screenshot --browser chromium --full-page \
  --viewport-size "390,844" \
  "http://localhost:7331/index.html" \
  /tmp/preview-mobile.png
```

### Tablet (768×1024 — iPad)
```bash
npx playwright screenshot --browser chromium --full-page \
  --viewport-size "768,1024" \
  "http://localhost:7331/index.html" \
  /tmp/preview-tablet.png
```

**Default when no viewport is specified:** capture desktop + mobile.

---

## Step 5 — Read and Analyze the Screenshots

Use the **Read tool** on each screenshot file. Claude can see PNG images directly.

```
Read /tmp/preview-desktop.png
Read /tmp/preview-mobile.png
```

### What to look for:

**Layout**
- Elements overflowing their containers
- Horizontal scroll where none is expected
- Content cut off at viewport edge
- Flex/grid not behaving as intended
- Sticky elements covering content
- Unexpected whitespace gaps

**Typography**
- Heading hierarchy lost or flat
- Line lengths too long (>75ch) or too short (<45ch)
- Text too small on mobile
- Orphaned words or widows at end of paragraphs

**Color & Contrast**
- Low-contrast text (gray on white, light on light)
- Brand color used at wrong proportion
- Dark mode issues if applicable

**Spacing**
- Padding too tight on mobile
- Inconsistent vertical rhythm
- Elements visually grouped that shouldn't be

**Component-specific**
- Buttons that look unclickable
- Forms without clear labels
- Navigation that wraps or collapses unexpectedly
- Cards with misaligned content across a grid row

---

## Step 6 — Interactive Capture (Hover, Click, State)

For JavaScript-driven interactions, hover states, or animated transitions, write a short inline Playwright script:

```bash
node --input-type=module << 'EOF'
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:7331/index.html');

// Initial state
await page.screenshot({ path: '/tmp/state-initial.png', fullPage: true });

// Hover a button (update selector to match actual element)
await page.hover('button.primary');
await page.screenshot({ path: '/tmp/state-hover.png' });

// Open a dropdown or modal
await page.click('[data-trigger="menu"]');
await page.screenshot({ path: '/tmp/state-open.png' });

// Mobile viewport
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: '/tmp/state-mobile.png', fullPage: true });

await browser.close();
EOF
```

Then `Read /tmp/state-hover.png` etc. to inspect each state.

---

## Step 7 — Fix and Re-Screenshot

1. Use the **Read tool** to open the relevant source file
2. Apply fixes with the **Edit tool** (targeted, surgical — don't rewrite the whole file)
3. Re-run the screenshot command to verify the fix
4. Repeat until the screenshot matches intent

**Common fixes and their patterns:**

| Visual bug | Likely cause | Fix |
|-----------|-------------|-----|
| Horizontal scroll | `width: 100vw` on child; negative margins | Add `overflow-x: hidden` on body; audit the element |
| Text overflow | Missing `overflow-wrap: break-word` | Add to text container |
| Grid not wrapping | `min-width` too large in `minmax()` | Reduce or use `auto-fill` |
| Image stretching | No `aspect-ratio` or `object-fit` | Add `object-fit: cover; aspect-ratio: [ratio]` |
| Spacing collapse | Margin collapsing | Use `gap` on flex/grid parent instead |
| Mobile font too small | Fixed `px` size | Switch to `clamp()` or `rem` with media query |

---

## Step 8 — Summarize and Clean Up

After the visual loop is complete:
1. Kill any local server you started
2. Summarize what you found and fixed (max 5 bullets)
3. Note anything that requires user action (e.g., real fonts that need auth, dynamic data missing from static preview)

---

## Limits of Static Screenshots

Playwright screenshots capture the initial render. They **cannot** show:
- Animations mid-play
- WebGL / Canvas content (may render blank)
- Content behind auth walls
- Real network data (only what the static file includes)

For these cases, tell the user what to look for manually, or use the inline script approach with `page.waitForSelector()` / `page.waitForTimeout()` to wait for dynamic content.
