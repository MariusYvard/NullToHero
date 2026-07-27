---
name: slop-patterns
description: "Eighteen lexical markers of generated prose, each with a greppable pattern, a fixed penalty and a before/after rewrite, scored from 100 down with a per-pattern cap."
version: 2.3.0
---

# Slop Patterns

A lexical catalogue of eighteen habits that generated prose falls into, each with a
marker precise enough to grep for, a fixed penalty and a rewrite.

## What this is for

The goal is editorial quality. Prose with varied sentence rhythm and specific,
attributable claims is easier to read, easier to check and easier to quote, whether the
reader is a person skimming on a phone or an engine choosing a passage to cite. Every
pattern below costs the reader something concrete: a sentence that carries no fact, an
attribution that cannot be verified, a heading that repeats what the previous line said.
Removing them is copy editing, and the measure of success is a page that reads well, not
a page that scores well.

`clarify.md` already covers the rhythm-level tells in prose form under "Spotting
machine-written copy" (uniform sentence length, repeated openings, connector overuse).
This file is the lexical and scored counterpart: the same subject reduced to greppable
markers, fixed penalties and a band, so the same draft gets the same number twice.

## How to read an entry

Markers are ripgrep regexes, case-insensitive (`rg -i`). They are written to be
over-inclusive on purpose: a marker's job is to put the sentence in front of a human, not
to decide it. Penalties are 5, 8 or 10 and are explained under "Scoring".

## The patterns

### 1. Significance inflation

**Marker** `\b(plays? an? (vital|key|central|significant) role|serves as a (cornerstone|foundation)|stands as|is a key driver|cannot be overstated)\b`
**Penalty** 8

The sentence asserts that something matters instead of saying what it does.

Before: `Caching plays a vital role in the modern web stack.`
After: `Caching cut p95 latency from 380 ms to 90 ms on the search endpoint.`

### 2. Trailing participial analysis

**Marker** `,\s+(highlighting|underscoring|underscores|ensuring|showcasing|reflecting|demonstrating|emphasizing|illustrating)\b`
**Penalty** 10

A clause bolted to the end of a sentence to explain the significance of the sentence. It
adds no fact and the reader has already drawn the inference. The verbs `underscores`,
`highlighting` and `ensuring` are the three most common carriers.

Before: `Deploys dropped from 40 minutes to 6, highlighting the importance of a good build cache.`
After: `Deploys dropped from 40 minutes to 6 once the build cache landed.`

### 3. Vague attribution

**Marker** `\b((experts|analysts|critics|researchers) (say|argue|believe|note|suggest)|studies (show|suggest)|research (shows|indicates)|industry reports (suggest|indicate)|it is widely (believed|accepted))\b`
**Penalty** 10

A claim is credited to an unnamed body. The reader cannot check it and neither can an
engine deciding whether to cite the passage. The fix is a named source with a date and a
number, not a softer verb.

Before: `Experts argue that most users abandon a page that takes too long to load.`
After: `Google's 2017 mobile study measured a 32 percent rise in bounce rate as load time went from 1 s to 3 s.`

### 4. Negative parallelism

**Marker** `\b(is|it'?s|are|isn'?t|aren'?t) not (just|only|merely|about)\b[^.]{0,80}\.\s+(It'?s|They'?re|This is)\b`
**Penalty** 8

The "X is not just A. It is B." construction. It manufactures a reversal the reader was
not expecting, then delivers a claim that would have stood on its own.

Before: `A design system is not just a component library. It is a shared language.`
After: `A design system is a shared language that happens to ship as a component library.`

### 5. Long dash overuse

**Marker** count the codepoints U+2014 (`&mdash;`) and U+2013 (`&ndash;`), then compare to the word count: `rg -c "\x{2014}|\x{2013}"`
**Penalty** 5

More than roughly one long dash per 200 words. The long dash is a real punctuation mark
with a real use, and generated prose reaches for it as a general-purpose joiner in place
of a comma, a colon, a semicolon or a full stop. Above that density it stops signalling
anything, because every break in the text looks the same.

Before: `The build passed&mdash;finally&mdash;after three rounds of flaky tests&mdash;and we shipped.`
After: `The build passed after three rounds of flaky tests, and we shipped.`

`tools/content/scrub.mjs` resolves this one mechanically: it replaces each long dash with
the punctuation the surrounding words call for.

### 6. Collaborative artifacts

**Marker** `\b(I hope this helps|let me know if|feel free to (ask|reach out)|certainly[,!]|here'?s (a|an|the) (draft|version|breakdown)|as an AI|I'?d be happy to)\b`
**Penalty** 10

