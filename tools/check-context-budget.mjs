#!/usr/bin/env node
/**
 * NullToHero :: Context budget guard
 * Usage: node tools/check-context-budget.mjs [--json] [--report] [--strict]
 *
 * WHY THIS EXISTS
 * ---------------
 * The plugin is built on progressive disclosure: a short SKILL.md is always in
 * context, and the heavy material sits in references/ that get loaded only when
 * a command actually needs them. That design only pays off while the sizes stay
 * bounded. Without a budget enforced in CI the decay is silent: one reference
 * file grows by 200 lines a release, one command quietly accumulates a ninth
 * reference, and nobody notices until a real session blows its context window
 * and the model starts dropping instructions from the middle of the prompt.
 * A failing build is a cheaper signal than a truncated conversation.
 *
 * DESIGN CONSTRAINT: STRUCTURAL ONLY
 * ----------------------------------
 * This guard never calls a model and never estimates tokens. Token counts are a
 * moving target: they depend on the tokenizer, the model version and the host,
 * so a threshold expressed in tokens would drift under our feet and would make
 * CI depend on a network round trip. Bytes and lines are host independent,
 * deterministic and cheap. They are a proxy, not a measurement, and that is
 * exactly what a guard needs: a stable tripwire, not a precise gauge.
 *
 * CALIBRATION RULE (read before touching any number below)
 * --------------------------------------------------------
 * Budgets are tightened only after a deliberate restructuring, never because a
 * file "needs" more room. When a file trips a budget the answer is to extract
 * the overflow into references/ or to split the file, not to raise the ceiling.
 * Raising a ceiling to make CI green converts a design signal into noise, and
 * the second time it happens the budget has stopped meaning anything.
 *
 * HOW THE NUMBERS BELOW WERE PICKED
 * ---------------------------------
 * Every budget was measured against the repository first, then set roughly 25
 * to 30 percent above the largest thing actually in the tree. That headroom is
 * deliberate: it leaves room for normal editing without a false alarm on every
 * PR, while still catching a file that doubles. Measurements taken at v2.2.1:
 *
 *   budget                   observed max                              headroom
 *   SKILL_MD_MAX_LINES       192 lines  skills/siteasy/SKILL.md            +30%
 *   REFERENCE_MAX_BYTES      41494 B    siteasy/references/live.md         +28%
 *   AGENT_MAX_BYTES          8484 B     agents/inspect-agent-a11y.md       +27%
 *   ACTIVATION_MAX_BYTES     72769 B    siteasy `build` (9 references)     +29%
 *   SKILL_TOTAL_MAX_BYTES    745100 B   skills/siteasy (SKILL.md + 84 refs)+29%
 *
 * ACTIVATION_MAX_BYTES is the budget that matters most. The other four measure
 * files sitting on disk; this one measures what actually enters context when a
 * user types a command, because it sums every references/ file that the command
 * row in the SKILL.md commands table points at. A skill can look healthy file
 * by file and still have one command that drags 90 KB into the window.
 *
 * Exit codes: 0 = every budget respected, 1 = at least one budget exceeded.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- Budgets ------------------------------------------------------------------
// See "HOW THE NUMBERS BELOW WERE PICKED" above. Do not raise a value here to
// unblock a PR: extract to references/ or split the file instead.

const BUDGETS = {
  // A SKILL.md is loaded on every invocation of that skill, so it is the most
  // expensive file per byte in the repo. Cap it in lines rather than bytes: the
  // failure mode is a table or a section list growing unread, and lines are what
  // an author sees while editing. 192 observed, +30%.
  SKILL_MD_MAX_LINES: 250,

  // One reference file is read whole by the Read tool when a command needs it.
  // 52 KiB is generous for a single doc, and a doc past it is almost always two
  // docs wearing a trench coat. 41494 B observed, +28%.
  REFERENCE_MAX_BYTES: 53248,

  // Sub-agent files are loaded as the entire system prompt of a spawned agent,
  // and up to 15 of them run in parallel during /audit full. Keeping each one
  // small is what keeps a fan-out affordable. 8484 B observed, +27%.
  AGENT_MAX_BYTES: 10752,

  // Sum of every references/ file cited by a single command row. This is the
  // real context cost of typing that command. 72769 B observed, +29%.
  ACTIVATION_MAX_BYTES: 94208,

  // SKILL.md plus all of its references. This is the ceiling on how big a single
  // skill is allowed to become before it should be split into two skills.
  // 745100 B observed, +29%.
  SKILL_TOTAL_MAX_BYTES: 962560,
};

// A file that crosses this fraction of its budget is reported as a warning, not
// an error. It is an early smoke alarm: at 90 percent the next normal-sized
// edit trips the budget, and the author should hear about it while they still
// have the file open rather than in a later, unrelated PR.
const WATERMARK = 0.9;

// --- CLI ----------------------------------------------------------------------

const argv = process.argv.slice(2);
const wantJson = argv.includes("--json");
const wantReport = argv.includes("--report");
const strict = argv.includes("--strict");

if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`
NullToHero :: Context budget guard

  Enforces the progressive-disclosure budgets of the plugin. Structural only:
  it counts bytes and lines, never tokens, and never calls a model.

USAGE
  node tools/check-context-budget.mjs [options]

OPTIONS
  --json      Machine-readable result on stdout (budgets, measurements,
              violations, warnings). Suppresses the human report.
  --report    Print the 15 largest files even when every budget passes.
              Useful for watching the slope between releases.
  --strict    Treat warnings (files above ${Math.round(WATERMARK * 100)} percent of a budget,
              unresolved references) as errors.
  --help,-h   This text.

BUDGETS ENFORCED
  SKILL_MD_MAX_LINES     ${String(BUDGETS.SKILL_MD_MAX_LINES).padStart(7)} lines   per skills/*/SKILL.md
  REFERENCE_MAX_BYTES    ${String(BUDGETS.REFERENCE_MAX_BYTES).padStart(7)} bytes   per references/**/*.md
  AGENT_MAX_BYTES        ${String(BUDGETS.AGENT_MAX_BYTES).padStart(7)} bytes   per agents/*.md
  ACTIVATION_MAX_BYTES   ${String(BUDGETS.ACTIVATION_MAX_BYTES).padStart(7)} bytes   per command (sum of its references)
  SKILL_TOTAL_MAX_BYTES  ${String(BUDGETS.SKILL_TOTAL_MAX_BYTES).padStart(7)} bytes   per skill (SKILL.md + references)

CALIBRATION RULE
  Tighten a budget only after a deliberate restructuring. When a file exceeds
  its budget, extract the overflow into references/ or split the file. Never
  raise a ceiling to make the build green.

EXIT CODES
  0  every budget respected
  1  at least one budget exceeded
`);
  process.exit(0);
}

// --- Reporters (same shape as tests/validate.js so CI output stays uniform) ----

let errors = 0;
let warnings = 0;
let checks = 0;

const quiet = wantJson;
function pass(msg) { if (!quiet) console.log(`  ✅  ${msg}`); checks++; }
function fail(msg) { if (!quiet) console.error(`  ❌  ${msg}`); errors++; checks++; }
function warn(msg) { if (!quiet) console.warn(`  ⚠️   ${msg}`); warnings++; checks++; }
function section(t) { if (!quiet) console.log(`\n── ${t} ──`); }

// --- Helpers ------------------------------------------------------------------

function walk(dir, filter) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, filter));
    else if (filter(name)) out.push(p);
  }
  return out;
}

function rel(p) {
  return p.slice(ROOT.length + 1).split("\\").join("/");
}

function bytesOf(p) {
  return statSync(p).size;
}

function lineCount(p) {
  return readFileSync(p, "utf8").split("\n").length;
}

function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

// Percentage by which a measure overshoots its budget, e.g. 110 against 100 is 10.
function overshoot(actual, budget) {
  return (((actual - budget) / budget) * 100).toFixed(1);
}

/**
 * Extract command -> [reference paths] from a SKILL.md commands table.
 * Mirrors extractCommandRefs() in tests/validate.js on purpose: the two guards
 * must agree on what a command's reference set is, otherwise one of them is
 * budgeting a different thing than the other validates. Rows can cite several
 * references (joined by " + "), and duplicates within a row are counted once
 * because the host would read the same file once.
 */
