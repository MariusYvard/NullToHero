# Security Policy

## Supported versions

The latest released version of NullToHero receives security fixes. Older tags do not.

| Version | Supported |
|---------|-----------|
| 2.1.x   | Yes       |
| < 1.13  | No        |

## Reporting a vulnerability

Report suspected vulnerabilities privately. Do not open a public issue for a security report.

- Preferred: open a private advisory via GitHub Security Advisories on this repository (Security tab, "Report a vulnerability").
- Alternative: email mariusyvard72@gmail.com with the subject "NullToHero security".

Include the affected version, a description, reproduction steps, and the impact you observed. You can expect an acknowledgement within a few days.

## Scope and trust model

NullToHero is a Claude Code plugin made of Markdown skills plus a few local Node and Python helper scripts. Points worth knowing:

- The `/siteasy live` helper is a local HTTP and SSE daemon. It binds to `127.0.0.1` only, authenticates requests with a per-session token, scopes CORS to localhost origins, confines file writes to the project root, and caps request bodies and poll timeouts.
- `/inspect preview` and `parallax-audit.mjs` drive Playwright (Chromium) over local files and URLs you pass in.
- `/inspect detect` and `/inspect review` may invoke the third-party `impeccable` CLI via `npx`.
- The installers clone this repository, pinned to the matching release tag, into `~/.claude/plugins`.

Run the plugin only on projects you trust, and keep a running `/siteasy live` session closed when you are not actively using it.

## Agent security model

The `/audit` orchestrator and the 14 audit sub-agents follow least agency and a
read/write split. The rationale is in docs/ARCHITECTURE.md; the policy is:

- Least agency. Every sub-agent declares only read-only tools (Read, Grep, Glob,
  WebFetch). None can write a file, edit, run a shell or dispatch another agent.
  `tests/validate.js` fails the build if a sub-agent adds a write-class tool.
- Read/write separation. Sub-agents read (web and local files); only the
  supervisor writes the two output files. An agent influenced through its input
  cannot reach a write tool because it holds none.
- Untrusted input. Fetched page content (HTML, scripts, comments, metadata, copy)
  is data to analyze, never instructions to follow. Every sub-agent carries a Trust
  boundary block to that effect, and `tests/validate.js` checks the block is present
  in all 14. A page that tries to direct agent behavior is reported as a finding,
  not obeyed.
- Multi-hop injection. Passing an injection through an intermediate agent does not
  make it safe; an intermediate can strip the markers that made a payload look
  hostile and forward it cleaner. The structural defense is the read/write split: a
  followed instruction has no write tool to reach.
- No secrets in the repository. Secret scanning and push protection stay enabled.
  No token, key or credential is committed; report any exposure through the process
  above.

Reference: the OWASP guidance on AI agent security and agentic application risks.

