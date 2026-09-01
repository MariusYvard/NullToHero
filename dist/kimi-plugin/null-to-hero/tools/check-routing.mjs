#!/usr/bin/env node
/**
 * NullToHero :: Routing guard
 * Usage: node tools/check-routing.mjs [--json] [--strict]
 *
 * WHY THIS EXISTS
 * ---------------
 * The host picks a skill or a sub-agent by reading descriptions, nothing else.
 * Two problems follow from that, and both are invisible in a normal test run.
 *
 * 1. Duplicate trigger phrases. If two descriptions both claim the quoted
 *    phrase "audit my site", the host has no tiebreak and routes on a coin
 *    flip. It will look correct in testing (it picks the right one half the
 *    time) and it will be blamed on the model rather than on the metadata.
 *    A trigger phrase is a claim of ownership and has to be exclusive.
 *
 * 2. Descriptions with no negative space. A description that only says what to
 *    route TO can never make the host route AWAY. When four skills all describe
 *    themselves as "improves your website", the only thing that separates them
 *    is an explicit exclusion: "Not for backend-only tasks", "for a search-only
 *    audit use /seo audit instead". Without that clause the boundary between
 *    two neighbouring skills exists in the author's head and nowhere else.
 *
 * This guard is structural: it reads frontmatter, it never calls a model, and
 * it takes no position on whether a description is well written. It only checks
 * that the claims are unique, bounded, and short enough to survive a host that
 * truncates.
 *
 * Exit codes: 0 = no errors, 1 = at least one error. Warnings alone never fail
 * the build unless --strict is passed.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- Exemptions ---------------------------------------------------------------
/**
 * Trigger phrases allowed to be claimed by more than one file.
 *
 * Empty on purpose, and it should stay that way. An entry here means two
 * descriptions deliberately fight over the same user words, so it must carry a
 * one-line justification naming both owners and explaining why the host picking
 * either one is acceptable. "It was already like that" is not a justification:
 * the fix for a real collision is to reword one of the two descriptions, not to
 * silence the check. Format: "exact normalized phrase" (lowercase, single
 * spaces), with the justification on the line above.
 */
const PHRASE_EXEMPTIONS = new Set([
  // (none)
]);

// --- Thresholds ---------------------------------------------------------------

// Several hosts truncate a tool or skill description at 1024 characters before
// it ever reaches the model. A description cut mid-sentence loses its tail, and
// the tail is exactly where authors put the trigger phrases and the boundary
// clause, so the truncation removes the two things that make routing work.
const DESC_WARN_CHARS = 1024;

// A second, looser ceiling for the hosts that allow more. Past this length the
// description is not a routing hint any more, it is documentation, and it
// should move into the body of the SKILL.md.
const DESC_HARD_WARN_CHARS = 2048;

// Minimum length of a quoted span before it counts as a trigger phrase. Below
// three characters the quotes are almost always punctuation or a code token
// ('a', 'v2'), not something a user would type.
const MIN_PHRASE_CHARS = 3;

// A description passes the boundary check if it contains any of these. The
// pattern is deliberately loose: it accepts "Not for X, use Y", "use /seo audit
// instead", "rather than", and "use /inspect". Matching prose exactly would
// force one phrasing on every author and the check would be gamed within a
// release. What matters is that the sentence points somewhere else.
const BOUNDARY_PATTERN = /(not for|instead|rather than|use \/)/i;

// --- CLI ----------------------------------------------------------------------

const argv = process.argv.slice(2);
const wantJson = argv.includes("--json");
const strict = argv.includes("--strict");

