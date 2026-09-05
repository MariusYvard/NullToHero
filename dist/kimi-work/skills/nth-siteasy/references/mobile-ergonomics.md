---
name: mobile-ergonomics
description: "Phone-specific UI/UX: thumb-zone placement, touch-target sizing, mobile navigation, virtual keyboards, perceived performance on cellular networks, and a mobile audit protocol."
version: 1.10.0
---

# Mobile Ergonomics

A phone is not a small desktop. It is held in one hand, tapped with a 16-20mm fingertip, read at arm's length in sunlight, and fed by a fluctuating cellular connection. This reference is the phone-specific playbook: where controls belong, how big they must be, which navigation survives one-handed use, and how to audit all of it. Pair with [information-architecture.md](information-architecture.md), [wcag-2-2.md](wcag-2-2.md), [form-patterns.md](form-patterns.md), [responsive-design.md](responsive-design.md), and [adapt.md](adapt.md).

## The Thumb Rules the Screen

In Steven Hoober's field observations, 49 percent of users operate the phone one-handed with the thumb doing everything, 36 percent cradle it and tap with a finger, and 15 percent type with both thumbs. The design consequences:

| Screen region | Reachability | Put there |
|---|---|---|
| Bottom half, center | Natural thumb arc | Primary actions, main navigation, submit |
| Bottom corners | Easy | Tab bar destinations, FAB |
| Center | Comfortable for cradled grips | Content, cards, lists |
| Top corners | Stretch zone (regrip required) | Low-frequency controls: settings, drawer trigger, close |

Two placement corollaries:

- **Primary actions live at the bottom.** A submit button under the keyboard's home position beats one stranded at the top of a long form.
- **Destructive actions stay out of the easy zone.** "Delete" adjacent to the thumb's resting arc collects accidental taps; demand a deliberate reach or a confirmation with undo (see [interaction-design.md](interaction-design.md)).

## Touch Targets, Condensed

Full standards table and per-control sizes: [wcag-2-2.md](wcag-2-2.md) section 2.5.8. The operating summary:

- 24x24 CSS px is the WCAG AA legal floor; 44-48px is the comfort baseline (Apple 44pt, Android 48dp).
- Decouple visual size from hit area: pad small glyphs invisibly until the receptive zone reaches target size.
- Keep at least 8px between adjacent targets (12px between stacked form fields) so one press cannot bridge two controls.
- Verify with a real thumb on a real device, not a mouse in DevTools.

## Navigation That Survives One Hand

Pattern selection, the Priority+ hybrid, the 80-20 drawer rule, the three-level depth ceiling, and safe back behavior are specified in [information-architecture.md](information-architecture.md) ("Mobile navigation"). The phone-side constraints to enforce:

- A visible bottom bar with 3-5 destinations beats a hamburger for anything used daily; hiding core navigation halves its discovery.
- The drawer, when kept, holds only the under-20-percent options and opens from a conventional top corner.
- Back (hardware, gesture, or browser) follows real history, preserves entered data, and never teleports to the homepage.
- In-app browsers disorient; open core journeys in the user's real browser or keep them native.

## Gestures Need an Escape Hatch

Swipe, pinch, and long-press are fast for experts, invisible to everyone else, and unavailable to many motor-impaired users.

- Every gesture shows a visual affordance: a card edge peeking past the screen border, pagination dots, a grab handle.
- Every gesture has a visible control equivalent (arrows, buttons, menu entry). WCAG 2.5.7 makes dragging alternatives a legal requirement, not a courtesy.
- On rotation, primary controls reposition to stay within thumb reach — video players and dashboards are the usual offenders.

## The Keyboard Is the Friction

Typing on glass is the highest-friction input there is. Minimize it:

- Map every field to the right virtual keyboard: the `type` x `inputmode` x `autocomplete` table lives in [form-patterns.md](form-patterns.md). A postal-code field that raises the full QWERTY keyboard is a self-inflicted wound.
- Single column, labels above fields, nothing optional before the transaction completes — the full form discipline is in [form-patterns.md](form-patterns.md).
- Replace typing with the device: geolocation for address prefill, the camera for QR and card scanning, the microphone for search, OAuth and passkeys instead of passwords, `autocomplete="one-time-code"` so SMS codes fill themselves.

