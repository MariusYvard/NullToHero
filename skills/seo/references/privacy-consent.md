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

## Third-party cookies and embeds

A YouTube embed, a map or a social widget sets third-party cookies on load. Use a click-to-load placeholder or a privacy variant (for example the no-cookie embed domain) so nothing tracks the visitor until they engage.

## Right to erasure and access

Users can request their data or its deletion (GDPR Articles 15 and 17). The site needs a reachable route to act on that, and a retention policy that deletes data when its purpose ends.

## Privacy policy

Publish a policy that names what is collected, why, the legal basis, the retention period and the contact for a request. Link it from the footer and from every form that collects personal data.
