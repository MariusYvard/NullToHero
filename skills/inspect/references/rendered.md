---
name: rendered
description: "Run the seven registry rules that need a laid-out page, in Claude in Chrome or in Playwright, from one probe."
version: 1.4.0
---

# Rules that need a rendered page

Seven rules in `tools/data/inspect-rules.csv` cannot be decided from source text.
Whether an error message lands beside its field, whether a pinned stage has room
to travel, whether a transformed ancestor has quietly broken a sticky element:
those are facts about a laid-out page. Reading the CSS cannot produce them, and
until v3.2.0 the plugin said so and left them to a human reader.

| Rule | What only a rendered page can answer |
|---|---|
| 5 Color is not the only signal | Whether the element carries a state and says nothing else |
| 23 Inline errors | Where the message actually renders relative to the field it belongs to |
| 27 Loading state choreography | What feedback is still on screen once the page has settled |
| 51 Pins need a scroll track | The resolved height of the track against the viewport |
| 52 Transforms create containing blocks | Which ancestor in the rendered chain became the containing block |
| 62 Hide marquee clones | Which copies exist, since a marquee clones its track at runtime |
| 68 Guarantee decorative video playback | Whether the decorative hero is playing, blocked, or frozen on its last frame |

## One probe, two runners

`tools/inspect/rendered.mjs` exports a single function. It is serialised to
source before it runs, so the same code goes to either browser. Two
implementations of "is this sticky element broken" would drift, and drift between
what the registry says and what the engine does is the failure `rule-coverage.csv`
exists to prevent.

**Claude in Chrome.** The path for a live site, a page behind a login, or
anything that needs a cookie banner dismissed first. Get the source, then run it
in the page:

```bash
node tools/inspect/rendered.mjs --source
```

Open the target in a tab, let it settle, then pass that string to the browser
extension's JavaScript tool. It returns
`{findings, scanned, truncated, elapsedMs, settled}`. Each finding carries the
registry id, so look up severity, rationale and standard in `inspect-rules.csv`
exactly as `detect` does, and cite the remediation route from
`remediation-map.csv`.

Two things to get right before reading anything:

1. **Check `settled` before you trust a quiet result.** The probe measures its own
   elapsed time from the load event and does not take it from you. Under 2s it
   returns `settled: false` and does not judge rules 27 and 68 at all, so their
   absence means nothing. Wait and run it again. It used to accept the figure
   from the caller, and the caller was wrong: the test harness claimed 2500ms
   while evaluating on the load event, and every video read as paused.
2. **Set the viewport deliberately.** Rule 51 compares a track against
   `window.innerHeight`. A pin that works at 800px tall can fail at 1200px.
   Report the viewport with the findings, and run mobile as a second pass.

**Playwright.** The headless path, for a URL you can reach without interaction.

```bash
node tools/inspect/rendered.mjs https://example.com --json
node tools/inspect/rendered.mjs https://example.com --viewport 390x844 --wait 3000
```

Playwright is not a dependency of this repository. When it is absent the CLI says
the run measured nothing and points at the browser path, instead of exiting clean
and letting a reader assume the page was checked.

## Two sibling probes, two other mechanisms

This file's probe is one injected function on a settled page. Two other rule
families need something it does not, and each is a separate file for that reason
rather than more rows here.

[three.md](three.md) covers `tools/inspect/three.mjs`, which measures a live
three.js scene's draw calls and pixel ratio from `renderer.info`. It needs a
collector installed **before** the page's own three.js evaluates, so in Claude in
Chrome it is two steps and a reload.

`tools/inspect/motion.mjs` decides rule 84, and it needs the runner to emulate a
media feature:

```bash
node tools/inspect/motion.mjs https://example.com --json
```

Rule 21 passes any stylesheet that contains `prefers-reduced-motion` once, even
when thirty of its thirty-one animations sit outside the guard. This probe stops
inferring: it emulates the preference, reads every entry in
`document.getAnimations()`, waits, and reads again. An animation whose
`currentTime` advanced is a violation, and there is nothing to interpret in
between.

It refuses before it judges. The first thing it checks is whether the page is
actually reporting the preference, because a run where the emulation did not take
has every animation legitimately running, and an empty findings list would then
mean the opposite of what it looks like. Same discipline as `settled` above, for
the same reason.

Two things it will not tell you. It cannot say a guard is complete, only that
nothing moved during its sample, so a five-second delayed animation clears a
one-second sample. And a page with nothing animating clears nothing: the result
carries `sampled`, and a zero there is not a pass.

## The time axis

The probe at the top of this file observes one moment, and says so. Everything it
checks is therefore blind to what is only true while an animation is in flight.
Two elements that never overlap at rest can cross for two hundred milliseconds
mid-transition, and a hero can sit motionless for three seconds inside a sequence
that reads as continuous in the source.

```bash
node tools/inspect/motion.mjs https://example.com --sweep --json
```

