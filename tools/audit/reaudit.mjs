#!/usr/bin/env node
/**
 * reaudit.mjs — incremental re-audit planner.
 *
 * Given a previous SITE-AUDIT.json and the current page, it hashes the current
 * inputs, compares them to the hashes the previous run recorded, and reports
 * which dimensions actually changed. The orchestrator then re-dispatches only the
 * agents for the changed dimensions and reuses the previous agent sections for
 * the rest, cutting a re-audit to roughly the fraction of dimensions that moved
 * (about a third when only one group changed). The deterministic pre-pass always
 * runs fresh because it is cheap.
 *
 * Usage:
 *   node tools/audit/reaudit.mjs --prev SITE-AUDIT.json <url|file> [--render] [--robots] [--out plan.json]
 *   node tools/audit/reaudit.mjs --prev SITE-AUDIT.json --from fetch.json [--out plan.json]
 *
 * Exit 0 always (planning is reporting, not gating).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fetchTarget, warnClientRendered } from "./fetch.mjs";
import { runChecks } from "./lib/checks.mjs";
import { buildSiteAudit, inputHashes, DIMENSION_INPUTS } from "./lib/site-audit.mjs";

const AGENTS_BY_DIMENSION = {
  searchVisibility: ["seo-agent-technical", "seo-agent-content", "seo-agent-schema", "seo-agent-performance", "seo-agent-geo"],
  frontEndDefects: ["inspect-agent-a11y", "inspect-agent-interaction", "inspect-agent-layout", "inspect-agent-code"],
  designQuality: ["siteasy-agent-ux", "siteasy-agent-visual", "siteasy-agent-motion", "siteasy-agent-content", "siteasy-agent-claims"],
};

const args = process.argv.slice(2);
const opt = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };

const prevPath = val("--prev", null);
if (!prevPath) {
  console.error("Usage: node tools/audit/reaudit.mjs --prev SITE-AUDIT.json <url|file> [--render] [--robots] [--out plan.json]");
  process.exit(2);
}
let prev;
try { prev = JSON.parse(readFileSync(prevPath, "utf8")); }
catch { console.error(`[reaudit] cannot read ${prevPath}`); process.exit(2); }

const fromFile = val("--from", null);
const target = fromFile ? null : args.find(a => !a.startsWith("--"));
if (!fromFile && !target) { console.error("[reaudit] provide a <url|file> or --from fetch.json"); process.exit(2); }

const fetchResult = fromFile
  ? JSON.parse(readFileSync(fromFile, "utf8"))
  : await fetchTarget({ target, render: opt("--render"), robots: opt("--robots"), timeout: parseInt(val("--timeout", "15000"), 10) });
if (fromFile) warnClientRendered(fetchResult);

const hasPrevHashes = !!(prev.inputs && prev.inputs.hashes);
const prevHashes = (prev.inputs && prev.inputs.hashes) || {};
const curHashes = inputHashes(fetchResult);

const changedArtifacts = [];
for (const key of Object.keys(curHashes)) {
  if (prevHashes[key] === undefined || prevHashes[key] !== curHashes[key]) changedArtifacts.push(key);
}

const reRunDimensions = [], reuseDimensions = [];
for (const [dim, arts] of Object.entries(DIMENSION_INPUTS)) {
  const changed = !hasPrevHashes || arts.some(a => changedArtifacts.includes(a));
  (changed ? reRunDimensions : reuseDimensions).push(dim);
}
const reRunAgents = reRunDimensions.flatMap(d => AGENTS_BY_DIMENSION[d] || []);
const allAgents = Object.values(AGENTS_BY_DIMENSION).flat();
const savingPct = Math.round(100 * (1 - reRunAgents.length / allAgents.length));

// Always refresh the deterministic pre-pass (cheap) so the floor is current.
const checks = runChecks({
  rawHtml: fetchResult.rawHtml || "", renderedHtml: fetchResult.renderedHtml || null,
  robotsTxt: fetchResult.robotsTxt || null, url: fetchResult.url || null,
  computed: fetchResult.computed || null, headers: fetchResult.headers || null, css: fetchResult.linkedCss || "",
});
const fresh = buildSiteAudit({ fetchResult, checks, mode: "checks" });

const plan = {
  tool: "NullToHero /audit reaudit",
  generatedAt: new Date().toISOString(),
  previous: { path: prevPath, generatedAt: prev.generatedAt || null, pluginVersion: prev.pluginVersion || null },
  changedArtifacts,
  reRunDimensions,
  reuseDimensions: hasPrevHashes ? reuseDimensions : [],
  reRunAgents,
  estimatedAgentSavingPct: hasPrevHashes ? savingPct : 0,
  note: hasPrevHashes
    ? `Re-dispatch only ${reRunAgents.length}/${allAgents.length} agents (dimensions: ${reRunDimensions.join(", ") || "none"}); reuse prior sections for ${reuseDimensions.join(", ") || "none"}. Recompute the blend from the mix of fresh and reused agent scores.`
    : "Previous SITE-AUDIT.json has no input hashes (older schema); run a full /audit once to establish a hashed baseline, then reaudit is incremental.",
  deterministic: fresh.deterministic,
  inputs: fresh.inputs,
};

const outFile = val("--out", null);
const json = JSON.stringify(plan, null, 2);
if (outFile) { writeFileSync(outFile, json); console.error(`[reaudit] wrote ${outFile}`); }
else process.stdout.write(json + "\n");
console.error(`[reaudit] changed: ${changedArtifacts.join(", ") || "nothing"} -> re-run ${reRunAgents.length}/${allAgents.length} agents (${hasPrevHashes ? savingPct : 0}% saved)`);
