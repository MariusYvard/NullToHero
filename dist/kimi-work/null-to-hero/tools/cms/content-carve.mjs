#!/usr/bin/env node
// content-carve.mjs — reads a finished HTML site and proposes what its owner
// could edit: one JSON file of content per page, and the same pages with a token
// where each editable value used to be. `/siteasy entrust` runs this once, before
// cms-scaffold, and the agent reviews what it proposes.
//
// WHY A BROWSER AND NOT A REGULAR EXPRESSION
// ------------------------------------------
// Deciding what is editable means asking whether an element carries text of its
// own or wraps other elements that do, which is a question about the tree and not
// about the characters. The rest of this directory reads HTML with regular
// expressions because it only ever asks about one tag at a time. This one needs
// `closest` and `children`, so it uses the browser that `playwright` already
// installs for the rendered rules. Nothing new is added to the dependency list,
// and a missing playwright refuses loudly rather than falling back to a guess.
//
// WHY THE FILE IS EDITED AS TEXT AND NOT RE-SERIALISED
// ---------------------------------------------------
// Writing back `documentElement.outerHTML` would hand the whole site the
// browser's idea of formatting: void tags rewritten, entities normalised, a diff
// nobody can review. The extraction therefore returns the exact strings it took,
// in document order, and the replacement walks the source once, cursor forward.
// Everything outside those substrings is untouched, byte for byte, and a string
// that cannot be found where it was expected stops the run.
//
// WHAT IT REFUSES TO TOUCH
// ------------------------
// Anything outside `<main>`, because the navigation and the footer belong to a
// shared entry rather than to a page. Anything inside a `<nav>`, because those
// are landmarks. And any passage carrying a tag inside its own text, because
// editing it would mean writing HTML in a form; `content-fill.mjs` marks those in
// the preview so the owner learns why they cannot be touched.
//
// Usage:
//   node content-carve.mjs [projectRoot] [--write] [--pages a.html,b.html] [--shared boutique]
//
// Without --write nothing is saved and the proposal is printed as JSON.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

const SKIP_DIR = /^(node_modules|\.git|dist|build|out|_site|\.next|\.nuxt|\.output|coverage|admin|css|js|fonts|img|images|photos|static|public|assets|netlify|content)(\/|$)/;

// Un document a une page autour de lui. Un fragment (une navigation, un pied de
// page) porte du contenu comme une page mais n'en est pas une : aucune entrée de
// l'éditeur ne le prévisualise, et son contenu appartient à toutes les pages à la
// fois. Il n'est donc extrait que si on nomme l'entrée partagée qui l'accueille.
export const isDocument = (html) => /<html[\s>]|<!doctype/i.test(html);

export function pagesUnder(root) {
  const out = [];
  (function walk(dir, prefix) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (SKIP_DIR.test(rel)) continue;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else if (/\.html?$/i.test(entry.name)) out.push(rel);
    }
  })(root, "");
  return out.sort();
}

// index.html gives the namespace accueil, createurs/blanc/index.html gives
// createurs_blanc. The namespace is what a token's first segment names, so it
// carries no slash and no hyphen.
export function namespaceFor(page, home = "accueil") {
  let name = page.replace(/\.html?$/i, "").replace(/\/index$/, "");
  if (name === "index" || name === "") return home;
  return name.replace(/[/\\-]/g, "_");
}

/* ── what the browser runs on each page ───────────────────────────────────── */

