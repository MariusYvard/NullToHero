#!/usr/bin/env node
/**
 * indexnow.mjs — instant-indexing pings for /seo indexnow.
 *
 * key                          generate a key and its <key>.txt file content
 * submit <host> <url...>       submit one URL (GET) or a batch (POST, max 10000)
 * sitemap <sitemap-url>        extract <loc> entries and submit them as a batch
 *
 * Common options: --key K | --key-file F   --key-location URL
 *                 --endpoint api.indexnow.org   --limit N   --dry-run
 *
 * Pure Node. One accepted submission propagates to every participating engine
 * (Bing, Yandex, Naver, Seznam, Yep). Google does not participate: keep sitemaps.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const mode = args[0];
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const has = (n) => args.includes(n);
const die = (m, c = 2) => { console.error(`[indexnow] ${m}`); process.exit(c); };

const ENDPOINT = val("--endpoint", "api.indexnow.org");
const STATUS = {
  200: "accepted", 202: "accepted (verification pending — normal)",
  400: "bad request (malformed submission)", 403: "key mismatch — the hosted <key>.txt does not match",
  422: "URLs do not belong to this host or scheme", 429: "too many requests — you are spamming, back off",
};
const explain = (s) => STATUS[s] || `HTTP ${s}`;

function getKey() {
  const kf = val("--key-file", null);
  if (kf) return readFileSync(kf, "utf8").trim();
  const k = val("--key", null);
  if (!k) die("missing --key or --key-file (run `indexnow.mjs key` to create one)");
  return k;
}

async function submit(host, urls) {
  const key = getKey();
  const keyLocation = val("--key-location", null);
  const limit = parseInt(val("--limit", "10000"), 10);
  urls = [...new Set(urls)].slice(0, Math.min(limit, 10000));
  if (urls.length === 0) die("no URLs to submit");
  if (has("--dry-run")) {
    console.log(`[indexnow] dry-run: would submit ${urls.length} URL(s) for ${host} to ${ENDPOINT}`);
    urls.slice(0, 5).forEach(u => console.log(`  ${u}`));
    if (urls.length > 5) console.log(`  ... ${urls.length - 5} more`);
    return;
  }
  let status;
  if (urls.length === 1) {
    const u = new URL(`https://${ENDPOINT}/indexnow`);
    u.searchParams.set("url", urls[0]); u.searchParams.set("key", key);
    if (keyLocation) u.searchParams.set("keyLocation", keyLocation);
    status = (await fetch(u)).status;
  } else {
    const body = { host, key, urlList: urls };
    if (keyLocation) body.keyLocation = keyLocation;
    status = (await fetch(`https://${ENDPOINT}/indexnow`, {
      method: "POST", headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    })).status;
  }
  console.log(`[indexnow] ${urls.length} URL(s) -> ${ENDPOINT}: ${status} ${explain(status)}`);
  process.exit(status === 200 || status === 202 ? 0 : 1);
}

if (mode === "key") {
  const key = randomBytes(16).toString("hex");
  const out = val("--out", null);
  if (out) { writeFileSync(`${out}/${key}.txt`, key); console.log(`[indexnow] wrote ${out}/${key}.txt`); }
  console.log(key);
  console.log(`[indexnow] host this content as https://<host>/${key}.txt (plain 200, no redirect), commit it with the site.`);
} else if (mode === "submit") {
  const host = args[1] || die("submit needs <host> then the URL(s)");
  const urls = args.slice(2).filter(a => a.startsWith("http"));
  await submit(host, urls);
} else if (mode === "sitemap") {
  const sm = args[1] || die("sitemap needs the sitemap URL");
  const res = await fetch(sm);
  if (!res.ok) die(`sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
  if (urls.length === 0) die("no <loc> entries found");
  const host = new URL(urls[0]).host;
  console.log(`[indexnow] ${urls.length} URL(s) from the sitemap, host ${host}`);
  await submit(host, urls);
} else {
  console.error("Usage: node indexnow.mjs key [--out DIR]");
  console.error("       node indexnow.mjs submit <host> <url...> --key K [--key-location URL] [--dry-run]");
  console.error("       node indexnow.mjs sitemap <sitemap-url> --key K [--limit N] [--dry-run]");
  process.exit(2);
}
