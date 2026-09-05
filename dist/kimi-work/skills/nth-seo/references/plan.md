---
name: seo-plan
description: >
  Strategic SEO planning for new or existing websites. Industry-specific
  templates (SaaS, e-commerce, local, publisher, agency), competitive analysis,
  content strategy, implementation roadmap. Use for: "SEO strategy", "SEO plan",
  "content roadmap", "keyword strategy", "site planning".
version: 1.9.1
---

# Strategic SEO Planning

## Process

The order is the method, not a presentation convenience. Architecture is designed before any content is written, so pages are planned rather than accumulated. The technical foundation is set after the editorial strategy, so schema, performance budgets and AI-search readiness are chosen for pages that already exist on paper.

### 1. Discovery
- Business type, target audience, competitors, goals
- Current site assessment (if it exists), budget and timeline constraints
- Key performance indicators agreed before any work starts

### 2. Competitive Analysis
- Top 5 competitors: content strategy, schema usage, technical setup
- Keyword and content gaps against them
- E-E-A-T signals they carry and the site does not

### 3. Architecture Design
- Load industry template from `plan-assets/`
- URL hierarchy, content pillars, internal linking strategy
- Sitemap structure with quality gates applied
- Information architecture for user journeys

### 4. Content Strategy
- Page types and estimated counts, content gaps vs competitors
- Blog/resource topics and publishing cadence
- E-E-A-T building plan (author bios, credentials, experience signals)
- Content calendar with priorities

### 5. Technical Foundation
- Schema markup plan per page type
- Core Web Vitals baseline targets
- Hosting and performance requirements
- AI search readiness and mobile-first considerations

### 6. Implementation Roadmap (4 phases)

- Phase 1, weeks 1-4, foundation: technical setup, core pages, essential schema, analytics.
- Phase 2, weeks 5-12, expansion: content for primary pages, blog launch, internal linking.
- Phase 3, weeks 13-24, scale: advanced content, outreach, GEO, performance work.
- Phase 4, months 7-12, authority: thought leadership, PR, advanced schema, continuous optimization.

## Output

### Deliverables
- `SEO-STRATEGY.md`: Complete strategic plan
- `COMPETITOR-ANALYSIS.md`: Competitive insights
- `CONTENT-CALENDAR.md`: Content roadmap
- `IMPLEMENTATION-ROADMAP.md`: Phased action plan
- `SITE-STRUCTURE.md`: URL hierarchy and architecture

### KPI Targets
| Metric | Baseline | 3 Month | 6 Month | 12 Month |
|--------|----------|---------|---------|----------|
| Organic Traffic | ... | ... | ... | ... |
| Keyword Rankings | ... | ... | ... | ... |
| Search Console impressions | ... | ... | ... | ... |
| Indexed Pages | ... | ... | ... | ... |
| Core Web Vitals | ... | ... | ... | ... |

## Error Handling

| Scenario | Action |
|----------|--------|
| Unrecognized business type | Fall back to `generic.md` template. Inform user that no industry-specific template was found and proceed with the general business template. |
| No website URL provided | Proceed with new-site planning mode. Skip current site assessment and competitive gap analysis that require a live URL. |
| Industry template not found | Check `plan-assets/` for available templates. If the requested template file is missing, use `generic.md` and note the missing template in output. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|---------------|-------|
| SEO audit to inform strategy | `/nth-seo audit` |
| Keyword clustering for the content plan | `/nth-seo cluster` |
| Programmatic SEO strategy | `/nth-seo programmatic` |
| Site architecture & build | `/nth-siteasy build` |

The plugin carries no SERP data feed and does not produce content. Search volumes, ranking positions, competitor traffic estimates and finished copy are outside what it can observe, so it states none of them: pull the figures from Search Console or a dedicated tool and bring them into the plan as inputs.

## Industry templates

Load the matching plan template before drafting: [saas](plan-assets/saas.md) · [ecommerce](plan-assets/ecommerce.md) · [local-service](plan-assets/local-service.md) · [publisher](plan-assets/publisher.md) · [agency](plan-assets/agency.md) · [generic](plan-assets/generic.md).
