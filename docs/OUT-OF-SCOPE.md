# Out of scope

Features deliberately not built, with the reason, so rejected scope is not re-litigated.

## A hard cap for the claims dimension

The Claims and credibility agent scores how well the page substantiates its marketing claims, but the audit does not auto-fail a site for a single unsupported claim. Claim strength is a judgment that varies by industry, and a hard cap here would produce false criticals. The dimension is graded continuously instead, like the other subjective design dimensions.

## A separate `--verify` code path for config skills

Verification of a setup is handled by re-running the relevant skill in a check-only mode, not by a dedicated flag. A separate code path only pays for itself where the verification is deterministic, which the audit `verify` mode is and a config check is not.
