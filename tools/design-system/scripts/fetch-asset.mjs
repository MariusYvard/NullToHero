#!/usr/bin/env node
/**
 * fetch-asset.mjs — fetch a license-clean asset from an open API and save it,
 * ready to wire into a build. Called organically by the siteasy build flow when
 * a step needs an asset, not as a standalone command. Pure Node standard
 * library, no dependencies, no API keys.
 *
 * Only sources with a clear open licence are wired here. Each result prints its
 * licence, and the saver refuses a use-only source unless --force is given.
 *
 * Usage:
 *   node fetch-asset.mjs icon <set:name> [--color HEX] [--out DIR]
 *   node fetch-asset.mjs brand <slug> [--color HEX] [--out DIR]
 *   node fetch-asset.mjs font "<Family>" [--weights 400,700] [--out DIR]
 *   node fetch-asset.mjs photo "<query>" [--source openverse|met|artic|cleveland] [--n 3] [--out DIR]
 *   node fetch-asset.mjs avatar <seed> [--style bottts] [--out DIR]
 *   node fetch-asset.mjs placeholder <w> <h>        # dev placeholder, not committable
 *   node fetch-asset.mjs palette [--from HEX]        # generate a palette
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

const table = { icon: doIcon, brand: doBrand, font: doFont, photo: doPhoto, avatar: doAvatar, placeholder: doPlaceholder, palette: doPalette };
if (!table[kind]) { out("kinds: icon, brand, font, photo, avatar, placeholder, palette (add --dry to preview)"); process.exit(2); }
await table[kind]();
