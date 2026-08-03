---
name: seo-schema
description: >
  Schema.org structured data detection, validation, and generation. JSON-LD
  format. Use for: "schema markup", "structured data", "rich results", "JSON-
  LD", "FAQ schema", "Article schema", "Product schema", "LocalBusiness schema",
  "HowTo schema", "schema errors".
version: 1.9.0
---

# Schema Markup Analysis & Generation

## Detection

1. Scan page source for JSON-LD `<script type="application/ld+json">`
2. Check for Microdata (`itemscope`, `itemprop`)
3. Check for RDFa (`typeof`, `property`)
4. Always recommend JSON-LD as primary format (Google's stated preference)

## Validation

- Check required properties per schema type
- Validate against Google's supported rich result types
- Test for common errors:
  - Missing @context
  - Invalid @type
  - Wrong data types
  - Placeholder text
  - Relative URLs (should be absolute)
  - Invalid date formats
- Flag deprecated types (see below)

## Schema Type Status (as of June 2026)

*Statuses change as Google updates its rich results support. Re-verify dated retirements against Google Search Central before quoting them.*

### ACTIVE (recommend freely):
Organization, LocalBusiness, SoftwareApplication, WebApplication, Product (with Certification markup as of April 2025), ProductGroup, Offer, Service, Article, BlogPosting, NewsArticle, Review, AggregateRating, BreadcrumbList, WebSite, WebPage, Person, ProfilePage, ContactPage, VideoObject, ImageObject, Event, JobPosting, Course, DiscussionForumPosting

### VIDEO & SPECIALIZED (recommend freely):
BroadcastEvent, Clip, SeekToAction, SoftwareSourceCode


> **JSON-LD and JavaScript rendering:** Google supports generating JSON-LD with JavaScript and injecting it into the page, but JS-injected markup is only visible once the page is rendered, and a page "may stay on this queue for a few seconds, but it can take longer than that" ([Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)). For time-sensitive markup (especially Product, Offer), include JSON-LD in the initial server-rendered HTML.

### DEPRECATED (never recommend):
- **FAQ**: Rich result deprecated, no longer shown in Search from May 7, 2026 ([Google Search Central, 2026](https://developers.google.com/search/updates#deprecating-the-faq-rich-result-feature)). Previously restricted to well-known authoritative government and health sites in Aug 2023 ([Google Search Central, 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes))
- **HowTo**: Rich results limited to desktop in Aug 2023, then dropped from desktop as of September 13, 2023, which deprecated the type ([Google Search Central, 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes))
- **SpecialAnnouncement**: Deprecated July 31, 2025
- **CourseInfo, EstimatedSalary, LearningVideo**: Retired June 2025
- **ClaimReview**: Retired from rich results June 2025
- **VehicleListing**: Retired from rich results June 2025
- **Practice Problem**: Retired from rich results late 2025
- **Dataset**: Retired from rich results late 2025
- **Book Actions**: Deprecated then reversed, still functional as of June 2026 (historical note)

## Generation

When generating schema for a page:
1. Identify page type from content analysis
2. Select appropriate schema type(s)
3. Generate valid JSON-LD with all required + recommended properties
4. Include only truthful, verifiable data. Use placeholders clearly marked for user to fill
5. Validate output before presenting

## Common Schema Templates

### Organization
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Company Name]",
  "url": "[Website URL]",
  "logo": "[Logo URL]",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "[Phone]",
    "contactType": "customer service"
  },
  "sameAs": [
    "[Facebook URL]",
    "[LinkedIn URL]",
    "[Twitter URL]"
  ]
}
```

### LocalBusiness
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[Business Name]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Street]",
    "addressLocality": "[City]",
    "addressRegion": "[State]",
    "postalCode": "[ZIP]",
    "addressCountry": "US"
  },
  "telephone": "[Phone]",
  "openingHours": "Mo-Fr 09:00-17:00",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[Lat]",
    "longitude": "[Long]"
  }
}
```

### Article/BlogPosting
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[Title]",
  "author": {
    "@type": "Person",
    "name": "[Author Name]"
  },
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD]",
  "image": "[Image URL]",
  "publisher": {
    "@type": "Organization",
    "name": "[Publisher]",
    "logo": {
      "@type": "ImageObject",
      "url": "[Logo URL]"
    }
  }
}
```

## Entity properties that AI answer engines read

`sameAs` is the property that lets a model tie a page to a known entity instead of
guessing. Publish it in priority order, highest-signal first: Wikipedia, Wikidata,
LinkedIn, YouTube, X, Facebook, Crunchbase, GitHub, Google Scholar, ORCID, Instagram,
app store listings, sector directories.

Graded, because two links and twelve links are not the same claim:

| Platforms in `sameAs` | Reading |
|------|---------|
| 1 to 2 | Present but thin |
| 3 to 4 | A resolvable entity |
| 5 or more including Wikipedia | Strong, and the ceiling worth aiming for |

Audit every entry rather than counting them: each URL must resolve with a 200 (not a
404, not a redirect to a homepage), and the name, description and founding date must
agree across the platforms. Inconsistent attributes across profiles are worse than
fewer profiles, since they give a model contradictory evidence.

`knowsAbout` on `Organization` or `Person` carries topical scope. It earns its place
when it names at least three subjects the entity demonstrably covers.

`speakable` (`SpeakableSpecification`) is the only schema.org markup that explicitly
designates passages meant to be read aloud by an assistant. It takes CSS selectors:

```json
"speakable": {
  "@type": "SpeakableSpecification",
  "cssSelector": [".article-summary", ".key-takeaway"]
}
```

Point it at the passages that answer the page's question directly. Pointing it at
whole articles defeats the purpose.

See [geo.md](geo.md) for entity disambiguation, which is upstream of all of this: none
of these properties helps while several organisations share the brand name.

## Output

- `SCHEMA-REPORT.md`: detection and validation results
- `generated-schema.json`: ready-to-use JSON-LD snippets

### Validation Results
| Schema | Type | Status | Issues |
|--------|------|--------|--------|
| ... | ... | ✅/⚠️/❌ | ... |

### Recommendations
- Missing schema opportunities
- Validation fixes needed
- Generated code for implementation

## Error Handling

| Scenario | Action |
|----------|--------|
| URL unreachable | Report connection error with status code. Suggest verifying URL and checking if the page requires authentication. |
| No schema markup found | Report that no JSON-LD, Microdata, or RDFa was detected. Recommend appropriate schema types based on page content analysis. |
| Invalid JSON-LD syntax | Parse and report specific syntax errors (missing brackets, trailing commas, unquoted keys). Provide corrected JSON-LD output. |
| Deprecated schema type detected | Flag the deprecated type with its retirement date. Recommend the current replacement type or advise removal if no replacement exists. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|---------------|-------|
| Full SEO audit | `/seo audit` |
| Technical audit | `/seo technical` |
| Schema for local business pages | `/seo local` |
| ImageObject schema | `/seo images` |
| Live structured data analysis | (not included) |
| Schema on web pages | `/siteasy build` |
| Comparison page schema | `/seo competitor-pages` |
