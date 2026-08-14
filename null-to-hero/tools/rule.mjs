#!/usr/bin/env node
// NullToHero :: E1. Une règle, en entier, en une commande.
//
// POURQUOI CE FICHIER EXISTE
// --------------------------
// La connaissance d'une règle vit dans quatre fichiers de données plus une
// implémentation plus deux fixtures : inspect-rules.csv pour le fond,
// rule-coverage.csv pour l'exécuteur, remediation-map.csv pour la route de
// correction, laws.csv quand un seuil est en jeu. Ce découpage est ce qui rend
// l'ajout d'une règle mécanique, et il faut le garder. Ce qui manquait n'est pas
// une fusion, c'est la vue.
//
// La dispersion a un coût mesuré : c'est elle qui a rendu possible l'écart où le
// registre déclarait les règles 47 et 58 exécutables pendant que l'appelant ne
// leur passait pas ses entrées. Personne ne lisait les trois fichiers ensemble,
// donc personne ne voyait l'incohérence.
//
// Ce script sert aussi de contrôle d'intégrité : une règle dont la ligne manque
// dans l'un des CSV fait sortir 1 avec le nom du fichier incomplet.
//
// Usage :
//   node tools/rule.mjs 47              une règle en entier
//   node tools/rule.mjs 47 --json       la même chose pour un appelant
//   node tools/rule.mjs --audit         toutes les règles, ne signale que les trous

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const auditAll = args.includes("--audit");
const id = args.find(a => /^\d+$/.test(a));

if (!id && !auditAll) {
  console.error("Usage: node tools/rule.mjs <id> [--json]   or   node tools/rule.mjs --audit");
  process.exit(2);
}

/* ---------- lecture des quatre sources ---------- */

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const head = splitLine(lines[0]);
  return lines.slice(1).map(l => Object.fromEntries(splitLine(l).map((c, i) => [head[i] ?? `col${i}`, c])));
}
function splitLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const SOURCES = {
  registry: "tools/data/inspect-rules.csv",
  coverage: "tools/data/rule-coverage.csv",
  remediation: "tools/data/remediation-map.csv",
  laws: "tools/data/laws.csv",
};
const data = Object.fromEntries(Object.entries(SOURCES).map(([k, f]) => [k, parseCsv(readFileSync(join(ROOT, f), "utf8"))]));
const fixtureDir = join(ROOT, "tools/inspect/fixtures");
const fixtures = existsSync(fixtureDir) ? readdirSync(fixtureDir) : [];

/* ---------- assemblage ---------- */

function assemble(ruleId) {
  const n = String(ruleId);
  const registry = data.registry.find(r => r.id === n) || null;
  const coverage = data.coverage.find(r => r.id === n) || null;
  const remediation = data.remediation.find(r => r.id === `rule-${n}`) || null;
  const lawId = registry && /L-[A-Z]+-\d+/.exec(Object.values(registry).join(" "));
  const law = lawId ? data.laws.find(l => l.id === lawId[0]) || null : null;
  // Les fixtures sont numérotées sur deux chiffres pour les règles à un chiffre.
  const mine = fixtures.filter(f => new RegExp(`^0?${n}-(good|bad)\\.`).test(f));
  const holes = [];
  if (!registry) holes.push(SOURCES.registry);
  if (!coverage) holes.push(SOURCES.coverage);
  if (!remediation) holes.push(SOURCES.remediation);
  if (lawId && !law) holes.push(`${SOURCES.laws} (cites ${lawId[0]})`);
  if (registry && mine.length < 2 && coverage && coverage.class === "rules-engine") {
    holes.push(`tools/inspect/fixtures/ (${mine.length} of 2)`);
  }
  return { id: n, registry, coverage, remediation, law, fixtures: mine, holes };
}

/* ---------- sortie ---------- */

const C = { dim: "\x1b[2m", b: "\x1b[1m", r: "\x1b[31m", g: "\x1b[32m", y: "\x1b[33m", off: "\x1b[0m" };
const field = (label, value) => value ? `  ${C.dim}${label.padEnd(12)}${C.off}${value}\n` : "";

function render(v) {
  const r = v.registry;
  if (!r) return `${C.r}Rule ${v.id} is not in ${SOURCES.registry}.${C.off}\n`;
  let out = `\n${C.b}Rule ${v.id}  ${r.rule || r.name || ""}${C.off}\n`;
  out += field("category", `${r.category || "?"}   severity: ${r.severity || "?"}`);
  out += field("do", r.do);
  out += field("don't", r.dont);
  if (r.why) out += field("why", r.why.length > 300 ? r.why.slice(0, 300) + "…" : r.why);
  if (r.source) out += field("source", r.source);

  const cov = v.coverage || {};
  out += `\n${C.dim}  runs${C.off}\n`;
  out += field("class", cov.class || "?");
  out += field("executor", cov.executor || `${C.y}(none: this class does not execute, and says why above)${C.off}`);
  if (cov.note) out += field("note", cov.note);

  out += `\n${C.dim}  fixing it${C.off}\n`;
  const rem = v.remediation || {};
  out += field("command", rem.command || "?");
  out += field("reference", rem.reference || "?");
  if (rem.query) out += field("query", rem.query);

  if (v.law) {
    out += `\n${C.dim}  the number it enforces${C.off}\n`;
    out += field(v.law.id, `${v.law.value}   (anchor: ${v.law.anchor})`);
    out += field("guarded", v.law.guard ? "yes, check 37 refuses a restatement" : `${C.y}no guard: this threshold is qualitative and no regex holds it${C.off}`);
    out += field("source", v.law.source ? `${v.law.source}  (asserted ${v.law.asserted})` : `${C.y}unsourced${C.off}`);
  }

  out += `\n${C.dim}  fixtures${C.off}\n`;
  out += v.fixtures.length
    ? v.fixtures.map(f => `  ${C.dim}            ${C.off}tools/inspect/fixtures/${f}\n`).join("")
    : `  ${C.dim}            ${C.off}${C.y}none${C.off}\n`;

  if (v.holes.length) out += `\n${C.r}  incomplete: no row in ${v.holes.join(", ")}${C.off}\n`;
  return out + "\n";
}

if (auditAll) {
  const all = data.registry.map(r => assemble(r.id)).filter(v => v.holes.length);
  if (asJson) console.log(JSON.stringify(all, null, 2));
  else {
    for (const v of all) console.log(`${C.r}rule ${v.id}${C.off}: missing in ${v.holes.join(", ")}`);
    console.log(all.length
      ? `\n${all.length} rule(s) are described in some sources and not others.\n`
      : `\n${C.g}Every rule has a row in every source it needs.${C.off}\n`);
  }
  process.exit(all.length ? 1 : 0);
}

const view = assemble(id);
if (asJson) console.log(JSON.stringify(view, null, 2));
else process.stdout.write(render(view));
process.exit(view.registry && !view.holes.length ? 0 : 1);
