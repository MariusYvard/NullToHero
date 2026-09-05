#!/usr/bin/env node
// NullToHero :: motion, measured over time
//
// WHY THIS EXISTS
// ---------------
// Two rules in the registry already ask about reduced motion and both of them
// infer. Rule 21 passes any stylesheet that contains the string
// prefers-reduced-motion once, even when thirty of its thirty-one animations sit
// outside the guard. motion-reduced-guard looks for matchMedia in the script. A
// declaration is not a behaviour, and the gap between the two is where the defect
// lives: the library this rule was written against declares the guard in its
// README, scopes it to a base class, and ships 169 effects that work without that
// class.
//
// The browser can answer the question directly. Emulate the preference, sample
// the page's animations twice, and see whether anything still advanced. That is
// binary, it has no false positive, and it needs no cooperation from the site.
//
// THE SELF-INVALIDATION RULE
// --------------------------
// The probe checks the emulation took before it judges anything. If the runner
// failed to set the preference, every animation on the page is legitimately
// running and the probe would report a clean page for the worst possible reason.
// Same doctrine as `settled` in rendered.mjs: a run that could not measure says
// so, instead of returning an empty findings list that reads as a pass.

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/**
 * Runs inside a page that is ALREADY emulating prefers-reduced-motion: reduce.
 * Serialised to source, so no imports and no closure over module scope.
 *
 * @param {{sampleMs?: number, minAdvanceMs?: number}} opts
 * @returns {Promise<{emulated:boolean, sampled:number, advanced:number,
 *   infinite:number, threeFrames:number|null,
 *   findings:Array<{id:number, where:string, evidence:string}>, notes:string[]}>}
 */
export async function reducedMotionProbe(opts) {
  const { sampleMs = 1200, minAdvanceMs = 50 } = opts || {};
  const findings = [];
  const notes = [];

  // Refuse before judging. A run that did not emulate cannot clear anything.
  const emulated = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!emulated) {
    return { emulated: false, sampled: 0, advanced: 0, infinite: 0, threeFrames: null,
      findings: [],
      notes: ["the page is not reporting prefers-reduced-motion: reduce, so nothing was judged; the runner did not emulate the preference"] };
  }

  const list = () => (typeof document.getAnimations === "function" ? document.getAnimations() : []);

  const before = new Map();
  let infinite = 0;
  for (const a of list()) {
    if (a.playState !== "running") continue;
    before.set(a, typeof a.currentTime === "number" ? a.currentTime : 0);
    try {
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
      if (t && t.iterations === Infinity) infinite++;
    } catch { /* an animation without a readable effect is still counted as running */ }
  }

  // three.js counts its own render() calls, which is a second, independent
  // witness on a page that has a scene: a paused site loop does not advance it.
  const renderers = (window.__nthThree && window.__nthThree.renderers) || [];
  const frameAt = () => renderers.reduce((n, r) => n + ((r.info && r.info.render && r.info.render.frame) || 0), 0);
  const framesBefore = renderers.length ? frameAt() : null;

  await new Promise((r) => setTimeout(r, sampleMs));

  let advanced = 0;
  const movers = [];
  for (const [a, t0] of before) {
    let t1 = null;
    try { t1 = typeof a.currentTime === "number" ? a.currentTime : null; } catch { /* detached */ }
    if (t1 === null) continue;
    if (t1 - t0 > minAdvanceMs) {
      advanced++;
      const target = a.effect && a.effect.target;
      if (movers.length < 3 && target) {
        movers.push(target.tagName ? target.tagName.toLowerCase() + (target.className && typeof target.className === "string" ? "." + target.className.trim().split(/\s+/)[0] : "") : "element");
      }
    }
  }
  const framesAfter = renderers.length ? frameAt() : null;
  const threeFrames = framesBefore === null ? null : framesAfter - framesBefore;

  if (advanced > 0) {
    findings.push({ id: 84, where: "rendered",
      evidence: `${advanced} of ${before.size} running animations kept advancing ${sampleMs}ms after the reduced-motion preference was set${movers.length ? `, including ${movers.join(", ")}` : ""}` });
  }
  if (threeFrames !== null && threeFrames > 2) {
    findings.push({ id: 84, where: "rendered",
      evidence: `the three.js render loop ran ${threeFrames} more frames under reduced motion; setAnimationLoop has no notion of the preference, so a site must stop it and render one static frame` });
  }
  if (!before.size && threeFrames === null) {
    notes.push("nothing was animating when the sample started, so this run cleared nothing");
  }

  return { emulated: true, sampled: before.size, advanced, infinite, threeFrames, findings, notes };
}

