#!/usr/bin/env node
// NullToHero :: three.js scene cost, measured
//
// WHY THIS EXISTS
// ---------------
// L-WEBGL-1 (a few hundred draw calls, 1000 ceiling) and L-WEBGL-2 (pixel ratio
// capped at 2) have been in the laws registry since they were written and have
// never had an executor. They lived as prose in overdrive.md, which is the same
// as not having them. rule-coverage.csv classes rule 56 as judgment. The only
// three.js check in the plugin, three-duplicate-copies, counts occurrences of
// REVISION in downloaded script: a bundling check, not a cost one.
//
// three.js lets itself be measured without any cooperation from the site, by
// three mechanisms, and this file uses all three.
//
// 1. DETECTION, FROM THE DOM ALONE
//    WebGLRenderer sets `data-engine="three.js r<REVISION>"` on its canvas, and
//    the WebGPU backend appends " webgpu". So presence, exact revision and
//    backend come out of one querySelector, on a minified bundle, with no
//    globals.
//
// 2. THE RENDERER HANDOUT
//    WebGLRenderer ends its constructor with a dispatch to __THREE_DEVTOOLS__ if
//    that global exists. Define it as an EventTarget BEFORE the page's three.js
//    module evaluates and every renderer instance arrives unprompted, with no
//    window.renderer convention and no heuristic. That is what turns this file
//    from guessing into measuring, and it is why the shim is an init script
//    rather than a post-load evaluate: installed after the module ran, it
//    receives nothing.
//
// 3. renderer.info
//    Three traps, all of them silent, all of them handled below.
//    - On the WebGL path `memory` counts objects and never bytes.
//    - `info.autoReset` is true by default and resets at the START of render(),
//      so a post-hoc read of render.calls with a post-processing chain reports
//      the last pass only. The probe turns it off, samples two frames, restores.
//    - On WebGPU `render.calls` is cumulative since start; per-frame draws are
//      `render.drawCalls`. Reading `.calls` there gives a number that only ever
//      grows.
//
// WHAT IT DOES NOT DO
// -------------------
// No leak detection: that needs N mount and unmount cycles and a driver, not one
// probe pass. No triangle threshold: it is the number everyone quotes and the one
// that correlates least with jank on a real page. No advice to move to WebGPU:
// three.js's own guidance still names WebGLRenderer the default.

import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Runs BEFORE any page script. Installs the collector three.js hands renderers
 * to. Must be an init script: three.js checks for the global inside the renderer
 * constructor, so a shim added after the module evaluated collects nothing and
 * the probe correctly reports `installed: false` rather than a false clean.
 */
export function installSource() {
  return `(${function () {
    if (window.__nthThree) return;
    const store = { renderers: [], revisions: [] };
    window.__nthThree = store;
    const target = new EventTarget();
    target.addEventListener("observe", (e) => {
      if (e.detail && store.renderers.indexOf(e.detail) === -1) store.renderers.push(e.detail);
    });
    target.addEventListener("register", (e) => {
      const r = e.detail && e.detail.revision;
      if (r && store.revisions.indexOf(r) === -1) store.revisions.push(r);
    });
    window.__THREE_DEVTOOLS__ = target;
  }})()`;
}

/**
 * Runs inside the page, after load. Same serialise-to-source contract as
 * rendered.mjs: no imports, no closure over module scope.
 *
 * Async on purpose. Measuring draw calls honestly means turning autoReset off
 * and letting two frames go by, because the counter is cleared at the start of
 * render() and a synchronous read lands wherever the site's own loop happens to
 * be.
 *
 * @returns {Promise<{detected:boolean, installed:boolean, revision:string|null,
 *   backend:string, canvases:number, renderers:number, scenes:object[],
 *   findings:Array<{id:number, where:string, evidence:string}>, notes:string[]}>}
 */
