---
name: delight
description: "Identify opportunities to add moments of joy, personality, and unexpected polish that transform functional interfaces into delightful experiences."
version: 1.7.1
---

> **Additional context needed**: what's appropriate for the domain (playful vs professional vs quirky vs elegant).

Identify opportunities to add moments of joy, personality, and unexpected polish that transform functional interfaces into delightful experiences.

---

## Register

Brand: delight can be distributed — copy voice, section transitions, discovery rewards, seasonal touches, personality across the whole surface.

Product: delight at specific moments, not pages. Completion, first-time actions, error recovery, milestone crossings. Reliability and consistency carry the rest of the experience; delight pushed everywhere reads as noise.

---

## Assess Delight Opportunities

Identify where delight would enhance (not distract from) the experience:

1. **Find natural delight moments**: success, empty, loading, achievement, interaction, error, easter egg. Rank them by how often the user actually lands there, and treat the rare ones as the expensive ones.

2. **Understand the context**:
   - What's the brand personality? (Playful? Professional? Quirky? Elegant?)
   - Who's the audience? (Tech-savvy? Creative? Corporate?)
   - What's the emotional context? (Accomplishment? Exploration? Frustration?)
   - What's appropriate? (Banking app ≠ gaming app)

3. **Define delight strategy**:
   - **Subtle sophistication**: Refined micro-interactions (luxury brands)
   - **Playful personality**: Whimsical illustrations and copy (consumer apps)
   - **Helpful surprises**: Anticipating needs before users ask (productivity tools)
   - **Sensory richness**: Satisfying sounds, smooth animations (creative tools)

If any of these are unclear from the codebase, STOP and call the clarifying-question tool to clarify.

**CRITICAL**: Delight should enhance usability, never obscure it. If users notice the delight more than accomplishing their goal, you've gone too far.

## Delight Principles

Follow these guidelines:

### Delight Amplifies, Never Blocks
- Delight moments should be quick (< 1 second)
- Never delay core functionality for delight
- Make delight skippable or subtle
- Respect user's time and task focus

### Surprise and Discovery
- Hide delightful details for users to discover
- Reward exploration and curiosity
- Don't announce every delight moment
- Let users share discoveries with others

