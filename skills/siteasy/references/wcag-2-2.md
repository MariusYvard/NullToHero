---
name: wcag-2-2
description: "The Web Content Accessibility Guidelines 2.2 (W3C Recommendation, October 2023) adds nine success criteria to WCAG 2.1, targeting cognitive disabilities, motor impairments, and touch interaction."
version: 1.10.1
---

# WCAG 2.2 Compliance Reference

The Web Content Accessibility Guidelines 2.2 (W3C Recommendation, October 2023) adds nine success criteria to WCAG 2.1, targeting cognitive disabilities, motor impairments, and low-vision mobile users. This reference is the operational checklist for every shipped interface. Pair with [accessibility-engineering.md](accessibility-engineering.md), [parallax.md](parallax.md), and [form-patterns.md](form-patterns.md).

Ship to AA across the board. Reach AAA only where the structural cost is acceptable, which in practice means 2.4.12 and 2.4.13 on a focus system you already control, and rarely the rest.

## New Criteria in WCAG 2.2

| Criterion | Level | Principle | What it requires |
|---|---|---|---|
| 2.4.11 Focus Not Obscured (Minimum) | AA | Operable | Focus indicator at least partially visible, never fully hidden by other content |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Operable | Focus indicator fully visible at all times |
| 2.4.13 Focus Appearance | AAA | Operable | Focus indicator meets minimum size and contrast specifications |
| 2.5.7 Dragging Movements | AA | Operable | Any drag operation has a single-pointer alternative (tap, click) |
| 2.5.8 Target Size (Minimum) | AA | Operable | Interactive targets are at least 24 by 24 CSS pixels, with documented exceptions |
| 3.2.6 Consistent Help | A | Understandable | Help mechanisms appear in the same relative order across pages |
| 3.3.7 Redundant Entry | A | Understandable | Information previously entered is auto-filled or selectable |
| 3.3.8 Accessible Authentication (Minimum) | AA | Understandable | Logins do not require cognitive function tests without an alternative |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | Understandable | Logins do not rely on recognition of objects or non-text content |

## 2.4.11 Focus Not Obscured

Sticky headers, cookie banners, chat widgets, and floating CTAs are the primary offenders. When focus moves to an element behind one of these, the user navigating by keyboard sees nothing.

The failure is silent: `.sticky-header { position: sticky; top: 0 }` plus a Tab into the top of an article, and the focus ring sits behind the header with nothing on screen to say where focus went.

Fix with `scroll-padding`:

```css
:root { --header-height: 64px; }

html { scroll-padding-top: var(--header-height); }
.sticky-header { position: sticky; top: 0; height: var(--header-height); }
```

Or use `scroll-margin` on focusable elements:

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  scroll-margin-top: calc(var(--header-height) + 8px);
  scroll-margin-bottom: 8px;
}
```

Test: tab through the page from top to bottom and from bottom to top. Every focused element must be at least partially visible without manual scrolling.

## 2.5.7 Dragging Movements

Drag-and-drop reorderers, sliders that require dragging, and map panning fail this criterion unless they offer a single-pointer alternative.

Acceptable alternatives:
- Click to select source, click to select destination
- Up and down buttons next to draggable list items
- Numeric input next to a slider
- Zoom in/out buttons next to a pannable map

The alternative has to be visible and reachable, not a hidden keyboard shortcut. Per-item up and down buttons with individual labels ("Move Task A up") are the cheapest compliant pattern for a reorderable list.

## 2.5.8 Target Size

Every interactive target must be at least 24 by 24 CSS pixels, OR have at least 24 pixels of clearance from adjacent targets.

Documented exceptions:
- Inline text links inside a paragraph (the link inherits the line height)
- Native browser controls (default radio buttons, native scrollbars)
- Targets whose size is essential to the function (a tiny color picker swatch is its own purpose)
- Equivalent alternative is provided in the same context

Default target size for buttons, links in nav, icon buttons:

```css
:where(button, .btn, [role="button"], a.nav-link) {
  min-block-size: 24px;
  min-inline-size: 24px;
}

