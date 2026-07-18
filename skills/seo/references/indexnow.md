---
name: indexnow
description: "Instant-indexing pings: notify Bing, Yandex, Naver, Seznam and Yep the moment a URL is published, updated, redirected or gone. Key setup, single and batch submission, sitemap mode, and where it fits next to sitemaps and Google."
version: 1.0.0
---

# IndexNow

IndexNow is a shared protocol: ping one participating engine when a URL changes
and it propagates to all of them. Participants (2026): Microsoft Bing, Yandex,
Naver, Seznam.cz and Yep. Google does NOT support it (tested since 2021, never
adopted): the Google path remains sitemaps plus Search Console, so IndexNow
complements [sitemap.md](sitemap.md), never replaces it.

Why it still matters beyond Bing's own search share: Bing's index feeds the AI
answer surfaces (ChatGPT search, Copilot). Being indexed there within minutes
instead of days is a GEO lever — see [geo.md](geo.md). The tooling lives in
[../scripts/indexnow.mjs](../scripts/indexnow.mjs).

## Setup (once per site)

1. Generate a key: `node skills/seo/scripts/indexnow.mjs key` (a 32-char hex string).
2. Host the key file at `https://<host>/<key>.txt`, containing exactly the key.
   Commit it with the site so every deploy keeps serving it. Alternative: host it
   anywhere and pass `keyLocation` with each submission.
3. Verify it serves with a plain 200 (no redirect, no HTML error page).

## Submitting

- One URL: a simple GET — `https://api.indexnow.org/indexnow?url=<url>&key=<key>`.
- Many URLs: POST JSON `{ host, key, urlList: [...] }` to `api.indexnow.org/indexnow`
  (up to 10,000 per call). One call, all engines.
- From the sitemap: `indexnow.mjs sitemap <sitemap-url> --key <key>` extracts the
  `<loc>` entries and submits the batch (`--limit` to cap it).

Responses, honestly read: `200`/`202` accepted (202 means accepted, verification
pending — normal). `403` the key file does not match. `422` URLs do not belong to
the host. `429` you are spamming; back off.

## When to ping (and when not to)

Ping on real change: a page published, meaningfully updated, newly redirected
(301) or gone (410). Do not re-submit unchanged URLs on every deploy, do not ping
on a schedule, and never submit URLs you noindex — repeated noise gets a host
throttled (429) and wastes the fast lane.

Wiring: a post-deploy CI step submitting the URLs that changed in the release is
the clean setup. On manual deploys (a drag-and-drop to static hosting), one GET
per changed URL from the terminal does the same job. The [journey-ship](../../siteasy/references/journey-ship.md)
hardening stage includes this ping for content and brand sites.

## Cross-References

- Sitemaps (the Google path, still mandatory): [sitemap.md](sitemap.md)
- Crawlability fundamentals: [technical.md](technical.md)
- AI-answer visibility, where the Bing index pays off: [geo.md](geo.md)
