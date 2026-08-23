#!/usr/bin/env node
// vendor-decap.mjs — puts the editor in the repository, at one exact version.
//
// WHY IT IS NOT ONE FILE
// ----------------------
// `decap-cms.js` is code-split: the entry is about five megabytes and it fetches
// ninety-two more chunks at runtime, from its own directory, resolved through
// `document.currentScript`. Vendoring the entry alone gives a login screen that
// loads and an editor that never opens, and the failure shows up as a network
// error in a console the client will not have open. So the whole set goes in.
//
// The source maps and the deprecated `cms.js` twins are left behind: together
// they are sixty megabytes and neither is served.
//
// Usage:
//   node vendor-decap.mjs [projectRoot] [--version 3.15.1]

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, copyFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

export const VERSION = "3.15.1";
const KEEP = /^([0-9]+\.)?decap-cms\.js$/;

export function vendor(root, version = VERSION) {
  const target = join(root, "admin", `decap-cms-${version}`);
  const work = mkdtempSync(join(tmpdir(), "nth-decap-"));
  try {
    // npm.cmd rather than a shell: passing arguments through a shell concatenates
    // them unescaped, which Node warns about and which a version string could abuse.
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    execFileSync(npm, ["pack", `decap-cms@${version}`, "--silent"],
      { cwd: work, stdio: ["ignore", "ignore", "inherit"] });
    const tarball = readdirSync(work).find(f => f.endsWith(".tgz"));
    if (!tarball) throw new Error(`npm pack produced nothing for decap-cms@${version}`);
    execFileSync("tar", ["xzf", tarball, "package/dist"], { cwd: work, stdio: "inherit" });

    const dist = join(work, "package", "dist");
    const files = readdirSync(dist).filter(f => KEEP.test(f));
    if (!files.some(f => f === "decap-cms.js")) throw new Error("the tarball carries no decap-cms.js");
    mkdirSync(target, { recursive: true });
    for (const name of files) copyFileSync(join(dist, name), join(target, name));
    return { target, files: files.length };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const isCli = () => import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli()) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--version");
  const version = at >= 0 ? args[at + 1] : VERSION;
  const root = resolve(args.find(a => !a.startsWith("--") && a !== version) || process.cwd());
  const dir = join(root, "admin", `decap-cms-${version}`);
  if (existsSync(dir)) {
    console.log(`\n${dir} already exists. Delete it to vendor again.\n`);
    process.exit(0);
  }
  const { target, files } = vendor(root, version);
  console.log(`\nVendored ${files} file(s) into ${target}.`);
  console.log("Commit them: the admin page loads nothing from a CDN, which is what lets");
  console.log("its content security policy name no external origin.\n");
}
