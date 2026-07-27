#!/usr/bin/env node
/**
 * run.mjs: structural verifier for the behavior case corpus.
 *
 * This harness runs no model. It validates the corpus in tests/behavior/cases as a
 * data structure: every case parses, carries the seven mandatory fields, names a real
 * skill, cites only commands that exist, and obeys the evidence rule that separates a
 * documented intention (`status: simulated`) from an attested one (`status: real`).
 *
 * Running no model is the point. The corpus is the part of the plugin that can rot
 * silently. A command gets renamed, a case keeps citing the old name, and nobody
 * notices because nothing executes it. This verifier catches that in CI with no API
 * key, no network and no per-run cost.
 *
 * Checks:
 *   1. Every case parses and carries the seven mandatory fields with allowed values.
 *   2. Case ids are unique across the whole corpus.
 *   3. target_skill names a directory that exists under skills/.
 *   4. Evidence rule: a `real` case carries evidence_ref and evidence_sha256, the
 *      referenced file exists inside the repository and its hash matches.
 *   5. expected_behavior and failure_modes are non-empty; a failure mode that is only
 *      an expected behavior with a negation prefix is reported as a warning.
 *   6. Every `/skill command` cited in a case exists in that skill's SKILL.md.
 *   7. Every case id referenced by a profile in profiles.json exists.
 *
 * Usage:
 *   node tests/behavior/run.mjs                    # validate the whole corpus
 *   node tests/behavior/run.mjs --profile smoke    # validate one profile's cases
 *   node tests/behavior/run.mjs --list             # list the selected cases, no checks
 *   node tests/behavior/run.mjs --json             # machine-readable result on stdout
 *
 * Exit 0 = every selected case is structurally valid, 1 = at least one error.
 * Warnings never change the exit code.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const CASES_DIR = join(HERE, "cases");
const SKILLS_DIR = join(ROOT, "skills");
const PROFILES_FILE = join(HERE, "profiles.json");

const SCALAR_FIELDS = ["id", "type", "status", "target_skill", "scenario", "input_summary"];
const LIST_FIELDS = ["expected_behavior", "failure_modes"];
const REQUIRED_FIELDS = [...SCALAR_FIELDS, ...LIST_FIELDS];
const ALLOWED_TYPES = ["risk", "routing", "edge", "contract"];
const ALLOWED_STATUS = ["simulated", "real"];
const EVIDENCE_FIELDS = ["evidence_ref", "evidence_sha256"];
const KNOWN_FIELDS = [...REQUIRED_FIELDS, ...EVIDENCE_FIELDS];
const NEGATION_PREFIXES = [
  "does not ", "do not ", "doesn't ", "did not ", "never ", "no ", "not ",
  "fails to ", "fail to ", "failed to ", "refuses to ", "without ",
];

// ─── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const jsonMode = argv.includes("--json");
const listMode = argv.includes("--list");
const profileArg = (() => {
  const i = argv.indexOf("--profile");
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
})();

let errors = 0;
let warnings = 0;
let checks = 0;
const findings = [];

function pass(msg) { if (!jsonMode) console.log(`  ✅  ${msg}`); checks++; }
function fail(msg) { if (!jsonMode) console.error(`  ❌  ${msg}`); findings.push({ level: "error", msg }); errors++; checks++; }
function warn(msg) { if (!jsonMode) console.warn(`  ⚠️   ${msg}`); findings.push({ level: "warning", msg }); warnings++; checks++; }
function section(t) { if (!jsonMode) console.log(`\n── ${t} ──`); }

function die(msg) {
  if (jsonMode) console.log(JSON.stringify({ ok: false, error: msg }, null, 2));
  else console.error(`❌  ${msg}`);
  process.exit(1);
}

// ─── Minimal YAML reader for the case dialect ─────────────────────────────────
// The dialect is fixed: top-level `key: value` scalars and `key:` followed by
// `  - item` lists. Nothing else is accepted, and anything else is reported as a
// malformed line rather than silently dropped.

function unquote(s) {
  const t = s.trim();
  if (t.length > 1 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseCaseYaml(text) {
  const out = { __malformed: [] };
  let currentKey = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    if (/^\s*#/.test(raw)) continue;

    const item = raw.match(/^\s+-\s+(.+)$/);
    if (item) {
      if (!currentKey) { out.__malformed.push(raw); continue; }
      if (!Array.isArray(out[currentKey])) out[currentKey] = [];
      out[currentKey].push(unquote(item[1]));
      continue;
    }

    const kv = raw.match(/^([A-Za-z_][A-Za-z0-9_]*):(?:[ \t]+(.*))?$/);
    if (kv) {
      currentKey = kv[1];
      const value = kv[2] === undefined ? "" : kv[2].trim();
      out[currentKey] = value === "" ? [] : unquote(value);
      continue;
    }

    out.__malformed.push(raw);
  }
  return out;
}

function extractYamlBlocks(markdown) {
  const blocks = [];
  const re = /^```yaml[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const before = markdown.slice(0, m.index).split(/\r?\n/).length;
    blocks.push({ body: m[1], line: before + 1 });
  }
  return blocks;
}

// ─── Load the corpus ──────────────────────────────────────────────────────────

if (!existsSync(CASES_DIR)) die(`cases directory not found: ${relative(ROOT, CASES_DIR)}`);

const caseFiles = readdirSync(CASES_DIR).filter(f => f.endsWith(".md")).sort();
if (!caseFiles.length) die(`no case files found in ${relative(ROOT, CASES_DIR)}`);

const cases = [];
for (const file of caseFiles) {
  const md = readFileSync(join(CASES_DIR, file), "utf8");
  for (const block of extractYamlBlocks(md)) {
    const data = parseCaseYaml(block.body);
    cases.push({ file, line: block.line, data, raw: block.body });
  }
}
if (!cases.length) die(`no yaml case blocks found in ${relative(ROOT, CASES_DIR)}`);

const where = (c) => `${c.file}:${c.line}`;
const label = (c) => (typeof c.data.id === "string" && c.data.id ? c.data.id : `<no id> (${where(c)})`);

// ─── Skills present on disk, and the commands each one declares ───────────────

const skillsOnDisk = existsSync(SKILLS_DIR)
  ? readdirSync(SKILLS_DIR).filter(d => statSync(join(SKILLS_DIR, d)).isDirectory()).sort()
  : [];

const commandCache = new Map();
function commandsFor(skill) {
  if (commandCache.has(skill)) return commandCache.get(skill);
  const file = join(SKILLS_DIR, skill, "SKILL.md");
  const names = new Set();
  if (existsSync(file)) {
    const md = readFileSync(file, "utf8");
    const add = (word) => {
      const t = String(word).trim().toLowerCase();
      if (/^[a-z][a-z0-9-]*$/.test(t)) names.add(t);
    };
    // The argument-hint frontmatter enumerates the accepted sub-commands.
    const hint = md.match(/^argument-hint:[ \t]*(.*)$/m);
    if (hint) for (const w of unquote(hint[1]).split(/[^A-Za-z0-9-]+/)) add(w);
    // Every inline code span in the body: `audit [url]`, `/seo page`, `checks`.
    for (const m of md.matchAll(/`([^`\n]+)`/g)) {
      const tokens = m[1].trim().split(/\s+/);
      if (tokens[0].startsWith("/")) {
        add(tokens[0].slice(1));
        if (tokens[1]) add(tokens[1].replace(/^[[(]|[\])]$/g, ""));
      } else {
        add(tokens[0]);
      }
    }
  }
  commandCache.set(skill, names);
  return names;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

let profiles = {};
let profilesError = null;
if (existsSync(PROFILES_FILE)) {
  try {
    const parsed = JSON.parse(readFileSync(PROFILES_FILE, "utf8"));
    profiles = parsed.profiles || {};
  } catch (e) {
    profilesError = e.message;
  }
} else {
  profilesError = "profiles.json not found";
}

function resolveProfile(name) {
  const p = profiles[name];
  if (!p) return null;
  if (p.mode === "all") return cases.map(c => c.data.id);
  if (p.mode === "type") return cases.filter(c => c.data.type === p.type).map(c => c.data.id);
  return Array.isArray(p.cases) ? p.cases.slice() : [];
}

let selected = cases;
if (profileArg) {
  if (profilesError) die(`--profile ${profileArg} requested but profiles.json is unusable: ${profilesError}`);
  const ids = resolveProfile(profileArg);
  if (ids === null) die(`unknown profile: ${profileArg} (known: ${Object.keys(profiles).join(", ") || "none"})`);
  const wanted = new Set(ids);
  selected = cases.filter(c => wanted.has(c.data.id));
}

// ─── List mode ────────────────────────────────────────────────────────────────

if (listMode) {
  if (jsonMode) {
    console.log(JSON.stringify({
      profile: profileArg || "full",
      count: selected.length,
      cases: selected.map(c => ({
        id: c.data.id, type: c.data.type, status: c.data.status,
        target_skill: c.data.target_skill, source: `${c.file}:${c.line}`,
      })),
    }, null, 2));
  } else {
    console.log(`\n── Behavior cases (${profileArg || "full"}: ${selected.length}) ──`);
    for (const c of selected) {
      const id = String(c.data.id ?? "<no id>").padEnd(38);
      const type = String(c.data.type ?? "?").padEnd(9);
      const status = String(c.data.status ?? "?").padEnd(10);
      console.log(`  ${id} ${type} ${status} ${c.data.target_skill ?? "?"}   ${c.file}:${c.line}`);
    }
    console.log("");
  }
  process.exit(0);
}

// ─── Check 1: field presence, shape and allowed values ────────────────────────

section("1. Case blocks parse and carry the seven mandatory fields");

for (const c of selected) {
  const d = c.data;
  const problems = [];

  if (d.__malformed && d.__malformed.length) {
    problems.push(`${d.__malformed.length} unparsable line(s), first: ${d.__malformed[0].trim().slice(0, 60)}`);
  }
  for (const f of SCALAR_FIELDS) {
    if (typeof d[f] !== "string" || !d[f].trim()) problems.push(`missing or empty scalar field '${f}'`);
  }
  for (const f of LIST_FIELDS) {
    if (!Array.isArray(d[f])) problems.push(`field '${f}' is not a list`);
  }
  for (const k of Object.keys(d)) {
    if (k === "__malformed") continue;
    if (!KNOWN_FIELDS.includes(k)) problems.push(`unknown field '${k}'`);
  }
  if (typeof d.type === "string" && !ALLOWED_TYPES.includes(d.type)) {
    problems.push(`type '${d.type}' is not one of ${ALLOWED_TYPES.join(", ")}`);
  }
  if (typeof d.status === "string" && !ALLOWED_STATUS.includes(d.status)) {
    problems.push(`status '${d.status}' is not one of ${ALLOWED_STATUS.join(", ")}`);
  }
  if (typeof d.id === "string" && d.id && !/^[a-z][a-z0-9-]*$/.test(d.id)) {
    problems.push(`id '${d.id}' is not lowercase kebab-case`);
  }

  if (problems.length) fail(`${label(c)} (${where(c)}): ${problems.join("; ")}`);
  else pass(`${d.id}: ${d.type}/${d.status} on ${d.target_skill}`);
}

// ─── Check 2: unique ids across the whole corpus ──────────────────────────────

section("2. Case ids are unique across the corpus");

{
  const seen = new Map();
  const dupes = new Map();
  for (const c of cases) {
    const id = c.data.id;
    if (typeof id !== "string" || !id) continue;
    if (seen.has(id)) {
      if (!dupes.has(id)) dupes.set(id, [seen.get(id)]);
      dupes.get(id).push(where(c));
    } else {
      seen.set(id, where(c));
    }
  }
  if (dupes.size) {
    for (const [id, locations] of dupes) fail(`duplicate id '${id}' at ${locations.join(" and ")}`);
  } else {
    pass(`${seen.size} unique id(s) across ${caseFiles.length} case file(s)`);
  }
}

// ─── Check 3: target_skill exists under skills/ ───────────────────────────────

section("3. target_skill names a skill present in skills/");

{
  let bad = 0;
  for (const c of selected) {
    const skill = c.data.target_skill;
    if (typeof skill !== "string" || !skill) continue;
    if (!skillsOnDisk.includes(skill)) {
      fail(`${label(c)}: target_skill '${skill}' has no directory in skills/ (present: ${skillsOnDisk.join(", ")})`);
      bad++;
    }
  }
  if (!bad) pass(`every target_skill resolves (skills on disk: ${skillsOnDisk.join(", ")})`);
}

// ─── Check 4: the evidence rule ───────────────────────────────────────────────
// A simulated case documents an intention and proves nothing, so it needs no
// artifact. A real case claims an artifact exists, so the claim is checked: both
// fields present, the file inside the repository, the hash matching.

section("4. Evidence rule: 'real' cases carry a verifiable artifact");

{
  const realCases = selected.filter(c => c.data.status === "real");
  const simulated = selected.length - realCases.length;
  let bad = 0;

  for (const c of selected) {
    if (c.data.status !== "real") {
      const stray = EVIDENCE_FIELDS.filter(f => typeof c.data[f] === "string" && c.data[f]);
      if (stray.length) {
        warn(`${label(c)}: status is '${c.data.status}' but carries ${stray.join(" and ")}; promote it to 'real' or drop the field`);
      }
      continue;
    }

    const missing = EVIDENCE_FIELDS.filter(f => typeof c.data[f] !== "string" || !c.data[f].trim());
    if (missing.length) {
      fail(`${label(c)}: status 'real' requires ${missing.join(" and ")}`);
      bad++;
      continue;
    }

    const abs = resolve(ROOT, c.data.evidence_ref);
    if (abs !== ROOT && !abs.startsWith(ROOT + sep)) {
      fail(`${label(c)}: evidence_ref '${c.data.evidence_ref}' resolves outside the repository`);
      bad++;
      continue;
    }
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      fail(`${label(c)}: evidence_ref '${c.data.evidence_ref}' does not exist on disk`);
      bad++;
      continue;
    }

    const actual = createHash("sha256").update(readFileSync(abs)).digest("hex");
    const claimed = c.data.evidence_sha256.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(claimed)) {
      fail(`${label(c)}: evidence_sha256 is not a 64 character hex digest`);
      bad++;
    } else if (actual !== claimed) {
      fail(`${label(c)}: evidence_sha256 mismatch for '${c.data.evidence_ref}' (recorded ${claimed.slice(0, 12)}..., actual ${actual.slice(0, 12)}...)`);
      bad++;
    } else {
      pass(`${c.data.id}: evidence ${c.data.evidence_ref} verified`);
    }
  }

  if (!bad) pass(`${realCases.length} real case(s) attested, ${simulated} simulated case(s) carry no evidence claim`);
}

// ─── Check 5: behavior lists are populated and not negation mirrors ───────────

section("5. expected_behavior and failure_modes are populated and distinct");

{
  const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const stripNegation = (s) => {
    for (const p of NEGATION_PREFIXES) if (s.startsWith(p)) return s.slice(p.length).trim();
    return null;
  };

  let bad = 0;
  for (const c of selected) {
    const exp = Array.isArray(c.data.expected_behavior) ? c.data.expected_behavior : [];
    const fm = Array.isArray(c.data.failure_modes) ? c.data.failure_modes : [];
    if (!exp.length) { fail(`${label(c)}: expected_behavior is empty`); bad++; }
    if (!fm.length) { fail(`${label(c)}: failure_modes is empty`); bad++; }

    const expSet = new Set(exp.map(normalize));
    for (const entry of fm) {
      const n = normalize(entry);
      if (expSet.has(n)) {
        warn(`${label(c)}: failure mode duplicates an expected behavior verbatim: "${String(entry).slice(0, 60)}"`);
        continue;
      }
      const stripped = stripNegation(n);
      if (stripped && expSet.has(stripped)) {
        warn(`${label(c)}: failure mode is the negation of an expected behavior: "${String(entry).slice(0, 60)}"`);
      }
    }
  }
  if (!bad) pass(`${selected.length} case(s) carry non-empty expected_behavior and failure_modes`);
}

// ─── Check 6: cited commands exist in the owning SKILL.md ─────────────────────

section("6. Commands cited in a case exist in the owning SKILL.md");

{
  const CMD_RE = new RegExp(`/(${skillsOnDisk.join("|")})\\s+([a-z][a-z0-9-]*)`, "g");
  let cited = 0;
  let bad = 0;
  for (const c of selected) {
    const seenHere = new Set();
    for (const m of c.raw.matchAll(CMD_RE)) {
      const key = `${m[1]} ${m[2]}`;
      if (seenHere.has(key)) continue;
      seenHere.add(key);
      cited++;
      if (!commandsFor(m[1]).has(m[2])) {
        fail(`${label(c)}: cites '/${key}' but '${m[2]}' is not declared in skills/${m[1]}/SKILL.md`);
        bad++;
      }
    }
  }
  if (!bad) pass(`${cited} command citation(s) resolve against the skill definitions`);
}

// ─── Check 7: profiles reference real case ids ────────────────────────────────

section("7. profiles.json references existing case ids");

{
  if (profilesError) {
    fail(`profiles.json unusable: ${profilesError}`);
  } else if (!Object.keys(profiles).length) {
    fail("profiles.json declares no profiles");
  } else {
    const known = new Set(cases.map(c => c.data.id).filter(Boolean));
    for (const [name, p] of Object.entries(profiles)) {
      const mode = p.mode || "named";
      if (mode === "all") {
        pass(`profile '${name}': whole corpus (${cases.length} case(s))`);
      } else if (mode === "type") {
        if (!ALLOWED_TYPES.includes(p.type)) {
          fail(`profile '${name}': type '${p.type}' is not one of ${ALLOWED_TYPES.join(", ")}`);
        } else {
          const n = cases.filter(c => c.data.type === p.type).length;
          if (!n) fail(`profile '${name}': no case has type '${p.type}'`);
          else pass(`profile '${name}': ${n} case(s) of type '${p.type}'`);
        }
      } else {
        const ids = Array.isArray(p.cases) ? p.cases : null;
        if (!ids) { fail(`profile '${name}': named profile has no 'cases' array`); continue; }
        const unknown = ids.filter(id => !known.has(id));
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        if (unknown.length) fail(`profile '${name}': unknown case id(s) ${unknown.join(", ")}`);
        else if (dupes.length) fail(`profile '${name}': duplicate entr(ies) ${[...new Set(dupes)].join(", ")}`);
        else pass(`profile '${name}': ${ids.length} named case(s), all resolve`);
      }
    }
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const byType = {};
const bySkill = {};
const byStatus = {};
for (const c of selected) {
  byType[c.data.type] = (byType[c.data.type] || 0) + 1;
  bySkill[c.data.target_skill] = (bySkill[c.data.target_skill] || 0) + 1;
  byStatus[c.data.status] = (byStatus[c.data.status] || 0) + 1;
}

if (jsonMode) {
  console.log(JSON.stringify({
    ok: errors === 0,
    profile: profileArg || "full",
    cases: selected.length,
    corpus: cases.length,
    checks, errors, warnings,
    by_type: byType,
    by_skill: bySkill,
    by_status: byStatus,
    findings,
  }, null, 2));
  process.exit(errors > 0 ? 1 : 0);
}

const fmt = (o) => Object.entries(o).sort().map(([k, v]) => `${k} ${v}`).join(", ") || "none";

console.log("\n" + "═".repeat(50));
console.log(`  Profile:     ${profileArg || "full"}`);
console.log(`  Cases:       ${selected.length} of ${cases.length} in the corpus`);
console.log(`  By skill:    ${fmt(bySkill)}`);
console.log(`  By type:     ${fmt(byType)}`);
console.log(`  By status:   ${fmt(byStatus)}`);
console.log(`  Checks run:  ${checks}`);
console.log(`  Passed:      ${checks - errors - warnings}`);
console.log(`  Warnings:    ${warnings}`);
console.log(`  Errors:      ${errors}`);
console.log("═".repeat(50) + "\n");

if (errors > 0) {
  console.error(`❌  Behavior corpus FAILED with ${errors} error(s).`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`⚠️   Behavior corpus valid with ${warnings} warning(s).`);
  process.exit(0);
} else {
  console.log("✅  Behavior corpus valid. Note: a valid corpus is not a passing behavior test.");
  process.exit(0);
}
