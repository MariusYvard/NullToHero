# Behavior evaluation harness

The repository already tests its tools well. `null-to-hero/tools/audit/eval.mjs` grades the static
analyzer against labeled HTML fixtures in `tests/eval/`, measures per-check accuracy and
fails CI on a correctness regression or, under `--strict`, on any drift from
`tests/eval/baseline.json`. That harness answers one question precisely: does the
deterministic code still return the verdict the fixture was authored to produce.

It answers nothing about the instructions. Nothing in the repository checks that the
agent refuses to guarantee a ranking, returns a missing input state instead of a number
when a blocking input is absent, declines to reconstruct a threshold the project removed
on purpose, or routes a request to the command that owns it. Those behaviors are
specified across `null-to-hero/skills/*/SKILL.md`, the reference files and the sub-agent definitions,
and until now they were specified nowhere in a form anything could check.

This directory holds that missing corpus and a structural verifier for it.

## What is here

| Path | What it is |
|---|---|
| `cases/*.md` | The corpus. One markdown file per skill, one inline YAML block per case. |
| `profiles.json` | Three named selections over the corpus: `smoke`, `risk`, `full`. |
| `run.mjs` | The structural verifier. Runs no model, needs no key, costs nothing. |

## Case format

A case is a fenced `yaml` block inside a case file. Seven fields are mandatory.

```yaml
id: seo-guarantee-refusal
type: risk | routing | edge | contract
status: simulated
target_skill: seo
scenario: <one sentence describing the situation>
input_summary: <what the user says, in their words>
expected_behavior:
  - <expected behavior, checkable>
  - <...>
failure_modes:
  - <what would constitute a failure, written positively as an observable behavior>
  - <...>
```

| Field | Rule |
|---|---|
| `id` | Lowercase kebab-case, unique across the whole corpus. |
| `type` | One of `risk`, `routing`, `edge`, `contract`. |
| `status` | `simulated` by default. `real` only under the evidence rule below. |
| `target_skill` | A directory that exists under `null-to-hero/skills/`. |
| `scenario` | The situation, one sentence, from the outside. |
| `input_summary` | What the user says, in the user's register rather than the plugin's. |
| `expected_behavior` | Non-empty list. Each entry is something an observer could confirm from a transcript. |
| `failure_modes` | Non-empty list. Each entry describes an observable wrong behavior, written positively. |

Failure modes are written positively on purpose. "Does not guarantee a ranking" is the
expected behavior restated with a negation in front of it, and a corpus made of those
mirrors reads as coverage while testing nothing new. "Names a position, a probability or
a timeline for reaching it" is a different sentence that describes something you can
point at in a transcript. The verifier warns when a failure mode is a negation mirror of
an expected behavior in the same case.

## The evidence rule

A case is `status: simulated` by default, **and a simulated case is not validating**. It
proves no real behavior. It documents an intention: this is what the plugin is supposed
to do here, written down so that a reviewer can disagree with it before a user does.

Promotion to `status: real` requires two additional fields:

| Field | Rule |
|---|---|
| `evidence_ref` | A repository-relative path to a local artifact, for example a captured transcript committed under `tests/behavior/evidence/`. |
| `evidence_sha256` | The sha256 digest of that file, 64 hex characters. |

`run.mjs` rejects a case labeled `real` that is missing either field, whose
`evidence_ref` does not exist on disk, whose `evidence_ref` resolves outside the
repository, or whose recorded hash does not match the file. The hash is what makes the
promotion durable: an artifact that changes after promotion invalidates the case instead
of quietly backing a claim that no longer holds.

### Case provenance is independent of execution provenance

These are two different axes and conflating them is the failure this section exists to
prevent.

- **Case provenance** is the `status` field. It says whether an artifact backs this case.
- **Execution provenance** is whatever ran the case. It says which model, which version,
  which session.

