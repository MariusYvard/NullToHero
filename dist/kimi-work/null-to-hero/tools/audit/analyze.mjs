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
 * --render sweeps: sitemap pages x scroll states x viewports, because a verdict from
 * one page at scroll 0 is a verdict about one page at scroll 0 and nothing more. Tune
 * with --pages N (cap, default 10), --scroll N (stops, default 5), --viewports
 * mobile,desktop, or --page-urls a,b,c to name them yourself.
 *
 * Exit 0 always (analysis is reporting, not gating — see gate.mjs for CI).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fetchTarget, warnClientRendered } from "./fetch.mjs";
import { aggregateChecks } from "./lib/aggregate.mjs";
import { buildSiteAudit } from "./lib/site-audit.mjs";
import { ruleChecks } from "./lib/rules-bridge.mjs";

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

const renderOpts = {
  pages: parseInt(val("--pages", "10"), 10),
  scroll: parseInt(val("--scroll", "5"), 10),
  viewports: val("--viewports", "mobile,desktop").split(",").map(s => s.trim()).filter(Boolean),
  explicitPages: val("--page-urls", "") ? val("--page-urls", "").split(",").map(s => s.trim()).filter(Boolean) : null,
};

const fetchResult = fromFile
  ? JSON.parse(readFileSync(fromFile, "utf8"))
  : await fetchTarget({ target: args[0], render: opt("--render"), robots: opt("--robots"), timeout: parseInt(val("--timeout", "15000"), 10), renderOpts });

if (fromFile) warnClientRendered(fetchResult);

const checks = aggregateChecks({
  entry: {
    rawHtml: fetchResult.rawHtml || "",
    renderedHtml: fetchResult.renderedHtml || null,
    robotsTxt: fetchResult.robotsTxt || null,
    url: fetchResult.url || null,
    computed: fetchResult.computed || null,
    headers: fetchResult.headers || null,
    css: fetchResult.linkedCss || "",
    js: fetchResult.linkedJs || "",
    probes: fetchResult.probes || null,
  },
  pages: fetchResult.pages || [],
  robotsTxt: fetchResult.robotsTxt || null,
});

// The rules engine reads the source a developer wrote, so it gets the raw HTML
// even when a render is available: a pattern the framework erases at runtime is
// still the pattern in the file, and a rendered tree would hide it.
const withRules = checks.concat(ruleChecks({
  html: fetchResult.rawHtml || "",
  css: fetchResult.linkedCss || "",
  js: fetchResult.linkedJs || "",
}));

const siteAudit = buildSiteAudit({ fetchResult, checks: withRules, mode: "checks" });
const json = JSON.stringify(siteAudit, null, 2);
if (outFile) { writeFileSync(outFile, json); console.error(`[analyze] wrote ${outFile}`); }
else process.stdout.write(json + "\n");

// One-line human summary on stderr.
const d = siteAudit.deterministic;
console.error(`[analyze] deterministic floor ${d.score}/100 — ${d.fails} FAIL, ${d.warns} WARN, ${d.notMeasured} not measured${d.criticalFails.length ? `, critical: ${d.criticalFails.join(", ")}` : ""}`);
console.error(`[analyze] rules engine: ${d.rules.ran} rules run, ${d.rules.fails} FAIL, ${d.rules.warns} WARN, ${d.rules.advisories} advisory`);
