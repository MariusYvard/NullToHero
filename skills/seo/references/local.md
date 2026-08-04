---
name: seo-local
description: >
  Local SEO analysis for brick-and-mortar, service area businesses (SAB), and
  multi-location businesses. Google Business Profile, NAP consistency, citations,
  reviews, local schema, location page quality. Use for: "local SEO", "Google
  Business Profile", "GBP", "NAP", "citations", "local rankings", "map pack",
  "near me", "local business", "Google Maps".
version: 1.8.1
---

# Local SEO Analysis

## Business types covered

- **Brick-and-mortar** — physical storefront customers visit (restaurant, salon, shop)
- **Service Area Business (SAB)** — travels to customers, no public address (plumber, cleaner)
- **Multi-location** — same brand with multiple physical addresses
- **Hybrid** — serves both in-store and service area customers

---

## Audit Dimensions

### 1. Google Business Profile (GBP)

Google Business Profile is the single most impactful local SEO factor. Analyze the profile at `google.com/maps/search/[business+name+city]`.

**Completeness checklist:**
- [ ] Business name matches the real-world signage exactly (no keyword stuffing)
- [ ] Category: primary category is the most specific match available
- [ ] Secondary categories added (up to 9 additional)
- [ ] Address accurate and consistent with website
- [ ] Phone number: local area code preferred over toll-free for local signals
- [ ] Website URL pointing to the correct page (homepage or location-specific page)
- [ ] Hours of operation complete, including holidays
- [ ] Business description: 750 chars max, includes primary keyword naturally in first 250 chars
- [ ] Photos: minimum 10 photos (exterior, interior, products/services, team)
- [ ] Services/Products section populated
- [ ] Attributes relevant to business type selected (wheelchair accessible, outdoor seating, etc.)
- [ ] Questions & Answers: seed with common questions and answers

**GBP signals that impact Map Pack ranking:**
- Relevance: how well the profile matches the search query
- Distance: proximity of business to searcher or searched location
- Prominence: how well-known the business is (reviews, citations, links)

### 2. NAP Consistency (Name, Address, Phone)

**NAP must be identical across all platforms.** Even minor variations ("St" vs "Street", "+1" vs local format) weaken local signals.

**Check consistency across:**
- Website (footer, contact page, LocalBusiness schema)
- Google Business Profile
- Facebook Business Page
- Yelp
- Apple Maps
- Bing Places
- Yellow Pages / industry directories
- Chamber of Commerce listings

**Common inconsistencies to flag:**
- Street abbreviation variations (Ave / Avenue / Av)
- Suite/unit format differences (#101 vs Suite 101)
- Phone format inconsistencies (+1-555-555-5555 vs (555) 555-5555)
- Old address not fully removed from directories
- DBA vs legal name confusion

### 3. Reviews

Reviews are a major local ranking factor AND conversion signal.

**Metrics to assess:**
- Review count (Google, Yelp, industry-specific platforms)
- Average rating (Google My Business: 4.0+ is the floor for Map Pack)
- Review recency (Google weights recent reviews heavily)
- Response rate and response quality
- Review diversity across platforms

**Review velocity: what's healthy**

| Business type | Target monthly cadence |
|---------------|----------------------|
| Restaurant | 10–20+ reviews/month |
| Service business | 2–5 reviews/month |
| Retail | 5–10 reviews/month |
| Professional services | 1–3 reviews/month |

**Review response analysis:**
- Responding to all reviews (especially negative) is a ranking and trust signal
- Flag: no responses to negative reviews (reputation risk + missed signal)
- Flag: copy-pasted responses to all reviews (low quality signal)

### 4. Local Citations

Citations are any mention of the business NAP data on the web. They remain a local ranking signal even without backlinks.

**Tier 1 citations (highest authority):**
Google Business Profile, Apple Maps, Bing Places, Facebook, Yelp, Yellow Pages, BBB

**Tier 2 citations (industry/regional):**
TripAdvisor (hospitality), Houzz (home services), Healthgrades (healthcare), Avvo (legal), Angi (contractors), Justdial (India), etc.

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

**URL structure:**
```
/locations/city-name/
/cities/city-state/
/service-area/city-name/
```

### 6. On-Site Local Signals

**Homepage and contact page:**
- NAP in footer on every page (consistent with GBP)
- Embedded Google Maps on contact page
- `LocalBusiness` schema with complete data
- `sameAs` linking to all major profile URLs (GBP, Facebook, Yelp)

**Title tags for local pages:**
`[Primary Service] in [City, State] | [Brand Name]`

**Meta descriptions:**
Include city name, phone number or a local call-to-action.

**Content signals:**
- Mention neighborhood names, landmarks, local events
- Local team/staff pages
- Local case studies, testimonials, press mentions

### 7. LocalBusiness Schema

Generate or validate schema for the business. See `/seo schema` for full templates.

**Required properties for Map Pack eligibility:**
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Business Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street",
    "addressLocality": "City",
    "addressRegion": "ST",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "telephone": "+1-555-555-5555",
  "url": "https://example.com",
  "openingHoursSpecification": [...],
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "sameAs": [
    "https://maps.google.com/?cid=...",
    "https://www.facebook.com/...",
    "https://www.yelp.com/biz/..."
  ]
}
```

**Use the most specific `@type` available:**
`Restaurant`, `MedicalClinic`, `LegalService`, `HomeAndConstructionBusiness`, `BeautySalon`, etc. They inherit all LocalBusiness properties.

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

### GBP Audit
- Completeness: XX%
- Missing/incomplete fields: [list]
- Photo count: X (target: 10+)

### NAP Consistency
- Inconsistencies found: X
- Platforms checked: [list]
- Priority fixes: [list]

### Reviews
- Google rating: X.X (X reviews)
- Review recency: last review X days ago
- Response rate: XX%

### Citation Coverage
- Tier 1 citations: X/7
- Tier 2 citations: X relevant platforms
- Inconsistencies: X

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
