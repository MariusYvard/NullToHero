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

test("le plancher déterministe ne bouge pas quand les règles arrivent", () => {
  const base = runChecks({ rawHtml: PAGE, css: SANS_FOCUS, js: "" });
  const avant = scoreFromChecks(base);
  const apres = scoreFromChecks(base.concat(ruleChecks({ html: PAGE, css: SANS_FOCUS })));
  assert.equal(apres.score, avant.score);
  assert.equal(apres.total, avant.total, "le dénominateur du plancher a changé");
  assert.equal(apres.fails, avant.fails);
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
