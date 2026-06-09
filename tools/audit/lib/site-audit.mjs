// Shared helpers that assemble a SITE-AUDIT.json object from analyzer output.
// Pure Node standard library. Used by analyze.mjs (deterministic pre-pass) and
// reused by gate.mjs / eval.mjs so the JSON shape lives in exactly one place.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreFromChecks } from "./checks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export function pluginVersion() {
  try {
    const pj = JSON.parse(readFileSync(join(HERE, "..", "..", "..", ".claude-plugin", "plugin.json"), "utf8"));
    return pj.version || null;
  } catch { return null; }
}

export function band(score) {
  if (score == null) return null;
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs work";
  return "Critical";
}

const GROUP_OF = {
  "seo-agent-technical": "searchVisibility", "seo-agent-content": "searchVisibility",
  "seo-agent-schema": "searchVisibility", "seo-agent-performance": "searchVisibility",
  "seo-agent-geo": "searchVisibility",
  "inspect-agent-a11y": "frontEndDefects", "inspect-agent-interaction": "frontEndDefects",
  "inspect-agent-layout": "frontEndDefects", "inspect-agent-code": "frontEndDefects",
  "siteasy-agent-ux": "designQuality", "siteasy-agent-visual": "designQuality",
  "siteasy-agent-motion": "designQuality", "siteasy-agent-content": "designQuality",
};

// Per-group deterministic floor from the objective checks that fell in each group.
export function groupFloors(checks) {
  const groups = { searchVisibility: null, frontEndDefects: null, designQuality: null };
  for (const g of Object.keys(groups)) {
    const subset = checks.filter(c => GROUP_OF[c.agent] === g && c.verdict !== "NOT_MEASURED");
    if (subset.length) groups[g] = scoreFromChecks(subset).score;
  }
  return groups;
}

// Build a complete SITE-AUDIT.json object for a deterministic (checks) run.
export function buildSiteAudit({ fetchResult, checks, mode = "checks" }) {
  const det = scoreFromChecks(checks);
  const groups = groupFloors(checks);
  const agents = {};
  for (const [a, v] of Object.entries(det.byAgent)) agents[a] = v.score;

  return {
    schemaVersion: "1.0",
    tool: "NullToHero /audit",
    pluginVersion: pluginVersion(),
    generatedAt: new Date().toISOString(),
    mode,
    target: {
      url: fetchResult.url || null,
      file: fetchResult.file || null,
      pagesFetched: 1,
      render: fetchResult.render || "none",
      clientRendered: fetchResult.clientRendered === undefined ? "unknown" : fetchResult.clientRendered,
    },
    scores: {
      overall: det.score,
      groups,
      agents,
      band: band(det.score),
      note: "Scores are the deterministic floor from objective checks only (mode=checks). A full /audit blends all 13 agent scores; see SITE-AUDIT-REPORT.md.",
    },
    deterministic: {
      score: det.score, fails: det.fails, warns: det.warns,
      notMeasured: det.notMeasured, criticalFails: det.criticalFails,
    },
    checks: checks.map(c => ({ ...c, source: "analyzer" })),
    cost: null,
    partialCoverage: fetchResult.clientRendered === true && !fetchResult.renderAvailable
      ? ["Target is client-rendered but was fetched without --render; raw HTML may be a shell."]
      : [],
  };
}
