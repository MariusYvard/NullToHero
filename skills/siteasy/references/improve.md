---
name: improve
description: "Single door for 'make it better' requests. Deterministic symptom-to-axis dispatch: reads the complaint, picks exactly one improvement axis (amplify, simplify, animate, typeset, layout, adapt, mobile, clarify, delight, onboard, charts, overdrive, video, parallax, live, polish, harden), loads that reference and runs it. Never invents its own fixes."
version: 1.0.1
---

# Improve: symptom-to-axis dispatch

The door for every "make it better" request where the user has not named an
axis. This reference owns no improvement doctrine of its own. It classifies the
complaint, picks one axis command, loads that command's reference and follows
it. If the user already named an axis command, skip this file and run that
command directly.

## How to dispatch

1. Read the project's own conventions first (see Rules below for what they
   outrank): any charter or style guide at the root or in `docs/` (STYLEGUIDE,
   STYLE, CONVENTIONS, CONTRIBUTING, BRAND, DESIGN, `.editorconfig`), the CSS
   custom properties already defined, the class naming convention visible in
   the code (BEM, utility classes, CSS modules), and the fonts already loaded.
2. Read the complaint and the target (file, folder or URL). If `DESIGN.md` or
   `DIRECTION.md` exists, read them too: the axis must move toward the
   committed direction, not toward taste.
3. Match the complaint against the symptom table below. Take the FIRST row that
   matches. One pass, one axis.
4. Load the axis command's reference file(s) from the Commands table in
   `SKILL.md` and execute exactly as written there.
5. After the pass, offer the single most likely next axis (one line, no menu).

## Symptom table

First match wins. Symptoms are what users say, not what the code says.

| # | The user says something like | Axis to run |
|---|------------------------------|-------------|
| 1 | "broken on my phone", "looks wrong on mobile", "overlaps on small screens" | `adapt` |
| 2 | "hard to tap", "buttons too small", "keyboard covers the field" | `mobile` |
| 3 | "bland", "safe", "boring", "not premium", "no presence", "forgettable" | `amplify` |
| 4 | "busy", "noisy", "cluttered", "too much going on", "cheap" | `simplify` |
| 5 | "text feels off", "fonts look wrong", "hard to read the headings" | `typeset` |
| 6 | "cramped", "uneven", "misaligned", "spacing feels random" | `layout` |
| 7 | "static", "lifeless", "nothing moves", "feels dead" | `animate` |
| 8 | "confusing copy", "labels unclear", "error messages are rude or vague" | `clarify` |
| 9 | "new users are lost", "empty at first run", "nobody finds the feature" | `onboard` |
| 10 | "charts unreadable", "graphs confusing", "data is a wall" | `charts` |
| 11 | "feels flat to use", "no feedback", "no personality when I interact" | `delight` |
| 12 | "wow effect", "like an award site", "3D", "page transitions" | `overdrive` |
| 13 | "background video will not play", "video kills the page", "iOS pauses it" | `video` |
| 14 | "scroll story", "depth", "layers that move at different speeds" | `parallax` |
| 15 | "let me try variants live", "tweak it while it runs" | `live` |
| 16 | "slow", "breaks with long text", "errors look raw", "not translated" | `harden` |
| 17 | "final once-over", "last pass", "anything embarrassing before I send it" | `polish` |

## When more than one row matches

- Two rows: run the one with the lower row number (structure before surface),
  then offer the second as the next pass.
- Three or more rows, or the complaint is "everything is wrong": stop
  dispatching. That is not an improvement pass, it is a rework. Route to
  [journey-overhaul.md](journey-overhaul.md) so the baseline audit picks the
  batches instead of guesswork.
- No row matches and the complaint is about correctness (broken links, errors,
  contrast, accessibility): route to `/audit checks`
  ([../../audit/references/checks.md](../../audit/references/checks.md)), then
  [fix.md](fix.md).

## Rules

- One axis per pass. Do not blend amplify and simplify in the same pass; they
  pull in opposite directions and the result is mush.
- The axis reference is law. This file never overrides what the axis reference
  prescribes.
- The conventions read in step 1 outrank both this file and the axis reference.
  When an axis reference recommends what the project's charter forbids, the
  charter wins: report the conflict instead of settling it silently. Never
  rename an existing token, never add a web font to a project that uses none,
  and never add motion to a project that has none, without asking first.
- Improvement is not remediation. If a deterministic audit already produced
  findings, [fix.md](fix.md) owns the work: it batches by remediation route.
- Respect the shared design laws in `SKILL.md` throughout, including the
  absolute bans.
- After the pass, if the target has never been audited, offer `/audit checks`
  once. Do not force it.

## Cross-References

- Full rework pipeline: [journey-overhaul.md](journey-overhaul.md)
- Execute audit findings: [fix.md](fix.md)
- Finish and publish: [journey-ship.md](journey-ship.md)
- Evaluate before improving: [critique.md](critique.md), [audit.md](audit.md)
