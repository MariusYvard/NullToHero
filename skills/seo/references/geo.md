---
name: seo-geo
description: >
  Optimize for AI Overviews, ChatGPT, Perplexity, and Bing Copilot. GEO and
  Generative Engine Optimization specialist. Use for: "AI search", "AI Overviews",
  "GEO", "llms.txt", "AI crawler", "passage citability", "ChatGPT visibility",
  "Perplexity ranking", "brand mentions", "AI citation", "AI search visibility",
  "geo quick", "geo compare".
version: 1.1.0
user-invocable: true
argument-hint: "[audit|quick|compare] [url]"
---

# AI Search / GEO Optimization

## Commands

| Command | What it does |
|---------|-------------|
| `geo [url]` | Full GEO audit — all 6 dimensions, platform subscores, ACTION-PLAN |
| `geo quick [url]` | 60-second GEO visibility snapshot — overall score + top 3 quick wins |
| `geo compare [url]` | Compare current GEO state against a stored baseline (requires previous `geo` run) |

---

## Key Statistics (2026)

*Figures below reflect industry data available as of early 2026 and decay quickly; re-verify before quoting.*

| Metric | Value | Source |
|--------|-------|--------|
| AI Overviews reach | 1.5B users/month across 200+ countries | Google |
| AI Overviews query coverage | 50%+ of all queries | Industry data |
| AI-referred sessions growth | +527% (Jan–May 2025) | SparkToro |
| ChatGPT weekly active users | 900 million | OpenAI |
| Perplexity monthly queries | 500+ million | Perplexity |
| AI traffic conversion vs organic | 4.4x higher | Industry data |
| Brand mentions vs backlinks for AI | 3x stronger correlation | Ahrefs Dec 2025 |
| Domains cited by both ChatGPT and Google AIO | Only 11% | Industry research |

---

## GEO Scoring Methodology

### Composite GEO Score (0–100)

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| AI Citability & Visibility | 25% | Passage-level extractability, answer formatting, fact density |
| Brand Authority Signals | 20% | Mentions on Reddit, YouTube, Wikipedia, LinkedIn and other AI-cited platforms |
| Content Quality & E-E-A-T | 20% | Author credentials, source citations, freshness, trustworthiness |
| Technical Foundations | 15% | SSR, AI crawler access, robots.txt, page speed |
| Structured Data | 10% | Schema markup for AI discoverability |
| Platform Optimization | 10% | Specific signals for Google AIO, ChatGPT, Perplexity |

### Platform Subscores (0–100 each)

**Google AI Overviews Score**
- 92% of AIO citations come from top-10 ranking pages → Traditional SEO is the foundation
- Additional signals: passage optimization, structured answers, schema, HTTPS, mobile

**ChatGPT Score**
- Wikipedia: 47.9% of citations
- Reddit: 11.3% of citations
- Key signals: entity presence (Wikipedia, Wikidata), authoritative source citations, brand mentions on Reddit/YouTube

**Perplexity Score**
- Reddit: 46.7% of citations (highest of any platform)
- Wikipedia: high
- Key signals: community validation, Reddit discussions, Wikipedia presence

**Bing Copilot Score**
- Bing index coverage + IndexNow submissions
- Key signals: traditional SEO (same as Google), IndexNow implementation, Bing Webmaster Tools verification

---

## Full GEO Audit

### Dimension 1: Citability Score (25%)

**Optimal passage length for AI citation: roughly 120–180 words per self-contained block.** (Citation-extraction studies cluster citable units in this range; treat the figure as a guideline, not a hard target.)

AI systems extract self-contained passages that directly answer a question. Every key claim should exist as an extractable unit.

**Strong citability signals:**
- Clear, quotable sentences with specific facts or statistics
- Self-contained answer blocks (can be understood without surrounding context)
- Direct answer in first 40–60 words of a section
- Claims attributed to specific sources ("According to [Source], [year]...")
- Definition patterns: "X is..." / "X refers to..." / "X means..."
- Unique data points not found elsewhere online

**Weak citability signals:**
- Vague, general statements without evidence
- Opinions presented without source attribution
- Conclusions buried deep in paragraphs
- No specific numbers or dates

**Passage quality test:** Can this passage be read in isolation and still completely answer a specific question? If yes: high citability. If it requires surrounding context: low citability.

### Dimension 2: Structural Readability (included in Citability, 25%)

92% of AI Overview citations come from top-10 ranking pages, but 47% come from pages ranking below position 5 — AI selection logic differs from traditional ranking.

**Strong structural signals:**
- Clean H1 → H2 → H3 heading hierarchy
- Question-based headings (mirrors user query patterns)
- Short paragraphs (2–4 sentences)
- Tables for comparative data
- Ordered lists for step-by-step or ranked content
- FAQ sections with clear Q&A format