export async function probe(opts) {
  const { drawCallCeiling = 1000, drawCallTarget = 300, pixelRatioCap = 2 } = opts || {};
  const findings = [];
  const notes = [];
  const add = (id, where, evidence) => findings.push({ id, where, evidence });

  // 1. Detection, which works whether or not the shim was installed in time.
  const canvases = Array.from(document.querySelectorAll("canvas[data-engine]"))
    .filter((c) => /three\.js/i.test(c.getAttribute("data-engine") || ""));
  const engine = canvases.length ? canvases[0].getAttribute("data-engine") : "";
  const revMatch = /three\.js\s+r(\d+)/i.exec(engine || "");
  const revision = revMatch ? revMatch[1] : (window.__THREE__ ? String(window.__THREE__) : null);
  const backend = /webgpu/i.test(engine || "") ? "webgpu" : (canvases.length ? "webgl" : "");

  const store = window.__nthThree || null;
  const renderers = store ? store.renderers.filter(Boolean) : [];
  const installed = Boolean(store);

  if (!canvases.length && !renderers.length) {
    return { detected: false, installed, revision: null, backend: "", canvases: 0,
      renderers: 0, scenes: [], findings: [], notes: ["no three.js canvas on the page"] };
  }

  if (!installed) {
    notes.push("the __THREE_DEVTOOLS__ collector was not installed before the page's three.js ran, so cost was not measured; only the detection findings below are real");
  } else if (!renderers.length) {
    notes.push("the collector was installed and no renderer announced itself, which happens when three.js is loaded but no WebGLRenderer was constructed");
  }

  // A revision predating r152 means the colour pipeline is the old one, and the
  // legacy setters people still copy are no-ops on anything newer.
  if (revision && Number(revision) < 152) {
    add(81, "js", `three.js r${revision} predates the r152 colour-management change, so outputColorSpace and texture colour space do not apply`);
  }

  if (renderers.length > 1) {
    add(79, "js", `${renderers.length} WebGLRenderer instances are live on one page; each holds its own GL context and browsers cap contexts at around 16`);
  }

  const scenes = [];

  for (const r of renderers) {
    const entry = { pixelRatio: null, drawCalls: null, geometries: null, textures: null, programs: null, meshes: null };

    // 2. Pixel ratio (L-WEBGL-2). Fragment cost scales with the square of this,
    //    so 3 to 2 is a 2.25x saving on exactly the devices least able to pay.
    try {
      const dpr = r.getPixelRatio ? r.getPixelRatio() : null;
      entry.pixelRatio = dpr;
      if (typeof dpr === "number" && dpr > pixelRatioCap) {
        add(79, "js", `renderer pixel ratio is ${dpr}, above the cap of ${pixelRatioCap}; fragment cost scales with its square, so this is ${(dpr * dpr / (pixelRatioCap * pixelRatioCap)).toFixed(2)}x the work of a capped renderer`);
      }
    } catch { /* a renderer mid-teardown is not a finding */ }

    // 3. Draw calls (L-WEBGL-1), measured rather than inferred.
    try {
      const info = r.info;
      if (info && info.render) {
        const wasAuto = info.autoReset;
        info.autoReset = false;
        if (info.reset) info.reset();
        // P16 and P18. Two defects in one read. Nothing checked that a render
        // happened at all during the window: a scene that renders on demand kept
        // the counter at zero, rule 80 stayed silent, and the CLI printed "0 draw
        // calls" — the sentinel and the best possible value at once. And the
        // divisor was info.render.frameCalls, which counts the render calls of the
        // current frame, not the frames sampled: a three-pass WebGPU chain divided
        // by three too many and turned a ceiling breach into a target miss.
        //
        // info.render.frame increments on every render() and is not cleared by
        // reset(), so its delta is both the true divisor and a free NOT_MEASURED
        // when it is zero. motion.mjs:68 already reads that field.
        const frameBefore = typeof info.render.frame === "number" ? info.render.frame : null;
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const frameAfter = typeof info.render.frame === "number" ? info.render.frame : null;
        const rendered = frameBefore !== null && frameAfter !== null ? frameAfter - frameBefore : null;
        info.autoReset = wasAuto;

        if (rendered === 0) {
          entry.drawCalls = null;
          entry.renderedFrames = 0;
          notes.push("the renderer drew no frame during the sample window, so draw calls were not measured. A render-on-demand scene is not a scene with zero draw calls.");
          entry.geometries = info.memory ? info.memory.geometries : null;
          entry.textures = info.memory ? info.memory.textures : null;
          entry.programs = info.programs ? info.programs.length : null;
          scenes.push(entry);
          continue;
        }

        // The WebGPU trap: .calls is cumulative there, .drawCalls is per frame.
        const perFrame = typeof info.render.drawCalls === "number" ? info.render.drawCalls : info.render.calls;
        const frames = rendered !== null && rendered > 0 ? rendered
          : (typeof info.render.frameCalls === "number" ? Math.max(1, info.render.frameCalls) : 2);
        const calls = Math.round(perFrame / frames);
        entry.renderedFrames = rendered;
        entry.drawCalls = calls;
        entry.geometries = info.memory ? info.memory.geometries : null;
        entry.textures = info.memory ? info.memory.textures : null;
        entry.programs = info.programs ? info.programs.length : null;

        if (calls > drawCallCeiling) {
          add(80, "js", `${calls} draw calls per frame, above the ceiling of ${drawCallCeiling}`);
        } else if (calls > drawCallTarget) {
          add(80, "js", `${calls} draw calls per frame, above the target of ${drawCallTarget} and below the ${drawCallCeiling} ceiling`);
        }
      }
    } catch (e) { notes.push("renderer.info was unreadable: " + e.message); }

    scenes.push(entry);
  }

  // 4. Scene traversal, from whichever scene the page exposes. A threshold on
  //    draw calls says a number is too big; the duplicate count says what to do
  //    about it, which is the difference between a finding and a complaint.
  const roots = [];
  for (const key of ["scene", "__scene", "_scene"]) {
    if (window[key] && window[key].isScene) roots.push(window[key]);
  }
  for (const r of renderers) {
    if (r.__nthScene && r.__nthScene.isScene) roots.push(r.__nthScene);
  }
  if (roots.length) {
    const pairs = new Map();
    let meshes = 0;
    const colourSlots = ["map", "emissiveMap", "specularMap"];
    const dataSlots = ["normalMap", "roughnessMap", "metalnessMap", "aoMap", "displacementMap"];
    const untagged = [], mistagged = [];
    for (const root of roots) {
      root.traverse((o) => {
        if (o.isMesh) {
          meshes++;
          const g = o.geometry && o.geometry.uuid, m = o.material && o.material.uuid;
          if (g && m) { const k = g + "|" + m; pairs.set(k, (pairs.get(k) || 0) + 1); }
        }
        const mats = [].concat(o.material || []);
        for (const mat of mats) {
          if (!mat) continue;
          for (const s of colourSlots) {
            if (mat[s] && mat[s].colorSpace !== "srgb" && untagged.length < 6) untagged.push(mat.name || mat.type || "material");
          }
          for (const s of dataSlots) {
            if (mat[s] && mat[s].colorSpace === "srgb" && mistagged.length < 6) mistagged.push(`${mat.name || mat.type || "material"}.${s}`);
          }
        }
      });
    }
    const worst = [...pairs.values()].sort((a, b) => b - a)[0] || 0;
    if (worst >= 50) {
      add(80, "js", `${meshes} meshes, of which ${worst} share one geometry and one material; that group is one InstancedMesh or BatchedMesh away from a single draw call`);
    }
    if (untagged.length) {
      add(81, "js", `${untagged.length} colour texture(s) carry no sRGB colour space, so they are treated as already linear and render too bright: ${untagged.slice(0, 3).join(", ")}`);
    }
    if (mistagged.length) {
      add(81, "js", `${mistagged.length} data map(s) are tagged sRGB and get de-gamma'd as if they were colour: ${mistagged.slice(0, 3).join(", ")}`);
    }
    if (scenes[0]) scenes[0].meshes = meshes;
  } else if (renderers.length) {
    notes.push("no scene was reachable from a global, so the material and instancing checks did not run; they need window.scene or an equivalent");
  }

  return { detected: true, installed, revision, backend, canvases: canvases.length,
    renderers: renderers.length, scenes, findings, notes };
}

