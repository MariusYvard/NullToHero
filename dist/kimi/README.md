# NullToHero for Kimi Code

Generated package, version 4.0.0. Do not edit these files. Edit
`null-to-hero/` and run `node null-to-hero/tools/build-dist.mjs`.

## Install

```
bash install.sh --target kimi
```

The installer copies `skills/` into `~/.kimi-code/skills`, copies `agents/` into
`~/.kimi-code/agents`, and substitutes `${NTH_ROOT}` with the absolute path of this
checkout. The deterministic tools under `null-to-hero/tools/` and the asset
library are read from the checkout, not copied, so keep it where it is.

## What is here

4 skills (`nth-seo`, `nth-siteasy`, `nth-audit`, `nth-cms`) and 15 read-only sub-agents.

The `nth-` prefix exists because a skills directory is shared with every other
skill pack on the machine, and `audit` and `inspect` are names a third party
will claim sooner or later.

## Tool names

Kimi Code's tool names are almost Claude Code's. Two differ, and the generated
text already uses Kimi's: `FetchURL` where Claude says `WebFetch`, and `Agent`
where Claude says `Task`.