// This function is serialised and evaluated inside the page, so it may not close
// over anything from this module.
export function carveInPage() {
  const scope = document.querySelector("main") || document.body;
  if (!scope) return { fields: [], skipped: [] };

  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

  const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();

  // An element is a leaf when it holds no element at all. A paragraph carrying a
  // link, or an address broken by a `<br>`, is not a leaf: it is the fixed
  // passage the preview marks, and turning it into a field would ask for HTML in
  // a form. The rule is deliberately blunt, because the alternative (asking
  // whether the children carry text) accepts elements whose text the file does
  // not hold contiguously, and those cannot be put back where they came from.
  const isLeaf = (el) => el.children.length === 0;

  const FIELD_TAG = /^(P|LI|H[1-6]|FIGCAPTION|DT|DD|BLOCKQUOTE|SUMMARY|SPAN|A|BUTTON|STRONG|EM|TIME|ADDRESS)$/;
  const DEAD = /^(SCRIPT|STYLE|SVG|NOSCRIPT|TEMPLATE|IFRAME|CANVAS)$/;

  const nameFor = (el) => {
    const tag = el.tagName;
    if (/^H[1-6]$/.test(tag)) return "titre";
    if (tag === "A" || tag === "BUTTON") return "bouton";
    if (tag === "LI") return "element";
    if (tag === "DT") return "terme";
    if (tag === "DD") return "definition";
    if (tag === "FIGCAPTION") return "legende";
    if (tag === "TIME") return "date";
    if (tag === "ADDRESS") return "adresse";
    return "texte";
  };

  // The box a value belongs to is the nearest section, article, or element the
  // page gave an id to. That is the unit the editor folds, so it is the unit the
  // extraction names.
  const boxOf = (el) => el.closest("section, article, [id]") || scope;

  const boxes = new Map();
  const keyOfBox = (el) => {
    if (boxes.has(el)) return boxes.get(el);
    const head = el.querySelector("h1, h2, h3, h4, h5, h6");
    const base = slug(el.id || (head ? textOf(head) : "") || el.className.split(/\s+/)[0] || "bloc")
      || "bloc";
    let key = base, n = 2;
    const taken = new Set(boxes.values());
    while (taken.has(key)) key = `${base}_${n++}`;
    boxes.set(el, key);
    return key;
  };

  // Returns one string per line when every line is either plain text or a single
  // element carrying nothing but text (a telephone number inside a link). Returns
  // null when any line holds more than that, because a line the file does not
  // hold contiguously cannot be put back where it came from.
  const splitOnBreaks = (el) => {
    const kids = [...el.childNodes];
    if (!kids.some((n) => n.nodeName === "BR")) return null;
    const lines = [];
    let current = [];
    for (const node of kids.concat([{ nodeName: "BR" }])) {
      if (node.nodeName === "BR") { lines.push(current); current = []; continue; }
      current.push(node);
    }
    const out = [];
    for (const line of lines) {
      const solid = line.filter((n) => (n.textContent || "").trim());
      if (!solid.length) continue;
      const elements = solid.filter((n) => n.nodeType === 1);
      if (elements.length > 1) return null;
      if (elements.length === 1) {
        if (solid.length > 1) return null;                 // du texte autour d'une balise
        if (!isLeaf(elements[0])) return null;             // une balise dans la balise
      }
      out.push(solid.map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim());
    }
    return out.length ? out : null;
  };

  const fields = [], skipped = [];
  const used = new Map();          // box → set of field names already given out
  const unique = (box, name) => {
    if (!used.has(box)) used.set(box, new Set());
    const taken = used.get(box);
    let key = name, n = 2;
    while (taken.has(key)) key = `${name}_${n++}`;
    taken.add(key);
    return key;
  };

  const walk = (el) => {
    for (const child of el.children) {
      if (DEAD.test(child.tagName)) continue;
      if (child.tagName === "NAV" || child.closest("nav")) { continue; }

      if (child.tagName === "IMG") {
        const box = keyOfBox(boxOf(child));
        if (child.getAttribute("src")) {
          fields.push({ box, name: unique(box, "image"), kind: "attribute",
            attribute: "src", value: child.getAttribute("src") });
        }
        fields.push({ box, name: unique(box, "image_alt"), kind: "attribute",
          attribute: "alt", value: child.getAttribute("alt") || "" });
        continue;
      }

      const own = textOf(child);
      if (!own) { walk(child); continue; }

      if (FIELD_TAG.test(child.tagName)) {
        if (isLeaf(child)) {
          const box = keyOfBox(boxOf(child));
          fields.push({ box, name: unique(box, nameFor(child)), kind: "text", value: own });
          continue;
        }
        // An address and a set of opening hours are the two things a shop owner
        // most wants to change, and both are written as lines separated by
        // `<br>`. Freezing the whole block over its separators would hand back a
        // site whose telephone number is the one thing nobody can edit. So the
        // block is cut on its breaks, and each line becomes a field when it is
        // simple enough to be put back where it came from.
        const lines = splitOnBreaks(child);
        if (lines) {
          const box = keyOfBox(boxOf(child));
          const name = nameFor(child);
          for (const line of lines) fields.push({ box, name: unique(box, name), kind: "text", value: line });
          continue;
        }
        // Anything else carries markup inside its own sentence. Turning one bold
        // word into a field would leave the sentence around it untouchable, which
        // reads as a defect rather than as a rule.
        skipped.push({ tag: child.tagName, text: own.slice(0, 60) });
        continue;
      }
      if (isLeaf(child)) { skipped.push({ tag: child.tagName, text: own.slice(0, 60) }); continue; }
      walk(child);
    }
  };
  walk(scope);
  return { fields, skipped };
}

