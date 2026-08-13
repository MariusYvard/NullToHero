#!/usr/bin/env node
// live-inject.mjs — add or remove the live.js <script> tag in config.files.
// Usage: live-inject.mjs --port N --token T [--remove]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, readConfig, resolveConfigFiles, resolveInRoot } from "./live-core.mjs";

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

const refused = [];
for (const rel of files) {
  // P15. Cette ligne faisait `join(root, rel)` sans passer par resolveInRoot,
  // alors que live-accept.mjs:15 l'appelle et que live-core.mjs l'expose, testée
  // dans les deux sens. Les chemins viennent de resolveConfigFiles, qui accepte
  // une entrée de configuration littérale dès qu'elle existe sur le disque, donc
  // une entrée `../..` sortait de la racine. Le fichier de configuration est
  // écrit par l'utilisateur, ce qui borne le risque, et ce n'est pas une raison
  // d'avoir deux frères qui ne font pas le même geste.
  const full = resolveInRoot(root, rel);
  if (full === null) { refused.push(rel); continue; }
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
// P15, autre moitié de l'entrée 20 : `ok: true` était inconditionnel, y compris
// après une injection dans zéro fichier. Un appelant lisait un succès là où rien
// ne s'était passé.
const ok = refused.length === 0 && (remove || touched.length > 0);
process.stdout.write(JSON.stringify({
  ok, action: remove ? "remove" : "inject", touched, refused,
  note: refused.length ? `${refused.length} configured path(s) resolve outside the project root and were refused`
    : (!remove && touched.length === 0 ? "no file was touched: the anchor was not found in any configured file, so the live tag was not injected" : undefined),
}) + "\n");
process.exit(ok ? 0 : 1);
