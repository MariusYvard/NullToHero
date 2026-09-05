#!/usr/bin/env node
// variety.mjs — reads the build lines out of a project's LOG.md and answers one
// decidable question: may this build reuse that page shape and that look.
//
// The skill has always said "vary across projects, never converge on the same
// choices". It had no way to know what the last choice was, so the instruction
// was unenforceable and, in practice, unenforced. LOG.md already exists as
// append-only working memory; one line per build in a fixed shape turns it into
// state a script can read, with no new file and no new format to learn.
//
// Usage:
//   node tools/siteasy/variety.mjs [projectRoot] [--json]
//   node tools/siteasy/variety.mjs --check shape=stat-led,paper=dark,display=serif-display,accent=warm,strategy=committed
//
// Pure Node standard library, no dependencies.

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* The four look axes and the page shape. Vocabularies are closed on purpose: an
   open vocabulary makes "did this change" undecidable, which is the failure the
   prose instruction already had. Anything outside a list is reported as
   `unknown` and never counts as a difference, so a typo cannot buy variety. */
export const AXES = ["paper", "display", "accent", "strategy"];

export const VOCAB = {
  // Lightness band of the dominant surface. OKLCH L, per the skill's colour laws.
  paper: ["dark", "mid", "light"],
  // Family of the display face, not its name. Two different grotesques are the
  // same axis value, which is the point.
  display: [
    "grotesque", "grotesque-cond", "geometric", "humanist",
    "serif-old", "serif-transitional", "serif-display",
    "slab", "mono", "script", "display-odd",
  ],
  // Hue band of the accent. `neutral` covers an accent under 0.04 chroma.
  accent: ["warm", "cool", "green", "magenta", "neutral"],
  // The four colour strategies the skill already names.
  strategy: ["restrained", "committed", "full", "drenched"],
};

/* L-VARIETY-1. Two consecutive builds must differ on at least 2 of the 4 look
   axes, and at least one of those must be paper or display.

   The second clause is the one that matters. Hue and strategy can both move
   without the page looking different: a warm accent at 8% coverage and a cool
   accent at 8% coverage on the same light paper with the same grotesque read as
   the same site. Paper and display are the axes a reader sees before anything
   else, so a change that touches neither is not a change. */
export const MIN_AXES = 2;
export const VISIBLE_AXES = ["paper", "display"];

/* L-VARIETY-2. A page shape may not repeat inside this window. Three is enough
   to stop the drift toward one default shape without forbidding a shape the
   project genuinely needs twice. */
export const SHAPE_WINDOW = 3;

const LINE = /^[-*]\s+build\s+(\d{4}-\d{2}-\d{2})\s+(.+)$/i;

/** Parse `- build <date> k=v k=v ...` lines. Unknown keys are kept, unknown
 *  values are kept verbatim: this reads a log, it does not police it. */
export function parseBuildLines(text) {
  if (typeof text !== "string") return [];
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = LINE.exec(raw.trim());
    if (!m) continue;
    const entry = { date: m[1] };
    for (const pair of m[2].split(/\s+/)) {
      const eq = pair.indexOf("=");
      if (eq < 1) continue;
      entry[pair.slice(0, eq).toLowerCase()] = pair.slice(eq + 1);
    }
    out.push(entry);
  }
  // Newest first, so callers never have to think about the file's direction.
  return out.reverse();
}

/** Is this value inside its axis vocabulary. */
export function known(axis, value) {
  const list = VOCAB[axis];
  return Array.isArray(list) && typeof value === "string" && list.includes(value);
}

/** Which axes differ between two entries. A value outside the vocabulary on
 *  either side does not count as a difference: an unreadable value is not
 *  evidence that something changed. */
export function changedAxes(candidate, previous) {
  if (!previous) return [...AXES];
  return AXES.filter((a) =>
    known(a, candidate?.[a]) && known(a, previous[a]) && candidate[a] !== previous[a]);
}

