---
name: seo-backlinks
description: >
  Backlink profile analysis, link quality, anchor text distribution, competitor
  link gap, toxic links, and link building opportunities using free data sources
  (Moz, Bing, Common Crawl). Use for: "backlinks", "link profile", "link building",
  "backlink audit", "toxic links", "competitor links", "anchor text", "domain authority",
  "referring domains".
version: 1.39.0
---

# Backlink Profile Analysis

## Data sources (no paid API required)

| Source | Data type | How to access |
|--------|-----------|---------------|
| **Moz Link Explorer** | Domain Authority, top linking domains, anchor text | `moz.com/link-explorer`: 10 free queries/month |
| **Bing Webmaster Tools** | Inbound links for verified domains | `bing.com/webmasters`: free, requires verification |
| **Common Crawl** | Raw crawl data, large-scale link data | `commoncrawl.org`: free, technical |
| **Google Search Console** | Links from Google's perspective (if verified) | `search.google.com/search-console`: free, verified only |
| **Ahrefs Free Tools** | Limited backlink overview | `ahrefs.com/backlink-checker`: 1 free check/domain |
| **Semrush Free** | Limited overview | `semrush.com`: 10 free queries/day |

**Recommended approach:** Start with Moz Link Explorer for a quick overview. Use GSC if the user has access. Note all data limitations transparently.

---

## Audit Dimensions

### 1. Profile Overview

**Key metrics to report:**

| Metric | What it means |
|--------|---------------|
| Domain Authority (Moz DA) or Domain Rating (Ahrefs DR) | Aggregate link authority score (0 to 100). Useful for comparison, not a Google metric. |
| Referring domains | Number of unique domains linking to the site. More important than raw backlink count. |
| Total backlinks | Total link count (including multiple links from same domain). |
| Follow vs nofollow ratio | Share of links passing ranking credit. Google publishes no target ratio, so read the shape (a profile that is almost entirely one or the other is worth investigating), not a score. |
| Link velocity | Rate at which new links are acquired. Sudden spikes = potential manipulation signal. |

**Healthy profile indicators:**
- Diverse referring domains (100+ for established sites)
- DA/DR proportional to site age and content investment
- Gradual, organic-looking link growth
- Mix of dofollow and nofollow
- Links from topically relevant sites

### 2. Link Quality Assessment

**Evaluate the top 20 referring domains against these criteria:**

| Quality signal | Positive | Negative |
|---------------|----------|----------|
| Domain relevance | Topically related to your site | Completely unrelated niche |
| Domain authority | DA 40+ | DA < 10 |
| Traffic | Domain has real organic traffic | Zero traffic (spam site) |
| Link placement | In-content editorial link | Footer, sidebar, or link farm |
| Anchor text | Natural, varied, topical | Exact-match keyword-stuffed |
| Link age | Old, stable links | New links from old domains (hacked/expired) |
| TLD | .com, .org, .edu, .gov, .uk, .de, etc. | Excessive .xyz, .club, .info, .top spam TLDs |

### 3. Anchor Text Distribution

Natural anchor text profiles are diverse. Google publishes no target distribution, so report the shape of the profile and flag concentration instead of scoring against fixed percentages.