The sweep pauses every entry in `document.getAnimations()`, writes `currentTime`
across a grid, and samples the geometry at each step. The browser produces a
matrix, one row per time. Node produces the verdict, from a pure function that
never sees a page, which is why `evaluateSweep` is unit-tested on hand-written
matrices with no Chromium at all.

Two rules come out of it. Rule 85 is a still run inside the declared duration: an
animation that declares four seconds and stops moving at six hundred milliseconds
has 3.4 seconds of dead air. The tail is not exempt, because the declared duration
is the author's statement of how long this should take. Rule 86 is a collision
between two text-bearing boxes that does not exist in the first sample, which is
what makes it a motion finding rather than a layout one.

**The refusal is the important part.** If every sample comes back with the same
signature, the seek never moved the page, and every quiet rule in that run is
quiet for the wrong reason. `evaluateSweep` returns `refused: true` and emits
nothing, because a clean report from a sweep that never advanced is worse than no
report at all. The same trap is why the reduced-motion probe checks the emulation
took before it judges.

Three limits, stated rather than discovered later. `document.getAnimations()`
reaches CSS animations, CSS transitions and WAAPI, and does not reach a GSAP
scrub or a hand-rolled `requestAnimationFrame` tween; the result carries
`undrivable` and says how many it could not move. The signature is built from
`getBoundingClientRect`, which is an axis-aligned box, so a rotation is flattened
into its bounding rectangle: four zero-size marker children per element would give
the real projected quad, and that mutates the page to measure it, so it is the
upgrade path and not what ships. And an infinite loop has no end time, so one
iteration is taken as the window.

In Claude in Chrome it is two pastes, because the sampler is installed as a page
global once rather than serialised per sample:

```bash
node tools/inspect/motion.mjs --install        # paste first
node tools/inspect/motion.mjs --sweep-source   # then this
```

## Reporting

Same discipline as `detect`, and the scope statement matters more here because a
browser run feels more authoritative than it is.

**A clean run means these seven named defects are absent, at this viewport, at
this moment.** It does not mean the page is good, and it does not cover the other
65 rules. Say the viewport and the elapsed time in the report, because both
change the answer.

When the probe reports `truncated: true` the page has more elements than the scan
cap and the read is partial. When it reports `settled: false` two of the seven
rules were not judged. Say either one rather than reporting a count.

Findings are collapsed and capped. Identical findings become one line carrying the
count ("6 elements matching div.finder-popup"), because a real page produced six
copies of one sentence on the first run outside the fixtures. Past three distinct
findings for a rule the probe adds a line saying how many it did not list, so the
cap is never silent.

## What it found the first time it was pointed at real pages

Five pages on 2026-08-06, at two viewports. Three findings, on three different
rules, all three confirmed by hand, and nothing that turned out to be noise.

| Page | Rule | Verified |
|---|---|---|
| A CV site | 52 | Six `position: fixed` popups under an ancestor at `translateY(26px)`. All closed at read time, so the defect is latent and real: each will resolve `top: 0` against the ancestor when opened. |
| A portfolio | 62 | A ticker of 10 children carrying 5 distinct strings, none `aria-hidden`, track running `24s linear infinite`. A screen reader reads the list twice. |

Two further public pages were used as stress targets and are not listed: one
returned a rule 5 finding on a colour-only status dot, the other hit the
4000-element scan cap and said so. One page returned nothing at all, which is also
a result: the rules are narrow enough not to fire on a clean page.

## What it deliberately does not claim

Rule 27 wants thresholds across a load: nothing under 300ms, a skeleton from
300ms to 2s, a spinner with a contextual message beyond that. One observation
cannot see a sequence, so the probe decides the half it can, which is what
outlived its window, and names the elapsed time in the finding. Instrumenting the
load would need a controlled navigation and is not what this probe is.

Rule 23 judges only fields the application itself marked invalid, through
`aria-invalid="true"`, `data-invalid` or `data-error`. Using `:invalid` would fire
on every empty required field at first paint, which is not a defect and would
bury the real ones.

Rule 51 judges stages, not sticky table headers and nav bars: a sticky element
shorter than half the viewport is skipped on purpose.

Rule 68 does not decide the architecture the registry entry prescribes. Whether a
canvas decoder is the right answer is a build decision. What the probe answers is
narrower and more useful: this decorative hero is not playing right now, and here
is which of the two reasons applies.

The first is that it never started, which covers the iOS Low Power Mode case the
entry describes and could never test, and the plain missing `muted` besides. The
second is the one that survives review: a hero with no `loop` plays once while
somebody is watching, then sits frozen on its last frame for every visitor after
that. A decorative video loops or it is not decorative, so the absence of `loop`
is reported as a defect and not as a preference. Videos with `controls` are out of
scope here: the reader chose to watch those and they are allowed to end.

Rule 5 does not decide whether colour is the only signal in the abstract, which
needs to know what the colour means. It decides the half that is observable: this
element carries a state and says nothing else, with no text, no icon and no
accessible name. Form controls are skipped because their state is announced
through their own semantics, and `aria-invalid` is skipped because it is itself a
second signal. Both exclusions came from the rule firing on rule 23's clean
fixture the first time it ran.
