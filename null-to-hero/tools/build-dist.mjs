#!/usr/bin/env node
/**
 * Build the portable packages of NullToHero.
 *
 *   node null-to-hero/tools/build-dist.mjs           writes dist/
 *   node null-to-hero/tools/build-dist.mjs --check   builds to a temp dir and
 *                                                    fails if dist/ differs
 *
 * NON-REGRESSION CONTRACT. The source tree null-to-hero/ is what Claude Code
 * loads, and this build never writes into it. The prose keeps naming Claude
 * Code's tools, because that is the text Claude reads; the build substitutes
 * those names for each other host. A commit that neutralises the source instead
 * would silently degrade Claude Code, so tests/portability.mjs asserts that the
 * Claude tool names are still there.
 *
 * Targets, and why each is shaped the way it is:
 *
 *   codex  developers.openai.com/codex/skills and /codex/subagents
 *          Skills live in ~/.agents/skills. Sub-agents are one TOML file each in
 *          ~/.codex/agents. That TOML is parsed with deny_unknown_fields, so it
 *          carries exactly five keys and no decoration. Codex documents no tool
 *          names for skills, so the prose gets capability phrases.
 *
 *   kimi   moonshotai.github.io/kimi-code
 *          The target is Kimi Code (@moonshot-ai/kimi-code), not the Python
 *          kimi-cli, which its own README says is being wound down. Skills live
 *          in ~/.kimi-code/skills, sub-agents are Markdown with frontmatter in
 *          ~/.kimi-code/agents, discovered without any launch flag. Its tool
 *          names are almost Claude's: only WebFetch and Task differ.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { nthRoot } from "./nth-root.mjs";

const ROOT = nthRoot();
const REPO = path.dirname(ROOT);
const SKILLS = ["seo", "siteasy", "audit", "cms"];
const PREFIX = "nth-";
const CHECK = process.argv.includes("--check");

// ─── data ────────────────────────────────────────────────────────────────────

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
  return rows.filter(r => r.length === head.length).map(r =>
    Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const data = f => readCsv(path.join(ROOT, "tools/data", f));
const HOST_TOOLS = data("host-tools.csv");
const PROSE_TOKENS = data("prose-tokens.csv");
const SHORT_DESC = Object.fromEntries(
  data("skill-short-descriptions.csv").map(r => [r.Skill, r["Short description"]]));
const VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, ".claude-plugin/plugin.json"), "utf8")).version;

// ─── hosts ───────────────────────────────────────────────────────────────────

const HOSTS = {
  codex: {
    label: "OpenAI Codex",
    column: "Codex",
    // The startup skill list is bounded (2% of the context window, 8000
    // characters when it is unknown) and descriptions are shortened before
    // skills are dropped, so this list carries the short descriptions and
    // front-loads the trigger words.
    invocation: name => `\`$${name}\`, or pick it from \`/skills\``,
    skillsDir: "~/.agents/skills",
    agentsDir: "~/.codex/agents",
  },
  kimi: {
    label: "Kimi Code",
    column: "Kimi Code",
    // Kimi Code truncates a description to 250 characters in the listing it
    // shows the model but leaves whenToUse whole, so the short description goes
    // in description and the long one in whenToUse.
    invocation: name => `\`/skill:${name}\``,
    // Its own brand directory, not the shared ~/.agents/skills, so the two
    // packages cannot overwrite one another.
    skillsDir: "~/.kimi-code/skills",
    agentsDir: "~/.kimi-code/agents",
  },
  // UNE CIBLE NEUTRE PLUTÔT QU'UN GÉNÉRATEUR PAR HÔTE
  // --------------------------------------------------
  // Une quarantaine de produits lisent aujourd'hui le format Agent Skills, et
  // ils convergent sur le même dossier : `.agents/skills/<nom>/SKILL.md`, en
  // dépôt comme au foyer. Cursor, GitHub Copilot, VS Code, Gemini CLI et
  // opencode le documentent chacun de leur côté, avec la même disposition. Un
  // générateur par produit serait quarante copies d'une seule transformation.
  //
  // Ce paquet-ci ne nomme donc aucun hôte. Il ne porte que les deux champs que
  // le standard exige, et sa prose parle de capacités là où celle de Claude
  // nomme des outils.
  //
  // Il ne porte pas les quinze sous-agents : le standard couvre les
  // compétences et rien d'autre, et il n'existe pas de format commun pour un
  // sous-agent. `agentsDir` à null est ce qui l'exprime, et la note d'hôte le
  // dit au lecteur au lieu de le laisser découvrir un dossier manquant.
  agents: {
    label: "Agent Skills (open standard)",
    column: "Agent Skills",
    invocation: name => `\`${name}\`, or by asking for it by name`,
    skillsDir: "~/.agents/skills",
    agentsDir: null,
  },
};

// Kimi Code reads these from a sub-agent's frontmatter and enforces them twice:
// the list is filtered before the model sees it and re-checked before a call.
// This is the built-in `plan` profile, which is the real read-only template.
const KIMI_READONLY_TOOLS = ["Read", "ReadMediaFile", "Glob", "Grep", "WebSearch", "FetchURL"];

// ─── frontmatter ─────────────────────────────────────────────────────────────

function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: null, body: text };
  return { fm: parseYaml(m[1]), body: text.slice(m[0].length) };
}

/** Minimal YAML reader: scalars, quoted scalars and "- " lists. Enough here. */
function parseYaml(src) {
  const out = {};
  let key = null;
  for (const line of src.split("\n")) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && key) {
      (out[key] = Array.isArray(out[key]) ? out[key] : []).push(unquote(item[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) { key = kv[1]; out[key] = kv[2] === "" ? [] : unquote(kv[2]); }
  }
  return out;
}

const unquote = s => s.replace(/^["'](.*)["']$/s, "$1").trim();

/** Quote a scalar for YAML output without pulling in a dependency. */
function yamlScalar(value) {
  const s = String(value);
  if (!/[:#\-{}[\]&*!|>'"%@`\n]/.test(s) && s.trim() === s && s !== "") return s;
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"';
}

// ─── body rewrites ───────────────────────────────────────────────────────────

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest token first, so "Task tool" is consumed before "`Task`" and
// "Claude Code" before any shorter Claude form.
const TOKEN_RULES = [...PROSE_TOKENS]
  .sort((a, b) => b.Token.length - a.Token.length)
  .map(r => ({ re: new RegExp(escapeRe(r.Token), "g"), ...r }));

// A command reference, never a path segment: not preceded by a word character,
// a dot, a hyphen or a slash, and not followed by a slash.
const commandRe = new RegExp(`(?<![\\w/.-])/(${SKILLS.join("|")})\\b(?!/)`, "g");

/** The root token only. Applied to scripts, where a path rewrite is all we want. */
const rewriteRoot = text => text.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, "${NTH_ROOT}");

/** Root token, command names and every tool name. Prose only. */
function rewriteBody(host, body) {
  let out = rewriteRoot(body).replace(commandRe, (_, n) => `/${PREFIX}${n}`);
  for (const rule of TOKEN_RULES) {
    const replacement = rule[HOSTS[host].column];
    if (replacement) out = out.replace(rule.re, replacement);
  }
  return out;
}

function hostNote(host, skillName, sourceSkill) {
  const h = HOSTS[host];
  const named = HOST_TOOLS.filter(r => r[h.column]).map(r => `${r.Capability} (\`${r[h.column]}\`)`);
  return [
    `<!-- Generated for ${h.label} from null-to-hero/skills/${sourceSkill}/.`,
    `     Do not edit here. Edit the source and run tools/build-dist.mjs. -->`,
    "",
    "## Host notes",
    "",
    `Invoke this skill with ${h.invocation(skillName)}. Its commands are written \`/${skillName} <command>\` below.`,
    "",
    "`${NTH_ROOT}` is the absolute path of the NullToHero checkout, substituted at install time. If a command still shows the literal token, the install did not run; export `NTH_ROOT` and run it again.",
    "",
    named.length
      ? `Tools named below are this host's: ${named.join(", ")}.`
      : `This host does not publish tool names to a skill. Where the text names a tool, read it as the capability: ${HOST_TOOLS.map(r => r.Capability).join(", ")}.`,
    "",
    ...(h.agentsDir ? [] : [
      "This package carries skills and no sub-agents: the Agent Skills standard covers skills alone, and there is no common format for a sub-agent. Where the text below asks for delegation, run that dimension yourself in this session. The judgement is the same; what is lost is the parallelism and the isolated context each dimension would otherwise get.",
      "",
    ]),
  ].join("\n");
}

function skillFrontmatter(host, sourceSkill, fm) {
  const short = rewriteBody(host, SHORT_DESC[sourceSkill]);
  const long = rewriteBody(host, fm.description);
  const lines = [
    "---",
    `name: ${PREFIX + sourceSkill}`,
    `description: ${yamlScalar(short)}`,
  ];
  // Kimi Code reads whenToUse and does not truncate it; Codex ignores it.
  if (host === "kimi") lines.push(`whenToUse: ${yamlScalar(long)}`);
  lines.push(
    "license: Apache-2.0",
    `compatibility: ${yamlScalar(
      "Requires Node.js 20+ and Python 3 for the deterministic tools, plus network access for page fetches. NTH_ROOT must point at the NullToHero checkout."
    )}`,
    "metadata:",
    `  version: "${fm.version || VERSION}"`,
    `  host: ${host}`,
    `  source-skill: ${sourceSkill}`,
    // Codex reads metadata.short-description; the others ignore it.
    `  short-description: ${yamlScalar(short)}`,
  );
  if (fm["argument-hint"]) lines.push(`  argument-hint: ${yamlScalar(fm["argument-hint"])}`);
  lines.push("---", "");
  return lines.join("\n");
}

// ─── sub-agents ──────────────────────────────────────────────────────────────

function agentSources(host) {
  const dir = path.join(ROOT, "agents");
  return fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort().map(file => {
    const { fm, body } = splitFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
    return {
      file,
      name: fm.name,
      description: rewriteBody(host, fm.description),
      body: rewriteBody(host, body).trim(),
    };
  });
}

/**
 * Codex parses an agent file with deny_unknown_fields over a flattened config,
 * so an extra key makes the whole file be ignored at startup. Five keys, and a
 * comment, which TOML allows.
 */
function codexAgent(agent) {
  if (agent.body.includes("'''")) {
    throw new Error(`agents/${agent.file}: body contains ''' and cannot be a TOML literal string`);
  }
  return [
    `# Generated from null-to-hero/agents/${agent.file}. Do not edit here.`,
    `name = ${JSON.stringify(agent.name)}`,
    `description = ${JSON.stringify(agent.description)}`,
    `sandbox_mode = "read-only"`,
    `model_reasoning_effort = "medium"`,
    `developer_instructions = '''`,
    agent.body,
    `'''`,
    "",
  ].join("\n");
}

/**
 * Kimi Code reads Markdown with frontmatter and discovers the directory on its
 * own, so there is no launch flag and no separate system-prompt file. It has no
 * model field: a sub-agent inherits the caller's model.
 */
function kimiAgent(agent) {
  return [
    "---",
    `name: ${agent.name}`,
    `description: ${yamlScalar(agent.description)}`,
    "tools:",
    ...KIMI_READONLY_TOOLS.map(t => `  - ${t}`),
    "subagents: []",
    "---",
    "",
    `<!-- Generated from null-to-hero/agents/${agent.file}. Do not edit here. -->`,
    "",
    agent.body,
    "",
  ].join("\n");
}

// ─── writing ─────────────────────────────────────────────────────────────────

function copyTree(from, to, transform) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dst, transform);
    else if (entry.name.endsWith(".md")) fs.writeFileSync(dst, transform(fs.readFileSync(src, "utf8"), src));
    else if (/\.(mjs|js|py|json|csv|txt)$/.test(entry.name)) {
      fs.writeFileSync(dst, rewriteRoot(fs.readFileSync(src, "utf8")));
    } else fs.copyFileSync(src, dst);
  }
}

function buildHost(host, out) {
  // Un hôte sans dossier de sous-agents n'en lit aucun : les transposer quand
  // même produirait un dossier que rien n'installe, et la trousse mentirait
  // sur ce qu'elle livre.
  const agents = HOSTS[host].agentsDir ? agentSources(host) : [];

  for (const skill of SKILLS) {
    copyTree(path.join(ROOT, "skills", skill), path.join(out, "skills", PREFIX + skill),
      (text, src) => {
        const { fm, body } = splitFrontmatter(text);
        if (!fm) return rewriteBody(host, text);
        if (path.basename(src) !== "SKILL.md") return rewriteBody(host, text);
        return skillFrontmatter(host, skill, fm) + hostNote(host, PREFIX + skill, skill) + rewriteBody(host, body);
      });
  }

  if (agents.length) {
    const agentsOut = path.join(out, "agents");
    fs.mkdirSync(agentsOut, { recursive: true });
    for (const a of agents) {
      const [name, render] = host === "codex" ? [`${a.name}.toml`, codexAgent] : [`${a.name}.md`, kimiAgent];
      fs.writeFileSync(path.join(agentsOut, name), render(a));
    }
  }

  fs.writeFileSync(path.join(out, "README.md"), hostReadme(host, agents.length));
  return { host, skills: SKILLS.length, agents: agents.length, skillsDir: HOSTS[host].skillsDir };
}

function hostReadme(host, agentCount) {
  const h = HOSTS[host];
  return `# NullToHero for ${h.label}

Generated package, version ${VERSION}. Do not edit these files. Edit
\`null-to-hero/\` and run \`node null-to-hero/tools/build-dist.mjs\`.

## Install

\`\`\`
bash install.sh --target ${host}
\`\`\`

The installer copies \`skills/\` into \`${h.skillsDir}\`, ${h.agentsDir
  ? `copies \`agents/\` into\n\`${h.agentsDir}\`, and substitutes`
  : `and substitutes`} \`\${NTH_ROOT}\` with the absolute path of this
checkout. The deterministic tools under \`null-to-hero/tools/\` and the asset
library are read from the checkout, not copied, so keep it where it is.

## What is here

${SKILLS.length} skills (\`${SKILLS.map(s => PREFIX + s).join("`, `")}\`)${h.agentsDir
  ? ` and ${agentCount} read-only sub-agents.`
  : ` and no sub-agents: the standard covers skills alone.`}

The \`nth-\` prefix exists because a skills directory is shared with every other
skill pack on the machine, and \`audit\` and \`inspect\` are names a third party
will claim sooner or later.
${{
  codex: `
## Concurrency

\`/${PREFIX}audit full\` dispatches fifteen sub-agents. Codex bounds how many run at
once with \`agents.max_concurrent_threads_per_session\` in \`~/.codex/config.toml\`.
The default is not documented; raise it if the audit feels serialised.
`,
  kimi: `
## Tool names

Kimi Code's tool names are almost Claude Code's. Two differ, and the generated
text already uses Kimi's: \`FetchURL\` where Claude says \`WebFetch\`, and \`Agent\`
where Claude says \`Task\`.
`,
  agents: `
## Which hosts read this

Every product that implements the Agent Skills format. They differ only in the
directory, and most read more than one. \`~/.agents/skills\` is the one they share,
which is why the installer writes there.

| Host | Reads from | Source |
|---|---|---|
| Cursor | \`.cursor/skills\`, \`.agents/skills\`, also \`.claude/skills\` | cursor.com/docs/skills |
| GitHub Copilot, VS Code | \`.github/skills\`, \`.claude/skills\`, \`.agents/skills\`; \`~/.copilot/skills\` or \`~/.agents/skills\` | docs.github.com/en/copilot/concepts/agents/about-agent-skills |
| Gemini CLI | \`.gemini/skills\` or \`.agents/skills\`; \`~/.gemini/skills\` or \`~/.agents/skills\` | geminicli.com/docs/cli/skills |
| opencode | \`.opencode/skills\`, \`.claude/skills\`, \`.agents/skills\`, and the same three under \`~\` | opencode.ai/docs/skills |

Others on the standard's own client list (Amp, Goose, Roo Code, Factory Droid,
Kiro, Junie, Letta, Trae, OpenHands and more) read the same file. Check your
host's own page for the directory it prefers, then copy \`skills/\` there.

## What this package cannot do

It carries no sub-agents. \`/${PREFIX}audit full\` names fifteen dimensions and, on
Claude Code, runs each in its own context in parallel. Here it names them and you
run them in one session. The checklists are identical; the isolation is not.
`,
}[host]}`;
}

function verifyDoc(results) {
  return `# What was observed, and what is not covered

