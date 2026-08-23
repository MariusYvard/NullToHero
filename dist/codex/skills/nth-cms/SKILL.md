---
name: nth-cms
description: "Hand a finished site to the person who owns it: turn its hardcoded prose into editable fields, vendor an editor with its own accounts, put a server-side allow-list between the browser and the repository, and write the sheet of manual steps. Use for handing a site over, letting a client change their own text and pictures, or adding an admin panel. Not for designing the interface, use siteasy."
license: Apache-2.0
compatibility: Requires Node.js 20+ and Python 3 for the deterministic tools, plus network access for page fetches. NTH_ROOT must point at the NullToHero checkout.
metadata:
  version: "4.0.0"
  host: codex
  source-skill: cms
  short-description: "Hand a finished site to the person who owns it: turn its hardcoded prose into editable fields, vendor an editor with its own accounts, put a server-side allow-list between the browser and the repository, and write the sheet of manual steps. Use for handing a site over, letting a client change their own text and pictures, or adding an admin panel. Not for designing the interface, use siteasy."
  argument-hint: "[entrust|carve|scaffold|accounts|check|handover] [path/to/site]"
---
<!-- Generated for OpenAI Codex from null-to-hero/skills/cms/.
     Do not edit here. Edit the source and run tools/build-dist.mjs. -->

## Host notes

Invoke this skill with `$nth-cms`, or pick it from `/skills`. Its commands are written `/nth-cms <command>` below.

`${NTH_ROOT}` is the absolute path of the NullToHero checkout, substituted at install time. If a command still shows the literal token, the install did not run; export `NTH_ROOT` and run it again.

This host does not publish tool names to a skill. Where the text names a tool, read it as the capability: read a file, read a media file, write a file, edit a file, match paths by pattern, search file contents, fetch a URL, search the web, run a shell command, ask the user a clarifying question, delegate to a sub-agent.

Hands a finished site to its owner. The result is a site whose text and pictures
live in JSON files a client edits through a browser, and whose templates, scripts
and stylesheets they cannot reach, by construction rather than by convention.

## What the client gets, and what they cannot get

The editor writes to one branch. A Netlify function stands between the browser
and GitHub, and it refuses any path outside a compiled allow-list, whatever the
interface says. The token behind it is a fine-grained one without the `Workflows`
permission, so `.github/workflows/` is out of reach because GitHub says so and not
because our list is right.

A page that has been entrusted carries no text. It carries a token,
`{{file.section.field}}`, that the build resolves at deploy time from `content/`.
An edit therefore changes a JSON value and nothing else.

## Commands

| Command | What it does | Reference |
|---|---|---|
| `entrust [site]` | The whole chain, from a finished site to a repository ready to hand over | [references/entrust.md](references/entrust.md) |
| `carve [site]` | The extraction alone: propose the fields, read them back, write nothing until asked | [references/carve.md](references/carve.md) |
| `scaffold [site]` | Compile CONTENT.md into the editor, the bridge, the allow-list and the workflow | [references/entrust.md](references/entrust.md) + [references/architecture.md](references/architecture.md) |
| `accounts [site]` | Mint, remove and list the accounts the bridge will accept | [references/operate.md](references/operate.md) |
| `check [site]` | `cms-lint` and `cms-scaffold --check` in one pass, plus what neither can see | [references/operate.md](references/operate.md) |
| `handover [site]` | Regenerate CMS.md and read it with the person who will do the manual steps | [references/operate.md](references/operate.md) |

## Start here

1. Read the site. `node "${NTH_ROOT}/tools/cms/content-map.mjs" .`
   answers one question: what could its owner safely be given the keys to. It
   refuses generated files, because handing someone a file the next build
   overwrites is data loss that fails silently.
2. If the site holds its prose in HTML rather than in front matter, the
   extraction is the first real step. See [references/carve.md](references/carve.md).
3. Otherwise go straight to CONTENT.md and `scaffold`.

## The one file written by hand

`CONTENT.md` declares what the owner may edit, the branch, the roles, the theme,
the media folder and the language. Everything else is compiled from it: the
editor's `config.yml`, the bridge's allow-list, the admin page, the workflow, the
handover sheet. Two declarations of one fact drift. One declaration and a
generator do not, and `cms-lint` fails when a compiled file disagrees with its
source.

## What this skill does not do

It does not create the token, set the environment variables, push the content
branch or point the host at the right branch. Those live in a console nobody here
controls. `scaffold` writes `CMS.md`, which names each of them with this site's
real values, and ends with the list of things no check can establish from the
repository.

It never puts a secret in the repository. A password is never a command-line
argument, and a token pasted into a conversation is a token in a transcript.

## Requirements

`node` 18 or later for everything. `playwright` for the extraction, the same one
the rendered rules use: without it, `carve` refuses rather than guessing. The
editor bundle is vendored at an exact version by `vendor-decap.mjs`, so the admin
page needs no external origin and its content security policy stays closed.
