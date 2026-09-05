#!/usr/bin/env node
/**
 * fetch-asset.mjs — fetch a license-clean asset from an open API and save it,
 * ready to wire into a build. Called organically by the siteasy build flow when
 * a step needs an asset, not as a standalone command. Pure Node standard
 * library, no dependencies, no API keys.
 *
 * Only sources with a clear open licence are wired here. Each result prints its
 * licence, and the saver refuses a use-only source unless --force is given.
 * The generative kinds (wave, blob, pattern) run fully offline: seeded, reproducible,
 * and the output belongs to the project.
 *
 * Usage:
 *   node fetch-asset.mjs icon <set:name> [--color HEX] [--out DIR]
 *   node fetch-asset.mjs brand <slug> [--color HEX] [--out DIR]
 *   node fetch-asset.mjs font "<Family>" [--weights 400,700] [--out DIR]
 *   node fetch-asset.mjs photo "<query>" [--source openverse|met|artic|cleveland] [--n 3] [--out DIR]
 *   node fetch-asset.mjs avatar <seed> [--style bottts] [--out DIR]
 *   node fetch-asset.mjs placeholder <w> <h>        # dev placeholder, not committable
 *   node fetch-asset.mjs palette [--from HEX]        # generate a palette
 *   node fetch-asset.mjs wave [--colors "#a,#b,#c"] [--layers N] [--seed N] [--width 1440] [--height 320] [--flip]   # local, no network
 *   node fetch-asset.mjs blob [--color HEX | --colors "#a,#b"] [--points 8] [--variance 0.35] [--seed N]            # local, no network
 *   node fetch-asset.mjs pattern <dots|grid|diagonal|plus|zigzag|rings|checker> [--color HEX] [--size 24]           # local, no network
 * Flags: --dry (print the plan, fetch nothing), --force (save a use-only asset), --json
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const UA = "NullToHero-fetch/1.0 (+https://github.com/MariusYvard/NullToHero)";
const args = process.argv.slice(2);
const kind = args[0];
const pos = args.slice(1).filter(a => !a.startsWith("--"));
const flag = (n, d) => { const i = args.indexOf("--" + n); return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const has = (n) => args.includes("--" + n);
const DRY = has("dry"), FORCE = has("force"), JSON_OUT = has("json");
const OUT = flag("out", "assets");

// Licence per source: redistributable means safe to commit.
const LIC = {
  iconify:   { name: "per icon set (Iconify reports it)", redistributable: true },
  simple:    { name: "CC0 (Simple Icons), the depicted brand is a trademark", redistributable: true },
  gfonts:    { name: "OFL or Apache (per family)", redistributable: true },
  openverse: { name: "CC0 (filtered)", redistributable: true },
  met:       { name: "CC0 (public domain works)", redistributable: true },
  artic:     { name: "public domain", redistributable: true },
  cleveland: { name: "CC0", redistributable: true },
  dicebear:  { name: "per style (many CC0 or CC-BY), verify", redistributable: true },
  picsum:    { name: "Unsplash licence, placeholder only, do not commit", redistributable: false },
};

function out(msg) { process.stderr.write(msg + "\n"); }
async function get(url, opts = {}) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
  try { const r = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "user-agent": UA, ...(opts.headers || {}) }, ...opts }); return r; }
  finally { clearTimeout(t); }
}
function save(dir, name, data) {
  const d = join(OUT, dir); mkdirSync(d, { recursive: true });
  const p = join(d, name); writeFileSync(p, data); return p;
}
function gate(src) {
  if (!LIC[src].redistributable && !FORCE) {
    out(`[fetch] ${src} is ${LIC[src].name}. Not saved. Hotlink it or pass --force for a placeholder.`);
    return false;
  }
  return true;
}

async function doIcon() {
  const [set, iconName] = (pos[0] || "").includes(":") ? pos[0].split(":") : [null, null];
  if (!set) { out("usage: icon <set:name>, for example icon lucide:rocket"); process.exit(2); }
  const color = flag("color", "currentColor");
  const url = `https://api.iconify.design/${set}/${iconName}.svg` + (color !== "currentColor" ? `?color=${encodeURIComponent(color)}` : "");
  const licUrl = `https://api.iconify.design/collections?prefix=${set}`;
  if (DRY) return out(`[dry] GET ${url}\n[dry] licence GET ${licUrl}\n[dry] -> ${join(OUT, "icons", set + "-" + iconName + ".svg")}`);
  const r = await get(url); if (!r.ok) { out(`[fetch] icon not found (${r.status})`); process.exit(1); }
  const svg = await r.text();
  if (svg.trim().length < 20 || !svg.includes("<svg")) { out("[fetch] empty icon, check set:name"); process.exit(1); }
  let lic = LIC.iconify.name;
  try { const lr = await get(licUrl); if (lr.ok) { const j = await lr.json(); const c = j[set]; if (c && c.license) lic = `${c.license.title || c.license.spdx || ""} (${c.name})`; } } catch {}
  const p = save("icons", `${set}-${iconName}.svg`, svg);
  out(`[fetch] saved ${p} — licence: ${lic}`);
}
async function doBrand() {
  const slug = pos[0]; if (!slug) { out("usage: brand <slug>"); process.exit(2); }
  const color = flag("color", "");
  const url = `https://cdn.simpleicons.org/${slug}` + (color ? `/${color.replace("#", "")}` : "");
  if (DRY) return out(`[dry] GET ${url}\n[dry] -> ${join(OUT, "icons", "brand-" + slug + ".svg")} (CC0 icon, brand is a trademark)`);
  if (!gate("simple")) return;
  const r = await get(url); if (!r.ok) { out(`[fetch] brand not found (${r.status})`); process.exit(1); }
  const p = save("icons", `brand-${slug}.svg`, await r.text());
  out(`[fetch] saved ${p} — ${LIC.simple.name}`);
}
async function doFont() {
  const family = pos[0]; if (!family) { out('usage: font "<Family>"'); process.exit(2); }
  const weights = flag("weights", "400,700");
  const fam = family.replace(/ /g, "+");
  const cssUrl = `https://fonts.googleapis.com/css2?family=${fam}:wght@${weights.split(",").join(";")}&display=swap`;
  if (DRY) return out(`[dry] GET ${cssUrl}\n[dry] parse woff2 urls, download to ${join(OUT, "fonts")}, write fonts.css (@font-face, font-display: swap)`);
  // A modern browser UA makes Google Fonts return woff2 rather than ttf.
  const r = await get(cssUrl, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" } });
  if (!r.ok) { out(`[fetch] font css failed (${r.status})`); process.exit(1); }
  const css = await r.text();
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)].map(m => m[1]);
  if (!urls.length) { out("[fetch] no woff2 found, check the family name"); process.exit(1); }
  let localCss = css;
  const seen = new Set();
  for (const u of urls) {
    const fn = u.split("/").pop().split("?")[0];
    if (!seen.has(fn)) { const fr = await get(u); save("fonts", fn, Buffer.from(await fr.arrayBuffer())); seen.add(fn); }
    localCss = localCss.split(u).join(`./${fn}`);
  }
  const p = save("fonts", `${family.replace(/ /g, "-").toLowerCase()}.css`, localCss);
  out(`[fetch] saved ${seen.size} woff2 + ${p} — licence: ${LIC.gfonts.name}. Self-host these.`);
}
async function doPhoto() {
  const q = pos[0]; if (!q) { out('usage: photo "<query>"'); process.exit(2); }
  const source = flag("source", "openverse"); const n = parseInt(flag("n", "3"), 10);
  const map = {
    openverse: `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0&page_size=${n}`,
    met: `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(q)}&hasImages=true`,
    artic: `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&query%5Bterm%5D%5Bis_public_domain%5D=true&fields=id,title,image_id&limit=${n}`,
    cleveland: `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q)}&cc0=1&has_image=1&limit=${n}`,
  };
  const url = map[source]; if (!url) { out("source must be openverse, met, artic or cleveland"); process.exit(2); }
  if (DRY) return out(`[dry] GET ${url}\n[dry] -> CC0 image urls + creator, download to ${join(OUT, "photos")}`);
  const r = await get(url); if (!r.ok) { out(`[fetch] search failed (${r.status})`); process.exit(1); }
  const j = await r.json(); const results = [];
  if (source === "openverse") for (const it of (j.results || [])) results.push({ url: it.url, by: it.creator, lic: it.license });
  else if (source === "met") { for (const id of (j.objectIDs || []).slice(0, n)) { const o = await (await get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)).json(); if (o.isPublicDomain && o.primaryImage) results.push({ url: o.primaryImage, by: o.artistDisplayName, lic: "CC0" }); } }
  else if (source === "artic") for (const a of (j.data || [])) { if (a.image_id) results.push({ url: `https://www.artic.edu/iiif/2/${a.image_id}/full/1200,/0/default.jpg`, by: a.title, lic: "public domain" }); }
  else if (source === "cleveland") for (const a of (j.data || [])) { const img = a.images && (a.images.web || a.images.print); if (img) results.push({ url: img.url, by: a.creators && a.creators[0] && a.creators[0].description, lic: "CC0" }); }
  if (!results.length) { out("[fetch] no public-domain result"); process.exit(1); }
  out(JSON_OUT ? JSON.stringify(results, null, 2) : results.map(x => `${x.url}  (${x.lic}${x.by ? ", " + x.by : ""})`).join("\n"));
  out(`[fetch] ${results.length} CC0 image(s). Download, convert to WebP or AVIF, keep the attribution.`);
}
async function doAvatar() {
  const seed = pos[0] || "seed"; const style = flag("style", "bottts");
  const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  if (DRY) return out(`[dry] GET ${url}\n[dry] -> ${join(OUT, "avatars", style + "-" + seed + ".svg")}`);
  const r = await get(url); if (!r.ok) { out(`[fetch] avatar failed (${r.status})`); process.exit(1); }
  const p = save("avatars", `${style}-${seed}.svg`, await r.text());
  out(`[fetch] saved ${p} — ${LIC.dicebear.name}`);
}
function doPlaceholder() {
  const w = pos[0] || "800", h = pos[1] || "600";
  out(`https://picsum.photos/${w}/${h}   (${LIC.picsum.name})`);
  out("[fetch] use this as a dev placeholder, replace with a licensed image before shipping.");
}
async function doPalette() {
  const from = flag("from", null);
  const body = from ? { model: "default", input: [hexToRgb(from), "N", "N", "N", "N"] } : { model: "default" };
  if (DRY) return out(`[dry] POST http://colormind.io/api/ ${JSON.stringify(body)}\n[dry] -> CSS custom properties`);
  try {
    const r = await get("http://colormind.io/api/", { method: "POST", body: JSON.stringify(body) });
    const j = await r.json(); const hex = j.result.map(rgbToHex);
    out(":root {\n" + hex.map((h, i) => `  --c-${(i + 1) * 100}: ${h};`).join("\n") + "\n}");
    out("[fetch] a generated palette. Refine it, and run theme_css.py for WCAG-checked tokens.");
  } catch { out("[fetch] colormind unreachable, generate locally with theme_css.py instead."); }
}
function hexToRgb(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgbToHex(a) { return "#" + a.map(x => Math.round(x).toString(16).padStart(2, "0")).join(""); }

// ---- local generative kinds (no network; seeded and reproducible; the output is yours, CC0) ----
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedOf() { const s = flag("seed", null); return s !== null ? (parseInt(s, 10) >>> 0) : (Date.now() % 100000); }
const fmt = (n) => (Math.round(n * 100) / 100).toString();
const GEN_NOTE = "generated locally, seeded, the output is yours (CC0)";

function doWave() {
  const seed = seedOf(), rnd = mulberry32(seed);
  const colors = flag("colors", "#0b3954,#087e8b,#bfd7ea").split(",").map(s => s.trim()).filter(Boolean);
  const W = parseInt(flag("width", "1440"), 10), H = parseInt(flag("height", "320"), 10);
  const layers = Math.min(6, Math.max(1, parseInt(flag("layers", String(colors.length)), 10)));
  const amp = Math.min(1, Math.max(0.05, parseFloat(flag("amplitude", "0.5"))));
  const segs = Math.min(12, Math.max(2, parseInt(flag("segments", "4"), 10)));
  if (DRY) return out(`[dry] generate ${layers} wave layer(s) ${W}x${H}, seed ${seed} -> ${join(OUT, "backgrounds", "wave-" + seed + ".svg")}`);
  const paths = [];
  for (let l = 0; l < layers; l++) {
    const frac = layers === 1 ? 0.55 : 0.3 + 0.5 * (l / (layers - 1));
    const base = H * frac;
    const a = Math.max(2, H * 0.16 * amp * (1 - l / (layers + 2)));
    const step = W / segs;
    let py = base + (rnd() - 0.5) * 2 * a;
    let d = `M0 ${fmt(py)}`;
    for (let s2 = 1; s2 <= segs; s2++) {
      const nx = step * s2, ny = base + (rnd() - 0.5) * 2 * a;
      d += ` C${fmt(nx - step / 2)} ${fmt(py)} ${fmt(nx - step / 2)} ${fmt(ny)} ${fmt(nx)} ${fmt(ny)}`;
      py = ny;
    }
    d += ` L${W} ${H} L0 ${H} Z`;
    const op = layers === 1 ? "1" : fmt(0.45 + 0.55 * (l / (layers - 1)));
    paths.push(`<path d="${d}" fill="${colors[l % colors.length]}" fill-opacity="${op}"/>`);
  }
  const g = has("flip") ? `<g transform="rotate(180 ${fmt(W / 2)} ${fmt(H / 2)})">${paths.join("")}</g>` : paths.join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><!-- NullToHero wave, seed ${seed}: ${GEN_NOTE} -->${g}</svg>\n`;
  const p = save("backgrounds", `wave-${seed}.svg`, svg);
  out(`[gen] saved ${p} - seed ${seed}, ${GEN_NOTE}`);
  out(`[gen] stretch it: <img> with width 100%, or background-size: 100% 100%. Add --flip for a top divider. Reproduce with --seed ${seed}.`);
}

function doBlob() {
  const seed = seedOf(), rnd = mulberry32(seed);
  const colors = flag("colors", flag("color", "#087e8b")).split(",").map(s => s.trim()).filter(Boolean);
  const size = parseInt(flag("size", "480"), 10);
  const n = Math.min(16, Math.max(5, parseInt(flag("points", "8"), 10)));
  const variance = Math.min(0.8, Math.max(0.05, parseFloat(flag("variance", "0.35"))));
  if (DRY) return out(`[dry] generate a ${n}-point blob ${size}x${size}, seed ${seed} -> ${join(OUT, "backgrounds", "blob-" + seed + ".svg")}`);
  const cx = size / 2, cy = size / 2, R = size * 0.42;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = (Math.PI * 2 * i) / n;
    const r = R * (1 - variance * rnd());
    pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
  }
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  d += " Z";
  let fill = colors[0], defs = "";
  if (colors.length > 1) {
    defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` + colors.map((c, i) => `<stop offset="${fmt(i / (colors.length - 1))}" stop-color="${c}"/>`).join("") + `</linearGradient></defs>`;
    fill = "url(#g)";
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" aria-hidden="true"><!-- NullToHero blob, seed ${seed}: ${GEN_NOTE} -->${defs}<path d="${d}" fill="${fill}"/></svg>\n`;
  const p = save("backgrounds", `blob-${seed}.svg`, svg);
  out(`[gen] saved ${p} - seed ${seed}, ${GEN_NOTE}`);
  out(`[gen] use it as a section accent or an image mask (mask-image). Reproduce with --seed ${seed}.`);
}

function doPattern() {
  const name = pos[0] || "dots";
  const color = flag("color", "#0b3954"), bg = flag("bg", "none");
  const s = parseInt(flag("size", "24"), 10);
  const sw = Math.max(0.5, parseFloat(flag("stroke", "1")));
  const op = Math.min(1, Math.max(0.02, parseFloat(flag("opacity", "0.18"))));
  const h = s / 2, q = s / 4;
  const st = `fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${sw}"`;
  const cells = {
    dots: [[0, 0], [s, 0], [0, s], [s, s], [h, h]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${fmt(Math.max(1, sw))}" fill="${color}" fill-opacity="${op}"/>`).join(""),
    grid: `<path d="M ${s} 0 H 0 V ${s}" ${st}/>`,
    diagonal: `<path d="M0 ${s} L${s} 0 M${fmt(-h)} ${fmt(h)} L${fmt(h)} ${fmt(-h)} M${fmt(h)} ${fmt(s * 1.5)} L${fmt(s * 1.5)} ${fmt(h)}" ${st}/>`,
    plus: `<path d="M${h} ${q} V${fmt(s - q)} M${q} ${h} H${fmt(s - q)}" ${st}/>`,
    zigzag: `<path d="M0 ${fmt(s * 0.75)} L${q} ${fmt(s * 0.25)} L${h} ${fmt(s * 0.75)} L${fmt(s * 0.75)} ${fmt(s * 0.25)} L${s} ${fmt(s * 0.75)}" ${st}/>`,
    rings: `<circle cx="${h}" cy="${h}" r="${fmt(s * 0.3)}" ${st}/>`,
    checker: `<rect width="${h}" height="${h}" fill="${color}" fill-opacity="${op}"/><rect x="${h}" y="${h}" width="${h}" height="${h}" fill="${color}" fill-opacity="${op}"/>`,
  };
  if (!cells[name]) { out("pattern names: " + Object.keys(cells).join(", ")); process.exit(2); }
  if (DRY) return out(`[dry] generate tileable pattern '${name}' ${s}x${s} -> ${join(OUT, "patterns", "pattern-" + name + "-" + s + ".svg")} + CSS snippet`);
  const bgRect = bg !== "none" ? `<rect width="${s}" height="${s}" fill="${bg}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><!-- NullToHero pattern ${name}: ${GEN_NOTE} -->${bgRect}${cells[name]}</svg>\n`;
  const p = save("patterns", `pattern-${name}-${s}.svg`, svg);
  const uri = encodeURIComponent(svg.replace(/<!--.*?-->/, "").trim()).replace(/%20/g, " ");
  out(`[gen] saved ${p} - ${GEN_NOTE}`);
  out(`[gen] CSS:\n.pattern-${name} {\n  background-color: ${bg !== "none" ? bg : "transparent"};\n  background-image: url("data:image/svg+xml,${uri}");\n  background-size: ${s}px ${s}px;\n}`);
}

const table = { icon: doIcon, brand: doBrand, font: doFont, photo: doPhoto, avatar: doAvatar, placeholder: doPlaceholder, palette: doPalette, wave: doWave, blob: doBlob, pattern: doPattern };
if (!table[kind]) { out("kinds: icon, brand, font, photo, avatar, placeholder, palette, wave, blob, pattern (wave, blob and pattern are generated locally; add --dry to preview)"); process.exit(2); }
await table[kind]();
