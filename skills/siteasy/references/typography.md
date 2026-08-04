---
name: typography
description: "Typographic scale, line-height, and measure on the shared 4pt spacing scale for readable, well-proportioned type."
version: 1.9.1
---

# Typography

## Look up the face before naming it

Font names, available weights and real pairings are facts, and a model that recites them from
memory invents variants that do not exist and pairs faces that were never designed to sit
together. Query instead:

```
python3 tools/design-system/scripts/search.py "<brief or mood>" --domain typography
python3 tools/design-system/scripts/search.py "<family name>" --domain google-fonts
```

`typography` returns pairings that someone shipped. `google-fonts` is the catalogue, 1,923
families with their real weights, and it exists so that a specimen you name can be loaded.

## Classic Typography Principles

### Vertical Rhythm

Anchor vertical spacing on the text's own line box. If body text has `line-height: 1.5` on `16px` type (= 24px), that 24px step is the section rhythm to return to. The values themselves come from the 4pt scale ([spatial-design.md](spatial-design.md), [design-tokens.md](design-tokens.md)), which is the token system: 24px is the rhythm you land on, not a rule that forbids the 8, 12, 16 and 32 steps between. Text and space then share one mathematical foundation.

### Modular Scale & Hierarchy

**Use fewer sizes with more contrast.** A 5-size system covers most needs:

| Role | Typical Ratio | Use Case |
|------|---------------|----------|
| xs | 0.75rem | Captions, legal |
| sm | 0.875rem | Secondary UI, metadata |
| base | 1rem | Body text |
| lg | 1.25-1.5rem | Subheadings, lead text |
| xl+ | 2-4rem | Headlines, hero text |

Popular ratios: 1.25 (major third), 1.333 (perfect fourth), 1.5 (perfect fifth). Pick one and commit.

### Readability & Measure

Use `ch` units for character-based measure (`max-width: 65ch`). Line-height scales inversely with line length: narrow columns need tighter leading, wide columns need more.

**Non-obvious**: Light text on dark backgrounds needs compensation on three axes. Bump line-height by 0.05 to 0.1, add a touch of letter-spacing (0.01 to 0.02em), and optionally step the body weight up one notch.

## Font Selection & Pairing

### Anti-reflexes worth defending against

- A technical/utilitarian brief does NOT need a serif "for warmth."
- An editorial/premium brief does NOT need the same expressive serif everyone is using right now.
- A "modern" brief does NOT need a geometric sans. The most modern thing you can do is not use the font everyone else is using.

