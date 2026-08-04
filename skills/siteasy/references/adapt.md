---
name: adapt
description: "Adapt existing designs to work effectively across different contexts - different screen sizes, devices, platforms, or use cases."
version: 1.10.1
---

> **Additional context needed**: target platforms/devices and usage contexts.

Adapt existing designs to work effectively across different contexts - different screen sizes, devices, platforms, or use cases.


---

## Assess Adaptation Challenge

Understand what needs adaptation and why:

1. **Identify the source context**: what it was built for, which assumptions came with it
   (large screen, mouse input, fast connection), and what currently works well. Adaptation
   should never be paid for with something that already worked.

2. **Understand target context**:
   - **Device**: Mobile, tablet, desktop, TV, watch, print?
   - **Input method**: Touch, mouse, keyboard, voice, gamepad?
   - **Screen constraints**: Size, resolution, orientation?
   - **Connection**: Fast wifi, slow 3G, offline?
   - **Usage context**: On-the-go vs desk, quick glance vs focused reading?
   - **User expectations**: What do users expect on this platform?

3. **Identify adaptation challenges**:
   - What won't fit? (Content, navigation, features)
   - What won't work? (Hover states on touch, tiny touch targets)
   - What's inappropriate? (Desktop patterns on mobile, mobile patterns on desktop)

**CRITICAL**: Adaptation is not just scaling - it's rethinking the experience for the new context.

## Plan Adaptation Strategy

Create context-appropriate strategy. The mechanics of each target (grid and flex reflow,
container queries, fluid sizing, responsive images, content-driven breakpoints) belong to
[responsive-design.md](responsive-design.md) and [image-strategy.md](image-strategy.md).
What follows is what changes about the *experience* on each target.

### Mobile Adaptation (Desktop → Mobile)

**Layout Strategy**:
- Single column, vertical stacking, full-width components instead of fixed widths
- Reorder before resizing: decide what is promoted above the fold and what moves into tabs
  or accordions. Stacking a desktop layout in source order is not an adaptation.
- Bottom navigation instead of top/side navigation

**Interaction Strategy**:
- Move the primary action into reach: bottom sheets instead of dropdowns, submit within the
  thumb arc. Target sizes, spacing and thumb zones are specified in
  [mobile-ergonomics.md](mobile-ergonomics.md).
- Swipe gestures where appropriate (lists, carousels), never hover-dependent behaviour
- Gesture affordances: every swipe or pinch interaction shows a visual hint (a peeking card edge, pagination dots) and keeps a visible button alternative

**Content Strategy**:
- Progressive disclosure (don't show everything at once)
- Prioritize primary content (secondary content in tabs/accordions)
- Shorter text, not truncated text: truncation hides the decision the reader came for

**Navigation Strategy**:
- Hamburger menu or bottom navigation, with reduced navigation complexity
- Sticky headers for context, and a back button that follows the real flow
- On rotation, reposition primary controls so they stay within thumb reach (video players, dashboards)

### Tablet Adaptation (Hybrid Approach)

- Assume touch and pointer at the same time, and size for touch: a pointer never suffers
  from a target that is too large, while a finger fails on one that is too small.
- Two-column layouts, side panels, master-detail views. Not a stretched phone layout and
  not a shrunk desktop one.
- The orientation flip is the real design case here, not the width: portrait and landscape
  are two layouts, and both ship.

### Desktop Adaptation (Mobile → Desktop)

- Use the horizontal space: multiple panels at once, persistent side navigation, data
  tables with many columns, richer visualizations, less progressive disclosure.
- **Constrain the maximum.** Fixed widths with max-width constraints, so a 4K monitor does
  not stretch a line of body copy to 200 characters.
- Hover, keyboard shortcuts, right-click menus, drag and drop and multi-select are additive
  affordances, never the only route to a feature, because plenty of desktop devices are
  also touch devices.

### Print Adaptation (Screen → Print)

The stylesheet work (ink reset, exposed link URLs, page breaks, hidden chrome) is in
[print-styles.md](print-styles.md). The decisions that stylesheet cannot make for you:

- Expand what the screen collapsed or truncated; a printed accordion is a blank space
- Add page numbers, headers, footers and metadata (print date, page title)
- Convert interactive charts to a static print-friendly version
- Proper margins for binding

### Email Adaptation (Web → Email)

- 600px maximum width, single column, inline CSS, table-based layout. Email clients are a
  decade behind the browser and this is not a stylistic choice.
- Large, obvious CTAs as buttons, not text links. No hover states, they are not reliable.
- Deep link into the web app for anything interactive instead of rebuilding it in the message.

**IMPORTANT**: Test on real devices, not just browser DevTools. Device emulation is helpful but not perfect.

**NEVER**:
- Hide core functionality on mobile (if it matters, make it work)
- Assume desktop = powerful device (consider accessibility, older machines)
- Use different information architecture across contexts (confusing)
- Break user expectations for platform (mobile users expect mobile patterns)
- Forget landscape orientation on mobile/tablet
- Use generic breakpoints blindly (use content-driven breakpoints)
- Ignore touch on desktop (many desktop devices have touch)

## Verify Adaptations

Test on real phones, tablets and desktops in both orientations, across browser engines and
operating systems, with every input method the target supports. Then push the extremes:
320px, 4K, and a throttled connection. Emulation misses sun glare, regrips and fat fingers.

Remember: You're a cross-platform design expert. Make experiences that feel native to each context while maintaining brand and functionality consistency. Adapt intentionally, test thoroughly.

## Print

Print and PDF output is an adaptation target like any viewport: [print-styles.md](print-styles.md).