/** The verdict. `ok` false means the build must move before it ships. */
export function verdict(candidate, entries) {
  const history = Array.isArray(entries) ? entries : [];
  const previous = history[0] || null;
  const changed = changedAxes(candidate, previous);
  const visible = changed.filter((a) => VISIBLE_AXES.includes(a));

  const unreadable = AXES.filter((a) => !known(a, candidate?.[a]));
  const recentShapes = history.slice(0, SHAPE_WINDOW).map((e) => e.shape).filter(Boolean);
  const shapeRepeat = Boolean(candidate?.shape) && recentShapes.includes(candidate.shape);

  const reasons = [];
  if (unreadable.length) {
    reasons.push(`axes outside their vocabulary: ${unreadable.join(", ")}`);
  }
  if (previous && changed.length < MIN_AXES) {
    reasons.push(`only ${changed.length} of ${AXES.length} look axes changed, ${MIN_AXES} required (L-VARIETY-1)`);
  }
  if (previous && changed.length >= MIN_AXES && visible.length === 0) {
    reasons.push(`nothing changed on paper or display, so the change is not visible (L-VARIETY-1)`);
  }
  if (shapeRepeat) {
    reasons.push(`page shape "${candidate.shape}" used in the last ${SHAPE_WINDOW} builds (L-VARIETY-2)`);
  }

  return {
    ok: reasons.length === 0,
    first: previous === null,
    changed,
    visible,
    unreadable,
    recentShapes,
    reasons,
  };
}

/** What a fresh build must avoid, for a caller that has not chosen yet. */
export function burned(entries) {
  const history = Array.isArray(entries) ? entries : [];
  const previous = history[0] || null;
  const out = { shapes: history.slice(0, SHAPE_WINDOW).map((e) => e.shape).filter(Boolean) };
  for (const a of AXES) out[a] = previous && known(a, previous[a]) ? previous[a] : null;
  return out;
}

/* ------------------------------- CLI --------------------------------- */

// fileURLToPath, not new URL(...).pathname: on Windows the latter returns
// /C:/... with a leading slash and the CLI silently never runs.
const entry = process.argv[1] ? resolve(process.argv[1]) : "";

if (fileURLToPath(import.meta.url) === entry) {
  const args = process.argv.slice(2);
  const checkAt = args.indexOf("--check");
  // The first bare argument that is not --check's own value.
  let rootArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) { if (args[i] === "--check") i++; continue; }
    rootArg = args[i];
    break;
  }
  const root = resolve(rootArg || process.cwd());
  const logPath = join(root, "LOG.md");

  let text = "";
  try {
    if (existsSync(logPath) && statSync(logPath).isFile()) text = readFileSync(logPath, "utf8");
  } catch { /* an unreadable log is an empty log, not a crash */ }

  const entries = parseBuildLines(text);

  if (checkAt !== -1) {
    const spec = args[checkAt + 1] || "";
    const candidate = {};
    for (const pair of spec.split(",")) {
      const eq = pair.indexOf("=");
      if (eq > 0) candidate[pair.slice(0, eq).trim().toLowerCase()] = pair.slice(eq + 1).trim();
    }
    const v = verdict(candidate, entries);
    if (args.includes("--json")) {
      process.stdout.write(JSON.stringify({ ok: v.ok, ...v, candidate, logPath, entries: entries.length }) + "\n");
    } else if (v.ok) {
      console.log(v.first
        ? "First build in this log. Nothing to differ from."
        : `Clear. Changed: ${v.changed.join(", ")}.`);
    } else {
      for (const r of v.reasons) console.error(`  ${r}`);
    }
    process.exit(v.ok ? 0 : 1);
  }

  const b = burned(entries);
  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify({ ok: true, logPath, entries, burned: b }) + "\n");
    process.exit(0);
  }

  if (!entries.length) {
    console.log(text
      ? `No build lines in ${logPath}. Nothing to vary from.`
      : `No LOG.md at ${root}. Nothing to vary from.`);
    process.exit(0);
  }

  console.log(`Last ${Math.min(entries.length, SHAPE_WINDOW)} of ${entries.length} builds in ${logPath}:`);
  for (const e of entries.slice(0, SHAPE_WINDOW)) {
    console.log(`  ${e.date}  shape=${e.shape ?? "?"}  paper=${e.paper ?? "?"}  display=${e.display ?? "?"}  accent=${e.accent ?? "?"}  strategy=${e.strategy ?? "?"}`);
  }
  console.log(`\nThis build must not use shape: ${b.shapes.join(", ") || "(none recorded)"}`);
  console.log(`It must change at least ${MIN_AXES} of ${AXES.join(", ")}, including one of ${VISIBLE_AXES.join(" or ")}.`);
}