if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`
NullToHero :: Routing guard

  Checks that the plugin's routing metadata is unambiguous. The host chooses a
  skill or a sub-agent from its description alone, so a duplicated trigger
  phrase or a description with no exclusion clause is a routing bug that no
  functional test can catch.

USAGE
  node tools/check-routing.mjs [options]

OPTIONS
  --json      Machine-readable result on stdout (collisions, boundary gaps,
              oversized descriptions). Suppresses the human report.
  --strict    Treat warnings as errors. This is the gate to switch on once
              every description carries a boundary clause; today it fails,
              which is the point of tracking the gap.
  --help,-h   This text.

CHECKS
  1. Trigger phrase uniqueness   ERROR
     Every quoted phrase of ${MIN_PHRASE_CHARS}+ characters in a frontmatter description,
     across skills/*/SKILL.md and agents/*.md, normalized to lowercase with
     collapsed whitespace. Two files claiming the same phrase is an error:
     the host has no tiebreak and routes on a coin flip.

  2. Boundary clause             WARNING
     Every description should say what it is NOT for. Matched loosely against
     "not for", "instead", "rather than", "use /". A warning rather than an
     error because the repository has not adopted this convention yet and
     failing the build the day the check lands would only teach people to
     delete the check.

  3. Description length          WARNING
     Warns past ${DESC_WARN_CHARS} characters (the truncation point of several hosts) and
     again past ${DESC_HARD_WARN_CHARS}. A truncated description loses its closing trigger
     phrases, which are usually the most specific ones.

  4. Cited commands exist        ERROR
     Every "/skill command" named inside a description must appear in that
     skill's commands table. A description that advertises a command which was
     renamed sends the host to a dead end.

EXIT CODES
  0  no errors (warnings alone do not fail unless --strict)
  1  at least one error
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

// --- Frontmatter parser -------------------------------------------------------
/**
 * Hand-rolled YAML-subset parser. The repository has no dependencies and this
 * guard is not going to be the one that adds a YAML library for four keys.
 *
 * It handles what the plugin's frontmatter actually uses: "key: value" pairs,
 * optionally quoted values, values continued on following indented lines, and
 * block sequences ("  - Read") which are collected under their key and ignored
 * here. It does not handle anchors, nested maps or multi-document files, and it
 * does not need to: tests/validate.js already fails on frontmatter it cannot
 * read, so a file that is too exotic for this parser never reaches CI green.
 */
function parseFrontmatter(content) {
  const stripped = content.replace(/^﻿/, ""); // strip UTF-8 BOM
  const match = stripped.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  let key = null;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_.-]+):[ \t]?(.*)$/);
    if (kv) {
      key = kv[1];
      fm[key] = kv[2];
    } else if (key !== null && line.trim() !== "") {
      // Continuation of the previous value (wrapped string or list item).
      fm[key] += "\n" + line;
    }
  }
  for (const k of Object.keys(fm)) {
    let v = fm[k].trim();
    if (v === ">" || v === "|" || v === ">-" || v === "|-") v = ""; // block scalar header
    // Collapse a wrapped value back into one line, then drop matching quotes.
    v = v.replace(/\s*\n\s*/g, " ").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    fm[k] = v.trim();
  }
  return fm;
}

/**
 * Extract quoted trigger phrases from a description.
 *
 * The opening quote must follow a boundary and the closing quote must precede
 * one, which is what keeps an apostrophe inside a contraction ("don't") from
 * pairing with the next apostrophe and inventing a phrase that nobody wrote.
 * Typographic quotes are accepted because descriptions get pasted from docs.
 */
const PHRASE_PATTERNS = [
  new RegExp(`(?<=^|[\\s(\\[:;,])'([^']{${MIN_PHRASE_CHARS},}?)'(?=$|[\\s)\\].,;:!?])`, "g"),
  new RegExp(`(?<=^|[\\s(\\[:;,])"([^"]{${MIN_PHRASE_CHARS},}?)"(?=$|[\\s)\\].,;:!?])`, "g"),
  new RegExp(`‘([^’]{${MIN_PHRASE_CHARS},}?)’`, "g"),
  new RegExp(`“([^”]{${MIN_PHRASE_CHARS},}?)”`, "g"),
];

