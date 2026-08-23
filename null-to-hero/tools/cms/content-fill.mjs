#!/usr/bin/env node
// content-fill.mjs — resolves a site's content tokens and writes the copies the
// editor previews. `/siteasy entrust` copies this file to the client project as
// `nth-content.mjs`, where the project's own build calls it once its pages are
// otherwise final.
//
// WHY THE EDITOR NEEDS A SECOND COPY OF EACH PAGE
// -----------------------------------------------
// The preview shows the page, not the list of its fields, so it needs a copy of
// the page where the tokens of the entry being edited are still there. The
// browser fills those from the form on every keystroke. Tokens belonging to
// another entry are resolved here instead: they cannot be edited from the page
// in hand and would otherwise sit in the preview as raw braces.
//
// WHICH ENTRY A PAGE BELONGS TO
// -----------------------------
// The tokens inside `<main>` decide. The navigation and the footer name a
// different entry (the shop's telephone number, the opening hours) and appear on
// every page; counting them would attribute half a site to the footer. A page
// with no `<main>` is counted whole, which is the same answer on a page that has
// only one entry's tokens and a guess on a page that has several.
//
// WHAT IS MARKED AS FIXED, AND WHY IT IS NOT A DEFECT
// ---------------------------------------------------
// A passage carrying a tag inside its text (a telephone link, a `<strong>`) was
// not turned into a field: editing it would mean writing HTML in a form. It is
// marked here so that the person looking for it learns why it cannot be touched,
// rather than reading it as an oversight. The editor supplies the wording, in the
// language the site declared.
//
// Usage:
//   node content-fill.mjs [projectRoot] [--check]
//
// Exit 1 when a token has no value, when two content files collide on one
// namespace, or when a content file is unreadable. --check writes nothing.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";

// A token path has two segments or more: `{{boutique.telephone}}` for a plain
// value, `{{accueil.atelier.titre}}` for a field inside a collapsible section.
// The first segment names the file, the rest walk into it.
export const TOKEN = /\{\{\s*([a-z0-9_]+(?:\.[a-z0-9_]+)+)\s*\}\}/gi;

const SKIP = /^(node_modules|\.git|dist|build|out|_site|\.next|\.nuxt|\.output|\.svelte-kit|\.astro|coverage|admin|css|js|fonts|img|images|photos|static|public|assets|netlify)(\/|$)/;

// content/a-propos.json gives the namespace a_propos, content/createurs/blanc.json
// gives createurs_blanc. The file keeps the page's name and its hyphens; the
// namespace uses underscores so it fits in {{ns.field}}.
export const namespaceOf = (rel) => rel.replace(/\.json$/, "").replace(/[/\\-]/g, "_");

export function loadContent(root) {
  const dir = join(root, "content");
  const bag = {}, origin = {}, errors = [];
  if (!existsSync(dir)) return { bag, errors };
  (function walk(at, prefix) {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { walk(join(at, entry.name), rel); continue; }
      if (!entry.name.endsWith(".json")) continue;
      const key = namespaceOf(rel);
      if (origin[key]) {
        errors.push(`content/${rel} and content/${origin[key]} both give the namespace ${key}`);
        continue;
      }
      origin[key] = rel;
      try { bag[key] = JSON.parse(readFileSync(join(at, entry.name), "utf8")); }
      catch (e) { errors.push(`content/${rel} is unreadable: ${e.message}`); }
    }
  })(dir, "");
  return { bag, errors };
}

// A value the client typed arrives as they typed it, and lands as readily inside
// a double-quoted attribute as in running text. An ampersand in a brand name
// would break an entity and a quotation mark in alt text would close the tag.
const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (c) => ESCAPE[c]);

export function valueAt(bag, path) {
  let node = bag;
  for (const segment of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = node[segment];
  }
  // An object substituted into HTML would print [object Object] and say nothing.
  return typeof node === "string" || typeof node === "number" ? node : undefined;
}

export function fillTokens(bag, html, where, missing) {
  return html.replace(TOKEN, (whole, path) => {
    const value = valueAt(bag, path);
    if (value === undefined) { if (missing) missing.add(`${path} (${where})`); return whole; }
    return escapeHtml(value);
  });
}

const mainOf = (html) => {
  const open = html.search(/<main\b/i), close = html.search(/<\/main>/i);
  return open < 0 || close < 0 ? html : html.slice(open, close);
};

