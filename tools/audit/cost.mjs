#!/usr/bin/env node
/**
 * cost.mjs — end-of-audit cost ledger.
 *
 * Estimates agents launched, approximate tokens and elapsed time for a run so
 * cost is recorded empirically rather than guessed. The token figures are a
 * transparent HEURISTIC (chars/4 for the shared HTML, fixed prompt and output
 * budgets per agent), not a billing meter. The agent COUNT and the elapsed time
 * are exact when the orchestrator passes them in.
 *
 * Usage:
 *   node tools/audit/cost.mjs --mode full --html-bytes 120000 [--k 3] [--elapsed-ms 45000] [--md]
 *   node tools/audit/cost.mjs --agents 13 --html-bytes 90000 --md
 */

// Per-mode agent counts (single target). compare doubles full; verify re-runs
// the 3 gating agents K times.
export const AGENTS_PER_MODE = { full: 13, seo: 5, defects: 4, design: 4, quick: 3, checks: 0, verify: 3 };

// Heuristic token budgets. Documented constants, deliberately conservative.
const TOK = {
  charsPerToken: 4,
  htmlCapTokens: 30000,   // an agent receives at most this much shared page text
  agentPromptTokens: 1500, // a sub-agent's own instruction/checklist overhead
  agentOutputTokens: 700,  // a sub-agent's returned section
  supervisorPromptTokens: 2000,
  supervisorOutputTokens: 1500, // consolidation, action plan, report scaffolding
};

export function estimateCost({ mode = "full", htmlBytes = 0, k = 3, elapsedMs = null, agentsLaunched = null } = {}) {
  let runs;
  if (agentsLaunched != null) runs = agentsLaunched;
  else if (mode === "verify") runs = AGENTS_PER_MODE.verify * k;
  else runs = AGENTS_PER_MODE[mode] ?? 0;

  const htmlTokens = Math.min(Math.ceil(htmlBytes / TOK.charsPerToken), TOK.htmlCapTokens);
  const perAgentInput = htmlTokens + TOK.agentPromptTokens;
  const inputTokens = TOK.supervisorPromptTokens + runs * perAgentInput;
  const outputTokens = TOK.supervisorOutputTokens + runs * TOK.agentOutputTokens;
  const total = inputTokens + outputTokens;

  return {
    mode,
    agentsLaunched: runs,
    sharedHtmlTokens: htmlTokens,
    approxInputTokens: inputTokens,
    approxOutputTokens: outputTokens,
    approxTotalTokens: total,
    elapsedMs: elapsedMs == null ? null : Number(elapsedMs),
    notes: `Heuristic: shared HTML ~${htmlTokens} tok (chars/4, capped ${TOK.htmlCapTokens}); ${runs} agent run(s) at ~${perAgentInput} in / ${TOK.agentOutputTokens} out each, plus supervisor. Token figures are an estimate; agent count and elapsed time are exact when supplied.`,
  };
}

export function costToMarkdown(c) {
  const sec = c.elapsedMs == null ? "n/a" : `${(c.elapsedMs / 1000).toFixed(1)} s`;
  const k = (n) => n == null ? "n/a" : n.toLocaleString("en-US");
  return [
    `## Cost ledger`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Run mode | ${c.mode} |`,
    `| Agents launched | ${c.agentsLaunched} |`,
    `| Approx input tokens | ~${k(c.approxInputTokens)} |`,
    `| Approx output tokens | ~${k(c.approxOutputTokens)} |`,
    `| Approx total tokens | ~${k(c.approxTotalTokens)} |`,
    `| Elapsed | ${sec} |`,
    ``,
    `_${c.notes}_`,
  ].join("\n");
}

// ── CLI ───────────────────────────────────────────────────────────────────────
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
  const num = (n, d) => { const v = val(n, null); return v == null ? d : Number(v); };
  const c = estimateCost({
    mode: val("--mode", "full"),
    htmlBytes: num("--html-bytes", 0),
    k: num("--k", 3),
    elapsedMs: val("--elapsed-ms", null) == null ? null : num("--elapsed-ms", null),
    agentsLaunched: val("--agents", null) == null ? null : num("--agents", null),
  });
  process.stdout.write((args.includes("--md") ? costToMarkdown(c) : JSON.stringify(c, null, 2)) + "\n");
}
