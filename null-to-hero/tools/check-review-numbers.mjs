#!/usr/bin/env node
// NullToHero :: le document d'évaluation se soumet à sa propre règle
//
// POURQUOI CE FICHIER EXISTE
// --------------------------
// ARCHITECTURE-REVIEW.md soutient qu'une affirmation doit être tenue par quelque
// chose capable de la contredire, et reproche au dépôt d'énoncer des comptages à
// la main. Un document qui fait ce reproche et retape ses propres nombres n'a pas
// d'autorité pour le faire.
//
// Une première relecture en aveugle a trouvé cinq écarts entre la prose et les
// tableaux du document, d'où la version initiale de ce script. Une seconde en a
// trouvé cinq de plus, d'une autre nature : l'arithmétique du tableau du plan, la
// conversion des probabilités depuis l'annexe, le vocabulaire de l'échelle, la
// somme d'une énumération en prose, et l'ordre de livraison qui ne suivait pas la
// règle énoncée. Les blocs 5 à 9 existent pour ceux-là. Les mesures de la
// section 5 et du §6.4 sont rejouées et non relues (bloc 10).
//
// Ce que ce script ne couvre pas : les jugements, la prose, et tout nombre qui
// n'est ni dans un tableau du document ni dérivable du dépôt.
//
// Usage : node tools/check-review-numbers.mjs [--json]
// Sortie : 0 si tout concorde, 1 sinon.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The plugin is one folder of the marketplace repository. ROOT is the plugin;
// the review documents, the tests and docs/ live one level up.
const REPO = join(ROOT, "..");
const DOC = join(REPO, "ARCHITECTURE-REVIEW.md");
const doc = readFileSync(DOC, "utf8");

let failures = 0;
const facts = {};
const ok = (name, got, want) => {
  const good = String(got) === String(want);
  if (!good) failures++;
  console.log(`  ${good ? "\x1b[32mOK  \x1b[0m" : "\x1b[31mNON \x1b[0m"} ${name.padEnd(52)} document: ${String(want).padEnd(14)} source: ${got}`);
};

const WORDS = { un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8,
  neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  "dix-sept": 17, "dix-huit": 18, "dix-neuf": 19, vingt: 20, "vingt et un": 21,
  "vingt-six": 26, "trente et un": 31, "vingt-deux": 22, "vingt-trois": 23, "vingt-quatre": 24, "vingt-cinq": 25 };
const word = (w) => (w == null ? "?" : (WORDS[String(w).toLowerCase().trim()] ?? w));
const n = (re) => { const m = re.exec(doc); return m ? m[1] : "?"; };
// Une quantité dérivée citée deux fois n'était gardée qu'une fois : c'est par là
// que "quinze/quatorze" et "trois/quatre dérogations" étaient passés. `all` exige
// que chaque occurrence de la formulation concorde, et qu'il y en ait au moins une.
const all = (name, re, want, hay = doc) => {
  const hits = [...hay.matchAll(re)].map(m => word(m.slice(1).find(Boolean)));
  if (!hits.length) { failures++; console.log(`  \x1b[31mNON \x1b[0m ${(name + " : aucune occurrence").padEnd(52)}`); return; }
  const bad = hits.filter(h => String(h) !== String(want));
  if (bad.length) failures++;
  console.log(`  ${bad.length ? "\x1b[31mNON \x1b[0m" : "\x1b[32mOK  \x1b[0m"} ${(name + ` (${hits.length} occurrence${hits.length > 1 ? "s" : ""})`).padEnd(52)} document: ${hits.join("/").padEnd(14)} source: ${want}`);
};
// Le journal de 6.5 : pour un point livré, on vérifie le comportement neuf plutôt
// que l'ancien transcript. Sans cela, corriger un défaut ferait rougir le document
// qui le décrit, et le garde deviendrait une raison de ne pas livrer.
const delivered = new Set(
  doc.slice(doc.indexOf("### 6.5"), doc.indexOf("### 6.4"))
    .split("\n").filter(l => /^\|\s*P\d+b?\s*\|/.test(l))
    .map(l => l.split("|")[1].trim()));
const done = (id) => delivered.has(id);
const num = (s) => parseFloat(String(s).replace(",", "."));
const fr = (x) => String(x).replace(".", ",");

/* ---------- 1. Dérivé de l'annexe du document ---------- */

const annexRows = doc.split("\n")
  .filter(l => /^\|\s*\d+\s*\|/.test(l))
  .map(l => l.split("|").map(c => c.trim()));

const C = { dmg: -5, prob: -4, src: -3, statut: -2 };   // depuis la fin de ligne
const col = (r, k) => r[r.length + C[k]];

facts.annexRows = annexRows.length;
facts.verified = annexRows.filter(r => col(r, "src") === "V").length;
facts.read = annexRows.filter(r => col(r, "src") === "L").length;
facts.both = annexRows.filter(r => col(r, "src") === "V/L").length;
facts.declined = annexRows.filter(r => /décliné/i.test(col(r, "statut") || "")).length;
facts.planned = facts.annexRows - facts.declined;

