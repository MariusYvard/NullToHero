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
// the rules it did not verify, and exits 0. The count is not written here: it
// used to say five, the probes grew to thirteen, and the comment did not. A skipped test that reports
// "passed" is how a suite starts lying, so it reports SKIPPED and prints the
// command that turns it on.

import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { probe, RENDERED_RULE_IDS } from "../null-to-hero/tools/inspect/rendered.mjs";
import { probe as threeProbe, installSource, THREE_RULE_IDS } from "../null-to-hero/tools/inspect/three.mjs";
import { reducedMotionProbe, sweep, evaluateSweep, installSampler, MOTION_RULE_IDS } from "../null-to-hero/tools/inspect/motion.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FX = join(ROOT, "null-to-hero", "tools", "inspect", "fixtures", "rendered");
const FX3 = join(ROOT, "null-to-hero", "tools", "inspect", "fixtures", "three");
const FXM = join(ROOT, "null-to-hero", "tools", "inspect", "fixtures", "motion");
const WAIT = 2500;                       // past the 2s boundary rule 27 judges against
const VIEWPORT = { width: 1280, height: 800 };

let failures = 0;
const ok = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const no = (m) => { failures++; console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); };
const ok3 = (cond, m) => (cond ? ok(m) : no(m));

console.log("\nRendered-page probe\n");

// P10. --require-browser turns the silent skip into a loud failure. CI passes it,
// so a missing browser fails the job instead of reporting a pass over thirteen
// rules nobody verified. A developer without Playwright still gets the skip.
const requireBrowser = process.argv.includes("--require-browser");

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  const ids = [...RENDERED_RULE_IDS, ...THREE_RULE_IDS, ...MOTION_RULE_IDS].join(", ");
  if (requireBrowser) {
    console.error(`  \x1b[31mFAIL\x1b[0m  --require-browser was passed and Playwright is absent.`);
    console.error(`          Rules ${ids} were NOT verified, and this run refuses to report a pass.`);
    process.exit(1);
  }
  console.log(`  \x1b[33mSKIPPED\x1b[0m  Playwright is absent, so rules ${ids} were NOT verified on this run.`);
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

// ── three.js probe ────────────────────────────────────────────────────────────
// A separate section because the mechanism is different: the collector has to be
// installed as an init script, before the page's own three.js constructs a
// renderer. Installing it after the fact collects nothing, so the first thing
// asserted here is that the harness itself is wired the way the field recipe is.
console.log("\nthree.js probe");
{
  const browser3 = await chromium.launch(process.env.NTH_CHROMIUM ? { executablePath: process.env.NTH_CHROMIUM } : {});
  const run = async (file, withInstall = true) => {
    const page = await browser3.newPage({ viewport: VIEWPORT });
    if (withInstall) await page.addInitScript({ content: installSource() });
    await page.goto(pathToFileURL(join(FX3, file)).href, { waitUntil: "load" });
    await page.waitForTimeout(300);
    const r = await page.evaluate(threeProbe, {});
    await page.close();
    return r;
  };

  const bad = await run("bad.html");
  ok3(bad.detected && bad.revision === "186", `detects three.js r${bad.revision} from the canvas attribute alone`);
  ok3(bad.installed && bad.renderers === 1, "the init-script collector received the renderer");
  for (const id of THREE_RULE_IDS) {
    const own = bad.findings.filter(f => f.id === id);
    if (own.length) ok(`rule ${id} fires on bad.html — ${own[0].evidence.slice(0, 76)}`);
    else no(`rule ${id}: silent on bad.html`);
  }
  // The measurement is the point, not the verdict: a naive read of info.render.calls
  // against a site loop that resets every frame would report whatever the last
  // frame happened to hold.
  const calls = bad.scenes[0] && bad.scenes[0].drawCalls;
  ok3(calls >= 1300 && calls <= 1500, `draw calls measured at ${calls} through autoReset, not read blind`);

  const good = await run("good.html");
  const noisy = good.findings.filter(f => THREE_RULE_IDS.includes(f.id));
  if (noisy.length) no(`the clean fixture trips ${noisy.map(f => f.id).join(", ")}: ${noisy[0].evidence}`);
  else ok("no rule fires on the clean fixture");

  // Without the init script, cost cannot be measured and the probe has to say so
  // rather than returning a short findings list that reads as a lighter scene.
  // What survives is real and should survive: the colour-space findings come from
  // the scene, not from the renderer, so they do not depend on the collector.
  const late = await run("bad.html", false);
  const costIds = late.findings.filter(f => /pixel ratio|draw calls/.test(f.evidence));
  ok3(!late.installed && costIds.length === 0 &&
      late.notes.some(n => /not installed before/.test(n)),
      "with no init script it drops the cost findings and says cost was not measured");
  ok3(late.findings.some(f => f.id === 81),
      "...and keeps the scene findings, which never needed the collector");

  await browser3.close();
}

