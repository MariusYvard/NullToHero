// NullToHero :: deterministic rule engine
//
// The directory is named after a skill that no longer exists. Since v6 these
// engines are called by `/audit checks` (rules, rendered, motion, three) and by
// `/siteasy preview` (capture). The name is kept because renaming it would move
// a hundred cited locations in the architecture review for no gain; what was
// missing was this sentence, not another path.
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

// Leaf rule blocks with their real selector.
//
// A regex over `selector { body }` cannot do this, and the way it fails is quiet.
// `[^}]*` does not exclude `{`, so against `@media (...) { .ball { opacity: 0 } }`
// it captures the media query as the selector and everything up to the first `}`
// as the body. Rule 69 then reports a critical finding against a media query.
// Found by pointing the detector at the plugin's own assets/animations, where 25
// of 25 files wrap their motion in a preference query. Same shape as the
// @keyframes false positive fixed in v3.0.0, which is why this is now a walker
// and not a longer regex: the next at-rule would have broken the regex again.
const NESTED_AT = /^@(?:media|supports|container|layer|scope|document)\b/i;
function leafBlocks(css) {
  const c = decomment(css);
  const out = [];
  // The at-rules we descended through to reach a leaf. Rule 69 needs it: an
  // opacity: 0 inside a prefers-reduced-motion block is the substitute for a
  // motion, not a layer parked over the page, and flagging it would make every
  // correct rule-83 guard a critical finding.
  const stack = [];
  let i = 0, prelude = "";
  const skipBlock = () => {              // i sits just past the opening brace
    let depth = 1;
    while (i < c.length && depth) {
      if (c[i] === "{") depth++;
      else if (c[i] === "}") depth--;
      i++;
    }
  };
  const depths = [];                     // brace depth at which each stack entry opened
  let depth = 0;
  while (i < c.length) {
    const ch = c[i];
    if (ch === "}") {
      depth--;
      while (depths.length && depths[depths.length - 1] > depth) { depths.pop(); stack.pop(); }
      prelude = ""; i++; continue;
    }
    if (ch !== "{") { prelude += ch; i++; continue; }
    i++; depth++;
    const head = prelude.trim();
    prelude = "";
    if (/^@keyframes\b/i.test(head)) { depth--; skipBlock(); continue; }  // a frame is not a layer
    if (NESTED_AT.test(head)) { stack.push(head); depths.push(depth); continue; }  // descend
    const start = i;
    skipBlock();
    depth--;
    out.push([head, c.slice(start, i - 1), stack.join(" ")]);
  }
  return out;
}

