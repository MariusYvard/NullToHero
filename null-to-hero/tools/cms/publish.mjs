#!/usr/bin/env node
// publish.mjs — moves the allow-listed paths from the content branch onto the
// production branch, and nothing else. `/siteasy entrust` inlines this file into
// `.github/workflows/publish-content.yml`.
//
// WHY IT COPIES INSTEAD OF MERGING
// --------------------------------
// A merge would carry whatever the content branch happens to contain. If the
// bridge were ever compromised, a rewritten `package.json` would ride in and run
// as a build script in the deploy container. This walks the allow-list instead,
// so the production branch can only ever receive the paths a client is allowed
// to edit, whatever the rest of the content branch holds.
//
// WHY IT LIVES INSIDE THE WORKFLOW FILE
// -------------------------------------
// The bridge's token is a fine-grained PAT without the `Workflows` permission,
// and GitHub refuses writes under `.github/workflows/` to such a token. Inlining
// the copier there makes it unreachable by construction rather than by our own
// allow-list being correct. That is also why `allowed()` below is a second
// implementation of the bridge's `checkPath` rather than an import: the two
// copies are the point. `tests/cms-publish.mjs` fuzzes both against the same
// paths and fails if they ever disagree.
//
// Usage:
//   node publish.mjs --policy <cms-policy.json> --from <content tree> --to <production tree>
//   node publish.mjs ... --dry-run

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, lstatSync }
  from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const BAD = /[\\\0#?%]|[\x00-\x1f\x7f]|(^|\/)\.\.(\/|$)|\/\//;

export function allowed(path, rules) {
  if (typeof path !== "string" || !path || path.length > 512) return false;
  if (path.startsWith("/") || BAD.test(path)) return false;
  const rule = rules.find(r =>
    r.prefix.endsWith("/") ? path.startsWith(r.prefix) : path === r.prefix);
  if (!rule) return false;
  const dot = path.lastIndexOf(".");
  const ext = dot > path.lastIndexOf("/") ? path.slice(dot).toLowerCase() : "";
  return !rule.extensions.length || rule.extensions.includes(ext);
}

export function walk(root, prefix = "") {
  const here = prefix ? join(root, prefix) : root;
  let names;
  try { names = readdirSync(here, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of names) {
    if (e.name === ".git") continue;
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(root, rel));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

// `git ls-tree -r -z <merge-base>` verbatim: NUL-separated `mode SP type SP sha TAB path`.
// -z is what keeps git from quoting unusual bytes in a path.
export function parseBase(dump) {
  const base = new Map();
  for (const record of String(dump).split("\0")) {
    const m = /^\d+ blob ([0-9a-f]+)\t([\s\S]*)$/.exec(record);
    if (m) base.set(m[2], m[1]);
  }
  return base;
}

const blobSha = buffer =>
  createHash("sha1").update(`blob ${buffer.length}\0`).update(buffer).digest("hex");

// WHY THE MERGE BASE IS AN INPUT
// ------------------------------
// A plain tree comparison says "production has content/pricing.md, the content
// branch does not, so delete it". That is wrong whenever the agency added the
// file to production after the content branch forked: the client never touched
// it and it would vanish on the next save. What may be deleted is what the
// content branch itself deleted, which is what the fork point tells us.
//
// The same point makes the tamper signal usable. Almost everything outside the
// allow-list differs between two long-lived branches, so comparing the two
// branches would raise a warning on every ordinary run. Comparing the content
// branch to its own fork point answers a narrower question: did anything move
// on this branch that the bridge is not allowed to move. That is zero on an
// honest run and it stays zero while the agency works on production.
export function plan(rules, from, to, base = new Map()) {
  const incoming = walk(from), current = walk(to);
  const inSet = new Set(incoming), curSet = new Set(current);
  const copy = [], remove = [];
  const outside = [];

  for (const path of incoming) {
    if (!allowed(path, rules)) {
      const was = base.get(path);
      if (was !== blobSha(readFileSync(join(from, path)))) outside.push(path);
      continue;
    }
    if (!curSet.has(path) || !same(join(from, path), join(to, path))) copy.push(path);
  }
  for (const path of current) {
    if (!allowed(path, rules) || inSet.has(path)) continue;
    // Absent from the content branch and absent at the fork point means it was
    // added to production directly, so it is not the client's to delete. It is
    // also invisible to the editor, which is worth saying out loud.
    if (base.has(path)) remove.push(path);
    else outside.push(`(not editable) ${path}`);
  }
  return { copy, remove, outside };
}

function same(a, b) {
  try {
    const x = statSync(a), y = statSync(b);
    if (x.size !== y.size) return false;
    return readFileSync(a).equals(readFileSync(b));
  } catch { return false; }
}

// `walk` skips symlinks, so a symlink on the production side reads as an absent
// file and the copy would follow it. A link at `content/a.md` pointing at
// `../package.json`, or a `static/uploads` directory linked somewhere else, would
// carry a client's edit straight out of the allow-list. Every segment is checked.
export function safeTarget(root, rel, create = true) {
  const parts = rel.split("/");
  let here = root;
  for (let i = 0; i < parts.length; i++) {
    here = join(here, parts[i]);
    let stat = null;
    try { stat = lstatSync(here); } catch { stat = null; }
    if (stat && stat.isSymbolicLink()) throw new Error(`refusing to write through the symlink ${rel}`);
    const last = i === parts.length - 1;
    if (last) {
      if (stat && !stat.isFile()) throw new Error(`${rel} is not a regular file in production`);
    } else if (!stat) {
      if (!create) return null;
      mkdirSync(here);
    } else if (!stat.isDirectory()) {
      throw new Error(`${parts.slice(0, i + 1).join("/")} is not a directory in production`);
    }
  }
  return here;
}

export function apply({ copy, remove }, from, to) {
  for (const path of copy) {
    writeFileSync(safeTarget(to, path), readFileSync(join(from, path)));
  }
  for (const path of remove) {
    const target = safeTarget(to, path, false);
    if (target) rmSync(target, { force: true });
  }
}

/* ── CLI ──────────────────────────────────────────────────────────────────── */

function arg(name, required = true) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || !process.argv[i + 1]) {
    if (required) { console.error(`publish.mjs: --${name} is required`); process.exit(2); }
    return null;
  }
  return process.argv[i + 1];
}

// `file://${process.argv[1]}` never matches on Windows: argv carries
// `C:\tools\x.mjs` and import.meta.url carries `file:///C:/tools/x.mjs`, so the
// CLI silently does nothing and exits 0. pathToFileURL is what spells the
// difference, and it costs one import.
const isCli = () => import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli()) {
  const policy = JSON.parse(readFileSync(arg("policy"), "utf8"));
  if (!Array.isArray(policy.rules) || !policy.rules.length) {
    console.error("publish.mjs: the policy carries no rules; refusing to publish anything");
    process.exit(2);
  }
  const from = arg("from"), to = arg("to");
  const base = parseBase(readFileSync(arg("base"), "utf8"));
  const result = plan(policy.rules, from, to, base);

  console.log(`::notice::${result.copy.length} file(s) to copy, ${result.remove.length} to delete`);
  for (const path of [...result.copy, ...result.remove.map(p => `- ${p}`)]) console.log(`  ${path}`);
  for (const path of result.outside) console.log(`::warning::not published: ${path}`);

  // The workflow stages exactly what was touched, so a path production happens
  // to ignore cannot make a green run that published nothing.
  const changed = arg("changed", false);
  if (changed) writeFileSync(changed, [...result.copy, ...result.remove].join("\0"));

  if (!process.argv.includes("--dry-run")) {
    try {
      apply(result, from, to);
    } catch (e) {
      console.error(`::error::${e.message}`);
      process.exit(1);
    }
  }
  // A run with nothing to do still exits 0: whether there is anything to commit
  // is the workflow's question, not this script's.
  process.exit(0);
}