/* Touch-friendly default goes further: 44px */
@media (pointer: coarse) {
  :where(button, .btn, [role="button"], a.nav-link) {
    min-block-size: 44px;
    min-inline-size: 44px;
  }
}
```

Icon buttons need invisible padding:

```css
.icon-btn {
  padding: 6px; /* extends hit area to 24x24 even when icon is 12x12 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### Where 24px sits among platform standards

24x24 CSS px is the legal floor, not the comfort target. A fingertip's contact patch is 16-20mm wide; the platform guidelines all aim higher:

| Standard | Minimum | Physical equivalent |
|---|---|---|
| WCAG 2.5.8 (AA) | 24x24 CSS px | 48px physical at 2x, 72px at 3x displays |
| WCAG 2.5.5 (AAA) | 44x44 CSS px | The accessibility comfort baseline |
| Apple HIG | 44x44 pt | iOS design floor |
| Android / Material | 48x48 dp | About 9x9 mm |
| Microsoft | 7 mm, 2 mm gaps | Hardware-agnostic physical sizing |

Per-control comfort targets, with the visual size decoupled from the hit area:

| Control | Floor | Comfortable | Placement note |
|---|---|---|---|
| Primary action (CTA) | 44px | 48px or more, full width on mobile | 16px side margins from screen edges |
| Form field | 44px height | 48px height | At least 12px vertical gap between stacked fields |
| Icon button | 24px | 44px | Extend with padding, keep the glyph small |
| Modal close (the X) | 24px | 32-44px | Keep clear of underlying links to avoid mis-taps |

Adjacent targets need an 8px gap minimum so a thumb cannot bridge two controls in one press.

## 3.2.6 Consistent Help

If help is offered (contact, FAQ, chat, support email), the same set of mechanisms must appear in the same relative order across every page where they appear.

Implementation: place help affordances in a fixed location (footer block, dedicated header link). Do not vary the order between pages.

Audit: list the help mechanisms on three pages picked at random. They should match in presence and ordering.

## 3.3.7 Redundant Entry

Information already provided in the same session or process must not be requested again, unless re-entry is essential (security re-confirmation, validation step).

Implementation patterns:
- Multi-step forms preserve prior values across steps.
- "Same as shipping" toggle for billing.
- Auto-fill name and email at checkout when the user is logged in.
- Browser autofill attributes on form fields.

See [form-patterns.md](form-patterns.md) for the full autocomplete vocabulary.

## 3.3.8 Accessible Authentication

Logins cannot require a cognitive function test (memorize this password, solve this puzzle, identify objects in images) without offering an alternative.

Compliant alternatives:
- Password manager support (do not block paste into password fields)
- Email or SMS magic links
- Biometric authentication (WebAuthn, passkeys)
- OAuth via a trusted provider
- Show password toggle

Anti-patterns that fail this criterion:
- CAPTCHA based on image recognition or text transcription, without an audio or accessibility alternative
- Disabled paste on password fields
- Password complexity rules that exceed what a manager can handle
- Two-factor flows that require copying a code under a 30-second timer

A compliant login is unremarkable: `autocomplete="email"` and `autocomplete="current-password"` so managers fill it, no `onpaste` handler anywhere near the password field, and a `Show password` toggle carrying `aria-pressed`. The failure is almost always something the team added on purpose.

## Carry-Forward Criteria from WCAG 2.1

2.2 is a superset, so an audit that checks only the nine new criteria has checked a tenth of the standard. Contrast (1.4.3, 1.4.11) is measured in [color-and-contrast.md](color-and-contrast.md), keyboard and focus (2.1.1, 2.4.7, 4.1.2) in [accessibility-engineering.md](accessibility-engineering.md), errors (3.3.1, 3.3.3) in [form-patterns.md](form-patterns.md).

The four that teams skip because no automated tool flags them:

- **1.4.10 Reflow.** 320px wide, no horizontal scroll. Data tables and fixed-width hero art are where it breaks.
- **1.4.12 Text Spacing.** The user overrides line-height and letter-spacing; nothing may clip or overlap. Fixed-height buttons and single-line truncation fail here.
- **2.1.4 Character Key Shortcuts.** A single-letter shortcut must be disableable or remappable, otherwise voice-control users trigger it by speaking.
- **2.5.3 Label in Name.** The accessible name starts with the visible text. `aria-label="Submit"` on a button reading "Send" breaks every voice command aimed at it.

## Audit Checklist

Per shipped page, every release:

| Check | Method | Tool |
|---|---|---|
| Color contrast text | Manual sampling at hero, body, meta | Stark, Polypane, axe DevTools |
| Color contrast UI | Sample borders, focus rings, icons | Stark |
| Keyboard navigation | Tab through page top to bottom | Manual |
| Focus visible everywhere | Tab through page, screenshot | Manual |
| Focus not obscured (2.4.11) | Tab near sticky elements | Manual |
| Target size 24x24 (2.5.8) | Measure interactive elements | Browser inspector |
| Drag alternatives (2.5.7) | List drag interactions, verify alt | Manual |
| Consistent help (3.2.6) | Inventory across 3 pages | Manual |
| Redundant entry (3.3.7) | Walk multi-step flows | Manual |
| Accessible auth (3.3.8) | Test login with password manager | Manual |
| Screen reader | NVDA on Windows, VoiceOver on macOS, TalkBack on Android | Manual |
| Reflow at 320px | Resize window | Polypane, browser devtools |
| Reduced motion | Toggle OS setting, verify behavior | Manual |

Automated coverage is partial, and the measured figures are in [accessibility-engineering.md](accessibility-engineering.md) with their source. Whichever number you use, the rows above marked Manual are the ones no scanner reaches. Do not ship on a green axe scan alone.

## Accessible vs Inclusive vs Universal

| Concept | Definition | Process |
|---|---|---|
| Accessible | Adapted for people with disabilities | Compliance against standards |
| Inclusive | Designed with diversity from the start | Co-design, representative recruitment |
| Universal | One design works for all users without adaptation | Design constraints, single artifact |

Accessibility is the floor. Inclusive design is the process. Universal design is the aspiration.

## Cross-References

- ARIA patterns and screen reader behavior: [accessibility-engineering.md](accessibility-engineering.md)
- Color contrast measurement: [color-and-contrast.md](color-and-contrast.md)
- Form-specific WCAG (autocomplete, labels): [form-patterns.md](form-patterns.md)
- WCAG 2.2.2 (Pause, Stop, Hide) for motion: [parallax.md](parallax.md)
- Keyboard interaction patterns: [interaction-design.md](interaction-design.md)
