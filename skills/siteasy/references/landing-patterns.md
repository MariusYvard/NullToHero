---
name: landing-patterns
description: "Landing page patterns. Common section orders for marketing pages, where the primary call to action goes, the proof and color strategy each pattern needs, and the conversion reasoning behind them."
version: 1.15.0
---

# Landing Patterns

A landing page is a sequence, not a canvas. The order of sections is the argument: each one answers the objection the previous one raised. Pick a pattern by the visitor's starting state (cold, comparing, ready) and let it set the spine, then design within it.

These patterns inform planning a page; pair this reference with [shape.md](shape.md) when you run `/siteasy shape`.

## Where the headline starts

Two scales decide it, and they are not the same scale. Awareness describes the individual
reader. Sophistication describes the market they are shopping in. A reader can be highly
aware in a market that has heard every promise already, and the copy that works there is
not the copy that works for the same reader in a young market.

| Reader awareness | Where the headline starts | Pattern that fits |
|------------------|---------------------------|-------------------|
| Unaware of the problem | Name the situation, not the product. The headline's only job is to earn the first sentence. | Story or problem-led |
| Problem-aware | Name the problem in their words, then the shape of a solution | Problem-led |
| Solution-aware | Name your category and what makes yours different | Comparison, feature-led |
| Product-aware | Name the offer, the proof and the risk reversal | Pricing-led, offer-led |
| Most aware | Name the deal and get out of the way | Direct offer |

| Market sophistication | What the headline must do |
|-----------------------|---------------------------|
| First to market | State the promise plainly. It is new, so it is enough. |
| Competitors present | Enlarge the promise, or make it more specific than theirs |
| Promises exhausted | Introduce a mechanism. Nobody believes the claim any more, so explain why yours works. |
| Mechanisms competing | Elaborate the mechanism, or make it simpler than theirs |
| Market jaded | Stop arguing and switch to identification: who this is for, and who it is not for |

Diagnose both before choosing a pattern below. The most common failure is writing
solution-aware copy for a problem-aware reader, which reads as a product nobody asked
about, and the second most common is stating a plain promise into an exhausted market,
which reads as noise.

Whether the offer under the copy is worth buying at all is a different question, and it
is in [offer-diagnostic.md](offer-diagnostic.md).

## Patterns

| Pattern | Use when | Section order | Primary CTA | Note |
|---|---|---|---|---|
| Hero, features, CTA | A known category, warm traffic | Hero, social proof, features, pricing, FAQ, CTA | In the hero and repeated at the end | The default. Sticky nav CTA once the hero scrolls past |
| Problem, agitate, solve | The visitor feels a pain but has not named it | Problem, stakes, solution, proof, CTA | After the solution is shown, not before | Earn the pitch by naming the pain first |
| Before and after | A visible transformation | Hero, before state, after state, how, proof, CTA | After the after-state | Concrete contrast converts; show, do not claim |
| Video-first hero | A product that needs to be seen moving | Hero with video, key benefits, proof, CTA | Beside the video and after it | Captions are mandatory; autoplay muted, with a control |
| Long-form sales | High price or high consideration | Hook, story, problem, solution, proof, objections, pricing, guarantee, CTA | Repeated every few sections | Length is fine if every section removes a doubt |
| Pricing-led | The visitor is comparing and price-aware | Hero, pricing, feature comparison, proof, FAQ, CTA | In the pricing table | Put numbers up front when the visitor came for them |
| Social-proof heavy | A crowded market where trust is the gap | Hero, logos, testimonials, case study, features, CTA | After the proof block | Lead with evidence when credibility is the objection |
| Product tour | A feature-rich tool | Hero, tour by job-to-be-done, integrations, pricing, CTA | After the tour | Organize by what the user wants to do, not by feature name |
| Comparison or alternative | Capturing "X vs Y" intent | Hero, comparison table, differentiators, proof, CTA | After the table | Be fair about the competitor; overclaiming reads as weakness |
| Waitlist or lead magnet | Pre-launch or top-of-funnel capture | Hero, value of the magnet, one-field form, proof | The form, single field | Ask for the minimum; every extra field costs signups |

## The primary call to action

- One primary action per page, repeated, not five competing ones. Secondary actions are visibly quieter.
- Place the first CTA in the hero and repeat it at each natural decision point (after proof, after pricing, at the end). A long page with a single CTA at the bottom wastes every visitor who decided early.
- The CTA must clear a strong contrast against its surroundings (treat 4.5:1 as the floor for its label, and make the button stand out from the section it sits in).
- A sticky header CTA, appearing once the hero scrolls away, keeps the action one tap away without crowding the hero.
- The label states the outcome ("Start the trial", "Get the template"), not the mechanism ("Submit").

## Proof carries more weight than claims

- A before-and-after, a real number, or a named customer outperforms an adjective. Replace "powerful" with the result it produces.
- Testimonials need attribution (name, role, company, ideally a face) or they read as invented.
- Logos work only if the brands are recognizable to this audience; unknown logos add nothing.
- A video on the page lifts engagement, but only with captions and a poster frame, and never as the sole source of a key claim.

## Audit

1. Is there a single primary action, repeated at each decision point, with secondary actions clearly subordinate?
2. Does the section order answer objections in sequence, or do sections appear in an arbitrary order?
3. Is every superlative backed by a specific number, example or named source?
4. Does the hero CTA reach the floor contrast, and does a sticky CTA take over once the hero leaves?
5. Does any media (video, animation) have a non-motion path and captions?
