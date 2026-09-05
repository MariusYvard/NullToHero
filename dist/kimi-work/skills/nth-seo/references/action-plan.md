---
name: seo-action-plan
description: >
  Standardized ACTION-PLAN.md output template for all /nth-seo commands.
  Every audit, page analysis, technical check, and strategy command
  should produce a structured action plan using this template.
  Priority tiers: Quick Wins (< 1h), 1-Week, 1-Month, Backlog.
version: 1.8.1
---

# ACTION-PLAN Output Standard

Every `/nth-seo` command that produces recommendations MUST output an action plan using this template. Save as `ACTION-PLAN-[domain]-[YYYY-MM-DD].md` in the user's working directory.

## Template

```markdown
# ACTION-PLAN — [Site Name or Domain]
**Generated:** [YYYY-MM-DD]  **Command:** /nth-seo [command]  **Score:** XX/100

---

## Summary

[One sentence: what's the overall state and the single most impactful next step.]

---

## Quick Wins — do these today (< 1 hour each)

| # | Issue | Fix | Dimension | Impact |
|---|-------|-----|-----------|--------|
| 1 | [clear description] | [concrete action] | Technical | High |
| 2 | ... | ... | Content | High |

_Target: complete all quick wins within 48 hours._

---

## 1-Week Fixes — schedule this sprint

| # | Issue | Fix | Dimension | Effort | Impact |
|---|-------|-----|-----------|--------|--------|
| 1 | [description] | [action] | Schema | Medium | High |
| 2 | ... | ... | ... | ... | ... |

_Target: ship all 1-week fixes before the next audit._

---

## 1-Month Projects — plan these now

| # | Project | What it involves | Dimension | Effort | Impact |
|---|---------|-----------------|-----------|--------|--------|
| 1 | [project name] | [brief description] | Content | High | High |
| 2 | ... | ... | ... | ... | ... |

---

## Backlog — low priority

- [item] — [why it's low priority]
- [item]

---

## How to track progress

Re-run the same command after completing each tier:
- After Quick Wins: `/nth-seo [command] [url]` → compare scores
- After 1-Week: `/nth-seo audit [url]` → full re-audit
- Ongoing: `/nth-seo drift [url] compare` → catch regressions
```

## Priority classification rules

Use these criteria consistently across all commands:

### Quick Wins (< 1 hour each)
- Missing `<title>` or `<meta description>` tags
- Images missing `alt` text
- Missing `<link rel="canonical">`
- robots.txt blocking important pages
- Schema validation errors on existing markup
- `loading="lazy"` on LCP image (remove it)
- Missing `width`/`height` on images above the fold

### 1-Week Fixes (2h–2 days each)
- Writing or rewriting thin content (< 300 words on key pages)
- Adding Organization or LocalBusiness schema where missing
- Implementing hreflang for multilingual sites
- Fixing 404 chains and redirect loops
- Implementing `font-display: swap`
- Adding `llms.txt` file
- Consolidating duplicate content

### 1-Month Projects (> 2 days each)
- Site architecture redesign
- Content cluster build-out (5+ new pages)
- Full i18n implementation
- Core Web Vitals engineering (requires dev sprints)
- Link building campaign
- Programmatic SEO page generation

### Backlog
- Nice-to-haves with low ROI
- Items blocked by third-party dependencies
- Changes requiring significant design work

## Impact classification

| Level | Definition |
|-------|-----------|
| High | Affects ranking, crawlability, or large traffic segments |
| Medium | Improves user experience or AI visibility meaningfully |
| Low | Minor polish, small traffic segments, speculative gains |

## Effort classification

| Level | Definition |
|-------|-----------|
| Low | < 1 hour, one person, no deployment |
| Medium | 2h–2 days, may require dev |
| High | > 2 days, multiple people or significant dev work |

## Rules for all commands

1. Every action item must be specific and actionable — no vague items like "improve content quality"
2. Every item must name the page or URL it applies to when relevant
3. Quick wins must be genuinely completable in under 1 hour
4. The plan must be scannable — no walls of text
5. Cap Quick Wins at 10 items; if more exist, promote the highest-impact 10 and move rest to 1-Week
6. Include a "how to verify" note for each critical fix when non-obvious

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Format action plan as deliverable | `/nth-audit report [file]` |
| Track changes over time | `/nth-seo drift [url] compare` |
| Re-audit after fixes | `/nth-seo audit [url]` |
