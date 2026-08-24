#!/usr/bin/env node
/**
 * parallax-audit.mjs
 *
 * Headless Chromium audit for parallax sections.
 * Measures FPS during scroll, CLS, INP, layer property compliance, and reduced-motion behavior.
 *
 * Usage:
 *   npm i -D playwright
 *   node scripts/parallax-audit.mjs <url-or-file>
 *
 * Exits 0 on pass, 1 on at least one failure.
 */

import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Playwright is an optional peer dependency (not bundled). Load it lazily so a
// missing install yields a clear message instead of an uncaught module error.
let chromium, devices;
try {
  ({ chromium, devices } = await import('playwright'));
} catch {
  console.error('[parallax-audit] Playwright is required but not installed.');
  console.error('  Install it once with:  npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const RAW = process.argv[2];
if (!RAW) {
  console.error('Usage: node parallax-audit.mjs <url-or-file>');
  process.exit(2);
}

const target = /^https?:\/\//.test(RAW)
  ? RAW
  : (existsSync(resolve(RAW)) ? pathToFileURL(resolve(RAW)).href : RAW);

const THRESHOLDS = {
  lcpMs: 2500,
  cls: 0.1,
  inpMs: 200,
  fpsMin: 50,
  bytesPerImage: 200 * 1024,
};

const fails = [];
const warns = [];
const passes = [];
const recordPass = (m) => passes.push(m);
// P11. Zéro était à la fois la valeur sentinelle et le meilleur score possible :
// des vitals en échec donnaient LCP, CLS et INP à zéro et trois PASS, zéro calque
// trouvé donnait "calques neutralisés", zéro image pesée donnait "toutes les
// images sous 200 Ko". Le motif du correctif est celui de rendered.mjs:101-109 et
// :400 : compter les candidats et refuser de conclure sur un ensemble vide.
const unmeasured = [];
const recordUnmeasured = (m) => unmeasured.push(m);
const recordWarn = (m) => warns.push(m);
const recordFail = (m) => fails.push(m);

async function runProfile({ deviceName, reducedMotion }) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...(deviceName ? devices[deviceName] : {}),
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();

  // Measure image weight
  const imageSizes = new Map();
  page.on('response', async (res) => {
    const ct = res.headers()['content-type'] || '';
    if (!/^image\//.test(ct)) return;
    try {
      const buf = await res.body();
      imageSizes.set(res.url(), { bytes: buf.length, type: ct });
    } catch {}
  });

  await page.goto(target, { waitUntil: 'load' });

  // 1. Static checks on the DOM
  const staticReport = await page.evaluate(() => {
    const report = { layers: [], violations: [] };
    const layers = document.querySelectorAll('.parallax-layer, [data-parallax], [class*="parallax"]');
    layers.forEach((el) => {
      const cs = getComputedStyle(el);
      const willChange = cs.willChange;
      const bgAttachment = cs.backgroundAttachment;
      const transition = cs.transitionProperty;
      report.layers.push({
        selector: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').join('.') : ''),
        willChange, bgAttachment, transition,
      });
      if (bgAttachment === 'fixed') report.violations.push('background-attachment: fixed on ' + el.className);
      if (transition === 'all') report.violations.push('transition: all on parallax layer');
    });

    // Toggle presence
    const toggle = document.querySelector('[data-motion-toggle], button[aria-pressed][data-reduce-motion]');
    report.hasToggle = Boolean(toggle);

    // Reduced-motion media query CSS rule presence (heuristic)
    report.reducedMotionRule = Array.from(document.styleSheets).some((ss) => {
      try {
        return Array.from(ss.cssRules).some((r) => /prefers-reduced-motion/.test(r.cssText));
      } catch { return false; }
    });

    // Scroll-driven API usage
    report.scrollDriven = Array.from(document.styleSheets).some((ss) => {
      try {
        return Array.from(ss.cssRules).some((r) => /animation-timeline/.test(r.cssText));
      } catch { return false; }
    });

    return report;
  });

  // 2. Performance vitals
  const vitals = await page.evaluate(() => new Promise((resolve) => {
    // clsObserved distingue "aucun décalage" de "l'observateur n'a rien vu".
    const out = { lcp: 0, cls: 0, inp: 0, clsObserved: false };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        out.lcp = entries[entries.length - 1].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      let cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) cls += e.value;
        }
        out.cls = cls;
        out.clsObserved = true;
      }).observe({ type: 'layout-shift', buffered: true });

      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          out.inp = Math.max(out.inp, e.duration);
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });

      setTimeout(() => resolve(out), 1500);
    } catch { resolve(out); }
  }));

  // 3. FPS during scripted scroll
  const fps = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      let frames = 0;
      let last = performance.now();
      const samples = [];
      function loop(t) {
        frames++;
        if (t - last >= 250) {
          samples.push((frames * 1000) / (t - last));
          frames = 0;
          last = t;
        }
        if (samples.length < 12) requestAnimationFrame(loop);
        else resolve(samples);
      }
      requestAnimationFrame(loop);

      const total = document.documentElement.scrollHeight;
      let y = 0;
      const step = total / 60;
      const iv = setInterval(() => {
        y += step;
        scrollTo({ top: y, behavior: 'auto' });
        if (y >= total) clearInterval(iv);
      }, 50);
    });
  });

  const minFps = Math.min(...fps);
  const avgFps = fps.reduce((a, b) => a + b, 0) / fps.length;

  await browser.close();

  return { staticReport, vitals, fps: { min: minFps, avg: avgFps }, imageSizes };
}

