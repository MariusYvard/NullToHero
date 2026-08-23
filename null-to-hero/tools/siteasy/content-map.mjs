#!/usr/bin/env node
// content-map.mjs — reads a site and answers one question: what could its owner
// safely be given the keys to. `/siteasy entrust` runs this first, and its output
// is the draft of CONTENT.md.
//
// WHAT IT REFUSES, AND WHY THAT IS THE POINT
// ------------------------------------------
// Handing an owner a file the next build overwrites is a silent data loss: they
// edit, they publish, the build regenerates the file, their words are gone and
// nothing failed. So a generated file is never offered as editable, whatever it
// contains. The three signals are the ones live-wrap.mjs already trusts (a
// GENERATED or DO NOT EDIT marker near the top, and a file git does not track),
// plus the build directories every generator writes into.
//
// It does not guess at what it cannot read. Front matter here is scanned, not
// parsed: flat keys, simple lists, and the three fence styles. Anything else is
// reported as unread rather than turned into a field, because a widget invented
// from a misread value is a form that silently drops data on save.
//
// Usage:
//   node content-map.mjs [projectRoot] [--json] [--min-run 40]

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, extname, basename, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const TEXT = new Set([".md", ".markdown", ".mdx", ".json", ".yml", ".yaml", ".toml"]);
const IMAGE = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
const PAGE = /\.(html?|vue|svelte|astro|[jt]sx)$/i;

// Where generators write. A file here is output, never source, whatever it holds.
const BUILD_DIRS = /^(dist|build|out|_site|\.next|\.nuxt|\.output|\.svelte-kit|\.astro|coverage|node_modules|\.git|vendor)(\/|$)/;
const GENERATED_MARKERS = [/GENERATED/i, /DO NOT EDIT/i, /@generated/];

// A folder an editor uploads into, as opposed to a folder a designer curates.
// The distinction is not decidable from a name alone, so it is decided from the
// shape below: an upload area is flat.
const MEDIA_CANDIDATES = [
  "static/uploads", "public/uploads", "static/media", "public/media",
  "static/images", "public/images", "static/img", "public/img",
  "assets/images", "src/assets/images", "uploads", "media", "images", "img",
];
const UPLOAD_NAMES = /(^|\/)(uploads?|media|user-content)$/;

/* ── the tree ─────────────────────────────────────────────────────────────── */

export function listFiles(root) {
  const out = [];
  (function walk(dir) {
    let names;
    try { names = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of names) {
      const full = join(dir, entry.name);
      const rel = relative(root, full).split("\\").join("/");
      if (BUILD_DIRS.test(rel)) continue;
      // These read the entry itself, not its target, so a symlink is neither a
      // file nor a directory here and the walk never leaves the project.
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(rel);
    }
  })(root);
  return out.sort();
}

export function tracked(root) {
  try {
    // stderr is swallowed: outside a checkout git says so on its own, and that
    // notice in the middle of a report reads like a failure when it is not one.
    const out = execFileSync("git", ["ls-files"], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(out.split("\n").map(s => s.trim()).filter(Boolean));
  } catch { return null; }   // not a git checkout: git cannot rule anything out
}

export function looksGenerated(content) {
  return GENERATED_MARKERS.some(re => re.test(String(content).slice(0, 400)));
}

/* ── front matter, scanned rather than parsed ─────────────────────────────── */

const FENCES = [
  { open: "---", close: "---", kind: "yaml" },
  { open: "+++", close: "+++", kind: "toml" },
  { open: "{", close: "}", kind: "json" },
];

export function frontMatter(text) {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/);
  const first = (lines[0] || "").trim();
  const fence = FENCES.find(f => first === f.open);
  if (!fence) return { fields: {}, unread: [], body: text, kind: null };
  if (fence.kind === "json") {
    const end = lines.indexOf("}");
    if (end < 0) return { fields: {}, unread: ["unterminated JSON front matter"], body: "", kind: "json" };
    try {
      return {
        kind: "json",
        fields: JSON.parse(lines.slice(0, end + 1).join("\n")),
        unread: [],
        body: lines.slice(end + 1).join("\n"),
      };
    } catch (e) {
      return { fields: {}, unread: ["unreadable JSON front matter"], body: "", kind: "json" };
    }
  }
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === fence.close);
  if (end < 0) return { fields: {}, unread: ["unterminated front matter"], body: "", kind: fence.kind };

  const fields = {}, unread = [];
  let list = null;
  for (let i = 1; i < end; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const item = /^-\s+(.*)$/.exec(line);
    if (item && list) { fields[list].push(scalar(item[1], fence.kind)); continue; }
    const pair = fence.kind === "toml"
      ? /^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(line)
      : /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line);
    if (!pair) { unread.push(`line ${i + 1}: ${line.slice(0, 60)}`); list = null; continue; }
    // An indented key belongs to a nested structure this scanner does not read.
    if (/^\s/.test(raw) && !item) { unread.push(`line ${i + 1}: nested under ${list || "a key"}`); continue; }
    if (pair[2] === "") { list = pair[1]; fields[list] = []; continue; }
    fields[pair[1]] = scalar(pair[2], fence.kind);
    list = null;
  }
  return { fields, unread, body: lines.slice(end + 1).join("\n"), kind: fence.kind };
}

