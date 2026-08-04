# NOTICE

## Lineage of the anti-pattern detector

Until v2.6.0, `/inspect detect` shelled out to the `impeccable` CLI
(https://github.com/pbakaus/impeccable, Apache License 2.0, Paul Bakaus), pinned at 2.3.2.

From v2.7.0 the command runs NullToHero's own engine in `tools/inspect/`. No code, rule
definition or fixture was copied from that project. The rules executed here are NullToHero's
own registry, `tools/data/inspect-rules.csv`, which predates the engine, plus the static checks
already present in `tools/audit/lib/checks.mjs`.

The debt is one of approach and it is worth stating plainly: the idea that anti-pattern
detection belongs in tested, deterministic code rather than in prose an agent reads was
demonstrated by that project first, and this engine follows it.

The two cover different ground. Impeccable's rules are largely aesthetic. These are
correctness: WCAG, layout stability, security, dead interaction. Running both is reasonable.