**System fonts are underrated**: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` looks native, loads instantly, and is highly readable. Consider this for apps where performance > personality.

### Check the licence before you fall in love with the face

Free-font sites label display faces "free for personal use", and that label is not the licence. The licence is the readme in the zip, and it routinely reads like this one:

> 1. This font is ONLY FOR PERSONAL USE
> 2. NO COMMERCIAL USE ALLOWED
> 3. You are REQUIRES A LICENSE for PROMOTIONAL or COMMERCIAL USE

**Promotional** is the word that catches almost every site we build. A marketing page for a product is promotional even when the product is free and the company does not exist yet; "it's my own little site" is not a defence, and nor is "the plugin is open source". The face is usually cheap to license and the author usually answers email, so this costs a purchase, not a redesign, as long as it is settled before launch rather than after.

Practically: read the readme, not the badge. If the licence needs buying and the answer is no, pick the closest openly-licensed face (OFL) in the same genre rather than a different genre entirely, and say which one you dropped and why. If the client insists, that is their call to make with the terms in front of them, not a decision to make silently on their behalf.

### Mixing two faces: measure the painted ink, never the declared baseline

Setting two typefaces side by side in one lockup (a wordmark, a logo, a display line) is where "looks about right" fails hardest, because every instinct is wrong:

**`align-items: baseline` is not alignment.** It aligns the baselines the FONTS declare, and two faces have unrelated metrics. The typographically correct alignment is routinely the visually wrong one. When two words look off and nudging one by a few pixels seems to almost fix it, stop: the offset is a symptom, and hand-tuning it just buries a structural error under a second wrong number.

**Match cap height, not font-size.** At the same `font-size`, two faces have different cap heights: a display face's caps can be 25% taller than a text face's. Measure both and scale one:

```js
const c = document.createElement("canvas").getContext("2d");
const cap = (font, ch) => { c.font = font; return c.measureText(ch).actualBoundingBoxAscent; };
const ratio = cap("900 100px Satoshi", "T") / cap("100px Display", "N");  // e.g. 74/71 = 1.042
```

**Centre on painted ink, effects included.** Once the words have different total heights, no baseline can level them. Take each word's painted box, `actualBoundingBoxAscent` + `actualBoundingBoxDescent`, **plus any shadow, extrusion or glow you drew**, find its centre, and shift each word onto the common centre. A text-shadow extrusion hanging 0.14em below the baseline is ink the reader sees; excluding it from the height is measuring the wrong object.

**Fit letters on side bearings, not on guesses.** Ink gaps between the words are not the margins you set. An italic face's terminal can overhang its own advance width, and a heavy `H` carries a real left side bearing:

```js
const gap = (advanceA - inkRightA) + (-inkLeftB);   // actual white between two words
```

Two faces butted together with no margin were 9.6px overlapped on one side and 9.3px apart on the other in one real case: a 19px swing, invisible to the eye as a cause and obvious as a symptom ("this word is glued to that one").

**Two things stay optical, and only two.** Size, when an effect adds mass no cap height accounts for (an extruded word reads heavier at the same cap height, so it wants ~0.95). And kerning across a round-to-flat pair (`o` then `H`): a curve recedes, so a mathematically equal gap reads smaller and must be opened. Measurement settles geometry; it does not settle perception. Everything else here is measured, and the ratio is worth re-deriving whenever a face, a size or an effect changes.

### Pairing Principles

**The non-obvious truth**: You often don't need a second font. One well-chosen font family in multiple weights creates cleaner hierarchy than two competing typefaces.

When pairing, contrast on multiple axes:
- Serif + Sans (structure contrast)
- Geometric + Humanist (personality contrast)
- Condensed display + Wide body (proportion contrast)

**Never pair fonts that are similar but not identical** (e.g., two geometric sans-serifs).

### Web Font Loading

`font-display: swap` and a `preload` on the one above-the-fold weight are the baseline. The step almost nobody takes is the second `@font-face`: declare a fallback family pointing at a `local()` face and override its metrics (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) so the fallback occupies the same box as the real font, then list it between the webfont and the generic. Typical Arial-to-custom correction lands near `size-adjust: 105%`, `ascent-override: 90%`, `descent-override: 20%`, `line-gap-override: 10%`, but the numbers are per-face and worth measuring. Without this, `swap` buys visibility and pays for it in CLS.

**Variable fonts for 3+ weights or styles**: a single variable font file is usually smaller than three static weight files.

## Modern Web Typography

### Fluid Type

Use `clamp(min, preferred, max)` for headings and display text on marketing/content pages. Keep body text fixed even on marketing pages.

**Bound your clamp()**: keep `max-size ≤ ~2.5 × min-size`.

**Use fixed `rem` scales for app UIs**: No major app design system uses fluid type in product UI, fixed scales with optional breakpoint adjustments give the spatial predictability that container-based layouts need.

### OpenType and rendering polish

Four settings earn their place, each on the narrowest selector that needs it: `font-variant-numeric: tabular-nums` on any column of figures or animated counter (proportional digits reflow as they change), `font-variant-caps: all-small-caps` on `abbr`, `text-wrap: balance` on headings only, and `text-wrap: pretty` on long prose. `balance` is capped by engines at a handful of lines and costs layout work, so pointing it at body copy is both slower and a no-op. Add `font-optical-sizing: auto` when the family ships an optical-size axis.

**ALL-CAPS tracking**: Add 5 to 12% letter-spacing (`letter-spacing: 0.05em` to `0.12em`) to short all-caps labels and headings.

## Accessibility Considerations

- **Never disable zoom**: `user-scalable=no` breaks accessibility.
- **Use rem/em for font sizes**: Respects user browser settings. Never `px` for body text.
- **Minimum 16px body text**: Smaller than this strains eyes and fails WCAG on mobile.

---

**Avoid**: More than 2-3 font families per project. Skipping fallback font definitions. Ignoring font loading performance (FOUT/FOIT). Using decorative fonts for body text.
