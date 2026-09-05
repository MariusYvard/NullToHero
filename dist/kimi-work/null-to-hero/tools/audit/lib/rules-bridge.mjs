// rules-bridge.mjs — the rules engine, expressed as audit checks.
//
// WHY THIS FILE EXISTS
// --------------------
// The plugin declares 86 rules. Eighteen of them run inside the audit's static
// checks; forty-eight run in the rules engine, which until now was reachable
// only from a separate command. An audit could therefore report a clean page
// while thirty rules the plugin knows how to detect had never been executed.
// Nobody lied: nobody ran them.
//
// The engine and the checks already shared their code in the other direction
// (the detector imports the audit's checks). This closes the loop, and it does
// it by translation rather than by a second report: every rule comes back as a
// check, with the shape the gate, the comparison and the report already speak.
//
// WHY A RULE DOES NOT MOVE THE SCORE, YET
// ---------------------------------------
// The deterministic floor is `100 - 15 x fails - 7 x warns`, with no
// denominator. Adding forty-eight measurements to a subtraction that never
// divides would put most real sites at zero and would make every historical
// score incomparable, which is a worse defect than the one being fixed. So the
// rules are carried, counted and reported, and `scoreFromChecks` skips them.
// Folding them into the score needs a formula with a denominator, and that is a
// separate change with its own calibration.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runRules, RULES } from "../../inspect/rules.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const parseCsv = (text) => {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
};

let cached = null;
export function ruleMeta(path = join(ROOT, "tools/data/inspect-rules.csv")) {
  if (cached) return cached;
  const rows = parseCsv(readFileSync(path, "utf8").trim());
  const head = rows[0];
  cached = new Map(rows.slice(1)
    .map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])))
    .filter(o => o.id)
    .map(o => [Number(o.id), o]));
  return cached;
}

// The four sub-agents that judge front-end defects. A rule is filed under the
// one that would have to argue about it in a full audit, which is why motion and
// performance sit with the code agent: at this layer they are both a pattern in
// the source, not a measurement of a running page.
const AGENT = {
  Accessibility: "inspect-agent-a11y",
  Forms: "inspect-agent-a11y",
  Typography: "inspect-agent-a11y",
  Color: "inspect-agent-a11y",
  Touch: "inspect-agent-interaction",
  Navigation: "inspect-agent-interaction",
  Layout: "inspect-agent-layout",
};
const agentFor = (category) => AGENT[category] || "inspect-agent-code";

// `low` becomes ADVISORY rather than WARN: the fact was measured, and the
// verdict exists so that a rule can be reported without pricing the site
// against it. That is the same reason the checks use it.
const VERDICT = { critical: "FAIL", important: "FAIL", medium: "WARN", warning: "WARN", low: "ADVISORY" };

export function ruleChecks({ html = "", css = "", js = "" } = {}, meta = ruleMeta()) {
  const fired = new Map();
  for (const f of runRules({ html, css, js })) {
    if (!fired.has(f.id)) fired.set(f.id, []);
    fired.get(f.id).push(f);
  }
  return RULES.map((rule) => {
    const row = meta.get(rule.id) || {};
    const hits = fired.get(rule.id) || [];
    const severity = (row.severity || "medium").toLowerCase();
    const verdict = hits.length ? (VERDICT[severity] || "WARN") : "PASS";
    return {
      id: `rule-${rule.id}`,
      label: row.rule || rule.name || `Rule ${rule.id}`,
      dimension: "Front-end Defects",
      agent: agentFor(row.category),
      verdict,
      critical: severity === "critical",
      // The schema names four methods and this is one of them: a read of the
      // source with no page executed. `source` is what says which engine read it.
      method: "static",
      severity,
      standard: row.source || null,
      detail: hits.length
        ? hits.map(h => `${h.where}: ${h.evidence}`).slice(0, 5).join(" · ")
        : "no violation found in the source",
      source: "rules",
    };
  });
}

// What the run reached, said in the terms the reader cares about. `ran` is the
// honest denominator: a rule that threw is neither a pass nor a violation.
export function ruleSummary(checks) {
  const mine = checks.filter(c => c.source === "rules");
  const by = (v) => mine.filter(c => c.verdict === v).length;
  return {
    ran: mine.length,
    fails: by("FAIL"),
    warns: by("WARN"),
    advisories: by("ADVISORY"),
    criticalFails: mine.filter(c => c.verdict === "FAIL" && c.critical).map(c => c.id),
  };
}
