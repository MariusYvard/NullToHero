#!/usr/bin/env node
// live-accept.mjs — deterministic source mutation on accept / discard.
// Exports applyAccept / applyDiscard for the daemon; also runnable as CLI.
//
// CLI: live-accept.mjs --id EVENT --file PATH --variant N            (accept)
//      live-accept.mjs --id EVENT --file PATH --discard              (discard)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { projectRoot, gitTrackedFiles, looksGenerated, resolveInRoot } from "./live-core.mjs";

const VAR_RE = (n) => new RegExp(
  `<div\\s+data-siteasy-variant=["']${n}["'][^>]*>[\\s\\S]*?<\\/div>`, "m");

export function applyAccept({ root, file, variantId }) {
  const full = resolveInRoot(root, file);
  if (!full) return { handled: false, error: "path_outside_root", file };
  if (!existsSync(full)) return { handled: false, error: "file_missing", file };
  const tracked = gitTrackedFiles(root);
  const rel = file.split("\\").join("/");
  const content = readFileSync(full, "utf8");
  if ((tracked && !tracked.has(rel)) || looksGenerated(content)) {
    // Refuse to persist into generated/untracked files — agent handles via fallback.
    return { handled: false, mode: "fallback", file,
             hint: "Accepted variant lives in a generated/untracked file; write to true source." };
  }
  // Leave a carbonize block for the agent to finalize (semantic rewrite).
  return { handled: true, carbonize: true, file, variantId,
           todo: [
             "Move scoped CSS into the project stylesheet, retargeting @scope to semantic classes",
             "Bake in any data-siteasy-params values, dropping unused branches",
             "Unwrap the accepted variant div and drop data-siteasy-* plumbing attributes",
             "Delete the inline <style>, param-values comment, and carbonize markers",
             "Remove @scope rules for non-accepted variants",
           ] };
}

export function applyDiscard({ root, file }) {
  // Strip all variant scaffolding markers and blocks; restore original.
  const full = resolveInRoot(root, file);
  if (!full) return { handled: false, error: "path_outside_root", file };
  if (!existsSync(full)) return { handled: true, file };
  let s = readFileSync(full, "utf8");
  s = s.replace(/[ \t]*(<!--|\{\/\*) Variants: insert below this line (-->|\*\/\})\n?/g, "");
  s = s.replace(/<style[^>]*data-siteasy-css[^>]*>[\s\S]*?<\/style>\n?/g, "");
  s = s.replace(/<div\s+data-siteasy-variant=["']\d+["'][^>]*>[\s\S]*?<\/div>\n?/g, "");
  s = s.replace(/<!-- siteasy-(variants|carbonize)-(start|end)[^>]*-->\n?/g, "");
  writeFileSync(full, s);
  return { handled: true, file };
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const root = projectRoot();
  const file = get("--file");
  let res;
  if (args.includes("--discard")) res = applyDiscard({ root, file });
  else res = applyAccept({ root, file, variantId: get("--variant") });
  process.stdout.write(JSON.stringify(res) + "\n");
}
