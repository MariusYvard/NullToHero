---
name: ship-checklist
description: "A pre-launch checklist for a static site. The quality gates to clear before deploy, the deploy steps themselves, and the post-launch verification and rollback trigger."
version: 1.28.0
---

# Ship Checklist

A build that looks finished is not a build that is ready to ship. This is the gate between the two. Run it before every deploy. It is deliberately boring; that is the point.

This complements `harden` (production robustness) and `optimize` (performance). Those make the site ready; this confirms it before it goes live.

## Before deploy

Quality gates, all of which must pass:

- [ ] `/inspect detect` and `/inspect review` are clean of CRITICAL and HIGH findings, or each remaining one is a conscious, recorded decision.
- [ ] `/inspect preview` has been viewed at mobile and desktop widths; nothing is clipped or overflowing at 375px.
- [ ] Every internal link resolves; no link points to a staging or localhost URL.
- [ ] A real 404 page exists and is styled, and the host is configured to serve it.
- [ ] Redirects for any moved or renamed URL are in place, so old links do not break.
- [ ] `sitemap.xml` and `robots.txt` exist, agree with each other, and do not accidentally `Disallow: /` or `noindex` the live site.
- [ ] Open Graph and Twitter Card tags are present with a real `og:image`; the canonical URL is the production one.
- [ ] Favicons and an Apple touch icon are set; the title and meta description are final, not placeholders.
- [ ] Forms submit to the right endpoint, validate, and show success and error states. No `John Doe` or `Acme` placeholder content remains.
- [ ] Analytics or consent banners, if used, fire only after consent and do not block render.
- [ ] No credit line to the toolkit or its author sits on the site unless the owner asked for one (see craft.md). It is off by default; shipping one they did not request is the defect this line checks for.

## Deploy

- [ ] Deploy to a preview or staging URL first, never straight to production for a first release.
- [ ] Smoke-test the preview: load the home page, follow the primary user flow end to end, submit one form.
- [ ] Confirm the build output is the intended one (right branch, right commit, no stray debug build).
- [ ] Promote to production.
- [ ] If the site is meant to be indexed, ping the search engines: submit the sitemap and, where supported, send the changed URLs to IndexNow ([/seo indexnow](../../seo/references/indexnow.md)).

## After deploy

- [ ] Load the production URL fresh (in a private window, to dodge cache) and re-run the primary flow.
- [ ] Re-check Core Web Vitals on the live URL; a deploy can regress LCP or CLS that looked fine locally.
- [ ] Verify the form actually delivers, end to end, to its real destination.
- [ ] Confirm the canonical, the Open Graph preview, and the favicon render correctly when the URL is shared.
- [ ] Watch error and uptime signals for the first window after launch.

## Rollback

Decide the trigger before you need it.

- The rollback condition is written down in advance: for example a broken primary flow, a 5xx rate above a set threshold, or a Core Web Vitals regression past a set point.
- The rollback path is known and fast: redeploy the previous build, or revert the deploy. A static host makes this a one-click or one-command step.
- A rollback is not a failure. Shipping a broken site and leaving it up is.

## Domain, HTTPS and headers

- [ ] The custom domain resolves and serves the site; www and the apex agree on one canonical host, one redirecting to the other.
- [ ] HTTPS is enforced: an http request redirects to https, and no page loads a mixed-content http asset.
- [ ] Baseline response headers are set where the host allows: X-Content-Type-Options nosniff, a sane Referrer-Policy, and a Content-Security-Policy if the site can adopt one without breaking.
- [ ] Caching is sane: long lifetimes on fingerprinted assets, short or revalidated on HTML.
- [ ] The TLS certificate is valid and auto-renewing, not a one-time cert about to expire.

## What this does not replace

This checklist confirms readiness, not quality. Run `/audit` for the scored health check and `/inspect` for defects before you reach this gate. A site can pass every box here and still be slow or hard to use. Ship readiness and ship quality are different questions.

## One-line summary

Clean inspect, working links, real 404 and redirects, honest sitemap and robots, final meta and OG, tested forms, preview before production, verify live, know the rollback.
