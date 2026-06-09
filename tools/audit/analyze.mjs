#!/usr/bin/env node
/**
 * analyze.mjs — deterministic static analyzer (the "compute, don't judge" pass).
 *
 * Turns a fetched page into objective per-check verdicts (contrast, image
 * dimensions, viewport meta, robots.txt Disallow, heading order, html lang,
 * title, meta description, 375px overflow) and writes a SITE-AUDIT.json. These
 * are ground truth the audit hands to its sub-agents so the model only judges
 * the genuinely subjective, and CI / compare read structured data.
 *
 * Usage:
 *   node tools/audit/analyze.mjs <url|file> [--render] [--robots] [--out SITE-AUDIT.json]
 *   node tools/audit/analyze.mjs --from fetch.json [--out SITE-AUDIT.json]
 *
 * Exit 0 always (analysis is reporting, not gating — see gate.mjs for CI).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fetchTarget, warnClientRendered } from "./fetch.mjs";
import { runChecks } from "./lib/checks.mjs";
import { buildSiteAudit } from "./lib/site-audit.mjs";

const args = process.argv.slice(2);
const opt = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };

if (args.length === 0 || (args[0].startsWith("-") && !opt("--from"))) {
  console.error("Usage: node tools/audit/analyze.mjs <url|file> [--render] [--robots] [--out file]");
  console.error("   or: node tools/audit/analyze.mjs --from fetch.json [--out file]");
  process.exit(2);
}

const outFile = val("--out", null);
const fromFile = val("--from", null);

const fetchResult = fromFile
  ? JSON.parse(readFileSync(fromFile, "utf8"))
  : await fetchTarget({ target: args[0], render: opt("--render"), robots: opt("--robots"), timeout: parseInt(val("--timeout", "15000"), 10) });

if (fromFile) warnClientRendered(fetchResult);

const checks = runChecks({
  rawHtml: fetchResult.rawHtml || "",
  renderedHtml: fetchResult.renderedHtml || null,
  robotsTxt: fetchResult.robotsTxt || null,
  url: fetchResult.url || null,
  computed: fetchResult.computed || null,
});

const siteAudit = buildSiteAudit({ fetchResult, checks, mode: "checks" });
const json = JSON.stringify(siteAudit, null, 2);
if (outFile) { writeFileSync(outFile, json); console.error(`[analyze] wrote ${outFile}`); }
else process.stdout.write(json + "\n");

// One-line human summary on stderr.
const d = siteAudit.deterministic;
console.error(`[analyze] deterministic floor ${d.score}/100 — ${d.fails} FAIL, ${d.warns} WARN, ${d.notMeasured} not measured${d.criticalFails.length ? `, critical: ${d.criticalFails.join(", ")}` : ""}`);
