---
name: component-recipes
description: "Curated recipes for the animated component registry (Magic UI): what each component is for, how to install it from the registry, the key props observed in canonical demos, and the guardrail NullToHero adds before it ships."
version: 1.0.0
---

# Component Recipes (Animated Registry)

Recipes for the most useful animated registry components. Install pulls the source
INTO the project (`npx shadcn@latest add "https://magicui.design/r/<name>.json"`),
so every recipe ends with the guardrail to apply once the code is yours — most
registry components ship without a reduced-motion guard (see
[component-patterns.md](component-patterns.md), Animated Component Registries).
Bind factory gradients to the project tokens, always.

## Text

| Recipe | Use for | Key props (canonical demos) | Guardrail before shipping |
|---|---|---|---|
| animated-gradient-text | One announcement pill | Conic border via mask-composite trick, `bg-[length:300%_100%]` | Rebind the `#ffaa40/#9c40ff` factory gradient to tokens; L-MOTION-2 |
| animated-shiny-text | A subtle "new" callout | Shimmer sweep, pairs with a pill container | Guard the infinite sweep (rule 63) |
| text-animate | The generic split reveal | `by=word\|character\|line`, ~0.05 stagger compressing with length | Already a11y-correct (aria-hidden clones); keep it that way |
| typing-animation | Terminal or hero typing | ~100ms/char, `startOnView` | Expose the finished line to AT; avoid on long copy |
| number-ticker | Stat counters | Spring damping 60 / stiffness 100, `tabular-nums` | Replace the hardcoded en-US locale (rule 64) |
| dia-text-reveal | A hero one-shot reveal | `colors=[...]` triad | One of the 3/78 with a reduced-motion guard; keep colors on tokens |
| kinetic-text | A display-size kinetic word | Optical sizing on | One per page, it is a signature candidate |
| highlighter | Hand-drawn emphasis | `action=underline\|highlight`, color | Decorative SVG: `aria-hidden`, real emphasis via `<em>` |
| video-text | Video-filled display type | `src` webm | Must-play? Route through [video.md](video.md) guaranteed-play instead of native autoplay |
| scroll-based-velocity | Velocity marquee rows | `baseVelocity~20`, direction ±1 | Has a reduced-motion guard; hide duplicated rows from AT (rule 62) |

## Surfaces and effects

| Recipe | Use for | Key props | Guardrail |
|---|---|---|---|
| blur-fade | Scroll-in galleries | `delay 0.25 + i * 0.05`, `inView`, -50px margin | Cap the total stagger (L-MOTION-1); real `alt` text, no placeholder images in prod |
| particles | One ambient background | `quantity~100`, `ease~80`, theme-aware color | Cut on `visibilitychange` and offscreen; counts toward L-MOTION-2 |
| globe | A dotted "worldwide" moment | cobe under the hood, DPR-aware | Heavy canvas: one per site, pause offscreen |
| dotted-map | Presence maps | `markers[{lat,lng,size}]` + custom SVG overlay renderer | Overlay flags come from an external CDN in the demo: self-host them |
| border-beam / magic-card | Card accents | offsetPath rect, negative delays to phase several | Rebind factory gradients; L-MOTION-2 applies per view |
| animated-circular-progress-bar | A gauge moment | value 0-100, two gauge colors | The canonical demo drives it with setInterval: drive from real progress instead |
| scroll-progress | Reading progress bar | Sticky top offset | `scaleX` transform only, never width |

## Structure

| Recipe | Use for | Key props | Guardrail |
|---|---|---|---|
| dock | A macOS-style dock nav | Tooltips + `buttonVariants`, magnification | Needs shadcn button/separator/tooltip installed; keep labels for AT |
| file-tree | Docs and code walkthroughs | `elements`, `initialExpandedItems` | Keyboard navigation is load-bearing: test it |
| terminal | Install/demo sequences | `TypingAnimation` + `AnimatedSpan` steps | Content must exist as text for copy-paste and AT |
| safari (device mock) | Browser-framed screenshots | `url` label | Pure SVG, server-renderable: prefer it over bitmap chrome |
| animated-theme-toggler | Theme switch with flair | View-transition based | Respect `prefers-reduced-motion` on the transition |

## The kit warning

These recipes assemble fast, and that is the trap: marquee + bento + globe +
ticker + border beam is the registry zoo memorability flags as template-shaped.
Pick per the committed `DIRECTION.md`, one signature, quiet support — see
[signature-moments.md](signature-moments.md) and [memorability.md](memorability.md).

## Resource hooks

- The library rows with caveats: `python3 tools/design-system/scripts/search.py "magic ui" --domain resources`
- All animated-component guidance: `node tools/search-references.mjs "registry components" --skill siteasy`
