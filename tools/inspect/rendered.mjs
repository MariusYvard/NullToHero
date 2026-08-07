#!/usr/bin/env node
// NullToHero :: rendered-page rules
//
// WHY THIS EXISTS
// ---------------
// Five registry rules cannot be decided from source text. Whether an error
// message lands beside its field, whether a pinned stage has room to travel,
// whether a transformed ancestor has quietly broken a sticky element: those are
// facts about a laid-out page, and reading the CSS cannot produce them. Until
// v3.2.0 they were prose in a reference file, which is the same as not having
// them, and rule-coverage.csv said so in the open.
//
// ONE SOURCE, TWO RUNNERS
// -----------------------
// `probe` below is an ordinary function that happens to run inside a page. It
// ships to a browser two ways and the source is the same both times:
//
//   Claude in Chrome   emit `(${probe})(opts)` and hand it to javascript_tool,
//                      which drives the user's own Chrome. This is the path for
//                      a live site, a page behind a login, or anything that
//                      needs a banner dismissed first.
//   Playwright         page.evaluate(probe, opts), which is what the test
//                      harness and this file's CLI use.
//
// Serialising one function beats maintaining a probe per runner. Two
// implementations of "is this sticky element broken" would drift, and drift
// between a prose registry and an executable engine is the exact failure the
// coverage guard was added to catch in v3.1.0.
//
// WHAT IT DOES NOT DO
// -------------------
// The probe observes one moment. Rule 27 wants thresholds across a load (nothing
// under 300ms, a skeleton to 2s, a spinner with a message beyond that) and a
// single observation cannot see a sequence. So it decides the half it can: what
// is still on screen once the page has settled. It measures the elapsed time
// itself rather than trusting the caller, and returns `settled: false` when it
// was run too early, so a partial run cannot be read as a clean one.

/**
 * Runs inside the page. No imports, no closure over module scope: everything it
 * needs is either a browser global or comes in through `opts`, because the
 * function is serialised to source before it runs.
 *
 * `settled` is false when the probe ran less than 2s after the load event. Rules
 * 27 and 68 are not judged in that case and their absence means nothing.
 *
 * @param {{maxElements?: number}} opts
 * @returns {{findings: Array<{id:number, where:string, evidence:string}>, scanned:number, truncated:boolean, elapsedMs:number, settled:boolean}}
 */
