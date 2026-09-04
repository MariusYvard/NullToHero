---
name: brand
description: "When design IS the product: brand sites, landing pages, marketing surfaces, campaign pages, portfolios, long-form content, about pages. The deliverable is the design itself - a visitor's impression is the thing being made."
version: 1.9.0
---

# Brand register

When design IS the product: brand sites, landing pages, marketing surfaces, campaign pages, portfolios, long-form content, about pages. The deliverable is the design itself — a visitor's impression is the thing being made.

The register spans every genre. A tech brand (Stripe, Linear, Vercel). A luxury brand (a hotel, a fashion house). A consumer product (a restaurant, a travel site, a CPG packaging page). A creative studio, an agency portfolio, a band's album page. They all share the stance — *communicate, not transact* — and diverge wildly in aesthetic. Don't collapse them into a single look.

## The brand slop test

If someone could look at this and say "AI made that" without hesitation, it's failed. The bar is distinctiveness — a visitor should ask "how was this made?", not "which AI made this?"

Brand isn't a neutral register. AI-generated landing pages have flooded the internet, and average is no longer findable. Restraint without intent now reads as mediocre, not refined. Brand surfaces need a POV, a specific audience, a willingness to risk strangeness. Go big or go home.

**The second slop test: aesthetic lane.** Before committing to moves, name the reference. A Klim-style specimen page is one lane; Stripe-minimal is another; Liquid-Death-acid-maximalism is another. Don't drift into editorial-magazine aesthetics on a brief that isn't editorial. A hiking brand with Cormorant italic drop caps has the wrong register within the register.

## Typography

### Font selection procedure

Every project. Never skip.

1. Read the brief. Write three concrete brand-voice words — not "modern" or "elegant," but "warm and mechanical and opinionated" or "calm and clinical and careful." Physical-object words.
2. List the three fonts you'd reach for by reflex. If any appear in the reflex-reject list below, reject them — they are training-data defaults and they create monoculture.
3. Browse a real catalog (Google Fonts, Pangram Pangram, Future Fonts, Adobe Fonts, ABC Dinamo, Klim, Velvetyne) with the three words in mind. Find the font for the brand as a *physical object* — a museum caption, a 1970s terminal manual, a fabric label, a cheap-newsprint children's book, a concert poster, a receipt from a mid-century diner. Reject the first thing that "looks designy."
4. Cross-check. "Elegant" is not necessarily serif. "Technical" is not necessarily sans. "Warm" is not Fraunces. If the final pick lines up with the original reflex, start over.

### Reflex-reject list

Training-data defaults. Ban list — look further:

Fraunces · Newsreader · Lora · Crimson · Crimson Pro · Crimson Text · Playfair Display · Cormorant · Cormorant Garamond · Syne · IBM Plex Mono · IBM Plex Sans · IBM Plex Serif · Space Mono · Space Grotesk · Inter · DM Sans · DM Serif Display · DM Serif Text · Outfit · Plus Jakarta Sans · Instrument Sans · Instrument Serif

### Pairing and voice

Distinctive + refined is the goal — the specific shape depends on the brand:

- **Editorial / long-form / luxury**: display serif + sans body (a magazine shape).
- **Tech / dev tools / fintech**: one committed sans, usually; custom-tight tracking, strong weight contrast inside a single family.
- **Consumer / food / travel**: warmer pairings, often a humanist sans plus a script or display serif.
- **Creative studios / agencies**: rule-breaking welcome — mono-only, or display-only, or custom-drawn type as voice.

Two families minimum is the rule *only* when the voice needs it. A single well-chosen family with committed weight/size contrast is stronger than a timid display+body pair.

Vary across projects. If the last brief was a serif-display landing page, this one isn't.

### Scale

Modular scale, fluid `clamp()` for headings, ≥1.25 ratio between steps. Flat scales (1.1× apart) read as uncommitted.

Light text on dark backgrounds: add 0.05–0.1 to line-height. Light type reads as lighter weight and needs more breathing room.

## Color

Brand surfaces have permission for Committed, Full palette, and Drenched strategies. Use them. A single saturated color spread across a hero is not excess — it's voice. A beige-and-muted-slate landing page ignores the register.

- Name a real reference before picking a strategy. "Klim Type Foundry #ff4500 orange drench", "Stripe purple-on-white restraint", "Liquid Death acid-green full palette", "Mailchimp yellow full palette", "Condé Nast Traveler muted navy restraint", "Vercel pure black monochrome". Unnamed ambition becomes beige.
- Palette IS voice. A calm brand and a restless brand should not share palette mechanics.
- When the strategy is Committed or Drenched, the color is load-bearing. Don't hedge with neutrals around the edges — commit.
- Don't converge across projects. If the last brand surface was restrained-on-cream, this one is not.

## Layout

- Asymmetric compositions are one option. Break the grid intentionally for emphasis.
- Fluid spacing with `clamp()` that breathes on larger viewports. Vary for rhythm — generous separations, tight groupings.
- Alternative: a strict, visible grid as the voice (brutalist / Swiss / tech-spec aesthetics). Either asymmetric or rigorously-gridded can be "designed" — the failure mode is splitting the difference into a generic centered stack.
- Don't default to centering everything. Left-aligned with asymmetric layouts feels more designed; a strict grid reads as confident structure. A centered-stack hero with icon-title-subtitle cards reads as template.
- When cards ARE the right affordance, use `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` — breakpoint-free responsiveness.

