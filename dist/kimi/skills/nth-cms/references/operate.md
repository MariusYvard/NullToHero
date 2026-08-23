---
name: cms-operate
version: 1.0.0
description: >
  Running an entrusted site: accounts, checks, the handover sheet, the write
  quota, going back a version, and what to do when a client says it stopped
  working. Backs /nth-cms accounts, /nth-cms check and /nth-cms handover.
---

# Operating an entrusted site

## Accounts

    node "${NTH_ROOT}/tools/cms/cms-account.mjs" add owner@example.com --roles editor

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

    node "${NTH_ROOT}/tools/cms/cms-lint.mjs" .
    node "${NTH_ROOT}/tools/cms/cms-scaffold.mjs" --check .

The first runs 29 checks that Decap's own schema cannot: a collection folder
outside the allow-list, a public folder that makes every image URL point at the
repository path, a declared locale the editor does not ship, a workflow that
watches the wrong branch, a build that never calls `nth-content.mjs`. The second
reports any compiled file that has been edited by hand.

Neither can see the four things listed at the end of `CMS.md`, because neither
leaves the repository. Three of the four are visible from inside the deployed
bridge, and only from there:

    node "${NTH_ROOT}/tools/cms/cms-diagnose.mjs" https://the-site.example owner@example.com

It signs in as an existing account, asks the bridge for its own state, and prints
booleans: which of the four variables are set on the context being served, how
many accounts the bridge can read, whether the token reads the repository,
whether it may write contents, whether it is wider than it should be, whether the
two branches exist, whether the publish workflow is readable and when it last
ran. It exits 1 when something that must hold does not.

The answer is booleans and dates, never values. A diagnostic that returned the
value of a variable would be a way to read the variables through the editor, and
every account that can sign in could use it.

The password is read from the keyboard without echo, or from standard input when
it is piped. It is never a command-line argument, because an argument is in the
shell history and in the process table.

The fourth thing, the domain's DNS, stays out of reach: the bridge does not know
by what name it was reached. Whether the host serves the production branch stays
a matter of looking, though a workflow that ran and a production branch that
exists narrow it to the host's own setting.

## Replacing the token

A fine-grained token expires, and it does not announce it: it stops writing on a
Tuesday and the client calls to say the editor is broken. GitHub returns the
expiry date on every REST response made with the token, so the bridge already
knows it. Under three weeks it writes `{"cms":"token-expiry","days":n}` into the
host's function log on every action, and `cms-diagnose.mjs` prints it as a date.

The order matters, and it is the opposite of the intuitive one:

1. Mint the new token in GitHub, same repository, `Contents` in write, nothing
   else, and above all not `Workflows`.
2. Set `NTH_CMS_GITHUB_TOKEN` to the new value on the host, on the deploy context
   that is actually served.
3. Redeploy. A Netlify function reads its variables at cold start, so a variable
   changed without a deploy reaches only the instances that start afterwards, and
   the editor keeps working through the old token until the last warm instance
   dies.
4. Run `cms-diagnose.mjs` and read the new expiry date. Until it moves, the
   change has not landed.
5. Revoke the old token in GitHub, once, and not before step 4.

Revoking first turns a five-minute operation into an outage: between the
revocation and the redeploy, every save fails. The bridge holds no state and no
cache of its own, so nothing else has to be flushed.

A token without a declared expiry is not the good news it looks like. It never
warns because there is nothing to warn about, and it outlives the client
relationship it was minted for.

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
| Anything at all, before guessing | `cms-diagnose.mjs`, which answers from inside the deployment rather than from the repository |
| The sign-in refuses a password that used to work | `NTH_CMS_ACCOUNTS` on the host, and whether the deploy context is the one being served |
| Saving reports a refusal | The allow-list: the path is outside `cms-policy.json`, whatever the interface offered |
| Saving reported nothing for months and now refuses everything | The token's expiry date, which the log has been naming for three weeks |
| Saving works, the site does not change | The workflow, and whether the host deploys the production branch |
| The preview shows braces | The build does not call `nth-content.mjs` |
| The preview is empty | `admin/preview/` is written at build time and gitignored; a deploy that did not run the build has none |
| The editor loads then goes blank | A vendored chunk is missing; re-run `vendor-decap.mjs` |

## The handover sheet

`CMS.md` is compiled, so regenerating it is `cms-scaffold` and editing it by hand
is pointless. It carries this site's real values and it ends by naming what no
check can establish from the repository: the rights the token actually holds,
whether the variables are set on the right context, which branch the host
deploys, the domain's DNS. Read it with the person who will do those steps, then
run `cms-diagnose.mjs` once the steps are done: the first three stop being a
matter of trust the moment the bridge is up.
