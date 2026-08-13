#!/usr/bin/env node
// NullToHero :: fixture harness for the deterministic detector
//
// Every rule owes two fixtures: one that must fire and one that must not. This
// runs both directions, because a rule verified only on its positive case is a
// rule that might fire on everything, and a detector that cries wolf gets
// ignored, which is worse than not shipping it.
//
// It also asserts the third property that keeps the engine honest: every
// implemented rule id exists in tools/data/inspect-rules.csv, and carries the
// severity and source the finding will quote. Prose registry and executable
// engine cannot drift while this passes.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RULES, runRules } from "../tools/inspect/rules.mjs";
import { RENDERED_RULE_IDS } from "../tools/inspect/rendered.mjs";
import { THREE_RULE_IDS } from "../tools/inspect/three.mjs";
import { MOTION_RULE_IDS } from "../tools/inspect/motion.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FX = join(ROOT, "tools", "inspect", "fixtures");
let failures = 0;
const ok = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const no = (m) => { failures++; console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); };

// ── registry coupling ────────────────────────────────────────────────────────
const csv = readFileSync(join(ROOT, "tools", "data", "inspect-rules.csv"), "utf8").trim().split("\n");
const known = new Map();
for (const line of csv.slice(1)) {
  const id = Number(line.split(",")[0]);
  if (Number.isFinite(id)) known.set(id, line);
}
console.log("\nRegistry coupling");
for (const r of RULES) {
  if (!known.has(r.id)) no(`rule ${r.id} (${r.name}) is not in inspect-rules.csv`);
}
if (!failures) ok(`${RULES.length} implemented rules all present in the registry of ${known.size}`);

// ── fixtures, both directions ────────────────────────────────────────────────
console.log("\nFixtures");
const pad = (n) => String(n).padStart(2, "0");
for (const r of RULES) {
  for (const kind of ["bad", "good"]) {
    const htmlPath = join(FX, `${pad(r.id)}-${kind}.html`);
    const cssPath = join(FX, `${pad(r.id)}-${kind}.css`);
    const jsPath = join(FX, `${pad(r.id)}-${kind}.js`);
    const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
    const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
    const js = existsSync(jsPath) ? readFileSync(jsPath, "utf8") : "";
    if (!html && !css && !js) { no(`rule ${r.id} (${r.name}): no ${kind} fixture`); continue; }

    const hits = runRules({ html, css, js }).filter(f => f.id === r.id);
    if (kind === "bad" && !hits.length)
      no(`rule ${r.id} (${r.name}): silent on its own bad fixture`);
    else if (kind === "good" && hits.length)
      no(`rule ${r.id} (${r.name}): fires on its clean fixture — ${hits[0].evidence}`);
    else
      ok(`rule ${r.id} ${r.name} ${kind === "bad" ? "fires on the defect" : "stays quiet on the clean case"}`);
  }
}

// ── cross-contamination ──────────────────────────────────────────────────────
// A clean fixture for one rule must not trip a different rule either, otherwise
// a real scan drowns in noise from unrelated checks. Rules whose absence is the
// defect (11, 13, 21) are exempt: a minimal fixture legitimately lacks them.
console.log("\nCross-contamination on clean fixtures");
const ABSENCE_RULES = new Set([11, 13, 21]);
let noise = 0;
for (const r of RULES) {
  const htmlPath = join(FX, `${pad(r.id)}-good.html`);
  const cssPath = join(FX, `${pad(r.id)}-good.css`);
  const jsPath = join(FX, `${pad(r.id)}-good.js`);
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
  const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
  const js = existsSync(jsPath) ? readFileSync(jsPath, "utf8") : "";
  const strays = runRules({ html, css, js })
    .filter(f => f.id !== r.id && !ABSENCE_RULES.has(f.id));
  for (const s of strays) { noise++; no(`rule ${r.id}'s clean fixture trips rule ${s.id}: ${s.evidence}`); }
}
if (!noise) ok("no clean fixture trips an unrelated rule");

// ── coverage map ─────────────────────────────────────────────────────────────
// Every registry rule names its executor, or names why it has none. This exists
// because the v3.0.0 release note published "59 of the 72 remain non-executable"
// and the real figure was 41: eighteen rules were already executing inside
// checks.mjs under a check id, and nothing in the repository tied the two
// together, so nobody could have caught the error by reading. A count that no
// test can contradict is a count that drifts.
console.log("\nCoverage map");
// The classes that do not execute say WHY, which is the point of having more than
// one of them. "judgment" means a human decides case by case. "convention" means
// the answer is a project policy and not a defect. "build-time" means nothing
// observes it on a finished page. "tooling" means something else already does it
// better. A single bucket called "not implemented" would read as a backlog, and
// a backlog invites someone to burn it down with rules that guess.
const CLASSES = new Set([
  "rules-engine", "static-check", "rendered-probe", "three-probe", "motion-probe",
  "needs-render", "judgment", "convention", "build-time", "tooling",
]);
const EXECUTING = ["rules-engine", "static-check", "rendered-probe", "three-probe", "motion-probe"];
const covRaw = readFileSync(join(ROOT, "tools", "data", "rule-coverage.csv"), "utf8").trim().split("\n").slice(1);
const cov = new Map();
for (const line of covRaw) {
  const [id, cls, executor, ...rest] = line.split(",");
  const note = rest.join(",").trim();
  const n = Number(id);
  if (!Number.isFinite(n)) { no(`rule-coverage.csv: unparseable id ${id}`); continue; }
  if (cov.has(n)) no(`rule-coverage.csv: rule ${n} listed twice`);
  if (!CLASSES.has(cls)) no(`rule-coverage.csv: rule ${n} has unknown class "${cls}"`);
  cov.set(n, { cls, executor, note });
}
for (const id of known.keys()) if (!cov.has(id)) no(`rule ${id} is in the registry and absent from rule-coverage.csv`);
for (const id of cov.keys()) if (!known.has(id)) no(`rule-coverage.csv names rule ${id}, which is not in the registry`);