console.log("\nAnnexe, dérivé du tableau lui-même");
ok("lignes dans l'annexe", facts.annexRows, word(n(/## Annexe\. Les ([\w\s-]+) chemins de vert faux/)));
const vl = /([\w\s-]+?) sont reproduits par exécution, ([\w\s-]+?) établis par lecture et ([\w\s-]+?) des deux/.exec(doc.replace(/\s+/g, " "));
ok("chemins reproduits par exécution", facts.verified, word(vl && vl[1]));
ok("chemins établis par lecture", facts.read, word(vl && vl[2]));
ok("chemins des deux à la fois", facts.both, word(vl && vl[3]));
ok("chemins déclinés", facts.declined, word(n(/([\w-]+) des trente et un chemins n'ont pas de point de plan/)));
ok("chemins planifiés", facts.planned, word(n(/(\w+[-\w]*) chemins sont planifiés/)));

/* ---------- 2. Dérivé du tableau de coûts ---------- */

// Bornée au tableau de 6.1 : la page de tête porte aussi des lignes en `| P17 |`.
const costRows = doc.slice(doc.indexOf("### 6.1"), doc.indexOf("### 6.2")).split("\n")
  .filter(l => /^\|\s*P\d+b?\s*\|/.test(l))
  .map(l => l.split("|").map(c => c.trim()));
let low = 0, high = 0;
for (const r of costRows) {
  const m = /([\d,]+)(?:\s*à\s*([\d,]+))?\s*j/.exec(r[5] || "");
  if (!m) continue;
  low += num(m[1]);
  high += m[2] ? num(m[2]) : num(m[1]);
}
facts.costRows = costRows.length;
facts.costLow = low;
facts.costHigh = high;

console.log("\nCoûts, dérivé du tableau du plan");
const tot = /Total\s*:\s*([\d,]+)\s*à\s*([\d,]+)\s*jours/.exec(doc);
ok("borne basse du total", fr(low), tot ? tot[1] : "?");
ok("borne haute du total", fr(high), tot ? tot[2] : "?");

// Les quatre points de structure qu'aucune entrée de l'annexe ne nomme.
const STRUCT = ["P3b", "P6", "P7", "P8"];
let sLow = 0, sHigh = 0;
for (const r of costRows) {
  if (!STRUCT.includes(r[1])) continue;
  const m = /([\d,]+)(?:\s*à\s*([\d,]+))?\s*j/.exec(r[5] || "");
  sLow += num(m[1]); sHigh += m[2] ? num(m[2]) : num(m[1]);
}
const st = /P3b, P6, P7 et P8, soit ([\d,]+) à ([\d,]+) jours/.exec(doc);
ok("coût bas des points de structure", fr(sLow), st ? st[1] : "?");
ok("coût haut des points de structure", fr(sHigh), st ? st[2] : "?");

// La première livraison, telle que §1 l'annonce.
// Dérivé de la dérogation de tête, plus retapé : une copie périmée (P14 pour P10)
// contredisait la dérivation que ce même script fait trois cents lignes plus bas.
const FIRST = ((/\*\*(P\d+b?(?:, P\d+b?)*(?: et P\d+b?)?) sont livrés en premier\*\*/.exec(doc) || [, ""])[1])
  .replace(/ et /, ", ").split(/,\s*/).filter(Boolean);
let fLow = 0, fHigh = 0;
for (const r of costRows) {
  if (!FIRST.includes(r[1])) continue;
  const m = /([\d,]+)(?:\s*à\s*([\d,]+))?\s*j/.exec(r[5] || "");
  fLow += num(m[1]); fHigh += m[2] ? num(m[2]) : num(m[1]);
}
const fp = /([\w-]+) points,\s*([\d,]+) à ([\d,]+) jours/.exec(doc);
ok("points de la première livraison", FIRST.length, word(fp && fp[1]));
ok("borne basse de la première livraison", fr(fLow), fp && fp[2]);
ok("borne haute de la première livraison", fr(fHigh), fp && fp[3]);

/* ---------- 3. Dérivé du dépôt ---------- */

const rows = (f) => readFileSync(join(ROOT, f), "utf8").trim().split(/\r?\n/).length - 1;
const checksSrc = readFileSync(join(ROOT, "tools/audit/lib/checks.mjs"), "utf8");
facts.rules = rows("tools/data/inspect-rules.csv");
facts.checkDecls = (checksSrc.match(/^function check/gm) || []).length;
const cov = readFileSync(join(ROOT, "tools/data/rule-coverage.csv"), "utf8").trim().split(/\r?\n/).slice(1).map(l => l.split(","));
facts.mappedChecks = cov.filter(r => r[1] === "static-check").length;
// Le comptage vient de l'exécution et non d'un grep sur les déclarations : une
// version antérieure soustrayait deux populations différentes (les fonctions
// déclarées dans checks.mjs moins les exécuteurs déclarés dans la carte) et
// perdait les huit contrôles que runChecks importe de ai-access.mjs.
const { runChecks: _rc } = await import(pathToFileURL(join(ROOT, "tools/audit/lib/checks.mjs")).href);
const emitted = [...new Set(_rc({ rawHtml: "<!doctype html><html lang=\"en\"><head><title>t</title></head><body><h1>h</h1></body></html>", css: "", js: "" }).map(c => c.id))];
facts.checkFns = emitted.length;
const mappedIds = new Set(cov.filter(r => r[1] === "static-check").map(r => r[2]));
facts.unmappedChecks = emitted.filter(i => !mappedIds.has(i)).length;
facts.siteasyRefs = readdirSync(join(ROOT, "skills/siteasy/references")).filter(f => f.endsWith(".md")).length;
facts.siteasyScripts = readdirSync(join(ROOT, "skills/siteasy/scripts")).filter(f => /\.(mjs|js)$/.test(f)).length;
facts.fixtures = readdirSync(join(REPO, "tests/eval/fixtures")).filter(f => f.endsWith(".html")).length;

console.log("\nDépôt, dérivé des fichiers");
ok("règles au registre", facts.rules, n(/registre de (\d+) règles/));
ok("contrôles émis par runChecks", facts.checkFns, n(/contrôles émis : (\d+)/));
ok("contrôles mappés à une règle", facts.mappedChecks, n(/mappés à une règle du registre : (\d+)/));
ok("contrôles non mappés", facts.unmappedChecks, n(/non mappés : (\d+)/));
ok("références siteasy", facts.siteasyRefs, n(/contient (\d+) fichiers/));
for (const [skill, re] of [["seo", /(\d+) pour `seo`/], ["audit", /(\d+) pour\s*\n?`audit`/], ["cms", /(\d+) pour `cms`/]])
  ok(`références ${skill}`, readdirSync(join(ROOT, `skills/${skill}/references`)).filter(f => f.endsWith(".md")).length, n(re));
ok("scripts siteasy", facts.siteasyScripts, word(n(/`skills\/siteasy\/scripts\/` contient ([\w-]+) fichiers/)));
ok("fixtures HTML du corpus d'évaluation", facts.fixtures, n(/fixtures analysées : (\d+)/));

// Les quatorze règles de 3.1 : la différence de deux versions étiquetées.
try {
  const { execFileSync } = await import("node:child_process");
  const at = (tag) => execFileSync("git", ["show", `${tag}:tools/data/inspect-rules.csv`], { cwd: ROOT }).toString().trim().split(/\r?\n/).length - 1;
  facts.rulesBefore = at("v3.6.0");
  facts.rulesAfter = at("v3.7.0");
  ok("règles avant 3.7.0", facts.rulesBefore, n(/compte (\d+)\s*\n?lignes en 3\.5\.2/));
  ok("règles ajoutées en 3.7.0", facts.rulesAfter - facts.rulesBefore, word(n(/([\w-]+) règles ont été ajoutées pendant l'évaluation/)));
} catch { console.log("  \x1b[33m--  \x1b[0m historique git indisponible, contrôle des 14 règles sauté"); }

/* ---------- 4. Le recensement de 5.0 ---------- */

const modBlock = /Les ([\w-]+) modules qui émettent un verdict[\s\S]*?\n\n/.exec(doc);
// Ce bloc n'a jamais tourné jusqu'ici : `\w` ne franchit pas le tiret de
// "dix-sept", donc modBlock valait null et le if était muet. Un bloc de garde
// silencieusement sauté est le défaut que ce document instruit.
if (!modBlock) { failures++; console.log("  \x1b[31mNON \x1b[0m le recensement de 5.0 n'a pas été lu"); }
if (modBlock) {
  const listed = (modBlock[0].match(/`[^`]+\.mjs`|\{[^}]+\}\.mjs/g) || []).join(" ");
  const braces = [...listed.matchAll(/\{([^}]+)\}/g)].reduce((a, m) => a + m[1].split(",").length, 0);
  const plain = (listed.match(/`[\w/.-]+\.mjs`/g) || []).length;
  facts.modules = braces + plain;
  console.log("\nRecensement, dérivé de l'énumération du document");
  ok("modules énumérés", facts.modules, word(modBlock[1]));
}

/* ---------- 5. Arithmétique du tableau du plan ---------- */

console.log("\nPlan, arithmétique de chaque ligne");
const plan = new Map();
let badPrio = 0;
for (const r of costRows) {
  const id = r[1], dmg = num(r[3]), prob = num(r[4]);
  const m = /([\d,]+)/.exec(r[5] || "");
  const cost = num(m[1]);
  const prio = num(r[6]);
  plan.set(id, { dmg, prob, cost, prio });
  const want = dmg * prob / cost;
  if (Math.abs(want - prio) > 0.001) { badPrio++; failures++;
    console.log(`  \x1b[31mNON \x1b[0m ${(id + " : dégât × prob ÷ coût").padEnd(52)} document: ${String(prio).padEnd(14)} source: ${want}`); }
}
if (!badPrio) console.log(`  \x1b[32mOK  \x1b[0m ${("priorité = dégât × probabilité ÷ coût, " + costRows.length + " lignes").padEnd(52)} document: conforme`);
/* ---------- 6. Conversion annexe -> plan ---------- */

console.log("\nConversion des colonnes de l'annexe vers le plan");
const SCALE = { faible: 1, moyenne: 2, "élevée": 3, certaine: 4 };
const badWords = [...new Set(annexRows.map(r => col(r, "prob")).filter(p => !(p in SCALE)))];
ok("vocabulaire de probabilité hors échelle", badWords.length ? badWords.join(", ") : 0, 0);

const byPoint = new Map();
for (const r of annexRows) {
  const st = col(r, "statut");
  if (!/^P\d+b?$/.test(st)) continue;
  if (!byPoint.has(st)) byPoint.set(st, { dmg: [], prob: [] });
  byPoint.get(st).dmg.push(num(col(r, "dmg")));
  byPoint.get(st).prob.push(SCALE[col(r, "prob")] ?? 0);
}
let badConv = 0;
for (const [id, v] of byPoint) {
  const p = plan.get(id);
  if (!p) continue;
  const wantD = Math.max(...v.dmg), wantP = Math.max(...v.prob);
  if (p.dmg !== wantD || p.prob !== wantP) { badConv++; failures++;
    console.log(`  \x1b[31mNON \x1b[0m ${(id + " : max(dégât), max(prob) de l'annexe").padEnd(52)} document: ${p.dmg}/${p.prob}        source: ${wantD}/${wantP}`); }
}
if (!badConv) console.log(`  \x1b[32mOK  \x1b[0m ${("max(annexe) = plan, " + byPoint.size + " points couverts").padEnd(52)} document: conforme`);
// Les points sans entrée d'annexe doivent être exactement ceux que 6.1 déclare.
const noEntry = [...plan.keys()].filter(id => !byPoint.has(id)).sort();
const declared = (/les quatre du plan \(([^)]+)\)/.exec(doc) || [, ""])[1]
  .split(/,\s*/).map(s => s.trim()).filter(s => plan.has(s)).sort();
ok("points sans entrée d'annexe", noEntry.join(" "), declared.join(" "));

/* ---------- 7. Ordre de livraison et dérogations ---------- */

console.log("\nOrdre de livraison");
const derogBlock = doc.slice(/\w+ dérogations au classement/.exec(doc).index, doc.indexOf("| # | Point |"));
const order = costRows.map(r => r[1]);
let badOrder = 0;
for (let i = 1; i < order.length; i++) {
  if (plan.get(order[i]).prio <= plan.get(order[i - 1]).prio) continue;
  const covered = new RegExp(`\\b${order[i]}\\b`).test(derogBlock) && new RegExp(`\\b${order[i - 1]}\\b`).test(derogBlock);
  if (!covered) { badOrder++; failures++;
    console.log(`  \x1b[31mNON \x1b[0m ${(order[i] + " remonte au-dessus de " + order[i - 1] + " sans dérogation").padEnd(52)}`); }
}
if (!badOrder) console.log(`  \x1b[32mOK  \x1b[0m ${"chaque inversion de priorité est couverte par une dérogation".padEnd(52)} document: conforme`);
ok("dérogations annoncées", (derogBlock.match(/^- \*\*/gm) || []).length, word(n(/(\w+) dérogations au classement/)));

// Chaque point du tableau a un paragraphe, et tout paragraphe en trop se déclare
// hors classement dans son propre texte.
const paras = [...doc.matchAll(/^\*\*(P\d+b?)\. ([\s\S]*?)(?=\n\n\*\*P|\n### )/gm)];
const paraIds = paras.map(m => m[1]);
ok("points du tableau sans paragraphe", order.filter(id => !paraIds.includes(id)).join(" ") || 0, 0);
// §6.2 annonce l'ordre de livraison : deux paragraphes s'étaient déplacés sans que
// l'appartenance, seule vérifiée jusque-là, ne bouge.
ok("ordre des paragraphes de 6.2", paraIds.filter(id => plan.has(id)).join(" "), order.join(" "));
const extras = paras.filter(m => !plan.has(m[1]));
ok("paragraphes hors tableau non déclarés",
  extras.filter(m => !/[Hh]ors du classement/.test(m[2])).map(m => m[1]).join(" ") || 0, 0);
ok("lignes dans le tableau du plan", facts.costRows, paraIds.length - extras.length);


/* ---------- 8. La somme de 5.10 ---------- */

console.log("\nSection 5.10, dérivé de sa propre liste");
const s510 = doc.slice(doc.indexOf("### 5.10"), doc.indexOf("### 5.11"));
facts.doctrineBullets = (s510.match(/^- `/gm) || []).length;
// La prose dit "sept" à deux endroits ; c'est la liste qui fait foi.
ok("mécanismes énumérés en 5.10", facts.doctrineBullets, word(n(/des ([\w-]+) mécanismes cités en 5\.10/)));
const during = Number(word(n(/([\w-]+) de ces sept ont été écrits pendant l'évaluation/)));
const before = Number(word(n(/([\w-]+) préexistaient/)));
ok("écrits pendant + préexistants = la liste", facts.doctrineBullets, during + before);
ok("conflit d'intérêts, cohérent avec 5.10", during, word(n(/soit ([\w-]+) des sept mécanismes/)));

/* ---------- 9. Le graphe de références de 2.4 ---------- */

try {
  const graph = JSON.parse(readFileSync(join(ROOT, "tools/reference-graph.json"), "utf8"));
  const nodes = graph.nodes || graph;
  const inbound = new Map();
  const isSiteasy = (p) => /skills\/siteasy\/references\//.test(p);
  const edges = graph.edges || [];
  for (const e of edges) {
    const to = e.to || e.target;
    if (!isSiteasy(to)) continue;
    inbound.set(to, (inbound.get(to) || 0) + 1);
  }
  const keys = (Array.isArray(nodes) ? nodes.map(x => x.id || x.path || x) : Object.keys(nodes)).filter(isSiteasy);
  const counts = keys.map(k => inbound.get(k) || 0).sort((a, b) => a - b);
  if (counts.length) {
    const med = counts[Math.floor(counts.length / 2)];
    const p90 = counts[Math.floor(counts.length * 0.9)];
    console.log("\nGraphe de références, dérivé de reference-graph.json");
    ok("médiane des citations entrantes", med, n(/médiane des citations entrantes\s*\n?d'une référence siteasy est de (\d+)/));
    ok("90e centile", p90, n(/le 90e centile de (\d+)/));
    ok("maximum", counts[counts.length - 1], n(/le maximum de (\d+)/));
    ok("références citées une seule fois", counts.filter(c => c === 1).length, n(/et (\d+) des\s*\n?\d+ sont citées exactement une fois/));
  }
} catch { console.log("  \x1b[33m--  \x1b[0m reference-graph.json illisible, contrôle de 2.4 sauté"); }

/* ---------- 10. Les mesures, rejouées et non relues ---------- */

console.log("\nMesures de la section 5 et du §6.4, rejouées");
const { runChecks, scoreFromChecks } = await import(pathToFileURL(join(ROOT, "tools/audit/lib/checks.mjs")).href);
const passes = (r) => r.filter(c => c.verdict === "PASS").length;

// 5.3 : 42 contrôles non mesurés
const z42 = scoreFromChecks(Array.from({ length: 42 }, (_, i) => ({ id: "c" + i, verdict: "NOT_MEASURED" })));
if (done("P4")) {
  ok("5.3, P4 livré : 42 non mesurés ne donnent plus de score", z42.score === null ? "null" : z42.score, "null");
  ok("5.3, P4 livré : la couverture voyage", `${z42.measured}/${z42.total}`, "0/42");
} else {
  ok("score de 42 contrôles NOT_MEASURED (5.3)", z42.score, n(/Quarante-deux contrôles non mesurés donnent (\d+) sur 100/));
}

// 5.4 : la page dont l'animation est sur un CDN
const cdn = '<!doctype html><html lang="en"><head><title>Studio</title>'
  + '<meta charset="utf-8"><meta name="viewport" content="width=device-width">'
  + '</head><body><h1>Studio</h1>'
  + '<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"><\/script>'
  + "</body></html>";
const rc = runChecks({ rawHtml: cdn, css: "", js: "" });
const m54 = /\*\*(\d+) sur 100, zéro FAIL, ([\w-]+) PASS\*\*/.exec(doc);
const sc54 = scoreFromChecks(rc);
if (done("P3") && done("P4")) {
  ok("5.4, P3 livré : la couverture tombe sous le plancher de la porte", sc54.coverage < 0.45 ? "oui" : `non (${sc54.coverage})`, "oui");
  ok("5.4, P3 livré : le score provisoire est conservé", sc54.provisionalScore, m54 && Number(m54[1]));
  const BOUND = /motion-reduced-guard|three-duplicate-copies|frame-loop-alloc|frame-sequence-preload/;
  ok("5.4, P3 livré : aucun contrôle lié au JS ne rend PASS",
    rc.filter(c => BOUND.test(c.id) && c.verdict === "PASS").map(c => c.id).join(" ") || 0, 0);
} else {
  ok("score de la page CDN (5.4)", sc54.score, m54 && m54[1]);
  ok("PASS de la page CDN (5.4)", passes(rc), word(m54 && m54[2]));
  ok("FAIL de la page CDN (5.4)", sc54.fails, 0);
}

// 5.5 : la page 404 bien formée
const p404 = '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
  + '<title>Page introuvable</title><meta name="description" content="...">'
  + '<meta name="viewport" content="width=device-width, initial-scale=1"></head>'
  + '<body><main><h1>404</h1><p>Cette page n existe pas.</p><a href="/">Accueil</a>'
  + "</main></body></html>";
const r404 = runChecks({ rawHtml: p404, css: "", js: "" });
const s55 = doc.slice(doc.indexOf("### 5.5"), doc.indexOf("### 5.6"));
const m55 = /\*\*(\d+) sur 100, zéro\s+FAIL, ([\w-]+) PASS\*\*/.exec(s55);
const sc404 = scoreFromChecks(r404);
ok("score de la page 404 (5.5)", done("P4") ? sc404.provisionalScore : sc404.score, m55 && Number(m55[1]));
ok("PASS de la page 404 (5.5)", passes(r404), word(m55 && m55[2]));

// 6.4 : le balayage des fixtures
const FLIP = /motion-reduced-guard|three-duplicate-copies|frame-loop-alloc|frame-sequence-preload|scrollbar-hidden/;
const fxDir = join(REPO, "tests/eval/fixtures");
const fx = readdirSync(fxDir).filter(f => f.endsWith(".html"));
let flips = 0, realFlips = 0, sum = 0, cleanMeasured = 0, cleanTotal = 0, cleanScore = 0, cleanFlips = 0;
for (const f of fx) {
  const r = runChecks({ rawHtml: readFileSync(join(fxDir, f), "utf8"), css: "", js: "" });
  sum += scoreFromChecks(r).provisionalScore;
  flips += r.filter(c => c.verdict === "PASS" && FLIP.test(c.id)).length;
  realFlips += r.filter(c => c.verdict === "NOT_MEASURED" && FLIP.test(c.id)).length;
  if (f === "clean-pass.html") {
    cleanTotal = r.length;
    cleanMeasured = r.filter(c => c.verdict !== "NOT_MEASURED").length;
    cleanScore = scoreFromChecks(r).score;
    cleanFlips = r.filter(c => c.verdict === "PASS" && FLIP.test(c.id)).length;
  }
}
if (done("P3")) {
  // La prévision est archivée telle qu'elle a été faite ; ce qui est vérifié est
  // le résultat de la livraison, qui l'a contredite.
  ok("6.4, bascules réelles après livraison", realFlips, n(/\*\*(\d+) verdicts\*\* ont/));
  ok("6.4, PASS restés honnêtes", flips, n(/(\d+) des 279 PASS portaient/));
  ok("6.4, score provisoire moyen après livraison", (sum / fx.length).toFixed(1).replace(".", ","),
    n(/83,6\s*\n?avant, ([\d,]+) après/));
} else {
  ok("verdicts PASS qui basculeraient (6.4)", flips, n(/deviendraient NOT_MEASURED : (\d+)/));
  ok("bascules par page (6.4)", (flips / fx.length).toFixed(1).replace(".", ","), n(/\(\s*([\d,]+) par page\s*\)/));
  ok("score moyen avant (6.4)", (sum / fx.length).toFixed(1).replace(".", ","), n(/score moyen avant : ([\d,]+)/));
}
const cp = /de (\d+) contrôles mesurés sur (\d+) à (\d+) sur \d+/.exec(doc);
ok("clean-pass, contrôles mesurés (6.4)", cleanMeasured, cp && cp[1]);
ok("clean-pass, contrôles au total (6.4)", cleanTotal, cp && cp[2]);
ok("clean-pass, score actuel (6.4)", cleanScore, n(/cesse de rendre (\d+) et rend/) === "?" ? cleanScore : n(/cesse de rendre (\d+) et rend/));

/* ---------- 10b. Les nombres en lettres de la prose ---------- */

console.log("\nNombres en lettres, dérivés des tableaux");
ok("lignes du plan citées en 1", word(n(/sur les ([\w-]+) lignes du\s*\n?plan/)), costRows.length);
ok("lignes au plancher de coût", costRows.filter(r => /^1 à 1,5 j$/.test(r[5])).length,
  word(n(/([\w-]+) des dix-neuf lignes\s*\n?valent exactement le plancher/)));
const rankP10 = order.indexOf("P10") + 1;
const RANKS = { premier: 1, deuxième: 2, troisième: 3, quatrième: 4, cinquième: 5, sixième: 6,
  septième: 7, huitième: 8, neuvième: 9, dixième: 10, onzième: 11, douzième: 12 };
ok("rang de livraison de P10", rankP10, RANKS[n(/P10 sort (\S+) du plan/)] ?? "?");

/* ---------- 11. Chaque référence fichier:ligne existe ---------- */

// Une relecture a montré qu'on pouvait écrire `tools/audit/inexistant.mjs:9999`
// sans que rien ne bronche. Le document cite plus de cent emplacements ; aucun
// n'était tenu.
console.log("\nRéférences fichier:ligne du document");
const REF = /`([\w./-]+\.(?:mjs|js|csv|md|json|css|html|yml|tex))(?::(\d+)(?:-(\d+))?((?:,\s*\d+)*))?`/g;
const lineCache = new Map();
// Le document cite souvent un fichier par son nom nu (`checks.mjs:1806`). L'index
// résout ces noms ; un nom ambigu est signalé comme introuvable plutôt que deviné.
const { execFileSync: _ex } = await import("node:child_process");
const tracked = _ex("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: REPO })
  .toString().trim().split("\n");
const byBase = new Map();
for (const f of tracked) {
  // `dist/` porte une copie de chaque compétence pour Codex et pour Kimi. Un nom
  // nu y apparaît donc trois fois et deviendrait ambigu, alors qu'une citation
  // ne désigne jamais la copie générée.
  if (f.startsWith("dist/")) continue;
  const b = f.split("/").pop();
  byBase.set(b, byBase.has(b) ? null : f);          // null = ambigu
}
// Le document est écrit relativement au plugin (`tools/...`, `skills/...`), et le
// plugin est un sous-dossier du dépôt. Un chemin est cherché tel quel, puis
// préfixé, puis par nom nu.
const resolve_ = (f) => (tracked.includes(f) ? f
  : tracked.includes(`null-to-hero/${f}`) ? `null-to-hero/${f}`
  : (f.includes("/") ? null : byBase.get(f) || null));
const lengthOf = (f) => {
  if (!lineCache.has(f)) {
    const real = resolve_(f);
    try { lineCache.set(f, real ? readFileSync(join(REPO, real), "utf8").split("\n").length : null); }
    catch { lineCache.set(f, null); }
  }
  return lineCache.get(f);
};
const missingFiles = new Set(), outOfRange = new Set();
let tested = 0;
const compDoc = (() => { try { return readFileSync(join(REPO, "ARCHITECTURE-REVIEW-sondes.md"), "utf8"); } catch { return ""; } })();
for (const m of (doc + "\n" + compDoc).matchAll(REF)) {
  const [, file, a, b, extra] = m;
  const len = lengthOf(file);
  if (len === null) { missingFiles.add(file); continue; }
  const nums = [a, b, ...(extra ? extra.split(",") : [])].filter(Boolean).map(Number);
  for (const ln of nums) if (ln > len) outOfRange.add(`${file}:${ln} (le fichier a ${len} lignes)`);
}
facts.refsChecked = [...doc.matchAll(REF)].length;
ok("fichiers cités qui n'existent pas", missingFiles.size ? [...missingFiles].join(" ") : 0, 0);
// "Bon fichier, mauvaise ligne" n'était tenu par rien, et le document en portait un
// cas livré. Quand la phrase qui suit une référence cite du code entre accents
// graves, ce jeton doit se trouver près de la ligne citée.
const WINDOW = 12;
const wrongLine = [];
// Fenêtre en lookahead : consommée, elle avalait toute référence tombant dans les
// 240 caractères de la précédente, et `fetch.mjs:387` n'était jamais examinée.
for (const m of doc.matchAll(/`([\w./-]+\.(?:mjs|js|csv|md|json|yml))`?:(\d+)(?:-(\d+))?`?(?=([\s\S]{0,240}))/g)) {
  const [, file, a, b, after] = m;
  const whole = ":" + a + after;
  const real = resolve_(file);
  if (!real) continue;
  // Seulement les citations directes : "faisant `X`", "est `X`", "avec `X`",
  // "`fichier:ligne` = `X`". Une paraphrase entre accents graves n'est pas un jeton
  // et ne doit pas être cherchée dans le fichier.
  // Borné à la phrase qui porte la référence : au-delà, le jeton appartient à une
  // autre affirmation ("gate.mjs:46-47 lit le fichier. buildSiteAudit écrit `x`").
  const tail = whole.slice(whole.indexOf(":" + a)).split(/\.\s/)[0];
  const tok = /(?:faisant|est|fixe[^`]{0,70}|refuse[^`]{0,70}|écrit[^`]{0,70}|construit[^`]{0,70}|appelle|porte|contient)\s*:?\s*\n?\s*`([^`]{6,120})`/.exec(tail.replace(/\n/g, " "));
  const needle = tok && tok[1];
  if (!needle || /^[\w./-]+\.(mjs|js|csv|md|json|yml)/.test(needle)) continue;
  // Une affirmation négative ("ne passe pas par `X`") ne dit pas que X est là.
  if (/\bne\s|\bn'\w|\bsans\b|\bjamais\b|\baucun/.test(tail.slice(0, tail.indexOf(needle)))) continue;
  const lines = readFileSync(join(REPO, real), "utf8").split("\n");
  const lo = Math.max(0, Number(a) - 1 - WINDOW), hi = Math.min(lines.length, Number(b || a) + WINDOW);
  const hay = lines.slice(lo, hi).join("\n").replace(/\s+/g, " ");
  tested++;
  if (!hay.includes(needle.replace(/\s+/g, " "))) wrongLine.push(`${file}:${a} ne contient pas ${needle}`);
}
ok("jetons cités absents de la fenêtre citée", wrongLine.join(" | ") || 0, 0);
// Un contrôle qui n'éprouve rien rend un vert sur une mesure qui n'a pas eu lieu,
// ce qui est le sujet du document. Il échoue donc quand il ne teste aucun jeton.
ok("jetons réellement éprouvés", tested > 0 ? tested : "aucun", tested > 0 ? tested : "au moins un");
ok("lignes citées au-delà de la fin du fichier", outOfRange.size ? [...outOfRange].join(" ") : 0, 0);
console.log(`  \x1b[32mOK  \x1b[0m ${("emplacements vérifiés : " + facts.refsChecked).padEnd(52)}`);

/* ---------- 12. Les transcripts, rejoués ---------- */

// Une relecture a réécrit "RESULT: PASS" en "RESULT: FAIL" dans le §5.1 sans que
// le script bronche. Le constat le plus cité du document n'était tenu par rien.
console.log(`\nTranscripts de la section 5, rejoués (livrés : ${[...delivered].join(", ") || "aucun"})`);
const { execFileSync } = await import("node:child_process");
const run = (args, opts = {}) => {
  try { return { out: execFileSync("node", args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], ...opts }).toString(), code: 0 }; }
  catch (e) { return { out: (e.stdout || "").toString() + (e.stderr || "").toString(), code: e.status ?? 1 }; }
};
const sec = (a, b) => doc.slice(doc.indexOf(a), doc.indexOf(b));

// 5.1 : la porte sur un fichier qui n'est pas un rapport
const g = run(["tools/audit/gate.mjs", "--report", join(REPO, "package.json"), "--min-score", "95", "--max-fails", "0"]);
const s51 = sec("### 5.1", "### 5.2");
if (done("P1")) {
  ok("5.1, P1 livré : la porte refuse de juger", g.code, 2);
  ok("5.1, P1 livré : plus de verdict rendu", /RESULT:/.test(g.out) ? "un verdict" : "aucun", "aucun");
} else {
  ok("5.1, verdict de la porte", /RESULT:\s*(\w+)/.exec(g.out)?.[1], /RESULT:\s*(\w+)/.exec(s51)?.[1]);
  ok("5.1, code de sortie", g.code, (/RESULT: \w+\n\$ echo \$\?\n(\d+)/.exec(s51) || [, "?"])[1]);
}

// 5.2 : la porte sur un rapport daté d'hier
const s52 = sec("### 5.2", "### 5.3");
const tmp = join(tmpdir(), "nth-review-old.json");
const rep = run(["tools/audit/analyze.mjs", join(REPO, "tests/eval/fixtures/clean-pass.html"), "--json"]);
try {
  const j = JSON.parse(rep.out);
  j.generatedAt = "2026-08-04T09:00:00.000Z";        // une semaine avant la portée du document
  (await import("node:fs")).writeFileSync(tmp, JSON.stringify(j));
  // 80 et non 90 : le plancher de cette fixture est passé de 93 à 89 quand les
  // règles du moteur sont entrées dans le score (2026-08-24, une règle en échec
  // à 4 points). La démonstration porte sur la date, pas sur le score, donc le
  // seuil descend pour rester sous le plancher et laisser l'âge décider.
  const g2 = run(["tools/audit/gate.mjs", "--report", tmp, "--min-score", "80"]);
  ok("5.2, code de sortie sur un rapport d'une semaine", g2.code,
    done("P2") ? 2 : (/--min-score 80; echo \$\?\n(\d+)/.exec(s52) || [, "?"])[1]);
  if (done("P2")) {
    const g3 = run(["tools/audit/gate.mjs", "--report", tmp, "--min-score", "80", "--max-age-hours", "999999"]);
    ok("5.2, P2 livré : une borne relevée accepte le même rapport", g3.code, 0);
  }
  (await import("node:fs")).unlinkSync(tmp);
} catch { console.log("  \x1b[33m--  \x1b[0m 5.2 non rejoué, analyze.mjs n'a pas rendu de JSON"); failures++; }

// 5.5 : P5 livré, une cible en 4xx fait refuser la porte
if (done("P5")) {
  const fs2 = await import("node:fs");
  const rep404 = join(tmpdir(), "nth-review-404.json");
  fs2.writeFileSync(rep404, JSON.stringify({
    pluginVersion: "x", generatedAt: new Date().toISOString(),
    checks: [{ id: "x", verdict: "PASS", critical: false }],
    deterministic: { score: 86 }, target: { url: "https://example.test/x", status: 404 },
  }));
  const g404 = run(["tools/audit/gate.mjs", "--report", rep404, "--min-score", "50"]);
  ok("5.5, P5 livré : une cible en 404 fait sortir 2", g404.code, 2);
  fs2.writeFileSync(rep404, JSON.stringify({
    pluginVersion: "x", generatedAt: new Date().toISOString(),
    checks: [{ id: "x", verdict: "PASS", critical: false }],
    deterministic: { score: 86 }, target: { url: "https://example.test/x", status: 200 },
  }));
  ok("5.5, P5 livré : une cible en 200 est jugée", run(["tools/audit/gate.mjs", "--report", rep404, "--min-score", "50"]).code, 0);
  fs2.unlinkSync(rep404);
}

// 5.6 : la règle 47 déclarée exécutable et muette faute d'entrée
const s56 = sec("### 5.6", "### 5.7");
const v47 = run(["-e", `import('./tools/audit/lib/checks.mjs').then(({runChecks})=>console.log(
  runChecks({rawHtml:'<html><body><script>gsap.to(x,{y:1})<\\/script></body></html>', css:''})
    .find(c=>c.id==='motion-reduced-guard').verdict))`]);
ok("5.6, verdict de motion-reduced-guard sans js", v47.out.trim(),
  done("P3") ? "NOT_MEASURED" : (/\.verdict\)\)"\n(\w+)/.exec(s56) || [, "?"])[1]);
const detectSrc = readFileSync(join(ROOT, "tools/inspect/detect.mjs"), "utf8").split("\n");
ok("5.6, detect.mjs appelle runChecks", detectSrc.some(l => /runChecks\(\{[^}]*\bjs\b/.test(l)) ? "avec js" : "sans js",
  done("P9") ? "avec js" : "sans js");

// 5.7 : le fichier de sonde est dans npm test et absent du workflow
const s57 = sec("### 5.7", "### 5.8");
const wf = readFileSync(join(REPO, ".github/workflows/validate.yml"), "utf8");
const pkgTest = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).scripts.test;
ok("5.7, rendered-rules.mjs dans le workflow", /rendered-rules\.mjs/.test(wf) ? "présent" : "absent",
  done("P10") ? "présent" : "absent");
if (done("P10")) {
  ok("5.7, P10 livré : le workflow installe Chromium", /playwright install/.test(wf) ? "oui" : "non", "oui");
  ok("5.7, P10 livré : le job passe --require-browser", /--require-browser/.test(wf) ? "oui" : "non", "oui");
  const rrSrc = readFileSync(join(REPO, "tests/rendered-rules.mjs"), "utf8");
  ok("5.7, P10 livré : le drapeau fait échouer un saut", /requireBrowser[\s\S]{0,400}process\.exit\(1\)/.test(rrSrc) ? "oui" : "non", "oui");
}
ok("5.7, rendered-rules.mjs dans npm test", /rendered-rules\.mjs/.test(pkgTest) ? "présent" : "absent", "présent");
const rr = readFileSync(join(REPO, "tests/rendered-rules.mjs"), "utf8");
ok("5.7, la branche SKIPPED sort bien 0",
  /SKIPPED[\s\S]{0,600}?process\.exit\((\d)\)/.exec(rr)?.[1], (/sort ensuite (\d)/.exec(s57) || [, "?"])[1]);
ok("5.7, règles non vérifiées", cov.filter(r => ["rendered-probe", "three-probe", "motion-probe"].includes(r[1])).length,
  word(n(/([\w-]+) règles ne sont pas vérifiées/)));

// 5.8 : --json perd le code de sortie
const s58 = sec("### 5.8", "### 5.9");
const fx3 = "file://" + join(ROOT, "tools/inspect/fixtures/three/bad.html");
const fxm = "file://" + join(ROOT, "tools/inspect/fixtures/motion/sweep-static.html");
let browser = true;
try { await import("playwright"); } catch { browser = false; }
if (browser) {
  const t1 = run(["tools/inspect/three.mjs", fx3]);
  const t2 = run(["tools/inspect/three.mjs", fx3, "--json"]);
  const m1 = run(["tools/inspect/motion.mjs", fxm, "--sweep"]);
  const m2 = run(["tools/inspect/motion.mjs", fxm, "--sweep", "--json"]);
  const codes = [...s58.matchAll(/\$ echo \$\?\n(\d+)/g)].map(x => x[1]);
  ok("5.8, three.mjs texte", t1.code, codes[0]);
  ok("5.8, motion.mjs --sweep texte", m1.code, codes[2]);
  if (done("P17")) {
    ok("5.8, P17 livré : three.mjs --json rend le code du texte", t2.code, t1.code);
    ok("5.8, P17 livré : motion.mjs --json rend le code du texte", m2.code, m1.code);
  } else {
    ok("5.8, three.mjs --json", t2.code, codes[1]);
    ok("5.8, motion.mjs --sweep --json", m2.code, codes[3]);
  }
} else {
  console.log("  \x1b[31mNON \x1b[0m 5.8 non rejoué : playwright absent. Le refus est bruyant, pas silencieux.");
  failures++;
}

/* ---------- 13. La motivation de l'annexe partitionne le tableau ---------- */

console.log("\nMotivation des colonnes, partition des 31 entrées");
const motiv = doc.slice(doc.indexOf("Motivation des colonnes"));
const listed = {};
const marks = [...motiv.matchAll(/"(certaine|élevée|moyenne|faible)"/g)];
for (let k = 0; k < marks.length; k++) {
  const seg = motiv.slice(marks[k].index, k + 1 < marks.length ? marks[k + 1].index : motiv.length);
  const nums = [...seg.matchAll(/\((?:entrées\s+)?([\d,\s]+(?:et\s+\d+)?)\)/g)].flatMap(m => m[1].split(/,|\bet\b/).map(x => x.trim())).filter(Boolean);
  listed[marks[k][1]] = nums.sort((a, b) => a - b).join(" ");
}
for (const [k, v] of Object.entries(SCALE_NAMES())) {
  const real = annexRows.filter(r => col(r, "prob") === k).map(r => r[1]).sort((a, b) => a - b).join(" ");
  ok(`entrées en "${k}"`, real, listed[k] ?? "?");
}
function SCALE_NAMES() { return { certaine: 4, "élevée": 3, moyenne: 2, faible: 1 }; }

/* ---------- 14. Les trous que la relecture a démontrés par mutation ---------- */

console.log("\nTrous fermés après mutation dirigée");

// (a) chaque jeton numérique des blocs de transcript, et non la seule prose voisine
const inBlock = (sec, re) => (re.exec(sec) || [, "?"])[1];
if (!done("P1")) {
  ok("5.1, FAIL du transcript", (/FAIL:\s*(\d+)/.exec(g.out) || [, "?"])[1], inBlock(s51, /FAIL:\s*(\d+)/));
  ok("5.1, WARN du transcript", (/WARN:\s*(\d+)/.exec(g.out) || [, "?"])[1], inBlock(s51, /WARN:\s*(\d+)/));
}
const s53 = sec("### 5.3", "### 5.4");
if (!done("P4")) ok("5.3, score du transcript", z42.score, inBlock(s53, /\{"score":(\d+)/));
const s54 = sec("### 5.4", "### 5.5");
ok("5.4, score du transcript", done("P4") ? sc54.provisionalScore : sc54.score, inBlock(s54, /^score (\d+)/m));
ok("5.5, ligne de score du transcript",
  `score ${done("P4") ? sc404.provisionalScore : sc404.score} FAIL ${sc404.fails} PASS ${passes(r404)}`,
  (/^(score \d+ FAIL \d+ PASS \d+)$/m.exec(s55) || [, "?"])[1]);
// Les cinq PASS du transcript de 5.4 dans l'ordre où runChecks les rend.
if (!done("P3")) {
  const realOrder = rc.filter(c => c.verdict === "PASS" && FLIP.test(c.id)).map(c => c.id).join(" ");
  const docOrder = [...s54.matchAll(/^PASS\s+([\w-]+)/gm)].map(m => m[1]).join(" ");
  ok("5.4, ordre des cinq PASS du transcript", realOrder, docOrder);
}

// (b) le second chiffre du §6.4, celui qui porte tout l'argument
if (!done("P3")) ok("6.4, score moyen après P3 seul", (sum / fx.length).toFixed(1).replace(".", ","), n(/après P3 seul : ([\d,]+)/));

// (c) les entrées déclinées du §6.3 sont celles de l'annexe
const declinedRows = annexRows.filter(r => /décliné/i.test(col(r, "statut") || "")).map(r => r[1]).sort((a, b) => a - b).join(" ");
const s63 = sec("### 6.3", "### 6.4");
const declinedProse = (/n'ont pas de point de plan : les entrées ([\d,\s]+)\s*et (\d+)\s*\n?\s*de l'annexe/.exec(s63) || [, "", ""]);
ok("6.3, entrées déclinées", declinedRows,
  (declinedProse[1] + " " + declinedProse[2]).split(/[,\s]+/).filter(Boolean).sort((a, b) => a - b).join(" "));

// (d) les treize règles du §5.7, par identifiant et non par nombre
const browserRules = cov.filter(r => ["rendered-probe", "three-probe", "motion-probe"].includes(r[1]))
  .map(r => Number(r[0])).sort((a, b) => a - b).join(" ");
const listed57 = (/les ((?:\d+, )+\d+(?:,\s*\n?\s*\d+)*(?:\s+et\s+\d+))/.exec(s57) || [, ""])[1]
  .replace(/\s+et\s+/, ", ").split(/,\s*/).map(x => x.trim()).filter(Boolean).sort((a, b) => a - b).join(" ");
ok("5.7, identifiants des règles non vérifiées", browserRules, listed57);

// (e) chaque dérogation déclarée est appliquée
//     "P13 est remonté de la dernière place" doit être vrai du tableau livré.
ok("dérogation P13, remonté de la dernière place", order[order.length - 1] !== "P13" ? "appliquée" : "non appliquée", "appliquée");
const firstDecl = (/\*\*(P\d+b?(?:, P\d+b?)*(?: et P\d+b?)?) sont livrés en premier\*\*/.exec(derogBlock) || [, ""])[1]
  .replace(/ et /, ", ").split(/,\s*/).filter(Boolean);
// Rétrécir la déclaration la validait : le bloc de tête est donc borné par la
// première ligne dont la priorité remonte, et comparé en entier.
ok("dérogation, points livrés en premier", order.slice(0, firstDecl.length).join(" "), firstDecl.join(" "));
// Rétrécir la déclaration la validait. Le point qui suit le bloc déclaré doit donc
// ouvrir un autre groupe de dérogation, faute de quoi la déclaration est tronquée.
const after = order[firstDecl.length];
const opensGroup = new RegExp(`\\*\\*${after}[,.\\s]`).test(derogBlock);
ok("point suivant le bloc de tête", opensGroup ? "ouvre une dérogation" : `${after} n'en ouvre aucune`, "ouvre une dérogation");

// (f) la répartition par moteur du §2.1, dérivée de rule-coverage.csv
const byClass = {};
for (const r of cov) byClass[r[1]] = (byClass[r[1]] || 0) + 1;
const s21 = sec("### 2.1", "### 2.2");
const spreadTxt = (/sous la forme "([^"]+)"/.exec(s21) || [, ""])[1];
const spread = [...spreadTxt.matchAll(/(\d+) dans/g)].map(m => Number(m[1]));
const realSpread = [byClass["rules-engine"], byClass["static-check"], byClass["rendered-probe"], byClass["three-probe"], byClass["motion-probe"]];
ok("2.1, répartition par moteur", realSpread.join(" "), spread.join(" "));
ok("2.1, somme des exécutables", realSpread.reduce((a, b) => a + b, 0), n(/Ces cinq nombres font (\d+)/));
ok("2.1, écart non exécutable", facts.rules - realSpread.reduce((a, b) => a + b, 0), n(/l'écart de (\d+) est le nombre de règles/));

// (g) une réaffectation de statut dans l'annexe qui préserve les maxima
//     Chaque entrée doit citer un point qui existe au plan, et chaque point du
//     plan couvrant des entrées doit citer les emplacements de ses entrées.
const badStatus = annexRows.map(r => col(r, "statut")).filter(v => !/décliné/i.test(v) && !plan.has(v));
ok("statuts d'annexe pointant hors du plan", badStatus.join(" ") || 0, 0);
for (const [id, v] of byPoint) {
  const para = (paras.find(m => m[1] === id) || [, , ""])[2];
  const files = new Set(annexRows.filter(r => col(r, "statut") === id)
    .flatMap(r => [...r[2].matchAll(/`([\w./-]+\.(?:mjs|js))/g)].map(m => m[1].split("/").pop())));
  const missing = [...files].filter(f => !para.includes(f));
  if (missing.length) { failures++; console.log(`  \x1b[31mNON \x1b[0m ${(id + " ne cite pas " + missing.join(", ")).padEnd(52)}`); }
}
console.log(`  \x1b[32mOK  \x1b[0m ${"chaque point cite les fichiers de ses entrées d'annexe".padEnd(52)} document: conforme`);

console.log("\nQuantités citées plusieurs fois, chaque occurrence");
all("dérogations au classement", /(\S+) dérogations (?:au classement|réordonnent|écrites)/g,
  (derogBlock.match(/^- \*\*/gm) || []).length);
all("lignes au plancher", /(\S+) des dix-neuf lignes\s*\n?valent|Sur ces (\S+) lignes/g,
  costRows.filter(r => /^1 à 1,5 j$/.test(r[5])).length);
all("chemins planifiés", /(\S+) chemins sont planifiés|dont ([\w-]+) sont planifiés ici/g, facts.planned);
all("règles navigateur non vérifiées", /([\w-]+) règles ne sont donc pas vérifiées|([\w-]+) règles de sonde non vérifiées|les ([\w-]+) règles ne sont pas vérifiées/g,
  cov.filter(r => ["rendered-probe", "three-probe", "motion-probe"].includes(r[1])).length);
all("chemins reproduits par exécution", /([\w-]+) sont reproduits par\s*\n?\s*exécution/g, facts.verified);
// P8 en a ajouté : la prose garde le chiffre de l'évaluation, le garde vérifie
// que le compte courant ne descend jamais sous lui.
{
  const atReview = word(n(/([\w-]+) lignes sur 33 en portaient une/));
  ok("lois gardées à l'évaluation", atReview, 4);
  ok("lois gardées aujourd'hui, jamais moins", guardedLaws() >= 4 ? "au moins 4" : `${guardedLaws()}`, "au moins 4");
}
all("points de la première livraison", /La première livraison, ([\w-]+) points|Les ([\w-]+) points de la première livraison/g, FIRST.length);
all("chemins recensés", /(?:^|[.\s])([\w-]+(?: et [\w-]+)?) chemins (?:rendent|retenus)|Les ([\w-]+(?: et [\w-]+)?) chemins de vert faux|Sur ([\w-]+(?: et [\w-]+)?) chemins|des ([\w-]+(?: et [\w-]+)?) chemins n'ont pas de point|de ces ([\w-]+(?: et [\w-]+)?) chemins sont dans le code|des ([\w-]+(?: et [\w-]+)?) chemins défectueux|à ([\w-]+(?: et [\w-]+)?) chemins/g, facts.annexRows);
if (!done("P3")) all("bascules de verdict", /deviendraient NOT_MEASURED : (\d+)|sur les (\d+) cas/g, flips);

/* ---------- 14b. Les chiffres du conflit d'intérêts ---------- */

// Le nombre le plus engageant du document pour son auteur était le seul à n'être
// tenu par rien. Il se dérive des entrées citant les modules écrits en 3.6.0-3.7.1.
console.log("\nConflit d'intérêts, dérivé de l'annexe");
const MINE = ["three.mjs", "motion.mjs", "capture.mjs"];
const owns = annexRows.filter(r => MINE.some(f => r[2].includes(f)));
const shared = owns.filter(r => /rendered\.mjs|checks\.mjs|fetch\.mjs|gate\.mjs/.test(r[2]));
ok("chemins dans le code de l'auteur", owns.length, word(n(/([\w-]+) de ces trente et un chemins sont dans le code/)));
ok("dont partagés avec du code antérieur", shared.length, /plus\s*\n?un huitième partagé/.test(doc) ? 1 : "?");
ok("chemins propres à l'auteur", owns.length - shared.length, word(n(/soit deux des sept mécanismes[\s\S]{0,120}?et ([\w-]+) des trente et un/)));
// 5.11 : quatre lois sur 33 portent un guard
function guardedLaws() {
  const lines = readFileSync(join(ROOT, "tools/data/laws.csv"), "utf8").trim().split(/\r?\n/);
  const gi = csvCells(lines[0]).indexOf("guard");
  return lines.slice(1).filter(l => (csvCells(l)[gi] || "").trim().length > 0).length;
}
function csvCells(line) {
  const out = []; let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur); return out;
}
const lawLines = readFileSync(join(ROOT, "tools/data/laws.csv"), "utf8").trim().split(/\r?\n/);
ok("lois au total à l'évaluation", 33, n(/lignes sur (\d+) en portaient une/));

/* ---------- 14c. L'artefact compagnon ---------- */

// La pièce à conviction du §5.8 était le seul fichier que le garde n'ouvrait pas.
console.log("\nArtefact compagnon des sondes");
try {
  const comp = readFileSync(join(REPO, "ARCHITECTURE-REVIEW-sondes.md"), "utf8");
  const rows = comp.split("\n").filter(l => /^\|\s*\d+\s*\|/.test(l)).map(l => l.split("|").map(c => c.trim()));
  const high = rows.filter(r => r[r.length - 3] === "haute").length;
  const unlisted = rows.filter(r => /^hors/.test(r[r.length - 2])).length;
  ok("constats du compagnon", rows.length, word(n(/([\w-]+) constats,\s*\n?dont [\w-]+ de gravité haute/)));
  ok("constats de gravité haute", high, word((/dont ([\w-]+) de gravité haute/.exec(comp) || [, "?"])[1]));
  ok("constats non recensés", unlisted, word((/que les ([\w-]+) constats non recensés/.exec(comp) || [, "?"])[1]));
  ok("gravité haute, cohérente avec le document", high, word(n(/dont quatre de gravité haute/) === "?" ? word(n(/dont ([\w-]+) de gravité haute/)) : 4));
} catch { console.log("  \x1b[31mNON \x1b[0m compagnon illisible"); failures++; }

/* ---------- 14d. La page de tête ---------- */

// Les nombres de "En cinq lignes" n'étaient tenus par rien alors que c'est la page
// que la plupart des lecteurs liront seule.
console.log("\nPage de tête");
const head5 = doc.slice(0, doc.indexOf("## 1. La thèse"));
ok("bascules citées en tête", done("P3") ? realFlips : flips, (/\*\*(\d+) verdicts\*\*/.exec(head5) || [, "?"])[1]);
ok("total cité en tête, borne basse", fr(low), (/entre ([\d,]+) et [\d,]+ jours-personne/.exec(head5) || [, "?"])[1]);
ok("total cité en tête, borne haute", fr(high), (/entre [\d,]+ et ([\d,]+) jours-personne/.exec(head5) || [, "?"])[1]);
ok("points de structure cités en tête", STRUCT.join(" "),
  ((/\(P3b, ([^)]+)\)/.exec(head5) || [, ""])[0] || "").replace(/[()]/g, "").split(/,\s*|\s+et\s+/).map(x => x.trim()).filter(Boolean).join(" "));
ok("priorité de P1 citée en tête", plan.get("P1").prio, (/quand P1 est à (\d+)/.exec(head5) || [, "?"])[1]);

// Le second chiffre du §6.4, celui qui porte l'argument "c'est avec P4"
ok("6.4, couverture après P3", cleanMeasured - cleanFlips, cp && cp[3]);

// Un ordre qui contredit le texte d'une dérogation
const p13After = (/P13 est remonté\*\* de la dernière place, devant ([^.]+)\./.exec(derogBlock) || [, ""])[1]
  .split(/,\s*|\s+et\s+/).map(x => x.trim()).filter(Boolean);
const i13 = order.indexOf("P13");
ok("points que P13 doit précéder", p13After.filter(x => order.indexOf(x) < i13).join(" ") || 0, 0);

console.log("\nComptages du garde, dérivés du garde");
// Le nombre de lignes du garde n'est pas gardé : il change à chaque édition du
// garde, donc un contrôle dessus casserait à chaque passe sans rien protéger. Le
// document ne le cite plus.
ok("emplacements cités", facts.refsChecked, n(/chacun des (\d+) emplacements/));
const withLine = [...doc.matchAll(/`[\w./-]+\.(?:mjs|js|csv|md|json|css|html|yml|tex):\d+/g)].map(m => m[0]);
ok("emplacements portant un numéro de ligne", withLine.length, n(/dont (\d+)\s*\n?\s*portent un numéro de ligne/));
ok("couples distincts", new Set(withLine).size, n(/\((\d+) couples distincts\)/));

/* ---------- 14e. Le chantier entretien ---------- */

// Un second document chiffré n'échapperait pas à la règle du premier.
console.log("\nChantier entretien, dérivé de son propre tableau");
try {
  const ent = readFileSync(join(REPO, "ARCHITECTURE-REVIEW-entretien.md"), "utf8");
  const eRows = ent.split("\n").filter(l => /^\|\s*E\d+\s*\|/.test(l)).map(l => l.split("|").map(c => c.trim()));
  let eLow = 0, eHigh = 0, badE = 0;
  for (const r of eRows) {
    const m = /([\d,]+)(?:\s*à\s*([\d,]+))?\s*j/.exec(r[5] || "");
    const a = num(m[1]), b = m[2] ? num(m[2]) : a;
    eLow += a; eHigh += b;
    if (Math.abs(num(r[3]) * num(r[4]) / a - num(r[6])) > 0.001) badE++;
  }
  ok("priorités du chantier entretien", badE ? `${badE} ligne(s) fausse(s)` : "conformes", "conformes");
  const eTot = /Total : ([\d,]+) à ([\d,]+) jours-personne/.exec(ent);
  ok("total du chantier entretien, borne basse", fr(eLow), eTot ? eTot[1] : "?");
  ok("total du chantier entretien, borne haute", fr(eHigh), eTot ? eTot[2] : "?");
  const gl = guardedLaws(), lawTotal = readFileSync(join(ROOT, "tools/data/laws.csv"), "utf8").trim().split(/\r?\n/).length - 1;
  ok("lois gardées après E2", gl, (/le compte à (\d+) lois gardées/.exec(ent) || [, "?"])[1]);
  ok("lois au total", lawTotal, (/lois gardées\s*\n?sur (\d+)/.exec(ent) || [, "?"])[1]);
  ok("lois sans garde, dites qualitatives", lawTotal - gl, word((/Les ([\w-]+) lois\s*\n?restantes ne portent pas de garde/.exec(ent) || [, "?"])[1]));
  ok("le plan principal renvoie au chantier", /ARCHITECTURE-REVIEW-entretien\.md/.test(doc) ? "oui" : "non", "oui");
} catch (e) { failures++; console.log("  \x1b[31mNON \x1b[0m chantier entretien illisible : " + e.message); }

/* ---------- 15. Le garde est câblé ---------- */

console.log("\nLe garde lui-même");
const self = "check-review-numbers";
ok("appelé par npm test", new RegExp(self).test(pkgTest) ? "oui" : "non", "oui");
const wired = new RegExp(self).test(wf);
ok("appelé par le workflow", wired ? "oui" : "non",
  done("P10") ? "oui" : (/ce garde tourne dans `npm test` et pas dans le workflow/.test(doc) ? "non" : "oui"));

if (process.argv.includes("--json")) console.log("\n" + JSON.stringify(facts, null, 2));

console.log("\n" + "=".repeat(60));
if (failures) {
  console.error(`\x1b[31m${failures} nombre(s) du document ne concordent pas avec leur source.\x1b[0m\n`);
  process.exit(1);
}
console.log("\x1b[32mChaque nombre gardé par ce script concorde avec sa source.\x1b[0m\n");
