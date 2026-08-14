#!/usr/bin/env node
// detect-csp.mjs — detect a Content Security Policy in the project and classify
// its patch mechanism. Output JSON: { shape, signals }.
// shape ∈ append-arrays | append-string | middleware | meta-tag | null
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, listFiles } from "./live-core.mjs";

const root = projectRoot();
const files = listFiles(root);
const read = (rel) => { try { return readFileSync(join(root, rel), "utf8"); } catch { return ""; } };

const signals = [];
let shape = null;

const configFiles = files.filter((f) =>
  /(^|\/)(next\.config\.[mc]?[jt]s|svelte\.config\.[mc]?js|nuxt\.config\.[mc]?[jt]s)$/.test(f));
const middlewareFiles = files.filter((f) => /(^|\/)middleware\.[mc]?[jt]s$/.test(f));
const htmlFiles = files.filter((f) => /\.(html?|vue|svelte|astro|[jt]sx)$/.test(f));

// 1. Structured directive arrays (append-arrays)
for (const f of configFiles) {
  const c = read(f);
  if (/csp\s*:\s*\{|contentSecurityPolicy|additionalScriptSrc|csp\.directives|['"]script-src['"]\s*:\s*\[/.test(c)) {
    signals.push({ file: f, kind: "directive-arrays" });
    shape = shape || "append-arrays";
  }
}
// 2. Literal CSP value string (append-string)
if (!shape) {
  for (const f of configFiles) {
    const c = read(f);
    if (/Content-Security-Policy|script-src\s+'self'|connect-src\s+'self'/.test(c)) {
      signals.push({ file: f, kind: "value-string" });
      shape = "append-string";
    }
  }
}
// 3. Middleware-set CSP
if (!shape) {
  for (const f of middlewareFiles) {
    const c = read(f);
    if (/Content-Security-Policy/i.test(c)) {
      signals.push({ file: f, kind: "middleware" });
      shape = "middleware";
    }
  }
}
// 4. <meta http-equiv="Content-Security-Policy">
if (!shape) {
  for (const f of htmlFiles) {
    const c = read(f);
    if (/http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(c)) {
      signals.push({ file: f, kind: "meta-tag" });
      shape = "meta-tag";
    }
  }
}

process.stdout.write(JSON.stringify({ shape, signals }) + "\n");
