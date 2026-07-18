---
name: seo-cluster
description: >
  Semantic keyword clustering and content architecture. Groups keywords by search
  intent, identifies content gaps, builds topic cluster strategy. Use for:
  "keyword clustering", "topic clusters", "content architecture", "content
  strategy", "keyword research", "semantic SEO", "pillar pages", "cluster pages",
  "content gaps".
version: 1.8.1
---

# Semantic Keyword Clustering & Content Architecture

## What this does

Semantic clustering groups related keywords by **search intent** rather than just lexical similarity. The goal is to build a content architecture where each page targets a distinct, non-overlapping intent — eliminating cannibalization and establishing topical authority.

---

## Process

### Step 1 — Seed keyword expansion

Given a seed keyword (e.g., "project management software"), generate the full keyword universe:

**Expansion methods:**
- Related terms: synonyms, vertical variations, platform-specific terms
- Modifier classes:
  - Qualifier: "best", "top", "free", "cheap", "enterprise", "open source"
  - Feature: "[software] with [feature]", "[software] for [use case]"
  - Audience: "[software] for freelancers", "for small business", "for teams"
  - Comparison: "[software] vs [alternative]", "[software] alternatives"
  - Informational: "what is [topic]", "how does [topic] work", "[topic] explained"
  - Process: "how to [do thing with topic]", "[topic] tutorial", "[topic] guide"
  - Problem: "best way to [problem topic solves]"

**Search intent categories** (based on SERP analysis):

| Intent | Description | Content type |
|--------|-------------|-------------|
| **Informational** | Learning / research ("what is X") | Blog post, guide, definition |
| **Navigational** | Finding a specific site/page | Brand or product page |
| **Commercial investigation** | Comparing options before buying | Comparison, review, alternatives |
| **Transactional** | Ready to buy/sign up | Landing page, product page, pricing |
| **Local** | Finding local business | Location page, local landing page |

### Step 2 — Cluster the keywords

Group keywords into clusters where all keywords in a cluster can be satisfied by a single page. A cluster = one URL.

**Clustering rules:**
- Keywords with the same primary intent and semantic meaning → same cluster
- Keywords with different intent (even similar topic) → different clusters
- Keywords where SERP results are substantially different → different clusters

**Example clustering:**

```
Seed: "project management software"

CLUSTER 1 — Category page (commercial)
  "project management software"
  "best project management tools"
  "top project management apps"
  "project management platforms"
  Target URL: /best-project-management-software/

CLUSTER 2 — Free tier (commercial/transactional)
  "free project management software"
  "project management tools free"
  "free project management app"
  Target URL: /free-project-management-software/

CLUSTER 3 — Small teams (audience modifier)
  "project management software for small business"
  "project management for small teams"
  "small team project management"
  Target URL: /project-management-for-small-teams/

CLUSTER 4 — Informational
  "what is project management software"
  "how does project management software work"
  "project management software explained"
  Target URL: /what-is-project-management-software/

CLUSTER 5 — vs / alternatives (commercial investigation)
  "asana alternatives"
  "asana vs monday"
  "asana vs trello"
  Target URL: /asana-alternatives/ + /asana-vs-monday/ (separate pages per pair)
```

### Step 3 — Pillar and cluster architecture

**Topic cluster model:**

```
PILLAR PAGE (broad topic, links out to all cluster pages)
  "Complete Guide to Project Management Software"
  URL: /project-management-software/
  
  ↓ links to ↓
  
CLUSTER PAGES (specific subtopics, link back to pillar)
  /best-project-management-software/         (category)
  /free-project-management-software/         (free tier)
  /project-management-for-small-teams/       (audience)
  /project-management-for-remote-teams/      (audience)
  /project-management-for-agencies/          (audience)
  /project-management-software-features/     (informational)
  /asana-alternatives/                       (alternatives)
  /trello-vs-asana/                          (comparison)
```

**Internal linking requirement:**
- Pillar page links to all cluster pages
- Every cluster page links back to the pillar page
- Cluster pages can link to related cluster pages (not all to all)

### Step 4 — Gap analysis

Compare the keyword clusters to existing site content:

| Cluster | Existing page? | Status |
|---------|---------------|--------|
| Category (commercial) | /features/ | ❌ Wrong intent — needs new page |
| Free tier | none | ❌ Missing entirely |
| Small teams | /blog/small-teams/ | ⚠️ Blog post — upgrade to landing page |
| Informational | /blog/what-is-pm/ | ✅ Exists, optimize |
| Alternatives | none | ❌ High-value missing page |

**Priority scoring for gap pages:**

| Factor | High priority | Lower priority |
|--------|--------------|---------------|
| Search volume | High | Low |
| Intent match | Commercial or transactional | Informational |
| Competition | Moderate (winnable) | Extremely high |
| Business value | Converts to trial/purchase | Awareness only |
| Content gap | Completely missing | Exists but suboptimal |

### Step 5 — Cannibalization detection

Two pages competing for the same cluster = cannibalization.

**Signals:**
- Multiple pages ranking for the same query in Search Console
- Similar title tags across different pages
- Pages with identical H1 structure ("Best X for Y" × 3 separate pages)

**Fix options:**
1. Consolidate into one page (301 the weaker to the stronger)
2. Differentiate intent (rewrite one to target a different modifier)
3. Canonicalize (if one page truly supersedes the other)

---

## Output

### Cluster Map (`CLUSTER-MAP.md`)

```
TOPIC: [Seed Keyword]
Total clusters identified: X
Total existing pages: X
Gaps (missing pages): X
Cannibalization issues: X

CLUSTER 1: [Name] — [Intent]
  Primary keyword: [keyword]
  Supporting keywords: [list]
  Monthly search volume estimate: X
  Existing page: [URL or MISSING]
  Action: [Create / Optimize / Consolidate]
  Priority: High / Medium / Low

[...repeat for each cluster]
```

### Content Calendar Suggestion

Ordered by priority:
1. Fix cannibalization issues first
2. Optimize existing pages that rank but underperform
3. Create missing high-priority transactional/commercial pages
4. Create informational pillar content for topical authority
5. Build out long-tail cluster pages

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Seed keyword too broad | Ask the user to confirm scope. A seed like "marketing" generates thousands of clusters. Recommend narrowing to a sub-topic. |
| No search volume data available | Work from semantic analysis alone. Note that volume estimates are absent and recommend validating with Google Search Console or keyword tools. |
| All clusters already covered | Report that the site has good coverage. Shift focus to: optimize underperforming pages, build authority links, improve content depth. |
| Heavy cannibalization found | Prioritize consolidation before creating new content. Creating more pages in a cannibalized topic worsens the problem. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| SEO strategy and roadmap | `/seo plan` |
| Content quality for cluster pages | `/seo content` |
| Competitor comparison cluster pages | `/seo competitor-pages` |
| Programmatic SEO for large clusters | `/seo programmatic` |
| SXO — matching intent to experience | `/seo page` |
| Full site audit | `/seo audit` |
