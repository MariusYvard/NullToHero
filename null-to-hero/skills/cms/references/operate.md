---
name: cms-operate
version: 1.0.0
description: >
  Running an entrusted site: accounts, checks, the handover sheet, the write
  quota, going back a version, and what to do when a client says it stopped
  working. Backs /cms accounts, /cms check and /cms handover.
---

# Operating an entrusted site

## Accounts

    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/cms-account.mjs" add owner@example.com --roles editor

One command per person, and that is the whole registry: these accounts are the
only ones that exist. With an identity provider behind the bridge, whether a
stranger can sign in would depend on someone having switched registration to
invite only in a console nobody here controls, and a missed switch is silent.

What comes out is a scrypt derivation with its parameters and its salt, plus a
password printed once. The password is never written anywhere and never passed as
a command-line argument. Losing the derivation means minting a new one; there is
no way back from it, and that is the property being paid for.

Roles are declared in `CONTENT.md` and enforced by the bridge, per allow-list
rule. A path whose rule names no role is open to any signed-in account.

## Checks

    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/cms-lint.mjs" .
    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/cms-scaffold.mjs" --check .

The first runs 29 checks that Decap's own schema cannot: a collection folder
outside the allow-list, a public folder that makes every image URL point at the
repository path, a declared locale the editor does not ship, a workflow that
watches the wrong branch, a build that never calls `nth-content.mjs`. The second
reports any compiled file that has been edited by hand.

Neither can see the four things listed at the end of `CMS.md`. Those are
established by opening the editor and changing a word.

## The write quota

Declared in `CONTENT.md`, counted from the branch's commit history, and returned
to the browser with every save so the editor can show what is left. It exists
because an editor is a write endpoint on somebody else's repository, and a loop in
a client's browser should cost them a message rather than ten thousand commits.

## Going back

Every entry has a previous version, and the editor offers it as a button that
arms on the first click and acts on the second. Underneath it is the file's
history on the content branch, so a restore is a commit rather than a deletion.

## When a client says it stopped working

| Symptom | First thing to look at |
|---|---|
| The sign-in refuses a password that used to work | `NTH_CMS_ACCOUNTS` on the host, and whether the deploy context is the one being served |
| Saving reports a refusal | The allow-list: the path is outside `cms-policy.json`, whatever the interface offered |
| Saving works, the site does not change | The workflow, and whether the host deploys the production branch |
| The preview shows braces | The build does not call `nth-content.mjs` |
| The preview is empty | `admin/preview/` is written at build time and gitignored; a deploy that did not run the build has none |
| The editor loads then goes blank | A vendored chunk is missing; re-run `vendor-decap.mjs` |

## The handover sheet

`CMS.md` is compiled, so regenerating it is `cms-scaffold` and editing it by hand
is pointless. It carries this site's real values and it ends by naming what no
check can establish: the rights the token actually holds, whether the variables
are set on the right context, which branch the host deploys, the domain's DNS.
Read it with the person who will do those steps.
