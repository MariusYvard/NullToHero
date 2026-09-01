# NullToHero for Kimi Work

Generated package, version 4.0.0. Do not edit these files. Edit
`null-to-hero/` and run `node null-to-hero/tools/build-dist.mjs`.

This is a plugin for the Kimi Work desktop app, registered into its personal
plugin market. It is self-contained: the four skills, the 15 sub-agents
and the deterministic runtime ship in this one directory.

## Install

```
bash setup.sh
kimi-daimon kimi-plugin register-personal . --json
```

`setup.sh` substitutes `${NTH_ROOT}` with the absolute path of the bundled
runtime (`null-to-hero/`), so the package keeps working if the checkout moves
or is deleted. It is idempotent; re-run it if you move this directory.

Then open Kimi Work, the Plugins page, the Personal (「个人」) tab, and click ＋
on NullToHero. The daemon hot-reloads active sessions: no restart.

## What is here

4 skills (`nth-seo`, `nth-siteasy`, `nth-audit`, `nth-cms`) and 15 read-only
sub-agents, plus the deterministic tools, the asset library and the skill
scripts under `null-to-hero/`.

Requires Node.js 20+. `/nth-siteasy preview` and the `/nth-cms` chain also use
Playwright and Python 3, installed on first use.

## Updating

Edit the source, run `node null-to-hero/tools/build-dist.mjs`, re-run
`setup.sh` and register again. Kimi Work offers the update in the Personal tab
when the version string changes.
