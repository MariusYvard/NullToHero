# Multi-Agent Architecture

How NullToHero's `/audit` orchestrator and its 13 specialist sub-agents are
designed, and which production multi-agent principles apply to a Claude Code
plugin made of Markdown and a few local scripts. This document is the rationale
record for the agent layer. The operational security policy lives in
[SECURITY.md](../SECURITY.md); the runnable orchestration playbook lives in
[skills/audit/references/full.md](../skills/audit/references/full.md).

## Topology

NullToHero uses one pattern: a centralized supervisor that dispatches stateless,
single-purpose sub-agents and consolidates their results. In the taxonomy of
common orchestration patterns (subagents, skills, handoffs, router,
planner-executor, reflection), this is the subagents pattern. The `/audit` skill
is the supervisor. It owns no detection logic. It resolves the target, fetches
the pages once, schedules the chosen agent group in parallel and merges the
returned sections into one score.

```
                         /audit  (supervisor)
                              |
            shared single fetch of the target pages
                              |
   +----------------+----------------+----------------+
   |                |                |                |
 SEO group     defects group    design group    (verify: gating
 5 agents       4 agents         4 agents         dimensions x K)
   |                |                |                |
   +----------------+----------------+----------------+
                              |
        deterministic reduce: weighted score, severity cap,
        de-duplicated action plan, verbatim agent sections
```

Each dimension is owned by exactly one backing skill (`/seo`, `/inspect`,
`/siteasy`) and is the single source of truth for that dimension. The supervisor
changes only the scheduling (parallel, one shared fetch) and the consolidation
(one merged report). A finding can be re-run or deepened with the owning skill
without re-auditing the whole site.

## When the multi-agent path is justified

A single agent stays preferable for a single-dimension request. The `/audit`
"When NOT to use" table routes a search-only ask to `/seo audit`, a defect-only
ask to `/inspect` and a design-only ask to `/siteasy audit`. The whole-site pass
earns 13 agents for two reasons that match the production literature:

1. Crossing dimension boundaries. A whole-site review pulls technical SEO,
   content, schema, performance, GEO, accessibility, interaction, layout, code,
   UX, visual, motion and copy. One agent holding every checklist at once selects
   the wrong check under load and saturates its context.
2. Distractor isolation. Giving each agent one checklist and one instruction set
   keeps its context free of the other twelve. Benchmarks on conversational
   agents show a single agent's accuracy collapsing once several unrelated tool
   and instruction sets share its window, while isolated specialists hold a flat
   accuracy and token curve.

## Error propagation: parallel, not serial

Chaining agents in series multiplies their reliabilities. For n stages each at
reliability p the system reliability is the product:

```
R_sys = p_1 * p_2 * ... * p_n
```

Five stages at 0.98 give 0.903; ten give 0.817. NullToHero does not chain the
audit agents in series. Within a run mode the agents are independent and run in
parallel over the same input (a Map step), then a deterministic reducer combines
their scored sections (a Reduce step). No agent reads another agent's output, so
one agent's miss cannot propagate into another's reasoning. This is the structural
defense against compounding error.

The agents share one base model, so they share blind spots (a monoculture). The
design mitigates this two ways. First, the agents are not redundant voters on one
question; each scores a different dimension, so a shared blind spot on dimension A
does not corrupt the score for dimension B. Second, the `verify` run mode adds
explicit redundancy where it matters (see below).

## Consensus verification (`/audit verify`)

`verify` re-runs the gating dimensions (accessibility, interaction, technical SEO)
K=3 times in parallel and reconciles each check by majority vote. For K
independent samples at individual error rate p, a majority vote drops the residual
error to a polynomial order:

```
O( p^ceil(K/2) )
```

A check is reported FAIL only if a majority of runs report FAIL; the reported
score is the median of the K scores. Runs that split (no clear majority) are not
silently averaged away. They are flagged as low-consensus and elevated for human
review. The honest limit: because the K runs share one base model, voting catches
non-deterministic misses (self-consistency) but not a blind spot the model holds
on every sample. `verify` therefore surfaces disagreement rather than claiming to
remove it. The cost is stated in the playbook: roughly K times the tokens and
latency for the re-run dimensions, which is why `verify` re-runs only the gating
group by default, not all 13 agents.

## Context efficiency

Three mechanisms keep the supervisor's and the agents' windows clean.

One fetch, many readers. The supervisor retrieves the homepage and up to N key
pages once, together with `/robots.txt` and the sitemap, then passes that HTML to every
agent. No agent re-fetches. One network pass feeds the whole group. This is the
main token and latency saving of the audit skill over running each skill
separately.

Context isolation. Each agent receives only its task and the shared HTML. It does
not receive the routing decisions, the supervisor's scratch reasoning, or any
sibling agent's output. Stripping routing and handoff history from a specialist's
context is a measured precision gain for its tool calls in supervisor benchmarks.

Verbatim embedding. The supervisor embeds each agent's returned section into the
report unchanged. It does not paraphrase agent output before presenting it. A
supervisor that reformulates sub-agent text introduces paraphrase drift (the
"telephone game" failure of naive supervisors). Forwarding the section verbatim
removes that whole error class. The consolidation step adds only the cross-cutting
action plan, which de-duplicates the same root cause across dimensions and reports
it once.