/** The probe as source, for Claude in Chrome. */
export function reducedMotionSource(opts = {}) {
  return `(${reducedMotionProbe})(${JSON.stringify(opts)})`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   The time axis.

   rendered.mjs observes one moment and says so in its own header. Every spatial
   rule it runs is therefore blind to anything that is only true while an
   animation is in flight: two elements that never overlap at rest can overlap
   for 200ms in the middle of a transition, and a hero can sit motionless for
   three seconds inside a sequence that reads as continuous in the source.

   The split below is the important part. The browser produces a MATRIX, one row
   per sampled time. Node produces the VERDICT, from a pure function that never
   sees a browser. That is what makes the evaluator testable on JSON fixtures
   with no Chromium, and it is why evaluateSweep takes frames rather than a page.

   WHAT DRIVES THE PAGE
   --------------------
   document.getAnimations(). Every CSS animation, CSS transition and WAAPI
   animation on the page appears there, each with a writable currentTime and a
   readable getComputedTiming(). It is enough to discover how long the page
   animates for without knowing the framework, and to put it at an arbitrary
   time. It does not reach a GSAP scrub or a hand-rolled rAF tween, and the sweep
   reports what it could not drive rather than pretending otherwise.

   THE REFUSAL
   -----------
   If every sample comes back with an identical signature, the seek did not move
   the page, and every quiet rule in this run is quiet for the wrong reason.
   The sweep returns `advanced: false` and the evaluator refuses to emit
   findings, because a clean report from a sweep that never advanced is worse
   than no report.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Installs the sampler as a page global. Serialising a function per sample would
 * pay a full round trip for each of N frames; installing it once turns the probe
 * into a library resident in the page.
 */
export function installSampler() {
  return `window.__nthSample = ${sampleFrame.toString()};`;
}

/**
 * One row of the matrix. Runs in the page.
 *
 * Geometry only, from getBoundingClientRect: it is valid synchronously after a
 * currentTime write, so a dense grid does not need a paint settle per sample.
 *
 * The signature buckets position and size to 2px and opacity to 0.08, then joins
 * every visible element into one string. Comparing two of those answers "did
 * anything move" in constant time, and the thresholds fall out of the bucketing
 * instead of needing to be tuned separately.
 *
 * NOT DONE HERE: four zero-size marker children per element would give the real
 * projected quad instead of the axis-aligned box, so rotation and skew would stop
 * being flattened. It mutates the page to measure it, and neither rule below
 * needs sub-AABB precision, so it is the upgrade path and not the shipped one.
 */
function sampleFrame(maxElements) {
  const cap = maxElements || 1500;
  const all = document.querySelectorAll("body *");
  const rects = [];
  const parts = [];
  const n = Math.min(all.length, cap);
  for (let i = 0; i < n; i++) {
    const el = all[i];
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const op = parseFloat(cs.opacity);
    if (!(op > 0.02)) continue;
    const label = el.tagName.toLowerCase() +
      (typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/)[0] : "");
    rects.push({ i, label, x: r.left, y: r.top, w: r.width, h: r.height, op,
      text: (el.children.length === 0 && el.textContent.trim().length > 0) });
    parts.push(
      Math.round(r.left / 2) + "," + Math.round(r.top / 2) + "," +
      Math.round(r.width / 2) + "," + Math.round(r.height / 2) + "," +
      Math.round(op / 0.08));
  }
  return { sig: parts.join("|"), rects, truncated: all.length > cap };
}