// ── reduced-motion probe ──────────────────────────────────────────────────────
// A third mechanism again: this one needs the RUNNER to emulate a media feature.
// The probe cannot do it from inside the page, which is exactly why it checks
// that the emulation took before it judges anything.
console.log("\nReduced-motion probe");
{
  const runMotion = async (file, reducedMotion) => {
    const b = await chromium.launch(process.env.NTH_CHROMIUM ? { executablePath: process.env.NTH_CHROMIUM } : {});
    const page = await b.newPage({ viewport: VIEWPORT, reducedMotion });
    await page.goto(pathToFileURL(join(FXM, file)).href, { waitUntil: "load" });
    const r = await page.evaluate(reducedMotionProbe, { sampleMs: 600 });
    await b.close();
    return r;
  };

  const bad = await runMotion("84-bad.html", "reduce");
  if (bad.findings.some(f => f.id === 84)) ok(`rule 84 fires on 84-bad.html — ${bad.findings[0].evidence.slice(0, 76)}`);
  else no("rule 84: silent on 84-bad.html");

  const good = await runMotion("84-good.html", "reduce");
  if (good.findings.length) no(`rule 84: fires on its clean fixture — ${good.findings[0].evidence}`);
  else ok("rule 84 stays quiet on the clean case");
  ok3(good.sampled > 0, `the clean fixture had ${good.sampled} animations to clear, so its silence means something`);

  // The self-invalidation guard. Without emulation every animation on the page is
  // legitimately running, and a probe that returned an empty findings list here
  // would report the worst page in the corpus as clean.
  const unemulated = await runMotion("84-bad.html", "no-preference");
  ok3(unemulated.emulated === false && unemulated.findings.length === 0 &&
      unemulated.notes.some(n => /did not emulate/.test(n)),
      "with no emulation it refuses to judge instead of reporting clean");
}

// ── the time-axis sweep ───────────────────────────────────────────────────────
// The verdict half is unit-tested in tests/unit.mjs on hand-written matrices,
// which is the point of it being pure. What Chromium has to prove here is the
// other half: that driving document.getAnimations() actually moves the page and
// fills the matrix correctly.
console.log("\nMotion sweep, the time axis");
{
  const browserS = await chromium.launch(process.env.NTH_CHROMIUM ? { executablePath: process.env.NTH_CHROMIUM } : {});
  const runSweep = async (file) => {
    const page = await browserS.newPage({ viewport: VIEWPORT });
    await page.addInitScript({ content: installSampler() });
    await page.goto(pathToFileURL(join(FXM, file)).href, { waitUntil: "load" });
    const raw = await page.evaluate(sweep, { samples: 24 });
    await page.close();
    return { raw, verdict: evaluateSweep(raw) };
  };

  for (const id of [85, 86]) {
    const { raw, verdict } = await runSweep(`${id}-bad.html`);
    ok3(raw.advanced === true, `rule ${id}: the sweep drove the page (${raw.driven} animations, ${raw.durationMs}ms)`);
    const own = verdict.findings.filter(f => f.id === id);
    if (own.length) ok(`rule ${id} fires on ${id}-bad.html — ${own[0].evidence.slice(0, 76)}`);
    else no(`rule ${id}: silent on ${id}-bad.html`);

    const clean = await runSweep(`${id}-good.html`);
    if (clean.verdict.findings.some(f => f.id === id)) no(`rule ${id}: fires on its clean fixture`);
    else ok(`rule ${id} stays quiet on the clean case`);
  }

  // The refusal, in the browser this time. A page with nothing to drive must not
  // come back clean, because every quiet rule in that run is quiet for the wrong
  // reason.
  const dead = await runSweep("sweep-static.html");
  ok3(dead.raw.advanced === false && dead.verdict.refused === true && dead.verdict.findings.length === 0,
      "a page the sweep cannot drive is refused, not reported clean");

  await browserS.close();
}

// ── P17: --json carries the exit code the text path carries ─────────────────
// The refusal code 2, written so a caller cannot mistake a refusal for a
// success, was dropped by the transport the references recommend. Both probes
// printed their report and exited 0 regardless of its contents.
console.log("\n── P17: --json and text agree on the exit code ──");
{
  const { execFileSync } = await import("node:child_process");
  const { resolve } = await import("node:path");
  const run = (script, target, extra) => {
    try { execFileSync("node", [resolve(ROOT, script), target, ...extra], { stdio: ["ignore", "pipe", "pipe"] }); return 0; }
    catch (e) { return e.status ?? -1; }
  };
  const cases = [
    ["null-to-hero/tools/inspect/three.mjs", "null-to-hero/tools/inspect/fixtures/three/bad.html", [], "three.js probe, bad fixture"],
    ["null-to-hero/tools/inspect/three.mjs", "null-to-hero/tools/inspect/fixtures/three/good.html", [], "three.js probe, clean fixture"],
    ["null-to-hero/tools/inspect/motion.mjs", "null-to-hero/tools/inspect/fixtures/motion/sweep-static.html", ["--sweep"], "motion sweep that refuses"],
    ["null-to-hero/tools/inspect/motion.mjs", "null-to-hero/tools/inspect/fixtures/motion/85-bad.html", ["--sweep"], "motion sweep with findings"],
  ];
  for (const [script, fx, extra, label] of cases) {
    const url = "file://" + resolve(ROOT, fx);
    const text = run(script, url, extra);
    const json = run(script, url, [...extra, "--json"]);
    ok3(text === json, `${label}: text exits ${text}, --json exits ${json}`);
  }
}

console.log(failures ? `\n\x1b[31m${failures} failing\x1b[0m\n` : "\n\x1b[32mRendered, three.js and reduced-motion probes verified in Chromium.\x1b[0m\n");
process.exit(failures ? 1 : 0);
