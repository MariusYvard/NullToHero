#!/usr/bin/env node
// live-inject.mjs — add or remove the live.js <script> tag in config.files.
// Usage: live-inject.mjs --port N --token T [--remove]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, readConfig, resolveConfigFiles } from "./live-core.mjs";

const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const remove = args.includes("--remove");
const port = get("--port");
const tok = get("--token");

const root = projectRoot();
const cfgRes = readConfig(root);
if (!cfgRes.ok) { process.stdout.write(JSON.stringify(cfgRes) + "\n"); process.exit(1); }
const cfg = cfgRes.config;
const files = resolveConfigFiles(cfg, root);
const anchor = cfg.insertBefore || "</body>";
const TAG_RE = /[ \t]*<script[^>]*data-siteasy-live[^>]*><\/script>\n?/g;
const touched = [];

for (const rel of files) {
  const full = join(root, rel);
  if (!existsSync(full)) continue;
  let s = readFileSync(full, "utf8");
  const before = s;
  s = s.replace(TAG_RE, ""); // always strip stale tags first (idempotent)
  if (!remove && port) {
    const tag = `  <script src="http://localhost:${port}/live.js?token=${tok || ""}" data-siteasy-live defer></script>\n`;
    if (s.includes(anchor)) s = s.replace(anchor, tag + anchor);
  }
  if (s !== before) { writeFileSync(full, s); touched.push(rel); }
}
process.stdout.write(JSON.stringify({ ok: true, action: remove ? "remove" : "inject", touched }) + "\n");