**Weak structural signals:**
- Wall of text with no headings for 500+ words
- Inconsistent heading levels (H2 → H4 skipping H3)
- No lists or tables in a content-heavy page
- Nested content that requires context to understand

### Dimension 3: Brand Authority Signals (20%)

**Brand mentions correlate 3× more strongly with AI visibility than backlinks.**
(Ahrefs study of 75,000 brands, December 2025)

| Platform | Correlation with AI Citations |
|----------|------------------------------|
| YouTube mentions | ~0.737 (strongest signal) |
| Reddit mentions | High |
| Wikipedia presence | High |
| LinkedIn presence | Moderate |
| Domain Rating (backlinks) | ~0.266 (weak) |

**Audit brand presence on:**
- Wikipedia (article about the brand or key products)
- Wikidata (entity record)
- Reddit (brand name searches in relevant subreddits)
- YouTube (brand channel, brand mentions in related videos)
- LinkedIn (company page completeness)
- G2 / Capterra / Product Hunt (for software/SaaS)
- Industry news sites and publications

**Brand authority building tactics (ordered by impact):**
1. Wikipedia: create or improve an article (requires notability — citations needed)
2. YouTube: create valuable content or appear on established channels
3. Reddit: participate genuinely in relevant communities (no spam)
4. Press mentions in industry publications (also generates backlinks)
5. Podcast appearances (mentions without necessarily links)

### Dimension 4: Content Quality & E-E-A-T (20%)

See `/seo content` for full E-E-A-T framework.

For GEO specifically, AI systems weigh:
- Author byline with verifiable credentials (LinkedIn, publications, professional site)
- Publication and last-updated dates (freshness signal)
- Citations to primary sources (links to studies, official documentation, data)
- Expert quotes with full attribution
- Organizational authority signals (About page, contact info, trust signals)

### Dimension 5: Technical Accessibility (15%)

**AI crawlers do NOT execute JavaScript.** Content must be in the initial HTML response.

**Check for:**
- Server-side rendering (SSR) vs client-only rendering
- AI crawler access in `robots.txt`
- `llms.txt` presence and quality
- RSL 1.0 licensing implementation
- HTTPS (required for AIO inclusion)
- Core Web Vitals (especially LCP < 2.5s)

### Dimension 6: Platform Optimization (10%)

Platform-specific signals beyond general GEO. See Platform Subscores section above.

---

## Quick GEO Snapshot (`geo quick [url]`)

Runs in ~60 seconds. No full analysis — just a fast diagnostic.

**What it checks:**
1. robots.txt: are key AI crawlers (GPTBot, ClaudeBot, PerplexityBot) allowed?
2. llms.txt: present or absent?
3. First-paragraph answer quality: does the page open with a direct, quotable statement?
4. Heading structure: do headings read as questions or answers?
5. Author attribution: is there a visible author with credentials?
6. Schema: is there any structured data for AI context?

**Output:**
```
## GEO Quick Snapshot — example.com/page/
Estimated GEO Score: XX/100 (rough estimate)

✅ / ❌ AI crawlers allowed
✅ / ❌ llms.txt present
✅ / ❌ Opening paragraph is directly quotable
✅ / ❌ Question-based headings
✅ / ❌ Author with credentials
✅ / ❌ Structured data present

Top 3 quick wins (can be done today):
1. [most impactful fix]
2. [second fix]
3. [third fix]
```

---

## GEO Compare (`geo compare [url]`)

Compares current GEO state against a previously captured state (from a prior `geo` run).

**Tracks changes in:**
- Overall GEO score
- Platform subscores (Google AIO, ChatGPT, Perplexity)
- AI crawler access (any newly blocked/unblocked crawlers)
- llms.txt status
- Author/date signals
- Schema markup changes

**Output:**
```
## GEO Progress Report — example.com
Previous audit: [date] | Current: [date]

Overall score: XX → XX (+/-X points)
Google AIO score: XX → XX
ChatGPT score: XX → XX
Perplexity score: XX → XX

Changes detected:
🟢 GPTBot newly allowed in robots.txt (+)
🔴 llms.txt removed (-)
🟡 Author date updated (+)
```

---

## AI Crawler Detection

Check `robots.txt` for these AI crawlers (14 tracked):