function extractCommandRefs(skillText) {
  const map = {};
  if (!skillText) return map;
  for (const line of skillText.split("\n")) {
    const cmd = line.match(/^\| `([\w][\w-]*)/);
    if (!cmd) continue;
    const refs = [...line.matchAll(/\[references\/([\w\-/.]+\.md)\]/g)].map((m) => m[1]);
    if (refs.length > 0) map[cmd[1]] = [...new Set(refs)];
  }
  return map;
}

// --- Collect the repository ---------------------------------------------------

const SKILLS_DIR = join(ROOT, "skills");
const AGENTS_DIR = join(ROOT, "agents");

const skillNames = existsSync(SKILLS_DIR)
  ? readdirSync(SKILLS_DIR).filter((d) => existsSync(join(SKILLS_DIR, d, "SKILL.md"))).sort()
  : [];

// Every file measured, for the --report ranking and the JSON payload.
const measured = [];
const violations = [];
const warned = [];

function record(kind, path, actual, budget, unit) {
  measured.push({ kind, path, actual, budget, unit });
}

function judge(kind, label, actual, budget, unit, extra) {
  const unitStr = unit === "lines" ? `${actual} lines` : kb(actual);
  const budgetStr = unit === "lines" ? `${budget} lines` : kb(budget);
  if (actual > budget) {
    violations.push({ kind, path: label, actual, budget, unit, over: Number(overshoot(actual, budget)) });
    fail(`${label}: ${unitStr} exceeds ${kind} of ${budgetStr} by ${overshoot(actual, budget)} percent${extra ? ` (${extra})` : ""}. Extract to references/ or split the file; do not raise the budget.`);
    return false;
  }
  if (actual > budget * WATERMARK) {
    warned.push({ kind, path: label, actual, budget, unit, pct: Number(((actual / budget) * 100).toFixed(1)) });
    warn(`${label}: ${unitStr} is at ${((actual / budget) * 100).toFixed(0)} percent of the ${kind} (${budgetStr}). Plan a split before it trips.`);
    return false;
  }
  pass(`${label}: ${unitStr} (budget ${budgetStr}, ${((actual / budget) * 100).toFixed(0)} percent used)${extra ? ` ${extra}` : ""}`);
  return true;
}

// --- Check 1: SKILL.md line budget --------------------------------------------

section(`1. SKILL.md line budget (max ${BUDGETS.SKILL_MD_MAX_LINES} lines)`);

if (skillNames.length === 0) {
  fail("skills/ contains no directory with a SKILL.md; nothing to budget");
} else {
  for (const s of skillNames) {
    const p = join(SKILLS_DIR, s, "SKILL.md");
    const lines = lineCount(p);
    record("SKILL_MD_MAX_LINES", rel(p), lines, BUDGETS.SKILL_MD_MAX_LINES, "lines");
    judge("SKILL_MD_MAX_LINES", rel(p), lines, BUDGETS.SKILL_MD_MAX_LINES, "lines");
  }
}

// --- Check 2: single reference file byte budget -------------------------------

section(`2. Reference file byte budget (max ${kb(BUDGETS.REFERENCE_MAX_BYTES)})`);

let refCount = 0;
let refOffenders = 0;
for (const s of skillNames) {
  const refsDir = join(SKILLS_DIR, s, "references");
  for (const f of walk(refsDir, (n) => n.endsWith(".md"))) {
    refCount++;
    const b = bytesOf(f);
    record("REFERENCE_MAX_BYTES", rel(f), b, BUDGETS.REFERENCE_MAX_BYTES, "bytes");
    if (b > BUDGETS.REFERENCE_MAX_BYTES * WATERMARK) {
      judge("REFERENCE_MAX_BYTES", rel(f), b, BUDGETS.REFERENCE_MAX_BYTES, "bytes");
      refOffenders++;
    }
  }
}
// Passing files are summarised rather than listed one by one: 121 green lines
// would bury the five sections that follow.
if (refCount > 0 && refOffenders === 0) {
  const biggest = measured
    .filter((m) => m.kind === "REFERENCE_MAX_BYTES")
    .sort((a, b) => b.actual - a.actual)[0];
  pass(`${refCount} reference files, all within ${kb(BUDGETS.REFERENCE_MAX_BYTES)} (largest: ${biggest.path} at ${kb(biggest.actual)})`);
} else if (refCount === 0) {
  warn("no reference files found under skills/*/references/");
}

// --- Check 3: agent file byte budget ------------------------------------------

section(`3. Agent file byte budget (max ${kb(BUDGETS.AGENT_MAX_BYTES)})`);

const agentFiles = existsSync(AGENTS_DIR)
  ? readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md")).sort()
  : [];

let agentOffenders = 0;
for (const f of agentFiles) {
  const p = join(AGENTS_DIR, f);
  const b = bytesOf(p);
  record("AGENT_MAX_BYTES", rel(p), b, BUDGETS.AGENT_MAX_BYTES, "bytes");
  if (b > BUDGETS.AGENT_MAX_BYTES * WATERMARK) {
    judge("AGENT_MAX_BYTES", rel(p), b, BUDGETS.AGENT_MAX_BYTES, "bytes");
    agentOffenders++;
  }
}
if (agentFiles.length > 0 && agentOffenders === 0) {
  const biggest = measured
    .filter((m) => m.kind === "AGENT_MAX_BYTES")
    .sort((a, b) => b.actual - a.actual)[0];
  pass(`${agentFiles.length} agent files, all within ${kb(BUDGETS.AGENT_MAX_BYTES)} (largest: ${biggest.path} at ${kb(biggest.actual)})`);
} else if (agentFiles.length === 0) {
  fail("agents/ is empty or missing; the orchestrators have nothing to dispatch");
}

// --- Check 4: activation chain byte budget (the one that matters most) --------

section(`4. Activation chain byte budget (max ${kb(BUDGETS.ACTIVATION_MAX_BYTES)} per command)`);

let cmdCount = 0;
let unresolved = 0;
const activations = [];

for (const s of skillNames) {
  const skillPath = join(SKILLS_DIR, s, "SKILL.md");
  const refsDir = join(SKILLS_DIR, s, "references");
  const cmds = extractCommandRefs(readFileSync(skillPath, "utf8"));
  const names = Object.keys(cmds);
  if (names.length === 0) {
    warn(`skills/${s}/SKILL.md declares no command with a reference; check the commands table formatting`);
    continue;
  }
  for (const cmd of names) {
    cmdCount++;
    let sum = 0;
    const missing = [];
    for (const r of cmds[cmd]) {
      const p = join(refsDir, r);
      if (existsSync(p)) sum += bytesOf(p);
      else missing.push(r);
    }
    if (missing.length > 0) {
      // Dangling references are already an error in tests/validate.js. Here they
      // are only a warning, because an unresolved path makes the activation sum
      // an undercount, not a budget breach: reporting it twice as an error would
      // give one broken link two different owners.
      warn(`/${s} ${cmd}: ${missing.length} unresolved reference(s) [${missing.join(", ")}]; activation sum is an undercount`);
      unresolved++;
    }
    activations.push({ label: `/${s} ${cmd}`, sum, refs: cmds[cmd].length });
    record("ACTIVATION_MAX_BYTES", `/${s} ${cmd}`, sum, BUDGETS.ACTIVATION_MAX_BYTES, "bytes");
  }
}

activations.sort((a, b) => b.sum - a.sum);
let actOffenders = 0;
for (const a of activations) {
  if (a.sum > BUDGETS.ACTIVATION_MAX_BYTES * WATERMARK) {
    judge("ACTIVATION_MAX_BYTES", a.label, a.sum, BUDGETS.ACTIVATION_MAX_BYTES, "bytes", `${a.refs} reference${a.refs === 1 ? "" : "s"}`);
    actOffenders++;
  }
}
if (cmdCount > 0 && actOffenders === 0) {
  const top = activations[0];
  pass(`${cmdCount} commands, all activation chains within ${kb(BUDGETS.ACTIVATION_MAX_BYTES)} (heaviest: ${top.label} at ${kb(top.sum)} across ${top.refs} references)`);
}
if (unresolved === 0 && cmdCount > 0) {
  pass("every command reference resolves on disk; activation sums are exact");
}

// --- Check 5: per-skill total byte budget -------------------------------------

section(`5. Skill total byte budget (max ${kb(BUDGETS.SKILL_TOTAL_MAX_BYTES)} per skill)`);

for (const s of skillNames) {
  const skillPath = join(SKILLS_DIR, s, "SKILL.md");
  const refsDir = join(SKILLS_DIR, s, "references");
  const refFiles = walk(refsDir, (n) => n.endsWith(".md"));
  const total = bytesOf(skillPath) + refFiles.reduce((n, f) => n + bytesOf(f), 0);
  record("SKILL_TOTAL_MAX_BYTES", `skills/${s}`, total, BUDGETS.SKILL_TOTAL_MAX_BYTES, "bytes");
  judge("SKILL_TOTAL_MAX_BYTES", `skills/${s}`, total, BUDGETS.SKILL_TOTAL_MAX_BYTES, "bytes", `SKILL.md + ${refFiles.length} references`);
}

// --- Optional: the 15 largest files -------------------------------------------
// Printed on request even when everything passes. A budget tells you whether the
// tree is over the line today; this ranking tells you which files are walking
// toward it, which is the information you want one release earlier.

const RANK_SIZE = 15;

function largestFiles() {
  const all = [];
  for (const s of skillNames) {
    all.push({ path: rel(join(SKILLS_DIR, s, "SKILL.md")), bytes: bytesOf(join(SKILLS_DIR, s, "SKILL.md")) });
    for (const f of walk(join(SKILLS_DIR, s, "references"), (n) => n.endsWith(".md"))) {
      all.push({ path: rel(f), bytes: bytesOf(f) });
    }
  }
  for (const f of agentFiles) {
    all.push({ path: rel(join(AGENTS_DIR, f)), bytes: bytesOf(join(AGENTS_DIR, f)) });
  }
  return all.sort((a, b) => b.bytes - a.bytes).slice(0, RANK_SIZE);
}

if (wantReport && !quiet) {
  section(`Report: ${RANK_SIZE} largest context files`);
  const rank = largestFiles();
  const width = Math.max(...rank.map((r) => r.path.length));
  rank.forEach((r, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${r.path.padEnd(width)}  ${kb(r.bytes).padStart(9)}`);
  });

  section("Report: heaviest activation chains");
  const topAct = activations.slice(0, RANK_SIZE);
  const aw = Math.max(...topAct.map((a) => a.label.length));
  topAct.forEach((a, i) => {
    const pct = ((a.sum / BUDGETS.ACTIVATION_MAX_BYTES) * 100).toFixed(0);
    const refLabel = `${a.refs} ${a.refs === 1 ? "ref " : "refs"}`;
    console.log(`  ${String(i + 1).padStart(2)}. ${a.label.padEnd(aw)}  ${kb(a.sum).padStart(9)}  ${refLabel.padStart(6)}  ${pct.padStart(3)} percent of budget`);
  });
}