export function pageNamespace(html) {
  const count = new Map();
  for (const m of mainOf(html).matchAll(TOKEN)) {
    const ns = m[1].split(".")[0];
    count.set(ns, (count.get(ns) || 0) + 1);
  }
  const ranked = [...count.entries()].sort((a, b) => b[1] - a[1]);
  return ranked.length ? ranked[0][0] : null;
}

const FIXED = /<(p|li|h[1-6]|figcaption|dt|dd|blockquote|summary)\b([^<>]*)>([\s\S]*?)<\/\1>/gi;

// Only what is inside `<main>` is marked. The navigation and the footer come from
// shared components and are edited through their own entry; marking them would
// report the same handful of passages on every page of the site.
export function markFixed(html) {
  const open = html.search(/<main\b/i), close = html.search(/<\/main>/i);
  if (open < 0 || close < 0) return { html, count: 0 };
  const marked = markBlocks(html.slice(open, close));
  return { html: html.slice(0, open) + marked.html + html.slice(close), count: marked.count };
}

// A `<nav>` inside `<main>` is a set of landmarks, not content. The extraction
// skipped it and so does the marking; splitting on it keeps its text intact
// because a capturing split returns the parts in alternation.
function markBlocks(html) {
  let count = 0;
  const out = html.split(/(<nav\b[\s\S]*?<\/nav>)/gi).map((part, i) => {
    if (i % 2) return part;
    const one = markOne(part);
    count += one.count;
    return one.html;
  }).join("");
  return { html: out, count };
}

function markOne(html) {
  let count = 0;
  const out = html.replace(FIXED, (whole, tag, attrs, inner) => {
    if (inner.includes("{{")) return whole;                    // already editable
    if (!/<[a-z]/i.test(inner)) return whole;                  // no tag inside
    if (!inner.replace(/<[^>]*>/g, "").trim()) return whole;   // no text to edit
    count++;
    return `<${tag}${attrs} data-nth-fixed>${inner}</${tag}>`;
  });
  return { html: out, count };
}

export function previewOf(bag, html, ns) {
  return markFixed(html.replace(TOKEN, (whole, path) => {
    if (path.split(".")[0] === ns) return whole;
    const value = valueAt(bag, path);
    return value === undefined ? whole : escapeHtml(value);
  }));
}

// A shared fragment (a navigation, a footer) holds tokens like any page but is
// not one: it has no document around it, and the editor has no entry to preview
// it with. Its tokens are still resolved, because a page that pulls the fragment
// in at runtime would otherwise show the braces to a visitor.
export const isDocument = (html) => /<html[\s>]|<!doctype/i.test(html);

export function pagesUnder(root) {
  const out = [];
  (function walk(dir, prefix) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (SKIP.test(rel)) continue;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else if (/\.html?$/i.test(entry.name)) out.push(rel);
    }
  })(root, "");
  return out.sort();
}

export function run(root, { check = false, log = console.log, err = console.error } = {}) {
  const { bag, errors } = loadContent(root);
  const missing = new Set();
  const previews = [];
  let fixed = 0, filled = 0;
  const dir = join(root, "admin", "preview");
  if (!check) mkdirSync(dir, { recursive: true });

  for (const page of pagesUnder(root)) {
    const file = join(root, page);
    const html = readFileSync(file, "utf8");
    const ns = isDocument(html) ? pageNamespace(html) : null;
    if (ns) {
      const kept = previewOf(bag, html, ns);
      fixed += kept.count;
      previews.push(ns);
      if (!check) writeFileSync(join(dir, `${ns}.html`), kept.html);
    }
    const withContent = fillTokens(bag, html, page, missing);
    if (withContent !== html) { filled++; if (!check) writeFileSync(file, withContent); }
  }
  if (previews.length && !check) {
    writeFileSync(join(dir, "index.json"), `${JSON.stringify(previews.sort(), null, 0)}\n`);
  }

  for (const problem of errors) err(problem);
  if (missing.size) {
    err(`${missing.size} token(s) with no value in content/:`);
    for (const token of missing) err(`  ${token}`);
  }
  log(`content-fill: ${filled} page(s) filled, ${previews.length} preview(s) written, ${fixed} passage(s) marked as fixed`);
  return { previews: previews.sort(), filled, fixed, missing: [...missing], errors };
}

// The file is copied to the client project under another name, so both are
// recognised as the entry point.
if (/(?:content-fill|nth-content)\.mjs$/.test(process.argv[1] || "")) {
  const args = process.argv.slice(2);
  const root = resolvePath(args.find((a) => !a.startsWith("--")) || ".");
  const out = run(root, { check: args.includes("--check") });
  if (out.missing.length || out.errors.length) process.exitCode = 1;
}
