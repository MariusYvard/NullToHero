---
name: seo-geo
description: >
  Optimize for AI Overviews, ChatGPT, Perplexity, and Bing Copilot. GEO and
  Generative Engine Optimization specialist. Use for: "AI search", "AI Overviews",
  "GEO", "llms.txt", "AI crawler", "passage citability", "ChatGPT visibility",
  "Perplexity ranking", "brand mentions", "AI citation", "AI search visibility",
  "geo quick", "geo compare".
version: 1.39.0
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

*Figures decay fast, so every row names its measurer, its sample and its date. "Industry
data" is not a source: it hides a single vendor study behind a word that sounds like a
consensus. Every row below that once said it turned out to have a traceable origin, and
four of them were being misreported. Re-verify before quoting, and quote the sample.*

| Metric | Value | Source, sample, date |
|--------|-------|--------|
| AI Overviews reach | 1.5B users/month across 200+ countries | Google |
| AI Overviews query coverage | **9.5%–60%, depending entirely on the sample.** Pew: **18%** | Pew Research, 68,879 real searches by 900 US adults, Mar 2025 (the only non-vendor sample of actual human queries). Ahrefs 9.5% (keyword DB), Semrush 15.7% Nov 2025 (10M tracked keywords, peaked 24.6% Jul 2025 then fell), AWR 60% (tracked US keywords) |
| AI-referred sessions growth | +527% (Jan–May 2025), off a base of 17,076 sessions | **Previsible** (NOT SparkToro), 19 GA4 properties, Jan–May 2025 |
| ChatGPT weekly active users | 900 million | OpenAI |
| Perplexity monthly queries | 500+ million | Perplexity |
| AI traffic is "4.4x as valuable" | Value modelled from conversion rate. **Not** a 4.4x conversion rate | Semrush, 21 Jul 2025, ~500 digital-marketing topics (Semrush's own vertical) |
| Brand mentions vs backlinks for AI | Spearman 0.664 vs 0.218 (=3.05x). **Correlation only**; Ahrefs itself says all factors studied were moderate-to-weak and warns against causal reading | Ahrefs, **26 May 2025** (not Dec) |
| Domains cited by both ChatGPT and **Perplexity** | 11% | Profound, 100k prompts, 1 Jul 2025. **ChatGPT ∩ Google AIO is not published.** AIO ∩ Copilot 6%, Perplexity ∩ AIO 16.4% |

**On the coverage row.** The 9.5%–60% spread is not a dispute about a fact, it is four
different denominators. Keyword databases and rank-tracker panels over-weight the
informational long-tail that triggers AI Overviews; real human query streams are full of
navigational and short queries that do not. Any single number here is wrong. Quote the
range and name the sample, or say nothing. Note also that Semrush's own series is not
monotonic (24.6% in Jul 2025, 15.7% by Nov), so "AIO coverage is growing to X" is
unsupported by the only long time series that exists.

---

## What Google says you do NOT need to do

Primary source, and the one every GEO vendor talks around:
[Optimizing for generative AI](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
(Google Search Central, updated 2026-07-10) has a section titled *"Mythbusting generative
AI search: what you don't need to do"*. **Scope it honestly: this is Google speaking about
Google.** It does not bind ChatGPT, Perplexity or Claude, and saying it does would be the
same overreach in the opposite direction. But for Google AI Overviews and AI Mode it is
the only authority that exists, and it contradicts most of the GEO industry:

| The tactic | Google's position |
|---|---|
| `llms.txt` and other AI files | "You don't need to create new machine readable files, AI text files, markup, or Markdown... **Google Search ignores them**." Publishing one "will neither harm nor help your site's visibility or rankings in Google Search." |
| "Chunking" content | "There's no requirement to break your content into tiny pieces... **There's no ideal page length**." |
| Rewriting content for AI | "You don't need to write in a specific way just for generative AI search." |
| Chasing brand mentions | "Seeking inauthentic 'mentions' across the web isn't as helpful as it might seem." |
| Structured data for AI | "Structured data isn't required for generative AI search, and there's no special schema.org markup you need to add." Keep it for rich results, not for AI. |
| "AEO" / "GEO" as separate disciplines | "From Google Search's perspective, optimizing for generative AI search is optimizing for the search experience, and thus **still SEO**." |

Google also states there is **no additional requirement** to appear in AI Overviews or AI
Mode beyond being indexed and snippet-eligible, and warns: *"Be wary of third-party tools
that promise ranking success or claim to use 'internal' Google metrics. No third-party
tool has access to our internal ranking or AI systems."* That warning includes this one.
Report a GEO score as a heuristic we defined, never as a reading of Google's systems.

**Use this as the audit's spine for the Google platform.** When a GEO finding contradicts
the table above, the finding is the thing that needs evidence, not Google. Where the skill
still recommends `llms.txt` or passage shaping, that advice is scoped to the engines that
have not said otherwise (Perplexity, ChatGPT and Claude publish no equivalent guidance) and
must be labelled as such rather than sold as universal.

### Stop inferring when you can measure: connect Search Console

Everything this skill computes from HTML is **inference from the outside**. Search Console
is the only place your real queries, impressions and positions exist, and it is reachable
from Claude: read-only **MCP connectors for GSC and GA4 exist** and mount via Settings →
Connectors with a Google OAuth flow, no vendor account. If the user has one connected,
its numbers outrank anything on this page. Say which you used.

Two cautions, both from inspecting one:

- **Know which backend answered.** At least one vendor's GSC MCP serves three things down
  one endpoint: your OAuth'd Search Console data (provenance clear, it is yours), their own
  crawler's audit, and rank-tracker figures like "organic keywords" and "AI Overview
  references" that cannot come from GSC and whose source is undisclosed. Treat the GSC rows
  as measurement and the rest as a vendor's estimate, because that is what they are.
- **Google's own warning applies to the connector too**: no third-party tool reads Google's
  internal ranking or AI systems. A tool that reports "AI Overview references" is inferring,
  the same as we are.

### Two real requirements the industry mostly misses

- **Search Console opt-in is a hard eligibility gate.** A site must be
  [included in Search generative AI features](https://support.google.com/webmasters/answer/16908024)
  to be eligible for display in them. That is a switch, not a tactic, and it outranks every
  passage-shaping trick on this page.
- **The only first-party measurement is the
  [Generative AI performance report](https://support.google.com/webmasters/answer/16984139)**
  in Search Console. Everything else, including this skill, is inference from the outside.

### Query fan-out is real, and documented

Google confirms both mechanisms the vendors gesture at: **RAG/grounding** (responses are
grounded in pages retrieved by core Search ranking) and **query fan-out** (the model issues
concurrent related queries; Google's own example expands "how to fix a lawn that's full of
weeds" into herbicide, chemical-free and prevention queries). The correct inference is NOT
to build a page per fan-out query: Google names that as
[scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content).

### Agentic experiences (emerging, watch it)

Browser agents read sites by screenshot, DOM and **the accessibility tree**. Google points
to [agent-friendly website best practices](https://web.dev/articles/ai-agent-site-ux) and the
[Universal Commerce Protocol](https://ucp.dev/latest/). Note what that implies for this
plugin: the accessibility work `/inspect` already enforces is becoming machine-readability
work too. Semantic HTML and a clean a11y tree stop being only an ethical argument.

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

AI systems extract self-contained passages that directly answer a question. Every key claim should exist as an extractable unit.

> A "120–180 words per block" optimum lived here until v1.38.0, credited to
> "citation-extraction studies" with none named. Unnamed studies are not a source, and the
> only length statement from a primary source points the other way: Google's generative-AI
> guide says there is no ideal page length and no requirement to chunk. Cut, because a
> number nobody can trace is worse than no number: it survives review by looking precise.

**Strong citability signals:**
- Clear, quotable sentences with specific facts or statistics
- Self-contained answer blocks (can be understood without surrounding context)
- The answer stated before the elaboration, not after it
- Claims attributed to specific sources ("According to [Source], [year]...")
- Definition patterns: "X is..." / "X refers to..." / "X means..."
- Unique data points not found elsewhere online

> **There is no 40–60 word rule.** This reference carried one until v1.38.0 and it had no
> primary source. It is a descriptive artifact of vendor snippet-scrapes (most paragraph
> featured snippets land in that band because that is where Google *truncates*) reversed
> into a prescription. Google states it publishes no minimum length for featured snippets,
> and its generative-AI guide is blunter: **"There's no ideal page length"** and there is
> **no requirement to "chunk"** content. Put the answer first because a reader scanning a
> section wants it first. Do not count the words. If you meet a number like this in the
> wild, ask who measured it: this one traces back to nobody.

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
| GPTBot | OpenAI | AI model training | **Allow** for AI visibility |
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

Freshness lever: the Bing index feeds ChatGPT search and Copilot answers, and IndexNow puts changed URLs into it within minutes — see [indexnow.md](indexnow.md).
