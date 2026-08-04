---
name: onboard
description: "Create or improve onboarding experiences that help users understand, adopt, and succeed with the product quickly."
version: 1.6.1
---

> **Additional context needed**: the "aha moment" you want users to reach, and users' experience level.

Create or improve onboarding experiences that help users understand, adopt, and succeed with the product quickly.

## Assess Onboarding Needs

Understand what users need to learn and why:

1. **Identify the challenge**:
   - What are users trying to accomplish?
   - What's confusing or unclear about current experience?
   - Where do users get stuck or drop off?
   - What's the "aha moment" we want users to reach?

2. **Understand the users**:
   - What's their experience level? (Beginners, power users, mixed?)
   - What's their motivation? (Excited and exploring? Required by work?)
   - What's their time commitment? (5 minutes? 30 minutes?)
   - What alternatives do they know? (Coming from competitor? New to category?)

3. **Define success**:
   - What's the minimum users need to learn to be successful?
   - What's the key action we want them to take? (First project? First invite?)
   - How do we know onboarding worked? (Completion rate? Time to value?)

**CRITICAL**: Onboarding should get users to value as quickly as possible, not teach everything possible.

## Onboarding Principles

Follow these core principles:

### Show, Don't Tell
Onboarding runs on the real product, never in a parallel tutorial mode. A separate mode drifts from the product it teaches, and everything the user built in it is thrown away at the end.

### Make It Optional (When Possible)
Skipping is a first-class path, not an escape hatch. Experienced users are the ones most likely to convert and the ones most damaged by being held.

### Time to Value
- Get users to their "aha moment" ASAP
- Front-load most important concepts
- Teach 20% that delivers 80% of value
- Save advanced features for contextual discovery

### Context Over Ceremony
- Teach features when users need them, not upfront
- Empty states are onboarding opportunities
- Tooltips and hints at point of use

### Respect User Intelligence
- Don't patronize or over-explain
- Be concise and clear
- Assume users can figure out standard patterns

## Design Onboarding Experiences

Create appropriate onboarding for the context:

### Initial Product Onboarding

The four beats are welcome, setup, concept, first success. What decides whether they work:

- **An honest time estimate on the welcome screen**, and a skip that is as visible as the start. A time estimate that undershoots costs more trust than no estimate at all.
- **Ask for the minimum, and say why for each field.** Everything else is collected later, in context, when the user has a reason to care.
- **Introduce 1 to 3 core concepts, never the full model.** More than three and none of them are retained.
- **The first success has to be real work, not a simulation.** Pre-populate an example so the action succeeds, but let the artifact it produces survive onboarding.

### Feature Discovery & Adoption

**Empty States**: the single largest onboarding surface most products leave blank. Anatomy and the five types are below, under Empty State Design.

**Contextual Tooltips**:
- Appear at relevant moment (first time user sees feature)
- Point directly at relevant UI element
- Brief explanation + benefit
- Dismissable (with "Don't show again" option)
- Optional "Learn more" link

**Feature Announcements**:
- Highlight new features when they're released
- Show what's new and why it matters
- Let users try immediately
- Dismissable

**Progressive Onboarding**:
- Teach features when users encounter them
- Badges or indicators on new/unused features
- Unlock complexity gradually (don't show all options immediately)

### Guided Tours & Walkthroughs

A tour earns its cost on complex interfaces, after a significant redesign, and in domain tools where the vocabulary itself has to be taught. Outside those three, contextual tooltips do the same job for less.

- **3 to 7 steps maximum per tour.** Beyond seven nobody finishes, and the steps after the seventh are the ones that were not worth a tour.
- **Steps name a workflow, not a control.** "Create a project", not "This is the project button". A tour that labels the UI teaches nothing the UI was not already saying.
- **Interactive over passive**, on real controls with real sample data, so the tour and the product cannot drift apart.
- Free navigation, a visible "Skip tour", and replayable from the help menu.

### Interactive Tutorials

Reach for a sandbox when the concepts are unfamiliar or the real thing is high-stakes enough that practising on it is expensive. A tutorial needs a stated objective ("Create a chart showing sales by region"), validation that the user actually did it, and a graduation moment. Without validation it is a tour with extra steps.

### Documentation & Help

In-product help beats a help centre for anything a user hits mid-task: a `?` next to the complex control, "Learn more" inside the tooltip, the shortcut hint printed on the search box. Reserve the searchable centre and the video for what cannot be answered in place.

## Empty State Design

Every empty state answers four things: what will appear here, why that matters, how to start, and where to get help. Add an illustration so the state reads as designed rather than broken. An empty state that only says "No projects" is the one place a product tells a new user nothing, at the exact moment they have nothing else to read.

**Empty state types**:
- **First use**: Never used this feature (emphasize value, provide template)
- **User cleared**: Intentionally deleted everything (light touch, easy to recreate)
- **No results**: Search or filter returned nothing (suggest different query, clear filters)
- **No permissions**: Can't access (explain why, how to get access)
- **Error state**: Failed to load (explain what happened, retry option)

## Implementation Patterns

Track seen-state per step, not per flow, so adding a step later does not re-trigger the whole tour for existing users. Instrument drop-off per step: the step users quit on is the one that failed, and it is the only measurement that tells you which one.

**IMPORTANT**: Don't show same onboarding twice (annoying). Track completion and respect dismissals.

**NEVER**:
- Force users through long onboarding before they can use product
- Patronize users with obvious explanations
- Show same tooltip repeatedly (respect dismissals)
- Block all UI during tour (let users explore)
- Create separate tutorial mode disconnected from real product
- Overwhelm with information upfront (progressive disclosure!)
- Hide "Skip" or make it hard to find
- Forget about returning users (don't show initial onboarding again)

## Verify Onboarding Quality

Test with real users:

- **Time to completion**: Can users complete onboarding quickly?
- **Comprehension**: Do users understand after completing?
- **Action**: Do users take desired next step?
- **Skip rate**: Are too many users skipping? (Maybe it's too long or not valuable)
- **Completion rate**: Are users completing? (If low, simplify)
- **Time to value**: How long until users get first value?

Remember: You're a product educator with excellent teaching instincts. Get users to their "aha moment" as quickly as possible. Teach the essential, make it contextual, respect user time and intelligence.
