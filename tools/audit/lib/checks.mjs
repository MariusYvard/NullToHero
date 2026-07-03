// Deterministic, render-free check engine. Given parsed HTML (and optionally a
// rendered DOM, robots.txt, response headers, a CSS model, and computed facts
// from a Playwright pass), it returns objective per-check verdicts. The model
// never decides these; the code does. Each check maps to the audit sub-agent that
// owns the dimension so the orchestrator can hand an agent its ground truth.
//
// Pure Node standard library. No network, no execution of page content.

import { parse, queryAll, first, textContent, styleMap, resolveBackgroundStr, ancestors } from "./html.mjs";
import { ratioOf, aaThreshold, parseColor, luminance } from "./contrast.mjs";
import { parseStylesheet, computeElementStyle, pageBackground, pickColor } from "./css.mjs";

// dimension/agent constants — kept in lockstep with agents/*.md
const A11Y    = { agent: "inspect-agent-a11y",     dimension: "Front-end Defects" };
const LAYOUT  = { agent: "inspect-agent-layout",   dimension: "Front-end Defects" };
const TECH    = { agent: "seo-agent-technical",    dimension: "Search Visibility" };
const CONTENT = { agent: "seo-agent-content",      dimension: "Search Visibility" };

const TEXTISH = new Set(["p","span","a","li","td","th","div","button","label",
  "strong","em","small","b","i","h1","h2","h3","h4","h5","h6","figcaption",
  "blockquote","cite","dd","dt","summary","caption"]);

function mk(o) {
  return {
    id: o.id, label: o.label, dimension: o.dimension, agent: o.agent,
    verdict: o.verdict, critical: !!o.critical, method: o.method,
    value: o.value === undefined ? null : o.value, detail: o.detail || "",
  };
}

function fontSizePx(st, tag) {
  const v = st["font-size"];
  if (v) {
    const m = v.match(/^([\d.]+)\s*(px|pt|rem|em)?$/);
    if (m) {
      const n = parseFloat(m[1]);
      switch (m[2]) {
        case "pt": return n * 4 / 3;
        case "rem": case "em": return n * 16;
        default: return n; // px or unit-less
      }
    }
  }
  if (tag === "h1") return 32;
  if (tag === "h2") return 24;
  return 16;
}

function isBold(st, el) {
  const w = (st["font-weight"] || "").toLowerCase();
  if (w === "bold" || w === "bolder") return true;
  const num = parseInt(w, 10);
  if (Number.isFinite(num) && num >= 700) return true;
  if (["b","strong","h1","h2","h3"].includes(el.tag)) return true;
  for (const a of ancestors(el)) if (a.tag === "b" || a.tag === "strong") return true;
  return false;
}

// ── individual checks ─────────────────────────────────────────────────────────

function checkViewport(doc) {
  const metas = queryAll(doc, "meta").filter(m => (m.attrs.name || "").toLowerCase() === "viewport");
  if (metas.length === 0) {
    return mk({ id: "viewport-meta", label: "Viewport meta", ...LAYOUT, verdict: "FAIL",
      method: "static", value: null, detail: "No <meta name=\"viewport\"> — page will not adapt to mobile widths." });
  }
  const content = (metas[0].attrs.content || "").toLowerCase();
  if (!/width\s*=\s*device-width/.test(content)) {
    return mk({ id: "viewport-meta", label: "Viewport meta", ...LAYOUT, verdict: "WARN",
      method: "static", value: content, detail: "Viewport present but missing width=device-width." });
  }
  if (/user-scalable\s*=\s*(no|0)/.test(content) || /maximum-scale\s*=\s*1(\.0)?\b/.test(content)) {
    return mk({ id: "viewport-meta", label: "Viewport meta", ...LAYOUT, verdict: "WARN",
      method: "static", value: content, detail: "Viewport blocks pinch-zoom (user-scalable=no / maximum-scale=1) — accessibility issue." });
  }
  return mk({ id: "viewport-meta", label: "Viewport meta", ...LAYOUT, verdict: "PASS",
    method: "static", value: content, detail: "Responsive viewport declared." });
}

