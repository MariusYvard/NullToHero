#!/usr/bin/env node
// Sync the version label in docs/overview.svg to the version in plugin.json.
// Idempotent. Run after a version bump: node tools/sync-overview.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(
  readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8")
).version;
// docs/ stays at the repository root, one level above the plugin.
const svgPath = join(root, "..", "docs", "overview.svg");
const svg = readFileSync(svgPath, "utf8");
const next = svg.replace(/>v\d+\.\d+\.\d+</, `>v${version}<`);

if (next !== svg) {
  writeFileSync(svgPath, next);
  console.log(`overview.svg synced to v${version}`);
} else if (svg.includes(`>v${version}<`)) {
  console.log(`overview.svg already at v${version}`);
} else {
  console.error("overview.svg: no version label matched; check the pill text node");
  process.exit(1);
}