/**
 * Drives the page across a time grid and returns the matrix. Runs in the page,
 * after installSampler().
 *
 * @param {{samples?: number, maxElements?: number}} opts
 * @returns {Promise<{advanced:boolean, driven:number, undrivable:number,
 *   durationMs:number, frames:Array<{t:number, sig:string, rects:object[]}>,
 *   truncated:boolean, notes:string[]}>}
 */
export async function sweep(opts) {
  const { samples = 24, maxElements = 1500 } = opts || {};
  const notes = [];
  if (typeof document.getAnimations !== "function") {
    return { advanced: false, driven: 0, undrivable: 0, durationMs: 0, frames: [],
      truncated: false, notes: ["document.getAnimations is unavailable, so nothing could be driven"] };
  }

  const anims = document.getAnimations();
  const drivable = [];
  let undrivable = 0, durationMs = 0;
  for (const a of anims) {
    let t = null;
    try { t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null; } catch { /* opaque */ }
    if (!t || typeof t.endTime !== "number" || !isFinite(t.endTime)) {
      // An infinite loop has no endTime. It is still drivable, and one cycle is
      // the interesting window, so take the iteration duration instead.
      const one = t && isFinite(t.duration) ? t.duration : null;
      if (one) { drivable.push({ a, end: one }); durationMs = Math.max(durationMs, one); }
      else undrivable++;
      continue;
    }
    drivable.push({ a, end: t.endTime });
    durationMs = Math.max(durationMs, t.endTime);
  }
  if (undrivable) notes.push(`${undrivable} animation(s) reported no readable timing and were not driven`);
  if (!drivable.length) {
    return { advanced: false, driven: 0, undrivable, durationMs: 0, frames: [],
      truncated: false, notes: [...notes, "no drivable animation on the page, so the sweep measured nothing"] };
  }
  // P16. Le plafond était silencieux : une animation déclarée à 40 s recevait
  // "rien ne bouge entre 2609 ms et 20000 ms d'une séquence de 20000 ms" alors
  // que la seconde moitié n'avait pas été parcourue.
  const declaredMs = durationMs;
  durationMs = Math.min(durationMs, 20000);   // a 40s marquee is not worth 24 samples
  const clamped = declaredMs > durationMs;

  const paused = [];
  for (const { a } of drivable) { try { a.pause(); paused.push(a); } catch { /* already gone */ } }

  const frames = [];
  let truncated = false;
  for (let s = 0; s < samples; s++) {
    const t = (durationMs * s) / Math.max(1, samples - 1);
    for (const { a, end } of drivable) {
      try { a.currentTime = Math.min(t, end); } catch { /* detached mid-sweep */ }
    }
    const f = window.__nthSample(maxElements);
    truncated = truncated || f.truncated;
    frames.push({ t: Math.round(t), sig: f.sig, rects: f.rects });
  }
  for (const a of paused) { try { a.play(); } catch { /* detached */ } }

  const advanced = frames.length > 1 && new Set(frames.map(f => f.sig)).size > 1;
  if (!advanced) {
    notes.push("every sample came back identical, so the seek never moved the page and no verdict from this sweep is reliable");
  }
  if (clamped) {
    notes.push(`the longest animation declares ${Math.round(declaredMs)}ms and the sweep samples the first ${Math.round(durationMs)}ms, so anything past that window was not looked at`);
  }
  return { advanced, driven: drivable.length, undrivable, durationMs: Math.round(durationMs),
    declaredMs: Math.round(declaredMs), clamped, frames, truncated, notes };
}

/** The sweep as source, for Claude in Chrome. Install the sampler first. */
export function sweepSource(opts = {}) {
  return `(${sweep})(${JSON.stringify(opts)})`;
}

/**
 * PURE. Takes the matrix, returns findings. No browser, no globals, no clock.
 * This is the half that gets unit tests, and keeping it pure is why it can.
 *
 * @param {object} result the object returned by sweep()
 * @param {{stallMs?: number, minOverlapArea?: number}} opts
 */