Nothing here rests on reading a specification alone. Each package was installed
and read by a running host; \`tests/verify-hosts.sh\` reproduces the first two.

## Observed on a running host, 2026-08-19

Codex \`codex-cli 0.148.0\`, Kimi Code \`0.37.2\`, neither logged in. A local server
stands in for the model API and captures the request, so the evidence is the
payload the host would have sent, not a log line about it.

| What | How it was shown |
|---|---|
| Codex discovers the four skills in \`~/.agents/skills\` | all four appear in the \`/v1/responses\` request, and in \`codex debug prompt-input\` |
| The fifteen Codex agent files load | a deliberately broken file raises \`unknown field\`, ours raise nothing |
| Codex offers the fifteen as spawnable roles | the \`spawn_agent\` schema enumerates all fifteen with their descriptions |
| Kimi Code registers the fifteen sub-agents | asking for an unknown profile makes it list every profile it knows |
| Kimi Code discovers the four skills in \`~/.kimi-code/skills\` | all four appear in the \`/v1/chat/completions\` request, with description, whenToUse and path |
| A Kimi Code sub-agent is read-only | its tool list in the request is \`FetchURL, Glob, Grep, Read\`; no write and no delegation tool |
| The tool names are substituted | the sub-agent prompt carries \`FetchURL\`, and no \`WebFetch\` survives |

The negative control matters more than the passes. Without it, silence from the
Codex loader would be indistinguishable from a loader that never ran.

## Two things the run also settled

Codex's skills block came to 4286 characters with these four installed alongside
its five system skills, against a budget of 2% of the context window and 8000
characters when that window is unknown. There is room.

Kimi Code's read-only allowlist is intersected with what the session actually
offers: \`ReadMediaFile\` and \`WebSearch\` are declared in the frontmatter and did
not appear in the request. The read-only contract holds either way.

## Observed on two running hosts, 2026-08-23 and 2026-08-24: the neutral package

opencode \`1.18.21\` and Gemini CLI \`0.56.0\`, neither logged in. Both publish a
command that prints what their loader actually holds, which is the same class of
evidence as above: the loader's own answer, not a claim about it.

| What | How it was shown |
|---|---|
| opencode discovers \`dist/agents\` from \`~/.agents/skills\` | \`nth-cms\` appears in \`opencode debug skill\` with \`location: ~/.agents/skills/nth-cms/SKILL.md\` |
| Gemini CLI discovers the same directory | \`gemini skills list\` prints \`nth-cms [Enabled]\` with the same location and the full description |
| The Claude-compatible path is real too | the opencode run also lists eight skills from \`~/.claude/skills\`, which is how Cursor, Copilot and opencode all document reading \`.claude/skills\` |

The negative control did not do what a negative control should, on either host,
and that is the finding worth writing down. Two deliberately invalid skills were
installed beside the good one: a folder \`nth-mismatch\` whose frontmatter says
\`name: nth-other\`, and a folder whose description runs to 1200 characters.

**Both hosts loaded both.** The mismatched one was registered under the name its
frontmatter claims rather than its folder's, and the over-long description came
through with its 1200 characters intact, although opencode's own documentation
states 1 to 64 for the name, matching the directory, and 1 to 1024 for the
description. Two independent implementations, the same permissiveness: this is
the state of the ecosystem rather than one loader's quirk.

So a host accepting this package proves the package is *discovered*. It proves
nothing about conformance, because these loaders do not check. Conformance is
held by \`tests/portability.mjs\` section 2, which fails on exactly the two files
both hosts accepted.

## Which hosts the neutral package was NOT run against

Cursor, GitHub Copilot, VS Code, Amp, Goose, Roo Code, Factory Droid, Kiro and
the rest of the standard's client list. Their directories are taken from their
own documentation, cited in \`dist/agents/README.md\`, and the format they read is
the one opencode and Gemini CLI read. Neither of those is the same as having
watched them do it.

## Not covered

Kimi Work. No official source establishes that it reads \`SKILL.md\` from disk, nor
from which paths, and its installation directory holds no configuration.

The Python \`kimi-cli\`. Its own README says it is being wound down in favour of
Kimi Code, and its agent format is unrelated to what is generated here.

Whether a real model then uses the skills well. That is what the evaluation
corpus is for, and it needs an account.

Generated ${results.map(r => r.host + " (" + r.skills + " skills, " + r.agents + " sub-agents)").join(", ")}.
`;
}

