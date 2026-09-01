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

// Selectors that reach every element in the document, so a token defined there is
// the page's baseline and may be believed without knowing which element asks.
const UNIVERSAL_SELECTOR = /^(:root|html|body|\*)$/i;
function isUniversalSelector(sel) { return UNIVERSAL_SELECTOR.test(String(sel || "").trim()); }

// Can we decide, for an arbitrary element, whether this selector matches it? Single
// tag, class and id tokens: yes. Compound, descendant, attribute and state selectors:
// no, and saying "no" out loud is the point.
function isDecidableSelector(sel) {
  const base = String(sel || "").trim().replace(/::?[\w-]+(\([^)]*\))?$/, "");
  if (!base) return false;
  return /^[a-z][\w-]*$/i.test(base) || /^\.[\w-]+$/.test(base) || /^#[\w-]+$/.test(base);
}

/* Where a token is defined decides whether we may believe it.
   On :root (or html/body/*) it reaches every element, so it is the page baseline.
   On a selector we can match it reaches only the elements it matches, so it belongs
   to the rule and not to the page: folding those into one global last-wins map was
   how a rule matching NOTHING repainted the whole document, and how text a browser
   paints at 1.82:1 came back PASS.
   Behind a selector we cannot evaluate it is neither, so we only record that a
   competing value exists, and the caller declines to judge instead of inventing an
   answer in either direction. */
function classifyCustomProps(selectors, custom, vars, opaqueVars) {
  if (selectors.some(isUniversalSelector)) {
    for (const k of Object.keys(custom)) vars.set(k, custom[k]);
    return;
  }
  if (selectors.some(s => !isDecidableSelector(s))) {
    for (const k of Object.keys(custom)) {
      if (!opaqueVars.has(k)) opaqueVars.set(k, new Set());
      opaqueVars.get(k).add(custom[k]);
    }
  }
}

function walkRules(css, vars, rules, depth, opaqueVars) {
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
        if (/^@(media|supports|container|layer|scope)/i.test(selector)) walkRules(body, vars, rules, depth + 1, opaqueVars);
        // @font-face, @keyframes, @import etc. carry no contrast-relevant rules.
      } else if (selector && body.indexOf("{") === -1) {
        const decls = parseDecls(body);
        const selectors = selector.split(",").map(s => s.trim()).filter(Boolean);
        const custom = {};
        for (const k of Object.keys(decls)) if (k.startsWith("--")) custom[k] = decls[k];
        if (Object.keys(custom).length) classifyCustomProps(selectors, custom, vars, opaqueVars);
        rules.push({ selectors, decls, custom });
      } else if (selector) {
        // Nested rule (CSS nesting). Best-effort: capture the child rules; the
        // parent selector context is dropped, so any token it defines is recorded
        // as a competing value rather than applied to everything.
        walkRules(body, vars, rules, depth + 1, opaqueVars);
      }
      i = j;
    } else if (ch === "}") {
      i++;
    } else {
      sel += ch; i++;
    }
  }
}

// Parse a stylesheet into { vars, rules, opaqueVars }.
//   vars       page-baseline custom properties (:root / html / body / *), last wins.
//   rules      source-ordered [{selectors, decls, custom}]; `custom` is applied only
//              to elements the rule actually matches (see varScopeFor).
//   opaqueVars name -> Set(values) for tokens defined behind a selector this model
//              cannot evaluate. Not applied, never guessed: their presence is what
//              lets a caller answer "we did not see this one".
export function parseStylesheet(cssText) {
  const vars = new Map();
  const rules = [];
  const opaqueVars = new Map();
  walkRules(stripComments(String(cssText || "")), vars, rules, 0, opaqueVars);
  return { vars, rules, opaqueVars };
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

function selectorKeyFor(el) {
  return {
    tag: (el.tag || "").toLowerCase(),
    classes: new Set((((el.attrs && el.attrs.class) || "")).split(/\s+/).filter(Boolean)),
    id: (el.attrs && el.attrs.id) || "",
  };
}

// Self and ancestors, outermost first, so nearer definitions overwrite farther ones.
function elementChain(el) {
  const chain = [];
  for (let n = el; n && n.type === "element"; n = n.parent) chain.unshift(n);
  return chain;
}

/* The custom properties in force ON THIS ELEMENT: the page baseline, then every
   rule that matches the element or one of its ancestors, nearest last, then its
   inline style. Custom properties inherit, so the ancestor walk is not a nicety:
   `.panel { --ink: cream }` is how a themed section repaints the text inside it,
   and an element-local view would miss it and report the baseline colour. */
export function varScopeFor(el, model, inlineStyle = {}) {
  const scope = new Map(model.vars);
  for (const node of elementChain(el)) {
    const { tag, classes, id } = selectorKeyFor(node);
    for (const rule of model.rules) {
      if (!rule.custom) continue;
      const names = Object.keys(rule.custom);
      if (!names.length) continue;
      if (!rule.selectors.some(s => selectorMatches(s, tag, classes, id))) continue;
      for (const k of names) scope.set(k, rule.custom[k]);
    }
  }
  for (const k of Object.keys(inlineStyle)) if (k.startsWith("--")) scope.set(k, inlineStyle[k]);
  return scope;
}

// Every token a value ends up reading, following references through the scope.
function consumedTokens(value, scope, depth = 0, out = new Set()) {
  if (value == null || depth > 12) return out;
  const s = String(value);
  if (s.indexOf("var(") === -1) return out;
  const re = /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g;
  let m;
  while ((m = re.exec(s))) {
    out.add(m[1]);
    if (scope.has(m[1])) consumedTokens(scope.get(m[1]), scope, depth + 1, out);
    if (m[2]) consumedTokens(m[2], scope, depth + 1, out);
  }
  return out;
}

// Compute an element's effective declaration map: matching tag/class/id rules in
// source order, then inline styles last. var() is resolved against the element's own
// token scope, not a page-wide map.
//
// When a token this element reads is ALSO defined behind a selector we cannot
// evaluate, and with a different value, the honest answer is that we do not know
// which one paints: the names land on a non-enumerable `$ambiguousTokens` so the
// caller can decline to judge. Inventing a pass here is worse than inventing a
// failure, because nobody re-checks a green verdict.
export function computeElementStyle(el, model, inlineStyle = {}) {
  const { tag, classes, id } = selectorKeyFor(el);
  const merged = {};
  for (const rule of model.rules) {
    if (rule.selectors.some(s => selectorMatches(s, tag, classes, id))) Object.assign(merged, rule.decls);
  }
  Object.assign(merged, inlineStyle);
  const scope = varScopeFor(el, model, inlineStyle);
  const ambiguous = new Set();
  for (const key of ["color", "background-color", "background", "font-size", "font-weight"]) {
    if (merged[key] == null) continue;
    const raw = merged[key];
    if (model.opaqueVars && model.opaqueVars.size) {
      for (const name of consumedTokens(raw, scope)) {
        const competing = model.opaqueVars.get(name);
        if (!competing) continue;
        const here = scope.has(name) ? String(scope.get(name)).trim() : null;
        for (const v of competing) if (String(v).trim() !== here) { ambiguous.add(name); break; }
      }
    }
    merged[key] = resolveValue(raw, scope);
  }
  if (ambiguous.size) {
    Object.defineProperty(merged, "$ambiguousTokens", { value: [...ambiguous], enumerable: false });
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