A real model can execute a simulated case. That is normal, and the run does not promote
the case: nothing was captured, so nothing can be re-checked. A real case does not become
executed evidence either. It carries an artifact from one past run, and it becomes a
result only when a result exists for the run in question.

So four states exist and the harness only knows about the first axis:

| Case status | Executed | What it means |
|---|---|---|
| `simulated` | no | A written intention. The default state of this corpus. |
| `simulated` | yes | A model answered it once and nothing was kept. Still an intention. |
| `real` | no | An artifact from a past run is attached and hashed. Not a current result. |
| `real` | yes | An artifact is attached and a result exists for this run. Evidence. |

`run.mjs` verifies the first column. It never claims anything about the second, and a
passing run prints so.

## Profiles

`profiles.json` declares three selections. Pass one with `--profile <name>`.

| Profile | Selection | Use |
|---|---|---|
| `smoke` | 23 case ids, listed by name | The pre-release review checklist. |
| `risk` | Every case of type `risk` | Run whenever refusal, scoring or threshold instructions change. |
| `full` | The whole corpus | The default when no profile is passed. |

`smoke` is enumerated by name and not computed. A computed profile such as "every risk
case whose target skill is seo" changes membership every time the filter or the corpus
changes, which means a sentinel can drop out of the pre-release checklist through an
edit that nobody reviewed as a coverage decision. The names are written down so that
removing one is a visible diff. The 23 sentinels cover every risk family: guarantee
refusal, scoring without data, untraceable numbers, command boundaries, accessibility
and dark patterns, data edge cases and scope.

## The verifier

`run.mjs` runs no model. That is its strength: it runs in CI with no API key, no network
and no per-run cost, and it catches the way this corpus actually decays, which is a
command getting renamed while the cases keep citing the old name.

| # | Check | Failure |
|---|---|---|
| 1 | Every case parses, carries the seven mandatory fields, and `type` and `status` hold allowed values | error |
| 2 | Case ids are unique across the whole corpus | error |
| 3 | `target_skill` names a directory present in `null-to-hero/skills/` | error |
| 4 | The evidence rule: a `real` case carries both evidence fields, the file exists inside the repository and the hash matches | error |
| 5 | `expected_behavior` and `failure_modes` are non-empty | error |
| 5b | A failure mode that is an expected behavior with a negation prefix | warning |
| 6 | Every `/skill command` cited in a case is declared in that skill's `SKILL.md` | error |
| 7 | Every case id referenced by a profile exists | error |

Checks 1, 3, 4, 5 and 6 apply to the selected cases. Checks 2 and 7 always run over the
whole corpus, because a duplicate id or a dangling profile reference is a corpus defect
regardless of which subset is being validated.

## Usage

```
node tests/behavior/run.mjs                    # validate the whole corpus
node tests/behavior/run.mjs --profile smoke    # validate the pre-release checklist
node tests/behavior/run.mjs --profile risk     # validate every risk case
node tests/behavior/run.mjs --list             # list the selected cases, run no checks
node tests/behavior/run.mjs --json             # machine-readable result on stdout
```

Exit code 0 when every selected case is structurally valid, 1 otherwise. Warnings never
change the exit code.

## Adding a case

1. Pick the case file for the skill the behavior belongs to.
2. Write the seven fields. Keep `expected_behavior` entries checkable from a transcript
   and keep `failure_modes` entries positive.
3. Cite commands in backticks as `` `/seo audit` ``. Check 6 resolves them against the
   skill definition, so a citation of a command that does not exist fails the run.
4. Leave `status: simulated`. Promote later, with an artifact and its hash.
5. Run `node tests/behavior/run.mjs` before committing.

## Editorial rules

Content is in English, matching the rest of the repository. The tone is factual: a case
describes a situation and a behavior, it does not sell the plugin. Em dashes and en
dashes are banned throughout this directory, including inside cases, in line with the
copy rule in `null-to-hero/skills/siteasy/SKILL.md`. No serial comma.
