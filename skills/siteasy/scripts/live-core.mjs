#!/usr/bin/env node
// live-core.mjs — shared helpers for siteasy live mode (maison implementation).
// Pure Node standard library. No external dependencies.
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, extname, isAbsolute, sep } from "node:path";
import { execFileSync } from "node:child_process";
import http from "node:http";
import { randomBytes } from "node:crypto";

export const STATE_DIRNAME = ".siteasy-live";

export function projectRoot() {
  return resolve(process.env.SITEASY_PROJECT_ROOT || process.cwd());
}
export function stateDir(root = projectRoot()) {
  return join(root, STATE_DIRNAME);
}
export function configPath(root = projectRoot()) {
  return join(stateDir(root), "config.json");
}
export function statePath(root = projectRoot()) {
  return join(stateDir(root), "state.json");
}

export function ensureStateDir(root = projectRoot()) {
  const d = stateDir(root);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

export function readJSON(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}
export function writeJSON(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

// ── Config ──────────────────────────────────────────────────────────────────
export function readConfig(root = projectRoot()) {
  const p = configPath(root);
  if (!existsSync(p)) return { ok: false, error: "config_missing", path: p };
  const cfg = readJSON(p);
  if (!cfg || !Array.isArray(cfg.files) || cfg.files.length === 0) {
    return { ok: false, error: "config_invalid", path: p };
  }
  return { ok: true, config: cfg, path: p };
}

// ── Glob (minimal: supports ** , * , ?) ───────────────────────────────────────
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") { re += "[^]*"; i++; if (glob[i + 1] === "/") i++; }
      else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re + "$");
}

const HARD_EXCLUDE = [/(^|\/)node_modules\//, /(^|\/)\.git\//];

export function listFiles(root = projectRoot()) {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      let st; try { st = statSync(full); } catch { continue; }
      const rel = relative(root, full).split("\\").join("/");
      if (HARD_EXCLUDE.some((r) => r.test(rel + "/"))) continue;
      if (st.isDirectory()) walk(full);
      else out.push(rel);
    }
  })(root);
  return out;
}

export function resolveConfigFiles(cfg, root = projectRoot()) {
  const all = listFiles(root);
  const excludes = (cfg.exclude || []).map(globToRegExp);
  const matched = new Set();
  for (const entry of cfg.files) {
    if (entry.includes("*") || entry.includes("?")) {
      const re = globToRegExp(entry);
      for (const f of all) if (re.test(f)) matched.add(f);
    } else if (existsSync(join(root, entry))) {
      matched.add(entry.split("\\").join("/"));
    }
  }
  for (const f of [...matched]) {
    const rel = f + "/";
    if (HARD_EXCLUDE.some((r) => r.test(rel))) matched.delete(f);
    else if (excludes.some((r) => r.test(f))) matched.delete(f);
  }
  return [...matched].sort();
}

// ── Git-tracked detection ─────────────────────────────────────────────────────
export function gitTrackedFiles(root = projectRoot()) {
  try {
    const out = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
    return new Set(out.split("\n").map((s) => s.trim()).filter(Boolean));
  } catch { return null; } // not a git repo
}

const GENERATED_MARKERS = [/GENERATED/i, /DO NOT EDIT/i, /@generated/];
export function looksGenerated(content) {
  const head = (content || "").slice(0, 400);
  return GENERATED_MARKERS.some((r) => r.test(head));
}

// ── Path containment ───────────────────────────────────────────────────────────
// Resolve `file` against `root` and confirm it stays inside the project tree.
// Returns the absolute path, or null if `file` is absolute / escapes root.
export function resolveInRoot(root, file) {
  if (typeof file !== "string" || file.length === 0) return null;
  if (isAbsolute(file)) return null;
  const full = resolve(root, file);
  if (full !== root && !full.startsWith(root + sep)) return null;
  return full;
}

// ── Comment syntax ─────────────────────────────────────────────────────────────
export function commentSyntaxFor(file) {
  const ext = extname(file).toLowerCase();
  if ([".jsx", ".tsx", ".ts", ".js", ".mjs"].includes(ext)) return "jsx";
  if ([".vue", ".svelte", ".astro", ".html", ".htm"].includes(ext)) return "html";
  return "html";
}

// ── HTTP client to the live helper daemon ──────────────────────────────────────
export function httpJSON(method, port, path, token, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { host: "127.0.0.1", port, path, method,
        headers: { "content-type": "application/json", "x-live-token": token || "",
                   ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } },
      (r) => {
        let buf = "";
        r.on("data", (c) => (buf += c));
        r.on("end", () => { try { res({ status: r.statusCode, json: buf ? JSON.parse(buf) : null }); }
                            catch { res({ status: r.statusCode, json: null, raw: buf }); } });
      }
    );
    req.on("error", rej);
    if (data) req.write(data);
    req.end();
  });
}

export function token() {
  return randomBytes(24).toString("base64url");
}
