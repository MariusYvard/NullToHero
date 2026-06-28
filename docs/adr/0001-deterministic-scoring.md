# Deterministic scoring over model-judged scores

The audit score is computed by a fixed rubric (start at 100, minus 15 per FAIL, minus 7 per WARN, floored, capped at 49 on a critical-check FAIL), not chosen by the model. The weights and the severity cap live in the playbook, not in a prompt.

Two audits of the same site were drifting six to eight points apart because the model picked the headline number by feel. A fixed formula makes the score a function of the verdicts, so it is reproducible and auditable. The model still emits the per-check verdicts; only the arithmetic is taken out of its hands.

This is deliberate and load-bearing. Do not replace the rubric with a single model-produced score, even though that looks simpler.
