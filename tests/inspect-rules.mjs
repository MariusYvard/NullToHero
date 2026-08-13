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

// E3. Une sonde déclare les règles qu'elle décide, la carte dit la même chose, et
// l'une des deux se trompe si elles divergent. Trois blocs quasi identiques
// faisaient ce contrôle, un par famille : ajouter une quatrième famille en
// ajoutait un quatrième, ce qui était le seul endroit du dépôt où l'ajout était en
// O(n) plutôt qu'en O(1). Le garde connaissait les sondes par énumération alors
// qu'il devait les connaître par contrat.
//
// Le contrat est celui-ci : une sonde exporte sa classe de couverture et la liste
// des identifiants qu'elle décide. Une famille de plus est une ligne de plus dans
// PROBES, et le jour où une sonde exporte son propre nom de classe, même cette
// ligne disparaît.
const PROBES = [
  { cls: "rendered-probe", name: "the rendered probe", file: "rendered.mjs", ids: RENDERED_RULE_IDS },
  { cls: "three-probe",    name: "the three.js probe", file: "three.mjs",    ids: THREE_RULE_IDS },
  { cls: "motion-probe",   name: "the motion probe",   file: "motion.mjs",  ids: MOTION_RULE_IDS },
];

// Toute classe de couverture en "-probe" doit avoir son entrée : sans cela, une
// quatrième famille pourrait être déclarée dans la carte et n'être vérifiée par
// personne, ce qui est exactement la défaillance que ce bloc existe pour empêcher.
const probeClasses = new Set([...cov].map(([, c]) => c.cls).filter(c => /-probe$/.test(c)));
const unregistered = [...probeClasses].filter(c => !PROBES.some(p => p.cls === c));
if (unregistered.length) no(`rule-coverage.csv uses probe classes no registered probe declares: ${unregistered.join(", ")}`);
else ok(`${PROBES.length} probe families registered, and the map uses no other`);

for (const probe of PROBES) {
  const mapped = [...cov].filter(([, c]) => c.cls === probe.cls).map(([id]) => id).sort((a, b) => a - b);
  const declared = [...probe.ids].sort((a, b) => a - b);
  if (mapped.join() !== declared.join()) {
    no(`rule-coverage.csv maps ${mapped.join(", ") || "nothing"} to ${probe.name}, ${probe.file} declares ${declared.join(", ")}`);
  } else {
    ok(`${probe.name}: map and probe name the same ${declared.length} rules`);
  }
}

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

// ── P9. The guard checks reachability, not just existence ───────────────────
// rule-coverage.csv declared rules 47 and 58 static-check, and tests counted them
// in "N of M executable", while detect.mjs called runChecks without `js` and made
// them structurally unable to fire. Existence was guarded; reachability was not.
// A caller that drops an input a declared-executable check reads is now a build
// failure, not something a reader has to notice.
console.log("\n── P9: callers pass the inputs their checks read ──");
{
  const { readFileSync: rf, readdirSync: rd, statSync } = await import("node:fs");
  const { join: j, relative } = await import("node:path");
  // The inputs runChecks fans out to the static checks. A call site that omits
  // one of these silences every check that reads it.
  const REQUIRED = ["rawHtml", "css", "js"];
  const walk = (dir, out = []) => {
    for (const e of rd(dir, { withFileTypes: true })) {
      const p = j(dir, e.name);
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      if (e.isDirectory()) walk(p, out);
      else if (/\.(mjs|js)$/.test(e.name)) out.push(p);
    }
    return out;
  };
  const files = [...walk(j(ROOT, "tools")), ...walk(j(ROOT, "skills"))]
    .filter(f => !f.endsWith("checks.mjs") && !f.endsWith("check-review-numbers.mjs"));
  let sites = 0, bad = [];
  for (const f of files) {
    const src = rf(f, "utf8");
    // Each runChecks({...}) call, brace-matched so nested objects do not truncate it.
    let i = 0;
    while ((i = src.indexOf("runChecks({", i)) !== -1 ? src.indexOf("runChecks({", i) : -1, i !== -1) {
      let depth = 0, k = i + "runChecks(".length, end = k;
      for (; k < src.length; k++) {
        if (src[k] === "{") depth++;
        else if (src[k] === "}") { depth--; if (depth === 0) { end = k; break; } }
      }
      const call = src.slice(i, end + 1);
      sites++;
      const missing = REQUIRED.filter(key => !new RegExp(`\\b${key}\\s*[:,}]`).test(call));
      if (missing.length) bad.push(`${relative(ROOT, f)}:${src.slice(0, i).split("\n").length} omits ${missing.join(", ")}`);
      i = end + 1;
    }
  }
  if (sites === 0) no("no runChecks call site found: the guard is looking in the wrong place");
  else console.log(`  \x1b[32mPASS\x1b[0m  ${sites} runChecks call sites inspected`);
  if (bad.length) no(`call sites dropping an input: ${bad.join(" | ")}`);
  else console.log("  \x1b[32mPASS\x1b[0m  every call site passes rawHtml, css and js");
}