// --- Result -------------------------------------------------------------------

// In --strict mode warnings are promoted before the summary is printed, so the
// counters and the exit code tell the same story.
if (strict && warnings > 0) {
  errors += warnings;
  warnings = 0;
}

if (wantJson) {
  console.log(JSON.stringify({
    ok: errors === 0,
    strict,
    budgets: BUDGETS,
    watermark: WATERMARK,
    counts: { checks, errors, warnings, skills: skillNames.length, references: refCount, agents: agentFiles.length, commands: cmdCount },
    violations,
    warningsList: warned,
    largest: largestFiles(),
    activations: activations.slice(0, RANK_SIZE),
  }, null, 2));
  process.exit(errors > 0 ? 1 : 0);
}

console.log("\n" + "═".repeat(50));
console.log(`  Checks run:  ${checks}`);
console.log(`  Passed:      ${checks - errors - warnings}`);
console.log(`  Warnings:    ${warnings}`);
console.log(`  Errors:      ${errors}`);
console.log("═".repeat(50) + "\n");

if (errors > 0) {
  console.error(`❌  Context budget FAILED with ${errors} violation(s). Extract or split the offending files; do not raise the budgets.`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`⚠️   Context budget passed with ${warnings} warning(s).`);
  process.exit(0);
} else {
  console.log("✅  All context budgets respected.");
  process.exit(0);
}
