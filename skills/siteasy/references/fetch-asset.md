---
name: fetch-asset
description: "The build flow's asset fetcher: pull a license-clean icon, font, photo, illustration or avatar from an open API on demand, or generate a wave, blob or tileable pattern locally, then wire it in."
version: 1.27.0
---

# Fetch asset

`tools/design-system/scripts/fetch-asset.mjs` pulls an asset from an open API and saves it ready to use. The build flow calls it by need, not as a command: when a step reaches an icon, a font, a photo or an avatar, run the matching kind, then inline or self-host the result. It only wires sources with a clear open licence, prints the licence of each result, and refuses to save a use-only source unless `--force`.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/design-system/scripts/fetch-asset.mjs <kind> <arg> [--out assets] [--dry]
```

| Kind | Source | Licence | Example |
|------|--------|---------|---------|
| icon | Iconify, 150 plus open sets | per set, reported | `icon lucide:rocket` |
| brand | Simple Icons | CC0 mark, the brand stays a trademark | `brand github` |
| font | Google Fonts | OFL or Apache | `font "Space Grotesk" --weights 400,700` |
| photo | Openverse, the Met, Art Institute, Cleveland | CC0 or public domain | `photo "forest" --source openverse` |
| avatar | DiceBear | per style, verify | `avatar alex --style bottts` |
| placeholder | Lorem Picsum | Unsplash, placeholder only, not committable | `placeholder 1200 800` |
| palette | Colormind | generated, refine locally | `palette --from #6d28d9` |
| wave | generated locally, no network | yours (CC0), seeded | `wave --colors "#0b3954,#087e8b" --seed 42` |
| blob | generated locally, no network | yours (CC0), seeded | `blob --color #087e8b --points 8 --seed 7` |
| pattern | generated locally, no network | yours (CC0) | `pattern dots --color #0b3954 --size 24` |

## How the flow uses it

- Icons: fetch by `set:name`, inline the SVG so it takes `currentColor`. Prefer the top-tier sets (Lucide, Heroicons, Tabler, Phosphor).
- Fonts: fetch the family, the script downloads the woff2 and writes a `@font-face` with `font-display: swap`. Self-host the files, preload the one weight above the fold.
- Photos: fetch from a CC0 source, then convert to WebP or AVIF and keep the attribution. For a use-only site, recommend it and hotlink, do not commit.
- Avatars: fetch from DiceBear for seeded, on-brand placeholder people.
- Placeholders: use Picsum only while building, replace before shipping.
- Backgrounds: generate waves, blobs and tileable patterns locally with the project palette. Seeded and reproducible (the file records its seed), `pattern` also prints the `background-image` CSS with the data URI. No request leaves the machine and the output belongs to the project, so it commits cleanly.

Add `--dry` to preview the request without fetching, `--out DIR` to choose where it saves (default `assets/`). If a need has no clean API here, fall back to recommending a site from resources.csv rather than scraping it.
