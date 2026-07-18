---
name: extract
description: "Identify reusable patterns, components, and design tokens, then extract and consolidate them into the design system for systematic reuse."
version: 1.9.0
---

# Extract Flow

Identify reusable patterns, components, and design tokens, then extract and consolidate them into the design system for systematic reuse.

## Step 1: Discover the Design System

Find the design system, component library, or shared UI directory. Understand its structure: component organization, naming conventions, design token structure, import/export conventions.

**CRITICAL**: If no design system exists, STOP and call the AskUserQuestion tool to clarify before creating one. Understand the preferred location and structure first.

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

Create a systematic plan:

- **Components to extract**: Which UI elements become reusable components?
- **Tokens to create**: Which hard-coded values become design tokens?
- **Variants to support**: What variations does each component need?
- **Naming conventions**: Component names, token names, prop names that match existing patterns
- **Migration path**: How to refactor existing uses to consume the new shared versions

**IMPORTANT**: Design systems grow incrementally. Extract what is clearly reusable now, not everything that might someday be reusable.

## Step 4: Extract & Enrich

Build improved, reusable versions:

- **Components**: Clear props API with sensible defaults, proper variants for different use cases, accessibility built in (ARIA, keyboard navigation, focus management), documentation and usage examples
- **Design tokens**: Clear naming (primitive vs semantic), proper hierarchy and organization, documentation of when to use each token
- **Patterns**: When to use this pattern, code examples, variations and combinations

## Step 5: Migrate

Replace existing uses with the new shared versions:

- **Find all instances**: Search for the patterns you extracted
- **Replace systematically**: Update each use to consume the shared version
- **Test thoroughly**: Ensure visual and functional parity
- **Delete dead code**: Remove the old implementations

## Step 6: Document

Update design system documentation:

- Add new components to the component library
- Document token usage and values
- Add examples and guidelines
- Update any Storybook or component catalog

**NEVER**:
- Extract one-off, context-specific implementations without generalization
- Create components so generic they are useless
- Extract without considering existing design system conventions
- Skip proper TypeScript types or prop documentation
- Create tokens for every single value (tokens should have semantic meaning)
- Extract things that differ in intent (two buttons that look similar but serve different purposes should stay separate)

Remember: A good design system is a living system. Extract patterns as they emerge, enrich them thoughtfully, and maintain them consistently.

## Design-system audit

Beyond pulling tokens and components, audit the system for the drift that accumulates as a codebase grows.

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