function hasDims(el) {
  const a = el.attrs || {};
  if (a.width !== undefined && a.height !== undefined) return true;
  const st = styleMap(el);
  if (st.width && st.height) return true;
  if (st["aspect-ratio"]) return true;
  return false;
}

function checkImgDimensions(doc) {
  const imgs = queryAll(doc, "img");
  if (imgs.length === 0) {
    return mk({ id: "img-dimensions", label: "Image width/height", ...LAYOUT, verdict: "PASS",
      method: "static", value: { total: 0, missing: 0 }, detail: "No <img> elements." });
  }
  const missing = imgs.filter(im => !hasDims(im)).length;
  const value = { total: imgs.length, missing };
  if (missing === 0) {
    return mk({ id: "img-dimensions", label: "Image width/height", ...LAYOUT, verdict: "PASS",
      method: "static", value, detail: `All ${imgs.length} images declare width and height.` });
  }
  const verdict = missing >= 3 ? "FAIL" : "WARN";
  return mk({ id: "img-dimensions", label: "Image width/height", ...LAYOUT, verdict,
    method: "static", value,
    detail: `${missing}/${imgs.length} images lack explicit width/height (CLS risk).` });
}

function checkHtmlLang(doc) {
  const htmlEl = first(doc, "html");
  const lang = htmlEl && (htmlEl.attrs.lang || "").trim();
  if (lang) {
    return mk({ id: "html-lang", label: "HTML lang attribute", ...A11Y, verdict: "PASS",
      method: "static", value: lang, detail: `Document language declared (lang="${lang}").` });
  }
  return mk({ id: "html-lang", label: "HTML lang attribute", ...A11Y, verdict: "FAIL",
    method: "static", value: null, detail: "<html> has no lang attribute — screen readers cannot pick a voice." });
}

function checkTitle(doc) {
  const t = first(doc, "title");
  const text = t ? textContent(t).trim() : "";
  if (!text) {
    return mk({ id: "title-tag", label: "Title tag", ...CONTENT, verdict: "FAIL",
      method: "static", value: 0, detail: "Missing or empty <title>." });
  }
  const len = text.length;
  if (len > 60) {
    return mk({ id: "title-tag", label: "Title tag", ...CONTENT, verdict: "WARN",
      method: "static", value: len, detail: `Title is ${len} chars (over ~60 may truncate in SERP).` });
  }
  if (len < 10) {
    return mk({ id: "title-tag", label: "Title tag", ...CONTENT, verdict: "WARN",
      method: "static", value: len, detail: `Title is only ${len} chars (thin).` });
  }
  return mk({ id: "title-tag", label: "Title tag", ...CONTENT, verdict: "PASS",
    method: "static", value: len, detail: `Title present (${len} chars).` });
}

function checkMetaDescription(doc) {
  const metas = queryAll(doc, "meta").filter(m => (m.attrs.name || "").toLowerCase() === "description");
  const content = metas.length ? (metas[0].attrs.content || "").trim() : "";
  if (!content) {
    return mk({ id: "meta-description", label: "Meta description", ...CONTENT, verdict: "WARN",
      method: "static", value: 0, detail: "No meta description — Google may synthesize a snippet." });
  }
  const len = content.length;
  if (len > 160) {
    return mk({ id: "meta-description", label: "Meta description", ...CONTENT, verdict: "WARN",
      method: "static", value: len, detail: `Meta description is ${len} chars (over ~160 truncates).` });
  }
  if (len < 50) {
    return mk({ id: "meta-description", label: "Meta description", ...CONTENT, verdict: "WARN",
      method: "static", value: len, detail: `Meta description is ${len} chars (short).` });
  }
  return mk({ id: "meta-description", label: "Meta description", ...CONTENT, verdict: "PASS",
    method: "static", value: len, detail: `Meta description present (${len} chars).` });
}