export function evaluateSweep(result, opts = {}) {
  // P16. `truncated` était levé au-delà de 1500 éléments et lu par personne, et
  // le plafond de 20 s n'apparaissait nulle part : un verdict propre sortait sur
  // un sous-ensemble non annoncé. Les deux remontent maintenant dans le verdict.
  const caveats = [];
  if (result && result.truncated) caveats.push("the page has more animated elements than the sampler cap, so this verdict covers the first 1500 in document order only");
  if (result && result.clamped) caveats.push(`the sweep sampled the first ${result.durationMs}ms of a ${result.declaredMs}ms sequence`);
  const { stallMs = 900, minOverlapArea = 400 } = opts;
  if (!result || !result.advanced) {
    return { findings: [], refused: true,
      reason: (result && result.notes && result.notes[0]) || "the sweep did not advance the page", caveats };
  }
  const frames = result.frames || [];
  const findings = [];

  // Rule 85. A run of identical signatures inside an animation is dead air: the
  // sequence reads as continuous in the source and stops on screen.
  let runStart = 0;
  for (let i = 1; i <= frames.length; i++) {
    const same = i < frames.length && frames[i].sig === frames[runStart].sig;
    if (same) continue;
    const from = frames[runStart].t, to = frames[i - 1].t;
    // The tail is not exempt, and that took a fixture to get right. An animation
    // that declares four seconds and stops moving at six hundred milliseconds has
    // 3.4s of dead air; exempting the final run on the grounds that "the
    // animation finished" hides exactly that case. The declared duration is the
    // author's statement of how long this should take, so any still run inside it
    // counts. A window that is still throughout is caught earlier, by `advanced`.
    if (to - from >= stallMs) {
      findings.push({ id: 85, where: "rendered",
        evidence: `nothing moves between ${from}ms and ${to}ms of a ${result.durationMs}ms sequence, ${to - from}ms of dead air` });
    }
    runStart = i;
  }

  // Rule 86. Two text-bearing boxes that overlap at some sample and not at the
  // first one. The exclusion is what makes it a motion rule: a permanent overlap
  // is a layout defect and belongs to the static checks.
  const overlapping = (a, b) => {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  };
  const atRest = new Set();
  const pairKey = (p, q) => `${p.i}|${q.i}`;
  const first = frames[0];
  if (first) {
    const t0 = first.rects.filter(r => r.text);
    for (let a = 0; a < t0.length; a++) {
      for (let b = a + 1; b < t0.length; b++) {
        if (overlapping(t0[a], t0[b]) > minOverlapArea) atRest.add(pairKey(t0[a], t0[b]));
      }
    }
  }
  const seen = new Set();
  for (const f of frames.slice(1)) {
    const tr = f.rects.filter(r => r.text);
    for (let a = 0; a < tr.length; a++) {
      for (let b = a + 1; b < tr.length; b++) {
        const area = overlapping(tr[a], tr[b]);
        if (area <= minOverlapArea) continue;
        const k = pairKey(tr[a], tr[b]);
        if (atRest.has(k) || seen.has(k)) continue;
        seen.add(k);
        findings.push({ id: 86, where: "rendered",
          evidence: `${tr[a].label} and ${tr[b].label} overlap by ${Math.round(area)}px at ${f.t}ms and not at rest, so the collision only exists while the animation runs` });
      }
    }
  }

  return { findings: findings.slice(0, 6), refused: false, reason: null, caveats };
}

/** Rule ids this probe decides. Read by the coverage guard. */
export const MOTION_RULE_IDS = [84, 85, 86];

/* ------------------------------- CLI --------------------------------- */