## Cellular Performance Is Ergonomics

More than half of mobile visits abandon when a page takes over 3 seconds to render. On a fluctuating connection, perceived speed is a design deliverable:

- Loading-state choreography (nothing under 300ms, skeleton to 2s, spinner plus message beyond) is specified in [animation-engineering.md](animation-engineering.md).
- Image discipline: AVIF/WebP, `srcset`, lazy-loading below the fold, explicit `width`/`height` to prevent layout shift — see [image-strategy.md](image-strategy.md) and [responsive-design.md](responsive-design.md).
- Degraded-network strategy: ship critical text first, hold media behind lightweight placeholders, queue user actions locally and sync later.
- Respect the system's dark preference (`prefers-color-scheme`) for low-light comfort — implementation in [dark-mode-engineering.md](dark-mode-engineering.md).

## Mobile Audit Protocol

Run this as a five-step loop, not a one-off:

1. **Scope one journey.** Pick a single critical path (onboarding, checkout). Whole-app audits dilute into noise.
2. **Collect the numbers.** Mobile bounce rate, per-screen load time, form-funnel drop-off, tap heatmaps. Numbers point to where; they never say why.
3. **Heuristic pass.** Score every screen of the journey against the checklist below plus the relevant WCAG criteria.
4. **Watch real users in motion.** Five participants on their own devices, ideally standing or walking, surface what desk-based review cannot: sun glare, regrips, fat-finger errors.
5. **Prioritize by severity x effort.** Classify findings Critical (blocks the task), High (severe friction), Medium (slows the flow), Low (polish); order the roadmap by impact over effort.

### Mobile audit checklist

| # | Check | Method |
|---|---|---|
| 1 | Value proposition understood in under 5 seconds above the fold | First-impression test on device |
| 2 | No decorative banners creating false floors | Scroll-depth analysis |
| 3 | Primary navigation visible, stable, within thumb reach | Heuristic review |
| 4 | Hierarchy at most three levels deep | Tree testing or click-path analysis |
| 5 | Interactive targets at least 24px, comfort at 44-48px | DevTools or Accessibility Scanner |
| 6 | 8px or more between adjacent targets | CSS review, Lighthouse |
| 7 | Forms single-column with permanent labels | Visual inspection plus a real entry run |
| 8 | `type`/`inputmode`/`autocomplete` raise the right keyboards | Field-by-field focus test on device |
| 9 | Skeletons for 300ms-2s waits, spinner plus message beyond | Session recording of loading states |
| 10 | Images modern-format, sized, lazy-loaded | PageSpeed Insights |
| 11 | Pinch-zoom never disabled (`user-scalable` intact) | Viewport meta inspection |
| 12 | Text and active-element contrast at 4.5:1 or better | Contrast checker |

## Anti-Patterns

- A "view desktop site" link as the fix for missing mobile content. Parity, not escape hatches.
- Core actions only reachable in the top corners. The thumb pays for it on every use.
- Gesture-only interactions with no visible alternative. Invisible and exclusionary.
- `type="number"` for codes and IDs; spinner controls plus paste problems. Use `inputmode`.
- A spinner as the sole feedback for every wait, including instant ones.
- Disabling zoom to "protect the layout". It fails WCAG and the layout was already broken.
- Touch targets that pass on the designer's flagship and fail on a 360px budget phone.

## Cross-References

- Mobile navigation patterns and Priority+: [information-architecture.md](information-architecture.md)
- Target-size standards and per-control sizes: [wcag-2-2.md](wcag-2-2.md)
- Form discipline, keyboards, passwordless auth: [form-patterns.md](form-patterns.md)
- Loading-state choreography: [animation-engineering.md](animation-engineering.md)
- Mobile-first strategy and content parity: [responsive-design.md](responsive-design.md)
- Cross-device adaptation workflow: [adapt.md](adapt.md)
- Image weight and formats: [image-strategy.md](image-strategy.md)
- Dark mode implementation: [dark-mode-engineering.md](dark-mode-engineering.md)
