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
    const out = { lcp: 0, cls: 0, inp: 0 };
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

// Evaluate desktop
if (desktop.vitals.lcp > THRESHOLDS.lcpMs) recordFail(`LCP ${desktop.vitals.lcp.toFixed(0)}ms exceeds ${THRESHOLDS.lcpMs}ms`);
else recordPass(`LCP ${desktop.vitals.lcp.toFixed(0)}ms`);

if (desktop.vitals.cls > THRESHOLDS.cls) recordFail(`CLS ${desktop.vitals.cls.toFixed(3)} exceeds ${THRESHOLDS.cls}`);
else recordPass(`CLS ${desktop.vitals.cls.toFixed(3)}`);

if (desktop.vitals.inp > THRESHOLDS.inpMs) recordWarn(`INP ${desktop.vitals.inp.toFixed(0)}ms exceeds ${THRESHOLDS.inpMs}ms (warning, requires real interaction)`);
else recordPass(`INP ${desktop.vitals.inp.toFixed(0)}ms`);

if (desktop.fps.min < THRESHOLDS.fpsMin) recordFail(`Scroll FPS dropped to ${desktop.fps.min.toFixed(0)} (min threshold ${THRESHOLDS.fpsMin})`);
else recordPass(`Scroll FPS min ${desktop.fps.min.toFixed(0)} avg ${desktop.fps.avg.toFixed(0)}`);

desktop.staticReport.violations.forEach(recordFail);

if (!desktop.staticReport.reducedMotionRule) recordFail('No @media (prefers-reduced-motion) CSS rule found');
else recordPass('prefers-reduced-motion CSS rule present');

if (!desktop.staticReport.hasToggle) recordWarn('No manual motion toggle [data-motion-toggle] detected');
else recordPass('Manual motion toggle present');

if (desktop.staticReport.scrollDriven) recordPass('Native scroll-driven animations detected');

// Image weights
let heavyImages = 0;
desktop.imageSizes.forEach((info, url) => {
  if (info.bytes > THRESHOLDS.bytesPerImage) {
    heavyImages++;
    recordWarn(`Heavy image: ${url} = ${(info.bytes / 1024).toFixed(0)} KB`);
  }
});
if (heavyImages === 0) recordPass('All images under 200 KB');

// Mobile + reduced motion: layers should be stationary
const mobileTransformsActive = mobile.staticReport.layers.some((l) => l.willChange === 'transform');
if (mobileTransformsActive) recordWarn('Parallax layers retain will-change: transform under reduced-motion on mobile');
else recordPass('Layers neutralized under reduced-motion on mobile');

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

console.log('\n────────────────────────────────────────');
console.log(`Score: ${passes.length} pass · ${warns.length} warn · ${fails.length} fail`);
process.exit(fails.length === 0 ? 0 : 1);
