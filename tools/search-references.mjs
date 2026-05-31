#!/usr/bin/env node
// Keyword search over tools/reference-index.json. Returns the most relevant
// reference files so a skill opens only what it needs instead of loading large
// docs whole. Pure Node standard library, no dependencies.
// Usage: node tools/search-references.mjs "<query>" [--skill seo|siteasy|inspect] [--max 5]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let skill = null;
let max = 5;
const terms = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--skill") skill = args[++i];
  else if (args[i] === "--max") max = parseInt(args[++i], 10) || 5;
  else terms.push(args[i]);
}
if (!terms.length) {
  console.error('Usage: node tools/search-references.mjs "<query>" [--skill <name>] [--max <n>]');
  process.exit(1);
}
const q = terms.join(" ").toLowerCase().match(/[a-z0-9]+/g) || [];

const indexPath = join(root, "tools", "reference-index.json");
let index;
try {
  index = JSON.parse(readFileSync(indexPath, "utf8"));
} catch {
  // Auto-build once if the index is missing (e.g. fresh install).
  try {
    execFileSync(process.execPath, [join(root, "tools", "build-index.mjs")], { stdio: "ignore" });
    index = JSON.parse(readFileSync(indexPath, "utf8"));
  } catch {
    console.error("Index missing and auto-build failed. Run: node tools/build-index.mjs");
    process.exit(1);
  }
}

const scored = index
  .filter((e) => !skill || e.skill === skill)
  .map((e) => {
    const hay = new Set(e.keywords);
    let score = 0;
    for (const t of q) {
      if (hay.has(t)) score += 3;
      else if (e.title.toLowerCase().includes(t)) score += 2;
      else if (e.path.toLowerCase().includes(t)) score += 1;
    }
    return { e, score };
  })
  .filter((x) => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, max);

if (!scored.length) {
  console.log("No matching reference. Try broader terms.");
  process.exit(0);
}
console.log(`Top ${scored.length} references for "${terms.join(" ")}":\n`);
for (const { e, score } of scored) {
  console.log(`  [${score}] ${e.skill}: ${e.title}`);
  console.log(`        ${e.path}`);
}
