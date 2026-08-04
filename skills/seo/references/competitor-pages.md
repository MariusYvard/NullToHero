---
name: seo-competitor-pages
description: >
  Generate SEO-optimized competitor comparison and alternatives pages. Covers
  "X vs Y" layouts, alternatives pages, feature matrices, schema markup, and FAQ
  sections. Use for: "vs page", "competitor comparison", "alternatives to X",
  "comparison page", "competitor landing page", "X vs Y", "best alternatives".
version: 1.8.3
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

### Read the SERP before writing anything

Search the target query and look at what ranks. If the first three results are review directories,
G2, Capterra, Trustpilot, then the page you are about to write is not the highest-leverage work
available: your profile on those directories is, because that is what the searcher will read and
that is what an answer engine will cite. Say so rather than building the page anyway.

When your own page is the right move, the SERP still tells you the shape to match: how deep the
comparison tables go, whether screenshots are present, whether a visible update date is the norm.
You have to deliver at least that.

## Step 1: Gather competitive intelligence

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

### Step 2: Structure the page

A "vs" page runs: dated H1, short intro, quick comparison table, one overview per product, a head-to-head
by category, "who should choose which", FAQ, CTA. An alternatives page runs: dated H1, why people leave,
one consistently structured block per alternative (what it is, best for, features, pricing, pros/cons,
rating, link), a table of all of them, CTA, FAQ.

Three calls inside that structure are the ones that get dropped:
- Each product overview carries **key limitations (2-3, be honest)**, including on your own product.
- Size the FAQ: **5 to 8 questions on a "vs" page, 4 to 6 on an alternatives page.** Two questions is a
  decorative FAQ that answers no objection.
- Close on a footer note: "Last updated: [Month Year]. Pricing and features subject to change." The date
  is what keeps the pricing claim honest a quarter later.

### Step 3: Feature matrix

Feature matrices are the highest-value element for comparison pages. They must be:
- Truthful: only check boxes that genuinely exist in the product
- Specific: "Advanced reporting with custom dashboards" not just "Reporting"
- Verifiable: every claim checkable from official docs or reliable reviews

### Step 4: Schema markup

Mark the page up as `WebPage` with `dateModified`, and attach a `breadcrumb` (`BreadcrumbList`) to it: the breadcrumb is the part routinely left off comparison pages.

Note: Google deprecated the FAQ rich result, which stopped appearing in Search on May 7, 2026, and removed the feature's documentation in June 2026 ([Google Search Central, 2026](https://developers.google.com/search/updates#deprecating-the-faq-rich-result-feature)). FAQPage remains a valid Schema.org type, the visible SERP feature is gone. Keep the markup only if a non-Google consumer of it justifies the maintenance.

**Do not mark up an aggregate rating on a comparison page.** The tempting move is to take the G2 or
Capterra score you just cited and wrap it in `AggregateRating`. Google's structured data policy forbids
exactly that: "Don't aggregate reviews or ratings from other websites." A rating you may mark up is one
your own customers left, on your own product, displayed on that same page, which a comparison page by
definition is not. Ratings that are not from actual users can draw a manual action.

Source: https://developers.google.com/search/docs/appearance/structured-data/sd-policies (verified August 2026)

Cite the third-party scores as plain text with their source and the date you read them. That is honest,
it is what a reader wants, and it carries no policy risk.

### Step 5: Internal linking

Comparison pages capture high-intent bottom-of-funnel traffic. Link to them from product and feature pages and from category blog posts, and link out to your own feature pages, pricing, and case studies relevant to the comparison.

Link from the **pricing page too ("Switching from [Competitor]?")**. A visitor already on pricing is the closest to converting, and it is the entry point nobody lists unprompted.

---

## Output

### Audit Report
- Comparison page quality score: XX/100
- Missing elements: [list]
- Inaccurate data points to fix: [list]
- Schema status: present/missing/invalid

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
