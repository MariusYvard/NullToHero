#!/usr/bin/env node
/**
 * fetch.mjs — shared fetch phase for /audit.
 *
 * Retrieves a target's HTML once. By default it reads the server response only
 * (raw HTML, no JavaScript). With --render it loads the page in headless
 * Chromium (Playwright) so a client-rendered SPA is audited as a user sees it,
 * not as an empty shell, and collects computed-style facts (contrast samples,
 * 375px horizontal overflow) the static analyzer cannot get from raw HTML.
 *
 * It always reports whether the page looks client-rendered, so a raw-only fetch
 * of a React/Vue SPA is FLAGGED rather than silently audited as a blank page.
 *
 * Usage:
 *   node tools/audit/fetch.mjs <url|file> [--render] [--robots] [--out file.json] [--timeout 15000]
 *
 * Playwright is an optional peer dependency. Without it, --render degrades to a
 * raw fetch with a clear warning. Exit 0 on fetch, 2 on usage/target error.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse, textContent, queryAll } from "./lib/html.mjs";
import { flatten, contrastRatio } from "./lib/contrast.mjs";

const isUrlStr = (t) => /^https?:\/\//i.test(t);

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

async function rawFetch(target, isUrl, timeout) {
  if (isUrl) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(target, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": "NullToHero-audit/1.0 (+https://github.com/MariusYvard/NullToHero)" } });
      const html = await res.text();
      return { html, status: res.status, finalUrl: res.url };
    } finally { clearTimeout(t); }
  }
  const p = resolve(target);
  if (!existsSync(p)) { console.error(`[fetch] file not found: ${p}`); process.exit(2); }
  return { html: readFileSync(p, "utf8"), status: 200, finalUrl: null };
}

async function fetchRobots(baseUrl, isUrl) {
  if (!isUrl) return null;
  try {
    const u = new URL("/robots.txt", baseUrl);
    const res = await fetch(u, { redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
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

export async function fetchTarget({ target, render: wantRender = false, robots: wantRobots = false, timeout = 15000 } = {}) {
  const isUrl = isUrlStr(target);
  const { html, status, finalUrl } = await rawFetch(target, isUrl, timeout);
  const baseUrl = finalUrl || (isUrl ? target : null);
  const robotsTxt = wantRobots ? await fetchRobots(baseUrl, isUrl) : null;

  const rawTextLen = visibleText(html).length;
  const shell = shellSignals(html);

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
    signals: { rawTextLen, renderedTextLen, rawNodeCount: nodeCount(html), shell },
    rawHtml: html, renderedHtml, robotsTxt, computed,
  };

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
    console.error("Usage: node tools/audit/fetch.mjs <url|file> [--render] [--robots] [--out file.json] [--timeout ms]");
    process.exit(2);
  }
  const opt = (name) => args.includes(name);
  const val = (name, d) => { const i = args.indexOf(name); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
  const outFile = val("--out", null);
  const result = await fetchTarget({ target: args[0], render: opt("--render"), robots: opt("--robots"), timeout: parseInt(val("--timeout", "15000"), 10) });
  const json = JSON.stringify(result, null, 2);
  if (outFile) { writeFileSync(outFile, json); console.error(`[fetch] wrote ${outFile}`); }
  else process.stdout.write(json + "\n");
}
