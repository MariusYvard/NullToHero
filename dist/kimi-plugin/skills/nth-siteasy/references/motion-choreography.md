---
name: motion-choreography
description: "How to make every piece of motion on a site feel authored rather than defaulted, with a consistent timing signature."
version: 1.23.1
---

# Motion Choreography

Most motion on the web is defaulted, not authored.
A fade here, a slide there, each added in isolation with whatever duration the snippet shipped with.
The result feels arbitrary because it is.
Choreography is the decision to treat all the motion on a site as one system, with a shared vocabulary and a deliberate order, so it reads as intentional rather than accumulated.

## The entrance narrative

When a page loads, things appear in an order, and that order tells a small story.
The default failure is to animate the chrome first (nav bars sliding in, decorative frames drawing themselves) while the message waits.
Lead with the message.
The headline and the one thing the visitor came for should resolve first, then the supporting layout, then the peripheral chrome.
If a visitor stops the load halfway, they should already have the point.

An entrance narrative is short.
It resolves in under a second in total, not as a sequence of drawn-out reveals the visitor has to sit through on every visit.
The goal is a page that assembles with intent, not a page that performs.
Motion the visitor has to wait out is a tax, and a tax paid on every page load is resented quickly.

## A single timing signature

Pick one easing curve and one small duration scale, and apply them everywhere.
This is the decision that makes motion feel like one hand made it.
A site that uses ease-out in one place, a bounce in another and linear in a third feels like three sites.
One curve, used consistently, becomes part of the identity the same way a color does.

A workable signature is one custom easing (for example `cubic-bezier(0.2, 0, 0, 1)`, a firm ease-out with a confident finish) plus a short duration scale, roughly 150ms, 250ms and 400ms for small, medium and large moves.
Express both as CSS custom properties (`--ease-signature`, `--dur-2`) and reference the tokens everywhere rather than typing raw values.
Raw values scattered through the code are how a signature erodes.

## Stagger rules

Lists and grids animate with a stagger, each item offset slightly from the last, so the group resolves as a wave rather than a block.
Keep the per-item delay small, 40 to 80ms (L-MOTION-5), and cap the total: a long list must not take two seconds to finish appearing.
Beyond roughly the first eight to ten items, stop staggering and reveal the remainder together, because a visitor is not watching item forty arrive.

Stagger direction should match reading order, top to bottom and leading edge first, so the motion reinforces how the eye already moves rather than fighting it.
A grid can stagger diagonally for a subtler effect, but the same cap on total duration applies.

## The restraint budget

Too much motion is a real failure, not a matter of taste, and it needs a test.
The test: if you cannot look at any single point on the page without something moving in your peripheral vision, there is too much motion.
Motion should draw attention to one thing at a time.
When three things animate at once, they compete and none of them lands.

A practical budget: one signature moment (see the signature-moments library), plus quiet functional motion on interaction, plus restrained reveals on scroll.
If a section has an animated background, a parallax layer, a marquee and per-word text animation all at once, cut until one of them clearly leads.
Ambient motion that never rests is the most common overspend, because each piece seemed reasonable alone.

## Three kinds of motion

Motion splits into three roles, and keeping them distinct prevents the page from feeling busy.

| Kind | Purpose | Character |
|------|---------|-----------|
| Load | Assemble the page, lead with the message | Happens once, resolves quickly, then done |
| Scroll | Reveal and pace content as the reader moves | Tied to position, subtle, never blocks reading |
| Interaction | Confirm and respond to what the user did | Immediate, brief, feedback not decoration |

Load motion earns the most latitude because it happens once.
Interaction motion must be the fastest and most restrained, because the user triggers it repeatedly and any lag or excess becomes friction.
Scroll motion sits between, present but quiet, and it must never make the reader wait to read.

## Perceived performance

Animate `transform` and `opacity`, and where an effect seems to need a layout property, find the transform equivalent and reserve the space ahead of time so nothing shifts.
A beautiful animation on a property that reflows is worse than no animation, because stutter reads as broken and the visitor blames the page rather than the effect.
`will-change` is a promotion, not a decoration: put it on the one heavy element that earns it and take it off when the animation ends.
Perceived performance is part of the aesthetic, smoothness is a feature the visitor feels even when they cannot name it.

## A moment-to-technique map

| Moment | Recommended technique | Duration |
|--------|----------------------|----------|
| Page load | Staggered opacity and translateY on key elements, message first | 250 to 400ms per group |
| Section reveal | Scroll-driven fade and rise via `animation-timeline: view()` | 250ms |
| Hover | Transform or color shift on the signature easing | 150ms |
| Press | Brief scale down then spring back | 150ms |
| Page change | View Transitions morph or a quick shared-element fade | 300 to 400ms |

Treat the table as a starting signature, not a law. The point is that the durations relate to each other on one scale, so the whole site moves in the same register.

## Reduced-motion strategy

A reduced-motion strategy keeps the meaning and drops the movement.
It is not "turn everything off and hope." Under `prefers-reduced-motion: reduce`, transforms and parallax stop, but state changes still communicate: a fade can replace a slide, an instant swap can replace a morph, and anything that conveyed information through motion conveys it through position or appearance instead.
Wrap decorative motion in `@media (prefers-reduced-motion: no-preference)` so it is opt-in by construction, and test the reduced path as a real state, not an accident.
A page that becomes confusing or loses content when motion is reduced has failed both accessibility and the choreography, because the meaning was riding on the movement rather than on the design.
