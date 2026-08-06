---
name: rendered
description: "Run the seven registry rules that need a laid-out page, in Claude in Chrome or in Playwright, from one probe."
version: 1.1.0
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
`{findings, scanned, truncated, elapsedMs}`. Each finding carries the registry
id, so look up severity, rationale and standard in `inspect-rules.csv` exactly as
`detect` does, and cite the remediation route from `remediation-map.csv`.

Two things to get right before reading anything:

1. **Let the page settle.** The probe judges rule 27 against elapsed time. Run it
   at least 2.5s after load, and pass the real figure:
   `(...)({elapsedMs: 2500})`. Under 2000 it declines to judge rule 27 rather
   than guessing.
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

## Reporting

Same discipline as `detect`, and the scope statement matters more here because a
browser run feels more authoritative than it is.

**A clean run means these seven named defects are absent, at this viewport, at
this moment.** It does not mean the page is good, and it does not cover the other
65 rules. Say the viewport and the elapsed time in the report, because both
change the answer.

When the probe reports `truncated: true` the page has more elements than the scan
cap and the read is partial. Say so rather than reporting a count.

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
