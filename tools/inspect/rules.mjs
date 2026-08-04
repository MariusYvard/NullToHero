// NullToHero :: deterministic anti-pattern rules
//
// WHY THIS EXISTS
// ---------------
// `/inspect detect` used to shell out to `npx impeccable@2.3.2`. That worked, and
// pinning it was right, because an unpinned npx makes the same page produce two
// verdicts on two days. But it left the plugin's detection frozen on an old
// release of somebody else's tool, and it meant the 72 rules in
// tools/data/inspect-rules.csv were documentation an agent read rather than
// assertions a script made.
//
// This file executes that registry. Nothing here is transcribed from another
// project: every rule is one of NullToHero's own, and each finding carries the
// registry id so the prose and the code cannot drift apart. A guard in
// tests/validate.js fails the build if an implemented id is not in the CSV.
//
// DESIGN CONSTRAINT: NO MODEL, NO NETWORK, NO EXECUTION
// ----------------------------------------------------
// Same constraint as tools/audit/lib. These rules read text. They never render,
// never fetch, and never run page script, so they are cheap enough to put in a
// pre-commit hook and safe enough to point at a stranger's repository. The cost
// is that anything requiring layout (does this actually overflow at 375px) stays
// out of scope and belongs to the Playwright pass in /inspect preview.
//
// WHAT A RULE OWES
// ----------------
// An id present in inspect-rules.csv, a detector, and two fixtures: one that must
// fire and one that must not. A rule without a passing negative fixture is worse
// than no rule, because it teaches its user to ignore the output.

import { parse, queryAll, textContent } from "../audit/lib/html.mjs";

const attr = (el, name) => (el.attrs ? el.attrs[name] : undefined);
const has = (el, name) => attr(el, name) !== undefined;
const text = (el) => textContent(el).replace(/\s+/g, " ").trim();

// Strip comments and string literals so a rule never matches its own counter-example
// sitting in a code comment. Cheap, and it removes the most common false positive.
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const finding = (id, where, evidence) => ({ id, where, evidence });

