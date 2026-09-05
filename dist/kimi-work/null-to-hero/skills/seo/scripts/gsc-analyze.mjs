#!/usr/bin/env node
/**
 * gsc-analyze.mjs: derived analyses over a Search Console export, offline.
 *
 * striking <file>            ranks 4-10 (title lever) and 11-20 (rank lever), scored
 * cannibal <file>            queries carried by several pages, with the page to keep
 * ctr-curve <file>           expected CTR per position bucket, calibrated on this site
 * ctr-gap <file>             rows under their own site's expected CTR, with the gain
 * compare <fileA> <fileB>    full outer join between two periods (A is the reference)
 * decay <fileA> <fileB>      pages losing clicks, with a diagnosis
 * matrix <file>              four quadrants of traffic against average position
 *
 * Common options: --json (default) | --markdown   --out FILE   --limit N
 *
 * Pure Node, no dependency, no network, no authentication. The user exports the rows
 * from the Search Console UI (or the API) and this reads that file. Nothing leaves the
 * machine and nothing is written outside the path given to --out.
 *
 * WINDOWING TRAP (compare and decay). Search Console never has data for the current
 * day, and the last day or two are still filling in. A window that runs "up to today"
 * therefore carries 1 to 2 empty days, so comparing it against a complete window pits a
 * partial period against a full one and manufactures a decline that is only missing
 * days. Pick two windows of the same length, both ending at least 3 days ago. When the
 * two files differ in row count by more than 50 percent, compare says so on stderr:
 * that is usually this mistake rather than a real collapse.
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const mode = args[0];
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const has = (n) => args.includes(n);
const int = (n, d) => { const v = parseInt(val(n, String(d)), 10); return Number.isFinite(v) ? v : d; };
const flt = (n, d) => { const v = parseFloat(val(n, String(d))); return Number.isFinite(v) ? v : d; };
const die = (m, c = 2) => { console.error(`[gsc] ${m}`); process.exit(c); };

// A ranking built on 9 rows is a ranking of noise. Refuse rather than mislead.
const MIN_ROWS = 10;

// Flags that consume the next argument, so file paths can sit anywhere on the line.
const VALUE_FLAGS = new Set([
  "--out", "--limit", "--min-impressions", "--max-position", "--min-pages",
  "--min-rows", "--tolerance", "--threshold", "--min-clicks", "--traffic-high",
  "--position-good", "--previous",
]);

const HELP = `Usage: node gsc-analyze.mjs <mode> <file...> [options]

Modes
  striking <file>            rows one step from a gain, scored and banded
  cannibal <file>            queries carried by 2+ pages, with the page to consolidate on
  ctr-curve <file>           expected CTR per position bucket, calibrated on THIS site
  ctr-gap <file>             rows under their own site's expected CTR, with the click gain
  compare <fileA> <fileB>    full outer join between two periods, A is the reference
  decay <fileA> <fileB>      pages losing clicks, with a diagnosis
  matrix <file>              four-quadrant matrix, traffic against average position

Input
  CSV (comma, semicolon or tab, quoted fields allowed) or JSON (array of rows, an object
  with a "rows" array, or the Search Console API shape with a keys[] array).
  Columns: query, page, clicks, impressions, ctr, position. English and French Search
  Console headers are both recognised, case and spacing insensitive. CTR reads as "3.5%"
  or "0.035"; numbers read as "1,234", "1 234" or "1234,5". Missing columns never crash:
  a mode that needs one it does not have says so and exits 0.

Options
  --json                 JSON output (default)
  --markdown             Markdown output
  --out FILE             write to FILE instead of stdout
  --limit N              rows kept in a ranking (default 20, matrix keeps all, 0 = all)
  --min-impressions N    striking: impression floor, replaces the per-band default.
                         ctr-curve and ctr-gap: rows under it stay out of the medians
  --max-position N       striking: worst position considered (default 20)
  --min-pages N          cannibal: distinct pages a query needs to be reported (default 2)
  --min-rows N           ctr-curve: rows a bucket needs before it gets a baseline (default 5)
  --tolerance F          ctr-gap: flag below expected * F (default 0.7)
  --threshold F          decay: click drop that counts as decay (default 0.20)
  --min-clicks N         decay: clicks needed in period A to be judged at all (default 10)
  --traffic-high N       matrix: clicks that count as high traffic (default 500)
  --position-good N      matrix: average position that counts as good (default 15)
  --previous FILE        matrix: previous period, lets the trend modulate priority
  --help                 this text

Notes
  Under ${MIN_ROWS} usable rows, every mode refuses to rank and says so with exit code 0.
  compare and decay expect two windows of the same length, both ending at least 3 days
  ago: Search Console has no data for today, so a window running up to today compares an
  incomplete period against a complete one.

Exit codes: 0 success or documented refusal, 2 usage error.`;

/* ------------------------------------------------------------------ parsing */

// Accents stripped and punctuation dropped, so "Requete", "Requête" and "requetes"
// collapse to the same token and header matching stops caring about the UI language.
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/* Resolution order is deliberate: CTR before clicks, because the French header
   "Taux de clics" contains the clicks stem and the English "Click-through rate"
   contains "click". The more specific field must claim its header first. */
