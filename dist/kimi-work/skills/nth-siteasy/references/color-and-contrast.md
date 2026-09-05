---
name: color-and-contrast
description: "Stop using HSL. Use OKLCH (or LCH) instead. It's perceptually uniform, meaning equal steps in lightness look equal-unlike HSL where 50% lightness in yellow looks bright while 50%."
version: 1.9.0
---

# Color & Contrast

## Color Spaces: Use OKLCH

**Stop using HSL.** Use OKLCH (or LCH) instead. It's perceptually uniform, meaning equal steps in lightness *look* equal, unlike HSL where 50% lightness in yellow looks bright while 50% in blue looks dark.

The OKLCH function takes three components: `oklch(lightness chroma hue)` where lightness is 0-100%, chroma is roughly 0-0.4, and hue is 0-360. To build a primary color and its lighter / darker variants, hold the chroma+hue roughly constant and vary the lightness, but **reduce chroma as you approach white or black**, because high chroma at extreme lightness looks garish.

The hue you pick is a brand decision and should not come from a default. Do not reach for blue (hue 250) or warm orange (hue 60) by reflex, those are the dominant AI-design defaults, not the right answer for any specific brand.

## Building Functional Palettes

### Tinted Neutrals

**Pure gray is dead.** A neutral with zero chroma feels lifeless next to a colored brand. Add a tiny chroma value (0.005-0.015) to all your neutrals, hued toward whatever your brand color is. The chroma is small enough not to read as "tinted" consciously, but it creates subconscious cohesion between brand color and UI surfaces.

**Avoid** the trap of always tinting toward warm orange or always tinting toward cool blue. Those are the two laziest defaults and they create their own monoculture across projects.

### Palette Structure

A complete system needs:

| Role | Purpose | Example |
|------|---------|---------|
| **Primary** | Brand, CTAs, key actions | 1 color, 3-5 shades |
| **Neutral** | Text, backgrounds, borders | 9-11 shade scale |
| **Semantic** | Success, error, warning, info | 4 colors, 2-3 shades each |
| **Surface** | Cards, modals, overlays | 2-3 elevation levels |

**Skip secondary/tertiary unless you need them.** Most apps work fine with one accent color.

### The 60-30-10 Rule (Applied Correctly)

- **60%**: Neutral backgrounds, white space, base surfaces
- **30%**: Secondary colors, text, borders, inactive states
- **10%**: Accent, CTAs, highlights, focus states

The common mistake: using the accent color everywhere because it's "the brand color." Accent colors work *because* they're rare. Overuse kills their power.

## Contrast & Accessibility

### WCAG Requirements

| Content Type | AA Minimum | AAA Target |
|--------------|------------|------------|
| Body text | 4.5:1 | 7:1 |
| Large text (24px+, or 18.66px+ bold) | 3:1 | 4.5:1 |
| UI components, icons | 3:1 | 4.5:1 |
| Non-essential decorations | None | None |

### Dangerous Color Combinations

