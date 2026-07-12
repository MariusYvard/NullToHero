---
name: memorability
description: "The method for judging and scoring how memorable a page is, complementing anti-pattern detection by scoring the positive."
version: 1.24.0
---

# Memorability: Scoring Distinctiveness

A page can be correct, accessible, fast and clean, and still leave nothing behind.
The visitor completes the task, closes the tab and could not describe the site an hour later.
Correctness is the absence of defects.
Memorability is the presence of a decision.
This document is the method for judging and scoring the second thing, used by design critique and by the memorability dimension of the audit.

Correct and memorable are orthogonal.
A page scores well on correctness by having no broken states, readable contrast, valid markup and predictable behavior.
It scores well on memorability by committing to a point of view and expressing it in a form the visitor can recall.
A site can be high on one axis and flat on the other.
The two are measured separately because improving one does not move the other.
Fixing a contrast ratio does not make a page memorable, and adding a signature moment does not fix a contrast ratio.

The reason to score memorability at all is that the market floor has risen.
Correct is now cheap: frameworks, component kits and defaults produce accessible, responsive, fast pages with little effort.
When everyone clears the correctness bar, correctness stops distinguishing anyone, and the only remaining variable is whether the page decided to be someone.

## The dimensions to weigh

Memorability is judged across seven qualities. Weigh them together, not as a checklist to tick. A page does not need to be strong on all seven. It needs to be strong somewhere and empty nowhere.

| Dimension | The question | Weak signal |
|-----------|--------------|-------------|
| Commitment | Does the page hold a point of view, or hedge? | Reads like a category, offends no one, says nothing |
| Signature element | Is there one thing that is this site's and no other's? | Nothing you could name after leaving |
| Typography | Does the type have intent and character? | A default-wave font used without a reason |
| Color | Is there an ownable accent, used with control? | Stock indigo or violet, the framework default |
| Surprise | Is there one genuine moment of delight? | Every interaction is expected, nothing rewards attention |
| Voice | Does the writing sound like a specific author? | Neutral SaaS copy, interchangeable with any rival |
| Restraint | Is the distinctiveness focused, not scattered? | Five effects competing, no hierarchy, cluttered |

Restraint sits deliberately at the end.
Memorable is not the same as maximal.
A page with one strong idea and quiet support beats a page with five effects fighting for attention.
When commitment and restraint appear to conflict, they do not: commitment picks the idea, restraint protects it by removing everything that dilutes it.
The two are a pair, not a trade-off.

The strongest signature elements are literal and non-templatable: a hand-drawn mark animated stroke by stroke, a named 3D centerpiece, an owned display glyph.
A genre effect (a slit reveal, a marquee, a split-text headline) can be executed beautifully and still belong to everyone.

Commitment is weighted highest of the seven.
A page that holds a real point of view will usually pull the other dimensions along with it, because a stance implies a voice, a voice implies word choices and a stance about who you serve implies a color and type territory.
A page with no point of view has nothing to derive the rest from, which is why it defaults.

## Template-shaped tells

Certain patterns signal that no design decision was made, only a default accepted. Flag them explicitly, because their combined presence is the usual shape of a forgettable page.

The default-wave font is the first tell.
Inter, Roboto, Geist and their neighbors are competent typefaces.
Used without intent, chosen because they were already loaded, they announce that typography was skipped.
The font is not the crime.
The absence of a reason is.
A team that chose Inter deliberately, for a documented reason tied to the concept, has not committed the tell.
A team that never considered the question has.

The second tell is the stock arrangement: a centered hero with a big heading and a subheading, a row of three feature cards below it and a soft gradient behind.
It is the literal output of a hundred starters.
It is not wrong.
It is anonymous.

The third is the stock palette, a violet or indigo primary lifted straight from a framework theme with no adjustment.
The fourth is uniform even spacing everywhere, every gap the same, which produces a page with no rhythm and no emphasis.
The fifth, and the most telling, is zero signature moment: nothing on the page that a visitor would remember or mention.

A sixth tell has emerged with the award-site genre: the full move set, clip-path slit reveals, split-text headlines, a scroll-pinned video, a velocity marquee, present together with no variation.
On a portfolio or product page this cluster is now as template-shaped as the centered-hero-plus-three-cards arrangement, because it is the literal output of the genre's tutorials.

One tell is a smell.
Three or more together are the diagnosis.
Score the tells as evidence, not as automatic failure, because any one of them can be a defensible choice.
It is the cluster that reveals a page assembled from defaults rather than authored.

## From verdict to move

A memorability verdict is useless if it ends at "make it more distinctive." That instruction cannot be acted on.
The method requires converting the verdict into one concrete distinctive move the team can implement and see.

Vague: "the typography is generic." Concrete: "replace Inter with a condensed grotesque for headings only, set the hero line at 6rem with -0.03em tracking, keep the text face for body." Vague: "add some personality." Concrete: "the product is a tide app, so make the hero waterline rise to fill the viewport on load, once, then settle, honoring reduced-motion with a static filled state." The move names the technique, the target and the constraint.
One good move beats a paragraph of adjectives.

Prefer one move to many.
A critique that lists eight improvements will be half-applied and will scatter the result.
Name the single change with the highest distinctiveness return, tie it to the concept, and let the next pass find the next one.
A memorable page is usually the product of a few committed decisions, not a hundred small ones, so the critique should model that discipline rather than fight it.

## Relationship to slop detection

This dimension scores the positive.
It rewards distinctiveness, commitment and a memorable form.
It is the counterpart to the anti-pattern and AI-slop checks, which score the negative by penalizing the generic hero, the default font, the stock palette and the absence of intent.
The two run together and answer different questions.
Slop detection asks whether the page fell into a default.
Memorability asks whether it climbed out of one and stood somewhere specific.

A page can avoid every anti-pattern and still be forgettable, which is exactly the gap this method exists to catch.
Passing slop detection means the page has no obvious defaults.
It does not mean the page has an idea.
The memorability score is the one that reads for the idea, and a high correctness score with a low memorability score is the precise signature of a competent, forgettable site.
