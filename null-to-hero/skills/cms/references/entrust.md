---
name: cms-entrust
version: 1.0.0
description: >
  The full chain that turns a finished site into one its owner can edit: read the
  site, propose the fields, review them, declare them, compile the editor and the
  bridge, mint the accounts, and hand over the sheet of manual steps. Backs
  /cms entrust and /cms scaffold.
---

# Entrusting a site

Six steps, in this order. Each one is reversible until step 4, and step 4 is the
one that rewrites the pages.

## 1. Read the site

    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/content-map.mjs" . --json

It answers what could safely be entrusted and, just as usefully, what could not.
A file that carries a GENERATED marker, a file git does not track, anything under
a build directory: all refused, because a client who edits a file the next build
overwrites loses their words and nothing fails.

Two shapes come back. A site whose content already lives in front matter or JSON
needs no extraction: go to step 3. A site that holds its prose in HTML reports it
under `hardcoded`, and that is step 2.

## 2. Propose the fields

    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/content-carve.mjs" . 

Without `--write` it changes nothing and prints what it would do. Read the
proposal before writing it. The naming is mechanical and the grouping is blunt on
purpose, which is covered in [carve.md](carve.md) along with what to look for.

## 3. Declare, by hand

`CONTENT.md` is the only file written by hand. It names the branch, the roles, the
media folder, the theme, the language, the production branch and the repository.
`cms-scaffold.mjs init` writes a first draft from what the site already has, and
that draft is a starting point rather than an answer.

Two declarations worth thinking about rather than accepting:

- `branch` is where the bridge writes, and it must not be the branch the host
  deploys. The workflow copies from one to the other.
- `publish` decides whether saving puts the change online. `on_save` is the
  default and the right one for a small site. `manual` adds a review step and a
  button, and it needs the token to carry Actions write, which is a different
  permission from Workflows and must not be confused with it.

## 4. Write

    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/content-carve.mjs" . --write
    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/cms-scaffold.mjs" .

The first rewrites the pages, replacing each extracted value with its token, and
writes `content/*.json`. It checks itself: every page is refilled from its own
values and compared with the original, and any page that does not come back
identical is named. A doubled space that HTML collapses anyway is the usual
cause; anything else deserves a look before continuing.

The second compiles CONTENT.md into eleven artefacts and refuses to overwrite one
that already exists and differs. That refusal is the feature: a generator that
overwrites is a generator that eats the fix somebody made at two in the morning.
Use `--check` to compare only, `--force` to rewrite what has drifted.

Then the editor itself:

    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/vendor-decap.mjs" .

It vendors the whole bundle, entry plus chunks. Vendoring the entry alone gives a
login screen that loads and an editor that never opens, and the failure shows up
as a network error in a console the client will not have open.

## 5. Wire the build

The site's own build calls `nth-content.mjs` once its pages are otherwise final.
That is what resolves the tokens and writes the copies the preview displays.
Without the call the site publishes its braces, and `cms-lint` says so (CMS-29).

On a site with its own build script, the call goes at the end of it. On a site
with none, it becomes the build command.

## 6. Hand over

    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/cms-account.mjs" add someone@example.com --roles editor
    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/cms-lint.mjs" .

`CMS.md`, compiled at step 4, carries the manual steps with this site's real
values: the branch to push, the token's exact permissions, the four environment
variables, the build call, and a closing section naming what no check can
establish from a repository. Read it with the person who will do those steps
rather than sending it to them.

## What to tell the owner

Three sentences, no more. Their words live under `content/`, the editor is at
`/admin/`, and the site rebuilds itself when they save. Everything else they will
discover by using it, which is what the field hints, the counters and the preview
are for.

## Verification, in the order that catches the most

| Command | What it proves |
|---|---|
| `cms-scaffold --check` | No compiled file has been edited by hand |
| `cms-lint` | 29 checks Decap's own schema cannot run |
| `node nth-content.mjs --check` | Every token resolves to a value |
| Open `/admin/`, sign in, change a word, publish | The four things no check can see |
