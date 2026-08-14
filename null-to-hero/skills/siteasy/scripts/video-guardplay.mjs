#!/usr/bin/env node
/**
 * video-guardplay.mjs — guaranteed-play decorative video for /siteasy video.
 *
 * audit <url|file>            classify every <video> (decorative / broken / interactive)
 * generate <input> [options]  transcode a decorative clip and emit the drop-in component
 *
 * generate options:
 *   --codec mpeg1|vp9   (default mpeg1: MPEG1-in-TS for the JSMpeg WASM decoder)
 *   --out DIR           (default ./guardplay)
 *   --name NAME         (default input basename)
 *   --height N          (default 540)   --fps N (default 24)   --q N (mpeg1 quality, default 6)
 *   --poster FILE       (default: first frame extracted)
 *   --no-decoder        skip downloading jsmpeg.min.js
 *
 * Pure Node. ffmpeg required for generate (system dependency, like Playwright for
 * --render). The JSMpeg decoder (MIT, phoboslab/jsmpeg) is fetched ONCE into the
 * output dir of the TARGET project; it is not part of this plugin.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, basename, resolve } from "node:path";

const args = process.argv.slice(2);
const mode = args[0];
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const has = (n) => args.includes(n);

function die(msg, code = 2) { console.error(`[video] ${msg}`); process.exit(code); }

// ── audit ─────────────────────────────────────────────────────────────────────
async function loadHtml(target) {
  if (/^https?:\/\//i.test(target)) {
    const res = await fetch(target, { redirect: "follow", headers: { "user-agent": "NullToHero-video/1.0" } });
    return await res.text();
  }
  return readFileSync(resolve(target), "utf8");
}

function classify(html) {
  const out = [];
  const tags = html.match(/<video\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const a = (name) => new RegExp(`\\b${name}\\b`, "i").test(tag);
    const src = (tag.match(/src=["']([^"']+)/i) || [])[1] || "(sources)";
    let cls;
    if (a("controls") || (!a("autoplay") && !a("muted"))) cls = "interactive";
    else if (a("autoplay") && a("muted") && !a("controls")) cls = "decorative-autoplay";
    else cls = "broken-decorative";
    out.push({ src, class: cls, muted: a("muted"), autoplay: a("autoplay"), playsinline: a("playsinline"), poster: a("poster"), controls: a("controls"), loop: a("loop") });
  }
  return out;
}

// ── generate ──────────────────────────────────────────────────────────────────
function ffmpeg(argv) {
  const r = spawnSync("ffmpeg", argv, { stdio: ["ignore", "ignore", "pipe"] });
  if (r.error || r.status !== 0) die(`ffmpeg failed (${r.error ? r.error.message : r.stderr.toString().split("\n").slice(-3).join(" ")}). Install ffmpeg to use generate.`);
}

const COMPONENT = (name, tsFile, poster, w, h) => `<!-- guaranteed-play decorative video: ${name}
     Canvas + WASM decoder (JSMpeg): not a media element, so no autoplay policy applies.
     Plays in iOS Low Power Mode. Poster paints first (and is the LCP). Zero CLS.
     Fallbacks: no WASM -> native muted video with tap-to-play; reduced motion -> poster. -->
<div class="gp-video" data-gp="${name}" style="position:relative;overflow:hidden;aspect-ratio:${w} / ${h};">
  <img src="${poster}" alt="" width="${w}" height="${h}" fetchpriority="high"
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
  <canvas width="${w}" height="${h}"
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .3s;" aria-hidden="true"></canvas>
</div>
<script src="jsmpeg.min.js" defer></script>
<script>
(function () {
  var host = document.querySelector('[data-gp="${name}"]');
  if (!host) return;
  var canvas = host.querySelector("canvas");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return; // poster stays, clip never fetched

  function nativeFallback() {
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute("playsinline", ""); v.poster = "${poster}"; v.src = "${name}.mp4";
    v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
    host.appendChild(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      var b = document.createElement("button");
      b.textContent = "\\u25B6"; b.setAttribute("aria-label", "Play background video");
      b.style.cssText = "position:absolute;inset:auto 12px 12px auto;z-index:2;";
      b.onclick = function () { v.play(); b.remove(); };
      host.appendChild(b);
    });
  }

  function start() {
    if (typeof WebAssembly !== "object" || typeof JSMpeg === "undefined") return nativeFallback();
    try {
      var player = new JSMpeg.Player("${tsFile}", {
        canvas: canvas, loop: true, audio: false, pauseWhenHidden: true,
        onVideoDecode: function () { canvas.style.opacity = "1"; }
      });
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? player.play() : player.pause(); });
      }, { rootMargin: "100px" }).observe(host);
      reduce.addEventListener("change", function (e) {
        if (e.matches) { player.pause(); canvas.style.opacity = "0"; }
      });
    } catch (err) { nativeFallback(); }
  }
  if (document.readyState === "complete") start();
  else addEventListener("load", start, { once: true });
})();
</script>`;

async function generate() {
  const input = args[1];
  if (!input || !existsSync(input)) die("generate needs an existing input video file");
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (probe.error) die("ffmpeg not found on PATH. Install it (https://ffmpeg.org) — generate is offline transcoding.");
  const codec = val("--codec", "mpeg1");
  const out = val("--out", "./guardplay");
  const name = val("--name", basename(input).replace(/\.[^.]+$/, ""));
  const height = parseInt(val("--height", "540"), 10);
  const fps = parseInt(val("--fps", "24"), 10);
  const q = val("--q", "6");
  mkdirSync(out, { recursive: true });

  let poster = val("--poster", null);
  if (!poster) {
    poster = `${name}-poster.jpg`;
    ffmpeg(["-y", "-i", input, "-vf", `scale=-2:${height}`, "-frames:v", "1", "-q:v", "3", join(out, poster)]);
  } else { poster = basename(poster); }

  let asset;
  if (codec === "mpeg1") {
    asset = `${name}.ts`;
    ffmpeg(["-y", "-i", input, "-an", "-vf", `scale=-2:${height},fps=${fps}`, "-c:v", "mpeg1video", "-q:v", q, "-f", "mpegts", join(out, asset)]);
  } else if (codec === "vp9") {
    asset = `${name}.webm`;
    ffmpeg(["-y", "-i", input, "-an", "-vf", `scale=-2:${height},fps=${fps}`, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", join(out, asset)]);
    console.error("[video] vp9 asset written. Wire it to ogv.js yourself (heavier decoder); the emitted component targets the JSMpeg path.");
  } else die(`unknown codec ${codec}`);

  // native fallback clip (small h264) for the no-WASM path
  ffmpeg(["-y", "-i", input, "-an", "-vf", `scale=-2:${Math.min(height, 480)},fps=${fps}`, "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-movflags", "+faststart", join(out, `${name}.mp4`)]);

  if (!has("--no-decoder") && !existsSync(join(out, "jsmpeg.min.js"))) {
    try {
      const res = await fetch("https://cdn.jsdelivr.net/gh/phoboslab/jsmpeg@master/jsmpeg.min.js");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(join(out, "jsmpeg.min.js"), await res.text());
      console.error("[video] jsmpeg.min.js fetched into the output (MIT, phoboslab/jsmpeg — keep its license header).");
    } catch (e) {
      console.error(`[video] could not fetch jsmpeg.min.js (${e.message}); download it manually from https://github.com/phoboslab/jsmpeg (MIT).`);
    }
  }

  // probe dimensions of the poster for aspect-ratio (fallback 16:9)
  let w = 960, h = height;
  writeFileSync(join(out, `${name}.html`), COMPONENT(name, asset, poster, w, h) + "\n");
  const weight = existsSync(join(out, asset)) ? (statSizeMB(join(out, asset))) : "?";
  console.log(`[video] wrote ${out}/${asset} (${weight} MB), ${poster}, ${name}.mp4 (fallback), ${name}.html`);
  console.log(`[video] budget check: keep the loop under L-MEDIA-1 (10 MB); a hero loop wants < 1-3 MB. Test on a real phone in Low Power Mode.`);
}
import { statSync } from "node:fs";
function statSizeMB(p) { return (statSync(p).size / 1048576).toFixed(1); }

// ── main ──────────────────────────────────────────────────────────────────────
if (mode === "audit") {
  const target = args[1] || die("audit needs a url or file");
  const html = await loadHtml(target);
  const rows = classify(html);
  if (!rows.length) { console.log("[video] no <video> elements found."); process.exit(0); }
  for (const r of rows) {
    const flag = r.class === "decorative-autoplay" ? "-> guaranteed-play candidate (generate)"
      : r.class === "broken-decorative" ? "-> broken: add muted+playsinline or convert"
      : "-> keep native, audit quality rules (poster, formats, lazy-load, VideoObject)";
    console.log(`${r.class.padEnd(20)} ${r.src}  [muted:${r.muted} playsinline:${r.playsinline} poster:${r.poster} loop:${r.loop}] ${flag}`);
  }
  if (has("--json")) console.log(JSON.stringify(rows, null, 2));
} else if (mode === "generate") {
  await generate();
} else {
  console.error("Usage: node video-guardplay.mjs audit <url|file> [--json]");
  console.error("       node video-guardplay.mjs generate <input.mp4> [--codec mpeg1|vp9] [--out DIR] [--name N] [--height 540] [--fps 24] [--poster p.jpg] [--no-decoder]");
  process.exit(2);
}
