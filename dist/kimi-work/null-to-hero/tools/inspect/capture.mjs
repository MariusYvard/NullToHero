#!/usr/bin/env node
// NullToHero :: record what the page does, not what it looks like
//
// WHY THIS EXISTS
// ---------------
// `/inspect preview` takes two stills, desktop and mobile, and reads them back.
// That is the right tool for composition, hierarchy and contrast, and it is the
// wrong tool for every question that has a duration: does the entrance land,
// does the scroll sequence hold together, does the hero stall halfway. Those get
// answered today by describing motion in prose to someone who cannot see it.
//
// Playwright records video natively. This file is the thin wrapper that turns
// that into a deliverable: navigate, optionally walk the page down at a readable
// speed, close the context, hand back a webm.
//
// WHAT THIS IS NOT
// ----------------
// Not a render pipeline. There is no frame determinism, no alpha, no audio, no
// encoder configuration and no golden-frame comparison, because the deliverable
// is something a person watches once, not a file that has to be byte-identical
// tomorrow. Anything that needs those is a video tool's job and not an audit's.
//
// The verdicts still come from tools/inspect/motion.mjs, which drives the page
// across a time grid and returns findings. This produces the artefact a human
// looks at; that produces the ones a machine can check. They answer different
// questions and neither replaces the other.

import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { readdirSync, renameSync, rmSync, mkdirSync, existsSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

async function main() {
  const target = process.argv.slice(2).find(a => !a.startsWith("--"));
  if (!target) {
    console.error("usage: node tools/inspect/capture.mjs <url|file> [options]");
    console.error("  --out <dir>        where the webm lands (default ./motion-capture)");
    console.error("  --name <file>      output name (default derived from the target)");
    console.error("  --seconds <n>      how long to record (default 6)");
    console.error("  --viewport <WxH>   default 1280x800; use 390x844 for the phone pass");
    console.error("  --scroll           walk the page from top to bottom during the recording");
    console.error("  --reduced          record with prefers-reduced-motion: reduce");
    process.exit(2);
  }

  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch {
    console.error("Playwright is not installed here, so nothing was recorded.");
    console.error("Install it (npm i -D playwright && npx playwright install chromium),");
    console.error("or record in Claude in Chrome with the gif_creator tool, which needs no install.");
    process.exit(3);
  }

  // P13. Un dossier par exécution. Deux runs partageant un dossier ne sont pas
  // sûrs : le second ne peut plus distinguer sa capture de celle du premier, et
  // c'est ce que le repli supprimé plus bas confondait. L'horodatage est dans le
  // chemin, donc la question ne se pose plus.
  const outBase = resolve(arg("--out", "motion-capture"));
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = process.argv.includes("--flat") ? outBase : join(outBase, runStamp);
  const seconds = Math.max(1, Math.min(60, Number(arg("--seconds", 6))));
  const [w, h] = arg("--viewport", "1280x800").split("x").map(Number);
  const viewport = { width: w || 1280, height: h || 800 };
  const doScroll = process.argv.includes("--scroll");
  const reduced = process.argv.includes("--reduced");
  const url = /^(https?|file):\/\//i.test(target) ? target : "file://" + resolve(target);
  const name = arg("--name",
    (url.replace(/^https?:\/\//, "").replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "capture")
    + (reduced ? "-reduced" : "") + `-${viewport.width}x${viewport.height}.webm`);

  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.NTH_CHROMIUM ? { executablePath: process.env.NTH_CHROMIUM } : {});
  // recordVideo is a context option, and the file is only written on close, so
  // the whole run has to live inside one context and end with closing it.
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: outDir, size: viewport },
    ...(reduced ? { reducedMotion: "reduce" } : {}),
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load" });

  if (doScroll) {
    // A readable walk, not a jump. Jumping to the bottom skips every
    // scroll-triggered reveal on the way, which is usually the thing being
    // recorded. The step is a fraction of the viewport so nothing is missed
    // between two frames.
    const steps = Math.max(8, Math.round(seconds * 8));
    await page.evaluate(async (n) => {
      const total = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      for (let i = 0; i <= n; i++) {
        window.scrollTo(0, (total * i) / n);
        await new Promise(r => setTimeout(r, 1000 / 8));
      }
    }, steps);
  } else {
    await page.waitForTimeout(seconds * 1000);
  }

  const video = page.video();
  await context.close();          // writes the file
  await browser.close();

  // Playwright names the file with a random id. Rename it to something a person
  // can find again a week later.
  let written = null;
  try {
    const raw = video ? await video.path() : null;
    const dest = join(outDir, name);
    if (raw && existsSync(raw)) {
      if (existsSync(dest)) rmSync(dest);
      renameSync(raw, dest);
      written = dest;
    }
  } catch (e) {
    // P13. Le repli parcourait le dossier et retenait un .webm arbitraire, dans
    // l'ordre de readdirSync et non par date : sur un deuxième run dans le même
    // dossier, l'outil annonçait le fichier du run précédent comme la capture de
    // celui-ci, avec sa durée et son viewport. C'est un artefact périmé présenté
    // comme une preuve fraîche, et pour un outil dont le produit est la preuve
    // c'est une erreur de catégorie.
    //
    // Le correctif n'est pas une meilleure sélection de fichier. Deux exécutions
    // partageant un dossier ne sont pas sûres, donc chaque run écrit dans son
    // propre sous-dossier horodaté et l'échec est un échec.
    console.error(`The recording could not be located: ${e.message}`);
    console.error("Nothing is reported rather than reporting a file this run did not write.");
    process.exit(1);
  }

  if (!written) {
    console.error("The context closed without writing a video. Nothing was recorded.");
    console.error(`Looked in ${outDir}. No fallback scan is done: a .webm left by an earlier`);
    console.error("run is not this run's capture, and presenting it as one is the defect this");
    console.error("path used to have.");
    process.exit(1);
  }
  console.log(`\n  ${written}`);
  console.log(`  ${seconds}s at ${viewport.width}x${viewport.height}${doScroll ? ", scrolled top to bottom" : ""}${reduced ? ", prefers-reduced-motion: reduce" : ""}\n`);
  console.log(`  This is an artefact, not a verdict. For findings over time:`);
  console.log(`  node tools/inspect/motion.mjs ${/^https?:/i.test(url) ? url : target} --sweep\n`);
}

if (fileURLToPath(import.meta.url) === (process.argv[1] ? resolve(process.argv[1]) : "")) {
  await main();
}
