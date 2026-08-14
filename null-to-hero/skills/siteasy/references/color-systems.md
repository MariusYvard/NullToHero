---
name: color-systems
description: "Building a complete color system. The ink-opacity hierarchy for text, a tonal ramp from one base hue, and a semantic token set whose accent and destructive colors are corrected to meet WCAG contrast before they ship."
version: 1.15.0
---

# Color Systems

This reference is about assembling a whole palette: the tonal ramps, the text hierarchy, and the named roles. For the perceptual mechanics of a single color use [color-and-contrast.md](color-and-contrast.md); for how tokens are layered and themed use [tokens.md](tokens.md). This is the layer between them.

## Three layers, in order

1. Primitive ramps: each hue expanded into a tonal scale (the raw material, named by number).
2. Semantic roles: the small set of named jobs (primary, surface, border, destructive) that map onto specific ramp steps. Components only ever touch this layer.
3. Component tokens: optional per-component overrides that still resolve to semantic roles.

Build the ramps first, assign roles second, and never let a component reference a raw `#hex` or a primitive step directly.

## Ink hierarchy

Text is not one color. A readable surface uses a small set of foreground opacities so hierarchy comes from weight of ink, not from a pile of different greys.

On a light surface, black at: 87% for primary text, 60% for secondary text, 38% for disabled and hint text, 12% for dividers. On a dark surface, white at: 100% primary, 70% secondary, 50% disabled, 12% dividers.

Expressing the hierarchy as opacities of one ink (rather than four hand-picked greys) keeps it consistent across any surface tint and any theme. Verify the 87% and 60% levels still clear 4.5:1 against the surface they sit on; opacity does not exempt text from contrast.

## A tonal ramp from one hue

A usable ramp runs from a near-white tint to a near-black shade in fixed steps, conventionally numbered 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, with 500 as the base.

Build it in OKLCH: hold the hue, step the lightness in even increments from roughly 97% (50) down to roughly 20% (900), and reduce chroma toward both ends so the lightest and darkest steps do not look garish. The 500 base carries the most chroma. One hue produces ten harmonious steps this way, and a second hue gives the accent ramp.

## Semantic roles

Map the ramps onto a fixed set of jobs. The contrast column is the requirement each pairing must meet, not a suggestion.

| Role | Typical source | Pairs with | Contrast required |
|---|---|---|---|
| `background` | ramp 50 (light) / 900 (dark) | `foreground` | 4.5:1 for body text |
| `surface` | white / ramp 800 | `foreground` | 4.5:1 for body text |
| `foreground` | ink 87% | background, surface | 4.5:1 |
| `primary` | accent ramp 500 | `on-primary` | 4.5:1 text on it |
| `on-primary` | white or ramp 50 | primary | 4.5:1 |
| `secondary` | neutral ramp 200 | `foreground` | 4.5:1 |
| `accent` | a second hue 500 | its on-color | 3:1 for UI, 4.5:1 if it carries text |
| `border` | ramp 200 (light) / 700 (dark) | adjacent surface | 3:1 (non-text) |
| `ring` (focus) | primary or a high-contrast hue | surface | 3:1 against both states |
| `destructive` | red ramp 500/600 | `on-destructive` | 4.5:1 for its label |
| `muted` | ramp 100 / 800 | muted foreground | 4.5:1 if text |

## Correct the color to the contrast, before it ships

The common failure is a brand accent or a destructive red that looks right in isolation but fails contrast as a button. The discipline: after assigning a role, measure the pairing, and if it misses, darken or lighten the ramp step until it passes, then lock that step.

A SaaS blue primary often needs its on-white CTA nudged darker to clear 4.5:1. A warm orange accent frequently fails 3:1 as a control and has to drop a ramp step. Record the correction next to the token (a one-line note: "accent raised from 400 to 500 for 3:1") so the next person does not undo it. The palette that ships is the corrected one, never the pretty-but-failing original.

## Audit

1. Does every component color resolve to a semantic role, with no raw hex or primitive step in component CSS?
2. Is body text drawn from the ink hierarchy (87% / 60%) and does it clear 4.5:1 on its surface?
3. Do `primary`, `accent` and `destructive` each pass their required contrast as actually used (button, link, badge), not just on paper?
4. Are there exactly two hue ramps plus a neutral, or has the palette sprawled into many ad hoc colors?
5. Is each correction recorded, so a later "cleanup" cannot silently reintroduce a failing color?
