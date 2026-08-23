---
name: cms
description: "Use when the user wants to hand a finished site over to the person who owns it, so they can change the words and the pictures without touching the code. Covers: turning hardcoded HTML prose into editable fields, a vendored Decap CMS editor with its own accounts, a Netlify function bridge with a server-side allow-list, a write quota, an in-page preview of the real site, and a publish workflow that copies rather than merges. Use when the user says: 'give my client the keys', 'let the owner edit the text', 'add a CMS to this site', 'make this site editable', 'hand this site over', 'set up the admin panel', 'the client wants to change their opening hours themselves'. Not for designing or building the interface, use /siteasy. Not for judging a site's quality, use /audit. Not for search visibility, use /seo."
version: 1.0.0
user-invocable: true
argument-hint: "[entrust|carve|scaffold|accounts|check|handover] [path/to/site]"
allowed-tools:
  - Bash(node *)
  - Bash(python3 *)
  - Bash(npm *)
  - Bash(git *)
  - Read
  - Write
  - Edit
  - Task
---

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

1. Read the site. `node "${CLAUDE_PLUGIN_ROOT}/tools/cms/content-map.mjs" .`
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