const FIELDS = [
  ["ctr", ["ctr", "ctrmoyen", "clickthroughrate", "tauxdeclics", "tauxdeclic", "tauxdeclicsmoyen"], ["ctr", "clickthrough", "tauxdeclic"]],
  ["position", ["position", "positionmoyenne", "averageposition", "avgposition", "avgpos", "rank", "ranking", "classement"], ["positionmoyenne", "position", "classement", "ranking"]],
  ["impressions", ["impressions", "impression", "nombredimpressions", "affichages", "nombredaffichages", "totalimpressions"], ["impression", "affichage"]],
  ["clicks", ["clicks", "click", "clics", "clic", "nombredeclics", "totalclicks"], ["clic", "click"]],
  ["page", ["page", "pages", "toppages", "landingpage", "url", "adresse", "address", "destination"], ["page", "url", "adresse", "landing"]],
  ["query", ["query", "queries", "topqueries", "searchquery", "requete", "requetes", "keyword", "keywords", "motcle", "motscles", "terme"], ["requete", "query", "querie", "keyword", "motcle", "terme", "recherche"]],
];

// Two passes: exact tokens win everywhere before any stem is allowed to guess, so a
// column literally named "Position" is never stolen by a stem match on another header.
function mapHeaders(headers) {
  const map = {};
  const used = new Set();
  const normed = headers.map(h => [h, norm(h)]);
  for (const [field, exact] of FIELDS) {
    const hit = normed.find(([h, n]) => !used.has(h) && exact.includes(n));
    if (hit) { map[field] = hit[0]; used.add(hit[0]); }
  }
  for (const [field, , stems] of FIELDS) {
    if (map[field]) continue;
    const hit = normed.find(([h, n]) => !used.has(h) && stems.some(s => n.includes(s)));
    if (hit) { map[field] = hit[0]; used.add(hit[0]); }
  }
  return map;
}

function countOutside(line, ch) {
  let n = 0, q = false;
  for (const c of line) { if (c === '"') q = !q; else if (c === ch && !q) n++; }
  return n;
}

// The header line decides the separator. Body rows lie: "1,234" in a semicolon file
// would vote for the comma.
function sniffDelimiter(text) {
  const first = text.split(/\r?\n/, 1)[0] || "";
  const ranked = [",", ";", "\t"].map(d => [d, countOutside(first, d)]).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : ",";
}

function splitCsv(text, delim) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}

/* Thousands separators and decimal commas share the same characters, so the shape of
   the string decides: "1,234" is a group of three (Search Console formats it that way),
   "1,23" is a decimal comma, and when both marks appear the rightmost one is decimal. */
function parseNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (v === null || v === undefined) return NaN;
  let s = String(v).trim().replace(/[\s\u00a0\u202f\u2009]/g, "").replace(/%$/, "");
  if (!s) return NaN;
  const dot = s.includes("."), comma = s.includes(",");
  if (dot && comma) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (comma) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Everything is normalised to a 0-1 fraction. A bare value above 1 can only be a
// percentage that lost its sign, since a real CTR fraction never exceeds 1.
function parseCtr(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const pct = String(v).trim().endsWith("%");
  let n = parseNumber(v);
  if (!Number.isFinite(n)) return NaN;
  if (pct || n > 1) n /= 100;
  return Math.min(Math.max(n, 0), 1);
}

function makeRow(raw) {
  const clicks = parseNumber(raw.clicks);
  const impressions = parseNumber(raw.impressions);
  let ctr = parseCtr(raw.ctr);
  // A missing CTR column is recoverable: the two columns that define it are usually there.
  if (!Number.isFinite(ctr) && Number.isFinite(clicks) && Number.isFinite(impressions) && impressions > 0) ctr = clicks / impressions;
  const position = parseNumber(raw.position);
  return {
    query: String(raw.query ?? "").trim(),
    page: String(raw.page ?? "").trim(),
    clicks: Number.isFinite(clicks) ? clicks : 0,
    impressions: Number.isFinite(impressions) ? impressions : 0,
    ctr: Number.isFinite(ctr) ? ctr : NaN,
    position: Number.isFinite(position) ? position : NaN,
  };
}

// A row earns its place if it names something and carries at least one measure.
const usable = (r) => (r.query !== "" || r.page !== "") && (r.clicks > 0 || r.impressions > 0 || Number.isFinite(r.position) || Number.isFinite(r.ctr));

function loadCsv(text, path) {
  const delim = sniffDelimiter(text);
  const table = splitCsv(text, delim);
  if (!table.length) die(`${path} has no rows`);
  const headers = table[0].map(h => h.trim());
  const map = mapHeaders(headers);
  if (!map.query && !map.page) die(`${path}: no query or page column found among [${headers.join(", ")}]`);
  const idx = Object.fromEntries(Object.entries(map).map(([f, h]) => [f, headers.indexOf(h)]));
  const rows = table.slice(1).map(cells => makeRow(Object.fromEntries(
    Object.entries(idx).map(([f, i]) => [f, i >= 0 ? cells[i] : undefined]),
  )));
  return finish(rows, path, "csv", delim === "\t" ? "tab" : delim, map, table.length - 1);
}

