// Bounded, dependency-free CSS model for the static analyzer. Parses a stylesheet
// (inline <style> blocks plus fetched linked CSS) into custom properties and a
// flat, source-ordered rule list, resolves var() references, and computes an
// element's effective declarations from tag- and class-level rules plus inline
// styles. This is a deterministic BEST-EFFORT cascade: it matches single tag,
// class and id selector tokens only and ignores specificity, combinators, media
// query conditions and state pseudo-classes. It exists so the static contrast
// check can resolve token-based colors (color: var(--ink)) without a headless
// browser; it is not a spec-compliant CSS engine.
//
// Pure Node standard library.

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Parse a declaration block body "a: b; c: d" into a lowercased map.
function parseDecls(body) {
  const out = {};
  for (const decl of body.split(";")) {
    const i = decl.indexOf(":");
    if (i === -1) continue;
    const k = decl.slice(0, i).trim().toLowerCase();
    const v = decl.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

// Extract the first color-looking token from a `background` shorthand value.
//
// The function forms MUST come before the bare-word alternative. Without
// `oklch(...)` in the list, `background: oklch(98% 0.003 88)` fell through to
// `\b[a-z]+\b` and returned the word "oklch" — not a colour, so the background
// resolved as "unknown" and every text sample on the page was dropped before it
// ever reached the parser. `color()` is matched whole for the same reason: we
// cannot convert it, but reporting it as unreadable beats degrading to "color".
export function pickColor(val) {
  if (!val) return null;
  const m = String(val).match(/#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lch|lab|color)\([^)]*\)|var\(--[\w-]+[^)]*\)|\b[a-z]+\b/);
  return m ? m[0] : null;
}

function walkRules(css, vars, rules, depth) {
  if (depth > 8) return;
  let i = 0; const n = css.length; let sel = "";
  while (i < n) {
    const ch = css[i];
    if (ch === "{") {
      let j = i + 1, d = 1;
      while (j < n && d > 0) { const c = css[j]; if (c === "{") d++; else if (c === "}") d--; j++; }
      const body = css.slice(i + 1, j - 1);
      const selector = sel.trim();
      sel = "";
      if (selector.startsWith("@")) {
        // conditional group rules carry nested style rules; recurse into them.
        if (/^@(media|supports|container|layer|scope)/i.test(selector)) walkRules(body, vars, rules, depth + 1);
        // @font-face, @keyframes, @import etc. carry no contrast-relevant rules.
      } else if (selector && body.indexOf("{") === -1) {
        const decls = parseDecls(body);
        for (const k of Object.keys(decls)) if (k.startsWith("--")) vars.set(k, decls[k]);
        rules.push({ selectors: selector.split(",").map(s => s.trim()).filter(Boolean), decls });
      } else if (selector) {
        // Nested rule (CSS nesting). Best-effort: capture the child rules; the
        // parent selector context is dropped.
        walkRules(body, vars, rules, depth + 1);
      }
      i = j;
    } else if (ch === "}") {
      i++;
    } else {
      sel += ch; i++;
    }
  }
}

// Parse a stylesheet into { vars: Map, rules: [{selectors, decls}] }. Custom
// properties from any rule (typically :root) are collected into one map; the last
// definition wins, matching cascade order for simple sheets.
export function parseStylesheet(cssText) {
  const vars = new Map();
  const rules = [];
  walkRules(stripComments(String(cssText || "")), vars, rules, 0);
  return { vars, rules };
}

// Resolve var(--x, fallback) references against the custom-property map. Bounded
// recursion; unresolved references collapse to their fallback or empty string.
export function resolveValue(value, vars, depth = 0) {
  if (value == null) return value;
  const s = String(value);
  if (depth > 12 || s.indexOf("var(") === -1) return s;
  return s.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (_, name, fb) => {
    if (vars.has(name)) return resolveValue(vars.get(name), vars, depth + 1);
    return fb !== undefined ? resolveValue(fb.trim(), vars, depth + 1) : "";
  });
}

// Match a single-token selector against an element. Compound, descendant and
// state-dependent selectors are intentionally not matched.
function selectorMatches(sel, tag, classes, id) {
  const raw = sel.trim();
  // Skip state and generated-content selectors: their colors are not the default.
  if (/:(hover|focus|focus-visible|focus-within|active|visited|target|checked|disabled|before|after|placeholder|selection)\b/i.test(raw)) return false;
  const base = raw.replace(/::?[\w-]+(\([^)]*\))?$/, "");
  if (!base || base === "*") return false;
  if (/^[a-z][\w-]*$/i.test(base)) return base.toLowerCase() === tag;
  if (/^\.[\w-]+$/.test(base)) return classes.has(base.slice(1));
  if (/^#[\w-]+$/.test(base)) return base.slice(1) === id;
  return false;
}

// Compute an element's effective declaration map: matching tag/class/id rules in
// source order, then inline styles last. var() is resolved on color-bearing and
// font props. `inlineStyle` is the element's parsed inline style attribute.
export function computeElementStyle(el, model, inlineStyle = {}) {
  const tag = (el.tag || "").toLowerCase();
  const classes = new Set((((el.attrs && el.attrs.class) || "")).split(/\s+/).filter(Boolean));
  const id = (el.attrs && el.attrs.id) || "";
  const merged = {};
  for (const rule of model.rules) {
    if (rule.selectors.some(s => selectorMatches(s, tag, classes, id))) Object.assign(merged, rule.decls);
  }
  Object.assign(merged, inlineStyle);
  for (const key of ["color", "background-color", "background", "font-size", "font-weight"]) {
    if (merged[key] != null) merged[key] = resolveValue(merged[key], model.vars);
  }
  return merged;
}

// The page's default background from :root / html / body rules (last wins), or
// null. Used so a dark-theme page is not measured against an assumed white page.
export function pageBackground(model) {
  let bg = null;
  for (const rule of model.rules) {
    if (rule.selectors.some(s => /^(:root|html|body)$/i.test(s.trim()))) {
      const v = rule.decls["background-color"] || pickColor(rule.decls["background"]);
      if (v) bg = resolveValue(v, model.vars);
    }
  }
  return bg;
}
