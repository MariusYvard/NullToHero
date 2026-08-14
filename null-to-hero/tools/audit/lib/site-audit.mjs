// Shared helpers that assemble a SITE-AUDIT.json object from analyzer output.
// Pure Node standard library. Used by analyze.mjs (deterministic pre-pass) and
// reused by gate.mjs / eval.mjs / reaudit.mjs so the JSON shape lives in exactly
// one place.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { scoreFromChecks } from "./checks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export const sha = (s) => (s == null ? null : createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex").slice(0, 16));

// Which fetched artifacts feed each dimension. reaudit.mjs uses this to re-run
// only the dimensions whose inputs changed since the last SITE-AUDIT.json.
export const DIMENSION_INPUTS = {
  searchVisibility: ["rawHtml", "headers", "robots"],
  frontEndDefects: ["rawHtml", "renderedHtml", "styles", "scripts"],
  designQuality: ["rawHtml", "renderedHtml", "styles", "scripts"],
};

// Short content hashes of every input artifact, so a later run can tell which
// dimensions need re-auditing and which can reuse their prior agent sections.
export function inputHashes(fetchResult) {
  return {
    rawHtml: sha(fetchResult.rawHtml || ""),
    renderedHtml: sha(fetchResult.renderedHtml || null),
    styles: sha(fetchResult.linkedCss || ""),
    scripts: sha(fetchResult.linkedJs || ""),
    headers: sha(fetchResult.headers || null),
    robots: sha(fetchResult.robotsTxt || null),
  };
}


// ── remediation routing ──────────────────────────────────────────────────────
// Each deterministic check id maps to the command that fixes it (and the
// reference that command loads) via tools/data/remediation-map.csv, so a FAIL
// in SITE-AUDIT.json is an entry point into the rest of the plugin, not a dead
// end. Inspect rules route through the same file (kind=rule).

function parseCsvLine(line) {
  const out = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

let REMEDIATION = null;
export function remediationMap() {
  if (REMEDIATION) return REMEDIATION;
  REMEDIATION = {};
  try {
    const raw = readFileSync(join(HERE, "..", "..", "data", "remediation-map.csv"), "utf8");
    for (const line of raw.trim().split(/\r?\n/).slice(1)) {
      const f = parseCsvLine(line);
      if (f.length >= 5 && f[1] === "check") {
        REMEDIATION[f[0]] = { command: f[2], reference: f[3], query: f[4] || null };
      }
    }
  } catch { /* map is optional; fixWith stays null */ }
  return REMEDIATION;
}

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
  "siteasy-agent-memorability": "designQuality",
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
  const canon = checks.find(c => c.id === "canonical-url");
  const previewHost = !!(canon && canon.value && canon.value.preview);

  return {
    schemaVersion: "1.0",
    tool: "NullToHero /audit",
    pluginVersion: pluginVersion(),
    generatedAt: new Date().toISOString(),
    mode,
    target: {
      url: fetchResult.url || null,
      file: fetchResult.file || null,
      // P5 : le statut etait capture par fetch.mjs et lu par personne. Une page
      // 404 bien construite obtenait 86 sur 100 sans qu'une ligne de sortie dise
      // que le serveur n'avait pas servi la page demandee. Le chemin par page le
      // controlait deja ; c'est la page d'entree qui ne l'avait pas.
      status: fetchResult.status == null ? null : fetchResult.status,
      // The real number, not a hardcoded 1. It sat at 1 while the schema advertised
      // the field, which is a claim the tool was not entitled to make. Counts the
      // entry plus every page actually fetched, which is what the static checks ran on.
      pagesFetched: 1 + ((fetchResult.pages || []).length),
      // What the rendered sweep actually covered. A verdict over one page at scroll 0
      // and a verdict over the whole site are different claims and must not look alike.
      measured: fetchResult.computed?.contrastCoverage || null,
      render: fetchResult.render || "none",
      clientRendered: fetchResult.clientRendered === undefined ? "unknown" : fetchResult.clientRendered,
      previewHost,
      scrolly: (fetchResult.signals && fetchResult.signals.scrolly) || null,
      libs: (fetchResult.signals && fetchResult.signals.libs) || null,
    },
    /* An `overall` of 100 with a `band` of "Excellent" is a claim about the whole
       site. In mode=checks it is not: design quality has not run, and the objective
       checks cannot see whether a page is ugly, which is the half this tool exists
       to judge. So when a group scored null, the headline number and its band are
       withheld and the reader is told which half is missing. The floor stays
       available under `deterministic` for gates and CI, which is what needs a number. */
    scores: (() => {
      const unscored = Object.keys(groups).filter(g => groups[g] === null);
      if (!unscored.length) {
        return {
          overall: det.score, groups, agents, band: band(det.score),
          note: "Scores are the deterministic floor from objective checks only (mode=checks). A full /audit blends all 15 agent scores; see SITE-AUDIT-REPORT.md.",
        };
      }
      return {
        overall: null,
        groups,
        agents,
        band: null,
        deterministicFloor: det.score,
        note: `No overall score: ${unscored.join(", ")} did not run in mode=${mode}, so a headline number would rate the site on the half that was measured and stay silent about the half that was not. The deterministic floor over the checks that did run is ${det.score}/100. Run a full /audit (all 15 agents) for a site-level score.`,
      };
    })(),
    deterministic: {
      score: det.score, fails: det.fails, warns: det.warns,
      notMeasured: det.notMeasured, criticalFails: det.criticalFails,
      // P4. Le dénominateur voyage avec le score, sans quoi la porte ne peut pas
      // savoir sur quoi il a été calculé. provisionalScore est le chiffre d'avant
      // la bascule, gardé pour que le déploiement de 6.4 puisse annoncer l'écart.
      coverage: det.coverage, measured: det.measured, total: det.total,
      provisionalScore: det.provisionalScore,
    },
    inputs: { hashes: inputHashes(fetchResult), dimensions: DIMENSION_INPUTS },
    checks: checks.map(c => ({ ...c, source: "analyzer", fixWith: remediationMap()[c.id] || null })),
    cost: null,
    partialCoverage: fetchResult.clientRendered === true && !fetchResult.renderAvailable
      ? ["Target is client-rendered but was fetched without --render; raw HTML may be a shell."]
      : [],
  };
}