function checkHeadingOrder(doc) {
  // collect headings in document order
  const order = [];
  const rec = (n) => {
    for (const c of n.children) {
      if (c.type === "element") {
        if (/^h[1-6]$/.test(c.tag)) order.push(Number(c.tag[1]));
        rec(c);
      }
    }
  };
  rec(doc);
  if (order.length === 0) {
    return mk({ id: "heading-order", label: "Heading order", ...CONTENT, verdict: "WARN",
      method: "static", value: { count: 0 }, detail: "No headings found." });
  }
  const h1 = order.filter(l => l === 1).length;
  let skip = null;
  for (let i = 1; i < order.length; i++) {
    if (order[i] > order[i - 1] + 1) { skip = [order[i - 1], order[i]]; break; }
  }
  const value = { count: order.length, h1, sequence: order };
  if (skip) {
    return mk({ id: "heading-order", label: "Heading order", ...CONTENT, verdict: "FAIL",
      method: "static", value, detail: `Heading level skipped (h${skip[0]} jumps to h${skip[1]}).` });
  }
  if (h1 === 0) {
    return mk({ id: "heading-order", label: "Heading order", ...CONTENT, verdict: "WARN",
      method: "static", value, detail: "No <h1> on the page." });
  }
  if (h1 > 1) {
    return mk({ id: "heading-order", label: "Heading order", ...CONTENT, verdict: "WARN",
      method: "static", value, detail: `${h1} <h1> elements (expected one primary heading).` });
  }
  return mk({ id: "heading-order", label: "Heading order", ...CONTENT, verdict: "PASS",
    method: "static", value, detail: `One h1, ${order.length} headings, no skipped levels.` });
}

