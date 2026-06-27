---
name: style-systems
description: "Named visual aesthetics and their hard rules. What each style forbids (the common ways it gets faked), the numeric specs that make it convincing, plus the motion timings (named easings, stagger, exit ratio) that hold across styles."
version: 1.15.0
---

# Style Systems

A named aesthetic is a contract. Glassmorphism, brutalism and claymorphism each have a small set of rules that, when broken, make the result look like a generic theme wearing the name. This reference records the forbidding rules (what the style is NOT) and the few numbers that make it read as intended. The plugin's absolute bans still apply: a style is a deliberate choice for a surface, not a license to ship a blurred card grid.

Commit to one aesthetic per surface. Mixing two reads as indecision.

## Minimal and flat

- Hierarchy comes from scale, weight and space, not from shadows or borders. If a flat design needs a shadow to separate two regions, the spacing failed first.
- One accent, used sparingly. Flat with five accent colors is not minimal.
- Avoid pure `#000` and pure `#fff`; tint both toward the brand hue.

## Modern dark and OLED

- Never pure black `#000000` for large areas: on OLED it causes smearing on scroll and kills depth. Use an off-black near `#050506` with a hint of hue.
- Depth is surface tint, not heavy shadow (see [elevation.md](elevation.md)).
- Borders at full opacity look cheap; use a low-opacity light border or a lighter surface step instead.
- Enter easing `cubic-bezier(0.16, 1, 0.3, 1)` (expo out); micro 200ms, screen 400ms.

## Neo-brutalism

- Shadow blur is always 0. A brutalist shadow is a hard offset block, never a soft glow.
- Border radius is 0 or fully round (999px), never a polite 8px.
- Borders are thick (2px or more) and solid, usually near-black.
- Color is flat and saturated; no gradients. Press feedback translates the element by its shadow offset (for example 4px) rather than fading it.

## Claymorphism

- Do not use sharp corners; radius is large, 20px or more.
- Do not use pure black anywhere, including shadows.
- The look needs two shadows: an outer soft drop (large offset, large blur, a low-opacity tinted dark) and an inner highlight (negative offset, white, low opacity) that suggests a soft inflated surface.
- Colors are soft and desaturated; high chroma breaks the clay feel.

## Glassmorphism

- Deliberate only, never the default surface. A glass card needs a busy or colored background behind it to refract; over a flat page it is just a grey box.
- Requires three things together: a background blur (`backdrop-filter`), partial transparency, and a thin light border to catch the edge. Two of the three looks broken.
- Keep text on glass at full opacity and re-check contrast against the lightest area the glass can sit over.

## Material

- No pure white surface; use a near-white like `#FFFBFE` so elevation tint has room to read.
- Shadows are soft and ambient, closer to a glow than a hard drop.
- Motion easing `cubic-bezier(0.2, 0, 0, 1)`; 100ms / 250ms / 400ms for small, medium and large transitions.
- Press feedback is a ripple from the point of contact, not a color swap.

## Neumorphism

- Use sparingly and never for primary actions: the low contrast of extruded controls routinely fails WCAG, so a neumorphic button needs a clear text label and a focus ring that does not rely on the soft shadow.
- The effect is two shadows from one light source: a dark drop on one side, a light drop on the opposite side, both low contrast, over a surface the same color as the background.
- High contrast or a colored background destroys the effect.

## Motion specs that cross styles

These hold regardless of the chosen aesthetic.

- Easing vocabulary: enter with an ease-out curve (expo or quint) so motion decelerates into place; exit with ease-in; never `ease-in` on an entering element and never `ease-out` on a leaving one.
- Exit is faster than enter: an exit runs at roughly 60 to 70% of the enter duration, because a leaving element should not hold attention.
- Stagger a list or grid by 30 to 50ms per item. Less reads as simultaneous; more makes the user wait.
- Numbers that change in place (counters, prices, timers) use tabular figures (`font-variant-numeric: tabular-nums`) so the layout does not jitter as digits change.
- Full-bleed and fixed surfaces respect the device safe area with `env(safe-area-inset-*)` so content clears notches and home indicators.
- All of the above sit under the 300ms UI ceiling and freeze under `prefers-reduced-motion`.

## Audit

1. Is exactly one named aesthetic in play on this surface?
2. Does it honor its forbidding rules (no pure black OLED, blur 0 for brutalism, three-part glass)?
3. Are the motion timings within the ease-out, sub-300ms, exit-shorter-than-enter envelope?
4. Do changing numbers use tabular figures, and do full-bleed surfaces respect the safe area?