| Crawler | Owner | Purpose | Recommendation |
|---------|-------|---------|----------------|
| GPTBot | OpenAI | ChatGPT web search | **Allow** for AI visibility |
| OAI-SearchBot | OpenAI | OpenAI search features | **Allow** |
| ChatGPT-User | OpenAI | ChatGPT browsing | **Allow** |
| ClaudeBot | Anthropic | Claude web features | **Allow** |
| PerplexityBot | Perplexity | Perplexity AI search | **Allow** |
| anthropic-ai | Anthropic | Claude training | Block if desired |
| CCBot | Common Crawl | Training data | Block if desired |
| Bytespider | ByteDance | TikTok/Douyin AI | Block if desired |
| cohere-ai | Cohere | Cohere models | Block if desired |
| Diffbot | Diffbot | AI training/search | Context-dependent |
| AI2Bot | Allen Institute | Research | Context-dependent |
| Applebot-Extended | Apple | Siri/Apple AI | **Allow** for Apple AI |
| FacebookBot | Meta | Meta AI search | **Allow** for Meta AI |
| PetalBot | Huawei | Petal Search AI | Context-dependent |

**Key distinction:**
- Blocking `GPTBot` stops OpenAI training but does NOT prevent ChatGPT from citing your content via browsing (`ChatGPT-User`)
- Blocking `Google-Extended` stops Gemini training but does NOT affect Google Search or AI Overviews (those use `Googlebot`)

---

## llms.txt Standard

The **llms.txt** standard provides AI crawlers with structured content guidance.

**Location:** `/llms.txt` at root domain

**Format:**
```
# Site Name
> Brief description of what this site covers

## Key pages
- [Page Title](https://example.com/page/): Brief description
- [Another Page](https://example.com/other/): Brief description

## About
- [About Us](https://example.com/about/): Who we are, our expertise

## Key facts
- Founded: [year]
- Specialization: [topic]
- Audience: [target users]
```

**Generate llms.txt if absent.** Build it from the sitemap + page metadata. Include the most important, most authoritative, and most citation-worthy pages.

---

## RSL 1.0 (Really Simple Licensing)

Standard for machine-readable AI licensing terms (December 2025).
Backed by: Reddit, Yahoo, Medium, Quora, Cloudflare, Akamai, Creative Commons

**Check for:** RSL implementation at `/.well-known/rsl.json`

---

## Quick Wins (can be done today)

1. Add "What is [topic]?" definition in the first 60 words
2. Structure answer blocks of roughly 120–180 words around specific questions
3. Add question-based H2/H3 headings throughout
4. Include specific statistics with source attribution
5. Add visible publication and last-updated dates
6. Allow key AI crawlers in `robots.txt` (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot)
7. Add Person schema for article authors

## Medium Effort (1–2 weeks)

1. Create `/llms.txt` with structured content guidance
2. Add author bio with credentials, LinkedIn, and publication links
3. Ensure server-side rendering for all key content
4. Add Wikidata entity for brand and key products
5. Build entity presence on Reddit through genuine community participation
6. Implement comprehensive `sameAs` in Organization schema
7. Add comparison tables and structured lists to increase passage citability

## High Impact (1–3 months)

1. Create original research or data studies (uniquely citable)
2. Build or improve Wikipedia article for brand/key topics
3. Establish YouTube channel with expertise-demonstrating content
4. Earn coverage in industry publications (brand authority)
5. Develop unique tools or calculators (link and citation magnets)

---

## Full Audit Output (`GEO-ANALYSIS.md`)

1. **Composite GEO Score: XX/100**
2. **Platform Subscores**
   - Google AI Overviews: XX/100
   - ChatGPT: XX/100
   - Perplexity: XX/100
   - Bing Copilot: XX/100
3. **Dimension Scores** (each weighted)
4. **AI Crawler Access Status** (14 crawlers)
5. **llms.txt Status** (present/absent/quality assessment)
6. **Brand Mention Analysis** (Wikipedia, Reddit, YouTube, LinkedIn)
7. **Passage-Level Citability** (top 5 most citable passages identified)
8. **Server-Side Rendering Check**
9. **Top 5 Highest-Impact Changes** (by score impact)
10. **Schema Recommendations** for AI discoverability

---

## Error Handling

| Scenario | Action |
|----------|--------|
| URL unreachable | Report the error. Do not guess site content. Suggest verifying the URL. |
| AI crawlers blocked by robots.txt | Report exactly which crawlers are blocked. Provide specific directives to add. |
| No llms.txt found | Note the absence. Generate a ready-to-use llms.txt template from the site's structure. |
| No structured data detected | Report the gap. Provide Article, Organization, Person schema recommendations. |
| JavaScript-only content | Warn that AI crawlers will miss JS-rendered content. Recommend SSR or static generation. |
| No baseline for `geo compare` | Prompt to run `geo [url]` first to establish a baseline. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Full SEO audit | `/seo audit` |
| Content quality and citability | `/seo content` |
| Structured data for AI | `/seo schema` |
| Organic SEO strategy | `/seo plan` |
| Technical SEO (JS rendering, robots.txt) | `/seo technical` |
| SEO change tracking over time | `/seo drift` |
