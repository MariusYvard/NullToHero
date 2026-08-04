#!/usr/bin/env node
/**
 * NullToHero :: corpus divergence harness
 * Usage: node tools/eval-corpus/run.mjs [--check] [--json]
 *
 * WHY THIS EXISTS
 * ---------------
 * Every skill in this category asserts that it improves what a model produces.
 * As of August 2026 none of them publishes a measurement. The largest of them has
 * an evaluation framework, described in its own contributor docs as running the
 * same brief with and without the skill across four models; that repository is
 * private and no result is public. Star counts measure virality, not effect.
 *
 * So this is the differentiator, and it is only a differentiator while it is
 * honest about its limits. What follows is a protocol, a case registry, and the
 * recorded outcome of every run, including the two that passed narrowly and the
 * two occasions where the control group produced something the corpus lacked.
 *
 * THE PROTOCOL
 * ------------
 * A reference file earns its place if it changes what the model REACHES FOR, not
 * if it teaches the model something. Those are different claims and only the
 * first survives a capable model.
 *
 * Two tests, and the second is the one that decides:
 *
 *   Closed task. Name the features explicitly ("build a component using cascade
 *   layers, @scope with a lower boundary, a typed @property"). Compare output
 *   with and without the file. EQUIVALENT output licenses a cut: the model
 *   already had the capability.
 *
 *   Open question. Ask what a beginner would actually ask, naming no technique.
 *   Compare what each answer REACHES FOR. DIVERGENT output forbids a cut: the
 *   file is supplying a choice the model does not make on its own.
 *
 * v2.6.0 ran both on four files. The closed test said cut everything. The open
 * test said keep the prescriptions, and it was right: the reduced file still
 * produced cascade layers and a migration path where the bare model explained
 * specificity and stopped.
 *
 * WHAT THIS HARNESS DOES AND DOES NOT DO
 * --------------------------------------
 * Generation needs a model, so it is not run in CI and never will be: a test
 * that needs a network round trip and an API key is a test that gets disabled.
 * What IS deterministic, and what --check runs, is everything around it: the
 * registry is well formed, every referenced file exists, every case carries
 * markers and a rationale, and the recorded results have not gone stale relative
 * to the cases. That guard is the part that rots without help.
 *
 * WHAT IT CANNOT PROVE, stated because a benchmark whose author also writes the
 * thing being benchmarked owes the reader this paragraph:
 *
 *   - Markers are a proxy for reasoning. An answer can hit every marker and still
 *     be bad advice. The markers show the file was consulted, not that it helped.
 *   - The questions are ours. A question written by whoever wrote the file is a
 *     question the file is likely to answer well.
 *   - n is 1 per case. No variance, no repeated sampling, no confidence interval.
 *   - The judge was the same session that made the cuts. Independent grading
 *     would be better and is the obvious next improvement.
 *
 * The right reading of a green run is narrow: on these cases, this file changed
 * what the model reached for. Not: this plugin makes design better.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cases = JSON.parse(readFileSync(join(ROOT, "tools/eval-corpus/cases.json"), "utf8"));
const resultsPath = join(ROOT, "tools/eval-corpus/results.json");
const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : { runs: [] };

const args = process.argv.slice(2);
let failures = 0;
const ok = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const no = (m) => { failures++; console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); };

if (args.includes("--json")) {
  console.log(JSON.stringify({ cases: cases.cases.length, results }, null, 2));
  process.exit(0);
}

console.log("\nCorpus divergence harness\n");
console.log("Registry integrity");
const ids = new Set();
for (const c of cases.cases) {
  if (ids.has(c.id)) no(`duplicate case id: ${c.id}`);
  ids.add(c.id);
  if (!existsSync(join(ROOT, c.file))) no(`${c.id}: ${c.file} does not exist`);
  if (!c.markers?.length) no(`${c.id}: no markers, so the case cannot decide anything`);
  if (!c.rationale) no(`${c.id}: no rationale, so a reader cannot tell what it is testing`);
  if (!c.question) no(`${c.id}: no question`);
}
if (!failures) ok(`${cases.cases.length} cases, all files present, all carry markers and a rationale`);

console.log("\nRecorded results");
const recorded = new Map((results.runs || []).map(r => [r.case, r]));
const missing = cases.cases.filter(c => !recorded.has(c.id));
if (missing.length) missing.forEach(c => no(`${c.id}: declared but never run`));
else ok(`every case has a recorded outcome`);

const orphan = [...recorded.keys()].filter(id => !ids.has(id));
if (orphan.length) orphan.forEach(id => no(`result recorded for unknown case: ${id}`));
else if (recorded.size) ok("no result refers to a case that no longer exists");

console.log("\nOutcomes");
const byVerdict = {};
for (const r of results.runs || []) byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
for (const [v, n] of Object.entries(byVerdict)) console.log(`  ${v.padEnd(18)} ${n}`);
const narrow = (results.runs || []).filter(r => r.verdict === "DIVERGENT_NARROW");
if (narrow.length) {
  console.log(`\n  Narrow passes, which are the ones worth re-reading:`);
  for (const r of narrow) console.log(`    ${r.case}: ${r.note}`);
}
const taught = (results.runs || []).filter(r => r.control_taught_us);
if (taught.length) {
  console.log(`\n  Cases where the CONTROL produced something the corpus lacked:`);
  for (const r of taught) console.log(`    ${r.case}: ${r.control_taught_us}`);
}

console.log(failures ? `\n\x1b[31m${failures} failing\x1b[0m\n` : "\n\x1b[32mHarness consistent.\x1b[0m\n");
process.exit(failures ? 1 : 0);