/** The probe as source, for Claude in Chrome's javascript_tool. */
export function probeSource(opts = {}) {
  return `(${probe})(${JSON.stringify(opts)})`;
}

/** Rule ids this probe decides. Read by the coverage guard. */
export const THREE_RULE_IDS = [79, 80, 81];

/* ------------------------------- CLI --------------------------------- */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function registryMeta() {
  const text = readFileSync(join(ROOT, "tools/data/inspect-rules.csv"), "utf8").trim();
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows[0], meta = new Map();
  for (const r of rows.slice(1)) {
    const o = Object.fromEntries(head.map((h, i) => [h, r[i]]));
    if (o.id) meta.set(Number(o.id), o);
  }
  return meta;
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.find(a => !a.startsWith("--"));
  const asJson = args.includes("--json");
  const wait = Number(args.includes("--wait") ? args[args.indexOf("--wait") + 1] : 3000);

  if (!target) {
    console.error("usage: node tools/inspect/three.mjs <url> [--json] [--wait ms]");
    console.error("       node tools/inspect/three.mjs --install    # run this FIRST in Claude in Chrome, then reload");
    console.error("       node tools/inspect/three.mjs --source     # then this, once the page has settled");
    process.exit(2);
  }

  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch {
    console.error("Playwright is not installed here, so this run has measured nothing.");
    console.error("Either install it (npm i -D playwright && npx playwright install chromium),");
    console.error("or run it in Claude in Chrome: --install before the reload, --source after.");
    process.exit(3);
  }

  const executablePath = process.env.NTH_CHROMIUM || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Before any page script, which is the whole point.
  await page.addInitScript({ content: installSource() });
  await page.goto(target, { waitUntil: "load" });
  await page.waitForTimeout(wait);
  const result = await page.evaluate(probe, {});
  await browser.close();

  const meta = registryMeta();
  const enriched = result.findings.map(f => {
    const m = meta.get(f.id) || {};
    return { ...f, rule: m.rule || `rule ${f.id}`, severity: m.severity || "medium", why: m.why || "" };
  });

  // P17 : la voie --json rendait 0 quel que soit le contenu, y compris sur des
  // constats que la voie texte fait sortir en 1. Les deux voies sortent le même code.
  if (asJson) {
    console.log(JSON.stringify({ ...result, findings: enriched }, null, 2));
    process.exit(result.detected && enriched.length ? 1 : 0);
  }

  if (!result.detected) {
    console.log(`\nNo three.js on ${target}. Nothing measured, and nothing to measure.\n`);
    process.exit(0);
  }
  console.log(`\nNullToHero three.js probe — ${target}`);
  console.log(`  three.js r${result.revision || "?"} on ${result.backend}, ${result.canvases} canvas, ${result.renderers} renderer\n`);
  for (const s of result.scenes) {
    console.log(`  pixel ratio ${s.pixelRatio ?? "?"} · ${s.drawCalls ?? "?"} draw calls · ${s.geometries ?? "?"} geometries · ${s.textures ?? "?"} textures · ${s.programs ?? "?"} programs`);
  }
  for (const n of result.notes) console.log(`  NOTE  ${n}`);
  console.log("");
  if (!enriched.length) {
    console.log(`  No named defect found, at this viewport and this moment.\n`);
  } else {
    for (const f of enriched) {
      console.log(`  [${f.id}] ${f.rule}`);
      console.log(`       ${f.evidence}`);
    }
    console.log(`\n  ${enriched.length} findings\n`);
  }
  process.exit(enriched.length ? 1 : 0);
}

if (process.argv.includes("--install")) {
  console.log(installSource());
} else if (process.argv.includes("--source")) {
  console.log(probeSource());
} else if (fileURLToPath(import.meta.url) === (process.argv[1] ? resolve(process.argv[1]) : "")) {
  await main();
}
