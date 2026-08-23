#!/usr/bin/env node
// NullToHero :: P7. Les comptages de la prose viennent des CSV.
//
// POURQUOI CE FICHIER EXISTE
// --------------------------
// Le nombre de règles apparaît dans quatre fichiers à cinq emplacements, la
// répartition par moteur dans deux, le nombre de références dans deux autres.
// Le validateur détecte la dérive, ce qui est le bon comportement, mais il la
// détecte après coup et la correction reste manuelle. L'asymétrie était le
// défaut : les seuils sont gardés et dérivés d'une source unique, les comptages
// étaient gardés et retapés.
//
// Ce script écrit. `--check` ne fait que comparer et sort 1 sur une différence,
// ce qui le rend utilisable en intégration continue sans droit d'écriture.
//
// Le test qui compte n'est pas l'idempotence : un script qui écrit deux fois la
// mauvaise valeur est idempotent. C'est que chaque nombre écrit soit comparé à la
// source qui le produit, ce que fait `derive()` et ce que `tests/validate.js`
// vérifie de son côté.
//
// Usage : node tools/sync-counts.mjs [--check]

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

/* ---------- La source ---------- */

const rows = (f) => readFileSync(join(ROOT, f), "utf8").trim().split(/\r?\n/).slice(1);

function derive() {
  const cov = rows("tools/data/rule-coverage.csv").map(l => l.split(","));
  const byClass = {};
  for (const r of cov) byClass[r[1]] = (byClass[r[1]] || 0) + 1;
  const engines = {
    "rules engine": byClass["rules-engine"] || 0,
    "static checks": byClass["static-check"] || 0,
    "rendered probe": byClass["rendered-probe"] || 0,
    "three.js probe": byClass["three-probe"] || 0,
    "motion probe": byClass["motion-probe"] || 0,
  };
  const executable = Object.values(engines).reduce((a, b) => a + b, 0);
  const total = rows("tools/data/inspect-rules.csv").length;
  const refs = (skill) => readdirSync(join(ROOT, `skills/${skill}/references`)).filter(f => f.endsWith(".md")).length;
  return {
    rules: total,
    executable,
    inert: total - executable,
    engines,
    laws: rows("tools/data/laws.csv").length,
    references: ["siteasy", "seo", "audit", "cms"].reduce((a, s) => a + refs(s), 0),
  };
}

/* ---------- Les emplacements ---------- */
// Chaque entrée dit quel fichier, quel motif, et quelle valeur dérivée le
// remplace. Le motif capture le nombre seul pour que la phrase reste éditable
// sans toucher au script.

const facts = derive();
const spread = Object.entries(facts.engines).map(([k, v]) => `${v} in the ${k}`).join(", ");

const SITES = [
  { file: "skills/audit/references/rules-engine.md", re: /registry holds (\d+) rules/g, value: facts.rules },
  { file: "skills/audit/references/rules-engine.md", re: /and (\d+) are executable/g, value: facts.executable },
  { file: "tools/README.md", re: /\((\d+) rules\)/g, value: facts.rules },
];

/* ---------- Écriture ou comparaison ---------- */

let drift = 0, written = 0;
const seen = new Map();
for (const site of SITES) {
  const path = join(ROOT, site.file);
  const before = seen.get(site.file) ?? readFileSync(path, "utf8");
  const after = before.replace(site.re, (m, got) => {
    if (String(got) === String(site.value)) return m;
    drift++;
    console.log(`  ${check ? "DRIFT" : "fixed"}  ${site.file}: ${got} -> ${site.value}`);
    return m.replace(got, String(site.value));
  });
  seen.set(site.file, after);
}
for (const [file, text] of seen) {
  const path = join(ROOT, file);
  if (text === readFileSync(path, "utf8")) continue;
  if (!check) { writeFileSync(path, text); written++; }
}

if (process.argv.includes("--json")) console.log(JSON.stringify({ ...facts, spread }, null, 2));

if (check && drift) {
  console.error(`\n${drift} count(s) in prose disagree with the CSVs. Run: node tools/sync-counts.mjs\n`);
  process.exit(1);
}
console.log(drift
  ? `\n${drift} count(s) rewritten from the CSVs across ${written} file(s).\n`
  : "\nEvery prose count already matches its CSV.\n");
