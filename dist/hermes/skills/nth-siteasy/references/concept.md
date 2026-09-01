---
name: concept
description: "The art-direction gate that produces a committed DIRECTION.md before any component is built."
version: 1.23.0
---

# Concept: The Art-Direction Gate

A site built from a component library first and an idea second inherits the average of every site that used the same library.
The parts are individually fine.
The whole says nothing.
This gate runs once, before layout, before tokens and before the first component, and its output is a short committed document the rest of the work answers to.

The failure it prevents is common.
A team opens a starter, picks a font that ships with it, drops in a hero and three cards and reaches a page that passes every correctness check and resembles four hundred other pages.
Correctness was never the problem.
The absence of a decision was.
Starting from an idea forces one decision the library cannot make for you: what this specific site is about, held as a position rather than a topic.

The distinction between topic and position matters.
A topic is what the site concerns (tides, invoicing, running shoes).
A position is what the site says about that topic that a rival would not say.
Two competitors share the topic.
They should not share the position.
The gate exists to extract the position and write it down before any visual choice can quietly default the answer.

## The direction brief

The project produces a `DIRECTION.md` at the repository root and commits it before building.
It is short on purpose, one screen, so that it stays legible and gets honored.
A brief that runs to five pages is never read again and never enforced.
It holds six parts.

| Part | What it fixes | Example (a tide-forecast app) |
|------|---------------|-------------------------------|
| Central idea | One line, a metaphor or claim the whole site serves | "The sea has a schedule, and you are late." |
| Point of view | The tension or stance it holds, not neutrality | Reassuring to the planner, blunt about risk |
| Anti-reference | The specific thing it refuses to resemble | Not a weather widget, not a dashboard of gauges |
| Signature moment | The single interaction a visitor will remember | Waterline that rises to fill the page on load |
| Mood | Two to four adjectives, no more | Cold, precise, quiet |
| Ownable direction | The intended type, color and voice territory | Condensed grotesque, one deep teal, imperative voice |

The central idea is the load-bearing line.
Everything else exists to keep it from drifting.
If a later choice cannot be traced back to it, the choice is decoration and should be cut or changed.
The point of view is what stops the idea from collapsing into a slogan: it names who the site is warm to and what it is willing to be blunt about, which is a decision a template cannot fake.

The signature moment belongs in the brief, not in a later polish pass, because it shapes the layout around it.
A page designed with its memorable moment in mind reserves the space and the timing for it.
A page that bolts a moment on at the end has to fight its own structure.

Before the brief is written, look outward once. The data directory ships `inspiration.csv`, a set of reference galleries searchable with `search.py "<territory>" --domain inspiration`: pick two or three entries that match the product's territory, note what the strongest references own, then write the anti-reference against them. This is calibration, not imitation. The brief has to beat the references at distinctiveness, not resemble them.

## The distinctiveness test

Read the central idea aloud, then ask whether a direct competitor could put the same sentence at the top of their own `DIRECTION.md` without lying.
If they could, it is not yet a concept.
It is a category description.

"A clean, fast way to check tides" fails.
Every tide app claims it. "The sea has a schedule, and you are late" passes, because it takes a position (you are the one out of sync, not the sea) that a competitor selling calm and control would not adopt.
A concept a rival can copy word for word is a brief that describes the market, not this product.

Apply the same test to the anti-reference. "Not ugly" is not an anti-reference. "Not a gauge dashboard" is, because it rules out a real and tempting default and therefore constrains the design.
A good anti-reference names something the team would otherwise have drifted toward, so that every review can ask the concrete question: are we becoming the thing we said we refuse to be.

If the brief fails the test, the fix is not more adjectives.
It is a sharper claim or a narrower stance.
Adding words to a weak idea keeps it weak.
Replacing it with one the rival cannot borrow makes it a concept.

## What the gate does not do

It does not choose components, grid systems or breakpoints.
It does not override the quality guardrails.
Accessibility, performance, semantic markup and the anti-pattern rules still apply in full, and the concept is expressed inside them, never as an excuse to break them.
A committed idea buys distinctiveness.
It does not buy permission to ship an inaccessible page.

It also does not license novelty for its own sake.
The mood and the anti-reference exist partly to bound the idea so it stays usable.
A concept that produces an unreadable, unnavigable page has failed its own point of view, because no stated direction survives if the visitor leaves.
Distinctiveness that costs the task is not a win, it is a different failure.

## Downstream obligation

Every later step honors `DIRECTION.md`. The design-system generator does too: `design_system.py <brief> --direction .` reads the committed direction, biases its search to the declared register and flags any recommendation colliding with the anti-references.
Layout answers to the mood.
The type and color systems answer to the ownable direction.
Copy answers to the point of view and the stated voice.
Motion answers to the signature moment.
When two options are otherwise equal, the tie breaks toward the one the brief predicts.
This is what makes the document worth committing: it turns a hundred small taste calls into one referable rule.

The audit closes the loop.
It reads `DIRECTION.md`, then reads the rendered page, and judges whether the idea survived the trip from document to pixels.
A brief that promised a blunt, cold tide app and shipped a soft violet gradient with a friendly rounded font did not survive, and the gap is the finding.
The concept is not scored on how good it sounds in the file.
It is scored on how much of it reached the screen.