async function main() {
  const args = process.argv.slice(2);
  const target = args.find(a => !a.startsWith("--"));
  const asJson = args.includes("--json");

  const doSweep = args.includes("--sweep");

  if (!target) {
    console.error("usage: node tools/inspect/motion.mjs <url> [--json]           # reduced motion, rule 84");
    console.error("       node tools/inspect/motion.mjs <url> --sweep [--json]   # the time axis, rules 85 and 86");
    console.error("       node tools/inspect/motion.mjs --source     # rule 84 in Claude in Chrome, AFTER");
    console.error("                                                  # setting the OS reduced-motion preference");
    console.error("       node tools/inspect/motion.mjs --install    # then --sweep-source, for the sweep");
    process.exit(2);
  }

  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch {
    console.error("Playwright is not installed here, so this run has measured nothing.");
    console.error("Either install it (npm i -D playwright && npx playwright install chromium),");
    console.error("or set the preference on your own machine and paste the source from --source.");
    process.exit(3);
  }

  const executablePath = process.env.NTH_CHROMIUM || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});

  if (doSweep) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript({ content: installSampler() });
    await page.goto(target, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const raw = await page.evaluate(sweep, {});
    await browser.close();
    const verdict = evaluateSweep(raw);
    if (asJson) {
      console.log(JSON.stringify({ ...raw, frames: raw.frames.length, ...verdict }, null, 2));
      // P17 : le code 2 du refus, écrit exprès pour qu'un appelant ne prenne pas un
      // refus pour un succès, disparaissait sur la voie que les références recommandent.
      process.exit(verdict.refused ? 2 : (verdict.findings.length ? 1 : 0));
    }
    console.log(`\nNullToHero motion sweep — ${target}\n`);
    console.log(`  ${raw.frames.length} samples across ${raw.durationMs}ms, ${raw.driven} animations driven`);
    for (const n of raw.notes) console.log(`  NOTE  ${n}`);
    console.log("");
    if (verdict.refused) {
      console.log(`  REFUSED  ${verdict.reason}\n`);
      process.exit(2);
    }
    for (const c of verdict.caveats || []) console.log(`  CAVEAT  ${c}`);
    if (verdict.caveats && verdict.caveats.length) console.log("");
    if (!verdict.findings.length) console.log(`  No stall and no transient collision across the sampled window.\n`);
    else { for (const f of verdict.findings) console.log(`  [${f.id}] ${f.evidence}`); console.log(""); }
    process.exit(verdict.findings.length ? 1 : 0);
  }

  // The emulation is the experiment. Everything else is bookkeeping.
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await page.goto(target, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const result = await page.evaluate(reducedMotionProbe, {});
  await browser.close();

  if (asJson) {
    console.log(JSON.stringify({ ...result, refused: !result.emulated || (result.sampled === 0 && result.threeFrames === null) }, null, 2));
    const refused = !result.emulated || (result.sampled === 0 && result.threeFrames === null);
    process.exit(refused ? 2 : (result.findings.length ? 1 : 0));
  }
  console.log(`\nNullToHero reduced-motion probe — ${target}\n`);
  if (!result.emulated) {
    console.log(`  REFUSED  ${result.notes[0]}\n`);
    process.exit(2);
  }
  console.log(`  ${result.sampled} animations were running when the sample started, ${result.infinite} of them infinite`);
  if (result.threeFrames !== null) console.log(`  three.js advanced ${result.threeFrames} frames during the sample`);
  for (const n of result.notes) console.log(`  NOTE  ${n}`);
  console.log("");
  // P16. Zéro animation échantillonnée était noté correctement puis suivi de "la
  // page respecte la préférence". La note et le verdict se contredisaient dans la
  // même sortie et c'est le verdict qui était lu. rendered.md:105 écrit la règle
  // que cette ligne violait : une page où rien n'anime ne dédouane rien.
  if (result.sampled === 0 && result.threeFrames === null) {
    console.log(`  REFUSED  nothing was animating when the sample started, so this run cleared nothing.`);
    console.log(`           Scroll-triggered reveals and delayed entrances are the common case, not the edge one.\n`);
    process.exit(2);
  }
  if (!result.findings.length) {
    console.log(`  The page honours the preference: nothing advanced.\n`);
  } else {
    for (const f of result.findings) console.log(`  [84] ${f.evidence}`);
    console.log("");
  }
  process.exit(result.findings.length ? 1 : 0);
}

if (process.argv.includes("--install")) {
  console.log(installSampler());
} else if (process.argv.includes("--sweep-source")) {
  console.log(sweepSource());
} else if (process.argv.includes("--source")) {
  console.log(reducedMotionSource());
} else if (fileURLToPath(import.meta.url) === (process.argv[1] ? resolve(process.argv[1]) : "")) {
  await main();
}
