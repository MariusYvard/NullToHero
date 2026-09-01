# NullToHero for Hermes Agent

Generated package, version 4.0.0. Do not edit these files. Edit
`null-to-hero/` and run `node null-to-hero/tools/build-dist.mjs`.

## Install

```
bash install.sh --target hermes
```

The installer copies `skills/` into `~/.hermes/skills (or the active profile's skills directory)`, and substitutes `${NTH_ROOT}` with the absolute path of this
checkout. The deterministic tools under `null-to-hero/tools/` and the asset
library are read from the checkout, not copied, so keep it where it is.

## What is here

4 skills (`nth-seo`, `nth-siteasy`, `nth-audit`, `nth-cms`) and no bundled sub-agent files: the 15 audit sub-agents install separately as their own Agent Skills, dispatched with delegate_task. See the "Delegation" section below.

The `nth-` prefix exists because a skills directory is shared with every other
skill pack on the machine, and `audit` and `inspect` are names a third party
will claim sooner or later.

## Delegation

`nth-audit full` (and the other agent-run scopes) name fifteen sub-agents by
`subagent_type` in Claude's own text. On Hermes, dispatch them with
`delegate_task`: one call, one task per sub-agent in the same `tasks` array, so
they run in parallel in isolated contexts — real sub-agents, not a simulated
loop. `delegate_task` takes a free-text `goal` per task rather than a named
`subagent_type`, so describe the sub-agent's job in the goal (its SKILL.md, from
`hermes-agent/` in the source repository, is the description to paraphrase into
that goal). This is not a fallback: it is the same parallel-and-isolated
capability the source text asks for, reached through Hermes's own delegation
tool instead of a subagent_type lookup.

This package (`dist/agents/skills`) does not itself carry the fifteen sub-agent
prompts; they are generated separately as their own Agent Skills by
`hermes-agent/tools/convert-agents-to-skills.py` and installed alongside these
four. See `hermes-agent/README.md` in the source repository.
