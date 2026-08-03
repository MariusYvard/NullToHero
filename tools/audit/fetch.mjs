#!/usr/bin/env node
/**
 * fetch.mjs — shared fetch phase for /audit.
 *
 * Retrieves a target's HTML once, plus its linked CSS and JavaScript, its
 * robots.txt and its HTTP response headers, and writes them to a known assets
 * directory so every sub-agent reads the SAME files with the Read tool instead
 * of issuing its own WebFetch (which is not always available in a harness). By
 * default it reads the server response only (raw HTML, no JavaScript run). With
 * --render it loads the page in headless Chromium (Playwright) so a
 * client-rendered SPA is audited as a user sees it, not as an empty shell, and
 * collects computed-style facts (contrast samples, 375px horizontal overflow)
 * the static analyzer cannot get from raw HTML.
 *
 * It always reports whether the page looks client-rendered, so a raw-only fetch
 * of a React/Vue SPA is FLAGGED rather than silently audited as a blank page.
 *
 * Usage:
 *   node tools/audit/fetch.mjs <url|file> [--render] [--robots] [--assets-dir DIR] [--no-assets] [--out file.json] [--timeout 15000]
 *
 * Playwright is an optional peer dependency. Without it, --render degrades to a
 * raw fetch with a clear warning. Exit 0 on fetch, 2 on usage/target error.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { parse, textContent, queryAll } from "./lib/html.mjs";
import { flatten, contrastRatio } from "./lib/contrast.mjs";
import { PROBE_AGENTS } from "./lib/ai-access.mjs";
import { safeFetch, validateUrl, UrlSafetyError } from "./lib/url-safety.mjs";

const UA = "NullToHero-audit/1.0 (+https://github.com/MariusYvard/NullToHero)";
// Baseline for the differential fetch: what an ordinary visitor's browser sends.
// The comparison is bot-status against this, so it has to look like a browser.
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const isUrlStr = (t) => /^https?:\/\//i.test(t);

// Bounded asset collection: enough to give agents the real CSS/JS without
// downloading an entire third-party bundle graph.
const ASSET_CAPS = { maxFiles: 30, maxBytesPerFile: 512 * 1024, maxTotalBytes: 3 * 1024 * 1024 };

function visibleText(html) {
  try { return textContent(parse(html)).replace(/\s+/g, " ").trim(); } catch { return ""; }
}
function nodeCount(html) {
  try { let n = 0; const root = parse(html); const rec = (x) => { for (const c of x.children) if (c.type === "element") { n++; rec(c); } }; rec(root); return n; } catch { return 0; }
}

// Heuristic SPA-shell detection on the RAW HTML (no render needed): a known mount
// node that is empty, plus script bundles and little server text.
function shellSignals(html) {
  const root = parse(html);
  const mountIds = ["root", "app", "__next", "__nuxt", "react-root", "svelte", "q-app", "main"];
  let emptyMount = false, mountId = null;
  const all = [];
  const rec = (x) => { for (const c of x.children) if (c.type === "element") { all.push(c); rec(c); } };
  rec(root);
  for (const el of all) {
    const id = (el.attrs.id || "").toLowerCase();
    if ((el.tag === "div" || el.tag === "main") && mountIds.includes(id)) {
      const inner = textContent(el).replace(/\s+/g, "").length;
      const kids = el.children.filter(c => c.type === "element").length;
      if (inner === 0 && kids === 0) { emptyMount = true; mountId = id; }
    }
  }
  const scripts = queryAll(root, "script");
  const moduleBundles = scripts.filter(s => (s.attrs.src || "") && (/\.m?js(\?|$)/.test(s.attrs.src) || s.attrs.type === "module")).length;
  return { emptyMount, mountId, scriptCount: scripts.length, moduleBundles };
}

// Turn a fetch Headers object into a plain, lowercase-keyed object.
function headersToObject(h) {
  const out = {};
  try { for (const [k, v] of h) out[k.toLowerCase()] = v; } catch { /* no headers */ }
  return out;
}

async function rawFetch(target, isUrl, timeout) {
  if (isUrl) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const { res, chain } = await safeFetch(target, { signal: ctrl.signal, headers: { "user-agent": UA } });
      const html = await res.text();
      const finalUrl = (chain.length ? chain[chain.length - 1].url : null) || res.url;
      return { html, status: res.status, finalUrl, headers: headersToObject(res.headers) };
    } catch (e) {
      /* A refusal is not a network hiccup and must not read like one. The target,
         or something it redirected to, points at an address this machine can reach
         and the caller cannot: loopback, the private network, or a cloud metadata
         endpoint. Refusing is the whole job. */
      if (e instanceof UrlSafetyError) {
        console.error(`[fetch] refused to fetch ${target}: ${e.message} (${e.code}).`);
        process.exit(2);
      }
      throw e;
    } finally { clearTimeout(t); }
  }
  const p = resolve(target);
  if (!existsSync(p)) { console.error(`[fetch] file not found: ${p}`); process.exit(2); }
  return { html: readFileSync(p, "utf8"), status: 200, finalUrl: null, headers: null };
}