// ─── entry point ─────────────────────────────────────────────────────────────

function hashTree(dir) {
  const h = crypto.createHash("sha256");
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { h.update(path.relative(dir, p).replace(/\\/g, "/")); h.update(fs.readFileSync(p)); }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return h.digest("hex");
}

const target = CHECK
  ? fs.mkdtempSync(path.join(os.tmpdir(), "nth-dist-"))
  : path.join(REPO, "dist");

if (!CHECK) fs.rmSync(target, { recursive: true, force: true });

const results = Object.keys(HOSTS).map(host => buildHost(host, path.join(target, host)));
fs.writeFileSync(path.join(target, "VERIFY.md"), verifyDoc(results));
fs.writeFileSync(path.join(target, "MANIFEST.json"), JSON.stringify({
  version: VERSION,
  generator: "null-to-hero/tools/build-dist.mjs",
  hosts: results,
}, null, 2) + "\n");

if (CHECK) {
  const expected = hashTree(path.join(REPO, "dist"));
  const actual = hashTree(target);
  fs.rmSync(target, { recursive: true, force: true });
  if (expected !== actual) {
    console.error("dist/ is out of date. Run: node null-to-hero/tools/build-dist.mjs");
    process.exit(1);
  }
  console.log("dist/ matches the source.");
} else {
  for (const r of results) console.log(`${r.host}: ${r.skills} skills, ${r.agents} sub-agents`);
  console.log(`written to ${target}`);
}
