#!/usr/bin/env node
/**
 * cost.mjs — end-of-audit cost ledger.
 *
 * Estimates agents launched, approximate tokens and elapsed time for a run so
 * cost is recorded empirically rather than guessed. The token figures are a
 * transparent HEURISTIC, calibrated to an observed full run (~1M tokens): the
 * dominant term is a per-agent HARNESS overhead (the sub-agent system prompt,
 * tool schemas, the several Read round-trips over the shared files, and the
 * agent's own reasoning), not the shared HTML. A naive prompt+HTML+output model
 * undercounts this by roughly 6x, which is why an earlier estimate reported ~156k
 * for a run that actually cost ~1M. The agent COUNT and the elapsed time are exact
 * when the orchestrator passes them in.
 *
 * Usage:
 *   node tools/audit/cost.mjs --mode full --html-bytes 120000 [--k 3] [--elapsed-ms 45000] [--md]
 *   node tools/audit/cost.mjs --agents 14 --html-bytes 90000 --md
 */

// Per-mode agent counts (single target). compare doubles full; verify re-runs
// the 3 gating agents K times.
export const AGENTS_PER_MODE = { full: 14, seo: 5, defects: 4, design: 5, quick: 3, checks: 0, verify: 3 };

// Heuristic token budgets. Documented constants, calibrated to a real run.
const TOK = {
  charsPerToken: 4,
  sharedFilesCapTokens: 40000,   // raw + rendered + CSS + JS an agent may read, capped
  agentHarnessTokens: 42000,     // per-agent fixed overhead, amortized: the sub-agent
                                 // system prompt, tool schemas, several Read
                                 // round-trips over the shared files, and reasoning.
                                 // This term DOMINATES the cost of a run.
  agentPromptTokens: 2000,       // the agent's own instruction / checklist
  agentOutputTokens: 1500,       // the returned section
  supervisorPromptTokens: 3000,
  supervisorOutputTokens: 4000,  // consolidation, action plan, report scaffolding
};

export function estimateCost({ mode = "full", htmlBytes = 0, k = 3, elapsedMs = null, agentsLaunched = null } = {}) {
  let runs;
  if (agentsLaunched != null) runs = agentsLaunched;
  else if (mode === "verify") runs = AGENTS_PER_MODE.verify * k;
  else runs = AGENTS_PER_MODE[mode] ?? 0;

  const sharedTokens = Math.min(Math.ceil(htmlBytes / TOK.charsPerToken), TOK.sharedFilesCapTokens);
  const perAgentInput = sharedTokens + TOK.agentHarnessTokens + TOK.agentPromptTokens;
  const inputTokens = TOK.supervisorPromptTokens + runs * perAgentInput;
  const outputTokens = TOK.supervisorOutputTokens + runs * TOK.agentOutputTokens;
  const total = inputTokens + outputTokens;

  return {
    mode,
    agentsLaunched: runs,
    sharedHtmlTokens: sharedTokens,
    approxInputTokens: inputTokens,
    approxOutputTokens: outputTokens,
    approxTotalTokens: total,
    elapsedMs: elapsedMs == null ? null : Number(elapsedMs),
    notes: `Heuristic calibrated to an observed full run (~1M tokens): shared files ~${sharedTokens} tok (chars/4, capped ${TOK.sharedFilesCapTokens}) plus a per-agent harness overhead of ~${TOK.agentHarnessTokens} tok (sub-agent system prompt, tool schemas, Read round-trips, reasoning) that dominates; ${runs} agent run(s), plus supervisor. Agent count and elapsed time are exact when supplied; token figures are an estimate.`,
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
