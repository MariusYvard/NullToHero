#!/usr/bin/env node
// cms-lint.mjs — the checks Decap does not run.
//
// WHY THIS FILE EXISTS
// --------------------
// Decap validates config.yml against a permissive AJV schema
// (decap-cms-core/src/constants/configSchema.js). It catches shapes: a missing
// `label`, a duplicate collection name, a field list that is empty. It cannot
// catch anything that depends on the repository or on the server, because it has
// neither in front of it. So a config that passes validation can still name a
// folder that does not exist, point at a path the bridge will refuse on every
// save, or publish images at a URL that 404s. Each of those looks fine until a
// client tries to work, and then fails as a toast rather than as an error.
//
// The checks are declared in tools/data/cms-checks.csv with the source that
// establishes each one. The CSV and this file are kept in step by a test: a row
// with no check and a check with no row are both failures.
//
// Usage:
//   node cms-lint.mjs [projectRoot] [--json]

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse, YamlError } from "./yaml-lite.mjs";
import { readContent, policyFrom } from "./cms-scaffold.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGE = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"];

/* ── the allow-list, read the way the bridge reads it ─────────────────────── */

export function covered(path, rules) {
  if (typeof path !== "string" || !path) return null;
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return rules.find(r => (r.prefix.endsWith("/")
    ? `${clean}/`.startsWith(r.prefix)
    : clean === r.prefix)) || null;
}

const list = value => (Array.isArray(value) ? value : []);
const fieldsOf = holder => list(holder && holder.fields);

function everyField(fields, visit, trail = []) {
  for (const field of list(fields)) {
    if (!field || typeof field !== "object") continue;
    visit(field, trail);
    everyField(field.fields, visit, [...trail, field.name]);
    everyField(field.types, visit, [...trail, field.name]);
    if (field.field) everyField([field.field], visit, [...trail, field.name]);
  }
}

/* ── the checks ───────────────────────────────────────────────────────────── */
//
// Each takes the whole context and reports through `add`. Keeping them in one
// table is what lets the test walk them against the CSV.

