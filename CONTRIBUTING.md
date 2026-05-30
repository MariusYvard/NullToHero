# Contributing to NullToHero

Thank you for your interest in contributing. NullToHero is a Claude Cowork plugin — contributions take the form of new reference documents, improved skill logic, or new commands.

---

## What makes a good contribution

### New SEO or design reference file

A reference file teaches Claude a specific domain. Good reference files are:

- **Accurate** — all facts, statistics, and technical details are correct and dated
- **Actionable** — Claude can follow the file to produce a real, useful output
- **Complete** — covers the topic end-to-end without requiring lookup elsewhere
- **Structured** — uses tables and headed sections so Claude can navigate them efficiently
- **Maintained** — SEO changes fast. A file with outdated information is worse than no file

### New command

A new command should:
- Address a distinct, non-overlapping need from existing commands
- Have a clear input (`[url]`, `[keyword]`, `generate`) and a defined output format
- Reference a corresponding file in `skills/seo/references/` or `skills/siteasy/references/`

### Bug fix or improvement

- Incorrect information in a reference file
- A command that produces inconsistent or wrong output
- A missing cross-skill reference that should be there

---

## How to contribute

### 1. Open an issue first

Before writing, open a GitHub issue describing:
- What you want to add or fix
- Why it improves NullToHero for users
- Any sources or references you plan to use

This prevents duplicate work and gets early feedback.

### 2. Fork the repository

```bash
git clone https://github.com/MariusYvard/NullToHero.git
cd NullToHero
git checkout -b feature/your-contribution-name
```

### 3. Write the reference file

Follow the frontmatter format:

```markdown
---
name: seo-yourcommand
description: >
  One to three lines describing when Claude should use this. Include the key
  trigger phrases in natural language.
version: 1.0.0
user-invocable: true
argument-hint: "[url | keyword | generate]"
---

# Title

[Content]

## Output

[What Claude should produce]

## Error Handling

| Scenario | Action |
|----------|--------|
| [case] | [what to do] |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| [related need] | `/skill command` |
```

### 4. Update SKILL.md

Add your command to the commands table in `skills/seo/SKILL.md` (or `skills/siteasy/SKILL.md` for design commands).

### 5. Update CHANGELOG.md

Add a line under the `[Unreleased]` section describing what you added.

### 6. Run the validator

```bash
node tests/validate.js
```

All checks must pass before submitting.

### 7. Open a pull request

Include in your PR description:
- What the new reference covers
- Sources used (URLs, papers, official documentation)
- Any testing you did (running the command on real URLs and reviewing output quality)

---

## Quality standards for reference files

### Statistics and data points

- Every statistic must have a source and date
- Use the format: `[number] ([Source, Year])`
- Prefer primary sources (official docs, peer-reviewed research, company announcements)
- If a statistic cannot be verified, remove it rather than keep an unverified claim

### Deprecated information

SEO changes constantly. Flag when information may become outdated:
```
> **Note (Feb 2026):** This behavior may change as AI search evolves rapidly.
```

### Code examples

- All code examples must be syntactically correct
- HTML examples should be valid and accessible
- JSON-LD examples must be valid JSON

### Cross-skill references

Every reference file must end with a `CROSS-SKILL REFERENCES` table pointing to related commands. This helps Claude navigate the plugin efficiently.

---

## Scope: what NullToHero covers

NullToHero focuses on:
- **SEO** — on-page, technical, content, AI search, local, international
- **Design** — UX, visual design, motion, accessibility, performance
- **Inspect** — anti-pattern detection, browser preview, code review

NullToHero does NOT include:
- Paid API integrations (DataForSEO, Google Ads, etc.) — these require separate MCP setup
- Content writing / blog post generation — out of scope
- Analytics / tracking — out of scope
- E-mail marketing — out of scope

If you want to add something outside this scope, open an issue first to discuss.

---

## Code of conduct

Be respectful. Contributions are reviewed on their technical merit. Disagreements are resolved through discussion, not dismissal. If you have concerns, reach out via GitHub Issues.

---

## License

By contributing, you agree that your contribution will be licensed under Apache 2.0, the same license as the rest of the project.

---

## Large files

NullToHero imposes a **500 KB** per-file soft limit tracked by `tests/validate.js` (Check 12). A warning fires for any file in `tools/` that exceeds this threshold.

The one current exception is `tools/design-system/data/google-fonts.csv` (~745 KB), which predates this limit and is kept for font-lookup coverage. Do not add new files of comparable size without first opening an issue to discuss alternatives (compression, release asset, external download).

If you need to add a large dataset:

1. Open an issue explaining the use case and size.
2. Consider a `tools/download-*.mjs` script that fetches the file from a GitHub release asset on demand instead of committing it.
3. Do not commit files over 5 MB — GitHub will reject them and the PR will be stuck.

`node tests/validate.js` warns on files above 500 KB but does not fail CI, to avoid breaking the google-fonts exception. Treat the warning as a prompt to discuss before merging.

