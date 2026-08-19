#!/usr/bin/env node
/**
 * Portability checks: the generated packages must stay valid for hosts this
 * repository cannot run. Everything here is deterministic, because no Codex and
 * no Kimi is available to answer empirically.
 *
 *   node tests/portability.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(REPO, "null-to-hero");
const DIST = path.join(REPO, "dist");
const HOSTS = ["codex", "kimi"];
const SKILLS = ["seo", "siteasy", "inspect", "audit"];

// agentskills.io/specification
const NAME_RE = /^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$/;
const DESC_MAX = 1024;
const COMPAT_MAX = 500;
// developers.openai.com/codex/skills: the startup skill list uses at most 2% of
// the context window, or 8000 characters when the window is unknown. Over
// budget, Codex shortens descriptions first and drops skills last.
const CODEX_LIST_BUDGET = 8000;
// Kimi Code truncates a description to 250 characters in the listing it shows
// the model (registry.ts, LISTING_DESC_MAX) and leaves whenToUse whole.
const KIMI_LISTING_TRUNCATION = 250;
const SHORT_DESC_MAX = 400;
// The count Claude Code has always substituted. A change here means the loaded
// tree moved, which is exactly what must not happen silently.
const CLAUDE_ROOT_TOKENS = 32;

let passed = 0, failed = 0;
const pass = m => { passed++; console.log(`  ok    ${m}`); };
const fail = m => { failed++; console.log(`  FAIL  ${m}`); };
const section = t => console.log(`\n${t}`);

function frontmatter(file) {
  const m = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  let key = null;
  for (const line of m[1].split("\n")) {
    const nested = line.match(/^\s{2,}([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nested && key === "metadata") {
      out.metadata = out.metadata || {};
      out.metadata[nested[1]] = strip(nested[2]);
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) { key = kv[1]; out[key] = strip(kv[2]); }
  }
  return out;
}
const strip = s => s.replace(/^["'](.*)["']$/s, "$1");

function readCsv(file) {
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").trim();
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  row.push(field); rows.push(row);
  const head = rows.shift();
  return rows.filter(r => r.length === head.length)
    .map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

function walk(dir, ext) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, ext));
    else if (!ext || p.endsWith(ext)) out.push(p);
  }
  return out;
}

// ─── 1. dist is what the source says it is ───────────────────────────────────

section("1. dist/ is in sync with the source");
try {
  execFileSync("node", [path.join(SRC, "tools/build-dist.mjs"), "--check"], { stdio: "pipe" });
  pass("a fresh build reproduces dist/ byte for byte");
} catch (e) {
  fail(`dist/ is stale, run: node null-to-hero/tools/build-dist.mjs\n        ${String(e.stderr || e).trim()}`);
}

// ─── 2. the generated skills follow the Agent Skills specification ───────────

section("2. generated SKILL.md files follow agentskills.io");
for (const host of HOSTS) {
  for (const skill of SKILLS) {
    const dir = path.join(DIST, host, "skills", `nth-${skill}`);
    const file = path.join(dir, "SKILL.md");
    const label = `${host}/nth-${skill}`;

    if (!fs.existsSync(file)) { fail(`${label}: SKILL.md missing`); continue; }
    const fm = frontmatter(file);
    if (!fm) { fail(`${label}: no frontmatter`); continue; }

    if (fm.name !== path.basename(dir)) fail(`${label}: name "${fm.name}" does not match its directory`);
    else if (!NAME_RE.test(fm.name)) fail(`${label}: name "${fm.name}" breaks the naming rules`);
    else pass(`${label}: name valid and matching`);

    if (!fm.description) fail(`${label}: description missing`);
    else if (fm.description.length > DESC_MAX) fail(`${label}: description is ${fm.description.length} characters, over ${DESC_MAX}`);
    else pass(`${label}: description ${fm.description.length}/${DESC_MAX}`);

    if (fm.compatibility && fm.compatibility.length > COMPAT_MAX) {
      fail(`${label}: compatibility is ${fm.compatibility.length} characters, over ${COMPAT_MAX}`);
    }
    if (!fm.metadata || !fm.metadata.version) fail(`${label}: metadata.version missing`);
    else pass(`${label}: metadata.version ${fm.metadata.version}`);
  }
}

// ─── 3. the Codex startup budget ─────────────────────────────────────────────

section("3. Codex startup skill list stays small");
{
  const total = SKILLS
    .map(s => frontmatter(path.join(DIST, "codex", "skills", `nth-${s}`, "SKILL.md")))
    .reduce((n, fm) => n + (fm?.description?.length || 0), 0);
  const share = Math.round((total / CODEX_LIST_BUDGET) * 100);
  if (total > SHORT_DESC_MAX * SKILLS.length) {
    fail(`the four Codex descriptions total ${total} characters, over ${SHORT_DESC_MAX} each`);
  } else {
    pass(`the four Codex descriptions total ${total} characters, ${share}% of the ${CODEX_LIST_BUDGET} budget`);
  }
}

// ─── 4. nothing host-specific leaks ──────────────────────────────────────────

section("4. no Claude-only token survives in dist/");
{
  const offenders = walk(DIST).filter(f =>
    /\.(md|toml|yaml|yml|mjs|js|py|json|csv)$/.test(f) &&
    fs.readFileSync(f, "utf8").includes("CLAUDE_PLUGIN_ROOT"));
  if (offenders.length) fail(`\${CLAUDE_PLUGIN_ROOT} still present in ${offenders.length} file(s), first: ${path.relative(REPO, offenders[0])}`);
  else pass("no ${CLAUDE_PLUGIN_ROOT} anywhere in dist/");

  const commandRe = /(?<![\w/.-])\/(seo|siteasy|inspect|audit)\b(?!\/)/;
  const unprefixed = walk(DIST).filter(f =>
    /\.(md|toml|yaml)$/.test(f) && commandRe.test(fs.readFileSync(f, "utf8")));
  if (unprefixed.length) fail(`unprefixed command reference in ${unprefixed.length} file(s), first: ${path.relative(REPO, unprefixed[0])}`);
  else pass("every command reference is prefixed nth-");
}

section("5. the Claude Code source is not degraded by the port");
{
  // THE NON-REGRESSION CONTRACT. Claude Code loads null-to-hero/ directly. The
  // prose must keep naming Claude's tools, because that is the text Claude
  // reads; the build substitutes them per host. A commit that neutralises the
  // source instead would silently degrade the only host with existing users.
  const prose = [...walk(path.join(SRC, "skills"), ".md"), ...walk(path.join(SRC, "agents"), ".md")]
    .map(f => fs.readFileSync(f, "utf8")).join("\n");
  // The root token also lives in a script, so count it over the whole tree.
  const loaded = [...walk(path.join(SRC, "skills")), ...walk(path.join(SRC, "agents"))]
    .filter(f => /\.(md|mjs|js|py)$/.test(f))
    .map(f => fs.readFileSync(f, "utf8")).join("\n");
  const src = prose;

  const tokens = readCsv(path.join(SRC, "tools/data/prose-tokens.csv"));
  const missing = tokens.filter(t => !src.includes(t.Token)).map(t => t.Token);
  if (missing.length) {
    fail(`the source no longer names ${missing.length} Claude tool(s): ${missing.join(", ")}. `
       + `Claude Code reads this text; substitute per host in the build instead.`);
  } else {
    pass(`the source still names all ${tokens.length} Claude tools the build substitutes`);
  }

  if (src.includes("${NTH_ROOT}")) fail("the source uses ${NTH_ROOT}; that token belongs to dist/ only");
  else pass("the source still uses ${CLAUDE_PLUGIN_ROOT}, which Claude Code substitutes");

  const roots = (loaded.match(/\$\{CLAUDE_PLUGIN_ROOT\}/g) || []).length;
  roots === CLAUDE_ROOT_TOKENS
    ? pass(`${roots} \${CLAUDE_PLUGIN_ROOT} tokens in the loaded tree, unchanged`)
    : fail(`${roots} \${CLAUDE_PLUGIN_ROOT} tokens, expected ${CLAUDE_ROOT_TOKENS}`);
}

section("5b. every Claude tool name is substituted in dist/");
{
  const tokens = readCsv(path.join(SRC, "tools/data/prose-tokens.csv"));
  for (const host of HOSTS) {
    const column = host === "codex" ? "Codex" : "Kimi Code";
    const leftovers = [];
    for (const f of [...walk(path.join(DIST, host, "skills"), ".md"), ...walk(path.join(DIST, host, "agents"), ".md")]) {
      const text = fs.readFileSync(f, "utf8");
      for (const t of tokens) {
        // A token that maps to itself on this host is not a leftover.
        if (t[column] === t.Token) continue;
        if (text.includes(t.Token)) leftovers.push(`${path.relative(DIST, f)} (${t.Token})`);
      }
    }
    leftovers.length
      ? fail(`${host}: ${leftovers.length} un-substituted token(s), first ${leftovers[0]}`)
      : pass(`${host}: no Claude-only tool name survives`);
  }
}

// ─── 6. the fifteen sub-agents round-trip to both formats ────────────────────

section("6. every sub-agent exists in both target formats");
{
  const sources = walk(path.join(SRC, "agents"), ".md").map(f => path.basename(f, ".md")).sort();
  if (!sources.length) fail("no source sub-agent found");

  const toml = sources.filter(n => fs.existsSync(path.join(DIST, "codex/agents", `${n}.toml`)));
  const kimi = sources.filter(n => fs.existsSync(path.join(DIST, "kimi/agents", `${n}.md`)));

  toml.length === sources.length
    ? pass(`${toml.length} Codex agent files`)
    : fail(`${sources.length - toml.length} Codex agent file(s) missing`);
  kimi.length === sources.length
    ? pass(`${kimi.length} Kimi sub-agent files, discovered without a launch flag`)
    : fail(`${sources.length - kimi.length} Kimi sub-agent file(s) missing`);

  // A TOML multi-line literal string opens on the key line and closes on its
  // own line, and can never contain the delimiter itself.
  const broken = toml.filter(n => {
    const t = fs.readFileSync(path.join(DIST, "codex/agents", `${n}.toml`), "utf8");
    const opens = /^developer_instructions = '''$/m.test(t);
    const closes = (t.match(/^'''$/gm) || []).length === 1;
    const body = t.split("\n").slice(6, -2).join("\n");
    return !opens || !closes || body.includes("'''");
  });
  broken.length
    ? fail(`${broken.length} Codex agent file(s) have an unbalanced literal string`)
    : pass("every Codex agent file has a balanced developer_instructions block");

  // Read-only is the contract; a Codex agent that can write breaks it.
  const writable = toml.filter(n =>
    !/sandbox_mode\s*=\s*"read-only"/.test(fs.readFileSync(path.join(DIST, "codex/agents", `${n}.toml`), "utf8")));
  writable.length
    ? fail(`${writable.length} Codex agent file(s) are not read-only`)
    : pass("every Codex agent file is sandboxed read-only");
}

// ─── 7. the short descriptions are authored, not truncated ───────────────────

section("7. the short descriptions stay within budget");
{
  const csv = fs.readFileSync(path.join(SRC, "tools/data/skill-short-descriptions.csv"), "utf8");
  for (const skill of SKILLS) {
    const m = csv.match(new RegExp(`^${skill},"([\\s\\S]*?)"$`, "m"));
    if (!m) { fail(`${skill}: no short description`); continue; }
    m[1].length <= SHORT_DESC_MAX
      ? pass(`${skill}: short description ${m[1].length}/${SHORT_DESC_MAX}`)
      : fail(`${skill}: short description is ${m[1].length} characters, over ${SHORT_DESC_MAX}`);
  }
}

section("8. every generated file parses with a real TOML and YAML parser");
try {
  const out = execFileSync("python3", [path.join(REPO, "tests/parse-dist.py")], { encoding: "utf8" });
  const m = out.match(/(\d+) passed, (\d+) failed/);
  if (m && m[2] === "0") pass(`tests/parse-dist.py: ${m[1]} checks passed`);
  else fail(`tests/parse-dist.py reported failures:\n${out}`);
} catch (e) {
  fail(`tests/parse-dist.py failed:\n${String(e.stdout || e.stderr || e).trim()}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