async function fetchRobots(baseUrl, isUrl) {
  if (!isUrl) return null;
  try {
    const u = new URL("/robots.txt", baseUrl);
    const { res } = await safeFetch(u.toString(), { headers: { "user-agent": UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

// Lightweight passive probes for a live URL: whether plain HTTP redirects to
// HTTPS, whether the www/non-www alternate host resolves or redirects, and
// whether a security.txt is published. Read-only GETs that follow redirects; no
// crafted or attack traffic is ever sent.
async function probeUrl(u, timeout) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const { res, chain } = await safeFetch(String(u), { signal: ctrl.signal, headers: { "user-agent": UA } });
    try { await res.body?.cancel(); } catch { /* ignore */ }
    return { status: res.status, finalUrl: (chain.length ? chain[chain.length - 1].url : null) || res.url, ok: res.ok };
  } catch (e) { return { error: e.name === "AbortError" ? "timeout" : e.message }; }
  finally { clearTimeout(t); }
}

// Same request with a different user-agent, and with the body read when the caller
// wants to inspect it. Used for the AI-surface probes below.
async function probeAs(u, timeout, { ua = UA, accept = null, body = false, method = "GET" } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const headers = { "user-agent": ua };
    if (accept) headers.accept = accept;
    const { res } = await safeFetch(String(u), { signal: ctrl.signal, method, headers });
    let text = null;
    if (body) {
      // Capped: a discovery file that is megabytes long is itself the finding, and
      // we never need more than the head of it to grade the structure.
      const raw = await res.text();
      text = raw.length > 256 * 1024 ? raw.slice(0, 256 * 1024) : raw;
    } else {
      try { await res.body?.cancel(); } catch { /* ignore */ }
    }
    return { status: res.status, finalUrl: res.url, ok: res.ok, contentType: res.headers.get("content-type") || "", body: text };
  } catch (e) { return { error: e.name === "AbortError" ? "timeout" : e.message }; }
  finally { clearTimeout(t); }
}

// robots.txt answers what a site says. It does not answer what the edge does. A WAF
// or bot-management rule can return 403 to a declared bot on a site whose robots.txt
// welcomes it, and the robots-only reading calls that site reachable when it is
// invisible. Three HEAD-weight requests settle it.
async function probeAiCrawlerHttp(url, timeout) {
  const pt = Math.min(timeout, 8000);
  const base = await probeAs(url, pt, { ua: BROWSER_UA });
  if (base.error || base.status == null) return { tested: true, baseline: null, error: base.error || "no-status", agents: [] };
  const agents = [];
  for (const a of PROBE_AGENTS) {
    const r = await probeAs(url, pt, { ua: a.ua });
    agents.push({ id: a.id, status: r.error ? null : r.status, error: r.error || null });
  }
  return { tested: true, baseline: base.status, agents };
}

// One grouped pass over the discovery paths. Grouped deliberately: probing them
// one command at a time would not justify the request budget on its own.
const AI_FILE_PATHS = ["/llms.txt", "/llms-full.txt", "/ai.txt", "/.well-known/ai-plugin.json", "/.well-known/rsl.json"];

async function probeAiFiles(origin, timeout) {
  const pt = Math.min(timeout, 6000);
  const out = {};
  for (const p of AI_FILE_PATHS) {
    // Only llms.txt needs its body: the others are presence questions.
    const wantBody = p === "/llms.txt";
    const r = await probeAs(origin + p, pt, { body: wantBody });
    out[p] = r.error
      ? { tested: true, status: null, error: r.error }
      : { tested: true, status: r.status, contentType: r.contentType, body: wantBody ? r.body : null };
  }
  return out;
}

async function probeMarkdownNegotiation(url, timeout) {
  const r = await probeAs(url, Math.min(timeout, 8000), { accept: "text/markdown" });
  if (r.error) return { tested: true, error: r.error };
  return { tested: true, status: r.status, contentType: r.contentType, markdown: /^text\/markdown\b/i.test(r.contentType || "") };
}

async function runProbes(baseUrl, timeout) {
  const out = { httpsRedirect: { tested: false }, hostCanonical: { tested: false }, securityTxt: { tested: false } };
  let parsed; try { parsed = new URL(baseUrl); } catch { return out; }
  const pt = Math.min(timeout, 8000);
  const primaryHost = parsed.host.toLowerCase();
  try {
    const r = await probeUrl("http://" + parsed.host + "/", pt);
    if (r.error) out.httpsRedirect = { tested: true, reachable: false };
    else {
      let https = false; try { https = new URL(r.finalUrl).protocol === "https:"; } catch { /* keep */ }
      out.httpsRedirect = { tested: true, reachable: true, status: r.status, redirectsToHttps: https, location: r.finalUrl };
    }
  } catch { /* keep default */ }
  try {
    const altHost = primaryHost.startsWith("www.") ? primaryHost.slice(4) : "www." + primaryHost;
    const r = await probeUrl(parsed.protocol + "//" + altHost + "/", pt);
    if (r.error) out.hostCanonical = { tested: true, altHost, altReachable: false };
    else {
      let finalHost = null; try { finalHost = new URL(r.finalUrl).host.toLowerCase(); } catch { /* keep */ }
      out.hostCanonical = { tested: true, altHost, altReachable: !!r.ok, altRedirects: finalHost === primaryHost };
    }
  } catch { /* keep default */ }
  try {
    const r = await probeUrl(parsed.protocol + "//" + parsed.host + "/.well-known/security.txt", pt);
    out.securityTxt = { tested: true, found: !r.error && r.status >= 200 && r.status < 300 };
  } catch { /* keep default */ }
  const origin = parsed.protocol + "//" + parsed.host;
  try { out.aiCrawlerHttp = await probeAiCrawlerHttp(baseUrl, timeout); }
  catch (e) { out.aiCrawlerHttp = { tested: true, baseline: null, error: e.message, agents: [] }; }
  try { out.aiFiles = await probeAiFiles(origin, timeout); }
  catch { /* keep undefined so the check reports NOT_MEASURED */ }
  try { out.markdownNegotiation = await probeMarkdownNegotiation(baseUrl, timeout); }
  catch (e) { out.markdownNegotiation = { tested: true, error: e.message }; }
  return out;
}

// Passive library probe: which front-end libraries the page's own code carries.
// Context for agents and remediation (stack-aware advice), never a verdict.
function libSignals(html, js) {
  const t = (html || "") + "\n" + (js || "");
  const libs = [];
  const add = (n, re) => { if (re.test(t)) libs.push(n); };
  add("gsap", /\bgsap\b/i);
  add("scrolltrigger", /ScrollTrigger/);
  add("lenis", /\blenis\b/i);
  add("locomotive-scroll", /locomotive-scroll/i);
  add("motion", /framer-motion|motion\/react|useReducedMotion/);
  add("three", /\bTHREE\b|three\.module|\bREVISION\s*=/);
  add("react-three-fiber", /@react-three|useFrame\s*\(/);
  add("scrollama", /scrollama/i);
  add("react", /react-dom|__NEXT_DATA__/);
  add("nextjs", /__NEXT_DATA__|\/_next\//);
  add("vue", /__VUE__|data-v-[0-9a-f]{8}/);
  add("svelte", /svelte-[a-z0-9]{6}/);
  add("jquery", /jquery/i);
  add("alpine", /x-data=/);
  add("tailwind", /class(Name)?="[^"]*\b(sm|md|lg|xl|2xl):[a-z-]/);
  add("wordpress", /wp-content\//);
  return libs;
}

// Passive scrollytelling probe: detects step/pin machinery in the page's own
// HTML and JS so the motion and UX agents get context. Context only, never a
// verdict — a scrollytelling page is not a defect.
function scrollySignals(html, js) {
  const t = (html || "") + "\n" + (js || "");
  const found = [];
  if (/\bScrollTrigger\b/.test(t)) found.push("gsap-scrolltrigger");
  if (/scrollama/i.test(t)) found.push("scrollama");
  if (/\bcr-section\b|closeread/i.test(t)) found.push("closeread");
  if (/animation-timeline\s*:/.test(t)) found.push("css-scroll-driven");
  if (/data-scrollama-index/.test(t)) found.push("scrollama-steps");
  if (/position\s*:\s*sticky/i.test(t) && /IntersectionObserver/.test(t)) found.push("sticky+io");
  return { detected: found.length > 0, signals: found };
}

// Weigh the video and 3D-model files a page references. HEAD requests (with a
// 1-byte range GET fallback for hosts that reject HEAD) for URLs, fs.stat for
// local targets. Read-only, capped, and reported through probes.mediaWeight so
// the media-weight check can stay NOT_MEASURED when nothing was probed.
const MEDIA_CAPS = { maxProbes: 20 };

function collectMediaRefs(html, js) {
  const t = (html || "") + "\n" + (js || "");
  const re = /[^"'`()\s>{}]+\.(mp4|webm|mov|m4v|glb|gltf)\b/gi;
  const videos = new Set(), models = new Set();
  let m;
  while ((m = re.exec(t))) {
    const u = m[0].replace(/^[.,;:]+/, "");
    if (/\.(glb|gltf)$/i.test(u)) models.add(u); else videos.add(u);
  }
  return { videos: [...videos].slice(0, MEDIA_CAPS.maxProbes), models: [...models].slice(0, MEDIA_CAPS.maxProbes) };
}

async function headBytes(u, timeout) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    let res = (await safeFetch(String(u), { method: "HEAD", signal: ctrl.signal, headers: { "user-agent": UA } })).res;
    let cl = res.ok ? res.headers.get("content-length") : null;
    if (!cl) {
      res = (await safeFetch(String(u), { method: "GET", signal: ctrl.signal, headers: { "user-agent": UA, range: "bytes=0-0" } })).res;
      const cr = res.headers.get("content-range");
      try { await res.body?.cancel(); } catch { /* ignore */ }
      const mm = cr && cr.match(/\/(\d+)$/);
      if (mm) return parseInt(mm[1], 10);
      cl = res.ok ? res.headers.get("content-length") : null;
      return cl ? parseInt(cl, 10) : null;
    }
    try { await res.body?.cancel(); } catch { /* ignore */ }
    return parseInt(cl, 10);
  } catch { return null; }
  finally { clearTimeout(t); }
}

async function measureMediaWeight({ html, js, baseUrl, isUrl, localPath, timeout }) {
  const refs = collectMediaRefs(html, js);
  if (refs.videos.length === 0 && refs.models.length === 0) {
    return { tested: true, videos: [], models: [], videoBytes: 0, modelBytes: 0, unresolved: 0 };
  }
  const pt = Math.min(timeout, 8000);
  let unresolved = 0;
  const weigh = async (ref) => {
    if (isUrl) {
      let abs; try { abs = new URL(ref, baseUrl).href; } catch { unresolved++; return null; }
      const b = await headBytes(abs, pt);
      if (b == null) { unresolved++; return null; }
      return { url: abs, bytes: b };
    }
    if (localPath) {
      try {
        const p2 = resolve(dirname(localPath), ref.split("?")[0].split("#")[0]);
        if (existsSync(p2)) return { url: ref, bytes: statSync(p2).size };
      } catch { /* fall through */ }
      unresolved++; return null;
    }
    unresolved++; return null;
  };
  const videos = [], models = [];
  for (const r of refs.videos) { const w = await weigh(r); if (w) videos.push(w); }
  for (const r of refs.models) { const w = await weigh(r); if (w) models.push(w); }
  return {
    tested: true, videos, models,
    videoBytes: videos.reduce((s2, x) => s2 + x.bytes, 0),
    modelBytes: models.reduce((s2, x) => s2 + x.bytes, 0),
    unresolved,
  };
}

// ── linked CSS / JS collection ────────────────────────────────────────────────

function collectAssetRefs(html) {
  const root = parse(html);
  const cssHrefs = [], jsSrcs = [], inlineCss = [], inlineJs = [];
  for (const l of queryAll(root, "link")) {
    const rel = (l.attrs.rel || "").toLowerCase().split(/\s+/);
    if (rel.includes("stylesheet") && l.attrs.href) cssHrefs.push(l.attrs.href);
  }
  for (const s of queryAll(root, "style")) { const t = textContent(s); if (t.trim()) inlineCss.push(t); }
  for (const s of queryAll(root, "script")) {
    const ty = (s.attrs.type || "").toLowerCase();
    if (s.attrs.src) { if (!/json/.test(ty)) jsSrcs.push(s.attrs.src); }
    else { const t = textContent(s); if (t.trim() && (ty === "" || ty === "text/javascript" || ty === "module" || ty === "application/javascript")) inlineJs.push(t); }
  }
  return { cssHrefs, jsSrcs, inlineCss, inlineJs };
}

async function fetchOne(u, timeout) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const { res } = await safeFetch(String(u), { signal: ctrl.signal, headers: { "user-agent": UA } });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true, text: await res.text() };
  } catch (e) { return { ok: false, reason: e.name === "AbortError" ? "timeout" : e.message }; }
  finally { clearTimeout(t); }
}

