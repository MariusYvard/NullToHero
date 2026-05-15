# Information Architecture

IA is the invisible structure that determines whether users can find what they need. Navigation is the visible manifestation. Both must match the user's mental model, not the org chart.

Use this reference for any project that ships more than five distinct pages, any restructuring of a site map, any debate about menu labels, and any complaint that users "cannot find" something. Pair with [ux-research.md](ux-research.md), [shape.md](shape.md), and [layout.md](layout.md).

## Core Distinction: Findability vs Discoverability

These are different problems and need different solutions.

| Concept | Definition | Test | Solution lever |
|---|---|---|---|
| Findability | Can a user locate something they are actively looking for? | Tree testing, search analytics | Clear hierarchy, search, breadcrumbs |
| Discoverability | Can a user encounter something they did not know existed? | Behavioral analytics, exit surveys | Surfacing, recommendation, onboarding |

A site can be highly findable but undiscoverable (every feature exists but only experts know about it). It can be highly discoverable but unfindable (the homepage shows everything, the user cannot return to a specific item later).

## Mental Models

A mental model is the user's pre-existing belief about how a system works. IA must align with the dominant mental model of the target segment, or pay a perpetual training cost.

Methods to surface mental models:
- Card sorting (open mode reveals natural categorization)
- Free-listing ("Tell me everything you would expect to find on this site")
- Verbatim analysis of support tickets and search queries
- Competitive analysis of how the segment's existing tools structure information

Conflicting mental models within the same audience signal segmentation. Either pick the dominant model and onboard the rest, or design two distinct entry experiences.

## Structural Patterns

| Pattern | Use when | Avoid when |
|---|---|---|
| Hierarchical (tree) | Content has clear parent-child relationships | Items belong to multiple categories |
| Faceted | Items have multiple independent attributes (price, color, brand) | Few attributes, low item count |
| Sequential | Linear flow with a beginning and end (checkout, onboarding) | Free exploration is desired |
| Database | Item-centric, search-first | Browsing is the primary mode |
| Networked | Items connect by relationships (wiki, knowledge graph) | A clear hierarchy is needed for new users |

Most real sites are hybrids. A site can have a hierarchical primary navigation and a faceted browse experience inside a category.

## Card Sorting

Used during Discovery and Exploration. See [ux-research.md](ux-research.md) for protocol.

Output: a dendrogram showing which cards cluster, and a tree of candidate categories.

Interpret with caution:
- High agreement (above 60 percent) on a cluster is a strong signal.
- Low agreement signals that the items do not naturally group, the labels are ambiguous, or the participants represent different mental models.
- The category labels users invent are often better than the team's labels. Steal them verbatim.

## Tree Testing

Used during Testing. Validates whether the chosen IA actually delivers.

Run after card sorting and before high-fidelity design. Cheap to fix at this stage, expensive after launch.

Pass thresholds:
- Directness above 70 percent (users find target on first attempt without backtracking).
- Success above 85 percent (users find target eventually).
- Time-to-find within the segment's tolerance (varies by domain, benchmark against competitors).

If a target fails: rename labels, restructure parents, or surface a shortcut from the homepage.

## Navigation Patterns

### Primary navigation

Limit to 5 to 7 items. Beyond that, the cognitive cost of scanning the menu exceeds the value of having more options visible.

| Pattern | Strengths | Trade-offs |
|---|---|---|
| Horizontal top bar | Familiar, persistent, fast scanning | Limited item count, mobile collapse required |
| Vertical sidebar | Scales to more items, persistent | Steals horizontal space, less common in consumer sites |
| Mega menu | Deep navigation in one click | Heavy, hover-dependent, accessibility burden |
| Hamburger menu | Conserves space | Hides navigation, reduces engagement on desktop |
| Tabbed | Distinct sections, mutually exclusive | Limited depth, not for browsing |

Mobile-first navigation: design the constrained version first, then expand. A hamburger that hides 12 items is failing the user, not solving for space.

