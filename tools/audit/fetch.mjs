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

const UA = "NullToHero-audit/1.0 (+https://github.com/MariusYvard/NullToHero)";
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
      const res = await fetch(target, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": UA } });
      const html = await res.text();
      return { html, status: res.status, finalUrl: res.url, headers: headersToObject(res.headers) };
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
    const res = await fetch(u, { redirect: "follow", headers: { "user-agent": UA } });
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
    const res = await fetch(u, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": UA } });
    try { await res.body?.cancel(); } catch { /* ignore */ }
    return { status: res.status, finalUrl: res.url, ok: res.ok };
  } catch (e) { return { error: e.name === "AbortError" ? "timeout" : e.message }; }
  finally { clearTimeout(t); }
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
    let res = await fetch(u, { method: "HEAD", signal: ctrl.signal, redirect: "follow", headers: { "user-agent": UA } });
    let cl = res.ok ? res.headers.get("content-length") : null;
    if (!cl) {
      res = await fetch(u, { method: "GET", signal: ctrl.signal, redirect: "follow", headers: { "user-agent": UA, range: "bytes=0-0" } });
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
    const res = await fetch(u, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": UA } });
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

// Render with Playwright. Returns { renderedHtml, overflow, contrastSamples } or
// null when Playwright is unavailable (import or launch failure).
async function render(url, timeout) {
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch { console.error("[fetch] --render requested but Playwright is not installed; degrading to raw fetch. Install: npm i -D playwright && npx playwright install chromium"); return null; }
  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout });
    // A hidden page runs no requestAnimationFrame, and every scroll library drives
    // its progress from rAF. Measuring computed styles there reads a page whose
    // animations never started — silently, since the DOM still answers. Cheap assert.
    const visibility = await page.evaluate(() => document.visibilityState);
    if (visibility !== "visible") {
      console.error(`[fetch] page reports visibilityState="${visibility}": rAF is suspended, so any animated or scroll-linked state is frozen at its start value. Computed measurements below cover the static page only.`);
    }
    const renderedHtml = await page.content();
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflow: de.scrollWidth > de.clientWidth + 1 };
    });
    const contrastSamples = await page.evaluate(() => {
      const out = [];
      const toRGB = (s) => { const m = (s || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
      const els = Array.from(document.querySelectorAll("body *"));
      let count = 0;
      for (const el of els) {
        if (count >= 400) break;
        const direct = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!direct) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue;
        const color = toRGB(cs.color);
        let bgEl = el, bg = null;
        while (bgEl) { const b = toRGB(getComputedStyle(bgEl).backgroundColor); if (b && b.a > 0) { bg = b; break; } bgEl = bgEl.parentElement; }
        if (!bg) bg = { r: 255, g: 255, b: 255, a: 1 };
        if (!color) continue;
        out.push({ color, bg, fontSizePx: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) || 400 });
        count++;
      }
      return out;
    });
    return { renderedHtml, overflow, contrastSamples };
  } catch (e) {
    console.error(`[fetch] render failed: ${e.message}; degrading to raw fetch.`);
    return null;
  } finally { if (browser) await browser.close(); }
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

export async function fetchTarget({ target, render: wantRender = false, robots: wantRobots = false, timeout = 15000, assets: wantAssets = true, assetsDir = null } = {}) {
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

  let renderedHtml = null, computed = null, renderAvailable = false;
  if (wantRender) {
    if (!isUrl) console.error("[fetch] --render needs a URL; using raw HTML for the local file.");
    else {
      const r = await render(baseUrl, timeout);
      if (r) {
        renderAvailable = true;
        renderedHtml = r.renderedHtml;
        computed = {
          horizontalOverflow375: r.overflow.overflow,
          scrollWidth375: r.overflow.scrollWidth,
          contrastSamples: (r.contrastSamples || []).map(s => {
            const large = s.fontSizePx >= 24 || (s.weight >= 700 && s.fontSizePx >= 18.66);
            return { ratio: ratioFromSample(s), threshold: large ? 3.0 : 4.5, fontSizePx: s.fontSizePx };
          }),
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
