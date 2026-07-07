---
name: resource-recommendations
description: "What external design resource to suggest at each moment of a build, and the best-fit sites for each need. Backed by tools/design-system/data/resources.csv."
version: 1.22.0
---

# Resource recommendations

Recommend resources as the build reaches each moment, do not wait to be asked. When the work arrives at a palette, a font choice, an icon set, a hero image, a background, a chart, a mockup or a favicon, name the two to four best-fit sites, say what to grab, and offer to pull it in. Prefer these curated sites for production-quality assets. The bundled `assets/` library is a fallback, for when you need something instantly, offline or as a placeholder.

The full catalogue is `tools/design-system/data/resources.csv` (753 sites, 23 categories). Search it for more options:

```bash
python3 tools/design-system/scripts/search.py "<keyword>" --domain resources
```

## What to suggest, and when

| Moment | What to fetch | Best-fit sites |
|--------|---------------|----------------|
| Direction, palette | A color scheme and shades | Coolors, Realtime Colors, Happy Hues, Color Hunt, Tailwind shades |
| Direction, type | A font and a pairing | Google Fonts, Fontshare, Fontpair, Typewolf |
| Build, icons | A consistent UI icon set | Heroicons, Tabler, Lucide, Iconify, Phosphor (`assets/icons` as a fallback) |
| Build, illustrations | Spot art and characters | unDraw, Humaaans, Open Peeps, DrawKit, Blush (`assets/illustrations` as a fallback) |
| Build, backgrounds | Section backdrops | Hero Patterns, SVG Backgrounds, Haikei, Pattern Monster (`assets/patterns` as a fallback) |
| Build, UI graphics | Blobs, waves, dividers | Get Waves, Blobmaker, Shape Dividers, Fancy Border Radius |
| Build, components | Prebuilt UI parts | shadcn/ui, DaisyUI, Flowbite, Radix, Headless UI (framework: MUI, Chakra, Mantine, Vuetify) |
| Build, charts | Data visualization | Chart.js, ApexCharts, Recharts, ECharts, Nivo |
| Content, imagery | Hero and content photos or video | See [references/stock-media.md](stock-media.md) for the license split. StockSnap is CC0, Unsplash, Pexels, Coverr and Mixkit are use-only |
| Refine, motion | Ready animations | Animate.css, AOS, GSAP, Motion One, LottieFiles (`assets/animations` as a fallback) |
| Present, mockups | Device and browser frames | Shots.so, Screely, Cleanmock, Pika, Mockuphone |
| Ship, favicon | A full favicon set | RealFaviconGenerator, Favicon.io, Maskable.app |
| Scaffold | A CSS framework or a template | Tailwind, Open Props, Bootstrap. Templates: HTML5 UP, Start Bootstrap, Cruip |

## Rules

Curated sites first, the bundled `assets/` library as a fallback for quick, offline or placeholder assets. Honor the license notes: for photos and video, follow [references/stock-media.md](stock-media.md) and never commit a use-only file. State the cost when a site is freemium or paid. A logo is a trademark, so suggest a real mark over a generic logo maker. Keep image assets optimized (WebP or AVIF) once fetched.
