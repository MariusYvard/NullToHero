---
name: mobile-ios-validation
description: "Three-layer mobile validation: deterministic desktop proxies, Mobile Safari in Xcode Simulator, and physical iOS evidence without false Safari claims."
version: 1.0.0
---

# Mobile and iOS Validation

A narrow viewport is not an iPhone. Playwright WebKit is not Safari running on iOS. A simulator is not physical hardware. Keep those statements true in every command, report and release decision.

This reference owns the evidence model for mobile validation. Use it with [mobile-ergonomics.md](mobile-ergonomics.md), [responsive-design.md](responsive-design.md), [testing-strategy.md](testing-strategy.md), [preview.md](preview.md) and [ship-checklist.md](ship-checklist.md).

## Evidence layers

| Layer | Runtime | What it can establish | What it cannot establish |
|---|---|---|---|
| `desktop-proxy` | Playwright desktop Chromium and desktop WebKit with mobile-sized contexts | Repeatable layout, interaction, theme, reduced-motion, orientation and failure-path checks | Mobile Safari, iOS browser chrome, real safe areas, Dynamic Island, iOS keyboard, system gestures, mobile GPU or an installed PWA |
| `ios-simulator` | Mobile Safari in a named Xcode Simulator device and iOS runtime | Safari layout and fonts, dynamic browser chrome, simulated safe areas, rotation, keyboard and VisualViewport behavior | Physical touch conflicts, real sensor housing, hardware GPU, memory, thermal behavior or complete production installation behavior |
| `physical-ios` | Safari and standalone web app on a named iPhone or iPad | Real safe areas, Dynamic Island clearance, system gestures, keyboard/autofill, hardware GPU and installed-PWA lifecycle | Nothing below may be inferred from a different device without saying so |

Run layer 1 on every material interface change. Run layer 2 for an iOS-facing release candidate. Run layer 3 whenever the experience depends on keyboard-critical flows, edge gestures, WebGL, physical safe areas or installation to the Home Screen.

## Layer 1: deterministic desktop proxies

Run the bundled validator from the project being tested:

```bash
npm install --no-save --package-lock=false playwright@1.63.0
npx playwright install chromium webkit
node "${NTH_ROOT}/skills/siteasy/scripts/mobile-validate.mjs" <url-or-file> \
  --engines chromium,webkit \
  --require-engines \
  --json mobile-validation.json \
  --artifacts mobile-validation-artifacts
```

The default profiles are:

- `portrait`: 390 x 844;
- `landscape`: 844 x 390;
- `reduced-motion`: 390 x 844 with `prefers-reduced-motion: reduce`;
- `keyboard-height-proxy`: 390 x 500 with the first form control focused.

The validator records viewport metadata, overflow, control geometry, page and console errors, VisualViewport availability, reduced-motion preference, safe-area wiring, manifest structure, WebGL API availability and screenshots. It emits seven `manual-required` rows even when every automated check passes.

### Report semantics

- `pass` and `fail`: directly measured structural facts, such as viewport metadata or a fetched manifest.
- `proxy-pass` and `proxy-fail`: behavior observed in a desktop engine under mobile emulation.
- `manual-required`: a simulator or physical-device scenario that remains open.
- `unavailable`: a requested engine could not launch.
- `error`: the runner could not produce valid evidence.

A `proxy-pass` must never be rewritten as `pass`. `manual-required` does not fail a desktop-only CI job, but it keeps `summary.iosValidated` false.

### Naming contract

Use these runtime names:

- `desktop-chromium-mobile-emulation`;
- `desktop-webkit-mobile-emulation`.

Never call either runtime Safari, Mobile Safari, iOS, iPhone testing or a simulator. An iPhone-shaped viewport, touch events, DPR, user-agent spoofing and a Playwright device descriptor do not change the runtime.

## Layer 2: Xcode Simulator

Record the exact simulated device, iOS runtime and Safari context. Use at least:

- a current Dynamic Island iPhone profile;
- a small iPhone profile when the supported audience includes narrow screens;
- an iPad profile when tablet is in scope;
- portrait and landscape.

### Safari chrome and dynamic viewport

1. Load the page with browser bars expanded and capture the first frame.
2. Scroll until the bars retract, stop, then capture again.
3. Scroll back until the bars expand and capture again.
4. Repeat in landscape.
5. Verify full-bleed surfaces do not expose a background band and controls never move under the browser UI.
6. For pinned or scroll-driven sequences, verify the active step before and after each viewport change.

`100vh`, `100svh` and `100dvh` solve different problems. A desktop browser where they are equal cannot close this check.

### Simulated safe areas and Dynamic Island profile

1. Require `viewport-fit=cover` before judging `env(safe-area-inset-*)` behavior.
2. Check all four edges in portrait and both landscape directions.
3. Inspect fixed headers, bottom bars, dialogs, full-bleed media and scroll controls.
4. Record the simulator device profile in the evidence.

Dynamic Island is not exposed to a web page as a JavaScript detection API. Validate clearance through safe-area behavior and screenshots. Simulator evidence is still simulated, not a claim about a physical cutout.

