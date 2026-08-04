---
name: seo-local
description: >
  Local SEO analysis for brick-and-mortar, service area businesses (SAB), and
  multi-location businesses. Google Business Profile, NAP consistency, citations,
  reviews, local schema, location page quality. Use for: "local SEO", "Google
  Business Profile", "GBP", "NAP", "citations", "local rankings", "map pack",
  "near me", "local business", "Google Maps".
version: 1.8.2
---

# Local SEO Analysis

Establish the business type first. A service area business (SAB) travels to customers and publishes
no address, so an absent address is correct for a SAB and a defect for a storefront, a multi-location
brand or a hybrid. That distinction conditions every later finding.

---

## Audit Dimensions

### 1. Google Business Profile (GBP)

Google Business Profile is the single most impactful local SEO factor. Analyze the profile at `google.com/maps/search/[business+name+city]`.

**Completeness checklist:**
- [ ] Business name matches the real-world signage exactly (no keyword stuffing)
- [ ] Category: primary category is the most specific match available
- [ ] Phone number: local area code preferred over toll-free for local signals
- [ ] Hours of operation complete, including holidays
- [ ] Photos: minimum 10 photos (exterior, interior, products/services, team)
- [ ] The rest of the profile filled in and consistent with the site: address, website URL, description, services, attributes, Q&A

### 2. NAP Consistency (Name, Address, Phone)

**NAP must be identical across all platforms.** Even minor variations ("St" vs "Street", "+1" vs local format) weaken local signals.

**Check consistency across** the site (footer, contact page, LocalBusiness schema), the GBP listing and every directory carrying the business, Apple Maps and Bing Places included: those two get forgotten far more often than Yelp or Facebook.

**Common inconsistencies to flag:**
- Street abbreviation variations (Ave / Avenue / Av)
- Suite/unit format differences (#101 vs Suite 101)
- Phone format inconsistencies (+1-555-555-5555 vs (555) 555-5555)
- Old address not fully removed from directories
- DBA vs legal name confusion

### 3. Reviews

Reviews are a major local ranking factor AND conversion signal.

**Metrics to assess:** count, recency, response rate, average rating on Google Business Profile and on the industry platforms, and review diversity across platforms. No public Google documentation sets a minimum rating for Map Pack inclusion, so read the average against local competitors and never quote a floor as a published threshold.

Judge the count as a monthly flow and not as a lifetime total, calibrated to the business type: a restaurant gaining two reviews a month is stalling, a professional services firm at that cadence is healthy.

**Review response analysis:**
- Responding to all reviews (especially negative) is a ranking and trust signal
- Flag: no responses to negative reviews (reputation risk + missed signal)
- Flag: copy-pasted responses to all reviews (low quality signal)

### 4. Local Citations

Citations are any mention of the business NAP data on the web. They remain a local ranking signal even without backlinks.

Two tiers, and the tier drives the correction order: tier 1 is the general-purpose directories
every business belongs in, tier 2 the industry or regional ones. Tier 1 is fixed first.

**Citation audit process:**
1. Search Google for `"business name" "city" "phone number"` and `"business name" "city" "address"`
2. Check Moz Local, BrightLocal, or Whitespark for citation coverage
3. Identify inconsistent/duplicate/missing citations

**Recommendations:**
- Fix inconsistencies (priority order: Tier 1 → Tier 2)
- Suppress duplicates on major platforms
- Build missing citations on relevant Tier 2 directories

### 5. Location Pages (Multi-location / SAB)

Each location should have a dedicated, unique page. Generic templates with only the city name swapped are thin content.

**Quality gates (`L-PROG-2`):**
- Warning at 30+ location pages without strong unique content strategy
- Hard stop at 50+ location pages without an audit for thin content

These bite earlier than the generic programmatic gates of `L-PROG-1`, on purpose. A set of city-templated
pages is the textbook doorway pattern, so the same page count carries more risk here than it does on a
feature or integration set.

**Location page requirements:**
- Unique H1 including city/neighborhood: "Plumber in [City], [State]"
- Unique descriptive content at the `L-WORD-1` floor for a location page, not templated
- Embedded Google Maps with the GBP location pinned
- Local phone number (not a national number)
- Schema: LocalBusiness with geo coordinates
- Unique photos of the location or local team
- Local testimonials/reviews
- Local service area description (for SABs)
- Internal links from and to other location pages

### 6. On-Site Local Signals

**Homepage and contact page:**
- NAP in footer on every page (consistent with GBP)
- Embedded Google Maps on contact page
- `LocalBusiness` schema with complete data
- `sameAs` linking to all major profile URLs (GBP, Facebook, Yelp)

### 7. LocalBusiness Schema

Generate or validate schema for the business. See `/seo schema` for full templates.

Markup does not create Map Pack eligibility, which is settled on the GBP listing itself; what it buys is a machine-readable identity. Two properties are worth checking by hand because a generated block rarely emits them: `sameAs` has to carry the Google Maps listing URL in its `https://maps.google.com/?cid=...` form next to the Facebook and Yelp profiles, since that URL is what binds the page to the listing rather than to a matching name.

The second is the `geo` (GeoCoordinates) and `openingHoursSpecification` pair: coordinates without hours, or hours left as footer prose, leaves the listing half-readable. Use the most specific `@type` available rather than plain `LocalBusiness`; the subtypes inherit every LocalBusiness property.

---

## Local SEO Scoring

| Factor | Weight |
|--------|--------|
| GBP completeness and accuracy | 25% |
| Reviews (count, rating, recency, responses) | 20% |
| NAP consistency | 20% |
| On-site local signals (schema, content, structure) | 20% |
| Citations | 15% |

---

## Output

### Local SEO Score: XX/100

### Location Page Quality (if applicable)
| Location | Word Count | Schema | Maps | Local Content |
|----------|-----------|--------|------|---------------|
| ... | ... | ✅/❌ | ✅/❌ | ✅/❌ |

### Action Plan (priority order)

---

## Error Handling

| Scenario | Action |
|----------|--------|
| GBP profile not found | Recommend claiming or creating the profile. Provide exact setup steps for the business type. |
| SAB with no public address | Confirm this is intentional (SABs should hide their address on GBP). Assess service area configuration instead. |
| Duplicate GBP listings | Flag as critical — duplicate listings split ranking signals and confuse users. Provide instructions to merge/request removal. |
| No local schema found | Generate appropriate LocalBusiness schema based on business type and available data. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| LocalBusiness schema generation | `/seo schema` |
| Full technical audit | `/seo technical` |
| Content quality for location pages | `/seo content` |
| Multi-location sitemap | `/seo sitemap` |
| Full site audit | `/seo audit` |