// Pass 1: desktop, full motion
const desktop = await runProfile({ reducedMotion: false });

// Pass 2: mobile, reduced motion
const mobile = await runProfile({ deviceName: 'Pixel 5', reducedMotion: true });

// Evaluate desktop. A vital the browser never reported stays at its sentinel of
// zero, which reads as the best possible value. Zero is not a measurement.
const vital = (name, value, judge) => {
  if (value == null || !Number.isFinite(value) || value === 0) {
    recordUnmeasured(`${name} was not reported by the browser during the run, so it was not judged. Its silence is not a pass.`);
    return;
  }
  judge(value);
};
vital('LCP', desktop.vitals.lcp, (v) => v > THRESHOLDS.lcpMs
  ? recordFail(`LCP ${v.toFixed(0)}ms exceeds ${THRESHOLDS.lcpMs}ms`)
  : recordPass(`LCP ${v.toFixed(0)}ms`));
// CLS is the one vital whose zero is a real, good measurement: a page that never
// shifted genuinely scores 0. It is judged on whether the observer ran at all.
if (desktop.vitals.clsObserved) {
  desktop.vitals.cls > THRESHOLDS.cls
    ? recordFail(`CLS ${desktop.vitals.cls.toFixed(3)} exceeds ${THRESHOLDS.cls}`)
    : recordPass(`CLS ${desktop.vitals.cls.toFixed(3)}`);
} else {
  recordUnmeasured('CLS: the layout-shift observer never fired, so nothing was measured. Its silence is not a pass.');
}
vital('INP', desktop.vitals.inp, (v) => v > THRESHOLDS.inpMs
  ? recordWarn(`INP ${v.toFixed(0)}ms exceeds ${THRESHOLDS.inpMs}ms (warning, requires real interaction)`)
  : recordPass(`INP ${v.toFixed(0)}ms`));

if (!Number.isFinite(desktop.fps.min)) {
  recordUnmeasured('Scroll FPS: no frame samples were collected, so the scroll was not judged.');
} else if (desktop.fps.min < THRESHOLDS.fpsMin) {
  recordFail(`Scroll FPS dropped to ${desktop.fps.min.toFixed(0)} (min threshold ${THRESHOLDS.fpsMin})`);
} else {
  recordPass(`Scroll FPS min ${desktop.fps.min.toFixed(0)} avg ${desktop.fps.avg.toFixed(0)}`);
}

desktop.staticReport.violations.forEach(recordFail);

if (!desktop.staticReport.reducedMotionRule) recordFail('No @media (prefers-reduced-motion) CSS rule found');
else recordPass('prefers-reduced-motion CSS rule present');

if (!desktop.staticReport.hasToggle) recordWarn('No manual motion toggle [data-motion-toggle] detected');
else recordPass('Manual motion toggle present');

if (desktop.staticReport.scrollDriven) recordPass('Native scroll-driven animations detected');

// Image weights
let heavyImages = 0;
const imageSizesSeen = desktop.imageSizes.size;
desktop.imageSizes.forEach((info, url) => {
  if (info.bytes > THRESHOLDS.bytesPerImage) {
    heavyImages++;
    recordWarn(`Heavy image: ${url} = ${(info.bytes / 1024).toFixed(0)} KB`);
  }
});
if (imageSizesSeen === 0) recordUnmeasured('No image was weighed: none was found, or none could be fetched. "All images under 200 KB" would be a verdict on an empty set.');
else if (heavyImages === 0) recordPass(`All ${imageSizesSeen} images weighed are under 200 KB`);

// Mobile + reduced motion: layers should be stationary
const mobileLayers = mobile.staticReport.layers || [];
if (mobileLayers.length === 0) {
  recordUnmeasured('No parallax layer was found on the page, so "layers neutralized under reduced-motion" would be a verdict on an empty set. The detector matches a naming convention; a page that parallaxes by other means reads as a page with none.');
} else {
  const mobileTransformsActive = mobileLayers.some((l) => l.willChange === 'transform');
  if (mobileTransformsActive) recordWarn('Parallax layers retain will-change: transform under reduced-motion on mobile');
  else recordPass(`${mobileLayers.length} parallax layers neutralized under reduced-motion on mobile`);
}

// Report
const line = (s, prefix) => `  ${prefix} ${s}`;
console.log('\n──────────── Parallax Audit ────────────');
console.log(`Target: ${target}`);
console.log(`Profiles: desktop (full motion) + Pixel 5 (reduce)\n`);

console.log(`PASS (${passes.length})`);
passes.forEach((p) => console.log(line(p, 'OK ')));
console.log(`\nWARN (${warns.length})`);
warns.forEach((w) => console.log(line(w, '!  ')));
console.log(`\nFAIL (${fails.length})`);
fails.forEach((f) => console.log(line(f, 'X  ')));
// P11. Ce que le balayage n'a pas mesuré est imprimé, compté, et porté dans le
// code de sortie. Un rapport qui ne montre que ses PASS laisse croire qu'il a tout
// regardé, ce qui est la défaillance que ce script produisait.
console.log(`\nNOT MEASURED (${unmeasured.length})`);
unmeasured.forEach((u) => console.log(line(u, '?  ')));

console.log('\n────────────────────────────────────────');
console.log(`Score: ${passes.length} pass · ${warns.length} warn · ${fails.length} fail · ${unmeasured.length} not measured`);
if (passes.length === 0 && unmeasured.length > 0) {
  console.log('Nothing on this page was successfully judged. Exit 2: the run measured nothing.');
  process.exit(2);
}
process.exit(fails.length === 0 ? 0 : 1);