### iOS keyboard and VisualViewport

For every keyboard-critical field:

1. Focus the field and record `visualViewport.width`, `height`, `offsetTop`, `offsetLeft` and `scale`.
2. Verify the focused control, its label, validation message and primary action remain reachable.
3. Switch between text, email, telephone, decimal and OTP keyboards where applicable.
4. Dismiss the keyboard and verify layout restoration.
5. Rotate with the keyboard open and repeat after rotation.
6. Exercise Back and Forward so entered data and focus do not disappear.

A scripted 500px desktop viewport is only a geometry proxy. It is never an iOS keyboard pass.

## Layer 3: physical iPhone and iPad

### Real safe areas and Dynamic Island clearance

Capture portrait and both landscape directions on named hardware. Verify every fixed or full-bleed surface against the real sensor housing and home indicator. Non-zero `env()` values observed in desktop emulation are not a substitute.

### System edge gestures

Exercise these from the physical screen edge:

- left-edge Back and the corresponding Forward path;
- bottom home gesture over bottom navigation, drawers and form actions;
- pull-to-refresh over custom vertical interactions;
- horizontal carousels, drawers and scrubbers close to the left or right edge.

The browser history must remain correct and entered data must survive. Every custom gesture keeps a visible control alternative.

### Keyboard, autofill and authentication

Test the real software keyboard, password manager fill, SMS one-time-code fill, paste, dismissal and rotation. Verify that Safari does not zoom unexpectedly on focus and that fixed actions do not hide under the keyboard or home indicator.

### Mobile GPU, WebGL and media

A desktop or simulated GPU can verify fallback logic, not phone performance. On a physical mid-range iPhone:

- record sustained frame pacing, not a one-second peak;
- cap DPR and verify the cap from the renderer;
- background and foreground the page;
- trigger or simulate WebGL context loss and verify restoration or a static fallback;
- exercise memory pressure with the actual production assets;
- repeat in Low Power Mode when autoplay, video or continuous rendering matters;
- watch for thermal degradation during a long scene;
- confirm reduced motion reaches a complete static state.

Do not publish a mobile GPU conclusion from Simulator or Playwright.

### Installed PWA

Browser Safari and the installed web app are separate test contexts. Manifest inspection proves structure only.

On physical iOS:

1. Add the site to the Home Screen.
2. Cold-launch it from the icon and verify standalone display mode.
3. Check safe areas, status-bar treatment and orientation.
4. Complete the primary journey online.
5. Relaunch offline and exercise the documented offline boundary.
6. Interrupt the network during navigation or submission and recover.
7. Deploy an update, relaunch and verify the service-worker update path.
8. Verify saved form state, authentication and navigation after process termination.
9. Record browser and standalone results as different evidence rows.

## Evidence record

Store one row per scenario and context:

```json
{
  "layer": "desktop-proxy|ios-simulator|physical-ios",
  "runtime": "playwright-webkit|mobile-safari|standalone-pwa",
  "device": "desktop|iPhone 15 Pro simulator|iPhone 15 Pro",
  "osVersion": "not-applicable|iOS 18.x",
  "orientation": "portrait|landscape",
  "scenario": "keyboard-open",
  "result": "pass|fail|not-tested",
  "artifacts": ["screenshot-or-recording"]
}
```

For simulator and physical evidence, a PASS requires a named device, OS version, context and attached screenshot or recording. An omitted higher layer is `not-tested`, never PASS.

## Release gates

| Feature in scope | Minimum evidence |
|---|---|
| Ordinary responsive page | Layer 1, with limitations reported |
| Safari dynamic chrome and `dvh`/`svh` | Layer 1 plus layer 2 |
| Keyboard-critical form, autofill or OTP | Layer 1 plus layer 2, then layer 3 before release |
| Dynamic Island or real safe-area claim | Layer 3 |
| Custom edge gesture | Layer 3 |
| WebGL performance or thermal claim | Layer 3 |
| Installable iOS PWA | Layer 1 structural checks plus layer 3 browser and standalone runs |

If a required layer cannot run, report the scenario as `not-tested` and block only the release claim or feature that depends on it. Do not block an ordinary responsive page merely because a PWA or WebGL scenario is irrelevant.

## Remote-device fallback

When no local Mac or device is available, a real-device cloud can supply evidence if it identifies the physical device, OS, browser, session and artifacts. BrowserStack, LambdaTest and Sauce Labs are possible providers. Provider emulators remain simulator evidence; only sessions explicitly documented as real devices qualify as `physical-ios`.

## Official references

- Playwright emulation: https://playwright.dev/docs/emulation
- Playwright browser engines: https://playwright.dev/docs/browsers
- Apple simulated and physical devices: https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices
- Apple web apps on iPhone and iPad: https://developer.apple.com/videos/play/wwdc2023/10120/
- WebKit safe-area design: https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- WebKit Responsive Design Mode: https://webkit.org/blog/14670/simplified-responsive-design-mode/
- MDN `env()`: https://developer.mozilla.org/en-US/docs/Web/CSS/env
- MDN Visual Viewport: https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
