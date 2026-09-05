#!/usr/bin/env node
// live-wrap.mjs — locate the picked element in project source and insert a
// variant marker. Output: { file, insertLine, commentSyntax } or an error with
// fallback: "agent-driven". Refuses to write into generated files.
//
// Usage: live-wrap.mjs --id ID --count N --element-id EID --classes a,b --tag div
//        --text "snippet" [--file PATH] [--query "raw text"]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, readConfig, resolveConfigFiles, gitTrackedFiles,
         looksGenerated, commentSyntaxFor, listFiles } from "./live-core.mjs";

const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const out = (o) => { process.stdout.write(JSON.stringify(o) + "\n"); process.exit(o.error ? 1 : 0); };

const root = projectRoot();
const elementId = get("--element-id");
const classes = (get("--classes") || "").split(",").map((s) => s.trim()).filter(Boolean);
const tag = get("--tag");
const text = (get("--text") || "").trim();
const query = get("--query");
const explicitFile = get("--file");

const cfgRes = readConfig(root);
const cfg = cfgRes.ok ? cfgRes.config : { files: ["**/*.html"] };
const tracked = gitTrackedFiles(root); // Set or null
const generatedList = new Set((cfg.generatedFiles || []).map((s) => s.split("\\").join("/")));

function isSource(rel) {
  if (generatedList.has(rel)) return false;
  if (tracked && !tracked.has(rel)) return false;
  const content = readSafe(rel);
  if (content !== null && looksGenerated(content)) return false;
  return true;
}
function readSafe(rel) { try { return readFileSync(join(root, rel), "utf8"); } catch { return null; } }

// Candidate files: served config files plus tracked source of common types.
const served = resolveConfigFiles(cfg, root);
const pageRootHtml = listFiles(root).filter((f) => /^(public|src|app|pages)\/.+\.(html?|vue|svelte|astro|[jt]sx)$/.test(f));
const candidates = explicitFile ? [explicitFile.split("\\").join("/")] : [...new Set([
  ...served,
  ...(tracked ? [...tracked].filter((f) => /\.(html?|vue|svelte|astro|[jt]sx)$/.test(f)) : []),
  ...pageRootHtml,
])];

// Scoring: id match (100) > all classes + tag (60) > text snippet (40) > query (20)
function locate(rel) {
  const content = readSafe(rel);
  if (content === null) return null;
  const lines = content.split("\n");
  const textNeedle = text.slice(0, 80).toLowerCase();
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const low = ln.toLowerCase();
    let score = 0;
    if (elementId && new RegExp(`id\\s*=\\s*["'{]?${escapeRe(elementId)}\\b`).test(ln)) score += 100;
    if (tag && new RegExp(`<${escapeRe(tag)}\\b`).test(ln)) score += 15;
    if (classes.length) {
      const hit = classes.filter((c) => new RegExp(`(class|className)\\s*=\\s*["'{][^"'}]*\\b${escapeRe(c)}\\b`).test(ln)).length;
      if (hit === classes.length) score += 45; else score += hit * 10;
    }
    if (textNeedle && low.includes(textNeedle)) score += 40;
    if (query && low.includes(query.toLowerCase())) score += 20;
    if (score > 0 && (!best || score > best.score)) best = { line: i, score };
  }
  return best;
}
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

const matches = [];
for (const rel of candidates) {
  const loc = locate(rel);
  if (loc) matches.push({ file: rel, ...loc, source: isSource(rel) });
}
matches.sort((a, b) => b.score - a.score);

if (matches.length === 0) {
  out({ error: "element_not_found", fallback: "agent-driven",
        hint: "Element not found in any project file; likely runtime-injected. Resolve the component/template that renders it." });
}

// Top match by score; prefer a source file at the top score band.
const MIN_CONFIDENCE = 40; // id(100), classes+tag(60), text(40) qualify; bare tag(15) does not
if (matches[0].score < MIN_CONFIDENCE) {
  out({ error: "element_not_found", fallback: "agent-driven",
        hint: "No confident match (only a weak tag-level hit). Likely runtime-injected or in a file not scanned; resolve the rendering component manually." });
}
const topScore = matches[0].score;
const band = matches.filter((m) => m.score >= topScore - 5);
const sourceMatch = band.find((m) => m.source);

if (!sourceMatch) {
  const gen = band[0];
  out({ error: "element_not_in_source", generatedMatch: gen.file, fallback: "agent-driven",
        hint: "Element resolves only inside a generated file; edit the generator/template instead." });
}

if (explicitFile && !sourceMatch.source) {
  out({ error: "file_is_generated", file: explicitFile, fallback: "agent-driven",
        hint: "The --file you supplied is a generated file; point at true source." });
}

if (band.filter((m) => m.source).length > 1 && !elementId) {
  out({ error: "element_ambiguous", fallback: "agent-driven",
        candidates: band.filter((m) => m.source).map((m) => ({ file: m.file, line: m.line + 1, score: m.score })) });
}

// Insert the marker comment above the located opening tag.
const rel = sourceMatch.file;
const full = join(root, rel);
const syntax = commentSyntaxFor(rel);
const marker = syntax === "jsx" ? "{/* Variants: insert below this line */}" : "<!-- Variants: insert below this line -->";
const content = readFileSync(full, "utf8");
const lines = content.split("\n");
const indent = (lines[sourceMatch.line].match(/^\s*/) || [""])[0];
lines.splice(sourceMatch.line, 0, indent + marker);
writeFileSync(full, lines.join("\n"));

out({ file: rel, insertLine: sourceMatch.line + 1, commentSyntax: syntax });
