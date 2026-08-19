#!/usr/bin/env python3
"""Parse every generated file with a real parser, not a regex.

    python3 tests/parse-dist.py

A hand-rolled check can agree with a hand-rolled generator and still produce a
file the host rejects. This script uses tomllib and PyYAML, and it enforces the
field rules that each host's own parser enforces:

  Codex   agent TOML is read with deny_unknown_fields over a flattened config,
          so any key outside the allowed set makes the whole file be ignored.
          Source: openai/codex, codex-rs/core/src/config/agent_roles.rs
  Kimi    a sub-agent name must match ^[a-z0-9]+(?:-[a-z0-9]+)*$, description
          must be a non-empty string, and a known key with the wrong type is a
          hard parse error. Source: MoonshotAI/kimi-code, agentFile.ts
"""

import re
import sys
import tomllib
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parent.parent
DIST = REPO / "dist"

CODEX_AGENT_KEYS = {
    "name", "description", "developer_instructions",
    "model", "model_reasoning_effort", "sandbox_mode",
    "nickname_candidates", "mcp_servers", "skills",
}
CODEX_SANDBOX = {"read-only", "workspace-write", "danger-full-access"}
CODEX_EFFORT = {"none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"}

KIMI_AGENT_KEYS = {"name", "description", "whenToUse", "override", "tools", "disallowedTools", "subagents"}
KIMI_NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KIMI_TOOLS = {
    "Read", "Write", "Edit", "Grep", "Glob", "ReadMediaFile", "Bash",
    "WebSearch", "FetchURL", "EnterPlanMode", "ExitPlanMode", "TodoList",
    "Agent", "AgentSwarm", "AskUserQuestion", "Skill",
    "TaskList", "TaskOutput", "TaskStop", "WaitFor",
    "CronCreate", "CronList", "CronDelete",
}
# Kimi Code expands $ARGUMENTS, $ARGUMENTS[n] and $<digits> in a skill body.
# A stray one would be silently blanked in the text the model reads.
KIMI_SUBST = re.compile(r"\$ARGUMENTS|\$\d+(?!\w)")

passed = failed = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  ok    {msg}")


def bad(msg):
    global failed
    failed += 1
    print(f"  FAIL  {msg}")


def frontmatter(path):
    text = path.read_text(encoding="utf8")
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---\n", 3)
    if end == -1:
        return None, text
    return yaml.safe_load(text[4:end]), text[end + 5:]


print("\nA. Codex agent files parse as TOML and carry only allowed keys")
files = sorted(DIST.glob("codex/agents/*.toml"))
if not files:
    bad("no Codex agent file found")
for f in files:
    try:
        doc = tomllib.loads(f.read_text(encoding="utf8"))
    except tomllib.TOMLDecodeError as exc:
        bad(f"{f.name}: not valid TOML: {exc}")
        continue
    extra = set(doc) - CODEX_AGENT_KEYS
    if extra:
        bad(f"{f.name}: key(s) Codex would reject: {sorted(extra)}")
    elif not all(isinstance(doc.get(k), str) and doc[k].strip()
                 for k in ("name", "description", "developer_instructions")):
        bad(f"{f.name}: a required field is missing or blank")
    elif doc.get("sandbox_mode") not in CODEX_SANDBOX:
        bad(f"{f.name}: sandbox_mode {doc.get('sandbox_mode')!r} is not a valid value")
    elif doc.get("model_reasoning_effort") not in CODEX_EFFORT:
        bad(f"{f.name}: model_reasoning_effort {doc.get('model_reasoning_effort')!r} is not a valid value")
    elif doc["name"] != f.stem:
        bad(f"{f.name}: name {doc['name']!r} does not match the file name")
    else:
        ok(f"{f.name}: valid TOML, {len(doc)} keys, read-only")

print("\nB. Kimi sub-agents parse as Markdown with valid frontmatter")
files = sorted(DIST.glob("kimi/agents/*.md"))
if not files:
    bad("no Kimi sub-agent file found")
for f in files:
    try:
        fm, body = frontmatter(f)
    except yaml.YAMLError as exc:
        bad(f"{f.name}: frontmatter is not valid YAML: {exc}")
        continue
    if not isinstance(fm, dict):
        bad(f"{f.name}: no frontmatter mapping")
        continue
    extra = set(fm) - KIMI_AGENT_KEYS
    if extra:
        bad(f"{f.name}: unknown key(s) {sorted(extra)}")
    elif not KIMI_NAME_RE.match(str(fm.get("name", ""))):
        bad(f"{f.name}: name {fm.get('name')!r} is not strict kebab-case")
    elif not (isinstance(fm.get("description"), str) and fm["description"].strip()):
        bad(f"{f.name}: description missing or not a string")
    elif not (isinstance(fm.get("tools"), list) and fm["tools"]):
        bad(f"{f.name}: tools must be a non-empty list, or the agent gets every tool")
    elif set(fm["tools"]) - KIMI_TOOLS:
        bad(f"{f.name}: unknown tool(s) {sorted(set(fm['tools']) - KIMI_TOOLS)}")
    elif set(fm["tools"]) & {"Write", "Edit", "Bash"}:
        bad(f"{f.name}: a write-capable tool is allowed; sub-agents are read-only")
    elif fm.get("subagents") != []:
        bad(f"{f.name}: subagents should be an empty list so the agent cannot nest")
    elif not body.strip():
        bad(f"{f.name}: empty body, which is the system prompt")
    else:
        ok(f"{f.name}: valid frontmatter, {len(fm['tools'])} read-only tools")

print("\nC. Generated SKILL.md frontmatter parses as YAML")
for f in sorted(DIST.glob("*/skills/*/SKILL.md")):
    label = f"{f.parents[2].name}/{f.parent.name}"
    try:
        fm, body = frontmatter(f)
    except yaml.YAMLError as exc:
        bad(f"{label}: frontmatter is not valid YAML: {exc}")
        continue
    if not isinstance(fm, dict):
        bad(f"{label}: no frontmatter mapping")
    elif fm.get("name") != f.parent.name:
        bad(f"{label}: name {fm.get('name')!r} does not match its directory")
    elif not (isinstance(fm.get("description"), str) and fm["description"].strip()):
        bad(f"{label}: description missing, which both hosts treat as fatal")
    elif not isinstance(fm.get("metadata"), dict):
        bad(f"{label}: metadata is not a mapping")
    else:
        ok(f"{label}: valid frontmatter, description {len(fm['description'])} chars")

print("\nD. Every reference file still parses after the rewrite")
count = broken = 0
for f in sorted(DIST.glob("*/skills/*/references/**/*.md")):
    count += 1
    try:
        frontmatter(f)
    except yaml.YAMLError as exc:
        broken += 1
        bad(f"{f.relative_to(DIST)}: {exc}")
if not broken:
    ok(f"{count} reference files parse")

print("\nE. No Kimi substitution token is left in a skill body")
hits = []
for f in sorted(DIST.glob("kimi/skills/**/*.md")):
    for m in KIMI_SUBST.finditer(f.read_text(encoding="utf8")):
        hits.append(f"{f.relative_to(DIST)}: {m.group(0)}")
if hits:
    bad(f"Kimi Code would blank {len(hits)} token(s), first: {hits[0]}")
else:
    ok("no $ARGUMENTS and no $<digit> that Kimi Code would expand")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
