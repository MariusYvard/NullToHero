# What was observed, and what is not covered

Nothing here rests on reading a specification alone. Each package was installed
and read by a running host; `tests/verify-hosts.sh` reproduces the first two.

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

## Observed on a running host, 2026-08-23: the neutral package

opencode `1.18.21`, not logged in. `opencode debug skill` prints what the loader
actually holds, which is the same class of evidence as above: the loader's own
answer, not a claim about it.

| What | How it was shown |
|---|---|
| `dist/agents` is discovered from `~/.agents/skills` | `nth-cms` appears in `opencode debug skill` with `location: ~/.agents/skills/nth-cms/SKILL.md` |
| The Claude-compatible path is real too | the same run lists eight skills from `~/.claude/skills`, which is how Cursor, Copilot and opencode all document reading `.claude/skills` |

The negative control did not do what a negative control should, and that is the
finding worth writing down. Two deliberately invalid skills were installed
beside the good one: a folder `nth-mismatch` whose frontmatter says
`name: nth-other`, and a folder whose description runs to 1200 characters.
opencode loaded **both**, the first under the name its frontmatter claims rather
than its folder's, the second with its 1200 characters intact, although
opencode's own documentation states 1 to 64 for the name, matching the
directory, and 1 to 1024 for the description.

So a host accepting this package proves the package is *discovered*. It proves
nothing about conformance, because this loader does not check. Conformance is
held by `tests/portability.mjs` section 2, which fails on exactly the two files
opencode accepted.

## Which hosts the neutral package was NOT run against

Cursor, GitHub Copilot, VS Code, Gemini CLI, Amp, Goose, Roo Code, Factory
Droid, Kiro and the rest of the standard's client list. Their directories are
taken from their own documentation, cited in `dist/agents/README.md`, and the
format they read is the one opencode read. Neither of those is the same as
having watched them do it.

## Not covered

Kimi Work. No official source establishes that it reads `SKILL.md` from disk, nor
from which paths, and its installation directory holds no configuration.

The Python `kimi-cli`. Its own README says it is being wound down in favour of
Kimi Code, and its agent format is unrelated to what is generated here.

Whether a real model then uses the skills well. That is what the evaluation
corpus is for, and it needs an account.

Generated codex (4 skills, 15 sub-agents), kimi (4 skills, 15 sub-agents), agents (4 skills, 0 sub-agents).