Conversational residue from the drafting session, left in the published text. It is the
single most reliable marker in the list because no editor writes it on purpose.

Before: `Here's a breakdown of the three storage tiers. I hope this helps!`
After: `The three storage tiers differ in durability and price.`

### 7. Generic positive conclusion

**Marker** `\b(in conclusion|to sum up|ultimately, the key|the possibilities are endless|one thing is clear|only time will tell|the future of \w+ is bright)\b`
**Penalty** 8

A closing paragraph that restates the piece and adds an upbeat forecast. It costs the
reader the last thing they read, which is the position a real conclusion should hold.

Before: `In conclusion, edge caching is a powerful tool and the possibilities are endless.`
After: `Edge caching pays off above about 10,000 requests per day. Below that, the invalidation work costs more than the latency it saves.`

### 8. Rule of three on autopilot

**Marker** `\b\w+, \w+ and \w+\b` counted per section, plus any document where every list has exactly three items
**Penalty** 5

Three is a good number of examples and a suspicious number of examples every time. When a
whole page runs on triples, the reader stops reading the third item.

Before: `The pipeline is fast, reliable and scalable.`
After: `The pipeline runs in 90 seconds and has not dropped a job in eight months.`

### 9. Contrastive amplification

**Marker** `\b(not only\b[^.]{0,60}\bbut also|more than just|far from being)\b`
**Penalty** 5

A rhetorical booster attached to a claim that is either true (and stands alone) or false
(and the booster hides it).

Before: `The API is not only fast but also easy to learn.`
After: `The API answers in under 40 ms and has four endpoints.`

### 10. Title Case headings

**Marker** `^#{1,6} ([A-Z][a-z]+ ){2,}[A-Z][a-z]+\s*$`
**Penalty** 5

Every content word capitalised, on every heading, regardless of house style. Sentence case
reads faster and matches how the rest of the page is written.

Before: `## Understanding The Core Principles Of Caching`
After: `## How caching decides what to keep`

### 11. Emoji on headings and bullets

**Marker** `^#{1,6}\s*[\x{1F300}-\x{1FAFF}\x{2700}-\x{27BF}\x{2600}-\x{26FF}]` and `^\s*[-*]\s+[\x{1F300}-\x{1FAFF}\x{2700}-\x{27BF}]`
**Penalty** 5

Decoration standing in for hierarchy. A screen reader announces the emoji name before the
heading text, and the emoji carries no information the heading did not already carry.

Before: `## Performance` prefixed with a rocket, and every bullet prefixed with a check mark
After: `## Performance`, with the bullets left plain

### 12. Bold-label lists

**Marker** `^\s*[-*]\s+\*\*[^*]+\*\*:` on three or more consecutive items
**Penalty** 5

Every list item opens with a bold label and a colon, which turns a list of sentences into
a glossary whether or not the content is definitional. Two or three such lists on a page
is a template, not a structure.

Before: `- **Latency**: how long a request takes.` repeated for eight items
After: a table when the items share fields, or plain sentences when they do not

### 13. Signature vocabulary cluster

**Marker** `\b(delve|tapestry|realm|beacon|nestled|bustling|a testament to|navigate the complexities|unlock the potential|ever-evolving|game-changer)\b`
**Penalty** 10

A small vocabulary that is rare in edited human prose and common in generated prose. Each
word has a plain equivalent that costs nothing to use. The family has two further members
that the repository style linter rejects outright, so they are not spelled here; the
linter catches them before this catalogue would.

Before: `This shift is a testament to the ever-evolving realm of frontend tooling.`
After: `Bundlers moved to Rust between 2022 and 2024. Build times fell by roughly an order of magnitude.`

### 14. Meta-announcement of the text

**Marker** `\b(in this (article|post|guide|section),? (we|I) (will |'ll )?(explore|discuss|cover|examine)|this section (covers|explains)|let'?s dive in|without further ado|before we begin)\b`
**Penalty** 8

A sentence about the document rather than the subject. Headings already announce
structure, so the announcement is a second table of contents written in prose.

Before: `In this article, we will explore the three main caching strategies.`
After: `Three caching strategies cover almost every case: read-through, write-behind and a bare CDN.`

### 15. Hedge stacking

**Marker** `\b(may potentially|could arguably|might possibly|can sometimes help to|it is possible that\b[^.]{0,60}\bmight|generally tends to)\b`
**Penalty** 8