function loadJson(text, path) {
  let data;
  try { data = JSON.parse(text); } catch (e) { die(`${path} is not valid JSON: ${e.message}`); }
  const arr = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : null;
  if (!arr) die(`${path}: expected an array of rows or an object with a "rows" array`);
  const objects = arr.map((o) => {
    const src = { ...(o && typeof o === "object" ? o : {}) };
    /* Search Console API shape: the dimensions arrive positionally in keys[]. The order
       depends on the request that produced the file, so classify by content instead:
       a URL or a path is the page, anything else is the query. */
    if (Array.isArray(o?.keys)) {
      const ks = o.keys.map(String);
      const p = ks.findIndex(k => /^(https?:\/\/|\/)/.test(k));
      if (p !== -1 && src.page === undefined) src.page = ks[p];
      const q = ks.findIndex((_, i) => i !== p);
      if (q !== -1 && src.query === undefined) src.query = ks[q];
    }
    return src;
  });
  const headers = [...new Set(objects.flatMap(o => Object.keys(o)))].filter(h => h !== "keys");
  const map = mapHeaders(headers);
  if (!map.query && !map.page) die(`${path}: no query or page property found among [${headers.join(", ")}]`);
  const rows = objects.map(o => makeRow(Object.fromEntries(
    Object.entries(map).map(([f, h]) => [f, o[h]]),
  )));
  return finish(rows, path, "json", null, map, objects.length);
}

function finish(all, path, format, delimiter, map, read) {
  const rows = all.filter(usable);
  // Presence is judged on the data, not on the header: a mapped but empty column is
  // not a column a mode can work with.
  const present = {
    query: rows.some(r => r.query !== ""),
    page: rows.some(r => r.page !== ""),
    clicks: rows.some(r => r.clicks > 0),
    impressions: rows.some(r => r.impressions > 0),
    ctr: rows.some(r => Number.isFinite(r.ctr)),
    position: rows.some(r => Number.isFinite(r.position)),
  };
  const missing = Object.keys(present).filter(f => !present[f]);
  return {
    path, rows, present,
    meta: {
      file: path, format, delimiter, columns: map,
      detected: Object.keys(present).filter(f => present[f]), missing,
      rowsRead: read, rowsUsable: rows.length,
    },
  };
}

function load(path) {
  let text;
  try { text = readFileSync(path, "utf8"); } catch (e) { return die(`cannot read ${path}: ${e.message}`); }
  text = text.replace(/^\uFEFF/, "");
  const t = text.trimStart();
  return t.startsWith("[") || t.startsWith("{") ? loadJson(text, path) : loadCsv(text, path);
}

/* -------------------------------------------------------------------- shared */

const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;
const pct = (n) => (n === null || n === undefined ? "" : `${r2(n * 100)}%`);
const take = (arr, n) => (n > 0 ? arr.slice(0, n) : arr);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Positions are averages, so 3.6 belongs with rank 4. Round first, then bucket.
function bucketOf(pos) {
  if (!Number.isFinite(pos) || pos < 0.5) return null;
  const p = Math.round(pos);
  if (p <= 1) return "1";
  if (p === 2) return "2";
  if (p === 3) return "3";
  if (p <= 5) return "4-5";
  if (p <= 10) return "6-10";
  if (p <= 20) return "11-20";
  return "21+";
}
const BUCKETS = ["1", "2", "3", "4-5", "6-10", "11-20", "21+"];

/* Sums clicks and impressions, then recomputes CTR from the totals. Averaging the
   per-row ratios would give a 3-impression row the same weight as a 3000-impression
   one. Position is impression-weighted for the same reason. */
function aggregate(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    let a = m.get(k);
    if (!a) { a = { key: k, query: r.query, page: r.page, clicks: 0, impressions: 0, wNum: 0, wDen: 0, pSum: 0, pN: 0, rows: 0 }; m.set(k, a); }
    a.clicks += r.clicks;
    a.impressions += r.impressions;
    if (Number.isFinite(r.position)) {
      a.pSum += r.position; a.pN++;
      if (r.impressions > 0) { a.wNum += r.position * r.impressions; a.wDen += r.impressions; }
    }
    a.rows++;
  }
  for (const a of m.values()) {
    a.position = a.wDen > 0 ? a.wNum / a.wDen : a.pN ? a.pSum / a.pN : NaN;
    a.ctr = a.impressions > 0 ? a.clicks / a.impressions : 0;
    delete a.wNum; delete a.wDen; delete a.pSum; delete a.pN;
  }
  return m;
}

/* -------------------------------------------------------------------- output */

function envelope(src) {
  const many = Array.isArray(src);
  return {
    mode,
    source: many ? src.map(s => s.path) : src.path,
    rowCount: many ? src.reduce((n, s) => n + s.rows.length, 0) : src.rows.length,
    generatedFrom: many ? src.map(s => s.meta) : src.meta,
    warnings: [],
  };
}

/* Repo convention: an empty array is a silent answer. A reader cannot tell an empty
   ranking from a broken filter, so restate what was asked and what was searched. */
const nothing = (message, parameters, src) => ({
  status: "NO_RESULTS",
  message,
  parameters,
  columnsDetected: (Array.isArray(src) ? src[0] : src).meta.detected,
});

// A needed column is missing. That is not an error, it is a fact about the export.
function missingColumn(src, field, why) {
  const s = Array.isArray(src) ? src[0] : src;
  emit({
    ...envelope(src),
    results: {
      status: "MISSING_COLUMN",
      message: `No usable "${field}" column in this export, so ${mode} has nothing to work with. ${why}`,
      columnsDetected: s.meta.detected,
      columnsMissing: s.meta.missing,
    },
  });
  process.exit(0);
}