const engineIds = new Set(RULES.map(r => r.id));
for (const [id, c] of cov) {
  if (c.cls === "rules-engine" && !engineIds.has(id)) no(`rule ${id} is mapped to the rules engine and rules.mjs does not implement it`);
  if (c.cls !== "rules-engine" && engineIds.has(id)) no(`rules.mjs implements rule ${id}, which rule-coverage.csv classes as ${c.cls}`);
  if (c.cls === "static-check" && !c.executor) no(`rule ${id} is mapped to a static check and names none`);
  if (!EXECUTING.includes(c.cls) && c.executor)
    no(`rule ${id} is class ${c.cls} and still names an executor`);
  if (!EXECUTING.includes(c.cls) && !c.note)
    no(`rule ${id} is class ${c.cls} and gives no reason, which is the whole point of the class`);
}

// The rendered probe declares which rules it decides. The map and the probe must
// name the same set, or one of them is describing a coverage that does not run.
// The count is not written here: it said five, the probe grew to seven, and the
// comment did not. A number in a comment has nothing holding it.
const mappedRendered = [...cov].filter(([, c]) => c.cls === "rendered-probe").map(([id]) => id).sort((a, b) => a - b);
const declaredRendered = [...RENDERED_RULE_IDS].sort((a, b) => a - b);
if (mappedRendered.join() !== declaredRendered.join())
  no(`rule-coverage.csv maps ${mappedRendered.join(", ") || "nothing"} to the rendered probe, rendered.mjs declares ${declaredRendered.join(", ")}`);

// Same contract for the three.js probe. It is a separate class rather than more
// rendered-probe rows because it needs something the rendered probe does not: an
// init script installed before the page's own three.js evaluates. A rule mapped
// to the wrong one of the two would look covered and never run.
const mappedThree = [...cov].filter(([, c]) => c.cls === "three-probe").map(([id]) => id).sort((a, b) => a - b);
const declaredThree = [...THREE_RULE_IDS].sort((a, b) => a - b);
if (mappedThree.join() !== declaredThree.join())
  no(`rule-coverage.csv maps ${mappedThree.join(", ") || "nothing"} to the three.js probe, three.mjs declares ${declaredThree.join(", ")}`);

// And for the motion probe, which is a third class for a third reason: it needs
// the runner to emulate a media feature, which neither of the other two do.
const mappedMotion = [...cov].filter(([, c]) => c.cls === "motion-probe").map(([id]) => id).sort((a, b) => a - b);
const declaredMotion = [...MOTION_RULE_IDS].sort((a, b) => a - b);
if (mappedMotion.join() !== declaredMotion.join())
  no(`rule-coverage.csv maps ${mappedMotion.join(", ") || "nothing"} to the motion probe, motion.mjs declares ${declaredMotion.join(", ")}`);

// A named check must exist. A mapping to a check that was renamed or deleted is
// the same failure as no mapping at all, only harder to see.
const checksSrc = readFileSync(join(ROOT, "tools", "audit", "lib", "checks.mjs"), "utf8");
for (const [id, c] of cov) {
  if (c.cls !== "static-check") continue;
  if (!new RegExp(`id:\\s*"${c.executor}"`).test(checksSrc)) no(`rule ${id} names static check "${c.executor}", which checks.mjs does not define`);
}

const tally = {};
for (const c of cov.values()) tally[c.cls] = (tally[c.cls] || 0) + 1;
const executable = EXECUTING.reduce((n, c) => n + (tally[c] || 0), 0);
if (!failures) {
  ok(`${cov.size} registry rules mapped: ${tally["rules-engine"]} rules engine, ${tally["static-check"]} static checks, ${tally["rendered-probe"] || 0} rendered probe, ${tally["three-probe"] || 0} three.js probe, ${tally["motion-probe"] || 0} motion probe`);
  ok(`the ${cov.size - executable} that do not execute say why: ` +
     Object.entries(tally).filter(([c]) => !EXECUTING.includes(c)).map(([c, n]) => `${n} ${c}`).join(", "));
  ok(`${executable} of ${cov.size} executable`);
}

console.log(failures ? `\n\x1b[31m${failures} failing\x1b[0m\n` : "\n\x1b[32mAll detector checks passed.\x1b[0m\n");
process.exit(failures ? 1 : 0);
