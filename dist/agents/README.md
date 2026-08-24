# NullToHero for Agent Skills (open standard)

Generated package, version 4.0.0. Do not edit these files. Edit
`null-to-hero/` and run `node null-to-hero/tools/build-dist.mjs`.

## Install

```
bash install.sh --target agents
```

The installer copies `skills/` into `~/.agents/skills`, and substitutes `${NTH_ROOT}` with the absolute path of this
checkout. The deterministic tools under `null-to-hero/tools/` and the asset
library are read from the checkout, not copied, so keep it where it is.

## What is here

4 skills (`nth-seo`, `nth-siteasy`, `nth-audit`, `nth-cms`) and no sub-agents: the standard covers skills alone.

The `nth-` prefix exists because a skills directory is shared with every other
skill pack on the machine, and `audit` and `inspect` are names a third party
will claim sooner or later.

## Which hosts read this

Every product that implements the Agent Skills format. They differ only in the
directory, and most read more than one. `~/.agents/skills` is the one they share,
which is why the installer writes there.

| Host | Reads from | Source |
|---|---|---|
| Cursor | `.cursor/skills`, `.agents/skills`, also `.claude/skills` | cursor.com/docs/skills |
| GitHub Copilot, VS Code | `.github/skills`, `.claude/skills`, `.agents/skills`; `~/.copilot/skills` or `~/.agents/skills` | docs.github.com/en/copilot/concepts/agents/about-agent-skills |
| Gemini CLI | `.gemini/skills` or `.agents/skills`; `~/.gemini/skills` or `~/.agents/skills` | geminicli.com/docs/cli/skills |
| opencode | `.opencode/skills`, `.claude/skills`, `.agents/skills`, and the same three under `~` | opencode.ai/docs/skills |

Others on the standard's own client list (Amp, Goose, Roo Code, Factory Droid,
Kiro, Junie, Letta, Trae, OpenHands and more) read the same file. Check your
host's own page for the directory it prefers, then copy `skills/` there.

## What this package cannot do

It carries no sub-agents. `/nth-audit full` names fifteen dimensions and, on
Claude Code, runs each in its own context in parallel. Here it names them and you
run them in one session. The checklists are identical; the isolation is not.
