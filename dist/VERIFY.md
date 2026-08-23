# What was observed, and what is not covered

Nothing here rests on reading a specification alone. Both hosts were installed
and run against the generated packages; `tests/verify-hosts.sh` reproduces it.

## Observed on a running host, 2026-08-19

Codex `codex-cli 0.148.0`, Kimi Code `0.37.2`, neither logged in. A local server
stands in for the model API and captures the request, so the evidence is the
payload the host would have sent, not a log line about it.

| What | How it was shown |
|---|---|
| Codex discovers the four skills in `~/.agents/skills` | all four appear in the `/v1/responses` request, and in `codex debug prompt-input` |
| The fifteen Codex agent files load | a deliberately broken file raises `unknown field`, ours raise nothing |
| Codex offers the fifteen as spawnable roles | the `spawn_agent` schema enumerates all fifteen with their descriptions |
| Kimi Code registers the fifteen sub-agents | asking for an unknown profile makes it list every profile it knows |
| Kimi Code discovers the four skills in `~/.kimi-code/skills` | all four appear in the `/v1/chat/completions` request, with description, whenToUse and path |
| A Kimi Code sub-agent is read-only | its tool list in the request is `FetchURL, Glob, Grep, Read`; no write and no delegation tool |
| The tool names are substituted | the sub-agent prompt carries `FetchURL`, and no `WebFetch` survives |

The negative control matters more than the passes. Without it, silence from the
Codex loader would be indistinguishable from a loader that never ran.

## Two things the run also settled

Codex's skills block came to 4286 characters with these four installed alongside
its five system skills, against a budget of 2% of the context window and 8000
characters when that window is unknown. There is room.

Kimi Code's read-only allowlist is intersected with what the session actually
offers: `ReadMediaFile` and `WebSearch` are declared in the frontmatter and did
not appear in the request. The read-only contract holds either way.

## Not covered

Kimi Work. No official source establishes that it reads `SKILL.md` from disk, nor
from which paths, and its installation directory holds no configuration.

The Python `kimi-cli`. Its own README says it is being wound down in favour of
Kimi Code, and its agent format is unrelated to what is generated here.

Whether a real model then uses the skills well. That is what the evaluation
corpus is for, and it needs an account.

Generated codex (5 skills, 15 sub-agents), kimi (5 skills, 15 sub-agents).
