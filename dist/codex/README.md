# NullToHero for OpenAI Codex

Generated package, version 4.0.0. Do not edit these files. Edit
`null-to-hero/` and run `node null-to-hero/tools/build-dist.mjs`.

## Install

```
bash install.sh --target codex
```

The installer copies `skills/` into `~/.agents/skills`, copies `agents/` into
`~/.codex/agents`, and substitutes `${NTH_ROOT}` with the absolute path of this
checkout. The deterministic tools under `null-to-hero/tools/` and the asset
library are read from the checkout, not copied, so keep it where it is.

## What is here

Four skills (`nth-seo`, `nth-siteasy`, `nth-inspect`, `nth-audit`) and 15 read-only sub-agents.

The `nth-` prefix exists because a skills directory is shared with every other
skill pack on the machine, and `audit` and `inspect` are names a third party
will claim sooner or later.

## Concurrency

`/nth-audit full` dispatches fifteen sub-agents. Codex bounds how many run at
once with `agents.max_concurrent_threads_per_session` in `~/.codex/config.toml`.
The default is not documented; raise it if the audit feels serialised.