function refuse(src) {
  const s = Array.isArray(src) ? src : [src];
  const short = s.find(x => x.rows.length < MIN_ROWS);
  emit({
    mode,
    source: s.length > 1 ? s.map(x => x.path) : s[0].path,
    status: "INSUFFICIENT_DATA",
    rows: short.rows.length,
    needed: MIN_ROWS,
    message: `${short.path} holds ${short.rows.length} usable row(s), under the ${MIN_ROWS} needed to rank anything. Export a longer window or a wider filter. This is a documented refusal, not a failure.`,
    generatedFrom: s.length > 1 ? s.map(x => x.meta) : s[0].meta,
    warnings: [],
  });
  process.exit(0);
}

const esc = (v) => (v === null || v === undefined ? "" : String(v).replace(/\|/g, "\\|"));
function mdTable(rows, cols) {
  const head = `| ${cols.map(c => c[0]).join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  return [head, sep, ...rows.map(r => `| ${cols.map(c => esc(typeof c[1] === "function" ? c[1](r) : r[c[1]])).join(" | ")} |`)].join("\n");
}

const MD_COLS = {
  striking: [["Query", r => r.query], ["Page", r => r.page || ""], ["Band", "band"], ["Pos", "position"], ["Impr", "impressions"], ["Clicks", "clicks"], ["CTR", r => pct(r.ctr)], ["Score", "score"]],
  cannibal: [["Query", "query"], ["Pages", "pageCount"], ["Impr", "impressions"], ["Clicks", "clicks"], ["Consolidate on", "consolidateTo"]],
  "ctr-curve": [["Bucket", "bucket"], ["Expected CTR", r => (r.expectedCtr === null ? "insufficient-data" : pct(r.expectedCtr))], ["Rows used", "rows"]],
  "ctr-gap": [["Query", r => r.query], ["Page", r => r.page || ""], ["Pos", "position"], ["Bucket", "bucket"], ["Impr", "impressions"], ["CTR", r => pct(r.ctr)], ["Expected", r => pct(r.expectedCtr)], ["Gain", "estimatedClickGain"]],
  compare: [["Key", "key"], ["Status", "status"], ["Clicks A", "clicksA"], ["Clicks B", "clicksB"], ["Diff", "click_diff"], ["Diff %", r => (r.click_pct === null ? "" : `${r.click_pct}%`)], ["Impr diff", "impression_diff"], ["Pos A", "positionA"], ["Pos B", "positionB"], ["Pos diff", "pos_diff"]],
  decay: [["Page", "page"], ["Clicks A", "clicksA"], ["Clicks B", "clicksB"], ["Drop", r => pct(r.decline)], ["Impr A", "impressionsA"], ["Impr B", "impressionsB"], ["Pos A", "positionA"], ["Pos B", "positionB"], ["Diagnosis", "diagnosis"]],
  matrix: [["Entity", "entity"], ["Quadrant", "quadrant"], ["Clicks", "clicks"], ["Pos", "position"], ["Trend", r => (r.trend === null ? "" : `${r.trend}%`)], ["Priority", "priority"], ["Action", "action"]],
};

function toMarkdown(p) {
  const src = Array.isArray(p.source) ? p.source.join(" vs ") : p.source;
  const out = [`# GSC ${p.mode} (${src})`, ""];
  if (p.status === "INSUFFICIENT_DATA") {
    out.push(`**${p.status}**: ${p.rows} usable row(s), ${p.needed} needed.`, "", p.message);
    return out.join("\n");
  }
  const meta = Array.isArray(p.generatedFrom) ? p.generatedFrom : [p.generatedFrom];
  out.push(meta.map(m => `\`${m.file}\`: ${m.rowsUsable}/${m.rowsRead} usable rows, columns ${m.detected.join(", ") || "none"}.`).join("  \n"), "");
  if (p.warnings.length) out.push(...p.warnings.map(w => `> WARNING: ${w}`), "");
  if (p.summary) out.push(Object.entries(p.summary).map(([k, v]) => `**${k}**: ${v}`).join(" | "), "");
  if (!Array.isArray(p.results)) {
    out.push(`**${p.results.status}**: ${p.results.message}`, "");
    if (p.results.parameters) out.push("Parameters used:", ...Object.entries(p.results.parameters).map(([k, v]) => `- \`${k}\`: ${v}`));
    return out.join("\n");
  }
  out.push(mdTable(p.results, MD_COLS[p.mode] || Object.keys(p.results[0] || {}).map(k => [k, k])));
  return out.join("\n");
}

function emit(payload) {
  for (const w of payload.warnings || []) console.error(`[gsc] warning: ${w}`);
  const text = has("--markdown") ? toMarkdown(payload) : JSON.stringify(payload, null, 2);
  const out = val("--out", null);
  if (out) { writeFileSync(out, `${text}\n`); console.log(`[gsc] wrote ${out}`); }
  else console.log(text);
}

/* --------------------------------------------------------------------- modes */

/* Two bands, one scale. The score is impressions times the CTR headroom to 5 percent:
   the formula that belongs to the 11-20 band, reused for 4-10 so the two rank against
   each other instead of living on incomparable scales. Clamped at 0, because a negative
   score would sort a row that already performs below a row with no opportunity at all. */
