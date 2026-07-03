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
 * Exit 0 = gate passed, 1 = gate failed, 2 = usage error.
 */

import { readFileSync, appendFileSync } from "node:fs";
import { fetchTarget } from "./fetch.mjs";
import { runChecks } from "./lib/checks.mjs";
import { buildSiteAudit } from "./lib/site-audit.mjs";

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
  failOnCritical: !has("--no-fail-on-critical"),
  failOnClientRendered: has("--fail-on-client-rendered"),
};

let report;
if (reportPath) {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} else {
  const fetchResult = await fetchTarget({ target, render: has("--render"), robots: has("--robots"), timeout: parseInt(val("--timeout", "15000"), 10) });
  const checks = runChecks({ rawHtml: fetchResult.rawHtml || "", renderedHtml: fetchResult.renderedHtml || null, robotsTxt: fetchResult.robotsTxt || null, url: fetchResult.url || null, computed: fetchResult.computed || null, headers: fetchResult.headers || null, css: fetchResult.linkedCss || "" });
  report = buildSiteAudit({ fetchResult, checks, mode: "checks" });
}

const checks = (report.checks || []).filter(c => c.verdict !== "NOT_MEASURED");
const fails = checks.filter(c => c.verdict === "FAIL");
const warns = checks.filter(c => c.verdict === "WARN");
const criticalFails = fails.filter(c => c.critical);
const score = report.deterministic ? report.deterministic.score : null;
const clientRenderedUnverified = report.target && report.target.clientRendered === true && report.target.render === "none";

const violations = [];
if (policy.failOnCritical && criticalFails.length) violations.push(`${criticalFails.length} critical check FAIL: ${criticalFails.map(c => c.id).join(", ")}`);
if (policy.minScore != null && score != null && score < policy.minScore) violations.push(`deterministic score ${score} < min ${policy.minScore}`);
if (policy.maxFails != null && fails.length > policy.maxFails) violations.push(`${fails.length} FAIL > max ${policy.maxFails}`);
if (policy.maxWarns != null && warns.length > policy.maxWarns) violations.push(`${warns.length} WARN > max ${policy.maxWarns}`);
if (policy.failOnClientRendered && clientRenderedUnverified) violations.push("target is client-rendered but was not rendered (use --render)");

const passed = violations.length === 0;
const tgt = report.target ? (report.target.url || report.target.file || "?") : "?";
console.log(`NullToHero audit gate — ${tgt}`);
console.log(`  deterministic score: ${score == null ? "n/a" : score}/100   FAIL: ${fails.length}   WARN: ${warns.length}   critical FAIL: ${criticalFails.length}`);
if (clientRenderedUnverified) console.log(`  note: target looks client-rendered and was fetched without --render`);
for (const c of criticalFails) console.log(`  ✗ critical ${c.id}: ${c.detail}`);
if (passed) console.log(`  RESULT: PASS`);
else { console.log(`  RESULT: FAIL`); for (const v of violations) console.log(`    - ${v}`); }

// Expose outputs for the composite GitHub Action.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `score=${score == null ? "" : score}\nresult=${passed ? "pass" : "fail"}\ncritical-fails=${criticalFails.length}\n`);
}

process.exit(passed ? 0 : 1);