function checkRobots(robotsTxt, url) {
  if (robotsTxt == null) {
    return mk({ id: "robots-disallow", label: "robots.txt crawlability", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "robots.txt not provided to the analyzer." });
  }
  let path = "/";
  try { if (url) path = new URL(url).pathname || "/"; } catch { /* keep / */ }

  // Build the rule set that applies to a generic crawler: the '*' group plus
  // googlebot, which is what an SEO crawlability check cares about.
  const lines = robotsTxt.split(/\r?\n/).map(l => l.replace(/#.*$/, "").trim());
  let groups = [], cur = null;
  for (const line of lines) {
    const m = line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1].toLowerCase(), val = m[2].trim();
    if (field === "user-agent") {
      if (cur && !cur._open) { cur = null; }
      if (!cur) { cur = { agents: [], rules: [], _open: true }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
    } else if (cur) {
      cur._open = false;
      cur.rules.push({ type: field, val });
    }
  }
  const relevant = groups.filter(g => g.agents.some(a => a === "*" || a === "googlebot"));
  const disallows = [];
  for (const g of relevant) for (const r of g.rules) if (r.type === "disallow" && r.val) disallows.push(r.val);

  if (disallows.some(d => d === "/")) {
    return mk({ id: "robots-disallow", label: "robots.txt crawlability", ...TECH, verdict: "FAIL", critical: true,
      method: "static", value: { disallows }, detail: "robots.txt has Disallow: / — the whole site is blocked from crawling." });
  }
  const blocking = disallows.find(d => path.startsWith(d));
  if (blocking) {
    return mk({ id: "robots-disallow", label: "robots.txt crawlability", ...TECH, verdict: "FAIL", critical: true,
      method: "static", value: { path, rule: blocking }, detail: `robots.txt blocks this page (Disallow: ${blocking}).` });
  }
  return mk({ id: "robots-disallow", label: "robots.txt crawlability", ...TECH, verdict: "PASS",
    method: "static", value: { disallows }, detail: disallows.length ? `Page allowed; ${disallows.length} Disallow rule(s) do not match ${path}.` : "robots.txt present, nothing disallowed." });
}

// ── contrast (token-aware static path) ─────────────────────────────────────────

function hasDirectText(el) {
  for (const c of el.children) if (c.type === "text" && c.value.replace(/\s+/g, "").length > 1) return true;
  return false;
}
function styleFor(node, model, memo) {
  let st = memo.get(node);
  if (!st) { st = computeElementStyle(node, model, styleMap(node)); memo.set(node, st); }
  return st;
}
// Inherited text color: first ancestor (or self) with a resolvable color.
function colorUp(el, model, memo) {
  for (const node of [el, ...ancestors(el)]) {
    if (node.type !== "element") continue;
    const st = styleFor(node, model, memo);
    const c = (st.color || "").trim().toLowerCase();
    if (c && c !== "inherit" && c !== "currentcolor") return { color: st.color.trim(), st };
  }
  return null;
}
function parseableColor(s) { return !!parseColor(s); }
// Resolve the nearest background. Returns { bg, unresolved }: unresolved=true when
// the nearest paint is a gradient, image or a value we cannot turn into a color,
// so the caller SKIPS the sample rather than assuming white (the main source of
// render-free false positives on hero sections).
function bgResolve(el, model, memo, pageBg) {
  for (const node of [el, ...ancestors(el)]) {
    if (node.type !== "element") continue;
    const st = styleFor(node, model, memo);
    const bc = (st["background-color"] || "").trim();
    if (bc) {
      const low = bc.toLowerCase();
      if (low !== "transparent" && low !== "inherit") {
        return parseableColor(bc) ? { bg: bc, unresolved: false, explicit: true } : { bg: null, unresolved: true };
      }
    }
    const bg = (st["background"] || "").trim();
    if (bg) {
      if (/gradient|url\(/i.test(bg)) return { bg: null, unresolved: true };
      const col = pickColor(bg);
      if (col && parseableColor(col)) {
        const low = col.toLowerCase();
        if (low !== "transparent" && low !== "inherit") return { bg: col, unresolved: false, explicit: true };
      } else {
        return { bg: null, unresolved: true };
      }
    }
    const bimg = (st["background-image"] || "").trim();
    if (bimg && /gradient|url\(/i.test(bimg)) return { bg: null, unresolved: true };
  }
  // Nothing painted in the chain. A real page background (body/:root) is trusted;
  // a bare white default is not (a section we could not resolve may sit under it).
  if (pageBg && parseableColor(pageBg)) return { bg: pageBg, unresolved: false, explicit: true };
  return { bg: "#ffffff", unresolved: false, explicit: false };
}

function checkContrast(doc, computed, cssModel) {
  if (computed && Array.isArray(computed.contrastSamples)) {
    const fails = computed.contrastSamples.filter(s => s.ratio < s.threshold);
    if (computed.contrastSamples.length === 0) {
      return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "NOT_MEASURED", critical: true,
        method: "computed", value: null, detail: "Render produced no text samples to measure." });
    }
    if (fails.length) {
      const worst = fails.reduce((a, b) => a.ratio < b.ratio ? a : b);
      return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "FAIL", critical: true,
        method: "computed", value: { failures: fails.length, worst: worst.ratio },
        detail: `${fails.length} text sample(s) below AA; worst ${worst.ratio}:1 (need ${worst.threshold}:1).` });
    }
    return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "PASS", critical: true,
      method: "computed", value: { samples: computed.contrastSamples.length }, detail: "All measured text meets AA contrast." });
  }

  // Static path. With a CSS model (inline <style> + linked stylesheets) resolve
  // token colors and the tag/class cascade; without one, fall back to inline
  // color attributes only (the render-free minimum).
  const samples = [];
  if (cssModel) {
    const memo = new Map();
    const pageBg = pageBackground(cssModel);
    const visit = (n) => {
      for (const c of n.children) {
        if (c.type !== "element") continue;
        if (TEXTISH.has(c.tag) && hasDirectText(c)) {
          const cu = colorUp(c, cssModel, memo);
          if (cu && parseableColor(cu.color)) {
            const { bg, unresolved, explicit } = bgResolve(c, cssModel, memo, pageBg);
            const fgc = parseColor(cu.color), bgc = bg ? parseColor(bg) : null;
            if (!unresolved && bg && fgc && bgc) {
              const lf = luminance(fgc), lb = luminance(bgc);
              // Skip the two cases a render-free cascade gets wrong: (1) light text on
              // an assumed-white background (a section we could not resolve), and
              // (2) dark text on a dark background — a contextual light override set
              // by a descendant selector we do not model, that we missed. Both are
              // cascade artifacts, not real failures; --render resolves them.
              const ambiguousLight = !explicit && lf > 0.4;
              const darkOnDark = lf < 0.25 && lb < 0.25;
              if (!ambiguousLight && !darkOnDark) {
                const r = ratioOf(cu.color, bg);
                if (r) samples.push({ tag: c.tag, ratio: r.ratio, threshold: aaThreshold({ fontSizePx: fontSizePx(cu.st, c.tag), bold: isBold(cu.st, c) }) });
              }
            }
          }
        }
        if (samples.length < 800) visit(c);
      }
    };
    visit(doc);
  } else {
    const visit = (n) => {
      for (const c of n.children) {
        if (c.type !== "element") continue;
        if (TEXTISH.has(c.tag)) {
          const st = styleMap(c);
          if (st.color) {
            const bgStr = resolveBackgroundStr(c);
            const r = ratioOf(st.color, bgStr);
            if (r) samples.push({ tag: c.tag, ratio: r.ratio, threshold: aaThreshold({ fontSizePx: fontSizePx(st, c.tag), bold: isBold(st, c) }) });
          }
        }
        visit(c);
      }
    };
    visit(doc);
  }

  if (samples.length === 0) {
    return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "NOT_MEASURED", critical: false,
      method: "not-measured", value: null,
      detail: "No resolvable text colors to measure statically — run with --render for computed-style contrast (ground truth)." });
  }
  // Static contrast is a render-free ESTIMATE (no gradients, images, media queries
  // or specificity), so it informs the floor but is never critical: only the
  // Playwright-computed path above caps the score. This prevents a heuristic from
  // forcing a page to the Critical band.
  const fails = samples.filter(s => s.ratio < s.threshold);
  if (fails.length) {
    const worst = fails.reduce((a, b) => a.ratio < b.ratio ? a : b);
    return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "FAIL", critical: false,
      method: "static", value: { samples: samples.length, failures: fails.length, worst: worst.ratio },
      detail: `${fails.length}/${samples.length} resolved text sample(s) below AA; worst ${worst.ratio}:1 (need ${worst.threshold}:1). Static estimate over samples with a known background; confirm with --render.` });
  }
  return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "PASS", critical: false,
    method: "static", value: { samples: samples.length }, detail: `All ${samples.length} resolved text sample(s) meet AA (static estimate over samples with a known background).` });
}

