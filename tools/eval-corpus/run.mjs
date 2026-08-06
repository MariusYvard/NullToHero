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
 * recorded outcome of every draw, including the ones where the two arms tied and
 * the ones where the control produced something the corpus lacked.
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
 * WHAT CHANGED AFTER v3.0.0, AND WHY
 * ----------------------------------
 * The v3.0.0 run had two weaknesses it named in this file and did not fix. Both
 * are now fixed, and fixing them is the reason to re-read the numbers rather than
 * carry the old ones forward.
 *
 *   The judge was the session that made the cuts. It now is not. Each draw is
 *   graded by a separate agent, on a different model from the one that generated
 *   the answers, given the question and the marker list and the two answers as A
 *   and B, in an order it cannot predict and is never told. It does not know that
 *   one answer had a reference file and the other did not, and it is not asked
 *   which one did.
 *
 *   n was 1. n is now 3 per arm per case, drawn independently: each answer comes
 *   from its own agent with its own context, so three draws of the same arm are
 *   three samples and not one sample repeated. Draw i of the corpus arm is paired
 *   with draw i of the control arm, giving three judgments per case. The case
 *   verdict is the majority, and the agreement across the three is recorded, so a
 *   2-1 result cannot be read as a 3-0 one.
 *
 * The verdict is computed here, not quoted from the judge. The judge returns two
 * marker counts and a direction; this file turns those into DIVERGENT,
 * DIVERGENT_NARROW or EQUIVALENT by a fixed rule. A grader that could also name
 * the outcome would be a grader with room to be persuaded by its own conclusion.
 *
 * WHAT THIS HARNESS DOES AND DOES NOT DO
 * --------------------------------------
 * Generation needs a model, so it is not run in CI and never will be: a test
 * that needs a network round trip and an API key is a test that gets disabled.
 * What IS deterministic, and what --check runs, is everything around it: the
 * registry is well formed, every referenced file exists, every case carries
 * markers and a rationale, the recorded results have not gone stale relative to
 * the cases, the judge is declared independent, n clears the floor, every case
 * carries its full set of draws, and every recorded verdict recomputes from its
 * own draws. That guard is the part that rots without help.
 *
 * WHAT IT STILL CANNOT PROVE, stated because a benchmark whose author also writes
 * the thing being benchmarked owes the reader this paragraph:
 *
 *   - Markers are a proxy for reasoning. An answer can hit every marker and still
 *     be bad advice. The markers show the file was consulted, not that it helped.
 *   - The questions are ours. A question written by whoever wrote the file is a
 *     question the file is likely to answer well.
 *   - The markers are ours too, and they were written after reading the file.
 *     Blinding the judge removes the grader's bias, not the designer's.
 *   - n is 3. That is enough to see a split and not enough for a confidence
 *     interval. Three draws agreeing is weak evidence of stability, not proof.
 *   - Thirteen cases against a corpus of 123 files. The first eight were the
 *     contested cuts of v3.0.0, which is the useful bias and still a bias. The
 *     five added on 2026-08-06 deliberately went elsewhere.
 *   - It measures fact transfer well and structure transfer badly, and the second
 *     wave is what showed it. Across those 18 draws the corpus arm was judged to
 *     go further in 17 and carried its own markers in far fewer: 4 of 4 on
 *     hreflang every time, 1 of 4 on geo, 0 of 4 on clarify. A marker that is a
 *     checkable fact (an HTTP status, a code, a canonical rule) reaches a
 *     350-word answer. A marker that is a system (a scoring scheme, a refusal
 *     table, a formula, an ordered set of passes) is paraphrased away. So a low
 *     marker count here means the answer was compressed, not necessarily that
 *     the file failed, and the direction is the more reliable of the two signals.
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

// The floor for repeated sampling. Two draws can only agree or disagree; three is
// the smallest number that carries a majority and can show a split.
const MIN_N = 3;
// SPLIT is a verdict in its own right. Three draws landing on three different
// answers is not a DIVERGENT that happens to be shaky, it is the harness saying
// it does not know, and the n=1 protocol had no way to say that at all.
const VERDICTS = new Set(["DIVERGENT", "DIVERGENT_NARROW", "EQUIVALENT", "SPLIT"]);

// The rule that turns a judge's two counts and one direction into a verdict.
// A function, not a comment, because the summary must not be able to drift from
// the draws it summarises.
export function verdictFromDraw(draw) {
  if (draw.further !== "corpus") return "EQUIVALENT";
  return (draw.markers_corpus - draw.markers_control) >= 2 ? "DIVERGENT" : "DIVERGENT_NARROW";
}