export const CHECKS = {
  "CMS-01": ({ config }, add) => {
    if (config.media_folder && !config.public_folder) {
      add("media_folder", `public_folder is not set, so images resolve to ${config.media_folder}/… instead of a URL`);
    }
  },

  "CMS-02": ({ config, rules }, add) => {
    for (const c of list(config.collections)) {
      if (c.folder && !covered(`${c.folder}/x.md`, rules)) {
        add(`collections.${c.name}.folder`, `${c.folder}/ is outside the allow-list, so every save is refused`);
      }
    }
  },

  "CMS-03": ({ config, rules }, add) => {
    for (const c of list(config.collections)) {
      for (const f of list(c.files)) {
        if (f.file && !covered(f.file, rules)) {
          add(`collections.${c.name}.files.${f.name}`, `${f.file} is outside the allow-list`);
        }
      }
    }
  },

  "CMS-04": ({ config, rules }, add) => {
    const folder = config.media_folder;
    if (!folder) return;
    const rule = covered(`${folder}/x.png`, rules);
    if (!rule) add("media_folder", `${folder}/ is outside the allow-list, so no upload can land`);
    else if (rule.extensions.length && !rule.extensions.some(e => IMAGE.includes(e))) {
      add("media_folder", `${folder}/ is allowed but for no image type`);
    }
  },

  "CMS-05": ({ config, dirs }, add) => {
    for (const c of list(config.collections)) {
      if (c.folder && !dirs.has(c.folder.replace(/\/+$/, ""))) {
        add(`collections.${c.name}.folder`, `${c.folder} does not exist, so the list stays empty`);
      }
    }
  },

  "CMS-06": ({ config, files }, add) => {
    for (const c of list(config.collections)) {
      for (const f of list(c.files)) {
        if (f.file && !files.has(f.file)) add(`collections.${c.name}.files.${f.name}`, `${f.file} does not exist yet`);
      }
    }
  },

  "CMS-07": ({ config }, add) => {
    for (const c of list(config.collections)) {
      if (!c.folder) continue;
      const names = fieldsOf(c).map(f => f && f.name);
      const identifier = c.identifier_field || ["title", "path", "id"].find(n => names.includes(n));
      if (!identifier || !names.includes(identifier)) {
        add(`collections.${c.name}`, "no identifier_field and no title field, so no slug can be built");
      }
    }
  },

  "CMS-08": ({ config }, add) => {
    const BUILT_IN = ["slug", "year", "month", "day", "hour", "minute", "second", "uuid", "uuid_short", "uuid_shorter", "dirname", "filename", "extension"];
    for (const c of list(config.collections)) {
      if (typeof c.slug !== "string") continue;
      const names = fieldsOf(c).map(f => f && f.name);
      for (const m of c.slug.matchAll(/\{\{\s*(?:fields\.)?([a-zA-Z0-9_-]+)\s*\}\}/g)) {
        if (!BUILT_IN.includes(m[1]) && !names.includes(m[1])) {
          add(`collections.${c.name}.slug`, `{{${m[1]}}} is not a field of this collection`);
        }
      }
    }
  },

  "CMS-09": ({ config }, add) => {
    const known = list(config.collections).map(c => c.name);
    for (const c of list(config.collections)) {
      everyField(collectionFields(c), field => {
        if (field.widget === "relation" && field.collection && !known.includes(field.collection)) {
          add(`collections.${c.name}.${field.name}`, `relation points at "${field.collection}", which is not a collection`);
        }
      });
    }
  },

  "CMS-10": ({ config }, add) => {
    const byName = new Map(list(config.collections).map(c => [c.name, c]));
    for (const c of list(config.collections)) {
      everyField(collectionFields(c), field => {
        if (field.widget !== "relation" || !byName.has(field.collection)) return;
        const target = collectionFields(byName.get(field.collection)).map(f => f && f.name);
        for (const key of ["value_field", ...list(field.search_fields)]) {
          const name = key === "value_field" ? field.value_field : key;
          if (!name || name === "{{slug}}") continue;
          const bare = String(name).replace(/^\{\{|\}\}$/g, "");
          if (!target.includes(bare)) {
            add(`collections.${c.name}.${field.name}`, `"${bare}" is not a field of ${field.collection}`);
          }
        }
      });
    }
  },

  "CMS-11": ({ config, rules }, add) => {
    for (const c of list(config.collections)) {
      everyField(collectionFields(c), field => {
        if (!field.media_folder) return;
        if (field.media_folder.startsWith("/") || !field.media_folder.startsWith(".")) {
          if (!covered(`${field.media_folder}/x.png`, rules)) {
            add(`collections.${c.name}.${field.name}.media_folder`, `${field.media_folder} is outside the allow-list`);
          }
        }
      });
    }
  },

  "CMS-12": ({ config }, add) => {
    const BY_EXTENSION = { ".yml": "yaml", ".yaml": "yaml", ".toml": "toml", ".json": "json", ".md": "frontmatter", ".markdown": "frontmatter", ".html": "frontmatter" };
    for (const c of list(config.collections)) {
      if (!c.extension || !c.format) continue;
      const family = BY_EXTENSION[`.${String(c.extension).replace(/^\./, "")}`];
      const wanted = String(c.format).includes("frontmatter") ? "frontmatter" : String(c.format);
      if (family && wanted !== family && !(family === "frontmatter" && wanted === "frontmatter")) {
        add(`collections.${c.name}`, `extension ${c.extension} with format ${c.format} parses as the wrong shape`);
      }
    }
  },

  "CMS-13": ({ config }, add) => {
    const folders = list(config.collections).filter(c => c.folder);
    for (const outer of folders) {
      for (const inner of folders) {
        if (outer === inner) continue;
        if (`${inner.folder}/`.startsWith(`${outer.folder}/`)) {
          add(`collections.${outer.name}.folder`, `${outer.folder} contains ${inner.folder}, so it lists that collection's entries too`);
        }
      }
    }
  },

  "CMS-14": ({ config, files }, add) => {
    for (const c of list(config.collections)) {
      if (!c.folder) continue;
      const extension = `.${String(c.extension || "md").replace(/^\./, "")}`;
      const inside = [...files].filter(f => f.startsWith(`${c.folder}/`));
      if (inside.length && !inside.some(f => f.endsWith(extension))) {
        add(`collections.${c.name}.extension`, `no file under ${c.folder} ends in ${extension}`);
      }
    }
  },

  "CMS-15": ({ config }, add) => {
    const name = config.backend && config.backend.name;
    if (name !== "nth") add("backend.name", `is "${name}", but nth-backend.js registers "nth"`);
  },

  "CMS-16": ({ config }, add) => {
    const url = (config.backend && config.backend.proxy_url) || "";
    if (!url.startsWith("/") || url.startsWith("//")) {
      add("backend.proxy_url", `"${url}" is not root-relative, so the session cookie is not sent with it`);
    }
  },

  "CMS-17": ({ config, policy }, add) => {
    const branch = config.backend && config.backend.branch;
    if (branch && policy.branch && branch !== policy.branch) {
      add("backend.branch", `config says ${branch}, the policy says ${policy.branch}`);
    }
  },

  "CMS-18": ({ config }, add) => {
    if (config.publish_mode === "editorial_workflow") {
      add("publish_mode", "the bridge implements the simple flow only");
    }
  },

  "CMS-19": ({ config }, add) => {
    if (config.local_backend !== undefined && config.local_backend !== false) {
      add("local_backend", "this routes the editor at a localhost server and is refused in production");
    }
  },

  "CMS-20": ({ policy }, add) => {
    for (const rule of list(policy.rules)) {
      if (rule.extensions.includes(".svg")) {
        add(`policy.${rule.prefix}`, "an SVG served from the site origin runs script, and the csrf cookie is readable by script");
      }
    }
  },

  "CMS-21": ({ policy }, add) => {
    for (const rule of list(policy.rules)) {
      if (`${rule.prefix}`.startsWith(".github") || rule.prefix === "" || rule.prefix === "/") {
        add(`policy.${rule.prefix}`, "this reaches the workflow that is supposed to be out of the bridge's reach");
      }
    }
  },

  "CMS-22": ({ headers }, add) => {
    if (headers === null) { add("_headers", "the file is missing, so the admin page has no policy of its own"); return; }
    const admin = /^\s*\/admin\/\*/m.test(headers);
    if (!admin) add("_headers", "no /admin/* section, so Decap's unsafe-eval would have to be granted site-wide");
    const relaxed = headers.split(/\n(?=\S)/).filter(block => /unsafe-eval|unsafe-inline/.test(block));
    for (const block of relaxed) {
      if (!/^\s*\/admin\/\*/m.test(block)) {
        add("_headers", `unsafe-eval or unsafe-inline is granted at ${block.trim().split("\n")[0]}`);
      }
    }
  },

  // CONTENT.md is the source and cms-policy.json is compiled from it, so the
  // question is not whether the two lists overlap, it is whether the file on disk
  // is still what CONTENT.md produces. Anything else is a hand edit, and a hand
  // edit of the allow-list is how a client quietly gains a path nobody granted.
  "CMS-23": ({ policy, content }, add) => {
    if (content === null) { add("CONTENT.md", "the file is missing, so nothing declares what the client may edit"); return; }
    let wanted;
    try { wanted = policyFrom(readContent(content)); }
    catch (e) { add("CONTENT.md", e.message); return; }
    for (const key of new Set([...Object.keys(wanted), ...Object.keys(policy)])) {
      const a = JSON.stringify(wanted[key]), b = JSON.stringify(policy[key]);
      if (a !== b) add("cms-policy.json", `${key} is ${b}, but CONTENT.md compiles to ${a}`);
    }
  },

  "CMS-24": ({ workflow, policy }, add) => {
    if (workflow === null) { add(".github/workflows/publish-content.yml", "the file is missing, so nothing publishes"); return; }
    const branch = policy.branch || "content";
    // En publication manuelle le flux n'a plus de déclencheur sur poussée, donc
    // il n'a plus de branche à surveiller : c'est CMS-28 qui veille sur ce
    // couple-là.
    if (policy.publish !== "manual"
        && !new RegExp(`branches:\\s*\\[\\s*${branch}\\s*\\]`).test(workflow)) {
      add(".github/workflows/publish-content.yml", `does not watch the ${branch} branch`);
    }
    // A token that survived means the generator never learned this site's names.
    if (/NTH_(CONTENT|PRODUCTION)_BRANCH/.test(workflow)) {
      add(".github/workflows/publish-content.yml", "still carries an unsubstituted branch token");
    }
    if (/git merge(?!-base)/.test(workflow)) {
      add(".github/workflows/publish-content.yml", "merges, which carries whatever else the branch holds");
    }
  },

  "CMS-25": ({ adminHtml, attribution, files }, add) => {
    if (adminHtml === null) { add("admin/index.html", "the file is missing"); return; }
    const referenced = [...adminHtml.matchAll(/src="\.\/(decap-cms-[^"]+\/decap-cms\.js)"/g)].map(m => m[1]);
    if (!referenced.length) { add("admin/index.html", "no vendored bundle is referenced"); return; }
    for (const name of referenced) {
      if (!files.has(`admin/${name}`)) add("admin/index.html", `${name} is referenced but not vendored`);
      // The entry fetches its chunks from its own directory at runtime, so an
      // entry alone is a login screen that loads and an editor that never opens.
      const dir = `admin/${name.slice(0, name.lastIndexOf("/"))}/`;
      const chunks = [...files].filter(f => f.startsWith(dir) && /\/[0-9]+\.decap-cms\.js$/.test(f));
      if (files.has(`admin/${name}`) && chunks.length < 10) {
        add("admin/index.html", `${dir} holds ${chunks.length} chunk(s); the entry loads its own at runtime`);
      }
      const version = /decap-cms-([0-9]+\.[0-9]+\.[0-9]+)\//.exec(name);
      if (!version) { add("admin/index.html", `${name} does not name a version`); continue; }
      if (attribution === null) { add("ATTRIBUTION.md", "the file is missing, so the bundle's licence and version are undeclared"); continue; }
      if (!attribution.includes(version[1])) {
        add("ATTRIBUTION.md", `declares no version matching the vendored ${version[1]}`);
      }
    }
  },

  "CMS-26": ({ adminHtml, files }, add) => {
    if (adminHtml === null) return;   // CMS-25 already said so
    if (!files.has("admin/theme.css")) add("admin/theme.css", "the file is missing, so the editor wears Decap's colours");
    if (!/href="\.\/theme\.css"/.test(adminHtml)) add("admin/index.html", "does not load ./theme.css");
  },

  // A locale Decap does not ship is not an error it reports: the editor renders
  // in English and nothing says why. The list is what decap-cms-locales 3.2.0
  // holds; refresh it when vendor-decap.mjs moves the pinned version.
  // Le seul appel que le générateur ne peut pas faire à la place du site : le
  // sien. Sans lui les pages partent avec leurs accolades et l'aperçu n'a rien
  // à montrer, et ça ne se voit qu'une fois en ligne.
  "CMS-29": ({ files, build }, add) => {
    if (!files.has("nth-content.mjs")) {
      add("nth-content.mjs", "the file is missing, so no token is ever resolved");
      return;
    }
    if (!/nth-content/.test(build)) {
      add("nth-content.mjs", "no build command calls it, so the pages ship with their tokens and the preview has nothing to show");
    }
  },

  "CMS-27": ({ config, policy }, add) => {
    for (const [where, locale] of [["admin/config.yml", config.locale],
                                   ["netlify/functions/cms-policy.json", policy.locale]]) {
      if (locale === undefined || LOCALES.has(locale)) continue;
      add(where, `locale ${JSON.stringify(locale)} is not one Decap ships, so the editor stays in English`);
    }
    if (config.locale !== undefined && policy.locale !== undefined && config.locale !== policy.locale) {
      add("netlify/functions/cms-policy.json",
        `the editor speaks ${config.locale} and the bridge answers in ${policy.locale}`);
    }
  },

  // Le mode de publication vit à deux endroits : la politique que lit le pont,
  // et les déclencheurs du flux de travail. S'ils divergent, soit tout se publie
  // à l'enregistrement pendant que l'éditeur promet un brouillon, soit rien ne
  // se publie jamais et le bouton est le seul chemin, sans que rien le dise.
  "CMS-28": ({ policy, workflow }, add) => {
    if (!workflow) return;   // CMS-24 l'a déjà dit
    const onPush = /^on:\n(?:\s*#.*\n)*\s*push:/m.test(workflow);
    const onDispatch = /^\s*workflow_dispatch:/m.test(workflow);
    const manual = policy.publish === "manual";
    if (manual && onPush) {
      add(".github/workflows/publish-content.yml",
        "the site declares manual publishing but the workflow still runs on every push");
    }
    if (!manual && !onPush) {
      add(".github/workflows/publish-content.yml",
        "the site publishes on save but the workflow no longer watches the content branch");
    }
    if (manual && !onDispatch) {
      add(".github/workflows/publish-content.yml",
        "manual publishing needs a workflow_dispatch trigger, the editor has nothing to call");
    }
  },
};

const LOCALES = new Set([
  "bg", "ca", "cs", "da", "de", "en", "es", "fa", "fr", "gr", "he", "hr", "hu",
  "it", "ja", "ko", "lt", "nb_no", "nl", "nn_no", "pl", "pt", "ro", "ru", "sl",
  "sv", "th", "tr", "ua", "uk", "vi", "zh_Hans", "zh_Hant",
]);

const collectionFields = c => [...fieldsOf(c), ...list(c.files).flatMap(f => fieldsOf(f))];

/* ── running them ─────────────────────────────────────────────────────────── */

export const META = () => {
  const csv = readFileSync(join(HERE, "../data/cms-checks.csv"), "utf8").trim().split(/\r?\n/);
  const head = csv[0].split(",");
  return new Map(csv.slice(1).map(line => {
    const cells = line.split(",");
    return [cells[0], Object.fromEntries(head.map((h, i) => [h, cells[i]]))];
  }));
};

export function lint(context) {
  const meta = context.meta || META();
  const findings = [];
  for (const [id, run] of Object.entries(CHECKS)) {
    const row = meta.get(id) || { Severity: "error", Title: id, Family: "config" };
    run(context, (where, detail) =>
      findings.push({ id, severity: row.Severity, family: row.Family, title: row.Title, where, detail }));
  }
  return findings;
}

// Git réécrit les fins de ligne à la sortie sur Windows (core.autocrlf), si
// bien qu'un dépôt cloné là-bas porte des CRLF que l'outil n'a pas écrits. Un
// contrôle qui compare du texte doit lire le contenu, pas la plateforme.
const lf = text => (text === null ? null : text.replace(/\r\n/g, "\n"));

export function readProject(root) {
  const read = rel => (existsSync(join(root, rel)) ? lf(readFileSync(join(root, rel), "utf8")) : null);
  const files = new Set(), dirs = new Set();
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = relative(root, join(dir, entry.name)).split("\\").join("/");
      if (/^(node_modules|\.git|dist|build|out|_site|\.next)(\/|$)/.test(rel)) continue;
      if (entry.isDirectory()) { dirs.add(rel); walk(join(dir, entry.name)); }
      else if (entry.isFile()) files.add(rel);
    }
  })(root);

  const configText = read("admin/config.yml");
  if (configText === null) throw new Error("admin/config.yml is missing; run /siteasy entrust first");
  const policyText = read("netlify/functions/cms-policy.json");
  if (policyText === null) throw new Error("netlify/functions/cms-policy.json is missing");

  return {
    config: parse(configText),
    policy: JSON.parse(policyText),
    rules: list(JSON.parse(policyText).rules),
    content: read("CONTENT.md"),
    headers: read("_headers"),
    adminHtml: read("admin/index.html"),
    attribution: read("ATTRIBUTION.md"),
    workflow: read(".github/workflows/publish-content.yml"),
    // Ce qui décrit le déploiement : la configuration de l'hébergeur, les
    // scripts du paquet, et les scripts de build posés à la racine.
    build: [...files].filter(f => f === "netlify.toml" || f === "package.json"
        || (/^[^/]+\.(js|mjs|cjs|ts|toml|yml|yaml)$/.test(f) && f !== "nth-content.mjs"))
      .map(f => read(f) || "").join("\n"),
    files, dirs,
  };
}