Two or more hedges on one claim. One hedge is honest uncertainty. Two is a sentence
declining to say anything while occupying the space of a statement.

Before: `Preloading may potentially improve perceived performance in some cases.`
After: `Preloading the hero image moved LCP from 2.8 s to 1.9 s on a mid-range Android device.`

### 16. Unmeasured quantifiers

**Marker** `\b(countless|a myriad of|myriad|a plethora of|a wide range of|numerous|a wealth of|any number of)\b`
**Penalty** 8

A quantity word standing where a number belongs. The writer either has the number or does
not, and both cases have a better sentence than this one.

Before: `The library supports a wide range of formats.`
After: `The library reads 9 formats and writes 4.`

### 17. Verb inflation

**Marker** `\b(utilize[sd]?|leverage[sd]?|facilitate[sd]?|serves? to|provides? an? (improvement|enhancement|reduction) in|is designed to enable)\b`
**Penalty** 5

A longer verb, or a verb turned into a noun and propped up with a helper, where a plain
verb exists. It adds syllables and subtracts precision.

Before: `The scheduler utilizes a priority queue to facilitate the optimization of throughput.`
After: `The scheduler uses a priority queue, which raised throughput by 22 percent.`

### 18. Heading restated as the first sentence

**Marker** no single regex expresses this one. Extract each heading and the first sentence
that follows it, then flag any pair sharing three or more content words. This is the one
entry in the list that needs a two-step check rather than a grep.
**Penalty** 5

The opening sentence of a section paraphrases its heading, so the reader gets the same
information twice and the section starts one sentence late.

Before: `## Choosing a database` followed by `Choosing a database is an important decision.`
After: `## Choosing a database` followed by `Postgres handles every workload here except the time-series ingest.`

## Scoring

Start at 100. For each pattern, deduct `min(occurrences, 2) x penalty`. Floor the total at
0.

The cap is per pattern and it carries the design. A draft that repeats one habit forty
times has one habit, not forty defects, and an uncapped tally would spend the entire scale
on that habit and report nothing about the other seventeen patterns. Two occurrences is
where a tic stops being an accident, so two occurrences is where its cost stops growing.
The eighteen penalties sum to 128, so the maximum possible deduction is 256 and the floor
at 0 is reachable by a draft that is bad in many ways at once rather than in one way
repeatedly.

Worked example: three vague attributions, one trailing participial and six Title Case
headings score `100 - (2 x 10) - (1 x 10) - (2 x 5) = 60`.

| Band | Score | Reading |
|------|-------|---------|
| Clean | 90 to 100 | Publishable. Any remaining marker is a deliberate choice. |
| Minor tics | 70 to 89 | Copy edit the flagged sentences. The structure is sound. |
| Obvious generation | 50 to 69 | The draft reads as unedited output. Rewrite the flagged sections, not the whole piece. |
| Full rewrite | Below 50 | The habits are load-bearing. Rewriting individual sentences will not fix the voice. |

## Position

This check has no proven ranking effect. No search engine has published a signal that
corresponds to these patterns, and none of the penalties above is calibrated against
ranking data, because there is none to calibrate against. It is a quality and voice gate,
not a search tactic.

Two consequences follow, and they are the operating rules:

1. It runs last, after every check that has a stated mechanism (indexability, structured
   data, Core Web Vitals, accessibility). A page that scores 95 here and is blocked in
   robots.txt has one problem and it is not this one.
2. It never blocks a publication. It produces a score, a band and a list of flagged
   sentences. The decision to ship belongs to the author.

## The deterministic companion

`tools/content/score.mjs` is the code half of this reference. It computes a composite
editorial score for a Markdown draft with no model call, and it already implements the
sentence-rhythm measurement and the phrase-density counts that the rhythm-level tells
need. Its formulas live in that file and are not restated here: run it for the numbers,
read this file for the lexical markers and the rewrites.

```bash
node tools/content/score.mjs draft.md --markdown
```

The two are complementary. `score.mjs` answers "does this prose have a human cadence and
concrete claims"; this catalogue answers "which specific phrases are doing the damage, and
what replaces each one".

## Provenance

The pattern families collected here have a lineage: a community catalogue of overused
wording maintained on Wikipedia, and a published third-party list of generated-text
markers. Neither is reproduced. Every marker, penalty, band and example in this file was
reconstructed from the behaviour it describes and written from scratch for this
repository. What is shared with the upstream lists is the observation that certain phrases
are overused, which is a fact about English usage rather than an authored expression. No
work under copyright is quoted, paraphrased or named.