// Strict majority or nothing. With n = 3 that means two draws must agree.
export function summarise(perDraw) {
  const tally = {};
  for (const v of perDraw) tally[v] = (tally[v] || 0) + 1;
  const counts = Object.values(tally).sort((a, b) => b - a);
  const [top, count] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  const verdict = count * 2 > perDraw.length ? top : "SPLIT";
  const agreement = count === perDraw.length ? "unanimous" : counts.join("-");
  return { verdict, agreement };
}

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

// ── pre-registration ─────────────────────────────────────────────────────────
// v3.4.0 recorded a case whose markers no longer described its file and said the
// fix was to declare a new list before the next run. This turns that sentence
// into a check: a marker list that differs from the declared one fails here, so
// tuning a marker to suit a result cannot happen quietly. Its own commit lands
// before the commit carrying the results, and git is the timestamp.
const prePath = join(ROOT, "tools/eval-corpus/preregistration.json");
if (existsSync(prePath)) {
  console.log("\nPre-registered markers");
  const pre = JSON.parse(readFileSync(prePath, "utf8"));
  let drift = 0;
  for (const c of cases.cases) {
    const decl = pre.cases?.[c.id];
    if (!decl) continue;
    const a = JSON.stringify(decl.markers), b = JSON.stringify(c.markers);
    if (a !== b) { drift++; no(`${c.id}: markers differ from the list declared on ${pre.declared}`); }
    if (!decl.prediction) { drift++; no(`${c.id}: declared without a prediction, so nothing can be wrong`); }
  }
  const covered = cases.cases.filter(c => pre.cases?.[c.id]).length;
  if (!drift) ok(`${covered} of ${cases.cases.length} cases carry markers declared on ${pre.declared}, each with a prediction`);
}

console.log("\nRecorded results");
const recorded = new Map((results.runs || []).map(r => [r.case, r]));
const preDecl = existsSync(join(ROOT, "tools/eval-corpus/preregistration.json"))
  ? JSON.parse(readFileSync(join(ROOT, "tools/eval-corpus/preregistration.json"), "utf8")) : null;
const missing = cases.cases.filter(c => !recorded.has(c.id));
// A case that is pre-registered and not yet drawn is the intended state between
// declaring a marker list and spending the draws on it. It is reported and not
// failed, because forbidding it would force the declaration and the result into
// one commit, which is exactly what pre-registration exists to separate.
const awaiting = missing.filter(c => preDecl?.cases?.[c.id]);
const orphaned = missing.filter(c => !preDecl?.cases?.[c.id]);
if (orphaned.length) orphaned.forEach(c => no(`${c.id}: has no result and was never pre-registered`));
if (awaiting.length) console.log(`  \x1b[33mAWAITING\x1b[0m  ${awaiting.length} case(s) declared on ${preDecl.declared} and not yet drawn: ${awaiting.map(c => c.id).join(", ")}`);
if (!missing.length) ok(`every case has a recorded outcome`);
else if (!orphaned.length) ok(`every case that has been drawn has a recorded outcome`);

const orphan = [...recorded.keys()].filter(id => !ids.has(id));
if (orphan.length) orphan.forEach(id => no(`result recorded for unknown case: ${id}`));
else if (recorded.size) ok("no result refers to a case that no longer exists");

// ── the two gates that v3.0.0 could not pass ─────────────────────────────────
console.log("\nJudge independence");
const judge = results.judge;
if (!judge || typeof judge !== "object") {
  no("results.json declares no judge block, so nothing states who graded");
} else {
  if (judge.independent !== true)
    no("the judge is not declared independent, which is the failure v3.0.0 recorded and did not fix");
  else ok(`graded by ${judge.model || "an unnamed model"}, separate from the generating session`);
  if (!judge.blinding) no("no blinding procedure recorded");
  else ok(`blinding: ${judge.blinding}`);
  if (judge.model && results.generator && judge.model === results.generator)
    console.log(`  \x1b[33mNOTE\x1b[0m  judge and generator are the same model (${judge.model}); separate contexts, one model`);
}

console.log("\nRepeated sampling");
const n = results.n;
if (!Number.isInteger(n) || n < MIN_N) no(`n is ${n ?? "undeclared"}, below the floor of ${MIN_N}`);
else ok(`n = ${n} draws per arm per case`);

