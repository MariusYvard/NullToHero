// Deterministic, render-free check engine. Given parsed HTML (and optionally a
// rendered DOM, robots.txt, response headers, a CSS model, and computed facts
// from a Playwright pass), it returns objective per-check verdicts. The model
// never decides these; the code does. Each check maps to the audit sub-agent that
// owns the dimension so the orchestrator can hand an agent its ground truth.
//
// Pure Node standard library. No network, no execution of page content.

import { parse, queryAll, first, textContent, styleMap, resolveBackgroundStr, ancestors, walk } from "./html.mjs";
import { ratioOf, aaThreshold, parseColor, luminance } from "./contrast.mjs";
import { parseStylesheet, computeElementStyle, pageBackground, pickColor } from "./css.mjs";
import { runAiAccessChecks } from "./ai-access.mjs";

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
  if (/^(vite \+ (react|vue|svelte|ts)|react app|create next app|welcome to nuxt|vue app|document|untitled|my app|new page)$/i.test(text)) {
    return mk({ id: "title-tag", label: "Title tag", ...CONTENT, verdict: "FAIL",
      method: "static", value: text, detail: `Title is a bundler/template default ("${text}") — the page ships unnamed in tabs, SERPs and history.` });
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


// ── viewport unit consistency (L-VIEWPORT-1, L-VIEWPORT-2) ────────────────────
// vh, svh and lvh resolve to three different heights on a phone and are identical on a
// desktop, so a mismatch is invisible on the machine that authored it. Two consequences
// are worth a verdict: a full-bleed section in svh stops growing when the browser bar
// retracts and lets the page background show under it, and a scroll track measured in vh
// with a platter measured in svh buys a different number of platter heights than written,
// which retimes every step of the sequence.
function checkViewportUnits(styleText) {
  const css = String(styleText || "");
  if (!css.trim()) {
    return mk({ id: "viewport-unit-consistency", label: "Viewport unit consistency", ...LAYOUT,
      verdict: "NOT_MEASURED", method: "not-measured", value: null, detail: "No stylesheet available to the analyzer." });
  }
  // Only height-ish properties: vh in a translate or a font-size is a different question.
  const decl = /(?:^|[;{])\s*(height|min-height|max-height)\s*:\s*([^;}]+)/gi;
  const found = { vh: [], svh: [], lvh: [], dvh: [] };
  let m;
  while ((m = decl.exec(css)) !== null) {
    const value = m[2];
    const u = /(\d+(?:\.\d+)?)(dvh|svh|lvh|vh)\b/gi;
    let n;
    while ((n = u.exec(value)) !== null) {
      const unit = n[2].toLowerCase();
      if (found[unit]) found[unit].push(`${m[1].toLowerCase()}: ${n[1]}${unit}`);
    }
  }
  const used = Object.keys(found).filter(k => found[k].length);
  if (!used.length) {
    return mk({ id: "viewport-unit-consistency", label: "Viewport unit consistency", ...LAYOUT,
      verdict: "PASS", method: "static", value: { used: [] }, detail: "No viewport-height units in the stylesheet." });
  }
  // svh or lvh alongside vh is the mismatch: those three are the ones that disagree on a phone.
  const disagreeing = used.filter(u => u !== "dvh");
  if (disagreeing.length > 1) {
    return mk({ id: "viewport-unit-consistency", label: "Viewport unit consistency", ...LAYOUT,
      verdict: "WARN", method: "static",
      value: { used, samples: Object.fromEntries(disagreeing.map(u => [u, found[u].slice(0, 4)])) },
      detail: `Stylesheet sizes heights in ${disagreeing.join(" and ")}, which resolve to different heights on a phone and to the same height on a desktop. If these belong to one scroll system, the track and the platter are being measured against different viewports. Use dvh for full-bleed sections (L-VIEWPORT-1) and one unit per scroll system (L-VIEWPORT-2).` });
  }
  return mk({ id: "viewport-unit-consistency", label: "Viewport unit consistency", ...LAYOUT,
    verdict: "PASS", method: "static", value: { used, samples: Object.fromEntries(used.map(u => [u, found[u].slice(0, 3)])) },
    detail: `Viewport heights use ${used.join(" and ")} consistently.` });
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

// mix-blend-mode on the element or any ancestor: the cascade's `color` is then the
// source of a blend, not the paint. Same rule the rendered sampler applies, so the two
// paths cannot disagree about which text is measurable.
function blendedUp(el, model, memo) {
  for (const node of [el, ...ancestors(el)]) {
    if (node.type !== "element") continue;
    const m = (styleFor(node, model, memo)["mix-blend-mode"] || "").trim().toLowerCase();
    if (m && m !== "normal") return true;
  }
  return false;
}

// CSS-wide keywords and unresolved token references are a cascade gap, not a
// colour-space gap. They are excluded from the "unreadable" tally so that it
// means one specific thing: a real colour our parser cannot decode.
const COLOR_KEYWORDS = new Set(["inherit", "currentcolor", "initial", "unset", "revert", "revert-layer", "auto", "none", ""]);
function isKeyword(s) {
  const v = (s || "").trim().toLowerCase();
  return COLOR_KEYWORDS.has(v) || v.startsWith("var(");
}
// Resolve the nearest background. Returns { bg, unresolved }: unresolved=true when
// the nearest paint is a gradient, image or a value we cannot turn into a color,
// so the caller SKIPS the sample rather than assuming white (the main source of
// render-free false positives on hero sections).
function bgResolve(el, model, memo, pageBg) {
  for (const node of [el, ...ancestors(el)]) {
    if (node.type !== "element") continue;
    const st = styleFor(node, model, memo);
    // A background painted from a token that has a competing definition behind a
    // selector we cannot evaluate is not a background we know. Skip, and say so.
    if (st.$ambiguousTokens && (st["background-color"] || st["background"] || st["background-image"])) {
      return { bg: null, unresolved: true, ambiguous: true };
    }
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

/* The closed vocabulary of exemption reasons. Closed on purpose: an open field
   collects the word "because". Three of these are real WCAG 1.4.3 exceptions
   (incidental, disabled/inactive, logotype); "staging" and "decorative-ghost" are
   NOT — they are the author overriding our judgment, which they may do, out loud. */
const EXEMPT_CODES = new Set(["staging", "decorative-ghost", "disabled", "logotype", "incidental"]);
// The two codes that WCAG does not sanction. Kept apart so the report can say which.
const EXEMPT_NON_WCAG = new Set(["staging", "decorative-ghost"]);
const exemptValid = (s) => s.exempt && EXEMPT_CODES.has(s.exempt) && !!(s.exemptReason || "").trim();

/* The exemption's own price. Declaring one costs a valid code and a written reason,
   and that cost IS the mechanism: it forces the author to state the argument, in the
   markup, where review sees it in the diff. An exemption nobody had to justify is just
   a mute button. Static by design: it reads the attribute, so it works without a
   render and cannot be dodged by a page that fails to boot. */
function checkContrastExempt(doc) {
  const bad = [];
  let total = 0;
  walk(doc, (el) => {
    const code = el.attrs?.["data-contrast-exempt"];
    if (code === undefined) return;
    total++;
    const reason = (el.attrs?.["data-contrast-exempt-reason"] || "").trim();
    if (!EXEMPT_CODES.has((code || "").trim())) bad.push({ el: el.tag, why: `unknown code "${code}"` });
    else if (!reason) bad.push({ el: el.tag, why: `code "${code}" carries no data-contrast-exempt-reason` });
  });
  if (!total) {
    return mk({ id: "contrast-exempt-undeclared", label: "Contrast exemptions are declared", ...A11Y, verdict: "PASS",
      critical: false, method: "static", value: { exemptions: 0, malformed: 0 }, detail: "No contrast exemptions on the page." });
  }
  if (bad.length) {
    return mk({ id: "contrast-exempt-undeclared", label: "Contrast exemptions are declared", ...A11Y, verdict: "FAIL",
      critical: false, method: "static", value: { exemptions: total, malformed: bad.length, codes: [...EXEMPT_CODES] },
      detail: `${bad.length} of ${total} contrast exemption(s) are not declared properly (${bad.map(b => `<${b.el}>: ${b.why}`).join("; ")}). ` +
        `A malformed exemption is ignored and its sample stays in the failure count. Valid codes: ${[...EXEMPT_CODES].join(", ")}.` });
  }
  return mk({ id: "contrast-exempt-undeclared", label: "Contrast exemptions are declared", ...A11Y, verdict: "PASS",
    critical: false, method: "static", value: { exemptions: total, malformed: 0 },
    detail: `${total} contrast exemption(s), each with a valid code and a stated reason.` });
}

function checkContrast(doc, computed, cssModel) {
  if (computed && Array.isArray(computed.contrastSamples)) {
    if (computed.contrastSamples.length === 0) {
      return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "NOT_MEASURED", critical: true,
        method: "computed", value: null, detail: "Render produced no text samples to measure." });
    }
    const under = computed.contrastSamples.filter(s => s.ratio < s.threshold);
    /* An exemption only counts if it is properly declared. A bare attribute, or one
       carrying a code we do not recognise, is not a claim we can weigh, so it stays in
       the failure count and contrast-exempt-undeclared says why. Otherwise "silence the
       check" would be one typo away, which is the whole thing we are trying not to build. */
    const exempt = under.filter(exemptValid);
    const fails = under.filter(s => !exemptValid(s));
    // Samples whose backdrop the render could not confirm from pixels. Coverage, not
    // a verdict: a PASS over 74 of 79 samples is not the same claim as a clean page.
    const unmeasured = computed.contrastUnmeasured || 0;
    const cov = computed.contrastCoverage || null;
    const value = {
      failures: fails.length, exempt: exempt.length, unmeasured,
      worst: fails.length ? fails.reduce((a, b) => a.ratio < b.ratio ? a : b).ratio : null,
      // What this verdict is a verdict OVER. Without it a PASS is unfalsifiable: the
      // reader cannot tell a clean site from one corner of one page at scroll 0.
      coverage: cov ? { pages: cov.pages, scrollStates: cov.scrollStates, viewports: cov.viewports } : null,
      // Where each failure actually is. Sweeping is worthless if the report cannot say
      // which page and which state, since that is the half a reader has to reproduce.
      worstSamples: fails
        .slice()
        .sort((a, b) => a.ratio / a.threshold - b.ratio / b.threshold)
        .slice(0, 10)
        .map(s => ({ ratio: s.ratio, threshold: s.threshold, page: s.page, viewport: s.viewport, scrollY: s.scrollY, text: s.text })),
    };
    /* The exempt count is never folded into the verdict and never omitted from the
       report. An audit you can drive to zero by annotation is a machine for producing
       clean reports on dirty pages. */
    const note = exempt.length
      ? ` ${exempt.length} declared intentional and excluded from the verdict` +
        (exempt.some(s => EXEMPT_NON_WCAG.has(s.exempt))
          ? "; these are the author's choice, not WCAG exceptions, so the page stays non-conformant at those points."
          : ".")
      : "";
    const why = computed.contrastUnmeasuredReasons;
    const cover = unmeasured
      ? ` ${unmeasured} element(s) never measurable in any state${why ? ` (${Object.entries(why).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""}.`
      : "";
    const scope = cov
      ? ` Measured across ${cov.pages} page(s), ${cov.scrollStates} scroll state(s), ${cov.viewports.join(" + ")}.`
      : " Measured on one page at scroll 0 only.";
    if (fails.length) {
      const worst = fails.reduce((a, b) => a.ratio < b.ratio ? a : b);
      const at = worst.page ? ` (${worst.page} @ y=${worst.scrollY}, ${worst.viewport}${worst.text ? `, "${worst.text.slice(0, 30)}"` : ""})` : "";
      return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "FAIL", critical: true,
        method: "computed", value,
        detail: `${fails.length} text element(s) below AA; worst ${worst.ratio}:1 (need ${worst.threshold}:1)${at}.${note}${cover}${scope}` });
    }
    return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "PASS", critical: true,
      method: "computed", value: { ...value, samples: computed.contrastSamples.length },
      detail: `All measured text meets AA contrast.${note}${cover}${scope}` });
  }

  // Static path. With a CSS model (inline <style> + linked stylesheets) resolve
  // token colors and the tag/class cascade; without one, fall back to inline
  // color attributes only (the render-free minimum).
  const samples = [];
  // Colours we found but could not read (a space parseColor does not support).
  // Tracked, never silently dropped: a deterministic detector must not let
  // "could not read this" look identical to "this is fine". Reported as
  // coverage alongside the verdict.
  const unreadable = new Set();
  // Not measured, and each for its own stated reason. Counted rather than dropped:
  // the whole point of this pass is that it is an estimate, so what it did not look at
  // is part of the answer.
  let blended = 0, exemptCount = 0, artifacts = 0, ambiguousTokens = 0;
  if (cssModel) {
    const memo = new Map();
    const pageBg = pageBackground(cssModel);
    const visit = (n) => {
      for (const c of n.children) {
        if (c.type !== "element") continue;
        if (TEXTISH.has(c.tag) && hasDirectText(c)) {
          const cu = colorUp(c, cssModel, memo);
          if (cu && cu.color && !parseColor(cu.color) && !isKeyword(cu.color)) unreadable.add(cu.color.trim().toLowerCase());
          if (cu && parseableColor(cu.color)) {
            /* Two things the computed path learned and this one had not.
               A declared exemption is a fact in the markup, so it is readable without a
               browser: honouring it there but not here meant the same page failed or
               passed depending on which flag you ran, and only one of those answers
               respected the author.
               mix-blend-mode makes the cascade's `color` the SOURCE, not the paint, so
               a ratio computed from it is a number no pixel holds. Both are counted as
               unmeasured rather than judged. */
            if (blendedUp(c, cssModel, memo)) { blended++; visit(c); continue; }
            const exempt = String(c.attrs?.["data-contrast-exempt"] ?? "").trim();
            if (exempt) {
              if (EXEMPT_CODES.has(exempt) && String(c.attrs?.["data-contrast-exempt-reason"] ?? "").trim()) { exemptCount++; visit(c); continue; }
              // A malformed exemption excuses nothing here either, so fall through and
              // measure it: the rule has to be the same on both paths or it is not a rule.
            }
            /* The text colour itself came from a token with a competing definition
               we cannot place. Neither answer is ours to give: this is the failure
               mode that returned PASS on 1.82:1 text because one unused rule
               redefined the token the paragraph reads. */
            if (cu.st.$ambiguousTokens) { ambiguousTokens++; visit(c); continue; }
            const { bg, unresolved, explicit, ambiguous } = bgResolve(c, cssModel, memo, pageBg);
            if (ambiguous) { ambiguousTokens++; visit(c); continue; }
            const fgc = parseColor(cu.color), bgc = bg ? parseColor(bg) : null;
            if (!unresolved && bg && fgc && bgc) {
              const lf = luminance(fgc), lb = luminance(bgc);
              // Skip the cases a render-free cascade gets wrong: (1) light text on
              // an assumed-white background (a section we could not resolve), and
              // (2) dark text on a dark background — a contextual light override set
              // by a descendant selector we do not model, that we missed. Both are
              // cascade artifacts, not real failures; --render resolves them.
              const ambiguousLight = !explicit && lf > 0.4;
              const darkOnDark = lf < 0.25 && lb < 0.25;
              /* (3) The mirror of darkOnDark, and it was missing for no reason but
                 oversight. A themed page states `--ink` light and `--paper` dark; a
                 light-theme block re-points BOTH under a selector this model does not
                 evaluate. Catch one override and not the other and you resolve light
                 ink against light paper: 1.06:1 on a wordmark a viewer reads at 16:1.
                 Exactly the false failure the rendered path was cleaned of in v1.34.0,
                 still living here because nobody ran the static path on a themed site.
                 Nobody authors white on white on purpose; a cascade we half-model
                 produces it constantly. --render settles it, and until then the honest
                 answer is that we did not see this one. */
              const lightOnLight = lf > 0.75 && lb > 0.75;
              if (lightOnLight) { artifacts++; visit(c); continue; }
              if (!ambiguousLight && !darkOnDark) {
                const r = ratioOf(cu.color, bg);
                // Carry the colours and the text. A static failure a reader cannot
                // trace back to a pair of tokens is one they cannot check, and this
                // path is an estimate, so it owes them the means to check it.
                if (r) samples.push({
                  tag: c.tag, ratio: r.ratio,
                  threshold: aaThreshold({ fontSizePx: fontSizePx(cu.st, c.tag), bold: isBold(cu.st, c) }),
                  fg: cu.color.trim(), bg: String(bg).trim(), explicit,
                  text: textContent(c).trim().replace(/\s+/g, " ").slice(0, 40),
                });
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
            else if (!parseColor(st.color) && !isKeyword(st.color)) unreadable.add(st.color.trim().toLowerCase());
          }
        }
        visit(c);
      }
    };
    visit(doc);
  }

  // Colours we saw but could not decode. Surfaced on every verdict below, because
  // a ratio measured over 2 of 12 colours is not the same claim as one measured
  // over 12 of 12, and the reader cannot tell the two apart from a bare "PASS".
  const skipped = unreadable.size;
  const coverage = skipped
    ? ` ${skipped} colour value(s) could not be decoded and were NOT measured (e.g. ${[...unreadable].slice(0, 2).join(", ")}); this verdict does not cover them.`
    : "";
  const unreadableValue = skipped ? { unreadable: skipped, examples: [...unreadable].slice(0, 5) } : {};
  // What this pass declined to judge, and why. An estimate that hides its own blind
  // spots is just a guess wearing a verdict.
  const notJudged = [
    artifacts ? `${artifacts} light-on-light cascade artifact(s)` : null,
    ambiguousTokens ? `${ambiguousTokens} with a token defined behind a selector this pass cannot evaluate` : null,
    blended ? `${blended} under mix-blend-mode` : null,
    exemptCount ? `${exemptCount} declared intentional` : null,
  ].filter(Boolean);
  const skipNote = notJudged.length ? ` Not judged: ${notJudged.join(", ")}.` : "";
  const skipValue = (artifacts || blended || exemptCount || ambiguousTokens)
    ? { notJudged: { cascadeArtifacts: artifacts, ambiguousTokens, blended, exempt: exemptCount } } : {};

  if (samples.length === 0) {
    /* Nothing measured, and the reader is owed the reason. A page whose only text we
       skipped reports NOT_MEASURED either way, but "no colour I could decode",
       "all of it was blended" and "you exempted all of it" are three different
       situations and only one of them is anybody's fault. Carrying skipValue here is
       the same rule as everywhere else in this file: could-not-read must never look
       like nothing-to-read. */
    const why = skipped
      ? `No text colour could be decoded: ${skipped} value(s) are in a colour space this parser does not support (e.g. ${[...unreadable].slice(0, 2).join(", ")}). Not a pass — nothing was measured.`
      : notJudged.length
        ? `No text sample was judged.`
        : "No resolvable text colors to measure statically.";
    return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "NOT_MEASURED", critical: false,
      method: "not-measured", value: (skipped || notJudged.length) ? { ...unreadableValue, ...skipValue } : null,
      detail: `${why}${skipNote} Run with --render for computed-style contrast (ground truth).` });
  }
  // Static contrast is a render-free ESTIMATE (no gradients, images, media queries
  // or specificity), so it informs the floor but is never critical: only the
  // Playwright-computed path above caps the score. This prevents a heuristic from
  // forcing a page to the Critical band.
  const fails = samples.filter(s => s.ratio < s.threshold);
  if (fails.length) {
    const worst = fails.reduce((a, b) => a.ratio < b.ratio ? a : b);
    return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "FAIL", critical: false,
      method: "static", value: {
        samples: samples.length, failures: fails.length, worst: worst.ratio, ...unreadableValue, ...skipValue,
        worstSamples: fails.slice().sort((a, b) => a.ratio / a.threshold - b.ratio / b.threshold).slice(0, 10)
          .map(s => ({ ratio: s.ratio, threshold: s.threshold, fg: s.fg, bg: s.bg, tag: s.tag, text: s.text })),
      },
      detail: `${fails.length}/${samples.length} resolved text sample(s) below AA; worst ${worst.ratio}:1 (need ${worst.threshold}:1) — ${worst.fg} on ${worst.bg}${worst.text ? ` ("${worst.text}")` : ""}. Static estimate over samples with a known background; confirm with --render.${skipNote}${coverage}` });
  }
  return mk({ id: "contrast-ratio", label: "Color contrast (AA)", ...A11Y, verdict: "PASS", critical: false,
    method: "static", value: { samples: samples.length, ...unreadableValue, ...skipValue },
    detail: `All ${samples.length} resolved text sample(s) meet AA (static estimate over samples with a known background).${skipNote}${coverage}` });
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
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return mk({ id: "security-headers", label: "Security headers", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No HTTP response headers available (local file, or headers not captured)." });
  }
  const h = lowerHeaders(headers);
  let isHttps = false; try { isHttps = new URL(url).protocol === "https:"; } catch { /* unknown */ }
  const csp = h["content-security-policy"] || "";
  const hstsRaw = h["strict-transport-security"] || "";
  const present = {
    hsts: !!hstsRaw,
    csp: !!csp,
    xFrameOptions: !!h["x-frame-options"],
    xContentTypeOptions: /nosniff/i.test(h["x-content-type-options"] || ""),
    referrerPolicy: !!h["referrer-policy"],
    permissionsPolicy: !!h["permissions-policy"],
    crossOriginIsolation: !!(h["cross-origin-opener-policy"] || h["cross-origin-embedder-policy"] || h["cross-origin-resource-policy"]),
  };
  const frameProtected = present.xFrameOptions || /frame-ancestors/i.test(csp);
  const missing = [];
  if (isHttps && !present.hsts) missing.push("Strict-Transport-Security");
  if (!present.xContentTypeOptions) missing.push("X-Content-Type-Options: nosniff");
  if (!frameProtected) missing.push("X-Frame-Options / CSP frame-ancestors");
  if (!present.referrerPolicy) missing.push("Referrer-Policy");
  // Quality of the headers that ARE present. A weak present header can drop a
  // fully-present set to WARN; a missing advisory header never does, so a solid
  // core still passes.
  const weak = [];
  if (present.hsts) {
    const ma = (hstsRaw.match(/max-age\s*=\s*(\d+)/i) || [])[1];
    if (ma !== undefined && Number(ma) < 15768000) weak.push(`HSTS max-age ${ma}s is under 6 months`);
  }
  const advisory = [];
  if (present.csp) {
    /* WHICH directive holds 'unsafe-inline' is the whole question, and matching the
       raw CSP string could not ask it.
         script-src 'unsafe-inline'     an injected <script> executes. A real hole.
         style-src-attr 'unsafe-inline' inline style="" attributes are allowed. Every
                                        runtime animation library writes those, so this
                                        is the cost of motion, not a lapse.
       Flagging both identically told a site to fix something it cannot fix, right next
       to something it should, and gave it one WARN for the pair. A finding that cannot
       be acted on differently should not be reported the same. */
    const dir = (name) => {
      const m = csp.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]*)`, "i"));
      return m ? m[1] : null;
    };
    const scriptSrc = dir("script-src") ?? dir("default-src") ?? "";
    const styleSrc = dir("style-src") ?? dir("default-src") ?? "";
    const styleAttr = dir("style-src-attr");
    if (/'unsafe-inline'/i.test(scriptSrc)) {
      // Hashes and nonces neutralise it: a browser ignores 'unsafe-inline' when either
      // is present, so a CSP carrying them is not actually permissive here.
      if (/'nonce-|'sha(256|384|512)-/i.test(scriptSrc)) advisory.push("script-src lists 'unsafe-inline' alongside hashes/nonces (browsers ignore it; drop it for clarity)");
      else weak.push("script-src allows 'unsafe-inline' (any injected inline script runs)");
    }
    if (/'unsafe-eval'/i.test(scriptSrc)) weak.push("script-src allows 'unsafe-eval'");
    // Style is advisory: it widens CSS injection, it does not execute script. And when
    // style-src-attr is declared, style-src 'unsafe-inline' no longer covers attributes.
    if (/'unsafe-inline'/i.test(styleSrc) && styleAttr === null) advisory.push("style-src allows 'unsafe-inline' (split style-src-attr if only inline style attributes need it)");
  }
  if (present.hsts && !/includesubdomains/i.test(hstsRaw)) advisory.push("HSTS includeSubDomains");
  if (!present.permissionsPolicy) advisory.push("Permissions-Policy");
  if (!present.crossOriginIsolation) advisory.push("Cross-Origin-*-Policy (COOP/COEP/CORP)");
  const value = { present, missing, weak, advisory };
  if (missing.length === 0) {
    if (weak.length) {
      return mk({ id: "security-headers", label: "Security headers", ...TECH, verdict: "WARN",
        method: "static", value, detail: `Core headers present but weak: ${weak.join(", ")}.` });
    }
    return mk({ id: "security-headers", label: "Security headers", ...TECH, verdict: "PASS",
      method: "static", value, detail: `Core hardening headers present.${advisory.length ? " Optional next: " + advisory.join(", ") + "." : ""}` });
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

// ── DOM correctness, head hygiene and response hardening (harvested checks) ─────
// Agent bindings for checks that land in the code and performance dimensions.
const CODE = { agent: "inspect-agent-code",       dimension: "Front-end Defects" };
const PERF = { agent: "seo-agent-performance",    dimension: "Search Visibility" };

function lowerHeaders(headers) {
  const h = {};
  if (headers && typeof headers === "object") for (const k of Object.keys(headers)) h[k.toLowerCase()] = headers[k];
  return h;
}

// Valid WAI-ARIA 1.2 state and property names. An aria-* attribute outside this
// set is a typo or a non-standard name that assistive technology ignores.
const VALID_ARIA = new Set([
  "aria-activedescendant","aria-atomic","aria-autocomplete","aria-braillelabel",
  "aria-brailleroledescription","aria-busy","aria-checked","aria-colcount",
  "aria-colindex","aria-colindextext","aria-colspan","aria-controls","aria-current",
  "aria-describedby","aria-description","aria-details","aria-disabled","aria-dropeffect",
  "aria-errormessage","aria-expanded","aria-flowto","aria-grabbed","aria-haspopup",
  "aria-hidden","aria-invalid","aria-keyshortcuts","aria-label","aria-labelledby",
  "aria-level","aria-live","aria-modal","aria-multiline","aria-multiselectable",
  "aria-orientation","aria-owns","aria-placeholder","aria-posinset","aria-pressed",
  "aria-readonly","aria-relevant","aria-required","aria-roledescription","aria-rowcount",
  "aria-rowindex","aria-rowindextext","aria-rowspan","aria-selected","aria-setsize",
  "aria-sort","aria-valuemax","aria-valuemin","aria-valuenow","aria-valuetext",
]);

function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => { const row = new Array(n + 1).fill(0); row[0] = i; return row; });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}
function suggestAria(name) {
  let best = null, bestScore = 1e9;
  for (const v of VALID_ARIA) { const d = editDistance(name, v); if (d < bestScore) { bestScore = d; best = v; } }
  return bestScore > 0 && bestScore <= 3 ? best : null;
}