### Appropriate to Context
- Match delight to emotional moment (celebrate success, empathize with errors)
- Respect the user's state (don't be playful during critical errors)
- Match brand personality and audience expectations
- Cultural sensitivity (what's delightful varies by culture)

### Compound Over Time
- Delight should remain fresh with repeated use
- Vary responses (not same animation every time)
- Reveal deeper layers with continued use
- Build anticipation through patterns

## Delight Techniques

Add personality and joy through these methods:

### Micro-interactions & Animation

**Button delight**: press translates down 2px over 100ms, hover lifts 2px over 200ms on `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-quart). The press is faster than the lift because a press is a confirmation and a hover is an invitation.

**Loading delight**:
- Playful loading animations (not just spinners)
- Personality in loading messages (write product-specific ones, not generic AI filler)
- Progress indication with encouraging messages
- Skeleton screens with subtle animations

**Success animations**:
- Checkmark draw animation
- Confetti burst for major achievements
- Gentle scale + fade for confirmation
- Satisfying sound effects (subtle)

**Hover surprises**:
- Icons that animate on hover
- Color shifts or glow effects
- Tooltip reveals with personality
- Cursor changes (custom cursors for branded experiences)

### Personality in Copy

The rewrite pattern is the same everywhere: keep the system message accurate, replace its register. `Error 404` becomes a line with a voice, `No projects` becomes an invitation, `Delete` stays `Delete` if the stakes are real.

**IMPORTANT**: Match copy personality to brand. Banks shouldn't be wacky, but they can be warm. Never buy voice with clarity: a destructive or irreversible action keeps its plain label.

### Illustrations & Visual Personality

Four states deserve a drawn asset rather than an icon, because they are the moments a page is otherwise empty: empty, error, loading, success. A commissioned set across those four does more for identity than decorating the states that already have content.

Background effects (particles, mesh gradients, geometric fields, time-of-day themes) are the highest-cost, lowest-return category here. They read as decoration on every project that did not earn them, and they compete with the content for the same attention the illustrations are trying to win.

### Satisfying Interactions

The rule for direct manipulation: the element acknowledges the grab, and the drop is reversible. Lift on drag, snap on release, and an undo affordance on anything that moved something the user cannot easily put back.

Toggles, checkboxes and focused inputs earn a short transition because they are state changes the user caused and needs confirmed. Auto-grow textareas and celebratory valid-input states are the two that most often overshoot into noise.

### Sound Design

**IMPORTANT**:
- Respect system sound settings
- Provide mute option
- Keep volumes quiet (subtle cues, not alarms)
- Don't play on every interaction (sound fatigue is real)

### Easter Eggs & Hidden Delights

A hidden delight has to survive being found. The test is whether it still reads as intentional the third time, which rules out the ones everyone already knows (the Konami code, the hiring message in the console) and favours the ones tied to this product: a reveal on the site's own mark, a joke in alt text that a screen reader user gets and a sighted user never sees.

Seasonal and time-of-day variation is the cheapest recurring delight, and the one most likely to age badly. Ship it only if someone owns turning it off.

### Loading & Waiting States

The waiting screen is the one surface where personality is free: the user is already stalled, so copy costs nothing. It is also where generated copy is most visible, because a rotating message list is read attentively by someone with nothing else to do.

```
Loading messages — write ones specific to your product, not generic AI filler:
- "Crunching your latest numbers..."
- "Syncing with your team's changes..."
- "Preparing your dashboard..."
- "Checking for updates since yesterday..."
```

**WARNING**: Avoid cliched loading messages like "Herding pixels", "Teaching robots to dance", "Consulting the magic 8-ball", "Counting backwards from infinity". These are AI-slop copy — instantly recognizable as machine-generated. Write messages that are specific to what your product actually does.

### Celebration Moments

Celebration scales with rarity, and the scale is the whole design. A first-time action, a tenth article, a year on the product: those carry confetti. A completed form carries a checkmark. Spend the biggest celebration on the thing that happens least, or the biggest one stops meaning anything.

Personalise with a fact the product actually knows ("your 10th article") rather than a generic superlative. The specific number is what makes the moment land.

## Implementation Patterns

**IMPORTANT**: File size matters. Compress images, optimize animations, lazy load delight features.

**NEVER**:
- Delay core functionality for delight
- Force users through delightful moments (make skippable)
- Use delight to hide poor UX
- Overdo it (less is more)
- Ignore accessibility (animate responsibly, provide alternatives)
- Make every interaction delightful (special moments should be special)
- Sacrifice performance for delight
- Be inappropriate for context (read the room)

## Decorative Loop Budget

- Infinite decorative loops (shimmer, beams, marquees, particle fields) are a condiment: one or two per view (L-MOTION-2). Beyond that they cancel each other and drain batteries.
- Confetti is event-triggered (a success, a submission) and ephemeral — never looping, never on page load.
- A pointer-following spotlight or orb must reset cleanly when the pointer leaves the window, on tab blur and on `visibilitychange`, or the halo freezes mid-card.

## Verify Delight Quality

Test that delight actually delights:

- **User reactions**: Do users smile? Share screenshots?
- **Doesn't annoy**: Still pleasant after 100th time?
- **Doesn't block**: Can users opt out or skip?
- **Performant**: No jank, no slowdown
- **Appropriate**: Matches brand and context
- **Accessible**: Works with reduced motion, screen readers

Remember: Delight is the difference between a tool and an experience. Add personality, surprise users positively, and create moments worth sharing. But always respect usability - delight should enhance, never obstruct.

Ready-made animated components with their guardrails: [component-recipes.md](component-recipes.md).

## Resource hooks

- Micro-interaction and confetti tooling: `python3 tools/design-system/scripts/search.py "confetti" --domain resources`
- Ready animations shipped with the plugin: `assets/animations/` (see [assets-library.md](assets-library.md))