- Light gray text on white (the #1 accessibility fail)
- **Gray text on any colored background**: gray looks washed out and dead on color. Use a darker shade of the background color, or transparency
- Red text on green background (or vice versa). Red and green is the hardest pair for the most common form of color vision deficiency, and about 1 in 12 men have some color vision deficiency ([National Eye Institute, 2025](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness))
- Blue text on red background (vibrates visually)
- Yellow text on white (almost always fails)

### Never Use Pure Gray or Pure Black

Pure gray (`oklch(50% 0 0)`) and pure black (`#000`) don't exist in nature, real shadows and surfaces always have a color cast. Even a chroma of 0.005-0.01 is enough to feel natural.

## Theming: Light & Dark Mode

### Dark Mode Is Not Inverted Light Mode

| Light Mode | Dark Mode |
|------------|-----------|
| Shadows for depth | Lighter surfaces for depth (no shadows) |
| Dark text on light | Light text on dark (reduce font weight) |
| Vibrant accents | Desaturate accents slightly |
| White backgrounds | Never pure black, use dark gray (oklch 12-18%) |

In dark mode, depth comes from surface lightness, not shadow. Build a 3-step surface scale where higher elevations are lighter (e.g. 15% / 20% / 25% lightness).

### Token Hierarchy

Use two layers: primitive tokens (`--blue-500`) and semantic tokens (`--color-primary: var(--blue-500)`). For dark mode, only redefine the semantic layer.

## Alpha Is A Design Smell

Heavy use of transparency (rgba, hsla) usually means an incomplete palette. Alpha creates unpredictable contrast, performance overhead, and inconsistency. Define explicit overlay colors for each context instead.

## Verify Both Directions Of An Accent

An accent token has two jobs and they pull opposite ways: read AS text on the surface, and sit UNDER white as a button. Verifying one and shipping both is the most common way a palette that "passes AA" ships a CTA that does not.

They can be irreconcilable, and you find that by sweeping rather than arguing. A real case, `oklch(L 0.2 29)` on a near-black surface:

| Direction | Requirement |
|---|---|
| red as text on the surface | needs L >= 61% |
| white text on the red | needs L <= 59% |

At L=60% both fail: **no single value exists**, so the palette needs two reds (the accent you read, and the surface you read white on). That is not a taste call, it is arithmetic, and one command settles it:

```bash
node -e 'import("./tools/audit/lib/contrast.mjs").then(({parseColor,contrastRatio})=>{const R=(a,b)=>contrastRatio(parseColor(a),parseColor(b));for(let L=70;L>=46;L-=2){const c=`oklch(${L}% 0.2 29)`;console.log(L, R(c,"oklch(17% 0.007 265)"), R("#fff",c));}})'
```

Watch the hover state too: a hover that goes *brighter* under white text is less readable than the resting state, which is exactly backwards.

## Deliberate Violations Are Declared, Not Argued

Sometimes low contrast is the point: a page that depicts a defect, ghost text that is texture rather than information. Say so in the markup and the audit will count it apart instead of failing you:

```html
<b data-contrast-exempt="staging"
   data-contrast-exempt-reason="Depicts the audit overlay stamping the demo page; the badge's unreadability is the subject.">FAIL</b>
```

- **Codes are closed**: `staging`, `decorative-ghost`, `disabled`, `logotype`, `incidental`. An unknown code excuses nothing.
- **The reason is mandatory.** No reason, no exemption, the sample stays in the failure count and `contrast-exempt-undeclared` fails. The price of an exemption is writing the argument down where review sees it.
- **Element scope, never inherited.** Five badges is five attributes. The cost should grow with the size of the claim.
- **Exempt is not conformant.** WCAG 1.4.3 grants exactly three exceptions (incidental/inactive, logotype, and the large-text threshold). "It is a demonstration" is not among them, so `staging` and `decorative-ghost` leave the page non-conformant at those points, by your choice, stated out loud. The audit reports them; it never launders them into a clean score.

Reach for this last. Six of the fourteen failures on this plugin's own site turned out to be detector bugs, not intentional design, an exemption applied earlier would have buried them.

---

**Avoid**: Relying on color alone to convey information. Using pure black (#000) for large areas. Skipping color vision deficiency testing (about 1 in 12 men affected, see Dangerous Color Combinations above).


## External tools

- **whocanuse** (shows how a color pair reads under vision impairments). https://whocanuse.com/
- **Colorable** (contrast ratio of a foreground and background pair). https://colorable.jxnblk.com/
- **InclusiveColors** (accessible palette builder with WCAG and APCA checks). https://www.inclusivecolors.com/
- **Kontrast** (browser extension for real-time WCAG contrast). https://chrome.google.com/webstore/detail/kontrast-wcag-contrast-ch/haphaaenepedkjngghandlmhfillnhjk
- **A11ygator** (scans a URL against WCAG rules). https://a11ygator.chialab.io/
- **Huetone** (builds accessible color systems). https://github.com/ardov/huetone

For sites to source this from at build time, see [resource-recommendations.md](resource-recommendations.md).