export function probe(opts) {
  const { maxElements = 4000 } = opts || {};
  // The probe measures its own elapsed time and does not take it from the caller.
  // It used to, and the test harness promptly claimed 2500ms while evaluating on
  // the load event, so rule 68 read every video before it could start. The same
  // trap is worse in the field: the Claude in Chrome recipe says let it settle,
  // and nothing made that true. A number a caller can be wrong about is a number
  // the caller should not be supplying.
  const nav = performance.getEntriesByType("navigation")[0];
  const elapsedMs = Math.max(0, Math.round(
    nav && nav.loadEventEnd ? performance.now() - nav.loadEventEnd : performance.now()));
  const SETTLED = 2000;
  const settled = elapsedMs >= SETTLED;
  const findings = [];
  const add = (id, where, evidence) => findings.push({ id, where, evidence });
  const css = (el) => getComputedStyle(el);
  const box = (el) => el.getBoundingClientRect();
  const vh = window.innerHeight;
  const norm = (t) => (t || "").replace(/\s+/g, " ").trim();

  const label = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const raw = typeof el.className === "string" ? el.className : "";
    const cls = raw.trim() ? "." + raw.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 48);
  };
  const visible = (el) => {
    const s = css(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const b = box(el);
    return b.width > 0 && b.height > 0;
  };
  const infinite = (el) =>
    css(el).animationIterationCount.split(",").some(v => v.trim() === "infinite");
  // aria-invalid is deliberately not in this list: it is itself announced, so it
  // is a second signal and not a defect. Hoisted here because the candidate count
  // and rule 5 must agree on what a stateful element is.
  const STATEFUL = '[data-state], [data-status], [class*="status"], ' +
    '[class*="badge"], [class*="error"], [class*="success"], [class*="warning"], [class*="danger"]';

  const all = Array.from(document.querySelectorAll("*"));
  const truncated = all.length > maxElements;
  const els = truncated ? all.slice(0, maxElements) : all;

  // How many candidates each rule had to judge.
  //
  // "0 findings" and "0 findings out of 0 candidates" are different statements
  // and the second one is not a pass. The first real target came back clean and
  // the honest reading was mixed: one rule judged a pinned stage and cleared it,
  // the other six had nothing on the page to look at. Without this a reader takes
  // silence for a grade, which is the thing this whole engine is careful about.
  const candidates = {
    5: document.querySelectorAll(STATEFUL).length,
    23: document.querySelectorAll('[aria-invalid="true"], [data-invalid], [data-error]').length,
    27: document.querySelectorAll('[class*="skeleton"], [class*="shimmer"], [class*="spinner"], [class*="loader"], [role="progressbar"]').length,
    51: els.filter(e => css(e).position === "sticky" && box(e).height >= vh * 0.5).length,
    52: els.filter(e => ["fixed", "sticky"].includes(css(e).position)).length,
    62: els.filter(e => e.children.length >= 2 && (infinite(e) || Array.from(e.children).some(infinite))).length,
    68: document.querySelectorAll("video[autoplay]:not([controls])").length,
  };

  // ── 52. Transforms create containing blocks ────────────────────────────────
  // Exact, not heuristic: a transformed, filtered or contained ancestor becomes
  // the containing block, and the fixed or sticky descendant stops behaving.
  const BREAKERS = ["transform", "filter", "perspective", "backdropFilter"];
  for (const el of els) {
    const pos = css(el).position;
    if (pos !== "fixed" && pos !== "sticky") continue;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = css(a);
      let what = null, value = null;
      for (const k of BREAKERS) {
        if (s[k] && s[k] !== "none") { what = k.replace("backdropFilter", "backdrop-filter"); value = s[k]; break; }
      }
      if (!what && /transform|filter|perspective/.test(s.willChange)) { what = "will-change"; value = s.willChange; }
      if (!what && /paint|layout|strict|content/.test(s.contain)) { what = "contain"; value = s.contain; }
      if (!what) continue;
      add(52, label(el), `position: ${pos} under ${label(a)}, which declares ${what}: ${String(value).slice(0, 40)} and becomes its containing block`);
      break;
    }
  }

  // ── 51. Pins need a scroll track ───────────────────────────────────────────
  // Scoped to stages, not to sticky table headers and nav bars. A sticky element
  // shorter than half the viewport is a header doing its job; the rule is about
  // a pinned stage with nowhere to travel.
  for (const el of els) {
    if (css(el).position !== "sticky") continue;
    const parent = el.parentElement;
    if (!parent) continue;
    const own = box(el).height;
    if (own < vh * 0.5) continue;
    const track = box(parent).height;
    if (track > vh * 1.05 && track > own + 8) continue;
    add(51, label(el), `sticky stage of ${Math.round(own)}px inside a ${Math.round(track)}px track against a ${Math.round(vh)}px viewport, so the pin never moves`);
  }

  // ── 62. Hide marquee clones ────────────────────────────────────────────────
  // The clones are injected at runtime, which is why this rule was never
  // decidable from source. A marquee is a container whose track or children run
  // an infinite animation; the defect is a duplicated copy a screen reader will
  // read again.
  for (const track of els) {
    const kids = Array.from(track.children);
    if (kids.length < 2) continue;
    if (!infinite(track) && !kids.some(infinite)) continue;
    const seen = new Set();
    let dupes = 0, sample = "";
    for (const k of kids) {
      const t = norm(k.textContent);
      if (t.length < 8) continue;
      if (!seen.has(t)) { seen.add(t); continue; }
      if (k.getAttribute("aria-hidden") === "true") continue;
      dupes++;
      if (!sample) sample = t.slice(0, 40);
    }
    if (dupes) add(62, label(track), `${dupes} duplicated cop${dupes > 1 ? "ies" : "y"} not marked aria-hidden, so the track is read again ("${sample}")`);
  }

  // ── 23. Inline errors ──────────────────────────────────────────────────────
  // Only fields the application itself has marked invalid are judged. Using
  // :invalid would fire on every empty required field at first paint, which is
  // not a defect and would bury the real ones.
  const NEAR = 64;
  for (const field of document.querySelectorAll('[aria-invalid="true"], [data-invalid], [data-error]')) {
    if (!visible(field)) continue;
    const fb = box(field);
    const ids = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    const candidates = ids.map(id => document.getElementById(id)).filter(Boolean);
    const scope = field.closest("form, fieldset, [role='group']") || document.body;
    for (const n of scope.querySelectorAll('[role="alert"], [class*="error"], [class*="invalid"], [class*="help"]')) {
      if (!candidates.includes(n)) candidates.push(n);
    }
    const beside = candidates.filter(visible).filter(n => norm(n.textContent).length > 0).some(n => {
      const nb = box(n);
      const overlaps = nb.left < fb.right && nb.right > fb.left;
      const gap = nb.top >= fb.bottom ? nb.top - fb.bottom : fb.top - nb.bottom;
      return overlaps && gap < NEAR;
    });
    if (beside) continue;
    add(23, label(field), ids.length
      ? `marked invalid and its message renders more than ${NEAR}px away from it`
      : `marked invalid with no message rendered beside it`);
  }

  // ── 68. Guarantee decorative video playback ────────────────────────────────
  // The registry rule prescribes a canvas decoder, which is an architecture
  // choice a detector has no business deciding. What a rendered page answers is
  // sharper and more useful: this hero is paused right now. That is the iOS Low
  // Power Mode case the rule describes and could never test, and it is also the
  // autoplay policy, the missing muted attribute and the tab that never got a
  // gesture. One observation, no guessing.
  if (settled) {
    // Decorative only. A video with `controls` is one the reader chose to watch
    // and is allowed to end; that one is rule 67's subject.
    for (const v of Array.from(document.querySelectorAll("video[autoplay]:not([controls])")).slice(0, 3)) {
      if (!visible(v)) continue;
      if (!v.paused) continue;
      // Two ways a decorative hero is not playing, and they need different fixes.
      // Ended without `loop` is the one that looks fine in review: it plays once
      // while somebody watches, then sits frozen on its last frame forever. A
      // hero loops or it is not a hero.
      if (v.ended && !v.hasAttribute("loop")) {
        add(68, label(v), `an autoplay hero played once and is frozen on its last frame ${Math.round(elapsedMs)}ms after load, because it declares no loop`);
        continue;
      }
      const missing = [];
      if (!v.muted && !v.hasAttribute("muted")) missing.push("muted");
      if (!v.hasAttribute("playsinline")) missing.push("playsinline");
      if (!v.hasAttribute("loop")) missing.push("loop");
      const why = missing.length
        ? `it is missing ${missing.join(" and ")}`
        : `the attributes are right, so the browser refused it anyway and nothing catches that`;
      add(68, label(v), `an autoplay hero is still paused ${Math.round(elapsedMs)}ms after load and ${why}${v.poster ? "" : ", with no poster to fall back to"}`);
    }
  }

  // ── 5. Color is not the only signal ────────────────────────────────────────
  // Not "is colour the only signal" in the abstract, which needs to know what the
  // colour means. The decidable half: this element carries a state and says
  // nothing else. Scoped to elements that declare a state, so an ordinary
  // coloured span is not a finding.
  // A field marked invalid with its message in the wrong place is rule 23, which
  // caught exactly this on its own clean fixture the first time this rule ran.
  const CONTROL = new Set(["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A", "PROGRESS", "METER"]);
  for (const el of Array.from(document.querySelectorAll(STATEFUL)).slice(0, 40)) {
    if (!visible(el)) continue;
    if (CONTROL.has(el.tagName)) continue;                          // its role is announced
    if (el.hasAttribute("aria-invalid") || el.hasAttribute("aria-current")) continue;
    if (el.querySelector("svg, img, video, canvas")) continue;      // an icon is a second signal
    if (norm(el.textContent).length > 0) continue;                  // text is a second signal
    const named = el.getAttribute("aria-label") || el.getAttribute("title") ||
      (el.getAttribute("aria-labelledby") && norm((document.getElementById(el.getAttribute("aria-labelledby")) || {}).textContent));
    if (named) continue;
    const s = css(el);
    // The element must actually be painted in a colour, or there is nothing to
    // be the only signal.
    const painted = s.backgroundColor !== "rgba(0, 0, 0, 0)" || s.borderTopWidth !== "0px";
    if (!painted) continue;
    add(5, label(el), `carries a state and renders as ${s.backgroundColor} with no text, no icon and no accessible name`);
  }

  // ── 27. Loading state choreography ─────────────────────────────────────────
  // The half a single observation can decide. The 300ms boundary needs the load
  // instrumented and is not claimed here.
  if (settled) {
    const hit = (sel) => Array.from(document.querySelectorAll(sel)).filter(visible);
    const skeletons = hit('[class*="skeleton"], [class*="shimmer"], [class*="placeholder-glow"]');
    if (skeletons.length) {
      add(27, label(skeletons[0]), `${skeletons.length} skeleton${skeletons.length > 1 ? "s" : ""} still on screen ${Math.round(elapsedMs)}ms after load, past the 2s window where a skeleton stops reassuring`);
    }
    for (const sp of hit('[class*="spinner"], [class*="loader"], [role="progressbar"]').slice(0, 2)) {
      const b = box(sp);
      const near = Array.from(document.querySelectorAll("p, span, div, h1, h2, h3, h4, li")).some(n => {
        if (n.contains(sp) || sp.contains(n)) return false;
        if (norm(n.textContent).length < 10) return false;
        if (!visible(n)) return false;
        const nb = box(n);
        return Math.abs(nb.top - b.bottom) < 120 || Math.abs(b.top - nb.bottom) < 120;
      });
      if (near) continue;
      add(27, label(sp), `a bare spinner is the only feedback ${Math.round(elapsedMs)}ms after load, with no message saying what is taking this long`);
    }
  }

  // Collapse and cap.
  //
  // The first run against a real page, outside the fixtures, produced six
  // identical lines for one defect: six .finder-popup elements sharing a class,
  // each under the same transformed ancestor. Six copies of one sentence is how a
  // report teaches its reader to skim, which costs the other findings too. So
  // identical findings become one line carrying the count, and a rule that still
  // has more distinct findings than the cap says how many it did not list rather
  // than dropping them quietly.
  const PER_RULE_CAP = 3;
  const seen = new Map();
  for (const f of findings) {
    const k = `${f.id} :: ${f.where} :: ${f.evidence}`;
    if (seen.has(k)) seen.get(k).count++;
    else seen.set(k, { ...f, count: 1 });
  }
  const perRule = new Map();
  const out = [];
  for (const f of seen.values()) {
    const n = (perRule.get(f.id) || 0) + 1;
    perRule.set(f.id, n);
    if (n > PER_RULE_CAP) continue;
    out.push(f.count > 1
      ? { id: f.id, where: f.where, evidence: `${f.count} elements matching ${f.where}, each one: ${f.evidence}` }
      : { id: f.id, where: f.where, evidence: f.evidence });
  }
  for (const [id, n] of perRule) {
    if (n > PER_RULE_CAP) out.push({ id, where: "engine",
      evidence: `${n - PER_RULE_CAP} further distinct finding(s) for this rule are not listed` });
  }

  // settled says whether rules 27 and 68 were judged at all. A report that
  // does not carry it reads a partial run as a clean one.
  return { findings: out, scanned: els.length, truncated, elapsedMs, settled, candidates };
}

