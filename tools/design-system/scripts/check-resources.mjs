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
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
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

const HDRS = { "user-agent": UA, "accept": ACCEPT, "accept-language": "en,fr;q=0.8" };
function get(url, method, signal) {
  return fetch(url, { method, redirect: "follow", signal, headers: HDRS });
}
// Only a confirmed-broken URL is dead. A reachable host that walls off a bare
// request (401, 403, 429) is live; a server hiccup (5xx) or a slow or refused
// connection is unverified, never condemned. A HEAD is tried first, then a GET,
// since many hosts reject HEAD or answer it differently.
async function ping(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    let res;
    try {
      res = await get(url, "HEAD", ctrl.signal);
      if (!res.ok) { try { await res.body?.cancel(); } catch { /* ignore */ } res = await get(url, "GET", ctrl.signal); }
    } catch (e) {
      if (e.name === "AbortError") throw e;
      res = await get(url, "GET", ctrl.signal);
    }
    try { await res.body?.cancel(); } catch { /* ignore */ }
    let movedHost = false;
    try { movedHost = new URL(res.url).host.replace(/^www\./, "") !== new URL(url).host.replace(/^www\./, ""); } catch { /* keep */ }
    if (res.status === 404 || res.status === 410) return `dead(${res.status})`;
    if (res.status >= 500) return "unverified";
    if (res.ok || res.status === 401 || res.status === 403 || res.status === 429) return movedHost ? "moved" : "live";
    return "unverified";
  } catch (e) {
    if (e.name === "AbortError") return "unverified";
    return (e && e.cause && e.cause.code === "ENOTFOUND") ? "dead(dns)" : "unverified";
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
