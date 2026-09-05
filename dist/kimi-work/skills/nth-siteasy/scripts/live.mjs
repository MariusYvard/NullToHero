#!/usr/bin/env node
// live.mjs — boot siteasy live mode: validate config, migrate legacy context,
// start the helper daemon, inject the picker, report drift. Output: boot JSON.
import { existsSync, readFileSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { projectRoot, readConfig, resolveConfigFiles, listFiles,
         statePath, readJSON, token as mkToken, ensureStateDir } from "./live-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const root = projectRoot();
const out = (o) => { process.stdout.write(JSON.stringify(o) + "\n"); process.exit(o.ok === false ? 1 : 0); };

// Context files (PRODUCT.md / DESIGN.md) + legacy migration.
function loadContext() {
  const productPath = join(root, "PRODUCT.md");
  const designPath = join(root, "DESIGN.md");
  const legacy = join(root, ".impeccable.md");
  let migrated = false;
  if (existsSync(legacy) && !existsSync(productPath)) { try { renameSync(legacy, productPath); migrated = true; } catch {} }
  const read = (p) => { try { return existsSync(p) ? readFileSync(p, "utf8") : null; } catch { return null; } };
  const product = read(productPath), design = read(designPath);
  return { hasProduct: product !== null, productPath: product !== null ? productPath : null, product,
           hasDesign: design !== null, designPath: design !== null ? designPath : null, design, migrated };
}

const cfgRes = readConfig(root);
if (!cfgRes.ok) out(cfgRes); // { ok:false, error:"config_missing"|"config_invalid", path }
const cfg = cfgRes.config;

function freePort(start) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(freePort(start + 1)));
    srv.listen(start, "127.0.0.1", () => { const p = srv.address().port; srv.close(() => resolve(p)); });
  });
}

// Reuse a running daemon if present and healthy; else start one.
let st = readJSON(statePath(root));
let port, tok;
if (st && st.port && st.pid && isAlive(st.pid)) { port = st.port; tok = st.token; }
else {
  port = await freePort(8400);
  tok = mkToken();
  const child = spawn(process.execPath, [join(HERE, "live-server.mjs"), "start", "--port", String(port), "--token", tok],
    { cwd: root, detached: true, stdio: "ignore" });
  child.unref();
  await waitFor(() => { const s = readJSON(statePath(root)); return s && s.port === port; }, 4000);
}

// Inject the picker tag.
const inj = spawnSync(process.execPath, [join(HERE, "live-inject.mjs"), "--port", String(port), "--token", tok],
  { cwd: root, encoding: "utf8" });
let injected = {};
try { injected = JSON.parse(inj.stdout.trim().split("\n").pop()); } catch {}

const pageFiles = resolveConfigFiles(cfg, root);

// Drift: HTML page files under common roots not covered by config.files.
const pageRoots = /^(public|src|app|pages)\//;
const allHtml = listFiles(root).filter((f) => /\.html?$/.test(f) && pageRoots.test(f));
const orphans = allHtml.filter((f) => !pageFiles.includes(f));
const configDrift = orphans.length
  ? { orphans, orphanCount: orphans.length,
      hint: `${orphans.length} HTML file(s) exist but aren't in config.files. Consider a glob like "public/**/*.html".` }
  : null;

out({ ok: true, serverPort: port, serverToken: tok, pageFiles, ...loadContext(), configDrift });

function isAlive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
function waitFor(cond, ms) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    (function tick() { if (cond() || Date.now() - t0 > ms) return resolve(); setTimeout(tick, 80); })();
  });
}
