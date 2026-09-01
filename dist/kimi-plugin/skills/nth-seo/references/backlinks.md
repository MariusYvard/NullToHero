---
name: seo-backlinks
description: >
  Backlink profile analysis, link quality, anchor text distribution, competitor
  link gap, toxic links, and link building opportunities using free data sources
  (Moz, Bing, Common Crawl). Use for: "backlinks", "link profile", "link building",
  "backlink audit", "toxic links", "competitor links", "anchor text", "domain authority",
  "referring domains".
version: 1.39.1
---

# Backlink Profile Analysis

## Data sources (no paid API required)

Verified 2026, and this is the fastest-rotting fact in the file: Moz Link Explorer (~10 free queries/month, DA and anchor text), Bing Webmaster Tools and Google Search Console (free, verified domains only), Ahrefs and Semrush free checkers (one domain check, ~10 queries/day), Common Crawl (raw link data, technical).
Free quotas move without notice, so read the current limit off the vendor's own page before quoting a number to anyone; do not repeat the figures above as if they were stable.
Start with Moz for the overview, use GSC whenever the user has access because it is the only view of what Google itself counts, and state the data limitation in the report.

---

## Audit Dimensions

### 1. Profile Overview

Report referring domains (more meaningful than raw backlink count), total backlinks and link velocity, where a sudden spike is a manipulation signal. Two readings need a caveat attached, because they are the ones that get scored against numbers nobody published:

| Metric | What it means |
|--------|---------------|
| Domain Authority (Moz DA) or Domain Rating (Ahrefs DR) | Aggregate link authority score (0 to 100). Useful for comparison, not a Google metric. |
| Follow vs nofollow ratio | Share of links passing ranking credit. Google publishes no target ratio, so read the shape (a profile that is almost entirely one or the other is worth investigating), not a score. |

### 2. Link Quality Assessment

Assess the top 20 referring domains on topical relevance, real organic traffic, link placement (an in-content editorial link is worth more than a footer, sidebar or link-farm placement), anchor naturalness and TLD. One signal in that list is the one to look for deliberately, because it reads as good news and is not: a recent link from an old domain is an indicator of a hacked site or of an expired domain bought for its history, not of an established site that suddenly found you interesting.

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

**Action:** For clearly toxic links, recommend Google's Disavow Tool. Note: disavow should only be used for clear spam; disavowing quality links can harm rankings.

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
| Follow vs nofollow | X follow / Y nofollow | Shape, not a grade: flag only a profile that is almost entirely one or the other, and say so without a target ratio |
| Toxic links estimated | X | [low risk/needs review] |

### Top Referring Domains (quality assessment)
| Domain | DA | Relevance | Link type | Quality |
|--------|-----|-----------|-----------|---------|
| ... | ... | ✅/⚠️/❌ | Editorial/footer | High/Med/Low |

### Anchor Text Distribution
Distribution of anchor types with the acquisition source beside each. Report the shape and name where it concentrates; there is no benchmark column, because Google publishes no target distribution.

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
| Full site audit | `/nth-seo audit` |
| Digital PR and content to earn links | `/nth-seo content` |
| Competitor comparison pages (attract links) | `/nth-seo competitor-pages` |
| Technical audit (canonicals that affect link equity) | `/nth-seo technical` |
