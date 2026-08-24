// Le moteur de règles dans l'audit : ce qu'il rapporte, et ce qu'il ne déplace
// pas. Le cas qui compte est le dernier : combien de règles du référentiel un
// audit atteint réellement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { ruleChecks, ruleSummary, ruleMeta, parseCsv } from "../null-to-hero/tools/audit/lib/rules-bridge.mjs";
import { runChecks, scoreFromChecks } from "../null-to-hero/tools/audit/lib/checks.mjs";
import { RULES } from "../null-to-hero/tools/inspect/rules.mjs";

const SANS_FOCUS = "*:focus { outline: none; }";
const PAGE = '<!doctype html><html lang="fr"><head><title>Essai</title></head><body><main><h1>T</h1></main></body></html>';

test("chaque règle du moteur devient un contrôle, aucune ne disparaît", () => {
  const out = ruleChecks({ html: PAGE, css: "", js: "" });
  assert.equal(out.length, RULES.length);
  assert.equal(new Set(out.map(c => c.id)).size, RULES.length, "deux contrôles portent le même identifiant");
  for (const c of out) {
    assert.match(c.id, /^rule-\d+$/);
    assert.equal(c.source, "rules");
    assert.equal(c.dimension, "Front-end Defects");
    assert.ok(["PASS", "WARN", "FAIL", "ADVISORY"].includes(c.verdict), `verdict inconnu: ${c.verdict}`);
    assert.ok(c.agent.startsWith("inspect-agent-"), `agent hors du groupe des défauts: ${c.agent}`);
  }
});

test("une violation critique sort en échec, et se dit critique", () => {
  const hit = ruleChecks({ html: PAGE, css: SANS_FOCUS }).find(c => c.id === "rule-2");
  assert.equal(hit.verdict, "FAIL");
  assert.equal(hit.critical, true);
  assert.match(hit.detail, /outline/);
});

test("une source propre laisse la règle en réussite, sans bruit", () => {
  const clean = ruleChecks({ html: PAGE, css: ":focus-visible { outline: 2px solid; }" }).find(c => c.id === "rule-2");
  assert.equal(clean.verdict, "PASS");
  assert.equal(clean.detail, "no violation found in the source");
});

// LE PRIX D'UNE RÈGLE, ET CE QU'IL NE DOIT PAS EMPORTER AVEC LUI
// ---------------------------------------------------------------
// Ce test gardait l'inverse jusqu'au 24 août 2026 : les règles voyageaient à
// côté du score. Mesuré sur 39 pages de deux sites, ce choix rendait le
// plancher muet là où il comptait le plus (six pages de nth-site à 100 sur 100
// pendant que le moteur y trouvait quatre violations chacune). Elles entrent
// donc, à 4 points l'échec et 2 l'avertissement contre 15 et 7 pour un contrôle
// curé, plafonnées à 30.
//
// Ce qui ne doit PAS bouger reste gardé ici : le dénominateur, les comptes de
// contrôles curés et la couverture gardent le sens qu'ils avaient, sinon un
// rapport annoncerait un score qu'aucun nombre posé à côté ne reconstitue.
test("une règle en échec coûte quatre points, un contrôle curé quinze", () => {
  const base = runChecks({ rawHtml: PAGE, css: SANS_FOCUS, js: "" });
  const avant = scoreFromChecks(base);
  const rules = ruleChecks({ html: PAGE, css: SANS_FOCUS });
  const apres = scoreFromChecks(base.concat(rules));

  const f = rules.filter(c => c.verdict === "FAIL").length;
  const w = rules.filter(c => c.verdict === "WARN").length;
  assert.ok(f > 0, "le décor doit faire échouer au moins une règle");
  assert.equal(apres.ruleFails, f);
  assert.equal(apres.ruleWarns, w);
  assert.equal(apres.rulePenalty, Math.min(30, 4 * f + 2 * w));
  assert.equal(apres.score, Math.max(0, avant.score - apres.rulePenalty));

  assert.equal(apres.total, avant.total, "le dénominateur du plancher a changé");
  assert.equal(apres.fails, avant.fails, "une règle a été comptée comme un contrôle curé");
  assert.equal(apres.warns, avant.warns);
  assert.equal(apres.coverage, avant.coverage, "la couverture parle des contrôles curés");
});