function modeStriking(src) {
  const limit = int("--limit", 20);
  const maxPos = flt("--max-position", 20);
  const override = has("--min-impressions") ? flt("--min-impressions", 0) : null;
  const LOW_FLOOR = override ?? 100, HIGH_FLOOR = override ?? 50, LOW_CTR = 0.03, TARGET = 0.05;
  const params = { minImpressionsRankLever: LOW_FLOOR, minImpressionsTitleLever: HIGH_FLOOR, maxPosition: maxPos, maxCtrRankLever: LOW_CTR, targetCtr: TARGET, limit };
  if (!src.present.position) return missingColumn(src, "position", "Re-export with the Position column enabled.");

  const results = [];
  for (const r of src.rows) {
    if (!Number.isFinite(r.position) || r.position > maxPos) continue;
    const ctr = Number.isFinite(r.ctr) ? r.ctr : 0;
    let band = null;
    if (r.position >= 11 && r.position <= 20 && r.impressions > LOW_FLOOR && ctr < LOW_CTR) band = "rank-lever";
    else if (r.position >= 4 && r.position <= 10 && r.impressions > HIGH_FLOOR) band = "title-lever";
    if (!band) continue;
    results.push({
      query: r.query || null, page: r.page || null, band,
      position: r2(r.position), impressions: r.impressions, clicks: r.clicks, ctr: r4(ctr),
      score: r2(r.impressions * Math.max(0, TARGET - ctr)),
      lever: band === "title-lever"
        ? "Already on page one: the title and the meta description move the clicks, not the rank."
        : "One page away from the fold: earn the rank first (depth, internal links, intent match).",
    });
  }
  results.sort((a, b) => b.score - a.score);
  const titleLever = results.filter(r => r.band === "title-lever").length;
  emit({
    ...envelope(src),
    summary: { candidates: results.length, titleLever, rankLever: results.length - titleLever },
    results: results.length
      ? take(results, limit)
      : nothing(`No row sits in either striking band. Positions 4-10 need more than ${HIGH_FLOOR} impressions; positions 11-20 need more than ${LOW_FLOOR} impressions and a CTR under ${LOW_CTR}.`, params, src),
  });
}

function modeCannibal(src) {
  const limit = int("--limit", 20);
  const minPages = int("--min-pages", 2);
  const params = { minPages, limit };
  if (!src.present.page) return missingColumn(src, "page", "Export the query dimension together with the page dimension.");
  if (!src.present.query) return missingColumn(src, "query", "Cannibalisation is a statement about a query, so that column is required.");

  const byQuery = new Map();
  for (const r of src.rows) {
    if (!r.query || !r.page) continue;
    if (!byQuery.has(r.query)) byQuery.set(r.query, []);
    byQuery.get(r.query).push(r);
  }
  const results = [];
  for (const [query, rows] of byQuery) {
    const pages = [...aggregate(rows, r => r.page).values()];
    if (pages.length < minPages) continue;
    // The page to keep is the one Google already prefers: best average position, and
    // when two are level, the one that turns its impressions into clicks.
    const winner = [...pages].sort((a, b) => {
      const pa = Number.isFinite(a.position) ? a.position : Infinity;
      const pb = Number.isFinite(b.position) ? b.position : Infinity;
      return pa !== pb ? pa - pb : b.clicks - a.clicks;
    })[0];
    results.push({
      query,
      pageCount: pages.length,
      clicks: pages.reduce((n, p) => n + p.clicks, 0),
      impressions: pages.reduce((n, p) => n + p.impressions, 0),
      consolidateTo: winner.key,
      pages: pages
        .map(p => ({ page: p.key, clicks: p.clicks, impressions: p.impressions, ctr: r4(p.ctr), position: Number.isFinite(p.position) ? r2(p.position) : null }))
        .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity)),
    });
  }
  results.sort((a, b) => b.impressions - a.impressions);
  emit({
    ...envelope(src),
    summary: { queriesAnalysed: byQuery.size, cannibalised: results.length },
    results: results.length
      ? take(results, limit)
      : nothing(`No query is carried by ${minPages} or more distinct pages in this export. Either the site is clean on this window, or the export was filtered down to a single page.`, params, src),
  });
}

/* Why calibrate on the site's own rows: a published market CTR curve is an average over
   other people's SERPs, other people's brands and other people's intent mix. Judging a
   row against a number this site could never reach produces confident nonsense. A bucket
   with too few rows stays null and is never interpolated from its neighbours, because an
   invented baseline is worse than a missing one. */
function buildCurve(rows, minRows) {
  const buckets = new Map(BUCKETS.map(b => [b, []]));
  const minImp = flt("--min-impressions", 0);
  let skipped = 0;
  for (const r of rows) {
    const b = bucketOf(r.position);
    if (!b || !Number.isFinite(r.ctr) || r.impressions < minImp) { skipped++; continue; }
    buckets.get(b).push(r.ctr);
  }
  const curve = BUCKETS.map((bucket) => {
    const xs = buckets.get(bucket);
    return xs.length >= minRows
      ? { bucket, expectedCtr: r4(median(xs)), rows: xs.length, status: "ok" }
      : { bucket, expectedCtr: null, rows: xs.length, status: "insufficient-data" };
  });
  return { curve, lookup: new Map(curve.map(c => [c.bucket, c.expectedCtr])), skipped, minImp };
}

