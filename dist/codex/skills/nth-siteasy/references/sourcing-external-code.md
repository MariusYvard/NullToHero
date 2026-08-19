---
name: sourcing-external-code
description: "When to go and read someone else's code, and what you are allowed to do with it once you have. Two regimes: a registry you install from and own, and a reference you read and re-author. Provenance decides, never convenience."
version: 1.34.0
---

# Sourcing external code

Open the source. A component page, a demo, a pen: reading how something was actually
built beats reasoning about how it might have been, and it takes one fetch. This
skill has `fetch` for exactly that.

The rule is not *whether* to look. It is what you may do with what you find, and that
is decided by **where the code came from**, not by how useful it would be to paste.

## The two regimes

| | Registry | Reference |
|---|---|---|
| Example | Magic UI (`magicui.design/docs/components`), shadcn/ui | Freefrontend, CodePen, Codrops |
| What it is | A library that publishes code *in order to be installed* | An aggregator of other people's demos |
| Licence | Stated and permissive (MIT), for the whole set | Per author, per pen, frequently unstated |
| You may | Install it, commit it, own it | Read it, understand it, re-implement it |
| You may not | Leave it unaudited | Paste it |

### Registry: install, then own it

```bash
npx shadcn@latest add "https://magicui.design/r/<name>.json"
```

The code lands in the project. From that second it is **site code, not vendor code**,
and every law applies to it: tokens instead of factory gradients, a reduced-motion
guard, real alt text, AT-visible content. Registry components are demo-tuned, so
assume the guard is missing until you have read the file. Only 3 of Magic UI's 78 ship
one.

Fetch the component's own page before installing. [component-recipes.md](component-recipes.md)
records the props seen in canonical demos, which is not the same as the props that
exist, and a recipe can go stale between releases. The page is the source of truth;
the recipe is the shortcut.

### Reference: read the technique, write the implementation

Freefrontend is an index of other people's pens. It is the fastest way to see how an
effect is really achieved, and the fastest way to import a licence you cannot name.
Both are true, so it gets used one way only: **fetch it, understand the mechanism,
close the tab, write your own.**

| Section | Good for |
|---|---|
| `freefrontend.com/css-code-examples/` | how an effect is done in CSS alone |
| `freefrontend.com/html-code-examples/` | markup structures (audit the semantics, the pens are not reviewed) |
| `freefrontend.com/javascript-code-examples/` | interaction mechanics (they almost never carry reduced-motion or keyboard support) |
| `freefrontend.com/tailwind-code-examples/` | Tailwind compositions (rebind arbitrary values to tokens) |

That is not legal paranoia, it is the same standard the rest of this skill already
holds: photos are checked against [stock-media.md](stock-media.md), fonts are
self-hosted with their licence, `fetch-asset.mjs` refuses a use-only source without
`--force`. Code is not the one asset class where provenance stops mattering.

A re-authored implementation is usually better anyway. A pen is built to demo one
effect in isolation, against no design system, with no reduced-motion guard, no
keyboard path and no token discipline. Copy it and you inherit all four. Understand
it and you keep the one thing that was worth taking.

## The gate

Nothing arrives clean. Whatever the regime, before it ships:

- **Tokens.** Factory gradients and hardcoded hexes get rebound to the project's tokens.
- **Motion.** A reduced-motion guard, and the loop counts against L-MOTION-2.
- **Contrast.** Measure it once it wears your colours: the demo's palette is not yours.
  See [color-and-contrast.md](color-and-contrast.md).
- **AT.** Decorative layers `aria-hidden`, real content readable, keyboard path intact.
- **Attribution.** A registry component keeps its licence header. Anything with a named
  author that survives into the project goes in `ATTRIBUTION.md`, or it does not survive.

This is the whole point. NullToHero's argument is that it can tell you your page is
ugly and broken. A plugin that pastes unaudited snippets is just a faster way to
produce the thing it exists to detect.

## The kit trap

Fetching is cheap, which is the risk. Marquee plus bento plus globe plus ticker plus
border beam is not a design, it is a registry zoo, and `memorability` flags it as
template-shaped. Pick against the committed `DIRECTION.md`: one signature moment,
quiet support. See [signature-moments.md](signature-moments.md).

## Resource hooks

```bash
# every code-example source, with its regime in the `use` column
python3 tools/design-system/scripts/search.py "code examples" --domain resources
# the animated registries
python3 tools/design-system/scripts/search.py "magic ui" --domain resources
```