// Le plafond est la seule chose qui distingue cette formule de celle qui mettait
// deux sites corrects à 42 et 64 : une page qui déclenche vingt règles fines
// doit descendre, pas s'effondrer.
test("le plafond retient la page qui déclenche vingt règles", () => {
  const base = runChecks({ rawHtml: PAGE, css: SANS_FOCUS, js: "" });
  const vingt = Array.from({ length: 20 }, (_, i) => ({
    id: `rule-fake-${i}`, source: "rules", agent: "inspect-agent-code", verdict: "FAIL",
  }));
  const out = scoreFromChecks(base.concat(vingt));
  assert.equal(out.ruleFails, 20);
  assert.equal(out.rulePenalty, 30, "sans plafond la pénalité serait de 80");
  assert.ok(out.score > 0, "vingt constats fins ne doivent pas annuler la note");
});

// Un score qu'on ne peut pas refaire de tête depuis les nombres imprimés à côté
// de lui n'est pas un score, c'est une opinion.
test("le score se reconstitue depuis les nombres publiés à côté de lui", () => {
  const base = runChecks({ rawHtml: PAGE, css: SANS_FOCUS, js: "" });
  const out = scoreFromChecks(base.concat(ruleChecks({ html: PAGE, css: SANS_FOCUS })));
  const refait = Math.max(0, 100 - 15 * out.fails - 7 * out.warns - out.rulePenalty);
  assert.equal(out.score, out.criticalFails.length ? Math.min(refait, 49) : refait);
});

test("le récapitulatif compte ce qui a tourné, pas ce qui a échoué", () => {
  const out = ruleChecks({ html: PAGE, css: SANS_FOCUS });
  const s = ruleSummary(out);
  assert.equal(s.ran, RULES.length);
  assert.equal(s.fails, out.filter(c => c.verdict === "FAIL").length);
  assert.deepEqual(s.criticalFails, ["rule-2"]);
});

test("un tableau sans règle donne un récapitulatif à zéro, il ne ment pas", () => {
  assert.deepEqual(ruleSummary([{ id: "x", source: "analyzer", verdict: "PASS" }]),
    { ran: 0, fails: 0, warns: 0, advisories: 0, criticalFails: [] });
});

test("la sévérité du référentiel décide du verdict, pas le moteur", () => {
  const meta = ruleMeta();
  for (const c of ruleChecks({ html: PAGE, css: SANS_FOCUS })) {
    const row = meta.get(Number(c.id.slice(5)));
    assert.ok(row, `la règle ${c.id} n'a pas de ligne dans le référentiel`);
    assert.equal(c.severity, row.severity.toLowerCase());
    assert.equal(c.critical, row.severity.toLowerCase() === "critical");
  }
});

// Le garde qui manquait. Un audit qui n'atteint qu'un quart des règles qu'il
// déclare peut rendre un rapport propre sur une page qui en viole trente, sans
// mentir : personne ne les a exécutées. Ce nombre ne doit plus baisser.
test("un audit atteint 66 des règles du référentiel", () => {
  const csv = parseCsv(readFileSync(
    new URL("../null-to-hero/tools/data/rule-coverage.csv", import.meta.url), "utf8").trim());
  const head = csv[0];
  const rows = csv.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));

  const parMoteur = rows.filter(r => r.class === "rules-engine").map(r => Number(r.id));
  const parControles = rows.filter(r => r.class === "static-check").map(r => Number(r.id));

  const rendues = new Set(ruleChecks({ html: PAGE, css: "" }).map(c => Number(c.id.slice(5))));
  for (const id of parMoteur) {
    assert.ok(rendues.has(id), `la règle ${id} est annoncée au moteur et l'audit ne la rend pas`);
  }
  assert.equal(parMoteur.length + parControles.length, 66);
});