// Keyframe blocks, as [name, body] pairs. leafBlocks() deliberately skips
// @keyframes because a frame is not a layer; three rules below need exactly the
// part it throws away, so this is the mirror walker rather than a flag on that
// one. Same brace counting, same reason: a regex cannot tell a nested block from
// the end of the rule.
function keyframeBlocks(css) {
  const c = decomment(css);
  const out = [];
  const re = /@(?:-webkit-)?keyframes\s+([\w-]+)\s*\{/gi;
  let m;
  while ((m = re.exec(c)) !== null) {
    let i = re.lastIndex, depth = 1;
    while (i < c.length && depth) {
      if (c[i] === "{") depth++;
      else if (c[i] === "}") depth--;
      i++;
    }
    out.push([m[1], c.slice(re.lastIndex, i - 1)]);
    re.lastIndex = i;
  }
  return out;
}

// A CSS length in px, or null when the value is relative to something the
// stylesheet does not fix. Percentages and viewport units return null on
// purpose: they are the safe half of rule 73 and must never be measured.
function pxLength(value) {
  const m = /^(-?\d*\.?\d+)(px|rem|em)$/i.exec(value.trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  return /rem|em/i.test(m[2]) ? n * 16 : n;
}

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
      // leafBlocks drops @keyframes and descends through conditional at-rules, so
      // a frame of an animation and a rule wrapped in a preference query both stop
      // being reported as a layer over the page. Flagging either is a false
      // positive at the highest severity, which is the fastest way to teach
      // someone to ignore the whole report.
      return leafBlocks(css)
        .filter(([, body]) => /opacity\s*:\s*0\s*(?:;|\s*$)/.test(body))
        .filter(([, body]) => !/pointer-events\s*:\s*none/.test(body))
        // An opacity: 0 that carries its own `animation` is an entry state: it runs
        // on load and ends somewhere else. A parked layer waits for a state change,
        // which is `transition`, and that case stays in scope.
        .filter(([, body]) => !/\banimation(?:-name)?\s*:/i.test(body))
        // A leaf inside a reduced-motion query is the state the motion would have
        // reached, which is rule 83's whole subject. Reporting it as a parked layer
        // would make every correct guard a critical finding.
        .filter(([, , at]) => !/prefers-reduced-motion/i.test(at || ""))
        .filter(([sel]) => !/^(?:from|to|\d+%)$/.test(sel))
        .slice(0, 3)
        .map(([sel]) => finding(69, "css", `${sel.slice(0, 40)} is opacity:0 and still takes clicks`));
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Rules added after the v3.0.0 coverage triage.
  //
  // The v3.0.0 note recorded "59 of the 72 registry rules remain non-executable".
  // That count was wrong, and the way it was wrong is worth keeping: 18 of those
  // 59 were already executing inside tools/audit/lib/checks.mjs, reachable from
  // this same detector since v3.0.0, and reported under a check id
  // (viewport-meta, tap-target-size, scrub-easing-linear) rather than a registry
  // id. Nobody could tell. tools/data/rule-coverage.csv now names the executor of
  // every rule and a guard in tests/validate.js fails the build when it drifts.
  //
  // What follows implements the rules that were genuinely unexecuted AND decidable
  // on source text. Fifteen remain, listed in rule-coverage.csv as needs-render or
  // judgment, and they are not implemented here because a rule that guesses is a
  // rule that gets muted.
  //
  // ABSENCE RULES: a detector that fires on something MISSING will fire on every
  // fragment the scanner is ever pointed at, and this scanner is pointed at
  // fragments constantly (detect.mjs runs each .js file on its own, with no HTML
  // and no CSS). So each absence rule below states the precondition that makes the
  // absence mean anything, and stays silent otherwise.
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 21,
    name: "Respect reduced motion",
    detect({ css }) {
      const c = decomment(css);
      // A keyframe animation, not a transition. A transition fires because the
      // reader did something; a keyframe animation runs at the page's own
      // discretion, and that is the case the preference exists for. Scoping it
      // this way also stops it firing on every sheet that has a hover fade.
      if (!/@keyframes\b/.test(c) && !/\banimation(-name)?\s*:/.test(c)) return [];
      if (/prefers-reduced-motion/.test(c)) return [];
      return [finding(21, "css", "the sheet runs a keyframe animation and never queries prefers-reduced-motion")];
    },
  },
  {
    id: 24,
    name: "Active state",
    detect({ doc }) {
      const out = [];
      for (const nav of queryAll(doc, "nav")) {
        const links = queryAll(nav, "a");
        // Under three links there is nothing to orient inside.
        if (links.length < 3) continue;
        const marked = links.some(a => has(a, "aria-current") ||
          /(^|\s)(active|current|is-active|selected)(\s|$)/i.test(attr(a, "class") || ""));
        if (!marked) out.push(finding(24, "html", `<nav> with ${links.length} links, none marked aria-current or active`));
      }
      return out;
    },
  },
  {
    id: 26,
    name: "Mobile keyboard triggers",
    detect({ doc }) {
      // type="number" is right for a quantity and wrong for a code: it strips
      // leading zeros, accepts e and +, and renders a spinner nobody wants on a
      // one-time code. Restricted to fields whose own name says they carry a code,
      // because firing on every numeric input would be the noisy reading.
      const codeish = /(otp|^code$|[_-]code|pin|zip|postal|postcode|card|cvv|cvc|phone|tel|iban|siren|siret|account|invoice)/i;
      return queryAll(doc, "input")
        .filter(i => (attr(i, "type") || "").toLowerCase() === "number")
        .filter(i => codeish.test(`${attr(i, "name") || ""} ${attr(i, "id") || ""} ${attr(i, "autocomplete") || ""}`))
        .map(i => finding(26, "html", `<input type="number"> named ${attr(i, "name") || attr(i, "id")} carries a code, not a quantity`));
    },
  },
  {
    id: 29,
    name: "Unsanitized HTML",
    detect({ js }) {
      const out = [];
      for (const m of js.matchAll(/\.innerHTML\s*\+?=\s*([^;\n]+)/g)) {
        const rhs = m[1].trim();
        if (/^(["'])(?:(?!\1)[\s\S])*\1$/.test(rhs)) continue;   // the author's own literal
        if (/^`[^`$]*`$/.test(rhs)) continue;                     // template with no hole
        if (/\b(DOMPurify|sanitiz\w*|purify|escapeHtml)\b/i.test(rhs)) continue;
        out.push(finding(29, "js", `innerHTML assigned ${rhs.slice(0, 44)}`));
      }
      for (const m of js.matchAll(/dangerouslySetInnerHTML\s*=\s*\{\{[^}]*__html\s*:\s*([^}]+)\}/g)) {
        if (/\b(DOMPurify|sanitiz\w*|purify)\b/i.test(m[1])) continue;
        out.push(finding(29, "js", `dangerouslySetInnerHTML with ${m[1].trim().slice(0, 40)}`));
      }
      return out.slice(0, 5);
    },
  },
  {
    id: 30,
    name: "No secrets in client code",
    detect({ js, html }) {
      // Shapes only, never entropy heuristics: a high-entropy string is usually a
      // hash, and a rule that flags every hash is a rule that gets turned off.
      const text = `${js}\n${html}`;
      const shapes = [
        [/\bsk_live_[A-Za-z0-9]{6,}/, "a Stripe live secret key"],
        [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key id"],
        [/\bghp_[A-Za-z0-9]{16,}/, "a GitHub personal access token"],
        [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, "a Slack token"],
        [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "a private key block"],
      ];
      const out = [];
      for (const [re, what] of shapes) {
        const m = text.match(re);
        if (m) out.push(finding(30, "js", `${what} is in code that ships to the browser (${m[0].slice(0, 14)}…)`));
      }
      return out;
    },
  },
  {
    id: 31,
    name: "Non-blocking scripts",
    detect({ html }) {
      const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      if (!head) return [];
      const out = [];
      for (const m of head[1].matchAll(/<script\b[^>]*\bsrc\s*=[^>]*>/gi)) {
        const tag = m[0];
        if (/\b(defer|async)\b/i.test(tag)) continue;
        if (/type\s*=\s*["']module["']/i.test(tag)) continue;      // modules defer by default
        if (/type\s*=\s*["']application\/(ld\+json|json)["']/i.test(tag)) continue;
        const src = (tag.match(/src\s*=\s*["']([^"']+)/i) || [])[1] || "?";
        out.push(finding(31, "html", `<script src="${src}"> in <head> stops the parser until it lands`));
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 32,
    name: "Font loading",
    detect({ css }) {
      const blocks = [...decomment(css).matchAll(/@font-face\s*\{([^}]*)\}/gi)];
      if (!blocks.length) return [];
      const bare = blocks.filter(b => !/font-display\s*:/i.test(b[1]));
      if (!bare.length) return [];
      return [finding(32, "css", `${bare.length} @font-face block${bare.length > 1 ? "s" : ""} with no font-display, so text waits for the download`)];
    },
  },
  {
    id: 33,
    name: "Handle async failure",
    detect({ js }) {
      if (!/\bfetch\s*\(/.test(js)) return [];
      // Coarse, and coarse in the safe direction: it fires only when the file has
      // no error path at all. Pairing each call with its own handler needs a real
      // parser, and the arguable half of those findings would sink the useful half.
      if (/\btry\s*\{/.test(js)) return [];
      if (/\.catch\s*\(/.test(js)) return [];
      if (/\bon[Ee]rror\b|\berrorBoundary\b/.test(js)) return [];
      return [finding(33, "js", "the file calls fetch and holds no try, no .catch and no error branch")];
    },
  },
  {
    id: 38,
    name: "Error leakage",
    detect({ js }) {
      const out = [];
      for (const m of js.matchAll(/\.(?:send|json|end|write)\s*\(\s*[A-Za-z_$][\w$]*\.stack\b/g)) {
        out.push(finding(38, "js", `${m[0].trim()} hands the client a stack trace`));
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 39,
    name: "Auth token storage",
    detect({ js }) {
      const out = [];
      for (const m of js.matchAll(/\b(?:local|session)Storage\s*(?:\.setItem\s*\(\s*|\[\s*)["'`]([^"'`]+)/g)) {
        if (!/(token|jwt|auth|session|bearer|credential|refresh)/i.test(m[1])) continue;
        out.push(finding(39, "js", `"${m[1]}" is written to web storage, which any script on the page can read`));
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 41,
    name: "Parse JSON safely",
    detect({ js }) {
      if (!/JSON\.parse\s*\(/.test(js)) return [];
      if (/\btry\s*\{/.test(js) || /\bsafeParse\b/.test(js)) return [];
      const line = js.match(/[^\n]*JSON\.parse\s*\([^\n]*/);
      return [finding(41, "js", `${(line ? line[0] : "JSON.parse(").trim().slice(0, 56)} with nothing to catch a malformed body`)];
    },
  },
  {
    id: 42,
    name: "Clean up listeners",
    detect({ js }) {
      // Scoped to lifecycle hooks. A listener added once at module scope for the
      // life of the page is fine; one added on mount and never removed leaks on
      // every remount, and that is the defect the registry names.
      const out = [];
      for (const m of js.matchAll(/\b(useEffect|useLayoutEffect|onMounted|onMount|componentDidMount|connectedCallback)\b/g)) {
        const body = js.slice(m.index, m.index + 600);
        if (!/addEventListener\s*\(/.test(body)) continue;
        if (/removeEventListener\s*\(/.test(body)) continue;
        if (/\bsignal\s*:/.test(body)) continue;                   // AbortController is a teardown
        out.push(finding(42, "js", `${m[1]} adds a listener and returns no teardown`));
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 43,
    name: "Print stylesheet",
    detect({ css }) {
      const c = decomment(css);
      // Only a real sheet is judged. "No print styles" on a twelve-line fragment
      // is noise, and noise is how a detector earns its mute.
      const blocks = leafBlocks(css).length;
      if (blocks < 25) return [];
      if (/@media[^{]*\bprint\b/i.test(c)) return [];
      return [finding(43, "css", `${blocks} rule blocks and no @media print, so printing and PDF export are unstyled`)];
    },
  },
  {
    id: 44,
    name: "Skip link",
    detect({ doc, css }) {
      const c = decomment(css);
      // The defect is a skip link parked off-screen with nothing bringing it back
      // on focus. A page with no skip link at all is a different finding and
      // belongs to the audit's landmark pass, not here.
      const link = queryAll(doc, "a").find(a => /^#/.test(attr(a, "href") || "") &&
        /skip/i.test(`${attr(a, "class") || ""} ${text(a)}`));
      if (!link) return [];
      const classes = (attr(link, "class") || "").split(/\s+/).filter(Boolean);
      if (!classes.length) return [];
      const parked = classes.find(k =>
        new RegExp(`\\.${k}\\b[^{}]*\\{[^}]*(?:left\\s*:\\s*-\\d|clip\\s*:|clip-path\\s*:|width\\s*:\\s*1px)`, "i").test(c));
      if (!parked) return [];
      if (new RegExp(`\\.${parked}\\b[^{}]*:focus`, "i").test(c)) return [];
      return [finding(44, "css", `.${parked} is parked off-screen and no :focus rule brings it back`)];
    },
  },
  {
    id: 45,
    name: "Color-scheme meta",
    detect({ doc, css, html }) {
      if (!/<head\b/i.test(html)) return [];
      // Only meaningful once the page actually supports two schemes. Otherwise
      // the declaration has nothing to declare and the finding is busywork.
      if (!/prefers-color-scheme/i.test(css)) return [];
      // Lookbehind, not \b: the hyphen in prefers-color-scheme is a non-word
      // character, so \b matches inside it and the query counts as a declaration.
      const declared = queryAll(doc, "meta")
        .some(m => (attr(m, "name") || "").toLowerCase() === "color-scheme") ||
        /(?<![-\w])color-scheme\s*:/i.test(css);
      if (declared) return [];
      return [finding(45, "html", "the sheet carries a dark scheme and nothing declares color-scheme, so native controls stay light")];
    },
  },
  {
    id: 46,
    name: "Guard JS-only UI",
    detect({ html, doc }) {
      if (!/<head\b/i.test(html)) return [];
      if (/<noscript\b/i.test(html)) return [];
      // The shape is an empty mount point plus a script that fills it. A
      // server-rendered page carries content inside its root and does not match,
      // so this fires on the shell and not on every page that loads JavaScript.
      const empty = queryAll(doc, "div")
        .filter(d => /^(root|app|__next|__nuxt|main-app)$/i.test(attr(d, "id") || ""))
        .find(d => !textContent(d).trim() && !queryAll(d, "img").length);
      if (!empty) return [];
      if (!/<script[^>]+\bsrc\s*=/i.test(html) && !/type\s*=\s*["']module["']/i.test(html)) return [];
      return [finding(46, "html", `<div id="${attr(empty, "id")}"> is empty in the source and no <noscript> says what to do when the script never runs`)];
    },
  },
  {
    id: 48,
    name: "One smoothing system",
    detect({ css, js, html }) {
      if (!/scroll-behavior\s*:\s*smooth/i.test(decomment(css))) return [];
      if (!/\b(Lenis|ScrollSmoother|LocomotiveScroll|locomotive-scroll)\b/.test(`${js}\n${html}`)) return [];
      return [finding(48, "css", "scroll-behavior: smooth on top of a smooth-scroll library, two systems driving one scroll")];
    },
  },
  {
    id: 50,
    name: "Custom cursor keeps a fallback",
    detect({ css }) {
      const c = decomment(css);
      const kill = leafBlocks(css)
        .filter(([, body]) => /cursor\s*:\s*none/i.test(body))
        // Not \b after the star: * is not a word character, so \b never matches there.
        .filter(([sel, body]) => /^(?:\*|html|body|:root)(?:\s|,|$)/.test(sel) ||
          /cursor\s*:\s*none\s*!important/i.test(body));
      if (!kill.length) return [];
      if (/@media[^{]*pointer\s*:\s*(?:fine|coarse)/i.test(c)) return [];
      return [finding(50, "css", `${kill[0][0].slice(0, 30)} sets cursor: none with no (pointer: fine) guard`)];
    },
  },
  {
    id: 55,
    name: "Detect capability, not user agent",
    detect({ js }) {
      return [...js.matchAll(/navigator\.(userAgent|platform|vendor)\b/g)]
        .slice(0, 2)
        .map(m => finding(55, "js", `navigator.${m[1]} branches on a string the browser is free to lie about`));
    },
  },
  {
    id: 57,
    name: "No state updates in frame loops",
    detect({ js }) {
      const out = [];
      for (const m of js.matchAll(/\b(useFrame|requestAnimationFrame)\s*\(/g)) {
        const body = js.slice(m.index, m.index + 400);
        const hit = body.match(/\bset[A-Z]\w*\s*\(|\.setState\s*\(/);
        if (!hit) continue;
        out.push(finding(57, "js", `${hit[0].replace(/\s*\($/, "")} inside ${m[1]}, one React render per frame`));
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 59,
    name: "Animate by delta time",
    detect({ js }) {
      const out = [];
      for (const m of js.matchAll(/\b(useFrame|requestAnimationFrame)\s*\(([\s\S]{0,300})/g)) {
        if (/\bdelta\b|\bdt\b|\belapsed\b|getDelta\s*\(/.test(m[2])) continue;
        const fixed = m[2].match(/[\w.\]]+\s*[+-]=\s*-?\d*\.\d+\s*[;\n)]/);
        if (!fixed) continue;
        out.push(finding(59, "js", `${fixed[0].trim().replace(/[;)]$/, "")} advances a fixed step per frame, so speed follows the refresh rate`));
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 60,
    name: "Cache asset loaders",
    detect({ js }) {
      return [...js.matchAll(/new\s+(GLTFLoader|TextureLoader|FBXLoader|DRACOLoader|OBJLoader|CubeTextureLoader)\s*\(/g)]
        .slice(0, 3)
        .map(m => finding(60, "js", `new ${m[1]}() outside a cached loader re-downloads the asset on every mount`));
    },
  },
  {
    id: 61,
    name: "Keep constructor props declarative",
    detect({ js }) {
      return [...js.matchAll(/\b(geometry|material|map|texture)\s*=\s*\{\s*new\s+([\w.]+)\s*\(/g)]
        .slice(0, 3)
        .map(m => finding(61, "js", `${m[1]}={new ${m[2]}(...)} builds an engine object on every render`));
    },
  },
  {
    id: 64,
    name: "Localize number formatting",
    detect({ js }) {
      return [...js.matchAll(/new\s+Intl\.(NumberFormat|DateTimeFormat)\s*\(\s*["']([a-z]{2}(?:-[A-Za-z0-9]+)*)["']/g)]
        .slice(0, 3)
        .map(m => finding(64, "js", `Intl.${m[1]}("${m[2]}") pins a locale the page may not be in`));
    },
  },
  {
    id: 65,
    name: "Modern video formats with fallback",
    detect({ doc, html }) {
      if (!queryAll(doc, "video").length) return [];
      if (/<source[^>]+type\s*=\s*["']video\/webm["']/i.test(html)) return [];
      if (!/\.mp4(?:["'?]|$)/im.test(html)) return [];
      return [finding(65, "html", "MP4 is the only source offered, with no WebM for the browsers that take it")];
    },
  },
  {
    id: 66,
    name: "Lazy-load below-fold video",
    detect({ doc }) {
      return queryAll(doc, "video")
        .filter(v => (attr(v, "preload") || "").toLowerCase() === "auto")
        .filter(v => !has(v, "autoplay"))
        .map(() => finding(66, "html", `<video preload="auto"> downloads in full before anyone asks to watch it`));
    },
  },
  {
    id: 67,
    name: "Mark up content video",
    detect({ doc, html }) {
      // Content video is the kind a reader chooses to watch, so it has controls.
      // A muted decorative loop is not what this rule is about.
      const watched = queryAll(doc, "video").filter(v => has(v, "controls"));
      if (!watched.length) return [];
      if (/"@type"\s*:\s*"VideoObject"/.test(html)) return [];
      return [finding(67, "html", `${watched.length} video with controls and no VideoObject JSON-LD, so search cannot see it`)];
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Rules added in v3.7.0, from a read of six public animation codebases.
  //
  // Every one is arithmetic rather than judgment, and every one was found as a
  // live defect in shipped code rather than derived from a principle. The
  // provenance matters because it is what stops this section becoming a list of
  // things that sound wrong: each rule below has a name and a file behind it.
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 73,
    name: "Entrance travel stays relative",
    detect({ css }) {
      // One library splits perfectly along this line: its percentage entrances
      // move an element by its own size and are safe at any width, and its
      // pixel entrances start 2000px out. At 375px that is 5.3 viewport widths.
      // Negative offsets are clipped, but the positive-direction twins open a
      // 2000px horizontal scroll region, and the exit variants keep it open for
      // good because animation-fill-mode: both parks the element there.
      //
      // The threshold is L-MOTION-4, the narrowest viewport the plugin supports.
      // Percentages and viewport units are not measured at all: they are the
      // correct construction and pxLength returns null for them.
      const NARROWEST = 375;
      const out = [];
      for (const [name, body] of keyframeBlocks(css)) {
        let worst = 0, sample = "";
        for (const t of body.matchAll(/translate(?:3d|X|Y|Z)?\s*\(([^)]*)\)/gi)) {
          for (const arg of t[1].split(",")) {
            const px = pxLength(arg);
            if (px !== null && Math.abs(px) > Math.abs(worst)) { worst = px; sample = t[0]; }
          }
        }
        if (Math.abs(worst) > NARROWEST) {
          out.push(finding(73, "css",
            `@keyframes ${name} travels ${Math.round(Math.abs(worst))}px, ${(Math.abs(worst) / NARROWEST).toFixed(1)} viewport widths at ${NARROWEST}px: ${sample.slice(0, 44)}`));
        }
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 74,
    name: "Stagger overlaps, it does not queue",
    detect({ js }) {
      // The accumulator adds the animation's own duration instead of a fraction
      // of it, so item N starts only once item N-1 has finished. Total reveal
      // becomes O(n x duration) instead of O(n x delay): eight words at a
      // one-second default finish at 8.8 seconds, and the headline is unreadable
      // for most of the visit. The same file's letter mode does delay * index
      // and is correct, which is why this fires on the accumulator shape and not
      // on the presence of a stagger.
      // Matching the delay variable to the accumulator by name does not work:
      // in the case this rule was written from they are two different variables,
      // one derived from the other. So this is a proximity rule, the same shape
      // as rules 57 and 59: an accumulator advanced by a duration, sitting inside
      // the same 400 characters as a write to animation-delay.
      const WINDOW = 400;
      const delays = [...js.matchAll(/animation-?[Dd]elay/g)].map(m => m.index);
      if (!delays.length) return [];
      const out = [];
      for (const m of js.matchAll(/\b([A-Za-z_$][\w$]*)\s*(?:\+=|=[^;\n]*\+)[^;\n]*\b(\w*[Dd]uration)\b/g)) {
        if (!delays.some(d => Math.abs(d - m.index) <= WINDOW)) continue;
        out.push(finding(74, "js",
          `${m[1]} is advanced by ${m[2]} beside a write to animation-delay, so item N waits for item N-1 to finish: ${m[0].trim().slice(0, 56)}`));
      }
      return out.slice(0, 2);
    },
  },
  {
    id: 75,
    name: "Split text keeps its accessible name",
    detect({ doc, html }) {
      // A text splitter wraps every character in an inline-block span. Those are
      // not inline text: several screen reader and browser pairings announce the
      // heading one letter at a time, and the per-character break opportunities
      // let a headline wrap mid-word at 375px.
      //
      // The detail that makes this critical rather than cosmetic: in the library
      // this was found in, the display: inline-block rule sits outside the
      // prefers-reduced-motion block. The animation stops and the shredding does
      // not, so the reader who asked for less motion keeps the whole harm.
      const named = (el) => has(el, "aria-label") || has(el, "aria-labelledby");
      const out = [];

      // Case 1: the split output is in the markup.
      const hosts = ["h1", "h2", "h3", "p", "div", "span", "a", "button"]
        .flatMap(tag => queryAll(doc, tag));
      for (const el of hosts) {
        const spans = (el.children || []).filter(c => c.tag === "span");
        if (spans.length < 8) continue;
        const chars = spans.filter(s => text(s).length === 1);
        if (chars.length < 8) continue;
        if (named(el)) continue;
        if (spans.every(s => has(s, "aria-hidden"))) continue;
        out.push(finding(75, "html",
          `<${el.tag}> is split into ${chars.length} single-character spans with no accessible name on the parent`));
      }

      // Case 2: the splitter has not run yet, and says so in an attribute. Three
      // real conventions, not a guess: Splitting.js, the GSAP SplitText data hook,
      // and the attribute family from the library above.
      for (const m of html.matchAll(/<([a-z0-9]+)\b([^>]*\b(?:data-splitting|split-by|data-split-text|ca__lt-[\w-]+)\b[^>]*)>/gi)) {
        if (/aria-label/i.test(m[2])) continue;
        out.push(finding(75, "html",
          `<${m[1]}> is marked for text splitting and carries no aria-label, so the generated spans become the accessible name`));
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 82,
    name: "A reduced-motion guard neutralises duration, it does not remove the animation",
    detect({ css }) {
      // `animation: none` under the preference query kills animationend. Any code
      // waiting on that event then deadlocks, and it deadlocks for exactly the
      // readers the guard was written to protect, which is why it survives review:
      // the author never sees it unless they toggle the OS setting.
      //
      // The two public libraries in this corpus disagree on precisely this. One
      // sets `animation-duration: 1ms !important` so the animation still completes
      // and still fires; the other sets `animation: none` and has the bug. The
      // plugin's own parallax.md has said 0.01ms since it was written.
      const c = decomment(css);
      const out = [];
      const re = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/gi;
      let m;
      while ((m = re.exec(c)) !== null) {
        let i = re.lastIndex, depth = 1;
        while (i < c.length && depth) {
          if (c[i] === "{") depth++;
          else if (c[i] === "}") depth--;
          i++;
        }
        const body = c.slice(re.lastIndex, i - 1);
        re.lastIndex = i;
        const kill = /animation(?:-name)?\s*:\s*none\b/i.exec(body);
        // One real exception, and it is narrow. On ::view-transition pseudo-elements
        // `animation: none` is the documented way to opt out: there is no author
        // handler on those pseudos, and startViewTransition's finished promise
        // resolves either way. The plugin's own animation-engineering.md ships that
        // exact snippet, and a rule that flags its own correct example is a rule
        // people switch off.
        if (kill && /::view-transition/i.test(body)) continue;
        if (kill) {
          out.push(finding(82, "css",
            `the reduced-motion block writes ${kill[0].trim()}, which stops animationend firing; neutralise the duration instead so the animation completes instantly`));
        }
      }
      return out.slice(0, 2);
    },
  },
  {
    id: 83,
    name: "A reduced-motion guard still reaches the end state",
    detect({ css }) {
      // Killing the motion is not the same as reaching the state the motion was
      // communicating. A 1ms fadeOut with fill-mode: both is a race, and the
      // element can end up visible: a dismissed toast that does not dismiss.
      //
      // The library that gets this right does it in one line,
      // `.animated[class*='Out'] { opacity: 0 }`, and it is the most considered
      // line in either of the two. The rule only fires once the sheet has exit
      // animations to protect, because a sheet with none has nothing to reach.
      const c = decomment(css);
      const guards = [...c.matchAll(/@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/gi)];
      if (!guards.length) return [];
      // An exit animation somewhere in the sheet: a keyframe or class named for
      // leaving. Without one there is no end state to miss.
      const EXITISH = /(?:out|exit|leave|dismiss|hide|close|collapse)\b/i;
      const hasExit = keyframeBlocks(css).some(([n]) => EXITISH.test(n)) ||
        leafBlocks(css).some(([sel, body]) => EXITISH.test(sel) && /\banimation(?:-name)?\s*:/i.test(body));
      if (!hasExit) return [];
      const out = [];
      for (const g of guards) {
        let i = g.index + g[0].length, depth = 1;
        while (i < c.length && depth) {
          if (c[i] === "{") depth++;
          else if (c[i] === "}") depth--;
          i++;
        }
        const body = c.slice(g.index + g[0].length, i - 1);
        // A guard that does not touch timing at all is somebody's unrelated media
        // query and not this rule's business.
        if (!/animation|transition/i.test(body)) continue;
        const terminal = EXITISH.test(body) &&
          /(?:opacity\s*:\s*0|display\s*:\s*none|visibility\s*:\s*hidden)/i.test(body);
        if (!terminal) {
          out.push(finding(83, "css",
            "the sheet has exit animations and its reduced-motion block neutralises timing without giving them a terminal state, so a dismissal can end visible"));
        }
      }
      return out.slice(0, 1);
    },
  },
  {
    id: 76,
    name: "One keyframes name, one animation",
    detect({ css }) {
      // The later definition wins, silently, so the earlier class animates
      // somebody else's motion. Five live cases in one 192 KB bundle, and there
      // is no way to see it by eye at that size.
      const seen = new Map();
      for (const [name] of keyframeBlocks(css)) seen.set(name, (seen.get(name) || 0) + 1);
      return [...seen.entries()].filter(([, n]) => n > 1).slice(0, 3)
        .map(([name, n]) => finding(76, "css",
          `@keyframes ${name} is defined ${n} times; the last one wins and the earlier classes animate it instead of their own`));
    },
  },
  {
    id: 77,
    name: "Easing functions parse",
    detect({ css }) {
      // steps(5 end) without the comma is not a valid <easing-function>. The
      // declaration is dropped and the animation falls back to ease, so the
      // author's stepped motion silently becomes a smooth one. Nothing warns.
      const c = decomment(css);
      const out = [];
      for (const m of c.matchAll(/\bsteps\s*\(([^)]*)\)/gi)) {
        const args = m[1].split(",").map(s => s.trim()).filter(Boolean);
        const ok = args.length >= 1 && args.length <= 2 &&
          /^\d+$/.test(args[0]) &&
          (args.length === 1 || /^(jump-(start|end|none|both)|start|end)$/i.test(args[1]));
        if (!ok) out.push(finding(77, "css", `${m[0].trim()} is not a valid easing function, so the declaration is dropped and the motion falls back to ease`));
      }
      for (const m of c.matchAll(/\bcubic-bezier\s*\(([^)]*)\)/gi)) {
        const a = m[1].split(",").map(s => parseFloat(s));
        const ok = a.length === 4 && a.every(Number.isFinite) &&
          a[0] >= 0 && a[0] <= 1 && a[2] >= 0 && a[2] <= 1;
        if (!ok) out.push(finding(77, "css", `${m[0].trim()} is not a valid cubic-bezier: four numbers, with both x coordinates between 0 and 1`));
      }
      return out.slice(0, 3);
    },
  },
  {
    id: 78,
    name: "No flash above three per second",
    detect({ css }) {
      // WCAG 2.3.1. One shipped class is animation: glitchFlash 0.15s steps(2, end)
      // infinite over a full opacity swing, which is 6.7 flashes per second, well
      // inside the photosensitive-seizure band, and it ships with no guard.
      //
      // What this cannot know is the flashing area, and 2.3.1 has an area
      // threshold. So the finding names the frequency and says the area was not
      // measured, rather than asserting a violation.
      const frames = new Map(keyframeBlocks(css));
      const out = [];
      for (const [sel, body] of leafBlocks(css)) {
        const sh = /animation\s*:\s*([^;}]+)/i.exec(body);
        if (!sh || !/\binfinite\b/i.test(sh[1])) continue;
        const dur = /(-?\d*\.?\d+)(m?s)\b/i.exec(sh[1]);
        if (!dur) continue;
        const seconds = parseFloat(dur[1]) / (dur[2].toLowerCase() === "ms" ? 1000 : 1);
        if (!(seconds > 0)) continue;
        const name = sh[1].trim().split(/\s+/).find(t => frames.has(t));
        if (!name) continue;
        // Opacity values in document order. Adjacent pairs that differ are the
        // flashes; one full 1 -> 0 -> 1 cycle is two of them.
        const vals = [...frames.get(name).matchAll(/opacity\s*:\s*([\d.]+)/gi)].map(m => parseFloat(m[1]));
        if (vals.length < 2) continue;
        let transitions = 0;
        for (let i = 1; i < vals.length; i++) if (Math.abs(vals[i] - vals[i - 1]) > 0.5) transitions++;
        if (!transitions) continue;
        const hz = transitions / seconds;
        if (hz > 3) {
          out.push(finding(78, "css",
            `${sel.trim().slice(0, 32)} runs ${name} at ${hz.toFixed(1)} full-opacity flashes per second (WCAG 2.3.1 allows 3); the flashing area was not measured`));
        }
      }
      return out.slice(0, 3);
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
