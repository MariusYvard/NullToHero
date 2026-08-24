---
name: extract
description: "Identify reusable patterns, components, and design tokens, then extract and consolidate them into the design system for systematic reuse."
version: 1.9.1
---

# Extract Flow

Identify reusable patterns, components, and design tokens, then extract and consolidate them into the design system for systematic reuse.

## Step 1: Discover the Design System

Find the design system, component library, or shared UI directory. Understand its structure: component organization, naming conventions, design token structure, import/export conventions.

**CRITICAL**: If no design system exists, STOP and call the clarifying-question tool to clarify before creating one. Understand the preferred location and structure first.

## Step 2: Identify Patterns

Look for extraction opportunities in the target area:

- **Repeated components**: Similar UI patterns used 3+ times (buttons, cards, inputs)
- **Hard-coded values**: Colors, spacing, typography, shadows that should be tokens
- **Inconsistent variations**: Multiple implementations of the same concept
- **Composition patterns**: Layout or interaction patterns that repeat (form rows, toolbar groups, empty states)
- **Type styles**: Repeated font-size + weight + line-height combinations
- **Animation patterns**: Repeated easing, duration, or keyframe combinations

Assess value: only extract things used 3+ times with the same intent. Premature abstraction is worse than duplication.

## Step 3: Plan Extraction

Decide, before writing anything: which elements become components, which hard-coded values become tokens, which variants each component owes, what the names are (matching the project's existing conventions, not your preferred ones), and how existing call sites migrate.

**IMPORTANT**: Design systems grow incrementally. Extract what is clearly reusable now, not everything that might someday be reusable.

## Step 4: Extract & Enrich

Build improved, reusable versions. The extracted component is not a copy of the best of the three call sites: it owes a props API with sensible defaults, the variants the three sites actually differed on, and accessibility built in (ARIA, keyboard navigation, focus management) even where the originals lacked it. Tokens get primitive-versus-semantic naming and a stated rule for when to use each. Patterns get the "when to use this" that a code sample cannot carry.

## Step 5: Migrate

Extraction is not done until the old implementations are deleted. Find every instance, replace it with the shared version, verify visual and functional parity, then remove the originals. A shared component sitting beside the three copies it was meant to replace has made the codebase worse, not better.

## Step 6: Document

Add the new components to the library, document token values and their usage rule, and update Storybook or whatever catalog the project keeps. An undocumented shared component is re-implemented by the next person who needs it.

**NEVER**:
- Extract one-off, context-specific implementations without generalization
- Create components so generic they are useless
- Extract without considering existing design system conventions
- Skip proper TypeScript types or prop documentation
- Create tokens for every single value (tokens should have semantic meaning)
- Extract things that differ in intent (two buttons that look similar but serve different purposes should stay separate)

Remember: A good design system is a living system. Extract patterns as they emerge, enrich them thoughtfully, and maintain them consistently.

## Design-system audit

Beyond pulling tokens and components, audit the system for the drift that accumulates as a codebase grows. The token-layer audit doctrine itself lives in [design-tokens.md](design-tokens.md); `/nth-siteasy tokens` runs that pass in depth.

### Naming consistency

- One name per concept: not primary, brand and main for the same color.
- Tokens follow one scheme (role-based like --surface, or scale-based like --blue-500), not a mix.
- Component and variant names match between the design and the code.

### Hardcoded values

- Count the raw hex, px and one-off shadows that bypass a token. Each is a future inconsistency.
- Flag any color or spacing used more than once with no token; that is a token waiting to exist.

### Component completeness

Score each component against the states it owes: default, hover, focus-visible, active, disabled, loading, empty, error.

| Component | States covered | Variants | Documented | Verdict |
|---|---|---|---|---|
| Button | 6 / 8 | 3 | partial | needs work |

A component missing its error or empty state will be reinvented inconsistently the first time someone needs it.

For the developer-facing handoff spec (layout, tokens, props, states, breakpoints, motion, accessibility), follow [handoff.md](handoff.md).
