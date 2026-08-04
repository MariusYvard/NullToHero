#!/usr/bin/env node
// NullToHero :: anti-pattern detector
// Usage: node tools/inspect/detect.mjs <file|folder> [--json] [--fail-on critical|important|any]
//
// Runs the deterministic rules in rules.mjs over local HTML and CSS and reports
// findings against tools/data/inspect-rules.csv, so every line of output carries
// the rule id, its severity, why it matters and the standard it comes from.
//
// No model, no network, no page execution. It reads files. That is what makes it
// safe to point at a stranger's repository and cheap enough to put in a hook.
//
// Scope, stated so nobody reads more into a clean run than it earned: these rules
// see source text, not layout. "Does this overflow at 375px" and "is this contrast
// ratio met once the cascade resolves" need a rendered page, and live in
// /inspect preview and in the audit Playwright pass. A clean report here means
// the named defects are absent, not that the page is good.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { runRules, RULES } from "./rules.mjs";
import { runChecks } from "../audit/lib/checks.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;
const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith("--"));
const asJson = args.includes("--json");
const failOn = (args.includes("--fail-on") ? args[args.indexOf("--fail-on") + 1] : "critical");

if (!target) {
  console.error("usage: node tools/inspect/detect.mjs <file|folder> [--json] [--fail-on critical|important|any]");
  process.exit(2);
}

// ── registry ─────────────────────────────────────────────────────────────────
const parseCsv = (text) => {
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
const rows = parseCsv(readFileSync(join(ROOT, "tools/data/inspect-rules.csv"), "utf8").trim());
const head = rows[0];
const meta = new Map();
for (const r of rows.slice(1)) {
  const o = Object.fromEntries(head.map((h, i) => [h, r[i]]));
  if (o.id) meta.set(Number(o.id), o);
}

// ── collect ──────────────────────────────────────────────────────────────────
const SKIP = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", "vendor"]);
const files = [];
const walk = (p) => {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const n of readdirSync(p)) { if (!SKIP.has(n)) walk(join(p, n)); }
  } else if ([".html", ".htm", ".css", ".js", ".mjs", ".jsx", ".ts", ".tsx"].includes(extname(p).toLowerCase())) {
    files.push(p);
  }
};
try { walk(target); } catch (e) { console.error(`cannot read ${target}: ${e.message}`); process.exit(2); }

if (!files.length) {
  console.error(`no .html or .css under ${target}`);
  process.exit(2);
}

// A page and its sheet are one unit: a rule about focus outlines needs the CSS,
// a rule about alt text needs the markup. Scan per directory so a sheet next to
// its page is seen with it, and inline <style> is picked up from the markup.
const byDir = new Map();
for (const f of files) {
  const d = f.slice(0, f.lastIndexOf("/"));
  if (!byDir.has(d)) byDir.set(d, { html: [], css: [], js: [] });
  const ext = extname(f).toLowerCase();
  byDir.get(d)[ext === ".css" ? "css" : ext === ".html" || ext === ".htm" ? "html" : "js"].push(f);
}

// Two sources, deliberately. rules.mjs holds the registry rules this engine
// implements. checks.mjs holds 26 static checks that already existed to serve
// /audit on a URL and had never been reachable from a local scan. Reusing them
// beats reimplementing them: two implementations of "heading order" would drift,
// which is the exact failure the canonical-laws guard exists to prevent.
const VERDICT_SEVERITY = { FAIL: "important", WARN: "medium" };
const results = [];
for (const [dir, group] of byDir) {
  const sheetText = group.css.map(f => readFileSync(f, "utf8")).join("\n");

  // Scripts are scanned per file, not folded into the page pass, so a finding
  // names the file it is actually in. A detector that points at the wrong file
  // is one a reader stops trusting after the second time.
  for (const j of group.js) {
    const js = readFileSync(j, "utf8");
    for (const f of runRules({ js })) results.push({ ...f, file: relative(ROOT, j) });
  }

  const targets = group.html.length ? group.html : [null];
  for (const h of targets) {
    const html = h ? readFileSync(h, "utf8") : "";
    const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join("\n");
    const css = `${sheetText}\n${inline}`;
    const where = relative(ROOT, h || dir);
    const inlineJs = [...html.matchAll(/<script(?![^>]+\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join("\n");
    for (const f of runRules({ html, css, js: inlineJs })) results.push({ ...f, file: where });
    if (!h) continue;
    for (const c of runChecks({ rawHtml: html, css })) {
      if (c.method !== "static") continue;
      if (c.verdict !== "FAIL" && c.verdict !== "WARN") continue;
      results.push({
        id: null, check: c.id, file: where, evidence: c.detail,
        rule: c.label, category: c.dimension,
        severity: c.critical && c.verdict === "FAIL" ? "critical" : VERDICT_SEVERITY[c.verdict],
        why: "", source: "tools/audit/lib/checks.mjs",
      });
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
const RANK = { critical: 0, important: 1, warning: 2, medium: 3, low: 4 };
const enriched = results.map(f => {
  if (f.id === null) return f;                       // already carries its own metadata
  const m = meta.get(f.id) || {};
  return { ...f, rule: m.rule || `rule ${f.id}`, severity: m.severity || "medium",
           category: m.category || "", why: m.why || "", source: m.source || "" };
}).sort((a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9) ||
                  String(a.id ?? a.check).localeCompare(String(b.id ?? b.check)));

if (asJson) {
  console.log(JSON.stringify({
    scanned: files.length, registryRules: RULES.length, findings: enriched,
  }, null, 2));
} else {
  console.log(`\nNullToHero detect — ${files.length} files, ${RULES.length} registry rules plus 26 static checks\n`);
  if (!enriched.length) {
    console.log("  No named defect found.");
    console.log("  This covers the rules listed above only. Layout, resolved contrast and");
    console.log("  runtime behaviour need /inspect preview.\n");
  } else {
    let last = null;
    for (const f of enriched) {
      if (f.severity !== last) { console.log(`  ${f.severity.toUpperCase()}`); last = f.severity; }
      console.log(`    [${String(f.id ?? f.check).padStart(2)}] ${f.rule} — ${f.file}`);
      console.log(`         ${f.evidence}`);
      if (f.why) console.log(`         why: ${f.why}`);
      if (f.source) console.log(`         source: ${f.source}`);
    }
    const counts = enriched.reduce((a, f) => (a[f.severity] = (a[f.severity] || 0) + 1, a), {});
    console.log(`\n  ${enriched.length} findings: ` +
      Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ") + "\n");
  }
}

const trip = failOn === "any" ? enriched.length
  : enriched.filter(f => (RANK[f.severity] ?? 9) <= (RANK[failOn] ?? 0)).length;
process.exit(trip ? 1 : 0);