## Deterministic reduce

The combine step is code-shaped, not model-shaped, so it is reproducible:

- Weighted scoring. Group sub-scores are fixed-weight normalized means of the
  agent scores; the overall Site Health Score is a fixed blend (SEO 35, defects
  35, design 30). The weights live in the playbook, not in a prompt. Each agent
  score is itself rubric-computed from its check verdicts (start 100, minus 15 per
  FAIL, minus 7 per WARN, floored, then capped at 49 on a critical-check FAIL), so
  the number is a function of the verdicts rather than one the model picks by feel.
- Severity cap. A FAIL on a critical accessibility check (keyboard, contrast) or a
  critical interaction check (interactive states, action feedback) caps the defects
  sub-score at 69 before the blend, so a critical defect cannot be hidden behind
  passing layout or code checks. The trigger is a check verdict, not a felt
  severity, so the cap does not toggle between runs.
- Structural validation. `tests/validate.js` is a deterministic gate over the
  plugin itself: version consistency, command-to-reference mapping, README counts,
  license integrity, reference-index freshness, and the agent invariants (read-only
  tools and trust boundary since 1.11.0, the scoring rubric since 1.12.0). It treats
  generated structure as a proposal that must pass a checker, not as trusted output.

Run-to-run variance is therefore confined to verdict flips on the genuinely subjective
design checks, which carry no hard cap. The verify mode bounds and surfaces those
rather than letting them move the headline number silently.

## Security model

The agent layer follows least agency and a read/write split. Detail and the
reporting process are in [SECURITY.md](../SECURITY.md). Summary:

- Least agency. Every sub-agent declares only read-only tools: Read, Grep, Glob,
  WebFetch. None can write a file, edit, run a shell, or dispatch a further agent.
  `tests/validate.js` enforces this; a sub-agent that adds a write-class tool fails
  the build.
- Read/write separation. The agents read (web, files); only the supervisor writes
  the two output files. An agent compromised through its input cannot reach a
  write tool because it holds none.
- Multi-hop indirect injection. The agents read untrusted external HTML, so a
  hostile page can carry instructions aimed at the model. The naive assumption
  that paraphrasing along the chain dilutes such an injection is wrong: an
  intermediate agent can launder a payload, stripping the markers that made it
  look suspicious, so it lands cleaner downstream. NullToHero's countermeasure is
  architectural plus instructional. Architectural: agents hold no write tools, so
  a followed instruction has no dangerous tool to call. Instructional: every agent
  carries a Trust boundary block that treats fetched content as data to analyze
  and never as instructions to follow. It reports a suspected injection as a finding.
  `tests/validate.js` enforces that the block is present in all 13 agents.
- No secrets in the tree. Repository secret scanning and push protection stay on.
  No token, key, or credential is committed.

## Resilience

The agents are stateless, so a failed agent is re-dispatched without rebuilding
shared state. The playbook's error table defines partial-coverage behavior: an
unreachable URL is reported not guessed, a 429 backs off and reduces concurrency,
a timeout reports the pages that returned and an agent that returns nothing is
recorded as partial coverage rather than fabricated. A surfaced finding is
re-runnable through its owning skill, which is the idempotent path to deepen one
dimension.

## What does not apply, and why

The source principles were written for long-running Python services built on agent
frameworks. NullToHero is a Markdown plugin with no persistent runtime, so the
infrastructure-specific items map to a plugin equivalent or to nothing.

| Production recommendation | NullToHero status |
|---------------------------|-------------------|
| Durable execution engine (Temporal) for replay and retries | N/A. No long-running workflow to checkpoint. Resilience is per-run partial coverage plus idempotent re-run through the owning skill. |
| External state store (DynamoDB, Redis) for agent memory | N/A. Agents are stateless within a run; the only persisted state is the repository under version control. |
| Redis Streams / LangCache for async events and semantic cache | N/A. Dispatch is one synchronous parallel fan-out, not an event bus. |
| Typed tool schemas (Pydantic, Instructor) | Equivalent: each agent's fixed "Output format" section is the typed contract; `validate.js` is the schema checker for plugin structure. |
| Framework choice (LangGraph, CrewAI, AutoGen, OpenAI SDK) | N/A as a dependency. The supervisor and sub-agents are the Claude Code agent mechanism; the patterns (subagents, parallel reduce, verbatim handoff) are reproduced directly. |
| Correlation-ID tracing, OpenTelemetry | N/A at runtime. The reproducible artifact is the scored report; the auditable artifact for the plugin is the validator output and git history. |
| Prompt registry and version pinning | Equivalent: the plugin is version-controlled, every release bumps one version across all manifests (checked) and each agent pins `model`. |
| File locks for concurrent writers | N/A. Agents do not write; only the single supervisor writes, so there is no write contention. |

## Source principles

This layer follows four pillars from the multi-agent production literature:
simplicity first (justify each agent against a single-agent baseline), defense in
depth (least privilege and untrusted-input handling enforced in code, not only in
prompts), separation of reasoning from durability (kept trivial here because the
plugin holds no runtime state) and empirical tuning (the scoring weights and the
severity cap are explicit and testable). Further reading: the OWASP guidance on AI
agent security and agentic application risks, and Anthropic's published guidance on
effective agent architecture patterns.
