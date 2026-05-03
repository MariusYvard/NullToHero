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