function modeCtrCurve(src) {
  const minRows = int("--min-rows", 5);
  if (!src.present.position) return missingColumn(src, "position", "A CTR curve is indexed by position, so that column is required.");
  const { curve, skipped, minImp } = buildCurve(src.rows, minRows);
  const ok = curve.filter(c => c.status === "ok");
  const used = curve.reduce((n, c) => n + c.rows, 0);
  emit({
    ...envelope(src),
    summary: { bucketsWithBaseline: ok.length, bucketsInsufficient: curve.length - ok.length, rowsUsed: used, rowsSkipped: skipped, minRowsPerBucket: minRows },
    results: used
      ? curve
      : nothing(`No row carries both a position and a CTR, so no bucket could be calibrated. Buckets asked for: ${BUCKETS.join(", ")}, each needing ${minRows} rows and ${minImp} impressions.`, { minRows, minImpressions: minImp, buckets: BUCKETS.join(" ") }, src),
  });
}

function modeCtrGap(src) {
  const limit = int("--limit", 20);
  const minRows = int("--min-rows", 5);
  const tolerance = flt("--tolerance", 0.7);
  const params = { tolerance, minRows, limit };
  if (!src.present.position) return missingColumn(src, "position", "The expected CTR is read from the position, so that column is required.");

  const { curve, lookup } = buildCurve(src.rows, minRows);
  const blind = curve.filter(c => c.expectedCtr === null).map(c => c.bucket);
  const results = [];
  let checked = 0, ignored = 0;
  for (const r of src.rows) {
    const bucket = bucketOf(r.position);
    const expected = bucket ? lookup.get(bucket) : null;
    // No baseline means no judgement: flagging a row against a number that was never
    // measured is exactly the failure this mode exists to avoid.
    if (!bucket || expected === null || expected === undefined || !Number.isFinite(r.ctr)) { ignored++; continue; }
    checked++;
    if (r.ctr >= expected * tolerance) continue;
    const gain = Math.round(r.impressions * (expected - r.ctr));
    if (gain <= 0) continue;
    results.push({
      query: r.query || null, page: r.page || null, bucket,
      position: r2(r.position), impressions: r.impressions, clicks: r.clicks,
      ctr: r4(r.ctr), expectedCtr: expected, ratio: r2(r.ctr / expected), estimatedClickGain: gain,
    });
  }
  results.sort((a, b) => b.estimatedClickGain - a.estimatedClickGain);
  const warnings = blind.length ? [`No baseline for bucket(s) ${blind.join(", ")} (under ${minRows} rows each), so the rows sitting in them were not judged.`] : [];
  emit({
    ...envelope(src),
    warnings,
    baseline: curve,
    summary: { rowsChecked: checked, rowsIgnored: ignored, flagged: results.length, estimatedClickGain: results.reduce((n, r) => n + r.estimatedClickGain, 0) },
    results: results.length
      ? take(results, limit)
      : nothing(`No row falls under ${tolerance} times its own bucket's median CTR. ${checked} row(s) were judged, ${ignored} had no calibrated baseline.`, params, src),
  });
}

/* Full outer join. A percentage is null only when the base period is zero, and in that
   case status says why ("new"), so a null is always traceable to a stated reason and is
   never a division that quietly produced Infinity. */
function modeCompare(a, b) {
  const limit = int("--limit", 20);
  const SEP = "\u0000"; // queries contain spaces, so the composite key needs a separator that cannot appear
  const both = a.present.query && a.present.page && b.present.query && b.present.page;
  const dim = both ? "query+page" : a.present.query && b.present.query ? "query" : "page";
  const keyFn = both ? (r) => (r.query && r.page ? `${r.query}${SEP}${r.page}` : "") : dim === "query" ? (r) => r.query : (r) => r.page;
  const A = aggregate(a.rows, keyFn), B = aggregate(b.rows, keyFn);

  const warnings = [];
  const [nA, nB] = [a.rows.length, b.rows.length];
  if (Math.abs(nA - nB) / Math.max(nA, nB, 1) > 0.5) {
    warnings.push(`Row counts differ by more than 50 percent (${nA} vs ${nB}). The two windows are probably not the same length. Search Console has no data for today and the last day or two are still filling in, so a window running up to today compares a partial period against a full one.`);
  }

  const results = [];
  let created = 0, lost = 0;
  for (const key of new Set([...A.keys(), ...B.keys()])) {
    const x = A.get(key) || { clicks: 0, impressions: 0, ctr: 0, position: NaN };
    const y = B.get(key) || { clicks: 0, impressions: 0, ctr: 0, position: NaN };
    const status = !A.has(key) ? "new" : !B.has(key) ? "lost" : "changed";
    if (status === "new") created++; else if (status === "lost") lost++;
    const rel = (from, to) => (from > 0 ? r2(((to - from) / from) * 100) : null);
    const [qy, pg] = key.split(SEP);
    results.push({
      key: both ? `${qy} @ ${pg}` : key,
      query: both ? qy : dim === "query" ? key : null,
      page: both ? pg : dim === "page" ? key : null,
      status,
      clicksA: x.clicks, clicksB: y.clicks, click_diff: y.clicks - x.clicks, click_pct: rel(x.clicks, y.clicks),
      impressionsA: x.impressions, impressionsB: y.impressions, impression_diff: y.impressions - x.impressions, impression_pct: rel(x.impressions, y.impressions),
      ctrA: r4(x.ctr), ctrB: r4(y.ctr), ctr_diff: r4(y.ctr - x.ctr),
      positionA: Number.isFinite(x.position) ? r2(x.position) : null,
      positionB: Number.isFinite(y.position) ? r2(y.position) : null,
      // A minus B on purpose: rank 8 to rank 3 gives +5, so a positive number reads as
      // an improvement like every other diff on this row.
      pos_diff: Number.isFinite(x.position) && Number.isFinite(y.position) ? r2(x.position - y.position) : null,
    });
  }
  results.sort((x, y) => Math.abs(y.click_diff) - Math.abs(x.click_diff));
  emit({
    ...envelope([a, b]),
    warnings,
    summary: {
      joinedOn: dim, keys: results.length, new: created, lost, changed: results.length - created - lost,
      clicksA: [...A.values()].reduce((n, v) => n + v.clicks, 0),
      clicksB: [...B.values()].reduce((n, v) => n + v.clicks, 0),
    },
    results: results.length
      ? take(results, limit)
      : nothing(`The union of both periods is empty on the "${dim}" key. Check that both exports carry the same dimensions.`, { joinedOn: dim, limit }, [a, b]),
  });
}