function checkOverflow375(doc, computed) {
  if (computed && typeof computed.horizontalOverflow375 === "boolean") {
    return computed.horizontalOverflow375
      ? mk({ id: "horizontal-overflow-375", label: "No horizontal scroll at 375px", ...LAYOUT, verdict: "FAIL",
          method: "computed", value: computed.scrollWidth375 || null, detail: `Page scrolls horizontally at 375px (scrollWidth ${computed.scrollWidth375}px > 375px).` })
      : mk({ id: "horizontal-overflow-375", label: "No horizontal scroll at 375px", ...LAYOUT, verdict: "PASS",
          method: "computed", value: null, detail: "No horizontal scroll at a 375px viewport." });
  }
  // Static heuristic: explicit width sources that commonly overflow a 375px screen.
  const hits = [];
  const visit = (n) => {
    for (const c of n.children) {
      if (c.type !== "element") continue;
      const st = styleMap(c);
      const w = st.width || "", mw = st["min-width"] || "";
      if (/\b100vw\b/.test(w) || /\b100vw\b/.test(mw)) hits.push(`${c.tag}{${/min-width/.test(mw)?"min-":""}width:100vw}`);
      const px = w.match(/^([\d.]+)px$/);
      if (px && parseFloat(px[1]) > 600) hits.push(`${c.tag}{width:${px[1]}px}`);
      const mpx = mw.match(/^([\d.]+)px$/);
      if (mpx && parseFloat(mpx[1]) > 420) hits.push(`${c.tag}{min-width:${mpx[1]}px}`);
      // Note: bare width/height ATTRIBUTES on img/table are deliberately NOT a
      // signal here — they are near-always constrained by responsive CSS
      // (max-width:100%). Real image overflow is caught by the rendered pass.
      visit(c);
    }
  };
  visit(doc);
  if (hits.length) {
    return mk({ id: "horizontal-overflow-375", label: "No horizontal scroll at 375px", ...LAYOUT, verdict: "WARN",
      method: "static", value: hits.slice(0, 8),
      detail: `Possible 375px overflow from fixed widths (static heuristic, not laid out): ${hits.slice(0, 4).join(", ")}.` });
  }
  return mk({ id: "horizontal-overflow-375", label: "No horizontal scroll at 375px", ...LAYOUT, verdict: "PASS",
    method: "static", value: [], detail: "No fixed-width overflow source found statically (run with --render to lay out)." });
}

