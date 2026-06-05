---
name: seo-sxo
description: >
  Search Experience Optimization — aligns search intent with on-page user
  experience. Page-type matching, user journey analysis, persona alignment,
  satisfaction signals. Use for: "SXO", "search experience", "user intent",
  "page type mismatch", "bounce rate SEO", "dwell time", "pogo-sticking",
  "user satisfaction", "intent alignment".
version: 1.9.0
---

# Search Experience Optimization (SXO)

## What SXO is

SXO is the intersection of SEO and UX. A page can rank for a keyword but still fail if users land on it and immediately bounce — signaling to Google that the page didn't satisfy the query intent. SXO audits whether the page experience matches what the user expected when they clicked.

**The core question:** "Does this page deliver exactly what a user searching for [keyword] would expect and need?"

---

## Audit Dimensions

### 1. Intent Type Detection

Identify the primary search intent for the page's target keywords:

| Intent | What users want | Satisfying experience |
|--------|----------------|----------------------|
| **Informational** | Learn, understand, find an answer | Clear answer in first screen, well-structured, scannable |
| **Navigational** | Find a specific site or page | Immediately recognizable, fast load, correct destination |
| **Commercial investigation** | Compare options, research before buying | Feature comparisons, reviews, pricing, social proof |
| **Transactional** | Complete an action (buy, sign up, download) | Clear CTA above fold, trust signals, minimal friction |
| **Local** | Find a nearby business or service | Map, address, hours, phone number prominent |

**Intent mismatch** is the most common SXO failure: a blog post ranking for a transactional query, or a product page ranking for an informational query.

**How to detect intent from SERP:**
- Check the top 5 organic results for the target keyword
- Identify the dominant page type (articles, landing pages, product pages, listicles)
- Check format (how-to, list, definition, comparison)
- Check content angle (for beginners, advanced, free options, etc.)

### 2. Page Type Alignment

| Target keyword intent | Expected page type | Wrong page type (mismatch) |
|----------------------|-------------------|---------------------------|
| "what is [tool]" | Blog/guide | Product landing page |
| "best [tool]" | Listicle/comparison | Homepage |
| "[tool] pricing" | Pricing page or pricing comparison | Generic feature page |
| "buy [product]" | Product page with cart | Blog post |
| "[service] near me" | Location page with map | Generic service page |
| "[tool] tutorial" | Step-by-step guide with examples | Marketing page |
| "[tool] vs [competitor]" | Comparison page | Product homepage |

### 3. First Impression (Above the Fold)

The first screen the user sees after clicking must confirm they are in the right place.

**Check:**
- H1 matches or closely mirrors the search query
- Value proposition visible without scrolling
- Page type is immediately clear (article, product, comparison)
- No disruptive interstitials blocking content (pop-ups, cookie banners covering main content)
- Page load fast enough that content is visible within 2.5s (LCP)

**First-screen failure signals:**
- H1 is the brand name, not the topic
- "Hero" section is pure visual/marketing with no information value
- Multiple competing CTAs before any content
- Content pushed below a large image

### 4. User Journey Mapping

Map the expected journey from search → click → page → action:

**For each target persona, document:**
- What problem are they trying to solve?
- What are they willing to read / do on this page?
- What's their next logical step?
- What trust signals do they need before acting?

**Journey-based content structure:**

*Informational intent journey:*
```
Problem recognition → Answer → Context/detail → Related questions → Next reading
```

*Commercial investigation journey:*
```
Category overview → Feature comparison → Social proof → Pricing context → CTA (trial/demo)
```

*Transactional intent journey:*
```
Product confirmation → Key benefits (3) → Trust signals → CTA → Risk removal (guarantee)
```

### 5. Satisfaction Signals

Google measures user satisfaction via behavioral signals. Optimize for:

**Positive signals:**
- Long dwell time (user reads the full page)
- Scroll depth (user reaches the bottom)
- Internal navigation (user explores more pages)
- Return to SERP is slow or doesn't happen ("long click")
- Conversions and goal completions

**Negative signals (pogo-sticking):**
- User clicks back to Google immediately after landing
- Very short dwell time combined with high bounce rate
- User clicks next result for the same query

**Reducing pogo-sticking:**
- Provide the answer in the first 100 words, then expand
- Match the exact format users expect (if SERP is listicles, use a list)
- Ensure the page loads fast (slow load = immediate back-click)
- Don't bait-and-switch (don't rank for X and deliver Y)

### 6. Content Format Matching

The format of the content should match the query type.

| Query type | Optimal format |
|-----------|---------------|
| "how to [do X]" | Numbered step-by-step |
| "what is [X]" | Definition + explanation + examples |
| "best [X] for [Y]" | Numbered list with criteria |
| "[X] vs [Y]" | Side-by-side comparison table |
| "[X] review" | Structured review: pros/cons/verdict |
| "[X] examples" | Gallery or list with visuals |
| "[X] calculator" | Interactive tool |
| "[X] template" | Downloadable/copyable template |

### 7. Persona Alignment

Different personas have different content needs even for the same keyword.

**Beginner persona:** Needs definitions, context, "why it matters", simple examples. Fails with jargon-first content.

**Intermediate persona:** Needs practical how-to, specific tactics, intermediate examples. Bored by basic definitions.

**Expert/professional persona:** Needs technical depth, edge cases, benchmarks, comparisons vs alternatives. Frustrated by padded beginner content.

**Check:**
- Does the page's assumed knowledge level match the typical searcher for this query?
- Is there a mismatch between the URL/title (which attracted a persona) and the content depth (which serves a different one)?

### 8. Mobile Search Experience

Over 60% of searches happen on mobile. SXO includes mobile-specific experience:

- Touch targets ≥ 44px (24px WCAG 2.5.8 AA minimum)
- No horizontal scroll
- Font size ≥ 16px for body text
- CTAs thumb-reachable (bottom half of screen preferred)
- Images not breaking the layout
- Accordions/tabs for long content sections (reduces scroll fatigue)

---

## Output

### SXO Score: XX/100

### Intent Analysis
- Target keyword: [keyword]
- Detected intent: [type]
- Current page type: [type]
- Intent match: ✅ Aligned / ❌ Mismatch

### Satisfaction Risk Factors
| Risk | Severity | Recommendation |
|------|----------|----------------|
| [issue] | High/Med/Low | [fix] |

### Persona Analysis
- Target persona: [description]
- Content level: [Beginner / Intermediate / Expert]
- Alignment: ✅ / ⚠️ / ❌

### Format Assessment
- Expected format: [based on SERP]
- Current format: [actual]
- Gap: [if any]

### Priority Recommendations (ordered by user satisfaction impact)

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Intent clearly mismatched | Recommend either: (a) rewriting the page to match current intent, or (b) creating a new page for the current intent and repurposing this page. |
| Page ranks for multiple intents | Document each intent separately. The page should serve the dominant intent first, then address secondary intents further down. |
| High bounce rate reported but no behavior data | Cannot measure dwell time without analytics. Audit the above-fold experience and intent match as proxies. |
| Mobile experience fails | Escalate to `/siteasy adapt` for responsive design fixes. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Keyword intent grouping | `/seo cluster` |
| Content depth and E-E-A-T | `/seo content` |
| UX research and personas | `/siteasy research` |
| Information architecture | `/siteasy ia` |
| Journey mapping | `/siteasy journey` |
| Mobile and responsive design | `/siteasy adapt` |
| Full audit | `/seo audit` |
