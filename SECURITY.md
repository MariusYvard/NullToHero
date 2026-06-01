# Security Policy

## Supported versions

The latest released version of NullToHero receives security fixes. Older tags do not.

| Version | Supported |
|---------|-----------|
| 1.8.x   | Yes       |
| < 1.8   | No        |

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