### Secondary navigation

For deep sites, secondary navigation supports drilling into a section.

Patterns:
- Sidebar with current-section context
- Breadcrumbs (mandatory for anything deeper than 3 levels)
- Tabs within a section
- In-page anchor navigation for long documents

### Breadcrumbs

Mandatory above 3 levels of depth. Two forms:

| Form | Use case |
|---|---|
| Location | "Home > Category > Subcategory > Item". Shows where you are in the tree |
| Path | "Home > Search results > Item". Shows how you got here |

Location is more useful in most sites. Path is useful in transactional flows where users want to return to a prior step.

Avoid breadcrumbs that show only one or two levels. They are visual debt.

### Footer

The footer is the secondary site map. Use it for:
- Discoverability of pages that do not fit the primary nav (about, legal, careers)
- Crawlability for SEO (see [../../seo/references/technical.md](../../seo/references/technical.md))
- Recovery for users who reach the bottom without finding what they need

A "fat footer" with grouped link lists is better than a thin footer for sites with depth.

### Search

Required when:
- Item count exceeds 50 distinct pages or products
- The dominant access mode is item-centric, not browse-centric
- Users know exactly what they want but the IA does not surface it in one click

Quality search needs:
- Autocomplete and suggested queries
- Forgiving matching (typos, synonyms, plurals)
- Faceted filtering on results
- Analytics on zero-result queries (these are IA gaps)

## Labeling

Labels carry the most weight in IA. A good structure with bad labels still fails.

Rules:
- Use the user's vocabulary, not the org's. "Get a quote" beats "Pricing inquiries".
- Verbs for actions, nouns for content. "Download report" vs "Reports".
- Avoid clever labels. "Our story" is universal, "The roots" is opaque.
- Test labels in tree testing before committing.
- Run a search log analysis on the existing site or a competitor's to find the actual queries.

## URL Structure as IA

URLs are part of IA. They are bookmarkable, shareable, and crawled.

Rules:
- Reflect hierarchy: `/products/shoes/running` not `/p/12345`.
- Use hyphens, not underscores or camelCase.
- Lowercase always.
- Stable. URLs should not change when the IA shifts. Use redirects, never break inbound links.
- Avoid trailing slashes inconsistently. Pick one and enforce.

See [../../seo/references/technical.md](../../seo/references/technical.md) for SEO implications.

## Audit Checklist

When critiquing an IA:

1. Can a user complete the primary task in three clicks from any entry point?
2. Are the primary nav labels recognizable without explanation?
3. Are there fewer than 8 primary nav items?
4. Does the structure pass tree testing at 85 percent success?
5. Are there breadcrumbs everywhere depth exceeds 3 levels?
6. Does the footer cover what the primary nav cannot?
7. Are URLs stable, lowercase, hyphenated, and hierarchical?
8. Is search present where item count justifies it?
9. Are zero-result queries analyzed monthly?
10. Are mobile and desktop IA in parity, not stripped versions of each other?

A site that fails three or more is due for restructuring, not a redesign.

## Anti-Patterns

- Mega menus with 6 columns of 12 links. Discovery overload, no hierarchy.
- Search hidden behind an icon as the only access mode. Discoverability suffers.
- Different IA on mobile and desktop. Users get lost when switching devices.
- "Resources" or "Solutions" as primary nav items. Empty containers users do not click.
- Submenus that require hover precision. Accessibility failure plus mobile breakage.
- A "Home" link in the primary nav. The logo already does this; "Home" wastes a slot.

## Cross-References

- Research methods for IA discovery: [ux-research.md](ux-research.md)
- Persona-driven IA evaluation: [personas.md](personas.md)
- Layout grammar and rhythm: [layout.md](layout.md)
- Form patterns and flow navigation: [form-patterns.md](form-patterns.md)
- SEO and URL conventions: ../../seo/references/technical.md
