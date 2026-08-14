---
name: video
description: "Guaranteed-play decorative video: classify video as decorative or interactive, transcode decorative loops to a canvas-decodable asset (WASM decoder), emit a drop-in component that plays everywhere, including iOS Low Power Mode."
version: 1.0.0
---

# Guaranteed-Play Video

A decorative or hero video must animate on every device. Native `<video autoplay>`
is blocked at the system level in iOS Low Power Mode, in data-saver modes and under
strict autoplay policies, even with `muted playsinline poster` all present. The
guaranteed path renders the video on a `<canvas>` through a userland WASM decoder:
the browser never treats it as a media element, so no autoplay gate applies and the
loop plays regardless. This is the default for decorative video. The tooling lives
in [../scripts/video-guardplay.mjs](../scripts/video-guardplay.mjs).

## Scope (honest, read first)

This targets DECORATIVE video: muted, looping, no controls, meant to just play —
exactly what gets blocked and exactly what canvas decoding guarantees. It does NOT
convert INTERACTIVE video (sound, controls, seeking, captions, content the visitor
actually watches): unmuted autoplay is blocked everywhere by policy, a canvas plus
WebAudio path still needs a gesture for sound, and native `<video>` is better for
watched content (hardware decode, controls, accessibility). Interactive video stays
native; a tap to start is normal and expected. The audit flags it, never converts it.

## Classify

Scan every `<video>` (and CSS background video):

- decorative-autoplay — `autoplay` + `muted` + no `controls` (loop expected): candidate for guaranteed-play.
- broken-decorative — `autoplay` without `muted` or `playsinline`: blocked or blank on mobile before any policy even applies; fix the attributes or convert.
- interactive — `controls`, sound, or user-initiated: keep native, audit against the quality rules below.

`node skills/siteasy/scripts/video-guardplay.mjs audit <url|file>` prints the
classification; the deterministic `video-embed-hygiene` check carries the same
counts in SITE-AUDIT.json.

## Transcode (offline, ffmpeg)

- Default — MPEG1 in MPEG-TS for JSMpeg: best decode reliability and mobile headroom (720p at 30fps decodes on an iPhone 5S), tiny decoder (~20-40 KB gzipped). `video-guardplay.mjs generate <in> --codec mpeg1`.
- Option — VP9/WebM for ogv.js: roughly half the file size, heavier decode; for large clips where weight beats CPU.
- Option — stylized pixel-canvas (ASCILINE-style) when the site wants that aesthetic rather than faithful video.

Always: downscale to display size, keep the loop short, no audio track, target well
under the media budget (L-MEDIA-1; a stylized hero belongs under ~1 MB).

## The emitted component

- A `<canvas>` sized to its container (object-fit cover behavior), the decoder cached once, init that loops, muted by construction, playing immediately with no gesture.
- Poster shown until the first decoded frame; the poster is the LCP image, so the video never is.
- IntersectionObserver pauses decoding offscreen (CPU and battery).
- `prefers-reduced-motion`: the poster stays, nothing animates (and ideally the clip is not fetched).
- Explicit dimensions or `aspect-ratio` on the container: zero CLS.

## Fallback chain (degrades, never breaks)

1. WASM available (all modern browsers) — canvas decoder, plays always. Primary.
2. No WASM (very old device) — native `<video muted playsinline autoplay loop poster>`, a `play()` rejection handler revealing a tap-to-play control.
3. Reduced motion, or decode failure — the static poster.

## Honest tradeoffs

- Software decode costs CPU and battery vs native hardware decode. Fine for short, low-resolution decorative loops; heavier for large or high-resolution clips (AV1 in userland is too slow on phones). Offscreen pause mitigates; test on a real device in Low Power Mode.
- The decoder bundle is a one-time cached cost (~20-40 KB for JSMpeg).
- Sound cannot autoplay anywhere; guaranteed-play is muted-only by definition.

## Quality rules for the native path (interactive and fallback video)

These feed the classifier and remain the safety net: poster always (rule 53), modern
format with fallback sources (rule 65), lazy-load below the fold (rule 66), weight
within L-MEDIA-1, reduced-motion handling (rules 21/47/63), and for watched content
VideoObject JSON-LD plus a video sitemap entry (rule 67; see
[../../seo/references/schema.md](../../seo/references/schema.md) and
[../../seo/references/sitemap.md](../../seo/references/sitemap.md)).

## Cross-References

- Scroll-scrubbed video (a different technique, same budgets): [parallax.md](parallax.md)
- Media budgets: L-MEDIA-1 in `tools/data/laws.csv`
- Signature restraint: [signature-moments.md](signature-moments.md)
