---
name: polish
description: "Perform a meticulous final pass to catch all the small details that separate good work from great work. The difference between shipped and polished."
version: 1.6.1
---

> **Additional context needed**: quality bar (MVP vs flagship).

Perform a meticulous final pass to catch all the small details that separate good work from great work. The difference between shipped and polished.

## Design System Discovery

Aligning the feature to the design system is **not optional**. Polish without alignment is decoration on top of drift, and it makes the next person's job harder. Discovery comes before any other polish work.

1. **Read the project's own conventions**: Search the root and `docs/` for a charter or style guide (STYLEGUIDE, STYLE, CONVENTIONS, CONTRIBUTING, BRAND, DESIGN, `.editorconfig`), then read the CSS custom properties already defined, the class naming convention visible in the code (BEM, utility classes, CSS modules), and the fonts already loaded and used. These are binding.
2. **Find the design system**: Search for design system documentation, component libraries, style guides, or token definitions. Study the core patterns: design principles, target audience, color tokens, spacing scale, typography styles, component API, motion conventions.
3. **Note the conventions**: How are shared components imported? What spacing scale is used? Which colors come from tokens vs hard-coded values? What motion and interaction patterns are established? What flow shapes are used for comparable actions (modal vs full-page, inline vs route, save-on-blur vs explicit submit)?
4. **Identify drift, then name the root cause**: For every deviation, classify it as a **missing token** (the value should exist in the system but doesn't), a **one-off implementation** (a shared component already exists but wasn't used), or a **conceptual misalignment** (the feature's flow, IA, or hierarchy doesn't match neighboring features). The fix differs by category: patch the value, swap to the shared component, or rework the flow. Fixing the symptom without naming the cause is how drift compounds.

If a design system exists, polish **must** align the feature with it. If none exists, polish against the conventions visible in the codebase. **If anything about the system is ambiguous, ask, never guess at design system principles.**

Project conventions are binding and outrank every generic recommendation in this reference. When a recommendation here contradicts the project's charter, the charter wins: report the conflict to the user instead of settling it silently. Never rename an existing token, never add a web font to a project that uses none, and never add motion to a project that has none, without asking first.

## Pre-Polish Assessment

Understand the current state and goals before touching anything:

1. **Review completeness**:
   - Is it functionally complete?
   - Are there known issues to preserve (mark with TODOs)?
   - What's the quality bar? (MVP vs flagship feature?)
   - When does it ship? (How much time for polish?)

2. **Think experience-first**: Who actually uses this, and what's the best possible experience for them? Effective design beats decorative polish: a feature that looks beautiful but fights the user's flow is not polished. Walk the path from their perspective before opening DevTools.

3. **Identify polish areas**:
   - Visual inconsistencies
   - Spacing and alignment issues
   - Interaction state gaps
   - Copy inconsistencies
   - Edge cases and error states
   - Loading and transition smoothness
   - Information architecture and flow drift (does this feature reveal complexity the way neighboring features do?)