export const RULES = [
  {
    id: 2,
    name: "Visible focus",
    detect({ css }) {
      const c = decomment(css);
      // outline killed on a focus rule, with no :focus-visible rule anywhere that
      // restores one. Killing :focus and restoring on :focus-visible is the correct
      // modern pattern and must not fire.
      const killers = [...c.matchAll(/([^{}]*:focus\b[^{}]*)\{([^}]*)\}/g)]
        .filter(m => /outline\s*:\s*(none|0)\b/i.test(m[2]))
        .filter(m => !/:focus-visible/.test(m[1]));
      if (!killers.length) return [];
      const restores = /:focus-visible[^{}]*\{[^}]*outline\s*:\s*(?!none|0\b)/i.test(c);
      if (restores) return [];
      return [finding(2, "css", killers[0][0].trim().slice(0, 80))];
    },
  },
  {
    id: 3,
    name: "Icon-only buttons",
    detect({ doc }) {
      return queryAll(doc, "button")
        .filter(b => !text(b) &&
          !has(b, "aria-label") && !has(b, "aria-labelledby") && !has(b, "title"))
        .map(b => finding(3, "html", `<button> with no text and no accessible name`));
    },
  },
  {
    id: 4,
    name: "Image alt text",
    detect({ doc }) {
      // alt="" is a deliberate decorative marker and passes. A missing attribute
      // is the defect: a screen reader then announces the file name.
      return queryAll(doc, "img").filter(im => !has(im, "alt"))
        .map(im => finding(4, "html", `<img src="${attr(im, "src") || "?"}"> has no alt attribute`));
    },
  },
  {
    id: 7,
    name: "Form labels",
    detect({ doc }) {
      const labelled = new Set(
        queryAll(doc, "label").map(l => attr(l, "for")).filter(Boolean));
      return queryAll(doc, "input")
        .filter(i => !["hidden", "submit", "button", "reset", "image"].includes(attr(i, "type")))
        .filter(i => has(i, "placeholder"))
        .filter(i => !has(i, "aria-label") && !has(i, "aria-labelledby"))
        .filter(i => !(attr(i, "id") && labelled.has(attr(i, "id"))))
        .map(i => finding(7, "html", `<input placeholder="${attr(i, "placeholder")}"> is its own label`));
    },
  },
  {
    id: 11,
    name: "Modern image formats",
    detect({ doc, html }) {
      // The registry rule is about hero images, and so is this. Firing on every
      // raster image on the page would be defensible in the abstract and useless
      // in practice: a page with forty thumbnails would bury its own real
      // findings under forty copies of this one. So the scope is the images that
      // carry the weight, the first one in the document (usually the LCP element)
      // and anything named like a hero.
      const modern = /<source[^>]+type=["']image\/(avif|webp)["']/i.test(html);
      if (modern) return [];
      const imgs = queryAll(doc, "img");
      const raster = (im) => /\.(png|jpe?g)(\?|$)/i.test(attr(im, "src") || "");
      const named = (im) => /hero|banner|cover|splash|masthead/i.test(attr(im, "src") || "");
      const suspects = imgs.filter(im => raster(im) && (named(im) || im === imgs[0]));
      return suspects.slice(0, 1)
        .map(im => finding(11, "html", `${attr(im, "src")} is the page's lead image and has no avif or webp alternative`));
    },
  },
  {
    id: 13,
    name: "Lazy-load below the fold",
    detect({ doc }) {
      const imgs = queryAll(doc, "img");
      // Below four images the question does not arise, and the first image is
      // usually the LCP element, which must stay eager.
      if (imgs.length < 4) return [];
      const lazy = imgs.filter(im => (attr(im, "loading") || "").toLowerCase() === "lazy");
      if (lazy.length) return [];
      return [finding(13, "html", `${imgs.length} images, none marked loading="lazy"`)];
    },
  },
  {
    id: 10,
    name: "Hover is not the only path",
    detect({ css }) {
      const c = decomment(css);
      // Deliberately coarse, and coarse in the safe direction: it fires only when
      // the sheet styles hover states and has no focus styling anywhere at all.
      // Matching hover selectors to their focus counterparts one by one would need
      // a real selector model, and would produce a long tail of arguable findings.
      if (!/:hover\b[^{}]*\{[^}]*\S[^}]*\}/.test(c)) return [];
      if (/:focus(-visible|-within)?\b/.test(c)) return [];
      return [finding(10, "css", "the sheet styles :hover and never styles :focus")];
    },
  },
  {
    id: 22,
    name: "Animate cheap properties",
    detect({ css }) {
      const c = decomment(css);
      const layout = /(transition|animation)(-property)?\s*:[^;}]*\b(width|height|top|left|right|bottom|margin|padding)\b/i;
      const m = c.match(layout);
      if (!m) return [];
      return [finding(22, "css", `${m[0].trim().slice(0, 60)} animates a layout property, not transform or opacity`)];
    },
  },
  {
    id: 28,
    name: "External link safety",
    detect({ doc }) {
      return queryAll(doc, "a")
        .filter(a => (attr(a, "target") || "").toLowerCase() === "_blank")
        .filter(a => !/no(opener|referrer)/i.test(attr(a, "rel") || ""))
        .map(a => finding(28, "html", `target="_blank" on ${attr(a, "href") || "?"} without rel="noopener"`));
    },
  },
  {
    id: 36,
    name: "Semantic interactive elements",
    detect({ doc, html }) {
      const out = [];
      for (const tag of ["div", "span"]) {
        for (const el of queryAll(doc, tag)) {
          const role = (attr(el, "role") || "").toLowerCase();
          const clickable = has(el, "onclick") || ["button", "link"].includes(role);
          if (!clickable) continue;
          if (has(el, "tabindex")) continue;
          out.push(finding(36, "html", `<${tag}${role ? ` role="${role}"` : " onclick"}> is interactive but not focusable`));
        }
      }
      // JSX and framework templates never reach the HTML parser, so catch the
      // same shape in source text.
      for (const m of html.matchAll(/<(div|span)[^>]*\son(Click|click)=/g)) {
        if (/tabIndex|tabindex/.test(html.slice(m.index, m.index + 200))) continue;
        out.push(finding(36, "html", `<${m[1]}> with a click handler and no tabIndex`));
      }
      return out.slice(0, 5);
    },
  },
  {
    id: 40,
    name: "Avoid eval",
    detect({ js }) {
      const out = [];
      if (/(^|[^.\w])eval\s*\(/.test(js)) out.push(finding(40, "js", "eval( in client code"));
      if (/new\s+Function\s*\(/.test(js)) out.push(finding(40, "js", "new Function( in client code"));
      return out;
    },
  },
  {
    id: 37,
    name: "No debug noise",
    detect({ js }) {
      const hits = [...js.matchAll(/console\.(log|debug|dir)\s*\(/g)];
      if (!hits.length) return [];
      return [finding(37, "js", `${hits.length} console.${hits[0][1]} call${hits.length > 1 ? "s" : ""} left in`)];
    },
  },
  {
    id: 69,
    name: "Invisible layers still take clicks",
    detect({ css }) {
      const c = decomment(css);
      return [...c.matchAll(/([^{}]+)\{([^}]*)\}/g)]
        .filter(m => /opacity\s*:\s*0\s*(;|$)/.test(m[2]))
        .filter(m => !/pointer-events\s*:\s*none/.test(m[2]))
        .slice(0, 3)
        .map(m => finding(69, "css", `${m[1].trim().slice(0, 40)} is opacity:0 and still takes clicks`));
    },
  },
];

export function runRules({ html = "", css = "", js = "" } = {}) {
  const doc = parse(html);
  const out = [];
  for (const rule of RULES) {
    try { out.push(...rule.detect({ doc, html, css, js })); }
    catch (e) { out.push(finding(rule.id, "engine", `rule threw: ${e.message}`)); }
  }
  return out;
}