/* The order of the diagnosis is the whole point. A rank drop usually drags impressions
   down with it, so naming the rank first stops the report from filing a ranking problem
   under visibility. Only when rank and impressions both held does a click drop mean the
   SERP or the snippet changed under the page. */
function modeDecay(a, b) {
  const limit = int("--limit", 20);
  const threshold = flt("--threshold", 0.20);
  const minClicks = int("--min-clicks", 10);
  const IMPR_STABLE = 0.10, POS_STABLE = 1.0;
  const params = { threshold, minClicks, limit, impressionsStableWithin: IMPR_STABLE, positionStableWithin: POS_STABLE };
  if (!a.present.page || !b.present.page) return missingColumn([a, b], "page", "Decay is a statement about a page, so both exports need the page dimension.");

  const A = aggregate(a.rows, r => r.page), B = aggregate(b.rows, r => r.page);
  const warnings = [];
  if (Math.abs(a.rows.length - b.rows.length) / Math.max(a.rows.length, b.rows.length, 1) > 0.5) {
    warnings.push(`Row counts differ by more than 50 percent (${a.rows.length} vs ${b.rows.length}). The windows are probably different lengths, which fabricates decay out of missing days.`);
  }

  const results = [];
  let judged = 0;
  for (const [page, x] of A) {
    // Under the floor, a 20 percent drop is 2 clicks. That is weather, not decay.
    if (x.clicks < minClicks) continue;
    judged++;
    const y = B.get(page) || { clicks: 0, impressions: 0, ctr: 0, position: NaN };
    const decline = (x.clicks - y.clicks) / x.clicks;
    if (decline <= threshold) continue;
    const imprChange = x.impressions > 0 ? (y.impressions - x.impressions) / x.impressions : 0;
    const posChange = Number.isFinite(x.position) && Number.isFinite(y.position) ? y.position - x.position : 0;
    let diagnosis, detail;
    if (posChange > POS_STABLE) {
      diagnosis = "ranking";
      detail = `Average position moved from ${r2(x.position)} to ${r2(y.position)}. The page lost rank: look at competitors, content depth and internal links before touching anything else.`;
    } else if (imprChange < -IMPR_STABLE) {
      diagnosis = "visibility";
      detail = `Impressions fell ${pct(Math.abs(imprChange))} at a stable position. The page is shown for fewer queries: check indexation, seasonality and query loss.`;
    } else {
      diagnosis = "serp-or-ctr";
      detail = "Impressions and position both held while clicks fell. Something changed in the SERP (new feature, AI answer, richer competitor) or in the snippet itself.";
    }
    results.push({
      page, diagnosis, detail,
      clicksA: x.clicks, clicksB: y.clicks, clicksLost: x.clicks - y.clicks, decline: r4(decline),
      impressionsA: x.impressions, impressionsB: y.impressions, impressionChange: r4(imprChange),
      positionA: Number.isFinite(x.position) ? r2(x.position) : null,
      positionB: Number.isFinite(y.position) ? r2(y.position) : null,
      positionChange: r2(posChange),
      status: B.has(page) ? "declining" : "lost",
    });
  }
  results.sort((x, y) => y.clicksLost - x.clicksLost);
  emit({
    ...envelope([a, b]),
    warnings,
    summary: { pagesJudged: judged, declining: results.length, clicksLost: results.reduce((n, r) => n + r.clicksLost, 0) },
    results: results.length
      ? take(results, limit)
      : nothing(`No page lost more than ${pct(threshold)} of its clicks. ${judged} page(s) cleared the ${minClicks}-click floor and were judged; the ones under it were skipped as noise.`, params, [a, b]),
  });
}

const RANKS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const bump = (p) => RANKS[Math.min(RANKS.indexOf(p) + 1, RANKS.length - 1)];