function checkInvalidAria(doc) {
  const bad = [];
  walk(doc, (el) => {
    for (const name of Object.keys(el.attrs || {})) {
      if (!name.startsWith("aria-") || VALID_ARIA.has(name)) continue;
      const hint = suggestAria(name);
      bad.push(hint ? `${name} (did you mean ${hint}?)` : name);
    }
  });
  const uniq = [...new Set(bad)];
  if (uniq.length === 0) {
    return mk({ id: "invalid-aria-attribute", label: "ARIA attribute names", ...A11Y, verdict: "PASS",
      method: "static", value: { invalid: 0 }, detail: "All aria-* attributes are valid WAI-ARIA names (or none are used)." });
  }
  return mk({ id: "invalid-aria-attribute", label: "ARIA attribute names", ...A11Y, verdict: "FAIL",
    method: "static", value: { invalid: uniq.length, names: uniq.slice(0, 12) },
    detail: `${uniq.length} invalid aria-* attribute(s) that assistive tech ignores: ${uniq.slice(0, 6).join(", ")}.` });
}

// Direct-parent requirements: a child tag is valid only inside these parents.
const NEST_PARENT = {
  li: new Set(["ul", "ol", "menu"]),
  option: new Set(["select", "optgroup", "datalist"]),
  optgroup: new Set(["select"]),
  td: new Set(["tr"]), th: new Set(["tr"]),
  tr: new Set(["thead", "tbody", "tfoot"]),
  thead: new Set(["table"]), tbody: new Set(["table"]), tfoot: new Set(["table"]),
  caption: new Set(["table"]), colgroup: new Set(["table"]), col: new Set(["colgroup"]),
  figcaption: new Set(["figure"]), summary: new Set(["details"]),
};
// Block-level tags that must not be a direct child of a paragraph.
const P_FORBIDS = new Set(["div", "p", "ul", "ol", "dl", "table", "section", "article",
  "header", "footer", "aside", "nav", "main", "figure", "form", "blockquote", "hr", "pre",
  "h1", "h2", "h3", "h4", "h5", "h6", "details", "fieldset", "address"]);
