#!/usr/bin/env node
/**
 * compare.mjs — structural diff of two SITE-AUDIT.json results.
 *
 * Reads two SITE-AUDIT.json files (target A and target B) and diffs them check
 * by check: which verdicts regressed, which improved, and the score deltas. This
 * is the robust path for /audit compare — a structural diff instead of
 * re-parsing markdown tables. Works on the deterministic check set; when the
 * full audit has merged agent verdicts into the JSON, those are diffed too.
 *
 * Usage:
 *   node tools/audit/compare.mjs <A.json> <B.json> [--out diff.json] [--md]
 *
 * Exit 0 always (reporting). Use gate.mjs for CI pass/fail.
 */

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith("--"));
if (positional.length < 2) {
  console.error("Usage: node tools/audit/compare.mjs <A.json> <B.json> [--out diff.json] [--md]");
  process.exit(2);
}
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const wantMd = args.includes("--md");
const outFile = val("--out", null);

const A = JSON.parse(readFileSync(positional[0], "utf8"));
const B = JSON.parse(readFileSync(positional[1], "utf8"));

const RANK = { FAIL: 0, WARN: 1, PASS: 2 };
const COST = { FAIL: -15, WARN: -7, PASS: 0 };
const keyOf = (c) => `${c.agent}::${c.id}`;

function index(checks) {
  const m = new Map();
  for (const c of checks || []) m.set(keyOf(c), c);
  return m;
}
const ia = index(A.checks), ib = index(B.checks);

const improvements = [], regressions = [], unchanged = [], coverage = [];
for (const [k, a] of ia) {
  const b = ib.get(k);
  if (!b) { coverage.push({ key: k, change: "removed in B", a: a.verdict }); continue; }
  const ra = RANK[a.verdict], rb = RANK[b.verdict];
  if (ra === undefined || rb === undefined) {
    if (a.verdict !== b.verdict) coverage.push({ key: k, change: `coverage ${a.verdict} to ${b.verdict}`, a: a.verdict, b: b.verdict });
    else unchanged.push(k);
    continue;
  }
  const impact = COST[b.verdict] - COST[a.verdict];
  const row = { key: k, id: a.id, agent: a.agent, dimension: a.dimension, critical: !!(a.critical || b.critical), from: a.verdict, to: b.verdict, impact, detail: b.detail };
  if (rb > ra) improvements.push(row);
  else if (rb < ra) regressions.push(row);
  else unchanged.push(k);
}
for (const [k, b] of ib) if (!ia.has(k)) coverage.push({ key: k, change: "added in B", b: b.verdict });

const byImpact = (x, y) => Math.abs(y.impact) - Math.abs(x.impact) || (y.critical - x.critical);
regressions.sort(byImpact); improvements.sort(byImpact);

const sNum = (o, p) => p.split(".").reduce((x, k) => (x == null ? null : x[k]), o);
const delta = (path) => {
  const a = sNum(A, path), b = sNum(B, path);
  return (typeof a === "number" && typeof b === "number") ? { a, b, delta: Math.round((b - a) * 10) / 10 } : { a, b, delta: null };
};

const diff = {
  schemaVersion: "1.0-compare",
  generatedAt: new Date().toISOString(),
  a: { target: A.target, mode: A.mode }, b: { target: B.target, mode: B.mode },
  scoreDeltas: {
    overall: delta("scores.overall"),
    searchVisibility: delta("scores.groups.searchVisibility"),
    frontEndDefects: delta("scores.groups.frontEndDefects"),
    designQuality: delta("scores.groups.designQuality"),
    deterministic: delta("deterministic.score"),
  },
  counts: { regressions: regressions.length, improvements: improvements.length, unchanged: unchanged.length, coverage: coverage.length },
  regressions, improvements, coverage,
};

function toMarkdown(d) {
  const dv = (x) => x.delta == null ? "n/a" : (x.delta >= 0 ? `+${x.delta}` : `${x.delta}`);
  const line = (label, x) => `| ${label} | ${x.a ?? "-"} | ${x.b ?? "-"} | ${dv(x)} |`;
  let out = `# Audit Compare (structural)\n\n`;
  out += `A: ${d.a.target.url || d.a.target.file || "?"}  →  B: ${d.b.target.url || d.b.target.file || "?"}\n\n`;
  out += `| Dimension | A | B | Delta |\n|-----------|---|---|-------|\n`;
  out += line("Overall", d.scoreDeltas.overall) + "\n";
  out += line("Search Visibility", d.scoreDeltas.searchVisibility) + "\n";
  out += line("Front-end Defects", d.scoreDeltas.frontEndDefects) + "\n";
  out += line("Design Quality", d.scoreDeltas.designQuality) + "\n";
  out += line("Deterministic floor", d.scoreDeltas.deterministic) + "\n\n";
  const rows = (arr) => arr.length ? arr.map(r => `| ${r.critical ? "yes" : ""} | ${r.id} | ${r.agent} | ${r.from} -> ${r.to} | ${r.impact >= 0 ? "+" : ""}${r.impact} |`).join("\n") : "| | (none) | | | |";
  out += `## Regressions (${d.counts.regressions})\n\n| Critical | Check | Agent | Change | Impact |\n|----------|-------|-------|--------|--------|\n${rows(d.regressions)}\n\n`;
  out += `## Improvements (${d.counts.improvements})\n\n| Critical | Check | Agent | Change | Impact |\n|----------|-------|-------|--------|--------|\n${rows(d.improvements)}\n\n`;
  out += `Unchanged: ${d.counts.unchanged}. Coverage changes: ${d.counts.coverage}.\n`;
  return out;
}

const output = wantMd ? toMarkdown(diff) : JSON.stringify(diff, null, 2);
if (outFile) { writeFileSync(outFile, output); console.error(`[compare] wrote ${outFile}`); }
else process.stdout.write(output + "\n");
console.error(`[compare] overall ${diff.scoreDeltas.overall.delta ?? "n/a"} | ${regressions.length} regression(s), ${improvements.length} improvement(s)`);
