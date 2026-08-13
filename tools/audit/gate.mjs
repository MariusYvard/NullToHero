#!/usr/bin/env node
/**
 * gate.mjs — deterministic CI gate for /audit.
 *
 * Reads a SITE-AUDIT.json (or analyzes a URL/file) and fails the build on an
 * objective regression: a FAIL on a critical check (contrast, robots
 * crawlability), a deterministic score below a threshold, or too many FAIL/WARN.
 * Only the deterministic checks gate; the subjective design verdicts never block
 * a build. This is the "continuous" half of the audit — see action.yml.
 *
 * Usage:
 *   node tools/audit/gate.mjs --report SITE-AUDIT.json [--min-score N] [--max-fails N] [--max-warns N] [--no-fail-on-critical] [--fail-on-client-rendered]
 *   node tools/audit/gate.mjs <url|file> [--render] [--robots] [--min-score N] ...
 *
 * Exit 0 = gate passed, 1 = gate failed, 2 = the gate could not judge
 *   (usage error, unreadable report, report missing its shape, report stale).
 */

import { readFileSync, appendFileSync } from "node:fs";
import { fetchTarget } from "./fetch.mjs";
import { runChecks } from "./lib/checks.mjs";
import { buildSiteAudit, sha } from "./lib/site-audit.mjs";

const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const numOpt = (n) => { const v = val(n, null); return v == null ? null : Number(v); };

const reportPath = val("--report", null);
const target = reportPath ? null : args.find(a => !a.startsWith("--"));

if (!reportPath && !target) {
  console.error("Usage: node tools/audit/gate.mjs --report SITE-AUDIT.json [--min-score N] ...");
  console.error("   or: node tools/audit/gate.mjs <url|file> [--render] [--robots] [--min-score N] ...");
  process.exit(2);
}

const policy = {
  minScore: numOpt("--min-score"),
  maxFails: numOpt("--max-fails"),
  maxWarns: numOpt("--max-warns"),
  // P4, moitié politique. Le mécanisme est dans scoreFromChecks : un score déduit
  // de rien vaut null. Le plancher au-dessus de zéro est un arbitrage, donc il est
  // ici et il se règle. 0,45 laisse passer un fichier local complet (0,50 de
  // couverture, les contrôles réseau n'ayant rien à mesurer) et refuse une page
  // dont le CSS et le JS sont sur un CDN (0,40).
  minCoverage: numOpt("--min-coverage") ?? 0.45,
  failOnCritical: !has("--no-fail-on-critical"),
  failOnClientRendered: has("--fail-on-client-rendered"),
};

// P1 et P2 : la porte refusait de juger sans le dire. `--report package.json`
// rendait PASS et sortait 0, parce que `score != null` desactivait le seuil au
// lieu de le faire echouer, et parce qu'aucune propriete du rapport n'etait
// exigee. Un rapport illisible ou perimé est maintenant un refus de juger (2),
// distinct d'un verdict negatif (1).
const REFUSE = (title, lines) => {
  console.error(`NullToHero audit gate — ${title}`);
  for (const l of lines) console.error(`  ${l}`);
  console.error("  the gate refuses to judge rather than pass.");
  process.exit(2);
};

let report;
if (reportPath) {
  let raw;
  try { raw = readFileSync(reportPath, "utf8"); }
  catch (e) { REFUSE(reportPath, [`unreadable: ${e.message}`]); }
  try { report = JSON.parse(raw); }
  catch (e) { REFUSE(reportPath, [`not JSON: ${e.message}`]); }

  // P1 : la forme minimale d'un rapport d'audit.
  const missing = [];
  if (!report || typeof report !== "object") missing.push("a JSON object");
  else {
    if (!report.pluginVersion) missing.push("pluginVersion");
    if (!report.generatedAt) missing.push("generatedAt");
    if (!Array.isArray(report.checks) || report.checks.length === 0) missing.push("a non-empty checks array");
  }
  if (missing.length) {
    REFUSE(reportPath, [
      `not an audit report: missing ${missing.join(", ")}`,
      "produce one with: node tools/audit/analyze.mjs <target> --json > SITE-AUDIT.json",
    ]);
  }

  // P2 : un rapport perimé garde la porte verte sur les verdicts de la veille.
  // Une etape d'analyse qui echoue sans faire echouer le job laisse le rapport
  // d'hier sur le disque, et rien dans la sortie n'indiquait son age.
  const maxAgeHours = numOpt("--max-age-hours") ?? 24;
  const stamped = Date.parse(report.generatedAt);
  if (Number.isNaN(stamped)) REFUSE(reportPath, [`generatedAt is not a date: ${report.generatedAt}`]);
  const ageHours = (Date.now() - stamped) / 3600000;
  if (ageHours > maxAgeHours) {
    REFUSE(reportPath, [
      `report is ${ageHours.toFixed(1)}h old, above the ${maxAgeHours}h bound`,
      "re-run the audit, or raise the bound with --max-age-hours N",
    ]);
  }
  if (ageHours < -0.25) REFUSE(reportPath, [`generatedAt is ${Math.abs(ageHours).toFixed(1)}h in the future`]);

  // P2, seconde moitie : quand la cible est un fichier local, le rapport doit
  // decrire l'arbre courant et pas un etat anterieur.
  const file = report.target && report.target.file;
  const claimed = report.inputs && report.inputs.hashes && report.inputs.hashes.rawHtml;
  if (file && claimed) {
    let current = null;
    try { current = sha(readFileSync(file, "utf8")); } catch { /* la cible a disparu, traite plus bas */ }
    if (current === null) {
      REFUSE(reportPath, [`report targets ${file}, which no longer exists`]);
    } else if (current !== claimed) {
      REFUSE(reportPath, [
        `report describes ${file} at ${claimed}, the file on disk is ${current}`,
        "the target changed since the audit ran. Re-run it.",
      ]);
    }
  }
} else {
  const fetchResult = await fetchTarget({ target, render: has("--render"), robots: has("--robots"), timeout: parseInt(val("--timeout", "15000"), 10) });
  const checks = runChecks({ rawHtml: fetchResult.rawHtml || "", renderedHtml: fetchResult.renderedHtml || null, robotsTxt: fetchResult.robotsTxt || null, url: fetchResult.url || null, computed: fetchResult.computed || null, headers: fetchResult.headers || null, css: fetchResult.linkedCss || "" });
  report = buildSiteAudit({ fetchResult, checks, mode: "checks" });
}