// Collect the page's own CSS and JS (inline plus same-origin linked files) into
// two concatenated blobs. Same-origin only and capped, so a third-party CDN or a
// giant vendor bundle cannot blow up the fetch. Local-file targets resolve
// relative hrefs from disk. Returns { css, js, cssFiles, jsFiles, skipped }.
async function fetchAssets({ html, baseUrl, isUrl, localPath, timeout }) {
  const { cssHrefs, jsSrcs, inlineCss, inlineJs } = collectAssetRefs(html);
  const cssParts = inlineCss.map((c, i) => `/* ==== inline <style> #${i + 1} ==== */\n${c}`);
  const jsParts  = inlineJs.map((c, i) => `// ==== inline <script> #${i + 1} ====\n${c}`);
  const cssFiles = [], jsFiles = [], skipped = [];
  let total = 0, count = 0;
  let baseHost = null; try { baseHost = new URL(baseUrl).host; } catch { /* local */ }

  const take = async (href, kind) => {
    if (count >= ASSET_CAPS.maxFiles || total >= ASSET_CAPS.maxTotalBytes) { skipped.push({ href, reason: "cap reached" }); return; }
    let text = null, label = href;
    if (isUrl) {
      let abs; try { abs = new URL(href, baseUrl); } catch { skipped.push({ href, reason: "bad url" }); return; }
      if (baseHost && abs.host !== baseHost) { skipped.push({ href: abs.href, reason: "cross-origin" }); return; }
      label = abs.href;
      const r = await fetchOne(abs, timeout);
      if (!r.ok) { skipped.push({ href: label, reason: r.reason }); return; }
      text = r.text;
    } else if (localPath) {
      if (/^https?:\/\//i.test(href) || href.startsWith("//")) { skipped.push({ href, reason: "remote ref in local file" }); return; }
      let p; try { p = resolve(dirname(localPath), href.split("?")[0].split("#")[0]); } catch { skipped.push({ href, reason: "bad path" }); return; }
      if (!existsSync(p)) { skipped.push({ href, reason: "not found" }); return; }
      try { text = readFileSync(p, "utf8"); label = p; } catch { skipped.push({ href, reason: "read error" }); return; }
    } else { return; }
    if (text.length > ASSET_CAPS.maxBytesPerFile) { skipped.push({ href: label, reason: `too large (${text.length} b)` }); return; }
    total += text.length; count++;
    if (kind === "css") { cssParts.push(`/* ==== ${label} ==== */\n${text}`); cssFiles.push({ href: label, bytes: text.length }); }
    else { jsParts.push(`// ==== ${label} ====\n${text}`); jsFiles.push({ href: label, bytes: text.length }); }
  };

  for (const h of cssHrefs) await take(h, "css");
  for (const s of jsSrcs) await take(s, "js");
  return { css: cssParts.join("\n\n"), js: jsParts.join("\n\n"), cssFiles, jsFiles, skipped };
}

// Write the fetched artifacts to a directory as the files agents read by name.
export function writeAssets(result, dir) {
  mkdirSync(dir, { recursive: true });
  const written = [];
  const w = (name, content) => { writeFileSync(join(dir, name), content); written.push({ name, bytes: content.length }); };
  w("raw.html", result.rawHtml || "");
  if (result.renderedHtml) w("rendered.html", result.renderedHtml);
  w("styles.css", result.linkedCss || "");
  w("scripts.js", result.linkedJs || "");
  w("headers.json", JSON.stringify(result.headers || {}, null, 2));
  if (result.robotsTxt != null) w("robots.txt", result.robotsTxt);
  return written;
}

function ratioFromSample(s) {
  const bg = s.bg.a < 1 ? flatten(s.bg, { r: 255, g: 255, b: 255, a: 1 }) : s.bg;
  const fg = flatten(s.color, bg);
  return contrastRatio(fg, bg);
}

/* Collapse the sweep back to one row per element.

   Sweeping five scroll stops across two viewports measures the same nav link ten
   times. Reported raw, that turns one defect into ten and multiplies the count by the
   thoroughness of the audit — a number that grows when you look harder is not a
   measurement, it is a units error. So: one row per element per page, keeping its
   WORST state.

   Worst is ratio/threshold, not ratio. Responsive type changes the threshold under
   you: 24px on desktop is large text needing 3.0, the same element at 15px on mobile
   needs 4.5, and 3.9:1 is a pass in one and a failure in the other. Severity compares
   them; the raw ratio does not.

   Keeping the worst is the whole point of scrolling. The nav button that reads at
   5.86:1 over the first act and 3.68:1 once the dark page slides under it IS a defect,
   and an average, a first-seen or a last-seen would each have hidden it. */
export function dedupeSamples(samples) {
  const worst = new Map();
  for (const s of samples) {
    const key = s.domPath == null ? Symbol() : `${s.page || ""}|${s.domPath}`;
    const prev = worst.get(key);
    if (!prev || s.ratio / s.threshold < prev.ratio / prev.threshold) worst.set(key, s);
  }
  return [...worst.values()];
}

// Render with Playwright. Returns { renderedHtml, overflow, contrastSamples } or
// null when Playwright is unavailable (import or launch failure).

/* The measured surface. Every default here was a real bug we had to find by hand,
   one per axis:
     pages    /journey's CTA failed while the audited home page passed
     scroll   the nav button re-themed past the first act and dropped to 3.68:1
     viewport the nav's desktop links are display:none at 375, so nothing measured them
   375 is the overflow check's viewport and stays first; 1280 is where desktop-only
   chrome exists at all. */
const VIEWPORTS = { mobile: { width: 375, height: 812 }, desktop: { width: 1280, height: 900 } };
const DEFAULTS = { pages: 10, scroll: 5, viewports: ["mobile", "desktop"] };
// A scroll-linked page needs its rAF to run after the jump before anything is true.
const SETTLE_MS = 420;

/* Which pages. The sitemap is the list the site declares about itself, so it beats
   guessing from links; links are the fallback for a site that ships none. Same-origin
   only, capped, entry URL always first and always kept. */
export async function discoverPages(baseUrl, entryHtml, timeout, explicit, cap) {
  const entry = baseUrl.replace(/#.*$/, "");
  if (explicit && explicit.length) return [entry, ...explicit.filter(u => u !== entry)].slice(0, cap);
  const origin = new URL(entry).origin;
  const seen = new Set([entry]);
  const out = [entry];
  const add = (href) => {
    try {
      const u = new URL(href, entry);
      u.hash = "";
      const s = u.toString();
      if (u.origin !== origin || seen.has(s)) return;
      if (/\.(png|jpe?g|svg|webp|avif|gif|pdf|zip|xml|txt|ico|css|js|woff2?)$/i.test(u.pathname)) return;
      seen.add(s); out.push(s);
    } catch { /* not a URL we can use */ }
  };
  try {
    const sm = await rawFetch(new URL("/sitemap.xml", origin).toString(), true, timeout);
    if (sm.status === 200 && /<loc>/i.test(sm.html)) {
      for (const m of sm.html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) add(m[1]);
      if (out.length > 1) {
        console.error(`[fetch] sitemap.xml lists ${out.length} same-origin page(s); measuring up to ${cap}.`);
        return out.slice(0, cap);
      }
    }
  } catch { /* no sitemap: fall through to links */ }
  for (const m of (entryHtml || "").matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  console.error(out.length > 1
    ? `[fetch] no sitemap; crawled ${out.length - 1} same-origin link(s) from the entry page, measuring up to ${cap}.`
    : `[fetch] no sitemap and no same-origin links; measuring the entry page only.`);
  return out.slice(0, cap);
}

/* Measure one page in one viewport at N scroll stops.

   scrollTo is a request, not a fact: a smooth-scroll library can animate it, clamp it
   or ignore it outright, and the previous session lost hours to exactly that. So we
   ask, let rAF settle, then read back where we ACTUALLY are and record that. Two stops
   that land on the same pixel collapse to one, and a page that refuses to move is
   measured once instead of five times pretending otherwise. */
async function measureStates(page, url, viewportName, stops) {
  const height = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const targets = height < 4 ? [0] : Array.from({ length: stops }, (_, i) => Math.round((height * i) / (stops - 1 || 1)));
  const all = [];
  const skipped = [];
  const visited = new Set();
  for (const target of targets) {
    await page.evaluate((y) => window.scrollTo(0, y), target);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(SETTLE_MS);
    const actual = await page.evaluate(() => Math.round(window.scrollY));
    if (visited.has(actual)) continue;   // the page did not move: measuring again would only repeat ourselves
    visited.add(actual);
    const raw = await page.evaluate(SAMPLER);
    const r = await resolveRootBackdrops(page, raw);
    for (const s of r.samples) all.push({ ...s, page: url, viewport: viewportName, scrollY: actual });
    for (const s of r.skipped) skipped.push({ ...s, page: url });
  }
  return { samples: all, skipped, states: visited.size };
}

async function render(url, timeout, opts = {}) {
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch { console.error("[fetch] --render requested but Playwright is not installed; degrading to raw fetch. Install: npm i -D playwright && npx playwright install chromium"); return null; }
  const cap = opts.pages ?? DEFAULTS.pages;
  const stops = Math.max(1, opts.scroll ?? DEFAULTS.scroll);
  const wanted = (opts.viewports ?? DEFAULTS.viewports).filter(v => VIEWPORTS[v]);
  const views = wanted.length ? wanted : DEFAULTS.viewports;
  /* Headless Chromium resolves DNS itself, so the SSRF guard cannot sit on the
     browser's own request path. Validation therefore happens HERE, before the
     browser is handed anything, which is the contract lib/url-safety.mjs states. */
  await validateUrl(url);
  let browser;
  try {
    browser = await chromium.launch();
    // The entry page at 375, scroll 0: the state every other check is computed from.
    // Captured before the sweep so widening coverage cannot quietly move those verdicts.
    const ctx0 = await browser.newContext({ viewport: VIEWPORTS.mobile });
    const p0 = await ctx0.newPage();
    await p0.goto(url, { waitUntil: "networkidle", timeout });
    // A hidden page runs no requestAnimationFrame, and every scroll library drives
    // its progress from rAF. Measuring computed styles there reads a page whose
    // animations never started — silently, since the DOM still answers. Cheap assert.
    const visibility = await p0.evaluate(() => document.visibilityState);
    if (visibility !== "visible") {
      console.error(`[fetch] page reports visibilityState="${visibility}": rAF is suspended, so any animated or scroll-linked state is frozen at its start value. Computed measurements below cover the static page only.`);
    }
    const renderedHtml = await p0.content();
    const overflow = await p0.evaluate(() => {
      const de = document.documentElement;
      return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflow: de.scrollWidth > de.clientWidth + 1 };
    });
    // Discovery already happened in fetchTarget: the same list drives the static
    // per-page checks and this sweep, so the two can never disagree about what "the
    // site" means.
    const pages = opts.pageList && opts.pageList.length ? opts.pageList.slice(0, cap) : [url];
    await ctx0.close();

    const samples = [];
    const skipped = [];
    let states = 0;
    const measured = [];
    for (const view of views) {
      const ctx = await browser.newContext({ viewport: VIEWPORTS[view] });
      const page = await ctx.newPage();
      for (const target of pages) {
        try {
          // Same contract as the entry page: nothing reaches the browser unvalidated.
          // Discovered pages are same-origin, but --pages takes URLs from the caller.
          await validateUrl(target);
          const resp = await page.goto(target, { waitUntil: "networkidle", timeout });
          if (resp && resp.status() >= 400) { console.error(`[fetch] ${target} returned ${resp.status()}; skipped.`); continue; }
        } catch (e) { console.error(`[fetch] ${target} did not load (${e.message}); skipped.`); continue; }
        const r = await measureStates(page, target, view, stops);
        samples.push(...r.samples);
        skipped.push(...r.skipped);
        states += r.states;
        if (view === views[0]) measured.push(target);
      }
      await ctx.close();
    }
    /* Unmeasured in ELEMENTS, not attempts.
       Counted raw this was 490 against 1 failure, because 30 states re-drop the same
       offscreen paragraph 30 times. Two numbers in different units side by side is the
       units error the dedupe exists to prevent, and here it read as "the audit is blind"
       when the truth was "the audit looked 30 times". An element also only counts as
       unmeasured if NO state ever measured it: text that is offscreen at one stop and
       measured at the next is measured. */
    const measuredKeys = new Set(samples.map(s => `${s.page}|${s.domPath}`));
    const blind = new Map();
    for (const s of skipped) {
      const k = `${s.page}|${s.domPath}`;
      if (!measuredKeys.has(k) && !blind.has(k)) blind.set(k, s.unmeasurable);
    }
    const reasons = {};
    for (const why of blind.values()) reasons[why] = (reasons[why] || 0) + 1;
    console.error(`[fetch] contrast measured across ${measured.length} page(s) x ${states} scroll state(s) x ${views.length} viewport(s); ${measuredKeys.size} element(s) measured, ${blind.size} never measurable${blind.size ? ` (${Object.entries(reasons).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""}.`);
    return {
      renderedHtml, overflow,
      contrastSamples: samples,
      contrastUnmeasured: blind.size,
      contrastUnmeasuredReasons: reasons,
      coverage: { pages: measured.length, scrollStates: states, viewports: views, urls: measured },
    };
  } catch (e) {
    console.error(`[fetch] render failed: ${e.message}; degrading to raw fetch.`);
    return null;
  } finally { if (browser) await browser.close(); }
}

/* The in-page contrast sampler. Serialised into the browser by page.evaluate, so it
   closes over nothing and takes no arguments: everything it needs must be inside it. */
function SAMPLER() {
      const out = [];
      /* Resolve any CSS colour through the browser itself, by painting one pixel and
         reading it back. A regex for rgba() cannot do this job: Chrome serialises
         computed styles in the colour space they were authored in, so an oklch()
         token comes back as "oklch(...)" and the regex returns null. That is not a
         missed measurement, it is a FABRICATED one — the old code then assumed white
         and reported white-on-white at 1:1 for a red button. An audit that invents
         failures is worse than one that misses them, because it gets believed.
         The canvas round trip understands every colour the page can render, and it
         returns the exact sRGB bytes a viewer sees. */
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      const toRGB = (s) => {
        if (!s || s === "transparent") return null;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = s;            // invalid values leave fillStyle at #000...
        if (ctx.fillStyle === "#000000" && !/^#0{3,8}$|black|rgba?\(0,\s*0,\s*0/i.test(s.trim())) return null;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
      };
      const els = Array.from(document.querySelectorAll("body *"));
      let count = 0;
      for (const el of els) {
        if (count >= 400) break;
        const direct = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!direct) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue;
        /* getComputedStyle does NOT inherit display:none. A child of a display:none
           parent reports its own specified display, so the check above waves through
           entire subtrees that the browser never lays out — a responsive nav's desktop
           links at 375px, for instance, which we then "measured" and failed. Geometry
           does not lie: no box, no pixels, no reader, nothing to judge. */
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        /* Identity first: an element we skip still has to be nameable, or "could not
           measure this" degrades into silence, which is the thing we keep fixing. */
        const path = [];
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          path.push(Array.prototype.indexOf.call(n.parentNode.children, n));
        }
        const domPath = path.reverse().join("/");
        /* mix-blend-mode makes getComputedStyle a liar about the one thing we need.
           Under `difference`, cs.color is the SOURCE colour, and what lands on screen is
           |backdrop - source|: a caption computing as 3.47:1 was painting at 3.88:1. Both
           fail here, so the verdict survived by luck, and luck is not a method. Blend the
           other way and we would fail readable text with a number no pixel ever held.
           Computing the blend properly means implementing 16 modes against a backdrop we
           already only estimate. Not worth it: report it unmeasurable, name it, and let a
           human look. Missing beats inventing. */
        let blended = null;
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const b = getComputedStyle(n).mixBlendMode;
          if (b && b !== "normal") { blended = b; break; }
        }
        if (blended) { out.push({ unmeasurable: `mix-blend-mode:${blended}`, domPath }); continue; }
        // Gradient-filled text (background-clip:text + transparent colour) has no
        // single foreground to measure. Report it as its own defect, do not average
        // it into a ratio that means nothing.
        if (parseFloat(cs.color.match(/[\d.]+\)$/) ? cs.color.slice(cs.color.lastIndexOf(",") + 1) : "1") === 0) continue;
        const color = toRGB(cs.color);
        if (!color || color.a === 0) continue;
        let bgEl = el, bg = null, fromRoot = false;
        while (bgEl) { const b = toRGB(getComputedStyle(bgEl).backgroundColor); if (b && b.a > 0.9) { bg = b; break; } bgEl = bgEl.parentElement; }
        // No assumed white. An unresolved background is an unmeasurable sample, and
        // guessing one is how you manufacture a 1:1 failure out of thin air.
        if (!bg) continue;
        /* WHERE the background came from decides whether we may trust it. Walking
           parentElement answers "who is my ancestor", not "what is painted under me",
           and those diverge the moment a sibling layer paints below: a fixed nav over a
           full-bleed hero resolves to <body>, so dark-on-light reads as dark-on-dark and
           we invent a 1.1:1 failure on text a viewer sees at 16:1.
           The split is provenance. If the element or an ancestor paints its own opaque
           background, that IS the backdrop by construction (a red button is red wherever
           it sits, on screen or not) and the DOM answer stands. If the walk fell all the
           way through to <html>/<body>, nothing between the text and the root painted,
           and the DOM answer is a guess. Those we re-resolve against real pixels below. */
        fromRoot = bgEl === document.body || bgEl === document.documentElement;
        /* A declared, deliberate violation. Read here rather than inferred later: the
           author states it in the markup, the audit reports it, and nobody's judgment is
           silently overridden. Scope is this element, never the subtree. */
        const exempt = el.getAttribute("data-contrast-exempt");
        /* domPath is this element's stable identity, so the same text measured at
           several scroll stops and viewports collapses to ONE finding instead of ten.
           Position among siblings, root-ward: it survives restyling and reflow, which
           is exactly what changes between the states we are comparing. */
        out.push({
          color, bg, fromRoot,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          fontSizePx: parseFloat(cs.fontSize),
          weight: parseInt(cs.fontWeight, 10) || 400,
          exempt: exempt || null,
          exemptReason: el.getAttribute("data-contrast-exempt-reason") || null,
          domPath,
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
        });
        count++;
      }
      return out;
}

/* Second pass, for the samples whose backdrop the DOM only guessed (nothing painted
   between the text and the root). Ask the pixels instead: screenshot once, then for
   each box take the most common colour inside it. Glyph strokes cover a minority of a
   text box, so the modal pixel IS what sits behind them, and it accounts for sibling
   layers, gradients, images and backdrop-filter, none of which a parentElement walk
   can see.
   Two ways out, both honest: if the box is offscreen there are no pixels to read, and
   if no single colour holds a majority the backdrop is busy rather than flat, so the
   sample is dropped as unmeasurable. Dropping loses a data point; keeping would invent
   one. The rest of this file already made that trade. The count is returned, never
   swallowed: "could not read this" must not look like "this is fine".

   Viewport, NOT fullPage, and that is deliberate. Playwright builds a fullPage shot by
   scrolling and stitching, which on a scroll-linked page drives the very animations we
   are measuring: the strip would show a different act at every height while our rects
   were taken at scroll 0, so every coordinate would land on the wrong pixels. It would
   not widen coverage, it would fabricate it. Below-the-fold text on a bare root
   background is reported unmeasured instead. */
async function resolveRootBackdrops(page, entries) {
  // Entries the sampler already gave up on (blended text) travel through untouched:
  // they carry an identity and a reason, and the caller tallies them as coverage.
  const samples = entries.filter(s => !s.unmeasurable);
  const skipped = entries.filter(s => s.unmeasurable);
  const needed = samples.filter(s => s.fromRoot);
  if (!needed.length) return { samples, skipped };
  let shot;
  try { shot = await page.screenshot({ type: "png" }); }
  catch (e) {
    console.error(`[fetch] backdrop screenshot failed (${e.message}); dropping ${needed.length} sample(s) whose background could not be confirmed.`);
    return { samples: samples.filter(s => !s.fromRoot), skipped: [...skipped, ...needed.map(s => ({ unmeasurable: "backdrop-screenshot-failed", domPath: s.domPath }))] };
  }
  const verdicts = await page.evaluate(async ({ b64, boxes }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const dpr = img.width / window.innerWidth; // screenshots come back in device pixels
    return boxes.map((b) => {
      const x0 = Math.max(0, Math.round(b.x * dpr)), y0 = Math.max(0, Math.round(b.y * dpr));
      const x1 = Math.min(img.width, Math.round((b.x + b.w) * dpr)), y1 = Math.min(img.height, Math.round((b.y + b.h) * dpr));
      if (x1 - x0 < 1 || y1 - y0 < 1) return null;   // offscreen: no pixels, no verdict
      const d = c.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      const tally = new Map();
      const total = (x1 - x0) * (y1 - y0);
      for (let i = 0; i < d.length; i += 4) {
        const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        tally.set(k, (tally.get(k) || 0) + 1);
      }
      let bestK = -1, bestN = 0;
      for (const [k, n] of tally) if (n > bestN) { bestN = n; bestK = k; }
      if (bestN / total < 0.5) return null;          // busy backdrop: not one flat colour
      return { r: (bestK >> 16) & 255, g: (bestK >> 8) & 255, b: bestK & 255, a: 1 };
    });
  }, { b64: shot.toString("base64"), boxes: needed.map(s => s.rect) });

  const byIndex = new Map();
  needed.forEach((s, i) => byIndex.set(s, verdicts[i]));
  const kept = [];
  const out = [...skipped];
  for (const s of samples) {
    if (!s.fromRoot) { kept.push(s); continue; }
    const px = byIndex.get(s);
    if (!px) { out.push({ unmeasurable: "backdrop-not-confirmable", domPath: s.domPath }); continue; }
    kept.push({ ...s, bg: px });
  }
  return { samples: kept, skipped: out };
}

// Decide the client-rendered verdict from the signals we have.
function classifyClientRendered({ rawTextLen, renderedTextLen, shell, renderAvailable }) {
  if (renderAvailable && renderedTextLen != null) {
    const ratio = renderedTextLen / Math.max(rawTextLen, 1);
    if (rawTextLen < 400 && renderedTextLen >= 400 && ratio >= 2) return true;
    if (rawTextLen >= 400) return false;
    return ratio >= 2;
  }
  if (rawTextLen >= 400) return false;
  if (shell.emptyMount && shell.moduleBundles >= 1) return true;
  return "unknown";
}

export async function fetchTarget({ target, render: wantRender = false, robots: wantRobots = false, timeout = 15000, assets: wantAssets = true, assetsDir = null, renderOpts = {} } = {}) {
  const isUrl = isUrlStr(target);
  const { html, status, finalUrl, headers } = await rawFetch(target, isUrl, timeout);
  const baseUrl = finalUrl || (isUrl ? target : null);
  const robotsTxt = wantRobots ? await fetchRobots(baseUrl, isUrl) : null;
  const probes = (wantRobots && isUrl) ? await runProbes(baseUrl, timeout) : null;

  const rawTextLen = visibleText(html).length;
  const shell = shellSignals(html);

  let assetInfo = { css: "", js: "", cssFiles: [], jsFiles: [], skipped: [] };
  if (wantAssets) {
    try { assetInfo = await fetchAssets({ html, baseUrl, isUrl, localPath: isUrl ? null : resolve(target), timeout }); }
    catch (e) { console.error(`[fetch] asset collection failed: ${e.message}`); }
  }

  let mediaWeight = { tested: false };
  if (wantAssets) {
    try { mediaWeight = await measureMediaWeight({ html, js: assetInfo.js, baseUrl, isUrl, localPath: isUrl ? null : resolve(target), timeout }); }
    catch (e) { console.error(`[fetch] media weight probe failed: ${e.message}`); }
  }
  const scrolly = scrollySignals(html, assetInfo.js);
  const libs = libSignals(html, assetInfo.js);

  /* Which pages are "the site". Decided once, here, and reused by both the static
     per-page checks and the rendered sweep, so the two can never disagree about what
     was audited. Discovery is NOT gated on --render: "does every page have a title"
     is a question raw HTML can answer, and making it wait for a browser was an
     accident of where the code happened to live. */
  const pageCap = renderOpts.pages ?? 10;
  let pageList = baseUrl && isUrl ? [baseUrl.replace(/#.*$/, "")] : [];
  const extraPages = [];
  if (isUrl && pageCap > 1) {
    try {
      pageList = await discoverPages(baseUrl, html, timeout, renderOpts.explicitPages, pageCap);
      for (const u of pageList.slice(1)) {
        try {
          const p = await rawFetch(u, true, timeout);
          if (p.status >= 400) { console.error(`[fetch] ${u} returned ${p.status}; not audited.`); continue; }
          extraPages.push({ url: p.finalUrl || u, rawHtml: p.html, headers: p.headers, status: p.status });
        } catch (e) { console.error(`[fetch] ${u} could not be fetched (${e.message}); not audited.`); }
      }
    } catch (e) { console.error(`[fetch] page discovery failed (${e.message}); auditing the entry page only.`); }
  }

  let renderedHtml = null, computed = null, renderAvailable = false;
  if (wantRender) {
    if (!isUrl) console.error("[fetch] --render needs a URL; using raw HTML for the local file.");
    else {
      const r = await render(baseUrl, timeout, { ...renderOpts, pageList });
      if (r) {
        renderAvailable = true;
        renderedHtml = r.renderedHtml;
        computed = {
          horizontalOverflow375: r.overflow.overflow,
          scrollWidth375: r.overflow.scrollWidth,
          contrastUnmeasured: r.contrastUnmeasured || 0,
          contrastUnmeasuredReasons: r.contrastUnmeasuredReasons || null,
          contrastCoverage: r.coverage || null,
          contrastSamples: dedupeSamples((r.contrastSamples || []).map(s => {
            const large = s.fontSizePx >= 24 || (s.weight >= 700 && s.fontSizePx >= 18.66);
            const threshold = large ? 3.0 : 4.5;
            return {
              ratio: ratioFromSample(s), threshold, fontSizePx: s.fontSizePx,
              exempt: s.exempt || null, exemptReason: s.exemptReason || null,
              page: s.page || null, viewport: s.viewport || null, scrollY: s.scrollY ?? null,
              domPath: s.domPath || null, text: s.text || null,
            };
          })),
        };
      }
    }
  }
  const renderedTextLen = renderedHtml != null ? visibleText(renderedHtml).length : null;
  const clientRendered = classifyClientRendered({ rawTextLen, renderedTextLen, shell, renderAvailable });

  const result = {
    target, url: isUrl ? (baseUrl || target) : null, file: isUrl ? null : resolve(target),
    fetchedAt: new Date().toISOString(), status,
    render: renderAvailable ? "playwright" : "none",
    renderRequested: wantRender, renderAvailable,
    clientRendered,
    signals: { rawTextLen, renderedTextLen, rawNodeCount: nodeCount(html), shell, scrolly, libs },
    headers, probes: { ...(probes || {}), mediaWeight },
    rawHtml: html, renderedHtml, robotsTxt, computed,
    // The other pages of the site, for the checks that are questions about a document.
    // Raw HTML only: shared bundles and response-level facts belong to the origin and
    // are answered once, from the entry.
    pages: extraPages,
    pagesDiscovered: pageList,
    linkedCss: assetInfo.css, linkedJs: assetInfo.js,
    assets: { cssFiles: assetInfo.cssFiles, jsFiles: assetInfo.jsFiles, skipped: assetInfo.skipped },
  };

  if (assetsDir) {
    try {
      result.assetsWritten = writeAssets(result, assetsDir);
      result.assetsDir = resolve(assetsDir);
      console.error(`[fetch] wrote ${result.assetsWritten.length} asset file(s) to ${assetsDir} (${assetInfo.cssFiles.length} css, ${assetInfo.jsFiles.length} js linked; ${assetInfo.skipped.length} skipped)`);
    } catch (e) { console.error(`[fetch] asset write failed: ${e.message}`); }
  }

  warnClientRendered(result);
  return result;
}

// Print the client-rendered warning to stderr so a human or the orchestrator sees it.
export function warnClientRendered(r) {
  const { clientRendered, renderAvailable, signals: { rawTextLen, renderedTextLen, shell } } = r;
  if (clientRendered === true && !renderAvailable) {
    console.error(`[fetch] WARNING: ${r.target} looks client-rendered (empty #${shell.mountId || "mount"}, ${shell.moduleBundles} JS bundle(s), ${rawTextLen} chars of server text). Raw HTML is a shell. Re-run with --render for a faithful audit.`);
  } else if (clientRendered === true && renderAvailable) {
    console.error(`[fetch] note: ${r.target} is client-rendered; audited the rendered DOM (${renderedTextLen} chars vs ${rawTextLen} raw).`);
  } else if (clientRendered === "unknown") {
    console.error(`[fetch] note: low server text (${rawTextLen} chars) but no clear SPA shell; client-rendering unknown. --render to be sure.`);
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
import { fileURLToPath } from "node:url";
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("-")) {
    console.error("Usage: node tools/audit/fetch.mjs <url|file> [--render] [--robots] [--assets-dir DIR] [--no-assets] [--out file.json] [--timeout ms]");
    process.exit(2);
  }
  const opt = (name) => args.includes(name);
  const val = (name, d) => { const i = args.indexOf(name); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
  const outFile = val("--out", null);
  const result = await fetchTarget({
    target: args[0], render: opt("--render"), robots: opt("--robots"),
    timeout: parseInt(val("--timeout", "15000"), 10),
    assets: !opt("--no-assets"), assetsDir: val("--assets-dir", null),
  });
  const json = JSON.stringify(result, null, 2);
  if (outFile) { writeFileSync(outFile, json); console.error(`[fetch] wrote ${outFile}`); }
  else process.stdout.write(json + "\n");
}