// Tags that may never contain another of the same, anywhere in their subtree.
const SELF_NEST = new Set(["a", "button", "form", "p"]);
const NEST_SEVERE = new Set(["tr", "td", "th", "li", "option", "optgroup"]);

function checkInvalidNesting(doc) {
  const severe = [], minor = [];
  walk(doc, (el) => {
    const tag = el.tag;
    const parent = el.parent && el.parent.type === "element" ? el.parent.tag : null;
    if (NEST_PARENT[tag] && !(parent && parent.includes("-"))) {
      if (!parent || !NEST_PARENT[tag].has(parent)) {
        const msg = parent === "table" && (tag === "tr" || tag === "td" || tag === "th")
          ? `<${tag}> directly in <table> (needs a <tbody>)`
          : `<${tag}> not inside <${[...NEST_PARENT[tag]].join("/")}>`;
        (NEST_SEVERE.has(tag) ? severe : minor).push(msg);
      }
    }
    if (tag === "dt" || tag === "dd") {
      let hasDl = false;
      for (const a of ancestors(el)) if (a.tag === "dl") { hasDl = true; break; }
      if (!hasDl) minor.push(`<${tag}> outside a <dl>`);
    }
    if (parent === "p" && P_FORBIDS.has(tag)) minor.push(`<${tag}> inside <p> (auto-closes the paragraph)`);
    if (SELF_NEST.has(tag)) {
      for (const a of ancestors(el)) if (a.tag === tag) {
        ((tag === "a" || tag === "button" || tag === "form") ? severe : minor).push(`<${tag}> nested inside another <${tag}>`);
        break;
      }
    }
  });
  const total = severe.length + minor.length;
  if (total === 0) {
    return mk({ id: "invalid-dom-nesting", label: "HTML nesting validity", ...CODE, verdict: "PASS",
      method: "static", value: { violations: 0 }, detail: "No invalid element nesting found." });
  }
  const sample = [...severe, ...minor].slice(0, 6);
  return mk({ id: "invalid-dom-nesting", label: "HTML nesting validity", ...CODE, verdict: severe.length ? "FAIL" : "WARN",
    method: "static", value: { violations: total, severe: severe.length, sample },
    detail: `${total} invalid nesting issue(s) that break parsing or semantics: ${sample.join("; ")}.` });
}

