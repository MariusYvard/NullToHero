#!/usr/bin/env node
// Builds tools/reference-index.json from every skills/<skill>/references/*.md file.
// Lets a skill locate the right reference without loading large docs whole.
// Pure Node standard library, no dependencies.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md") && name !== "SKILL.md") out.push(p);
  }
  return out;
}

function firstHeading(text) {
  for (const line of text.split("\n")) {
    const m = line.match(/^#\s+(.+)/);
    if (m) return m[1].trim();
  }
  return null;
}

const STOP = new Set(["the","a","an","and","or","for","to","of","in","on","with","is","are","by","use","using","when","your","you"]);
function keywords(title, file) {
  const base = basename(file, ".md").replace(/-/g, " ");
  const words = `${base} ${title || ""}`.toLowerCase().match(/[a-z0-9]+/g) || [];
  return [...new Set(words.filter((w) => w.length > 2 && !STOP.has(w)))];
}

const entries = [];
for (const file of walk(skillsDir)) {
  const rel = file.slice(root.length + 1).split("\\").join("/");
  const skill = rel.split("/")[1];
  const text = readFileSync(file, "utf8");
  const title = firstHeading(text);
  entries.push({ skill, path: rel, title: title || basename(file, ".md"), keywords: keywords(title, file) });
}
entries.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(join(root, "tools", "reference-index.json"), JSON.stringify(entries, null, 2) + "\n");
console.log(`Indexed ${entries.length} reference files -> tools/reference-index.json`);

// ── reference graph ───────────────────────────────────────────────────────────
// Nodes are the reference files above; edges are every resolvable .md mention
// (markdown links, code spans or prose) in any skills/**/*.md file, SKILL.md
// command tables included. The graph is the plugin's connective tissue and the
// validator fails on orphan references (no inbound edge), so new content cannot
// land as an unreachable island. Deterministic output, committed, checked in CI.

function walkAll(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkAll(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

const nodeSet = new Set(entries.map((e) => e.path));
const edges = new Set();
const norm = (p) => {
  const parts = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") { if (parts.length === 0) return null; parts.pop(); }
    else parts.push(seg);
  }
  return parts.join("/");
};
for (const file of walkAll(skillsDir)) {
  const relSource = file.slice(root.length + 1).split("\\").join("/");
  const text = readFileSync(file, "utf8");
  const dir = relSource.split("/").slice(0, -1).join("/");
  for (const m of text.matchAll(/[A-Za-z0-9_./-]+\.md\b/g)) {
    const cand = m[0];
    const resolved = cand.startsWith("skills/") ? norm(cand) : norm(dir + "/" + cand);
    if (resolved && nodeSet.has(resolved) && resolved !== relSource) {
      edges.add(relSource + " -> " + resolved);
    }
  }
}
const inbound = {};
for (const n of nodeSet) inbound[n] = 0;
for (const e of edges) inbound[e.split(" -> ")[1]]++;
const orphans = [...nodeSet].filter((n) => inbound[n] === 0).sort();
const graph = {
  nodes: [...nodeSet].sort(),
  edges: [...edges].sort().map((e) => { const [from, to] = e.split(" -> "); return { from, to }; }),
  orphans,
};
writeFileSync(join(root, "tools", "reference-graph.json"), JSON.stringify(graph, null, 2) + "\n");
console.log(`Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${orphans.length} orphan(s) -> tools/reference-graph.json`);
if (orphans.length) for (const o of orphans) console.log(`  orphan: ${o}`);
