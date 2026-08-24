---
name: elevation
description: "An elevation and shadow system. A doubling shadow ramp mapped to CSS box-shadow and elevation tokens, the light-source rule for shadow direction, and how dark interfaces express depth through surface tint instead of shadow."
version: 1.15.0
---

# Elevation

Elevation is how a surface signals that it sits above another: a menu over a page, a dialog over content, a card over a background. Done with a system, it reads as one coherent space. Done ad hoc, every shadow is a different guess and the interface looks assembled by accident.

## The ramp

Use a fixed set of levels, not arbitrary shadows. A doubling ramp gives clearly distinct steps while staying small enough to memorize. The values below derive from the Material depth scale, translated to CSS.

| Level | Role | Offset Y | Blur | Opacity |
|---|---|---|---|---|
| 0 | Flush with the page (most content) | 0 | 0 | 0 |
| 1 | Resting card, raised input | 1px | 2px | 0.20 |
| 2 | Hovered card, raised button | 2px | 4px | 0.20 |
| 3 | Dropdown, popover, sticky bar | 4px | 8px | 0.18 |
| 4 | Drawer, navigation rail | 8px | 16px | 0.16 |
| 5 | Dialog, modal, command palette | 16px | 24px | 0.14 |

Opacity eases down as the surface rises, because a higher object casts a softer, more diffuse shadow. A hard dark shadow at level 5 reads as a sticker, not a raised plane.

## Tokens

Define the ramp once as custom properties and reference the token, never a raw shadow, in component CSS.

```css
:root {
  --elevation-1: 0 1px 2px rgb(0 0 0 / 0.20);
  --elevation-2: 0 2px 4px rgb(0 0 0 / 0.20);
  --elevation-3: 0 4px 8px rgb(0 0 0 / 0.18);
  --elevation-4: 0 8px 16px rgb(0 0 0 / 0.16);
  --elevation-5: 0 16px 24px rgb(0 0 0 / 0.14);
}
.card { box-shadow: var(--elevation-1); }
.card:hover { box-shadow: var(--elevation-2); }
.dialog { box-shadow: var(--elevation-5); }
```

A more realistic shadow layers two: a tight key shadow plus a wider ambient one. Keep the same level names, give each token two comma-separated shadows. The ramp stays; only the realism improves.

## Shadow direction follows the light

Pick one light source for the whole interface and never contradict it. The web convention is light from above, so shadows fall below: a positive Y offset, no X offset. An inset control (a pressed toggle, a well) reverses it with `inset`. If one card casts its shadow down and another casts up, the page looks broken even when each shadow is individually fine.

## Dark interfaces: tint, not shadow

A shadow needs a lighter surface beneath it to be visible. On a dark interface there is little contrast for a shadow to work against, so depth is carried by surface lightness instead: the higher the layer, the lighter its background.

- Keep the base surface a near-black with a hint of the brand hue, never pure `#000`.
- Raise each level by a small, fixed lightness step (an overlay of white at low opacity, or an OKLCH lightness increment per level).
- A dialog on a dark page is a lighter panel, optionally with a faint border, not a heavy black shadow.

This mirrors the light mode ramp: the same five levels, expressed as tint rather than shadow.

## Restraint

- A single screen rarely needs more than two or three elevation levels at once. If everything is raised, nothing is.
- Elevation is a state as much as a style: rest, hover and active are different levels of the same component, which is most of what the ramp is for.
- Do not pair a heavy shadow with a heavy border. One affordance for "this is a separate surface" is enough; two is noise.

## Audit

1. Are all shadows drawn from the token ramp, or are there one-off `box-shadow` values? Replace the one-offs.
2. Do all shadows fall the same direction? Fix any that contradict the light source.
3. On dark mode, is depth carried by surface tint rather than an invisible black shadow?
4. Count the distinct elevation levels on one screen. More than three is usually a flattening opportunity.
