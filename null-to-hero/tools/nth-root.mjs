/**
 * Resolve the NullToHero root directory, whatever host is running the skill.
 *
 * Order of resolution, first hit wins:
 *   1. NTH_ROOT              set by the installer or by the user
 *   2. CLAUDE_PLUGIN_ROOT    set by Claude Code when the plugin is loaded
 *   3. walk up from this file until a directory holds .claude-plugin/plugin.json
 *
 * The third branch is the safety net: it works from a plain clone, from an
 * extracted archive and from a copy installed under ~/.agents/skills, as long as
 * the tools/ directory travelled with the manifest.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = path.join(".claude-plugin", "plugin.json");

function hasMarker(dir) {
  try {
    return fs.statSync(path.join(dir, MARKER)).isFile();
  } catch {
    return false;
  }
}

function walkUp(from) {
  let dir = from;
  for (;;) {
    if (hasMarker(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function nthRoot() {
  for (const key of ["NTH_ROOT", "CLAUDE_PLUGIN_ROOT"]) {
    const value = process.env[key];
    if (value && hasMarker(value)) return path.resolve(value);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const found = walkUp(here);
  if (found) return found;

  throw new Error(
    "NullToHero root not found. Set NTH_ROOT to the directory that holds " +
      ".claude-plugin/plugin.json, or run this script from inside the checkout."
  );
}

export function nthPath(...segments) {
  return path.join(nthRoot(), ...segments);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(nthRoot() + "\n");
}
