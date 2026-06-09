#!/usr/bin/env node
/**
 * eval.mjs — reference evaluation harness for the deterministic analyzer.
 *
 * Runs the static analyzer over the labeled fixtures in tests/eval/fixtures and
 * measures two things:
 *   1. Correctness — does each verdict match the AUTHORED label (intent)?
 *   2. Drift — has any verdict changed since the recorded baseline.json?
 * Correctness regressions fail CI. Drift is reported (and fails under --strict),
 * which is how a model or rule change that quietly moves verdicts gets caught.
 *
 * Usage:
 *   node tools/audit/eval.mjs            # grade + drift report (exit 1 on a label miss)
 *   node tools/audit/eval.mjs --strict   # also exit 1 on any drift vs baseline
 *   node tools/audit/eval.mjs --update   # rewrite baseline.json from current output
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks } from "./lib/checks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVAL = join(HERE, "..", "..", "tests", "eval");
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const update = args.includes("--update");

const labels = JSON.parse(readFileSync(join(EVAL, "labels.json"), "utf8"));
let baseline = {};
try { baseline = JSON.parse(readFileSync(join(EVAL, "baseline.json"), "utf8")); } catch { /* first run */ }

let asserted = 0, correct = 0;
const misses = [], drifts = [];
const perCheck = {};        // id -> { total, correct }
const freshBaseline = {};

for (const lab of labels) {
  const html = readFileSync(join(EVAL, "fixtures", lab.file), "utf8");
  const checks = runChecks({ rawHtml: html, robotsTxt: lab.robots || null, url: lab.url || null });
  const actual = {};
  for (const c of checks) actual[c.id] = c.verdict;
  freshBaseline[lab.file] = actual;

  for (const [id, want] of Object.entries(lab.expect)) {
    asserted++;
    const pc = (perCheck[id] ||= { total: 0, correct: 0 });
    pc.total++;
    if (actual[id] === want) { correct++; pc.correct++; }
    else misses.push(`${lab.file}: ${id} expected ${want}, got ${actual[id]}`);
  }
  const base = baseline[lab.file];
  if (base) for (const id of Object.keys(actual)) {
    if (base[id] !== undefined && base[id] !== actual[id]) drifts.push(`${lab.file}: ${id} ${base[id]} -> ${actual[id]}`);
  }
}

if (update) {
  writeFileSync(join(EVAL, "baseline.json"), JSON.stringify(freshBaseline, null, 2) + "\n");
  console.log(`[eval] baseline.json updated (${labels.length} fixtures).`);
}

const acc = asserted ? (100 * correct / asserted) : 0;
console.log(`\n── NullToHero analyzer eval ──`);
console.log(`Fixtures: ${labels.length}   Assertions: ${asserted}   Correct: ${correct}   Accuracy: ${acc.toFixed(1)}%`);
console.log(`\nPer-check accuracy:`);
for (const [id, { total, correct: c }] of Object.entries(perCheck).sort()) {
  console.log(`  ${id.padEnd(26)} ${c}/${total}`);
}
if (misses.length) { console.log(`\nLabel mismatches (correctness regressions):`); for (const m of misses) console.log(`  ✗ ${m}`); }
if (drifts.length) { console.log(`\nDrift vs baseline (${drifts.length}):`); for (const d of drifts) console.log(`  ~ ${d}`); }
else console.log(`\nNo drift vs baseline.`);

const fail = misses.length > 0 || (strict && drifts.length > 0);
console.log("\n" + "═".repeat(50));
if (fail) { console.error(`❌  eval FAILED — ${misses.length} mismatch(es)${strict ? `, ${drifts.length} drift` : ""}.`); process.exit(1); }
console.log(`✅  eval passed (${acc.toFixed(1)}% accuracy, ${labels.length} fixtures).`);
process.exit(0);