/** The exact string to hand to Claude in Chrome's javascript_tool. */
export function probeSource(opts = {}) {
  return `(${probe.toString()})(${JSON.stringify(opts)})`;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
// node tools/inspect/rendered.mjs <url> [--json] [--wait 2500] [--viewport 1280x800]
// Uses Playwright when it is installed. When it is not, prints the source to
// paste into Claude in Chrome rather than failing, because that is the other
// supported runner and not a fallback.
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function registryMeta() {
  const parseCsv = (text) => {
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
    return rows;
  };
  const rows = parseCsv(readFileSync(join(ROOT, "tools/data/inspect-rules.csv"), "utf8").trim());
  const head = rows[0];
  const meta = new Map();
  for (const r of rows.slice(1)) {
    const o = Object.fromEntries(head.map((h, i) => [h, r[i]]));
    if (o.id) meta.set(Number(o.id), o);
  }
  return meta;
}

/** Rule ids this probe decides. Read by the coverage guard. */
export const RENDERED_RULE_IDS = [5, 23, 27, 51, 52, 62, 68];

async function main() {
  const args = process.argv.slice(2);
  const target = args.find(a => !a.startsWith("--"));
  const asJson = args.includes("--json");
  const wait = Number(args.includes("--wait") ? args[args.indexOf("--wait") + 1] : 2500);
  const vp = (args.includes("--viewport") ? args[args.indexOf("--viewport") + 1] : "1280x800").split("x").map(Number);

  if (!target) {
    console.error("usage: node tools/inspect/rendered.mjs <url> [--json] [--wait ms] [--viewport WxH]");
    console.error("       node tools/inspect/rendered.mjs --source     # paste into Claude in Chrome");
    process.exit(2);
  }

  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch {
    console.error("Playwright is not installed here, so this run has measured nothing.");
    console.error("Either install it (npm i -D playwright && npx playwright install chromium),");
    console.error("or run the probe in Claude in Chrome with the source printed by --source.");
    process.exit(3);
  }

  // Same env var as tests/rendered-rules.mjs: point at a Chromium already on the
  // machine rather than making the CLI trigger a browser download.
  const executablePath = process.env.NTH_CHROMIUM || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage({ viewport: { width: vp[0] || 1280, height: vp[1] || 800 } });
  await page.goto(target, { waitUntil: "load" });
  await page.waitForTimeout(wait);
  const result = await page.evaluate(probe, {});
  await browser.close();

  const meta = registryMeta();
  const enriched = result.findings.map(f => {
    const m = meta.get(f.id) || {};
    return { ...f, rule: m.rule || `rule ${f.id}`, severity: m.severity || "medium", category: m.category || "", why: m.why || "", source: m.source || "" };
  });

  if (asJson) { console.log(JSON.stringify({ ...result, findings: enriched }, null, 2)); return; }
  console.log(`\nNullToHero rendered probe — ${target}, ${result.scanned} elements, ${vp[0]}x${vp[1]}, read ${wait}ms after load\n`);
  if (result.truncated) console.log(`  NOTE  the page has more elements than the scan cap, so this is a partial read\n`);
  if (!enriched.length) {
    const judged = RENDERED_RULE_IDS.filter(id => (result.candidates || {})[id] > 0);
    const idle = RENDERED_RULE_IDS.filter(id => !((result.candidates || {})[id] > 0));
    console.log("  No named defect found.");
    if (judged.length) console.log(`  Judged and cleared: ${judged.map(id => `${id} (${result.candidates[id]} candidate${result.candidates[id] > 1 ? "s" : ""})`).join(", ")}`);
    if (idle.length) console.log(`  Nothing on the page to judge for: ${idle.join(", ")}. Their silence is not a pass.`);
    console.log(`  At this viewport and this moment only.\n`);
  } else {
    for (const f of enriched) {
      console.log(`  [${String(f.id).padStart(2)}] ${f.rule} — ${f.where}`);
      console.log(`       ${f.evidence}`);
      if (f.why) console.log(`       why: ${f.why}`);
    }
    console.log(`\n  ${enriched.length} findings\n`);
  }
  process.exit(enriched.length ? 1 : 0);
}

if (process.argv.includes("--source")) {
  console.log(probeSource());
} else if (fileURLToPath(import.meta.url) === (process.argv[1] ? (await import("node:path")).resolve(process.argv[1]) : "")) {
  await main();
}
