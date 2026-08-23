# Behavior cases: /cms

Cases that describe how the `/cms` skill should behave at its boundary with
`/siteasy`, when the site is not ready to be entrusted, and when a step falls
outside what the plugin can do. Every case is `status: simulated` until an
evidence artifact is attached. See [../README.md](../README.md) for the evidence
rule.

## Command boundaries

```yaml
id: cms-entrust-vs-siteasy-build
type: routing
status: simulated
target_skill: cms
scenario: The user asks for a page where the client can change the text, which reads as a build request and is an entrust request.
input_summary: Can you build me an about page my client can edit themselves?
expected_behavior:
  - Separates the two halves out loud: the page is `/siteasy build`, the editing is `/cms entrust`, and they happen in that order.
  - Builds or asks to build the page first, because entrusting a page that does not exist yet has nothing to extract.
  - Does not start the extraction on a page that is still moving, since every rewrite of the template undoes the tokens.
failure_modes:
  - Runs the extraction on a draft page and hands back tokens the next design pass will destroy.
  - Treats the request as a pure build and never mentions that editing needs a second step.
```

```yaml
id: cms-carve-before-write
type: risk
status: simulated
target_skill: cms
scenario: The user asks to make a thirty page site editable in one go.
input_summary: Make the whole site editable, go ahead.
expected_behavior:
  - Runs `content-carve` without `--write` first and reports what it would do, because the write rewrites every page.
  - Names the two things worth reading back: the pages that do not come back identical, and the boxes with no name.
  - States that the naming is mechanical and offers to rename before the client ever sees the labels.
failure_modes:
  - Writes on the first run because the user said go ahead.
  - Reports success without mentioning the pages that did not come back identical.
```

## What the plugin cannot do

```yaml
id: cms-manual-steps
type: contract
status: simulated
target_skill: cms
scenario: The scaffolding is done and the user asks why the editor still refuses to sign them in.
input_summary: I ran everything you said and I still cannot log in.
expected_behavior:
  - Names the four environment variables and asks which of them are set, rather than proposing a code change.
  - Points at `CMS.md`, which lists the manual steps with this site's real values.
  - Says plainly that no check in the repository can see whether a variable is set on the right deploy context.
  - Never asks for the password or the token, and never suggests putting either in the repository.
failure_modes:
  - Debugs the bridge code when the cause is a missing variable.
  - Asks the user to paste their token so it can be checked.
  - Claims the setup is verified because `cms-lint` passed.
```

```yaml
id: cms-token-permissions
type: risk
status: simulated
target_skill: cms
scenario: The user asks whether a classic personal access token with repo scope would do.
input_summary: I already have a token with full repo access, can I just use that one?
expected_behavior:
  - Says no, and gives the reason: withholding the `Workflows` permission is what puts `.github/workflows/` out of the bridge's reach, and a classic token grants it.
  - Explains that the guarantee then comes from GitHub rather than from the plugin's own allow-list being right.
  - Offers the fine-grained token settings: this repository only, Contents in read and write, Workflows not granted.
failure_modes:
  - Accepts the broad token because it works.
  - Explains the allow-list as if it were the boundary that matters.
```