for (const r of results.runs || []) {
  const c = cases.cases.find(x => x.id === r.case);
  if (!c) continue;
  if (!Array.isArray(r.draws)) { no(`${r.case}: no draws recorded, only a summary`); continue; }
  if (r.draws.length !== n) no(`${r.case}: ${r.draws.length} draws recorded, n declares ${n}`);
  for (const [i, d] of r.draws.entries()) {
    if (!["AB", "BA"].includes(d.order)) no(`${r.case} draw ${i + 1}: no blind order recorded`);
    if (!["corpus", "control", "neither"].includes(d.further)) no(`${r.case} draw ${i + 1}: direction is "${d.further}"`);
    for (const k of ["markers_corpus", "markers_control"]) {
      if (!Number.isInteger(d[k])) { no(`${r.case} draw ${i + 1}: ${k} is not a count`); continue; }
      if (d[k] < 0 || d[k] > c.markers.length)
        no(`${r.case} draw ${i + 1}: ${k} is ${d[k]} against ${c.markers.length} markers`);
    }
  }
  // The summary must recompute. A verdict that is merely asserted is a verdict
  // that survives its own evidence changing underneath it.
  const perDraw = r.draws.map(verdictFromDraw);
  const { verdict, agreement } = summarise(perDraw);
  if (!VERDICTS.has(r.verdict)) no(`${r.case}: verdict "${r.verdict}" is not one of the four`);
  else if (r.verdict !== verdict) no(`${r.case}: recorded ${r.verdict}, its own draws give ${verdict} (${perDraw.join(", ")})`);
  if (r.agreement !== agreement) no(`${r.case}: agreement recorded as "${r.agreement}", draws give "${agreement}"`);
}
if (!failures) ok("every recorded verdict recomputes from its own draws, and every agreement matches");

// The pre-registration is only worth its commit if the prediction is scored.
// A design that is never wrong is a design that predicted nothing.
if (preDecl) {
  const scored = (results.runs || []).filter(r => "prediction_held" in r);
  if (scored.length) {
    const held = scored.filter(r => r.prediction_held === true);
    const failed = scored.filter(r => r.prediction_held === false);
    const partial = scored.filter(r => r.prediction_held === "partial");
    console.log("\nPredictions, declared before the draws");
    console.log(`  ${held.length} held, ${partial.length} partly, ${failed.length} wrong, out of ${scored.length}`);
    for (const r of [...failed, ...partial]) {
      console.log(`    ${r.case} (${r.prediction_held === false ? "wrong" : "partly"}): ${preDecl.cases[r.case].prediction}`);
    }
  }
}

console.log("\nOutcomes");
const byVerdict = {};
for (const r of results.runs || []) byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
for (const [v, k] of Object.entries(byVerdict)) console.log(`  ${v.padEnd(18)} ${k}`);

const split = (results.runs || []).filter(r => r.agreement !== "unanimous");
if (split.length) {
  console.log(`\n  Cases where the draws did not agree, which are the ones worth re-reading:`);
  for (const r of split) console.log(`    ${r.case} (${r.agreement}): ${r.note}`);
}
const narrow = (results.runs || []).filter(r => r.verdict === "DIVERGENT_NARROW");
if (narrow.length) {
  console.log(`\n  Narrow passes:`);
  for (const r of narrow) console.log(`    ${r.case}: ${r.note}`);
}
// A case where the corpus goes further while hitting fewer markers than the
// control is not a contradiction, it is a stale marker list: the file changed and
// the markers still describe the old one. Surfaced as a note and not a failure,
// because the fix is to declare a new list BEFORE the next run and not to edit the
// list after reading the result.
const stale = (results.runs || []).filter(r =>
  (r.draws || []).length &&
  r.draws.every(d => d.further === "corpus" && d.markers_corpus < d.markers_control));
if (stale.length) {
  console.log(`\n  Cases whose markers no longer describe the file:`);
  for (const r of stale) console.log(`    ${r.case}: goes further in every draw and hits fewer of its own markers in every draw`);
}

const taught = (results.runs || []).filter(r => r.control_taught_us);
if (taught.length) {
  console.log(`\n  Cases where the CONTROL produced something the corpus lacked:`);
  for (const r of taught) console.log(`    ${r.case}: ${r.control_taught_us}`);
}

console.log(failures ? `\n\x1b[31m${failures} failing\x1b[0m\n` : "\n\x1b[32mHarness consistent.\x1b[0m\n");
process.exit(failures ? 1 : 0);