| Anchor type | What a high share suggests |
|-------------|----------------------------|
| Branded (company/product name) | Normal for a recognized brand. A very low share can mean the brand is rarely cited by name. |
| Naked URL (example.com) | Typical of citations, directories and forum posts. |
| Generic ("click here", "website", "here") | Common in editorial writing, but carries little topical signal when it dominates. |
| Exact match keyword | The pattern most associated with manipulation. Google treats links with optimized anchor text in advertorials, guest posts and distributed press releases as link spam ([Google Search Central](https://developers.google.com/search/docs/essentials/spam-policies)). |
| Partial match keyword | Reads naturally when it varies across sources. |
| Topic/contextual variations | The signature of editorially placed links. |

Report the distribution together with how the links were acquired. A concentration of exact-match anchors on paid or guest-post placements is the actionable finding, not any single percentage.

### 4. Toxic Link Detection

**High-risk link types:**

- Links from known spam networks, link farms, PBNs
- Links from hacked websites (legitimate site, hacked to point to yours)
- Paid links with no `rel="sponsored"` (violates Google policy)
- Links from low-quality article directories with duplicate content
- Reciprocal link schemes (A links to B, B links to A, at scale)
- Footer/sitewide links with exact-match anchor text

**Action:** For clearly toxic links, recommend Google's Disavow Tool. Note: disavow should only be used for clear spam; disavowing quality links can harm rankings.

### 5. Competitor Link Gap Analysis

Compare the site's backlink profile against 2-3 competitors to find link opportunities.

**Process:**
1. List top 20 referring domains for Competitor A
2. List top 20 referring domains for Competitor B
3. Identify domains linking to competitors but NOT to the target site
4. Assess which of those gaps are realistic link opportunities

**Gap link types to prioritize:**
- Industry publications and blogs (editorial, pitch required)
- Resource pages ("best tools for X")
- Roundups and listicles ("top X companies in Y")
- Partner / integration pages (if product integrations exist)
- Academic or research references (for data-driven content)

### 6. Internal vs External Link Balance

Backlinks matter, but internal links distribute authority within the site.

**Check:**
- Key pages have sufficient internal links pointing to them
- High-authority pages (most linked-to) pass PageRank to key conversion pages
- Orphan pages (no internal links) are a missed opportunity even with backlinks

---

## Link Building Opportunity Types

Ranked by effort-to-reward ratio for sites without a dedicated link team:

**Low effort, high value:**
1. Reclaim unlinked brand mentions (Google your brand name → find mentions without links → email the author)
2. Fix broken links on other sites (find pages with broken outbound links → offer your content as replacement)
3. Update outdated resources (find articles citing outdated data → offer your updated resource)

**Medium effort, medium-high value:**
4. Journalist-query platforms (answer a reporter's question, get cited in the article). Verified July 2026, because this list churns and half the advice online names a service that no longer exists:
   - **Source of Sources (SOS)**: sourceofsources.com. Free, no paid tier. Shankman's rebuild after he sold HARO; the practitioner default now.
   - **HARO**: helpareporter.com. Free. **Note the discontinuity**: Cision killed it on 9 Dec 2024, then Featured.com bought the brand in Apr 2025 and relaunched the free query emails. Advice written in between says HARO is dead. It is not.
   - **SourceBottle**: sourcebottle.com. Free. AU/NZ-weighted.
   - **Qwoted**: qwoted.com. Freemium, and the free tier is throttled in a way that matters: 2 pitches/month behind a 2-hour delay, so paying sources see every query first. Recommending it without that caveat sets someone up to lose every race.
   - **Featured**: featured.com. Freemium, 2-3 opportunities/week free.
   - **Connectively is dead** (Cision, 9 Dec 2024). It is still recommended all over the web. Do not.
5. Guest posts on industry publications (one high-DA guest post > 20 low-DA ones)
6. Create linkable assets: original research, free tools, comprehensive guides

**High effort, high value:**
7. Digital PR campaigns (create newsworthy studies or data reports)
8. Podcast appearances (generate brand mentions + occasional links)
9. Industry awards and recognitions

---

## Output

### Backlink Profile Score: XX/100

### Overview
| Metric | Value | Assessment |
|--------|-------|------------|
| Estimated DA | XX | [context] |
| Referring domains | X | [healthy/low/good for site age] |
| Dofollow ratio | XX% | [natural/over-nofollowed] |
| Toxic links estimated | X | [low risk/needs review] |

### Top Referring Domains (quality assessment)
| Domain | DA | Relevance | Link type | Quality |
|--------|-----|-----------|-----------|---------|
| ... | ... | ✅/⚠️/❌ | Editorial/footer | High/Med/Low |

### Anchor Text Distribution
Chart of anchor types vs. healthy benchmarks

### Competitor Gap Opportunities
Top 10 domains linking to competitors but not to the site

### Toxic Links to Review (if any)
List with disavow recommendation

### Link Building Action Plan (priority order)

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No Moz data available | Note the limitation. Use alternative free sources. Provide a partial analysis based on available data. |
| Very new domain (<6 months) | DA/DR scores will be 0-10 regardless. Focus on link building strategy rather than audit. |
| High toxic link count | Recommend manual review before disavowing. Over-disavowing is common and harmful. |
| GSC not connected | Note that GSC provides the most accurate link data for verified owners. Recommend connecting it. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Full site audit | `/seo audit` |
| Digital PR and content to earn links | `/seo content` |
| Competitor comparison pages (attract links) | `/seo competitor-pages` |
| Technical audit (canonicals that affect link equity) | `/seo technical` |
