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
