---
name: privacy-consent
description: "Privacy and consent posture for EU-facing sites: data minimisation, cookie consent, right to erasure, third-party cookies and a privacy policy."
version: 1.22.0
---

# Privacy and consent

A page that serves European users carries legal obligations under the GDPR and the ePrivacy rules. These are not visible in a Lighthouse score, so they need their own pass.

## Data minimisation

Collect only the fields a task needs (GDPR Article 5). An email signup needs an email, not a phone number and a date of birth. Every extra field is data to secure, justify and eventually delete.

## Cookie and tracker consent

Non-essential cookies and trackers (analytics, ads, embeds) require prior, informed, opt-in consent. Load them only after consent, not on page load with a banner that merely announces them.

Signals of a compliant setup:
- no analytics or marketing script fires before a consent choice,
- a genuine reject path that is as easy as accept,
- essential cookies (session, security) documented as exempt.

The deterministic pass reads this from the served HTML: the `consent-required-tracker` check names every tag that runs on load without a consent mechanism, and does not flag measurement that can meet the exemption below.

### The exemption is the cheaper answer than the banner

Most sites reach for a consent platform when the actual requirement is analytics they do not need consent for. Audience measurement can be exempt from consent, and the conditions are published rather than a matter of interpretation. The CNIL states them as: a purpose strictly limited to measuring the audience of the site (performance, navigation problems, technical optimisation, server sizing), anonymous statistics only, for the publisher alone, with no cross-referencing against other processing, no transmission of non-anonymous data to a third party, and no tracking of the visitor across other sites or applications. Recommended lifespans are 13 months for the tracker and 25 months for the data ([CNIL, updated 4 July 2025](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience), legal basis article 82 of the loi Informatique et Libertés).

What that changes for a build: a site whose only tracker is exempt measurement needs no consent banner at all. The banner disappears, and with it the reject-path design work, the consent log, and the layout shift the banner caused. Tools built for this exist (Plausible, Fathom, Umami, GoatCounter, Simple Analytics, Matomo configured without cookies); which one matters less than the audit of the conditions above, since the exemption follows what the tool does, not its name. Verify the configuration rather than the marketing page: the same product can be exempt in one setup and not in another.

The exemption does not cover advertising, remarketing, A/B testing tied to an identifier, session replay or heatmaps. Those need consent whatever the vendor claims.

## Third-party cookies and embeds

A YouTube embed, a map or a social widget sets third-party cookies on load. Use a click-to-load placeholder or a privacy variant (for example the no-cookie embed domain) so nothing tracks the visitor until they engage.

## Right to erasure and access

Users can request their data or its deletion (GDPR Articles 15 and 17). The site needs a reachable route to act on that, and a retention policy that deletes data when its purpose ends.

## Privacy policy

Publish a policy that names what is collected, why, the legal basis, the retention period and the contact for a request. Link it from the footer and from every form that collects personal data.