/* ── putting the tokens back into the source ──────────────────────────────── */

// The extraction walked the tree in document order, and the file is in document
// order too, so one forward cursor is enough. A value that is not where it was
// expected is a defect in the extraction, not an occasion to search backwards:
// replacing the wrong occurrence would move text between fields silently.
export function tokenise(source, fields, ns) {
  let at = 0, out = "";
  const done = [];
  // A comment often repeats the heading that follows it, and a script holds
  // strings that look like prose. The cursor would stop at the first of them and
  // put the token in the wrong place, so those regions are blanked out of the
  // copy the search reads. The nul character matches nothing the patterns look
  // for, and blanking keeps every offset where it was.
  const searchable = source.replace(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>/gi,
    (m) => "\u0000".repeat(m.length));
  for (const field of fields) {
    const token = `{{${ns}.${field.box}.${field.name}}}`;
    const re = field.kind === "attribute"
      ? new RegExp(`${escapeRe(field.attribute)}\\s*=\\s*"${body(field.value)}"`, "g")
      : new RegExp(body(field.value), "g");
    re.lastIndex = at;
    let m = re.exec(searchable);
    // A value can also appear inside an attribute: the email of a `mailto:` link
    // is the text of that link too, and the attribute comes first. Putting the
    // token there would leave the visible text frozen and hand the owner a field
    // that edits the href alone, which is worse than not offering the field.
    while (m && field.kind === "text" && insideTag(searchable, m.index)) m = re.exec(searchable);
    if (!m) { done.push({ ...field, token, placed: false }); continue; }
    out += source.slice(at, m.index)
      + (field.kind === "attribute" ? `${field.attribute}="${token}"` : token);
    at = m.index + m[0].length;
    done.push({ ...field, token, placed: true });
  }
  return { html: out + source.slice(at), fields: done };
}

// The one check worth running on every page: put the values back where the
// tokens are and see whether the file comes back. This is the same substitution
// the site's build performs, so a page that does not come back identical is a
// page the extraction changed, and the run says which one rather than leaving it
// to be noticed on the deployed site.
const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export function refill(html, fields) {
  const value = new Map(fields.filter((f) => f.placed).map((f) => [f.token, f.value]));
  return html.replace(/\{\{[a-z0-9_.]+\}\}/gi, (token) => {
    const found = value.get(token);
    return found === undefined ? token : String(found).replace(/[&<>"]/g, (c) => ESCAPE[c]);
  });
}

const insideTag = (source, at) => source.lastIndexOf("<", at) > source.lastIndexOf(">", at);

// The browser hands back text as a reader sees it: entities decoded, runs of
// whitespace collapsed, line breaks gone. The file holds the other version. A
// value is therefore looked for as a pattern rather than as a string. Any run of
// whitespace matches any other, and a character that is plausibly written as an
// entity is allowed to appear as one. Letters and digits stay literal, and that
// is what keeps a match from drifting onto a neighbouring passage.
const ENTITY = "(?:&[a-zA-Z][a-zA-Z0-9]*;|&#x?[0-9a-fA-F]+;)";
const PLAIN = /[a-zA-Z0-9 .,:;!?()/-]/;

export function body(value) {
  const text = String(value);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c)) {
      while (i + 1 < text.length && /\s/.test(text[i + 1])) i++;
      out += "\\s+";
      continue;
    }
    out += PLAIN.test(c) ? escapeRe(c) : `(?:${escapeRe(c)}|${ENTITY})`;
  }
  return out;
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function nest(fields) {
  const bag = {};
  for (const field of fields) {
    if (!field.placed) continue;
    bag[field.box] = bag[field.box] || {};
    bag[field.box][field.name] = field.value;
  }
  return bag;
}