// P5 : auditer la page d'erreur d'un serveur n'est pas auditer la cible.
const httpStatus = report.target ? report.target.status : null;
if (httpStatus != null && httpStatus > 399) {
  REFUSE(reportPath || target, [
    `the target answered HTTP ${httpStatus}`,
    "what was audited is the server's error page, not the page asked for.",
  ]);
}

const checks = (report.checks || []).filter(c => c.verdict !== "NOT_MEASURED");
const fails = checks.filter(c => c.verdict === "FAIL");
const warns = checks.filter(c => c.verdict === "WARN");
const criticalFails = fails.filter(c => c.critical);
const score = report.deterministic ? report.deterministic.score : null;
const coverage = report.deterministic && report.deterministic.coverage != null ? report.deterministic.coverage : null;
const clientRenderedUnverified = report.target && report.target.clientRendered === true && report.target.render === "none";

const violations = [];
if (policy.failOnCritical && criticalFails.length) violations.push(`${criticalFails.length} critical check FAIL: ${criticalFails.map(c => c.id).join(", ")}`);
if (policy.minCoverage != null && coverage != null && coverage < policy.minCoverage) violations.push(`only ${(coverage * 100).toFixed(0)}% of checks were measured, below the ${(policy.minCoverage * 100).toFixed(0)}% floor: the score would rate the page on the half that ran`);
if (policy.minScore != null && score == null) violations.push(`--min-score ${policy.minScore} requested but the report carries no deterministic score`);
if (policy.minScore != null && score != null && score < policy.minScore) violations.push(`deterministic score ${score} < min ${policy.minScore}`);
if (policy.maxFails != null && fails.length > policy.maxFails) violations.push(`${fails.length} FAIL > max ${policy.maxFails}`);
if (policy.maxWarns != null && warns.length > policy.maxWarns) violations.push(`${warns.length} WARN > max ${policy.maxWarns}`);
if (policy.failOnClientRendered && clientRenderedUnverified) violations.push("target is client-rendered but was not rendered (use --render)");

const passed = violations.length === 0;
const tgt = report.target ? (report.target.url || report.target.file || "?") : "?";
console.log(`NullToHero audit gate — ${tgt}`);
console.log(`  deterministic score: ${score == null ? "n/a" : score}/100   FAIL: ${fails.length}   WARN: ${warns.length}   critical FAIL: ${criticalFails.length}`);
if (reportPath) console.log(`  report: ${report.pluginVersion} generated ${report.generatedAt}`);
if (httpStatus != null) console.log(`  target answered HTTP ${httpStatus}`);
if (coverage != null) console.log(`  coverage: ${(coverage * 100).toFixed(0)}% of ${report.deterministic.total} checks measured (floor ${(policy.minCoverage * 100).toFixed(0)}%)`);
if (clientRenderedUnverified) console.log(`  note: target looks client-rendered and was fetched without --render`);
for (const c of criticalFails) console.log(`  ✗ critical ${c.id}: ${c.detail}`);
if (passed) console.log(`  RESULT: PASS`);
else { console.log(`  RESULT: FAIL`); for (const v of violations) console.log(`    - ${v}`); }

// Expose outputs for the composite GitHub Action.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `score=${score == null ? "" : score}\nresult=${passed ? "pass" : "fail"}\ncritical-fails=${criticalFails.length}\n`);
}

process.exit(passed ? 0 : 1);
