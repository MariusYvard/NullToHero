---
name: assets-library
description: "The bundled assets/ library: icons, patterns, illustrations, animations and templates, and how to use them during a build."
version: 1.22.0
---

# Assets library

The repository ships a `assets/` folder of original, license-clean visual assets. During a build, reach for these first, before an external CDN, a stock site or a gray placeholder. Everything is CC0 (icons, patterns, illustrations, animations) or MIT (templates), self-contained, and safe to copy into any project.

Reference an asset by its path from the project root, or inline the SVG so it inherits the surrounding color.

## Icons (139)

Line icons on a 24 by 24 grid drawn with `currentColor`, so they take the text color. Inline the SVG, or use `<img src="assets/icons/NAME.svg" width="24" height="24" alt="...">`.

Available: activity, alert-triangle, align-center, align-left, align-right, arrow-down, arrow-left, arrow-right, arrow-up, at-sign, award, bar-chart, battery, bell, bluetooth, bold, book, bookmark, briefcase, calendar, camera, check, check-circle, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, clipboard, clock, cloud, cloud-off, code, columns, command, compass, copy, cpu, credit-card, database, dollar-sign, download, edit, external-link, eye, file, filter, flag, folder, gift, git-branch, globe, grid, hard-drive, hash, headphones, heart, help-circle, home, image, info, italic, key, layout, life-buoy, link, list, lock, log-in, log-out, mail, map, map-pin, maximize, menu, message-circle, message-square, mic, mic-off, minimize, minus, moon, more-horizontal, more-vertical, move, music, navigation, package, paperclip, pause, percent, phone, phone-call, pie-chart, play, plus, printer, refresh-cw, rotate-ccw, save, search, send, server, settings, share, shield, shopping-cart, sidebar, skip-back, skip-forward, sliders, smile, star, stop, sun, tag, terminal, thumbs-down, thumbs-up, toggle-left, toggle-right, trash, trending-down, trending-up, truck, type, upload, user, users, video, volume, volume-x, wifi, x, x-circle, zap.

## Patterns (20)

Tileable SVG backgrounds. Set a `color` on the element to tint them, then `background-image: url("assets/patterns/NAME.svg")` with `background-repeat: repeat`.

Available: bricks, chevrons, circles, cross-hatch, diagonal-lines, diamonds, dots, grid, hexagons, plus-signs, polka-large, scales, squares, stars, stripes-horizontal, stripes-vertical, triangles, waves, wavy, zigzag.

## Illustrations (18)

Flat spot illustrations on a 400 by 300 canvas for empty, error and success states.

Available: celebration, coming-soon, empty-state, error, feedback, location, maintenance, message-sent, no-data, not-found-404, notification, offline, payment, search-empty, secure-login, success, team, welcome.

## Animations (34)

Self-contained loaders and micro-animations. The CSS ones honor `prefers-reduced-motion`. Open a `.html` file to preview, or copy its `<style>` and markup; use the `.svg` ones inline or in an `<img>`.

Available: bars-equalizer.html, bell-shake.html, bouncing-ball.html, checkbox-tick.svg, circular-progress.svg, clock-spinner.svg, dots.html, dual-ring.svg, ellipsis.html, error-cross.svg, fade-in-up.html, gradient-ring.svg, heart-beat.html, like-burst.html, orbit.html, pop-in.html, progress-bar.html, pulse-circle.html, pulse-dot.html, ripple.html, scroll-hint.html, skeleton-avatar.html, skeleton-list.html, skeleton-shimmer.html, skeleton-table.html, skeleton-text.html, spinner.svg, square-flip.html, step-progress.html, success-check.svg, toggle-switch.html, typing-indicator.html, warning-pulse.html, wave-hand.svg.

## Templates (6)

Starting points you adapt, not drop in verbatim. HTML and CSS pages plus React components.

Available: contact, dashboard, landing, pricing, react-card, react-modal.

## During a build

When the design calls for an icon, a section background, a spot illustration, a loader or a page skeleton, pick from the lists above and wire the real asset in. Tint icons and patterns with `color`. Keep the illustration palette close to the brand. Prefer a bundled loader over a spinner built from scratch. If nothing here fits, say so and fall back, rather than forcing a poor match.