## Imagery

Brand surfaces lean on imagery. A restaurant, hotel, magazine, or product landing page without any imagery reads as incomplete, not as restrained. A solid-color rectangle where a hero image should go is worse than a representative stock photo.

**When the brief implies imagery (restaurants, hotels, magazines, photography, hobbyist communities, food, travel, fashion, product), you must ship imagery.** Zero images is a bug, not a design choice. "Restraint" is not an excuse.

- **For greenfield work without local assets, use seeded placeholder imagery that never 404s.** The URL shape is `https://picsum.photos/seed/{descriptive-words}/1600/900`. Choose seed words for the brand's physical object (`handmade-pasta-wooden-table`), not the generic category. Never substitute colored `<div>` placeholders.
- **Search for the brand's physical object**, not the generic category: "handmade pasta on a scratched wooden table" beats "Italian food"; "cypress trees above a limestone hotel facade at dusk" beats "luxury hotel".
- **One decisive photo beats five mediocre ones.** Hero imagery should commit to a mood; padding with more stock doesn't rescue an indecisive one.
- **Alt text is part of the voice.** "Coastal fettuccine, hand-cut, served on the terrace" beats "pasta dish".

Tech / dev-tool brands are the exception where zero imagery can be correct — a developer landing page often carries its voice through typography, code samples, diagrams. Know which kind of brand you're working on.

## Motion

- One well-orchestrated page-load with staggered reveals beats scattered micro-interactions — when the brand invites it. Tech-minimal brands often skip entrance motion entirely; the restraint is the voice.
- For collapsing/expanding sections, transition `grid-template-rows` rather than `height`.

## The current generated-design defaults, and why this list carries a date

Observed August 2026. Every entry below is a look that is legitimate for some briefs and that
appears regardless of brief, which is what makes it a default rather than a choice.

**The warm-cream editorial palette.** A cream ground around `#F4F1EA`, `#f5f1ea` or `#faf7f1`, a
high-contrast display serif, a terracotta or rust accent near `#b6553a`, near-black text around
`#1a1714`. This one is triangulated: three projects with no relationship to each other named the
same palette independently within months, Anthropic's frontend-design skill in its June 2026
rewrite, Impeccable's `ai-color-palette` detector rule, and Taste Skill's premium-consumer ban
which lists seven grounds and six accents by hex. Three unconnected observers converging on one
palette is the strongest evidence available in this domain, and stronger than anything else on
this page.

**The eyebrow above every heading.** A small uppercase tracked label sitting over each section
title, encoding nothing. Two of those three projects treat it as a primary tell and disagree only
on the remedy: Impeccable bans it outright and says no brief earns it back, Taste Skill caps it at
one per three sections and counts them mechanically. Our position is the cap, not the ban, because
an eyebrow that carries a real sequence marker or a genuine category is doing work. The test is
countable: if more than a third of the sections carry one, they are decoration.

**The near-black page with one acid accent.** Near-black ground, a single acid green or vermilion
accent, nothing else. Fine as a deliberate register, and it arrives unprompted on briefs that never
asked for it.

**Fraunces and Instrument Serif as the reflex display face.** Both are good typefaces. Both are the
first thing reached for, which is the problem. If the pick survives the cross-check in the
Typography section above, keep it.

### Why the date matters more than the list

Anthropic's frontend-design skill of November 2025 prescribed bold, maximalist, high-contrast
editorial work. Its June 2026 rewrite names the warm-cream editorial look as an anti-pattern. The
remedy of one release became the symptom of the next, in roughly seven months, because a
prescription that spreads becomes the new distribution.

So this section has a shelf life of about two release cycles. Re-verify it, do not inherit it: run
a handful of briefs through a current model with no styling guidance and look at what it reaches
for unprompted. What it produces is this list. If what you observe no longer matches what is
written here, the list is what is wrong.

## Brand bans (on top of the shared absolute bans)

- Monospace as lazy shorthand for "technical / developer." If the brand isn't technical, mono reads as costume.
- Large rounded-corner icons above every heading. Screams template.
- Single-family pages that picked the family by reflex, not voice. (A single family chosen deliberately is fine.)
- All-caps body copy. Reserve caps for short labels and headings.
- Timid palettes and average layouts. Safe = invisible.
- Zero imagery on a brief that implies imagery (restaurant, hotel, food, travel, fashion, photography, hobbyist). Colored blocks where a hero photo belongs.
- Defaulting to editorial-magazine aesthetics (display serif + italic + drop caps + broadsheet grid) on briefs that aren't magazine-shaped. Editorial is ONE aesthetic lane, not the default brand aesthetic.

## Brand permissions

Brand can afford things product can't. Take them.

- Ambitious first-load motion. Reveals, scroll-triggered transitions, typographic choreography.
- Single-purpose viewports. One dominant idea per fold, long scroll, deliberate pacing.
- Typographic risk. Enormous display type, unexpected italic cuts, mixed cases, hand-drawn headlines, a single oversize word as a hero.
- Unexpected color strategies. Palette IS voice — a calm brand and a restless brand should not share palette mechanics.
- Art direction per section. Different sections can have different visual worlds if the narrative demands it. Consistency of voice beats consistency of treatment.

For award-level art direction principles (Awwwards criteria, signature moments, submission strategy), see [art-direction.md](art-direction.md).
