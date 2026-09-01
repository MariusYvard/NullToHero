// Tiny dependency-free HTML parser. Builds a forgiving element tree good enough
// for deterministic static checks (headings, images, meta, inline styles,
// background resolution). Not a spec-compliant parser and not a sanitizer; it is
// only ever fed content we then ANALYZE, never execute or re-serialize as trusted.
// Pure Node standard library.

const VOID = new Set([
  "area","base","br","col","embed","hr","img","input","link","meta",
  "param","source","track","wbr",
]);
const RAWTEXT = new Set(["script","style","noscript","template","textarea","title"]);

// Parse an attribute string ('a="1" b c=\'x\'') into a lowercase-keyed map.
function parseAttrs(str) {
  const attrs = {};
  const re = /([^\s"'=/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const name = m[1].toLowerCase();
    if (!name) continue;
    const val = m[3] !== undefined ? m[3]
      : m[4] !== undefined ? m[4]
      : m[5] !== undefined ? m[5]
      : "";
    attrs[name] = decodeEntities(val);
  }
  return attrs;
}

function decodeEntities(s) {
  if (!s || s.indexOf("&") === -1) return s;
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

export function parse(html) {
  const root = { type: "root", tag: null, attrs: {}, children: [], parent: null };
  let cur = root;
  let i = 0;
  const n = html.length;

  const open = (tag, attrs) => {
    const el = { type: "element", tag, attrs, children: [], parent: cur };
    cur.children.push(el);
    return el;
  };

  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) { addText(cur, html.slice(i)); break; }
    if (lt > i) addText(cur, html.slice(i, lt));

    // Comment / doctype / CDATA
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (html[lt + 1] === "!" || html[lt + 1] === "?") {
      const end = html.indexOf(">", lt + 1);
      i = end === -1 ? n : end + 1;
      continue;
    }

    // Closing tag
    if (html[lt + 1] === "/") {
      const end = html.indexOf(">", lt);
      const tag = html.slice(lt + 2, end === -1 ? n : end).trim().toLowerCase();
      // climb to the nearest matching open element
      let node = cur;
      while (node && node.tag !== tag) node = node.parent;
      if (node && node.parent) cur = node.parent;
      i = end === -1 ? n : end + 1;
      continue;
    }

    // Opening tag
    const end = html.indexOf(">", lt);
    if (end === -1) { addText(cur, html.slice(lt)); break; }
    let inner = html.slice(lt + 1, end);
    const selfClose = inner.endsWith("/");
    if (selfClose) inner = inner.slice(0, -1);
    const sp = inner.search(/[\s/]/);
    const tag = (sp === -1 ? inner : inner.slice(0, sp)).toLowerCase();
    const attrs = parseAttrs(sp === -1 ? "" : inner.slice(sp));
    if (!tag) { i = end + 1; continue; }

    const el = open(tag, attrs);
    i = end + 1;

    if (VOID.has(tag) || selfClose) continue;

    if (RAWTEXT.has(tag)) {
      const closeRe = new RegExp(`</${tag}\\b[^>]*>`, "i");
      const rest = html.slice(i);
      const cm = rest.match(closeRe);
      const textEnd = cm ? i + cm.index : n;
      addText(el, html.slice(i, textEnd));
      i = cm ? textEnd + cm[0].length : n;
      continue;
    }
    cur = el;
  }
  return root;
}

function addText(parent, text) {
  if (!text) return;
  parent.children.push({ type: "text", value: text, parent });
}

// Depth-first walk over element nodes.
export function walk(node, fn) {
  for (const c of node.children) {
    if (c.type === "element") { fn(c); walk(c, fn); }
  }
}

export function queryAll(root, tag) {
  const out = [];
  const t = tag.toLowerCase();
  walk(root, (el) => { if (el.tag === t) out.push(el); });
  return out;
}

export function first(root, tag) {
  const t = tag.toLowerCase();
  let found = null;
  walk(root, (el) => { if (!found && el.tag === t) found = el; });
  return found;
}

// Visible-ish text: concatenated text nodes excluding script/style/noscript.
export function textContent(node) {
  let out = "";
  const rec = (n) => {
    for (const c of n.children) {
      if (c.type === "text") out += c.value;
      else if (c.type === "element" && !RAWTEXT.has(c.tag)) rec(c);
    }
  };
  rec(node);
  return out;
}

// Parse an inline style attribute into a lowercase-keyed declaration map.
export function styleMap(el) {
  const out = {};
  const s = el.attrs && el.attrs.style;
  if (!s) return out;
  for (const decl of s.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const k = decl.slice(0, idx).trim().toLowerCase();
    const v = decl.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

export function ancestors(el) {
  const out = [];
  let p = el.parent;
  while (p) { out.push(p); p = p.parent; }
  return out;
}

// Resolve an opaque background color string for an element by walking ancestors'
// inline backgrounds, defaulting to white. Deterministic and render-free.
export function resolveBackgroundStr(el) {
  const chain = [el, ...ancestors(el)];
  for (const node of chain) {
    if (node.type !== "element") continue;
    const st = styleMap(node);
    const bg = st["background-color"] || pickBgColor(st["background"]);
    if (bg && bg !== "transparent" && bg.toLowerCase() !== "inherit") return bg;
  }
  return "#ffffff";
}

// Extract a color token from a shorthand `background` value, if any.
function pickBgColor(val) {
  if (!val) return null;
  const m = val.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b[a-z]+\b/);
  return m ? m[0] : null;
}
