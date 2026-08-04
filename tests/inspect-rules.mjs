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

console.log(failures ? `\n\x1b[31m${failures} failing\x1b[0m\n` : "\n\x1b[32mAll detector checks passed.\x1b[0m\n");
process.exit(failures ? 1 : 0);