function modeMatrix(src) {
  const limit = int("--limit", 0); // the matrix is a census, not a top list
  const trafficHigh = flt("--traffic-high", 500);
  const positionGood = flt("--position-good", 15);
  const prevPath = val("--previous", null);
  const params = { trafficHigh, positionGood, limit, previous: prevPath };

  const keyFn = src.present.page ? (r) => r.page : (r) => r.query;
  const entityKind = src.present.page ? "page" : "query";
  const now = aggregate(src.rows, keyFn);
  const prev = prevPath ? aggregate(load(prevPath).rows, keyFn) : null;

  const QUADRANTS = {
    star: { priority: "HIGH", action: "Protect: refresh the content, keep internal links pointed here, watch the SERP for new entrants." },
    overperformer: { priority: "HIGH", action: "Best upside on the site: it already earns traffic from a weak average position. Deepen the content and add internal links to move the rank." },
    underperformer: { priority: "MEDIUM", action: "Ranks well and earns little: rewrite the title and the meta description, then confirm the query has real volume." },
    declining: { priority: "LOW", action: "Weak on both axes: rewrite around one clear intent, merge into a stronger page, or retire it." },
  };

  const results = [];
  for (const [key, a] of now) {
    const pos = Number.isFinite(a.position) ? a.position : Infinity;
    const highTraffic = a.clicks >= trafficHigh, goodPos = pos <= positionGood;
    const quadrant = highTraffic ? (goodPos ? "star" : "overperformer") : goodPos ? "underperformer" : "declining";
    let { priority, action } = QUADRANTS[quadrant];

    // At this volume and this depth a rewrite costs more than the page can return.
    if (quadrant === "declining" && a.clicks < 100 && pos > 50) {
      action = "301 redirect to the nearest stronger page: under 100 clicks and past position 50, consolidating the signal beats rewriting.";
    }

    let trend = null, trendStatus = prev ? "new" : "not-computed";
    if (prev) {
      const p = prev.get(key);
      if (p && p.clicks > 0) {
        trend = r2(((a.clicks - p.clicks) / p.clicks) * 100);
        trendStatus = trend <= -20 ? "declining" : trend >= 30 ? "growing" : "stable";
        // A star losing a fifth of its clicks is the most expensive thing on the site.
        if (trend <= -20) {
          priority = quadrant === "star" ? "CRITICAL" : bump(priority);
          // The raised priority has to be legible in the action, otherwise the report
          // shows an urgent line next to a routine instruction.
          action = quadrant === "star"
            ? `Losing traffic fast (${trend}%): diagnose before touching anything (rank drop, SERP change, seasonality), then refresh.`
            : `Down ${trend}% against the previous period, so treat it first: ${action}`;
        } else if (trend >= 30) {
          priority = RANKS.indexOf(priority) < RANKS.indexOf("HIGH") ? "HIGH" : priority;
          action = `Growing ${trend}%: extend the cluster around it (sibling pages, FAQ, internal links from related content).`;
        }
      } else if (p) trendStatus = "previous-had-zero-clicks";
    }

    results.push({
      entity: key, entityKind, quadrant, priority, action,
      clicks: a.clicks, impressions: a.impressions, ctr: r4(a.ctr),
      position: Number.isFinite(a.position) ? r2(a.position) : null,
      trend, trendStatus,
    });
  }
  results.sort((x, y) => RANKS.indexOf(y.priority) - RANKS.indexOf(x.priority) || y.clicks - x.clicks);
  const count = (q) => results.filter(r => r.quadrant === q).length;
  emit({
    ...envelope(src),
    summary: {
      entityKind, entities: results.length,
      star: count("star"), overperformer: count("overperformer"),
      underperformer: count("underperformer"), declining: count("declining"),
      thresholds: `traffic >= ${trafficHigh} clicks, position <= ${positionGood}`,
    },
    results: results.length
      ? take(results, limit)
      : nothing(`Nothing to place on the matrix: no ${entityKind} survived aggregation.`, params, src),
  });
}

/* ------------------------------------------------------------------ dispatch */

if (!mode || mode === "help" || has("--help") || has("-h")) {
  console.log(HELP);
  process.exit(mode && mode !== "help" && !has("--help") && !has("-h") ? 2 : 0);
}

const files = [];
for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith("--")) { if (VALUE_FLAGS.has(args[i])) i++; continue; }
  files.push(args[i]);
}
const two = mode === "compare" || mode === "decay";
const KNOWN = ["striking", "cannibal", "ctr-curve", "ctr-gap", "compare", "decay", "matrix"];
if (!KNOWN.includes(mode)) die(`unknown mode "${mode}" (expected ${KNOWN.join(", ")})`);
if (!files.length) die(`${mode} needs an input file (run --help)`);
if (two && files.length < 2) die(`${mode} needs two files: <fileA> <fileB>, A being the reference period`);

const src = load(files[0]);
const src2 = two ? load(files[1]) : null;
if (src.rows.length < MIN_ROWS || (src2 && src2.rows.length < MIN_ROWS)) refuse(two ? [src, src2] : src);

switch (mode) {
  case "striking": modeStriking(src); break;
  case "cannibal": modeCannibal(src); break;
  case "ctr-curve": modeCtrCurve(src); break;
  case "ctr-gap": modeCtrGap(src); break;
  case "compare": modeCompare(src, src2); break;
  case "decay": modeDecay(src, src2); break;
  case "matrix": modeMatrix(src); break;
}
