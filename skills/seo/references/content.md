---
name: seo-content
description: >
  Content quality and E-E-A-T analysis. Evaluates readability, content depth, AI
  citation readiness, and thin content. Use for: "content quality", "E-E-A-T",
  "content analysis", "readability score", "thin content", "content audit",
  "improve article", "AI citation readiness".
version: 1.9.0
---

# Content Quality & E-E-A-T Analysis

## E-E-A-T Framework (updated Sept 2025 QRG)

### Experience (first-hand signals)
- Original research, case studies, before/after results
- Personal anecdotes, process documentation
- Unique data, proprietary insights
- Photos/videos from direct experience

### Expertise
- Author credentials, certifications, bio
- Professional background relevant to topic
- Technical depth appropriate for audience
- Accurate, well-sourced claims

### Authoritativeness
- External citations, backlinks from authoritative sources
- Brand mentions, industry recognition
- Published in recognized outlets
- Cited by other experts

### Trustworthiness
- Contact information, physical address
- Privacy policy, terms of service
- Customer testimonials, reviews
- Date stamps, transparent corrections
- Secure site (HTTPS)

## Content Metrics

### Word Count Analysis

This table is the anchor of `L-WORD-1`. It is the only place in the plugin that carries per-page-type
word counts. Other references cite it; they do not restate it with their own numbers.
Compare against page type minimums:
| Page Type | Minimum |
|-----------|---------|
| Homepage | 500 |
| Service page | 800 |
| Blog post | 1,500 |
| Product page | 300+ (400+ for complex products) |
| Location page | 500-600 |

> **Important:** These are **topical coverage floors**, not targets. Google has confirmed word count is NOT a direct ranking factor. The goal is comprehensive topical coverage; a 500-word page that thoroughly answers the query will outrank a 2,000-word page that doesn't. Use these as guidelines for adequate coverage depth, not rigid requirements.

### Readability
- Flesch Reading Ease: target 60-70 for general audience

> **Note:** Flesch Reading Ease is a useful proxy for content accessibility but is NOT a direct Google ranking factor. John Mueller has confirmed Google does not use basic readability scores for ranking. Yoast deprioritized Flesch scores in v19.3. Use readability analysis as a content quality indicator, not as an SEO metric to optimize directly.
- Grade level: match target audience
- Sentence length: average 15-20 words
- Paragraph length: 2-4 sentences

### Keyword Optimization
- Primary keyword in title, H1, first 100 words
- Natural keyword usage, not a target density. Google publishes no density figure and treats unnatural repetition as keyword stuffing ([Google Search Central](https://developers.google.com/search/docs/essentials/spam-policies)). Any percentage you use is an internal editing heuristic, not a ranking threshold
- Semantic variations present
- No keyword stuffing

### Content Structure
- Logical heading hierarchy (H1 -> H2 -> H3)
- Scannable sections with descriptive headings
- Bullet/numbered lists where appropriate
- Table of contents for long-form content

### Multimedia
- Relevant images with proper alt text
- Videos where appropriate
- Infographics for complex data
- Charts/graphs for statistics

### Internal Linking
- 3-5 relevant internal links per 1000 words
- Descriptive anchor text
- Links to related content
- No orphan pages

### External Linking
- Cite authoritative sources
- Leave external links in the same tab unless the user is mid-task and would lose work. Forcing
  `target="_blank"` takes the back button away from the visitor and is an accessibility defect, not a
  courtesy. When it is genuinely warranted, say so in the link text so nobody is surprised.
- Reasonable count (not excessive)

## AI Content Assessment (Sept 2025 QRG addition)

Google's raters now formally assess whether content appears AI-generated.

### Acceptable AI Content
- Demonstrates genuine E-E-A-T
- Provides unique value
- Has human oversight and editing
- Contains original insights

### Low-Quality AI Content Markers
- Generic phrasing, lack of specificity
- No original insight
- Repetitive structure across pages
- No author attribution
- Factual inaccuracies

> **Helpful Content System (March 2024):** Google lists the helpful content system among its retired systems: announced in 2022, "in March 2024, it evolved and became part of our core ranking systems" ([Google Search Central](https://developers.google.com/search/docs/appearance/ranking-systems-guide)). It no longer operates as a standalone classifier. Helpfulness signals are now weighted within every core update. The same principles apply (people-first content, demonstrating E-E-A-T, satisfying user intent), but enforcement is continuous rather than through separate HCU updates.

## AI Citation Readiness (GEO signals)

Optimize for AI search engines (ChatGPT, Perplexity, Google AI Overviews):

- Clear, quotable statements with statistics/facts
- Structured data (especially for data points)
- Strong heading hierarchy (H1->H2->H3 flow)
- Answer-first formatting for key questions
- Tables and lists for comparative data
- Clear attribution and source citations

### Where the GEO doctrine lives

The checklist above is this dimension's scoring hook. The discipline itself (per-engine workflows for Google AI Mode and AI Overviews, ChatGPT, Perplexity and Bing Copilot, entity and topical-authority strategy, citation tracking as a KPI, llms.txt) belongs to [geo.md](geo.md): run `/seo geo` and do not restate it here.

## Content Freshness

- Publication date visible
- Last updated date if content has been revised
- Flag content older than 12 months without update for fast-changing topics

## Output

### Content Quality Score: XX/100

### E-E-A-T Breakdown
| Factor | Score | Key Signals |
|--------|-------|-------------|
| Experience | XX/25 | ... |
| Expertise | XX/25 | ... |
| Authoritativeness | XX/25 | ... |
| Trustworthiness | XX/25 | ... |

### AI Citation Readiness: XX/100

### Issues Found
### Recommendations

## Error Handling

| Scenario | Action |
|----------|--------|
| URL unreachable (DNS failure, connection refused) | Report the error clearly. Do not guess page content. Suggest the user verify the URL and try again. |
| Content behind paywall (402/403, login wall) | Report that the content is not publicly accessible. Analyze only the visible portion (meta tags, headers) and note the limitation. |
| Thin content (fewer than 100 words retrievable) | Report the findings as-is rather than guessing. Flag the page as potentially JavaScript-rendered or gated, and suggest the user provide the full text directly. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|---------------|-------|
| Full SEO audit | `/seo audit` |
| Keyword data for content | (not included) |
| AI search optimization | `/seo geo` |
| Content production | (not included) |
| Competitor comparison pages | `/seo competitor-pages` |
| Topic & source research | (not included) |
| SEO content strategy | `/seo plan` |