function scalar(raw, kind) {
  let value = raw.trim().replace(/\s+#.*$/, "");
  const inline = /^\[(.*)\]$/.exec(value);
  if (inline) {
    return inline[1].trim() ? inline[1].split(",").map(s => scalar(s, kind)) : [];
  }
  if (/^(["']).*\1$/.test(value)) return value.slice(1, -1);
  if (value === "true" || value === "false") return value === "true";
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/* ── widgets ──────────────────────────────────────────────────────────────── */

const DATE = /^\d{4}-\d{2}-\d{2}([ T]|$)/;

export function widgetFor(name, values, mediaFolder) {
  const present = values.filter(v => v !== undefined && v !== null);
  if (!present.length) return "string";
  if (present.every(v => typeof v === "boolean")) return "boolean";
  if (present.every(v => typeof v === "number")) return "number";
  if (present.every(v => Array.isArray(v))) return "list";
  if (present.every(v => typeof v === "string" && DATE.test(v))) return "datetime";
  if (present.every(v => typeof v === "string" && isImage(v, mediaFolder))) return "image";
  if (present.some(v => typeof v === "string" && v.length > 120)) return "text";
  return "string";
}

const isImage = (value, mediaFolder) => {
  if (!IMAGE.has(extname(value).toLowerCase())) return false;
  if (!mediaFolder) return true;
  const bare = value.replace(/^\//, "");
  return bare.startsWith(mediaFolder) || mediaFolder.endsWith(dirname(bare));
};

/* ── prose that lives in a template ───────────────────────────────────────── */

// Not a parser and not pretending to be one. Script and style blocks go, tags go,
// what is left is what a visitor reads; a run long enough to be a sentence is
// reported with the line it starts on. The point is to tell an agency which words
// no collection will ever reach, not to rewrite the template.
export function proseRuns(text, minRun = 40) {
  const lines = String(text).split(/\r?\n/);
  const blanked = String(text)
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, m => m.replace(/[^\n]/g, " "))
    .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, " "))
    .replace(/<[^>]*>/g, m => m.replace(/[^\n]/g, " "));
  const runs = [];
  let offset = 0;
  blanked.split(/\r?\n/).forEach((line, i) => {
    const words = line.trim();
    if (words.length >= minRun && /[a-zA-Z]{3}/.test(words)) {
      runs.push({ line: i + 1, text: words.replace(/\s+/g, " ").slice(0, 120) });
    }
    offset += lines[i] ? lines[i].length : 0;
  });
  return runs;
}

/* ── the map ──────────────────────────────────────────────────────────────── */

export function contentMap(root, options = {}) {
  const minRun = options.minRun || 40;
  const files = listFiles(root);
  const git = options.tracked === undefined ? tracked(root) : options.tracked;
  const refused = [], readable = [];

  for (const path of files) {
    if (git && !git.has(path)) { refused.push({ path, why: "git does not track this file" }); continue; }
    const ext = extname(path).toLowerCase();
    if (!TEXT.has(ext) && !PAGE.test(path) && !IMAGE.has(ext)) continue;
    if (IMAGE.has(ext)) { readable.push({ path, ext, image: true }); continue; }
    let text;
    try { text = readFileSync(join(root, path), "utf8"); } catch { continue; }
    if (looksGenerated(text)) { refused.push({ path, why: "the file says it is generated" }); continue; }
    readable.push({ path, ext, text });
  }

  const media = findMedia(readable);
  const groups = new Map();
  for (const file of readable) {
    if (file.image || !TEXT.has(file.ext)) continue;
    const folder = dirname(file.path);
    if (folder === "." || media.folder === folder) continue;
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder).push(file);
  }

  const collections = [], singles = [], unread = [];
  for (const [folder, group] of [...groups.entries()].sort()) {
    const parsed = group.map(f => ({ file: f, fm: frontMatter(f.text) }));
    for (const p of parsed) {
      for (const line of p.fm.unread) unread.push({ path: p.file.path, detail: line });
    }
    const withFields = parsed.filter(p => Object.keys(p.fm.fields).length);
    if (!withFields.length) continue;
    const entry = {
      name: folder.split("/").filter(Boolean).pop(),
      folder,
      extension: mostCommon(group.map(f => f.ext)),
      files: group.length,
      fields: fieldsOf(withFields, media.folder),
      // The richest entry, because the sample is there for a human to open and a
      // half-filled draft says the least about what the collection holds.
      sample: withFields.reduce((best, p) =>
        Object.keys(p.fm.fields).length > Object.keys(best.fm.fields).length ? p : best).file.path,
    };
    (group.length === 1 ? singles : collections).push(entry);
  }

  const hardcoded = [];
  for (const file of readable) {
    if (!PAGE.test(file.path)) continue;
    for (const run of proseRuns(file.text, minRun)) {
      hardcoded.push({ file: file.path, line: run.line, text: run.text });
    }
  }

  return {
    root,
    collections,
    singles,
    media,
    hardcoded,
    unread,
    refused,
    allowList: allowListFor(collections, singles, media),
    verdict: verdictFor(collections, singles, hardcoded),
  };
}

function fieldsOf(parsed, mediaFolder) {
  const names = [];
  for (const p of parsed) for (const key of Object.keys(p.fm.fields)) if (!names.includes(key)) names.push(key);
  const fields = names.map(name => ({
    name,
    widget: widgetFor(name, parsed.map(p => p.fm.fields[name]), mediaFolder),
    required: parsed.every(p => p.fm.fields[name] !== undefined),
  }));
  if (parsed.some(p => p.fm.body.trim())) {
    fields.push({ name: "body", widget: "markdown", required: false });
  }
  return fields;
}

// WHY A CURATED ASSET FOLDER IS REFUSED
// -------------------------------------
// On a real site the biggest image folder is usually the one a designer filled:
// product photographs, brand logos, hero banners, sorted into sub-folders.
// Offering it as the upload area hands the owner write access to every one of
// them, which is the opposite of an allow-list. An upload area is flat, because
// an editor picking a file from a form has no way to make a sub-folder. So a
// candidate whose images mostly live deeper is reported, not proposed.
function findMedia(readable) {
  const images = readable.filter(f => f.image);
  if (!images.length) {
    return { folder: null, publicFolder: null, count: 0, deep: 0,
             note: "no images anywhere; create an upload folder before offering uploads" };
  }
  const flat = new Map(), below = new Map();
  for (const file of images) {
    const folder = dirname(file.path);
    flat.set(folder, (flat.get(folder) || 0) + 1);
    for (const root of MEDIA_CANDIDATES) {
      if (folder === root || folder.startsWith(`${root}/`)) below.set(root, (below.get(root) || 0) + 1);
    }
  }
  const candidate = MEDIA_CANDIDATES.find(c => below.has(c));
  if (!candidate) {
    const biggest = [...flat.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return { folder: null, publicFolder: null, count: 0, deep: images.length,
             note: `images live under ${biggest}/ but no folder is named for uploads; create one` };
  }
  const direct = flat.get(candidate) || 0;
  const deep = below.get(candidate);
  if (!UPLOAD_NAMES.test(candidate) && direct * 2 < deep) {
    return { folder: null, publicFolder: null, count: direct, deep,
             note: `${candidate}/ holds ${deep} images but only ${direct} at its top level, so it reads as a curated asset folder rather than an upload area; create a separate one`,
    };
  }
  const stripped = candidate.replace(/^(static|public)\//, "");
  return {
    folder: candidate,
    publicFolder: stripped === candidate ? `/${candidate}` : `/${stripped}`,
    count: direct,
    deep,
    note: null,
  };
}

function allowListFor(collections, singles, media) {
  const out = [];
  const folders = [...new Set([...collections, ...singles].map(c => c.folder))].sort();
  for (const folder of folders) {
    const parent = folders.find(f => f !== folder && folder.startsWith(`${f}/`));
    if (parent) continue;   // a prefix already covers it
    out.push({ prefix: `${folder}/`, extensions: [".md", ".markdown", ".json", ".yml", ".yaml"], roles: [] });
  }
  if (media.folder) {
    out.push({ prefix: `${media.folder}/`, extensions: [...IMAGE].filter(e => e !== ".svg"), roles: [] });
  }
  return out;
}

// An honest refusal beats a fabricated collection: a single page written by hand
// has nothing a collection can describe, and saying so is the answer.
function verdictFor(collections, singles, hardcoded) {
  if (collections.length || singles.length) return "ready";
  if (hardcoded.length) return "extract-first";
  return "nothing-editable";
}

const mostCommon = values => {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
};

/* ── CLI ──────────────────────────────────────────────────────────────────── */

// `file://${process.argv[1]}` never matches on Windows: argv carries
// `C:\tools\x.mjs` and import.meta.url carries `file:///C:/tools/x.mjs`, so the
// CLI silently does nothing and exits 0. pathToFileURL is what spells the
// difference, and it costs one import.
const isCli = () => import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli()) {
  const args = process.argv.slice(2);
  const flag = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const root = resolve(args.find(a => !a.startsWith("--")) || process.cwd());
  const map = contentMap(root, { minRun: Number(flag("--min-run")) || 40 });

  if (args.includes("--json")) {
    console.log(JSON.stringify(map, null, 2));
    process.exit(0);
  }

  const say = (...a) => console.log(...a);
  say(`\n${basename(root)}: ${map.verdict}\n`);
  for (const c of map.collections) {
    say(`  collection ${c.name}  ${c.folder}/*${c.extension}  (${c.files} entries)`);
    for (const f of c.fields) say(`      ${f.required ? "*" : " "} ${f.name} — ${f.widget}`);
    say(`      from ${c.sample}`);
  }
  for (const s of map.singles) {
    say(`  single file ${s.name}  ${s.sample}`);
    for (const f of s.fields) say(`      ${f.required ? "*" : " "} ${f.name} — ${f.widget}`);
  }
  say(map.media.folder
    ? `\n  media  ${map.media.folder}  (${map.media.count} files, served at ${map.media.publicFolder})`
    : `\n  media  ${map.media.note}`);

  if (map.hardcoded.length) {
    say(`\n  ${map.hardcoded.length} passage(s) live in a template and no collection can reach them:`);
    for (const h of map.hardcoded.slice(0, 20)) say(`      ${h.file}:${h.line}  ${h.text}`);
    if (map.hardcoded.length > 20) say(`      … and ${map.hardcoded.length - 20} more`);
  }
  if (map.unread.length) {
    say(`\n  ${map.unread.length} front-matter line(s) this scanner did not read; check them by hand:`);
    for (const u of map.unread.slice(0, 10)) say(`      ${u.path}  ${u.detail}`);
  }
  if (map.refused.length) {
    say(`\n  ${map.refused.length} file(s) refused as not editable:`);
    for (const r of map.refused.slice(0, 10)) say(`      ${r.path} — ${r.why}`);
    if (map.refused.length > 10) say(`      … and ${map.refused.length - 10} more`);
  }
  say(`\n  allow-list for CONTENT.md:`);
  for (const rule of map.allowList) say(`      ${rule.prefix}  ${rule.extensions.join(" ")}`);
  say("");
}