/* ── CLI ──────────────────────────────────────────────────────────────────── */

// `file://${process.argv[1]}` never matches on Windows: argv carries
// `C:\tools\x.mjs` and import.meta.url carries `file:///C:/tools/x.mjs`, so the
// CLI silently does nothing and exits 0. pathToFileURL is what spells the
// difference, and it costs one import.
const isCli = () => import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli()) {
  const args = process.argv.slice(2);
  const root = resolve(args.find(a => !a.startsWith("--")) || process.cwd());
  let context;
  try {
    context = readProject(root);
  } catch (e) {
    console.error(e instanceof YamlError ? `admin/config.yml ${e.message}` : e.message);
    process.exit(2);
  }
  const findings = lint(context);
  if (args.includes("--json")) {
    console.log(JSON.stringify(findings, null, 2));
  } else if (!findings.length) {
    console.log(`\n${Object.keys(CHECKS).length} checks, nothing to report.\n`);
  } else {
    console.log("");
    for (const f of findings) {
      const mark = f.severity === "error" ? "\x1b[31m ERROR \x1b[0m" : "\x1b[33m  warn \x1b[0m";
      console.log(`${mark} ${f.id}  ${f.where}\n         ${f.detail}`);
    }
    console.log(`\n${findings.filter(f => f.severity === "error").length} error(s), ` +
      `${findings.filter(f => f.severity !== "error").length} warning(s).\n`);
  }
  process.exit(findings.some(f => f.severity === "error") ? 1 : 0);
}
