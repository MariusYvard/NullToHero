#!/usr/bin/env node
/**
 * check-resources.mjs — maintenance for tools/design-system/data/resources.csv.
 *
 * Pings each resource URL and refreshes the `status` column (live, moved or a
 * dead marker), so the recommendation flow never sends anyone to a 404. Run it
 * locally or in CI where the network can reach the wider web; it only rewrites
 * the status column, it never fetches or commits any asset. Pure Node standard
 * library, no dependencies.
 *
 * Usage:
 *   node tools/design-system/scripts/check-resources.mjs            # check all
 *   node tools/design-system/scripts/check-resources.mjs --limit 50 # first N
 *   node tools/design-system/scripts/check-resources.mjs --dry      # do not write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSV = join(HERE, "..", "data", "resources.csv");
const UA = "NullToHero-resource-check/1.0 (+https://github.com/MariusYvard/NullToHero)";
const CONCURRENCY = 12;
const TIMEOUT = 9000;

const args = process.argv.slice(2);
const limit = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1], 10) : Infinity;
const dry = args.includes("--dry");

// Minimal RFC 4180 parser and serializer (quote-aware).
function parseCsv(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
}
function toCsv(rows) {
  const esc = (v) => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  return rows.map(r => r.map(esc).join(",")).join("\n") + "\n";
}

async function ping(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal, headers: { "user-agent": UA } });
    if (res.status === 403 || res.status === 405 || res.status === 501)
      res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal, headers: { "user-agent": UA } });
    try { await res.body?.cancel(); } catch { /* ignore */ }
    let movedHost = false;
    try { movedHost = new URL(res.url).host.replace(/^www\./, "") !== new URL(url).host.replace(/^www\./, ""); } catch { /* keep */ }
    if (!res.ok) return `dead(${res.status})`;
    return movedHost ? "moved" : "live";
  } catch (e) {
    return e.name === "AbortError" ? "dead(timeout)" : "dead(error)";
  } finally { clearTimeout(t); }
}

async function main() {
  const rows = parseCsv(readFileSync(CSV, "utf8"));
  const header = rows[0];
  const urlCol = header.indexOf("url"), statusCol = header.indexOf("status");
  if (urlCol < 0 || statusCol < 0) { console.error("resources.csv needs url and status columns"); process.exit(2); }
  const data = rows.slice(1).slice(0, limit === Infinity ? undefined : limit);
  let done = 0; const counts = {};
  const queue = data.map((r, i) => ({ r, i }));
  async function worker() {
    while (queue.length) {
      const { r } = queue.shift();
      const status = await ping(r[urlCol]);
      r[statusCol] = status;
      counts[status.replace(/\(.*/, "")] = (counts[status.replace(/\(.*/, "")] || 0) + 1;
      if (++done % 25 === 0) console.error(`[check] ${done}/${data.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (!dry) writeFileSync(CSV, toCsv(rows));
  console.error(`[check] ${done} checked, ${dry ? "dry run (not written)" : "status column updated"}`);
  console.error("[check] " + Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", "));
}
main();
