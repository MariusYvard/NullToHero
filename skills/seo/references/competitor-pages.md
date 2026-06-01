---
name: seo-competitor-pages
description: >
  Generate SEO-optimized competitor comparison and alternatives pages. Covers
  "X vs Y" layouts, alternatives pages, feature matrices, schema markup, and FAQ
  sections. Use for: "vs page", "competitor comparison", "alternatives to X",
  "comparison page", "competitor landing page", "X vs Y", "best alternatives".
version: 1.8.1
---

# Competitor Comparison Page Generator

## Page types covered

| Type | Query intent | Example URL |
|------|-------------|-------------|
| Direct comparison | "[Product A] vs [Product B]" | `/[product-a]-vs-[product-b]/` |
| Alternatives page | "alternatives to [Product]" / "best [Product] alternatives" | `/alternatives-to-[product]/` |
| Category comparison | "best [tools] for [use case]" | `/best-[tools]-for-[use-case]/` |
| Switching guide | "[Competitor] to [Your Product] migration" | `/migrate-from-[competitor]/` |

---

## Audit Mode (`competitor-pages [url]`)

Analyze existing comparison or alternatives pages for:

**Content quality:**
- Genuine, accurate competitor information (not obviously biased)
- Feature matrix with real, verifiable data points
- Pricing information (current, with date noted)
- Use case differentiation (who each tool is actually best for)
- Cons listed for your own product (builds trust)
- Social proof: reviews, ratings, case studies

**SEO signals:**
- Target keyword in title tag, H1, and URL
- Keyword variants covered: "vs", "alternative", "compare", "comparison", "review"
- Internal links from relevant product/feature pages
- Schema: FAQPage, Product, Review, AggregateRating

**Conversion optimization:**
- CTA placement (above fold, after comparison table, at end)
- CTA specificity (trial, demo, pricing page vs generic "sign up")
- Risk reversal near CTAs (free trial, no credit card, money-back guarantee)
- Objection handling in FAQ

**Fairness and accuracy:**
- Flag: factually incorrect competitor information (legal risk)
- Flag: misleading feature comparisons (checking own box vs competitor's missing)
- Recommendation: include a "last updated" date on all pricing/feature data

---

## Generation Mode

### Step 1 — Gather competitive intelligence

Before writing, collect accurate data on each competitor:

For each competitor, document:
- Official pricing (from their pricing page, with date)
- Core features (from feature list or product docs)
- Target customer (from their homepage messaging)
- Main limitations (from negative reviews on G2, Capterra, Reddit)
- Recent changes (funding, acquisitions, deprecated features)

**Sources to check:**
- Competitor's own website (pricing, features, use cases)
- G2, Capterra, Trustpilot (review data and ratings)
- Reddit discussions (r/[category], user candid opinions)
- Product Hunt comments
- Twitter/X mentions

### Step 2 — Structure the page

**Standard "X vs Y" page structure:**

```
H1: [Product A] vs [Product B]: [Year] Comparison
Intro (100-150 words): Who this page is for, what you'll learn

Section 1: Quick comparison table
  - Side-by-side feature matrix (5–10 key factors)
  - Ratings from G2/Capterra if available
  - Pricing comparison

Section 2: [Product A] overview
  - What it is, who it's for
  - Key strengths (3-4)
  - Key limitations (2-3, be honest)
  - Best for: [specific use cases]
  - Pricing summary

Section 3: [Product B] overview
  - Same structure

Section 4: Detailed comparison by category
  - Category 1 (e.g., Ease of use): Head-to-head
  - Category 2 (e.g., Pricing): Head-to-head
  - Category 3 (e.g., Integrations): Head-to-head

Section 5: Who should choose which?
  - Choose [A] if: [specific conditions]
  - Choose [B] if: [specific conditions]

Section 6: FAQ (5–8 questions)
  - "Is [Product A] better than [Product B]?"
  - "Which is cheaper, [A] or [B]?"
  - "Does [B] have [feature X]?"

CTA section: Try [Your Product] free / See [Your Product] pricing

Footer note: "Last updated: [Month Year]. Pricing and features subject to change."
```

**Alternatives page structure:**

```
H1: [X] Best [Product] Alternatives in [Year]
Intro: Why people look for alternatives (3 common reasons), what this list covers

For each alternative (structured consistently):
  - H2: [Alternative Name] — [2-word positioning]
  - What it is (1 sentence)
  - Best for (1 sentence)
  - Key features (3–5 bullets)
  - Pricing (specific numbers)
  - Pros (3) / Cons (3)
  - G2 / Capterra rating if available
  - Link to full review or official site

Comparison table: all alternatives side by side

CTA: [Your Product] as alternative

FAQ (4–6 questions)
```

### Step 3 — Feature matrix

Feature matrices are the highest-value element for comparison pages. They must be:
- Truthful: only check boxes that genuinely exist in the product
- Specific: "Advanced reporting with custom dashboards" not just "Reporting"
- Verifiable: every claim checkable from official docs or reliable reviews

```html
<!-- Accessible table structure -->
<table>
  <caption>Feature Comparison: [Product A] vs [Product B]</caption>
  <thead>
    <tr>
      <th scope="col">Feature</th>
      <th scope="col">[Product A]</th>
      <th scope="col">[Product B]</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Free plan</td>
      <td>✅ Up to 3 users</td>
      <td>❌ No free plan</td>
    </tr>
  </tbody>
</table>
```

### Step 4 — Schema markup

**For the comparison page itself:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "[Product A] vs [Product B]: 2026 Comparison",
  "dateModified": "2026-01-15",
  "description": "Detailed comparison of [A] and [B], covering pricing, features, and use cases.",
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [...]
  }
}
```

**FAQPage schema for the FAQ section:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is [Product A] better than [Product B]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It depends on your use case..."
      }
    }
  ]
}
```

Note: FAQPage schema is restricted to government and healthcare authority sites on Google Search. It still provides value for other AI platforms (ChatGPT, Perplexity) that use it for citation.

**Product schema for review aggregation:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[Product A]",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "1250",
    "bestRating": "5",
    "worstRating": "1"
  }
}
```

### Step 5 — Internal linking

Comparison pages capture high-intent bottom-of-funnel traffic. Link to them from:
- Product/feature pages ("See how we compare to [Competitor]")
- Blog posts covering the same category
- Pricing page ("Switching from [Competitor]?")

And link out to:
- Your product's own feature pages
- Pricing page
- Case studies relevant to the comparison context

---

## Output

### Audit Report
- Comparison page quality score: XX/100
- Missing elements: [list]
- Inaccurate data points to fix: [list]
- Schema status: present/missing/invalid

### Generated Page
Full HTML page with:
- Complete copy following the appropriate structure
- Feature matrix (markdown table or HTML)
- FAQPage JSON-LD
- Product JSON-LD for ratings
- SEO metadata (title tag, meta description)
- CTA placement recommendations

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Cannot verify competitor pricing | Use publicly available data only. Mark pricing with "as of [date], verify current pricing at [competitor URL]". |
| Competitor has been acquired or rebranded | Note the acquisition. Update the page structure accordingly ("[Product B] (now part of [Company X])"). |
| User wants to make false claims about competitor | Decline. Explain the legal risk (defamation, false advertising) and reputational risk. Offer to write a fair comparison. |
| Competitor has deprecated a key feature | Include this as a notable change. Dated information is valuable on comparison pages. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Schema for comparison pages | `/seo schema` |
| Content quality audit | `/seo content` |
| Keyword intent research | `/seo cluster` |
| On-page analysis | `/seo page` |
| Full audit | `/seo audit` |