// ── P6. The generation corpus and the audit corpus are confronted ───────────
// tools/design-system/data/stacks/threejs.csv serves generation, the registry and
// three.mjs serve the audit, both describe three.js, and nothing compared their
// claims. Until ad23b72 the first pinned r128 and taught outputEncoding while the
// probe flagged any revision below r152 as the old pipeline: the generator was
// producing pages its own auditor reports. The divergence was found by a question
// asked out loud, not by a method. This is the method.
console.log("\n── P6: the three.js corpora agree on what is obsolete ──");
{
  const parseCsv = (text) => {
    const out = []; const lines = text.trim().split(/\r?\n/);
    const head = lines[0].split(",");
    for (const line of lines.slice(1)) {
      const cells = []; let cur = "", q = false;
      for (const ch of line) {
        if (ch === '"') q = !q;
        else if (ch === "," && !q) { cells.push(cur); cur = ""; }
        else cur += ch;
      }
      cells.push(cur);
      out.push(Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""])));
    }
    return out;
  };
  const obsolete = parseCsv(readFileSync(join(ROOT, "tools/data/three-obsolete.csv"), "utf8"));
  ok(`${obsolete.length} obsolete three.js patterns declared`);

  // Every declared pattern must name a rule the registry actually carries.
  const ruleIds = new Set([...known.keys()].map(Number));
  const orphan = obsolete.filter(o => !ruleIds.has(Number(o.rule)));
  if (orphan.length) no(`three-obsolete.csv names rules the registry does not have: ${orphan.map(o => o.rule).join(", ")}`);
  else ok("every obsolete pattern maps to a rule in the registry");

  // The generation corpus must not teach any of them as good code.
  const stack = parseCsv(readFileSync(join(ROOT, "tools/design-system/data/stacks/threejs.csv"), "utf8"));
  const taught = [];
  for (const row of stack) {
    // Les champs prescriptifs seulement. Une Description qui nomme un motif pour
    // dire qu'il est obsolète est exactement ce qu'on veut lire.
    for (const field of ["Code Good", "Do"]) {
      const text = row[field] || "";
      for (const o of obsolete) {
        if (text.includes(o.pattern)) taught.push(`${row.Guideline?.slice(0, 40)} [${field}] teaches ${o.pattern}, removed at ${o.since} (rule ${o.rule}); use ${o.replacement}`);
      }
    }
  }
  if (taught.length) no(`generation corpus teaches what the audit flags: ${taught.join(" | ")}`);
  else ok("no Code Good in the stack corpus teaches a pattern the audit flags");

  // And the probe must still know about them, so the two cannot drift apart by
  // the audit side going quiet.
  const probeSrc = readFileSync(join(ROOT, "tools/inspect/three.mjs"), "utf8");
  const claimed = obsolete.filter(o => o.detected === "yes");
  const unknown = claimed.filter(o => !probeSrc.includes(o.since.replace("r", "")) && !probeSrc.includes(o.pattern));
  if (unknown.length) no(`declared detected but the probe knows nothing about: ${unknown.map(o => o.pattern).join(", ")}`);
  else ok(`the probe carries each of the ${claimed.length} obsolescences declared detected`);
  const undetected = obsolete.filter(o => o.detected !== "yes");
  if (undetected.length) ok(`${undetected.length} declared and not detected, said so in the CSV: ${undetected.map(o => o.pattern).join(", ")}`);
}

console.log(failures ? `\n\x1b[31m${failures} failing\x1b[0m\n` : "\n\x1b[32mAll detector checks passed.\x1b[0m\n");
process.exit(failures ? 1 : 0);