function normalizePhrase(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractPhrases(description) {
  const found = new Set(); // a file claiming the same phrase twice is not a conflict
  for (const re of PHRASE_PATTERNS) {
    re.lastIndex = 0;
    for (const m of description.matchAll(re)) {
      const p = normalizePhrase(m[1]);
      if (p.length >= MIN_PHRASE_CHARS) found.add(p);
    }
  }
  return [...found];
}

/**
 * Extract command -> [references] from a SKILL.md commands table.
 * Same shape as tests/validate.js and tools/check-context-budget.mjs so all
 * three guards agree on what the live command set is.
 */
function extractCommands(skillText) {
  const out = new Set();
  for (const line of (skillText || "").split("\n")) {
    const cmd = line.match(/^\| `([\w][\w-]*)/);
    if (cmd && /\[references\/[\w\-/.]+\.md\]/.test(line)) out.add(cmd[1]);
  }
  return out;
}

// --- Collect the routing surface ----------------------------------------------

const SKILLS_DIR = join(ROOT, "skills");
const AGENTS_DIR = join(ROOT, "agents");

const skillCommands = {}; // skill name -> Set of live command names
const targets = [];       // { rel, kind, name, description }

if (existsSync(SKILLS_DIR)) {
  for (const s of readdirSync(SKILLS_DIR).sort()) {
    const p = join(SKILLS_DIR, s, "SKILL.md");
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    skillCommands[s] = extractCommands(text);
    const fm = parseFrontmatter(text);
    targets.push({
      rel: `skills/${s}/SKILL.md`,
      kind: "skill",
      name: (fm && fm.name) || s,
      description: (fm && fm.description) || "",
    });
  }
}

if (existsSync(AGENTS_DIR)) {
  for (const f of readdirSync(AGENTS_DIR).filter((n) => n.endsWith(".md")).sort()) {
    const text = readFileSync(join(AGENTS_DIR, f), "utf8");
    const fm = parseFrontmatter(text);
    targets.push({
      rel: `agents/${f}`,
      kind: "agent",
      name: (fm && fm.name) || f.replace(/\.md$/, ""),
      description: (fm && fm.description) || "",
    });
  }
}

const collisions = [];
const boundaryGaps = [];
const longDescriptions = [];
const deadCommands = [];

// --- Check 1: trigger phrase uniqueness ---------------------------------------

section("1. Trigger phrase uniqueness across skills and sub-agents");

const claimants = new Map(); // normalized phrase -> [rel, ...]
let phraseTotal = 0;

for (const t of targets) {
  if (!t.description) {
    fail(`${t.rel}: no 'description' in frontmatter; the host has nothing to route on`);
    continue;
  }
  for (const p of extractPhrases(t.description)) {
    phraseTotal++;
    if (!claimants.has(p)) claimants.set(p, []);
    claimants.get(p).push(t.rel);
  }
}

let collisionCount = 0;
let exempted = 0;
for (const [phrase, owners] of claimants) {
  if (owners.length < 2) continue;
  if (PHRASE_EXEMPTIONS.has(phrase)) {
    warn(`"${phrase}": claimed by ${owners.join(" and ")}; allowed by an explicit exemption`);
    exempted++;
    continue;
  }
  collisions.push({ phrase, owners });
  fail(`"${phrase}": claimed by ${owners.length} files (${owners.join(", ")}). The host has no tiebreak between them and routes on a coin flip. Reword one of the two descriptions so the phrase belongs to exactly one owner.`);
  collisionCount++;
}

if (targets.length > 0 && collisionCount === 0) {
  pass(`${phraseTotal} trigger phrases across ${targets.length} routing targets, all uniquely claimed${exempted > 0 ? ` (${exempted} exempted)` : ""}`);
}

// --- Check 2: boundary clause -------------------------------------------------
// WARNING, NOT ERROR, ON PURPOSE.
// The repository has not adopted this convention yet: at the time this guard was
// written only 2 of 19 descriptions carried an exclusion clause. Landing the
// check as an error would break CI on the very commit that introduces it, and
// the reflex when a new check turns the build red on day one is to delete the
// check, not to write seventeen descriptions. As a warning it names the gap on
// every run and shrinks as descriptions get reworded, and --strict is available
// the day the list reaches zero.

section("2. Boundary clause (what the description routes AWAY from)");

for (const t of targets) {
  if (!t.description) continue;
  if (BOUNDARY_PATTERN.test(t.description)) {
    pass(`${t.rel}: description states a boundary`);
  } else {
    boundaryGaps.push(t.rel);
    warn(`${t.rel}: no exclusion clause`);
  }
}

if (boundaryGaps.length > 0 && !quiet) {
  console.log(`      ${boundaryGaps.length} of ${targets.length} descriptions never say what they are NOT for.`);
  console.log(`      Fix one at a time: add a clause such as 'Not for X, use /y instead' or`);
  console.log(`      'for a search-only pass use /seo audit'. Run with --strict once the list is empty.`);
}

// --- Check 3: description length ----------------------------------------------

section(`3. Description length (warn past ${DESC_WARN_CHARS}, again past ${DESC_HARD_WARN_CHARS})`);

let overLong = 0;
for (const t of targets) {
  const len = t.description.length;
  if (len > DESC_HARD_WARN_CHARS) {
    longDescriptions.push({ rel: t.rel, length: len, threshold: DESC_HARD_WARN_CHARS });
    warn(`${t.rel}: description is ${len} chars, past the ${DESC_HARD_WARN_CHARS} ceiling. This is documentation, not a routing hint: move the detail into the body of the file.`);
    overLong++;
  } else if (len > DESC_WARN_CHARS) {
    longDescriptions.push({ rel: t.rel, length: len, threshold: DESC_WARN_CHARS });
    warn(`${t.rel}: description is ${len} chars, past the ${DESC_WARN_CHARS} truncation point of several hosts. The tail is cut, and the tail is where the closing trigger phrases live.`);
    overLong++;
  }
}
if (overLong === 0 && targets.length > 0) {
  const longest = targets.reduce((a, b) => (b.description.length > a.description.length ? b : a));
  pass(`all ${targets.length} descriptions under ${DESC_WARN_CHARS} chars (longest: ${longest.rel} at ${longest.description.length})`);
}

// --- Check 4: commands cited in a description actually exist -------------------
// A description is a promise about what the user can type. When a command gets
// renamed, the commands table is updated (validate.js enforces that) but the
// prose in a neighbouring description is not, and the host keeps advertising a
// route that no longer resolves. Only "/skill command" pairs are checked: a bare
// "/skill" mention carries no command claim, and a slash-word that is not a
// known skill (for example "accessibility/interaction") is prose, not a route.

section("4. Commands cited in descriptions resolve to a live command");

let citedTotal = 0;
for (const t of targets) {
  if (!t.description) continue;
  for (const m of t.description.matchAll(/\/([a-z][a-z-]*)(?:[ \t]+([a-z][a-z-]*))?/g)) {
    const skill = m[1];
    const cmd = m[2];
    if (!Object.prototype.hasOwnProperty.call(skillCommands, skill)) continue; // not a skill route
    if (!cmd) continue; // bare "/skill" claims no command
    citedTotal++;
    if (!skillCommands[skill].has(cmd)) {
      deadCommands.push({ rel: t.rel, cited: `/${skill} ${cmd}` });
      fail(`${t.rel}: description advertises \`/${skill} ${cmd}\` but '${cmd}' is not in the commands table of skills/${skill}/SKILL.md. Either the command was renamed or the description is wrong.`);
    }
  }
}
if (deadCommands.length === 0) {
  pass(`all ${citedTotal} command citations in descriptions resolve to a live command`);
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
    thresholds: {
      MIN_PHRASE_CHARS,
      DESC_WARN_CHARS,
      DESC_HARD_WARN_CHARS,
      BOUNDARY_PATTERN: BOUNDARY_PATTERN.source,
    },
    counts: {
      checks,
      errors,
      warnings,
      targets: targets.length,
      phrases: phraseTotal,
      exemptions: PHRASE_EXEMPTIONS.size,
    },
    collisions,
    boundaryGaps,
    longDescriptions,
    deadCommands,
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
  console.error(`❌  Routing check FAILED with ${errors} error(s). Two owners for one trigger phrase means the host picks at random.`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`⚠️   Routing check passed with ${warnings} warning(s).`);
  process.exit(0);
} else {
  console.log("✅  Routing metadata is unambiguous.");
  process.exit(0);
}