// ── security headers and canonical / preview (deterministic from the response) ──

const PREVIEW_HOSTS = /\.(netlify\.app|vercel\.app|pages\.dev|github\.io|web\.app|onrender\.com|surge\.sh|fly\.dev)$/i;

function hostOf(u) { try { return new URL(u).host.toLowerCase(); } catch { return null; } }

function checkSecurityHeaders(headers, url) {
  if (!headers || typeof headers !== "object") {
    return mk({ id: "security-headers", label: "Security headers", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No HTTP response headers available (local file, or headers not captured)." });
  }
  const h = {}; for (const k of Object.keys(headers)) h[k.toLowerCase()] = headers[k];
  let isHttps = false; try { isHttps = new URL(url).protocol === "https:"; } catch { /* unknown */ }
  const csp = h["content-security-policy"] || "";
  const present = {
    hsts: !!h["strict-transport-security"],
    csp: !!csp,
    xFrameOptions: !!h["x-frame-options"],
    xContentTypeOptions: /nosniff/i.test(h["x-content-type-options"] || ""),
    referrerPolicy: !!h["referrer-policy"],
  };
  const frameProtected = present.xFrameOptions || /frame-ancestors/i.test(csp);
  const missing = [];
  if (isHttps && !present.hsts) missing.push("Strict-Transport-Security");
  if (!present.xContentTypeOptions) missing.push("X-Content-Type-Options: nosniff");
  if (!frameProtected) missing.push("X-Frame-Options / CSP frame-ancestors");
  if (!present.referrerPolicy) missing.push("Referrer-Policy");
  const value = { present, missing };
  if (missing.length === 0) {
    return mk({ id: "security-headers", label: "Security headers", ...TECH, verdict: "PASS",
      method: "static", value, detail: "HSTS, X-Content-Type-Options, frame protection and Referrer-Policy all present." });
  }
  // Hardening signal, not an indexing blocker: never critical.
  const verdict = missing.length >= 3 ? "FAIL" : "WARN";
  return mk({ id: "security-headers", label: "Security headers", ...TECH, verdict,
    method: "static", value, detail: `Missing hardening header(s): ${missing.join(", ")}.` });
}

function checkCanonicalPreview(doc, url) {
  if (!url) {
    return mk({ id: "canonical-url", label: "Canonical / preview", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "Canonical and preview-host checks apply to a fetched URL, not a local file." });
  }
  const links = queryAll(doc, "link").filter(l => (l.attrs.rel || "").toLowerCase().split(/\s+/).includes("canonical"));
  const canonical = links.length ? (links[0].attrs.href || "").trim() : "";
  const host = hostOf(url);
  const isPreview = host ? PREVIEW_HOSTS.test(host) : false;
  const robotsMeta = queryAll(doc, "meta").find(m => (m.attrs.name || "").toLowerCase() === "robots");
  const noindex = robotsMeta ? /noindex/i.test(robotsMeta.attrs.content || "") : false;

  if (!canonical) {
    if (isPreview) {
      return mk({ id: "canonical-url", label: "Canonical / preview", ...TECH, verdict: noindex ? "PASS" : "WARN",
        method: "static", value: { host, preview: true, canonical: null, noindex },
        detail: noindex ? "Preview host with noindex — correctly kept out of the index."
          : "Preview deploy host without a canonical or noindex — add <meta name=\"robots\" content=\"noindex\"> so the preview is not indexed alongside production." });
    }
    return mk({ id: "canonical-url", label: "Canonical / preview", ...TECH, verdict: "WARN",
      method: "static", value: { host, preview: false, canonical: null },
      detail: "No <link rel=\"canonical\"> — add one to consolidate ranking signals." });
  }
  const canonHost = hostOf(canonical) || host;
  const crossDomain = !!host && !!canonHost && canonHost !== host;
  if (isPreview && crossDomain) {
    // A preview host whose canonical points to production is the INTENDED setup.
    return mk({ id: "canonical-url", label: "Canonical / preview", ...TECH, verdict: "PASS",
      method: "static", value: { host, preview: true, canonical, canonHost, noindex },
      detail: `Preview host canonical points to production (${canonHost}); recommend also adding noindex on the preview. Not a canonical error.` });
  }
  if (crossDomain) {
    return mk({ id: "canonical-url", label: "Canonical / preview", ...TECH, verdict: "WARN",
      method: "static", value: { host, preview: false, canonical, canonHost },
      detail: `Canonical points to a different domain (${canonHost}) — intentional for syndication, otherwise it de-indexes this domain.` });
  }
  return mk({ id: "canonical-url", label: "Canonical / preview", ...TECH, verdict: "PASS",
    method: "static", value: { host, canonical }, detail: "Canonical URL present and same-origin." });
}

// ── engine ────────────────────────────────────────────────────────────────────

export function runChecks({ rawHtml = "", renderedHtml = null, robotsTxt = null, url = null, computed = null, headers = null, css = "" } = {}) {
  const rawDoc = parse(rawHtml || "");
  const activeDoc = renderedHtml ? parse(renderedHtml) : rawDoc;
  // Build a CSS model from inline <style> blocks plus any linked stylesheets so
  // the static contrast pass can resolve token colors without a browser.
  const styleText = (queryAll(activeDoc, "style").map(s => textContent(s)).join("\n") + "\n" + (css || "")).trim();
  const cssModel = styleText ? parseStylesheet(styleText) : null;
  const checks = [
    checkViewport(activeDoc),
    checkImgDimensions(activeDoc),
    checkOverflow375(activeDoc, computed),
    checkContrast(activeDoc, computed, cssModel),
    checkHtmlLang(activeDoc),
    checkRobots(robotsTxt, url),
    checkTitle(activeDoc),
    checkMetaDescription(activeDoc),
    checkHeadingOrder(activeDoc),
    checkSecurityHeaders(headers, url),
    checkCanonicalPreview(activeDoc, url),
  ];
  return checks;
}

// Deterministic health floor computed from the objective checks only. This is a
// SUBSET of each agent's full checklist, so it is a floor, not the agent score.
export function scoreFromChecks(checks) {
  const measured = checks.filter(c => c.verdict !== "NOT_MEASURED");
  const fails = measured.filter(c => c.verdict === "FAIL");
  const warns = measured.filter(c => c.verdict === "WARN");
  const criticalFails = fails.filter(c => c.critical).map(c => c.id);
  let score = 100 - 15 * fails.length - 7 * warns.length;
  if (score < 0) score = 0;
  if (criticalFails.length) score = Math.min(score, 49);

  const byAgent = {};
  for (const c of measured) {
    const a = (byAgent[c.agent] ||= { fails: 0, warns: 0, score: 100, criticalFails: [] });
    if (c.verdict === "FAIL") { a.fails++; if (c.critical) a.criticalFails.push(c.id); }
    if (c.verdict === "WARN") a.warns++;
  }
  for (const a of Object.values(byAgent)) {
    a.score = Math.max(0, 100 - 15 * a.fails - 7 * a.warns);
    if (a.criticalFails.length) a.score = Math.min(a.score, 49);
  }
  return {
    score,
    fails: fails.length,
    warns: warns.length,
    notMeasured: checks.length - measured.length,
    criticalFails,
    byAgent,
  };
}