4. **Triage cosmetic vs functional**: Classify each issue as **cosmetic** (looks off, doesn't impede the user) or **functional** (breaks, blocks, or confuses the experience). When polish time is tight, functional issues ship first; cosmetic ones can land in a follow-up. Quality should be consistent, never perfect one corner while leaving another rough.

**CRITICAL**: Polish is the last step, not the first. Don't polish work that's not functionally complete.

## Polish Systematically

Work through these dimensions methodically:

### Visual Alignment & Spacing

- **Pixel-perfect alignment**: Everything lines up to grid
- **Consistent spacing**: All gaps use spacing scale (no random 13px gaps)
- **Optical alignment**: Adjust for visual weight (icons may need offset for optical centering)
- **Responsive consistency**: Spacing and alignment work at all breakpoints
- **Grid adherence**: Elements snap to baseline grid

**Check**: enable a grid overlay, measure gaps in the inspector at several viewport sizes, and chase anything that "feels" off until you can name the number behind it.

### Information Architecture & Flow

Visual polish on a misshapen flow is wasted work. Match the *shape* of the experience to the system, not just the surface.

- **Progressive disclosure**: Match how much is revealed when, compared to neighboring features. A settings page exposing 40 fields when the rest of the app reveals 5 at a time is drift, even if every field is perfectly styled.
- **Established user flows**: Multi-step actions follow the same shape as comparable flows elsewhere: modal vs full-page, inline edit vs separate route, save-on-blur vs explicit submit, optimistic vs pessimistic updates.
- **Hierarchy & complexity**: The same conceptual weight gets the same visual weight throughout. Primary actions don't become tertiary in one corner of the product, and tertiary actions don't shout.
- **Empty, loading, and arrival transitions**: How content arrives, updates, and leaves matches how it does in adjacent features.
- **Naming and mental model**: The feature uses the same nouns and verbs as the rest of the system. A "Workspace" here shouldn't be a "Project" three screens away.

### Typography Refinement

- **Hierarchy consistency**: Same elements use same sizes/weights throughout, and measure stays inside L-TYPE-2
- **Widows & orphans**: No single words on last line
- **Kerning**: Adjust letter spacing where needed, especially on headlines, where the default tracking of a display size is always too loose
- **Font loading**: No FOUT/FOIT flashes

### Color & Contrast

- **Consistent token usage**: No hard-coded colors, all use design tokens, and the same color means the same thing throughout
- **Contrast ratios**: All text and focus indicators meet L-CONTRAST-1, in every theme variant
- **Tinted neutrals**: No pure gray or pure black, add subtle color tint (0.01 chroma)
- **Gray on color**: Never put gray text on colored backgrounds, use a shade of that color or transparency

### Interaction States

Every interactive element needs all states:

- **Default**: Resting state
- **Hover**: Subtle feedback (color, scale, shadow)
- **Focus**: Keyboard focus indicator (never remove without replacement)
- **Active**: Click/tap feedback
- **Disabled**: Clearly non-interactive
- **Loading**: Async action feedback
- **Error**: Validation or error state
- **Success**: Successful completion

**Missing states create confusion and broken experiences**.

### Micro-interactions & Transitions

- **Smooth transitions**: All state changes animated within L-MOTION-1
- **Consistent easing**: Use ease-out-quart/quint/expo for natural deceleration. Never bounce or elastic, they feel dated.
- **No jank**: Smooth animations; use atmospheric blur/filter/mask/shadow effects when they add polish, but bound expensive paint areas and avoid casual layout-property animation
- **Appropriate motion**: Motion serves purpose, not decoration
- **Reduced motion**: Respects `prefers-reduced-motion`

### Content & Copy

- **Consistent terminology**: Same things called same names throughout
- **Consistent capitalization**: Title Case vs Sentence case applied consistently
- **Grammar & spelling**: No typos
- **Appropriate length**: Not too wordy, not too terse
- **Punctuation consistency**: Periods on sentences, not on labels (unless all labels have them)

### Icons & Images

- **Consistent style and sizing**: All icons from one family, sized for context, optically aligned to adjacent text rather than box-aligned
- **Alt text**: All images have descriptive alt text
- **No shift, no blur**: Reserved aspect ratios so images don't move the layout, 2x assets for high-DPI screens

### Forms & Inputs

Pattern doctrine lives in [form-patterns.md](form-patterns.md); the final pass verifies the consistency questions only.

- **Labels and required indicators**: Every input labeled, required marked the same way everywhere
- **Validation timing**: Consistent across the form (on blur vs on submit), never a mix
- **Keyboard**: Tab order follows visual order; auto-focus used sparingly, never on a page the user may have scrolled

### Edge Cases & Error States

Final-pass verification only; the doctrine and the fixes live in [harden.md](harden.md).

- **Loading states**: All async actions have loading feedback
- **Empty states**: Helpful empty states, not just blank space
- **Error states**: Clear error messages with recovery paths
- **Success states**: Confirmation of successful actions
- **Long content**: Handles very long names, descriptions, etc.
- **No content**: Handles missing data gracefully
- **Offline**: Appropriate offline handling (if applicable)

### Responsiveness

- **All breakpoints**: Test mobile, tablet, desktop; content reflows logically and never scrolls horizontally
- **Touch targets**: Meet L-TOUCH-1 on touch devices
- **Readable text**: No text smaller than 14px on mobile

### Performance

Final-pass verification only; the doctrine and the fixes live in [optimize.md](optimize.md).

- **Fast initial load**: Optimize critical path
- **No layout shift**: Elements don't jump after load (L-PERF-2)
- **Smooth interactions**: No lag or jank
- **Optimized images**: Appropriate formats and sizes, off-screen content lazy-loaded

### Code Quality

- **Remove the debris**: No console logs, commented-out code, or unused imports left behind
- **Consistent naming**: Variables and functions follow conventions
- **Type safety and semantics**: No TypeScript `any` or ignored errors; proper ARIA labels and semantic HTML

## Polish Checklist

Go through systematically:

- [ ] Aligned to the design system (drift named and resolved by root cause)
- [ ] Information architecture and flow shape match neighboring features
- [ ] Visual alignment perfect at all breakpoints
- [ ] Spacing uses design tokens consistently
- [ ] Typography hierarchy consistent
- [ ] All interactive states implemented
- [ ] All transitions smooth (60fps)
- [ ] Copy is consistent and polished
- [ ] Icons are consistent and properly sized
- [ ] All forms properly labeled and validated
- [ ] Error states are helpful
- [ ] Loading states are clear
- [ ] Empty states are welcoming
- [ ] Touch targets meet L-TOUCH-1
- [ ] Contrast ratios meet L-CONTRAST-1
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] No console errors or warnings
- [ ] No layout shift on load
- [ ] Works in all supported browsers
- [ ] Respects reduced motion preference
- [ ] Code is clean (no TODOs, console.logs, commented code)

**IMPORTANT**: Polish is about details. Zoom in. Squint at it. Use it yourself. The little things add up.

**NEVER**:
- Polish before it's functionally complete
- Polish without aligning to the design system, that's decoration on drift
- Guess at design system principles instead of asking when something is ambiguous
- Spend hours on polish if it ships in 30 minutes (triage)
- Introduce bugs while polishing (test thoroughly)
- Ignore systematic issues (if spacing is off everywhere, fix the system, not just one screen)
- Perfect one thing while leaving others rough (consistent quality level)
- Create new one-off components when design system equivalents exist
- Hard-code values that should use design tokens
- Introduce new patterns or flows that diverge from established ones

## Final Verification

Before marking as done, use the feature yourself on a real device, not just in DevTools, and walk every state rather than the happy path. Compare the result against the intended design, and get a second pair of eyes: fresh ones catch what you have stopped seeing.

## Clean Up

After polishing, close the loop on what the pass introduced: swap any custom implementation back to its design system equivalent, delete styles, components and files the polish made obsolete, promote new one-off values to tokens if they deserve to be tokens, and consolidate duplication the pass created.

Remember: You have impeccable attention to detail and exquisite taste. Polish until it feels effortless, looks intentional, and works flawlessly. Sweat the details, they matter.