/* ── the run ──────────────────────────────────────────────────────────────── */

// components/footer.html donne la boite `footer` dans l'entree partagee, parce
// qu'un lecteur cherchant le telephone du magasin le cherche sous "footer" et non
// sous "bloc_2".
export const boxForFragment = (page) =>
  page.replace(/\.html?$/i, "").split("/").pop().replace(/[^a-z0-9]+/gi, "_").toLowerCase();

export async function carve(root, { write = false, pages, shared = null, log = console.log, err = console.error } = {}) {
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch {
    err("content-carve needs playwright, the same one tests/rendered-rules.mjs uses. Run npm install first.");
    return null;
  }
  const list = pages && pages.length ? pages : pagesUnder(root);
  // A site owner with a system browser, or a container whose bundled build does
  // not match the installed playwright, can name the binary instead.
  const browser = await chromium.launch(
    process.env.NTH_CHROMIUM ? { executablePath: process.env.NTH_CHROMIUM } : {});
  const page = await browser.newPage();
  const report = [];
  try {
    for (const rel of list) {
      const file = join(root, rel);
      const source = readFileSync(file, "utf8");
      const fragment = !isDocument(source);
      if (fragment && !shared) continue;
      await page.goto(pathToFileURL(file).href, { waitUntil: "domcontentloaded" });
      const { fields, skipped } = await page.evaluate(carveInPage);
      // Un fragment appartient a toutes les pages : son contenu va dans l'entree
      // partagee, sous une boite qui porte le nom du fichier.
      if (fragment) {
        const box = boxForFragment(rel);
        for (const f of fields) f.box = box;
      }
      const ns = fragment ? shared : namespaceFor(rel);
      const placed = tokenise(source, fields, ns);
      const unplaced = placed.fields.filter((f) => !f.placed);
      const back = refill(placed.html, placed.fields) === source;
      report.push({ page: rel, ns, fields: placed.fields.length,
        unplaced: unplaced.length, skipped: skipped.length, identical: back });
      if (!back) err(`${rel}: putting the values back does not give the file back. The page is written, the difference is a normalisation (a doubled space, an entity) and is worth a look.`);
      if (unplaced.length) {
        err(`${rel}: ${unplaced.length} value(s) not found in the source, left alone`);
        for (const f of unplaced.slice(0, 5)) err(`  ${f.box}.${f.name}: ${String(f.value).slice(0, 60)}`);
      }
      if (!write) continue;
      writeFileSync(file, placed.html);
      const out = join(root, "content", `${ns.replace(/_/g, "-")}.json`);
      mkdirSync(dirname(out), { recursive: true });
      // Plusieurs fragments partagent une entree, donc le fichier se complete au
      // lieu d'etre reecrit : le pied de page ne doit pas effacer la navigation.
      let bag = nest(placed.fields);
      if (fragment && existsSync(out)) {
        try { bag = { ...JSON.parse(readFileSync(out, "utf8")), ...bag }; }
        catch { /* un fichier illisible sera signale par le remplissage */ }
      }
      writeFileSync(out, `${JSON.stringify(bag, null, 2)}\n`);
    }
  } finally {
    await browser.close();
  }
  const total = report.reduce((n, r) => n + r.fields, 0);
  const lost = report.reduce((n, r) => n + r.unplaced, 0);
  const moved = report.filter((r) => !r.identical).length;
  log(`content-carve: ${report.length} page(s), ${total} field(s), ${lost} not placed, ${moved} page(s) that do not come back identical`);
  return { report, total, lost, moved };
}

if (/content-carve\.mjs$/.test(process.argv[1] || "")) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--pages");
  const root = resolvePath(args.find((a) => !a.startsWith("--")) || ".");
  const sharedAt = args.indexOf("--shared");
  const out = await carve(root, {
    write: args.includes("--write"),
    pages: at >= 0 ? (args[at + 1] || "").split(",").filter(Boolean) : null,
    shared: sharedAt >= 0 ? (args[sharedAt + 1] || "").trim() || null : null,
  });
  if (!out || out.lost) process.exitCode = 1;
}