function checkCharsetEarly(rawHtml, headers) {
  const html = rawHtml || "";
  const ct = (headers && typeof headers === "object" && !Array.isArray(headers)) ? (lowerHeaders(headers)["content-type"] || "") : "";
  if (/charset\s*=/i.test(ct)) {
    return mk({ id: "charset-early", label: "Charset declared early", ...TECH, verdict: "PASS",
      method: "static", value: { source: "content-type" }, detail: "Charset declared in the Content-Type response header." });
  }
  if (!html.trim()) {
    return mk({ id: "charset-early", label: "Charset declared early", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No raw HTML to inspect for a charset declaration." });
  }
  const m = html.match(/<meta[^>]+charset\s*=\s*["']?[a-z0-9_-]+/i)
    || html.match(/<meta[^>]+http-equiv\s*=\s*["']?content-type["']?[^>]*charset\s*=/i);
  if (!m) {
    return mk({ id: "charset-early", label: "Charset declared early", ...TECH, verdict: "WARN",
      method: "static", value: null, detail: "No <meta charset>, so the browser has to guess the encoding." });
  }
  const bytes = Buffer.byteLength(html.slice(0, m.index || 0), "utf8");
  if (bytes > 1024) {
    return mk({ id: "charset-early", label: "Charset declared early", ...TECH, verdict: "WARN",
      method: "static", value: { byteOffset: bytes }, detail: `<meta charset> appears ${bytes} bytes in; the spec wants it within the first 1024.` });
  }
  return mk({ id: "charset-early", label: "Charset declared early", ...TECH, verdict: "PASS",
    method: "static", value: { byteOffset: bytes }, detail: `Charset declared within the first ${bytes} bytes.` });
}

function checkHeadMeta(doc) {
  const links = queryAll(doc, "link"), metas = queryAll(doc, "meta");
  const relSet = (l) => (l.attrs.rel || "").toLowerCase().split(/\s+/);
  const metaName = (n) => metas.some(m => (m.attrs.name || "").toLowerCase() === n);
  const present = {
    icon: links.some(l => relSet(l).includes("icon")),
    appleTouchIcon: links.some(l => relSet(l).includes("apple-touch-icon")),
    manifest: links.some(l => relSet(l).includes("manifest")),
    themeColor: metaName("theme-color"),
    colorScheme: metaName("color-scheme"),
  };
  const missing = Object.entries(present).filter(([, v]) => !v).map(([k]) => k);
  if (!present.icon && !present.manifest && !present.themeColor) {
    return mk({ id: "head-meta", label: "Head metadata", ...TECH, verdict: "WARN",
      method: "static", value: { present, missing }, detail: "No favicon, web app manifest or theme-color (basic head metadata is absent)." });
  }
  if (!present.icon) {
    return mk({ id: "head-meta", label: "Head metadata", ...TECH, verdict: "WARN",
      method: "static", value: { present, missing }, detail: "No favicon link (rel=\"icon\")." });
  }
  return mk({ id: "head-meta", label: "Head metadata", ...TECH, verdict: "PASS",
    method: "static", value: { present, missing },
    detail: missing.length ? `Favicon present; optional extras absent: ${missing.join(", ")}.` : "Favicon, apple-touch-icon, manifest, theme-color and color-scheme all present." });
}

function isCrossOrigin(href, pageHost) {
  if (!href) return false;
  if (href.startsWith("//")) return true;
  const m = href.match(/^https?:\/\/([^/]+)/i);
  if (!m) return false;
  if (!pageHost) return true;
  return m[1].toLowerCase() !== pageHost;
}
function checkSri(doc, url) {
  let pageHost = null; try { if (url) pageHost = new URL(url).host.toLowerCase(); } catch { /* unknown */ }
  const offenders = [];
  for (const s of queryAll(doc, "script"))
    if (s.attrs.src && isCrossOrigin(s.attrs.src, pageHost) && !s.attrs.integrity) offenders.push(`script ${s.attrs.src.slice(0, 60)}`);
  for (const l of queryAll(doc, "link")) {
    const rel = (l.attrs.rel || "").toLowerCase().split(/\s+/);
    if ((rel.includes("stylesheet") || rel.includes("modulepreload")) && l.attrs.href && isCrossOrigin(l.attrs.href, pageHost) && !l.attrs.integrity)
      offenders.push(`stylesheet ${l.attrs.href.slice(0, 60)}`);
  }
  if (offenders.length === 0) {
    return mk({ id: "subresource-integrity", label: "Subresource Integrity", ...TECH, verdict: "PASS",
      method: "static", value: { missing: 0 }, detail: "No cross-origin script or stylesheet lacks an integrity hash." });
  }
  return mk({ id: "subresource-integrity", label: "Subresource Integrity", ...TECH, verdict: "WARN",
    method: "static", value: { missing: offenders.length, sample: offenders.slice(0, 5) },
    detail: `${offenders.length} cross-origin resource(s) without integrity: ${offenders.slice(0, 3).join(", ")}.` });
}

const REDIRECT_PARAMS = new Set(["url", "redirect", "redirect_url", "redirect_uri", "redir", "rurl",
  "next", "dest", "destination", "go", "return", "returnto", "return_to", "return_path", "continue",
  "checkout_url", "image_url", "view", "target", "link", "out"]);
function offOrigin(val, pageHost) {
  if (!val) return false;
  if (val.startsWith("//")) return true;
  const m = val.match(/^https?:\/\/([^/]+)/i);
  if (!m) return false;
  if (!pageHost) return true;
  return m[1].toLowerCase() !== pageHost;
}
function checkOpenRedirect(doc, url) {
  let pageHost = null; try { if (url) pageHost = new URL(url).host.toLowerCase(); } catch { /* unknown */ }
  const hits = [];
  const scan = (raw) => {
    if (!raw) return;
    const qi = raw.indexOf("?");
    if (qi === -1) return;
    for (const pair of raw.slice(qi + 1).split("&")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      let key = pair.slice(0, eq), value = pair.slice(eq + 1);
      try { key = decodeURIComponent(key); } catch { /* raw */ }
      try { value = decodeURIComponent(value); } catch { /* raw */ }
      if (REDIRECT_PARAMS.has(key.toLowerCase()) && offOrigin(value, pageHost)) hits.push(`${key.toLowerCase()}=${value.slice(0, 40)}`);
    }
  };
  for (const a of queryAll(doc, "a")) scan(a.attrs.href);
  for (const f of queryAll(doc, "form")) scan(f.attrs.action);
  if (hits.length === 0) {
    return mk({ id: "open-redirect-param", label: "Open redirect parameters", ...TECH, verdict: "PASS",
      method: "static", value: { hits: 0 }, detail: "No on-page link passes an off-origin URL through a redirect parameter." });
  }
  return mk({ id: "open-redirect-param", label: "Open redirect parameters", ...TECH, verdict: "WARN",
    method: "static", value: { hits: hits.length, sample: hits.slice(0, 5) },
    detail: `${hits.length} link(s) route an absolute off-origin URL through a redirect-style parameter (open-redirect smell): ${hits.slice(0, 3).join(", ")}. Advisory; confirm server-side validation.` });
}

function checkCorsWildcard(headers) {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return mk({ id: "cors-credentialed-wildcard", label: "CORS credentialed wildcard", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No response headers available." });
  }
  const h = lowerHeaders(headers);
  const acao = (h["access-control-allow-origin"] || "").trim();
  const acac = /true/i.test(h["access-control-allow-credentials"] || "");
  if ((acao === "*" || acao.toLowerCase() === "null") && acac) {
    return mk({ id: "cors-credentialed-wildcard", label: "CORS credentialed wildcard", ...TECH, verdict: "FAIL",
      method: "static", value: { acao, credentials: true },
      detail: `Access-Control-Allow-Origin: ${acao} with Access-Control-Allow-Credentials: true is an insecure, invalid CORS combination.` });
  }
  return mk({ id: "cors-credentialed-wildcard", label: "CORS credentialed wildcard", ...TECH, verdict: "PASS",
    method: "static", value: { acao: acao || null }, detail: acao ? `CORS origin policy present (${acao}) without the credentialed-wildcard flaw.` : "No permissive credentialed CORS wildcard." });
}

function checkCompression(headers) {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return mk({ id: "compression-enabled", label: "Response compression", ...PERF, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No response headers available." });
  }
  const enc = (lowerHeaders(headers)["content-encoding"] || "").toLowerCase();
  if (/\b(gzip|br|deflate|zstd)\b/.test(enc)) {
    return mk({ id: "compression-enabled", label: "Response compression", ...PERF, verdict: "PASS",
      method: "static", value: { encoding: enc }, detail: `Response compressed (${enc}).` });
  }
  return mk({ id: "compression-enabled", label: "Response compression", ...PERF, verdict: "WARN",
    method: "static", value: { encoding: enc || null }, detail: "No Content-Encoding, so the response appears served uncompressed (enable gzip or brotli)." });
}

function checkServerFingerprint(headers) {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return mk({ id: "server-fingerprint", label: "Server fingerprint headers", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No response headers available." });
  }
  const h = lowerHeaders(headers);
  const leaks = [];
  if (h["x-powered-by"]) leaks.push(`X-Powered-By: ${h["x-powered-by"]}`);
  if (h["x-aspnet-version"]) leaks.push("X-AspNet-Version");
  if (h["x-aspnetmvc-version"]) leaks.push("X-AspNetMvc-Version");
  if (leaks.length === 0) {
    return mk({ id: "server-fingerprint", label: "Server fingerprint headers", ...TECH, verdict: "PASS",
      method: "static", value: { leaks: [] }, detail: "No version-revealing server headers." });
  }
  return mk({ id: "server-fingerprint", label: "Server fingerprint headers", ...TECH, verdict: "WARN",
    method: "static", value: { leaks }, detail: `Response reveals stack or version details: ${leaks.slice(0, 3).join(", ")}.` });
}

function checkCookieFlags(headers) {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return mk({ id: "session-cookie-flags", label: "Cookie security flags", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No response headers available." });
  }
  const sc = lowerHeaders(headers)["set-cookie"];
  if (sc == null) {
    return mk({ id: "session-cookie-flags", label: "Cookie security flags", ...TECH, verdict: "PASS",
      method: "static", value: { cookies: 0 }, detail: "No Set-Cookie on this response." });
  }
  const cookies = Array.isArray(sc) ? sc : String(sc).split(/,(?=[^;=]+=)/);
  const weak = [];
  for (const c of cookies) {
    const name = (c.split("=")[0] || "").trim();
    const flags = c.toLowerCase(), miss = [];
    if (!/;\s*httponly/.test(flags)) miss.push("HttpOnly");
    if (!/;\s*secure/.test(flags)) miss.push("Secure");
    if (!/;\s*samesite/.test(flags)) miss.push("SameSite");
    if (miss.length) weak.push(`${name} (missing ${miss.join(", ")})`);
  }
  if (weak.length === 0) {
    return mk({ id: "session-cookie-flags", label: "Cookie security flags", ...TECH, verdict: "PASS",
      method: "static", value: { cookies: cookies.length, weak: 0 }, detail: `All ${cookies.length} cookie(s) set Secure, HttpOnly and SameSite.` });
  }
  return mk({ id: "session-cookie-flags", label: "Cookie security flags", ...TECH, verdict: "WARN",
    method: "static", value: { cookies: cookies.length, weak: weak.slice(0, 5) },
    detail: `${weak.length} cookie(s) missing a security flag: ${weak.slice(0, 3).join("; ")}.` });
}

function checkHttpsRedirect(probes) {
  const p = probes && probes.httpsRedirect;
  if (!p || !p.tested) {
    return mk({ id: "https-redirect", label: "HTTP to HTTPS redirect", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "HTTP to HTTPS redirect not probed (URL crawl probes only)." });
  }
  if (p.redirectsToHttps) {
    return mk({ id: "https-redirect", label: "HTTP to HTTPS redirect", ...TECH, verdict: "PASS",
      method: "probe", value: { status: p.status || null, finalUrl: p.location || null }, detail: "Plain HTTP redirects to HTTPS." });
  }
  return mk({ id: "https-redirect", label: "HTTP to HTTPS redirect", ...TECH, verdict: p.reachable ? "FAIL" : "WARN",
    method: "probe", value: { status: p.status || null },
    detail: p.reachable ? "Plain HTTP does not redirect to HTTPS (content is reachable without transport security)." : "Could not confirm an HTTP to HTTPS redirect." });
}

function checkHostCanonical(probes) {
  const p = probes && probes.hostCanonical;
  if (!p || !p.tested) {
    return mk({ id: "host-canonicalization", label: "www / non-www canonical host", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "Host canonicalization not probed." });
  }
  if (p.altRedirects || !p.altReachable) {
    return mk({ id: "host-canonicalization", label: "www / non-www canonical host", ...TECH, verdict: "PASS",
      method: "probe", value: { altHost: p.altHost, altRedirects: !!p.altRedirects },
      detail: p.altRedirects ? `The alternate host (${p.altHost}) redirects to the canonical host.` : `The alternate host (${p.altHost}) does not serve the site.` });
  }
  return mk({ id: "host-canonicalization", label: "www / non-www canonical host", ...TECH, verdict: "WARN",
    method: "probe", value: { altHost: p.altHost },
    detail: `Both the audited host and ${p.altHost} serve the page without a redirect (duplicate-content risk). Pick one and 301 the other.` });
}

function checkSecurityTxt(probes) {
  const p = probes && probes.securityTxt;
  if (!p || !p.tested) {
    return mk({ id: "security-txt", label: "security.txt", ...TECH, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "/.well-known/security.txt not probed." });
  }
  if (p.found) {
    return mk({ id: "security-txt", label: "security.txt", ...TECH, verdict: "PASS",
      method: "probe", value: { found: true }, detail: "A security.txt is published (RFC 9116)." });
  }
  return mk({ id: "security-txt", label: "security.txt", ...TECH, verdict: "WARN",
    method: "probe", value: { found: false }, detail: "No /.well-known/security.txt (optional RFC 9116 disclosure contact)." });
}

// ── media, motion and content hygiene ────────────────────────────────────────

const MOTION_LIB_RE = /\bgsap\b|ScrollTrigger|ScrollSmoother|locomotive-scroll|framer-motion|@studio-freight\/lenis|darkroomengineering\/lenis|new\s+Lenis\b|from\s+["']lenis["']|lenis(?:\.min)?\.js|\banimejs\b|anime\.esm|motion\/react/i;

function checkVideoEmbeds(doc) {
  const videos = queryAll(doc, "video");
  if (videos.length === 0) {
    return mk({ id: "video-embed-hygiene", label: "Video embed hygiene", ...CODE, verdict: "PASS",
      method: "static", value: { videos: 0 }, detail: "No <video> elements." });
  }
  const auto = videos.filter(v => v.attrs.autoplay !== undefined);
  const interactive = videos.filter(v => v.attrs.controls !== undefined || (v.attrs.autoplay === undefined && v.attrs.muted === undefined)).length;
  const decorative = videos.filter(v => v.attrs.autoplay !== undefined && v.attrs.muted !== undefined && v.attrs.controls === undefined).length;
  if (auto.length === 0) {
    return mk({ id: "video-embed-hygiene", label: "Video embed hygiene", ...CODE, verdict: "PASS",
      method: "static", value: { videos: videos.length, autoplay: 0, interactive, decorative },
      detail: "No autoplay video (interactive video stays native by design)." });
  }
  const broken = [], noPoster = [];
  for (const v of auto) {
    const miss = [];
    if (v.attrs.muted === undefined) miss.push("muted");
    if (v.attrs.playsinline === undefined) miss.push("playsinline");
    if (miss.length) broken.push(miss.join("+"));
    if (v.attrs.poster === undefined) noPoster.push(v.attrs.src || "(source)");
  }
  if (broken.length) {
    return mk({ id: "video-embed-hygiene", label: "Video embed hygiene", ...CODE, verdict: "FAIL",
      method: "static", value: { videos: videos.length, autoplay: auto.length, broken: broken.length },
      detail: `${broken.length} autoplay <video> missing ${[...new Set(broken)].join(", ")} — mobile browsers block the autoplay or paint a blank box without muted+playsinline.` });
  }
  if (noPoster.length) {
    return mk({ id: "video-embed-hygiene", label: "Video embed hygiene", ...CODE, verdict: "WARN",
      method: "static", value: { videos: videos.length, autoplay: auto.length, noPoster: noPoster.length },
      detail: `${noPoster.length} autoplay <video> without a poster — nothing paints until the file arrives.` });
  }
  return mk({ id: "video-embed-hygiene", label: "Video embed hygiene", ...CODE, verdict: "PASS",
    method: "static", value: { videos: videos.length, autoplay: auto.length },
    detail: `All ${auto.length} autoplay video(s) carry muted, playsinline and a poster.` });
}

function checkMotionReducedGuard(styleText, js) {
  if (!MOTION_LIB_RE.test(js || "")) {
    return mk({ id: "motion-reduced-guard", label: "Reduced-motion guard for JS animation", ...CODE, verdict: "PASS",
      method: "static", value: { library: false }, detail: "No JS animation or scroll library detected." });
  }
  const jsHas = /prefers-reduced-motion|useReducedMotion/i.test(js || "");
  const cssHas = /prefers-reduced-motion/i.test(styleText || "");
  if (jsHas) {
    return mk({ id: "motion-reduced-guard", label: "Reduced-motion guard for JS animation", ...CODE, verdict: "PASS",
      method: "static", value: { library: true, jsGuard: true, cssGuard: cssHas },
      detail: "JS animation library present and guarded in JS (matchMedia/useReducedMotion)." });
  }
  if (cssHas) {
    return mk({ id: "motion-reduced-guard", label: "Reduced-motion guard for JS animation", ...CODE, verdict: "WARN",
      method: "static", value: { library: true, jsGuard: false, cssGuard: true },
      detail: "CSS reduced-motion kill-switch only: inline styles set by GSAP/Lenis/Framer ignore a CSS-only guard, so the guard is cosmetic for JS-driven motion." });
  }
  return mk({ id: "motion-reduced-guard", label: "Reduced-motion guard for JS animation", ...CODE, verdict: "FAIL",
    method: "static", value: { library: true, jsGuard: false, cssGuard: false },
    detail: "A JS animation/scroll library is loaded with no prefers-reduced-motion guard anywhere (CSS or JS)." });
}

function checkScrollbarHidden(styleText) {
  const t = styleText || "";
  const hits = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = ruleRe.exec(t))) {
    const sel = m[1].trim().toLowerCase().split(/\s+/).pop() ? m[1].trim().toLowerCase() : "";
    const body = m[2].toLowerCase();
    const lastSeg = sel.split(/[\n,]/).map(x => x.trim()).filter(Boolean);
    const globalSel = lastSeg.some(x => x === "html" || x === "body" || x === "*" || x === ":root" || x === "html, body");
    const wkGlobal = lastSeg.some(x => /^(html|body|\*|:root)?\s*::-webkit-scrollbar$/.test(x));
    if (globalSel && /scrollbar-width\s*:\s*none/.test(body)) hits.push(`${lastSeg.join(",")} scrollbar-width:none`);
    if (wkGlobal && /(display\s*:\s*none|width\s*:\s*0(px)?\b)/.test(body)) hits.push(`${lastSeg.join(",")}`);
  }
  if (hits.length) {
    return mk({ id: "scrollbar-hidden", label: "Document scrollbar suppressed", ...A11Y, verdict: "WARN",
      method: "static", value: { rules: hits.slice(0, 3) },
      detail: `The document scrollbar is hidden (${hits[0]}) — the native position indicator, keyboard affordance and accessibility API are lost.` });
  }
  return mk({ id: "scrollbar-hidden", label: "Document scrollbar suppressed", ...A11Y, verdict: "PASS",
    method: "static", value: null, detail: "Document scrollbar not suppressed." });
}

function checkFrameSequencePreload(js, rawHtml) {
  const t = (js || "") + "\n" + (rawHtml || "");
  const seq = new Map();
  const re = /["'(=\s]([\w./-]{0,120}?[\w-]*?)(\d{2,4})\.(webp|jpe?g|png|avif)\b/gi;
  let m;
  while ((m = re.exec(t))) {
    const key = m[1].toLowerCase() + "#" + m[3].toLowerCase();
    if (!seq.has(key)) seq.set(key, new Set());
    seq.get(key).add(m[2]);
  }
  let longest = 0, prefix = null;
  for (const [k, v] of seq) if (v.size > longest) { longest = v.size; prefix = k.split("#")[0]; }
  const loop = /for\s*\([^)]*<\s*(\d{2,4})[^)]*\)[\s\S]{0,240}?new\s+Image\s*\(/.exec(js || "");
  if (loop) longest = Math.max(longest, parseInt(loop[1], 10));
  if (longest >= 150) {
    return mk({ id: "frame-sequence-preload", label: "Image-sequence preload burst", ...PERF, verdict: "FAIL",
      method: "static", value: { longest, prefix },
      detail: `${longest} sequential frames (${prefix || "detected loop"}…) referenced up front — a network and memory burst before any interaction; load windowed around the scroll position instead.` });
  }
  if (longest >= 50) {
    return mk({ id: "frame-sequence-preload", label: "Image-sequence preload burst", ...PERF, verdict: "WARN",
      method: "static", value: { longest, prefix },
      detail: `${longest} sequential frames (${prefix || "detected loop"}…) referenced — verify they are loaded progressively, not all at mount.` });
  }
  return mk({ id: "frame-sequence-preload", label: "Image-sequence preload burst", ...PERF, verdict: "PASS",
    method: "static", value: { longest }, detail: "No large sequential image set referenced." });
}

function checkMixedScriptText(doc) {
  const body = first(doc, "body") || doc;
  const text = textContent(body) || "";
  const words = text.match(/[\p{L}\p{M}][\p{L}\p{M}'\u2019-]*/gu) || [];
  const bad = [];
  for (const w of words) {
    if (/[A-Za-z]/.test(w) && /[\u0400-\u04FF\u0370-\u03FF]/.test(w)) { bad.push(w); if (bad.length >= 5) break; }
  }
  if (bad.length) {
    return mk({ id: "mixed-script-homoglyph", label: "Mixed-script homoglyphs", ...CONTENT, verdict: "WARN",
      method: "static", value: { samples: bad.slice(0, 3) },
      detail: `Word(s) mixing Latin with Cyrillic/Greek letters: ${bad.slice(0, 3).join(", ")} — usually a paste artifact; breaks search matching, spellcheck and screen-reader pronunciation.` });
  }
  return mk({ id: "mixed-script-homoglyph", label: "Mixed-script homoglyphs", ...CONTENT, verdict: "PASS",
    method: "static", value: null, detail: "No mixed-script words in visible text." });
}

function checkMediaWeight(probes) {
  const p = probes && probes.mediaWeight;
  if (!p || !p.tested) {
    return mk({ id: "media-weight", label: "Referenced media weight", ...PERF, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "Referenced video/3D-model weight not probed." });
  }
  const MB = 1048576;
  const videoMB = (p.videoBytes || 0) / MB;
  const modelMB = (p.modelBytes || 0) / MB;
  const maxModelMB = Math.max(0, ...(p.models || []).map(x => (x.bytes || 0))) / MB;
  const value = { videoMB: +videoMB.toFixed(1), modelMB: +modelMB.toFixed(1),
    videos: (p.videos || []).length, models: (p.models || []).length, unresolved: p.unresolved || 0 };
  if (videoMB > 30) {
    return mk({ id: "media-weight", label: "Referenced media weight", ...PERF, verdict: "FAIL",
      method: "probe", value, detail: `${videoMB.toFixed(1)} MB of referenced video — a mobile visitor pays for this before any interaction; compress (crf/GOP), lazy-load or gate behind a poster.` });
  }
  if (videoMB > 10 || maxModelMB > 5) {
    return mk({ id: "media-weight", label: "Referenced media weight", ...PERF, verdict: "WARN",
      method: "probe", value, detail: videoMB > 10
        ? `${videoMB.toFixed(1)} MB of referenced video (over the 10 MB comfort budget).`
        : `A referenced 3D model weighs ${maxModelMB.toFixed(1)} MB — consider Draco/meshopt compression.` });
  }
  return mk({ id: "media-weight", label: "Referenced media weight", ...PERF, verdict: "PASS",
    method: "probe", value, detail: `${videoMB.toFixed(1)} MB video and ${modelMB.toFixed(1)} MB 3D models referenced.` });
}

function checkThreeDuplicate(js) {
  const t = js || "";
  const revs = [];
  const re = /\bREVISION\s*=\s*['"]?(\d{2,4})\b/g;
  let m;
  while ((m = re.exec(t))) revs.push(m[1]);
  if (revs.length === 0) {
    return mk({ id: "three-duplicate-copies", label: "Duplicate three.js copies", ...PERF, verdict: "PASS",
      method: "static", value: { copies: 0 }, detail: "No three.js build detected in the page's own scripts." });
  }
  const distinct = [...new Set(revs)];
  if (distinct.length > 1) {
    return mk({ id: "three-duplicate-copies", label: "Duplicate three.js copies", ...PERF, verdict: "FAIL",
      method: "static", value: { copies: revs.length, revisions: distinct },
      detail: `Two different three.js builds are bundled (r${distinct.join(", r")}) — double weight and broken instanceof across the boundary.` });
  }
  if (revs.length > 1) {
    return mk({ id: "three-duplicate-copies", label: "Duplicate three.js copies", ...PERF, verdict: "WARN",
      method: "static", value: { copies: revs.length, revisions: distinct },
      detail: `three.js r${distinct[0]} appears ${revs.length} times in the page's scripts — likely bundled twice.` });
  }
  return mk({ id: "three-duplicate-copies", label: "Duplicate three.js copies", ...PERF, verdict: "PASS",
    method: "static", value: { copies: 1, revisions: distinct }, detail: `One three.js build (r${distinct[0]}).` });
}

function checkFrameLoopAlloc(js) {
  const t = js || "";
  const heads = /useFrame\s*\(|requestAnimationFrame\s*\(/g;
  const alloc = /new\s+(THREE\.)?(Vector[23]|Matrix[34]|Quaternion|Euler|Color)\s*\(|\.clone\s*\(\s*\)/;
  let m, hits = 0, windows = 0;
  while ((m = heads.exec(t))) {
    windows++;
    if (alloc.test(t.slice(m.index, m.index + 500))) hits++;
  }
  if (hits > 0) {
    return mk({ id: "frame-loop-alloc", label: "Allocation in the frame loop", ...PERF, verdict: "WARN",
      method: "static", value: { loops: windows, allocating: hits },
      detail: `${hits} frame loop(s) allocate engine objects (new Vector/Matrix/Color or .clone()) per frame — reuse a temporary with set()/copy().` });
  }
  return mk({ id: "frame-loop-alloc", label: "Allocation in the frame loop", ...PERF, verdict: "PASS",
    method: "static", value: { loops: windows, allocating: 0 },
    detail: windows ? `No per-frame allocation detected across ${windows} frame loop(s).` : "No frame loops detected." });
}

// ── engine ────────────────────────────────────────────────────────────────────

export function runChecks({ rawHtml = "", renderedHtml = null, robotsTxt = null, url = null, computed = null, headers = null, css = "", js = "", probes = null } = {}) {
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
    checkContrastExempt(activeDoc),
    checkHtmlLang(activeDoc),
    checkRobots(robotsTxt, url),
    checkTitle(activeDoc),
    checkMetaDescription(activeDoc),
    checkHeadingOrder(activeDoc),
    checkSecurityHeaders(headers, url),
    checkCanonicalPreview(activeDoc, url),
    checkInvalidNesting(rawDoc),
    checkInvalidAria(activeDoc),
    checkCharsetEarly(rawHtml, headers),
    checkHeadMeta(activeDoc),
    checkSri(activeDoc, url),
    checkOpenRedirect(activeDoc, url),
    checkCorsWildcard(headers),
    checkCompression(headers),
    checkServerFingerprint(headers),
    checkCookieFlags(headers),
    checkVideoEmbeds(activeDoc),
    checkMotionReducedGuard(styleText, js),
    checkScrollbarHidden(styleText),
    checkFrameSequencePreload(js, rawHtml),
    checkMixedScriptText(activeDoc),
    checkThreeDuplicate(js),
    checkFrameLoopAlloc(js),
    checkHttpsRedirect(probes),
    checkHostCanonical(probes),
    checkSecurityTxt(probes),
    checkMediaWeight(probes),
    checkViewportUnits(styleText),
    // AI-surface access: robots.txt per bot, edge-level blocks, page directives,
    // llms.txt and the non-scoring agent-readiness signals.
    ...runAiAccessChecks({ doc: activeDoc, rawHtml, headers, robotsTxt, probes }),
  ];
  return checks;
}

// Deterministic health floor computed from the objective checks only. This is a
// SUBSET of each agent's full checklist, so it is a floor, not the agent score.
export function scoreFromChecks(checks) {
  // ADVISORY is excluded alongside NOT_MEASURED, for a different reason: the fact
  // was measured, but the standard behind it is a draft or an early-adoption feature
  // and penalising its absence would price the site against a spec that may not ship.
  const measured = checks.filter(c => c.verdict !== "NOT_MEASURED" && c.verdict !== "ADVISORY");
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
    notMeasured: checks.filter(c => c.verdict === "NOT_MEASURED").length,
    advisory: checks.filter(c => c.verdict === "ADVISORY").length,
    criticalFails,
    byAgent,
  };
}
