#!/usr/bin/env node
// NullToHero :: fixture harness for the rendered-page probe
//
// Same contract as tests/inspect-rules.mjs: every rule owes a fixture that must
// fire and one that must not, and a clean fixture must not trip an unrelated
// rule. The difference is that these rules need a laid-out page, so the fixtures
// are opened in Chromium instead of read as text.
//
// Playwright is not a dependency of this repository and this test does not make
// it one. When it is missing the harness says so at the top of its output, names
// the five rules it did not verify, and exits 0. A skipped test that reports
// "passed" is how a suite starts lying, so it reports SKIPPED and prints the
// command that turns it on.

import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { probe, RENDERED_RULE_IDS } from "../tools/inspect/rendered.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FX = join(ROOT, "tools", "inspect", "fixtures", "rendered");
const WAIT = 2500;                       // past the 2s boundary rule 27 judges against
const VIEWPORT = { width: 1280, height: 800 };

let failures = 0;
const ok = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const no = (m) => { failures++; console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); };

console.log("\nRendered-page probe\n");

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  console.log(`  \x1b[33mSKIPPED\x1b[0m  Playwright is absent, so rules ${RENDERED_RULE_IDS.join(", ")} were NOT verified on this run.`);
  console.log(`            Turn it on with: npm i -D playwright && npx playwright install chromium`);
  console.log(`            The same probe also runs in Claude in Chrome: node tools/inspect/rendered.mjs --source\n`);
  process.exit(0);
}

// Every fixture is <id>-<bad|good>.html, so the harness cannot drift from the
// directory: a rule with no fixture is a failure, not a silent absence.
const files = readdirSync(FX).filter(f => f.endsWith(".html"));
// NTH_CHROMIUM points at a Chromium already on the machine. CI images and most
// dev boxes have one, and Playwright refuses to launch when its own browser
// build does not match the installed package version, which is a download this
// suite should not be triggering.
const executablePath = process.env.NTH_CHROMIUM || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: VIEWPORT });

const results = new Map();
for (const file of files.sort()) {
  await page.goto(pathToFileURL(join(FX, file)).href, { waitUntil: "load" });
  // Actually wait. Passing elapsedMs without spending it made the harness assert
  // a timing condition it never met: rule 68 read every video before it had a
  // chance to start, and rule 27 passed only because its fixture is static.
  await page.waitForTimeout(WAIT);
  const { findings } = await page.evaluate(probe, { elapsedMs: WAIT });
  results.set(file, findings);
}
await browser.close();

console.log("Fixtures, both directions");
for (const id of RENDERED_RULE_IDS) {
  // A rule can carry more than one firing fixture (<id>-bad.html, <id>-bad2.html)
  // when it reports genuinely different shapes. Every one of them must fire, so
  // adding a branch without a fixture is a failure and not a quiet gap.
  const bad = files.filter(f => new RegExp(`^${id}-bad\\d*\\.html$`).test(f)).sort();
  if (!bad.length) no(`rule ${id}: no bad fixture`);
  for (const file of bad) {
    const own = (results.get(file) || []).filter(f => f.id === id);
    if (!own.length) no(`rule ${id}: silent on ${file}`);
    else ok(`rule ${id} fires on ${file} — ${own[0].evidence.slice(0, 76)}`);
  }
  const clean = `${id}-good.html`;
  const hits = results.get(clean);
  if (!hits) { no(`rule ${id}: no clean fixture`); continue; }
  const own = hits.filter(f => f.id === id);
  if (own.length) no(`rule ${id}: fires on its clean fixture — ${own[0].evidence}`);
  else ok(`rule ${id} stays quiet on the clean case`);
}

console.log("\nCross-contamination on clean fixtures");
let noise = 0;
for (const id of RENDERED_RULE_IDS) {
  for (const stray of (results.get(`${id}-good.html`) || []).filter(f => f.id !== id)) {
    noise++;
    no(`rule ${id}'s clean fixture trips rule ${stray.id}: ${stray.evidence}`);
  }
}
if (!noise) ok("no clean fixture trips an unrelated rule");

console.log(failures ? `\n\x1b[31m${failures} failing\x1b[0m\n` : "\n\x1b[32mRendered probe verified in Chromium.\x1b[0m\n");
process.exit(failures ? 1 : 0);
