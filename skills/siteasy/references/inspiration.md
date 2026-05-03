# Inspiration & Reference Sources

*Curated resources for developing taste and staying current. Taste is trained by surrounding yourself with exceptional work — not by reading about it abstractly. Study these actively.*

---

## The Method: Active Studying

Don't just look at good interfaces. Dissect them.

1. **Identify what you notice first** — what is the visual entry point? Why?
2. **Slow down hover/click interactions** — open DevTools → Animations panel, set to 10% speed. What easing curve? What's the transform-origin?
3. **Inspect the computed styles** — how do they handle spacing? What token architecture?
4. **Break the layout mentally** — which CSS properties make this possible? Could you rebuild it?
5. **Note what you don't notice** — what invisible details compound into the overall feeling?

---

## Products With Exceptional Craft

### Product UI

**[Linear](https://linear.app)** — the benchmark for dense, keyboard-first product UI. Study: spacing discipline, typography hierarchy without colour overload, the speed and weight of every interaction, the empty states. Their interface at 10% animation speed is a masterclass in motion restraint.

**[Raycast](https://raycast.com)** — zero animation on the core action (open/close), perfect micro-interactions everywhere else. Study: when not to animate, command palette UX, keyboard navigation, the extension system. The home page is also exceptional brand-meets-product design.

**[Vercel](https://vercel.com)** — the dashboard and deploy flow. Study: data density without overwhelm, the balance between technical and human, dark mode done exactly right. Their Graph components are worth an hour of study alone.

**[Loom](https://loom.com)** — study the recorder chrome and the player UI. Exceptional work on something that has to feel invisible.

**[Superhuman](https://superhuman.com)** — the fastest email client. Study: loading performance as a feature, keyboard-first design, the "achievement" design that made email not depressing.

**[Notion](https://notion.so)** — not for the current UI (it's dated) but for the block editor UX. Study: how complex editing interactions are made to feel simple, drag handles, slash commands.

**[Figma](https://figma.com)** — the canvas, the properties panel, the component system. Study: how they handle infinite zoom, property panel density, multi-layer selection.

### Marketing / Brand

**[Stripe](https://stripe.com)** — the gold standard for developer-product marketing. Study: how they explain technical concepts visually, the illustration style, the gradient use (restrained and purposeful), typography scale. Every page is worth reading.

**[Clerk](https://clerk.com)** — exceptional documentation design and product marketing. Study the component playground on the homepage.

**[Resend](https://resend.com)** — clean, confident, no fluff. Study how they communicate a developer tool without being cold.

**[Supabase](https://supabase.com)** — brand that feels technical and warm simultaneously. Study: the colour strategy, the documentation design, the dashboard.

**[Lottiefiles](https://lottiefiles.com)** — animation product with exceptional animation examples. Study the motion in context.

**[Basement Studio](https://basement.studio)** — a design agency portfolio that demonstrates what's possible with creative ambition. Study the scroll interactions and 3D usage.

---

## Designers & Design Engineers to Study

**Emil Kowalski** — [@emilkowalski\_](https://x.com/emilkowalski_) — creator of Sonner and Vaul. Every post is about the details that compound. His [animations.dev](https://animations.dev) course is the best resource on UI animation. Watch how he thinks about existing UI and what he finds wrong with it.

**Rauno Freiberg** — [@raunofreiberg](https://x.com/raunofreiberg) — design engineer at Vercel. Study his UI experiments at [uiplaybook.com](https://uiplaybook.com). His work on accessibility-first components is exceptional.

**Paco Coursey** — [@pacocoursey](https://x.com/pacocoursey) — design engineer. Study [paco.me](https://paco.me) and his open-source work on cmdk and similar libraries.

**Ryan Florence / Michael Jackson** — React Router creators. Study not the visual design but how they think about API design for UI components.

**Adam Wathan** — [@adamwathan](https://x.com/adamwathan) — Tailwind CSS creator. Study how he explains the reasoning behind design decisions in CSS systems.

**Giulio Canti** — [@GiulioCanti](https://x.com/GiulioCanti) — if you want to understand type-safe component APIs at depth.

**Lee Robinson** — [@leeerob](https://x.com/leeerob) — VP Product at Vercel. Study his portfolio and blog for how a design engineer communicates their work.

---

## Component Libraries Worth Studying (Not Just Using)

**[Radix UI](https://radix-ui.com)** — the accessibility model every library should follow. Study the primitive/composed split, the data attributes for state, the CSS variable approach for animations. Read the source.

**[Base UI](https://base-ui.com)** — the successor approach from the Radix team. More opinionated, even cleaner API.

**[React Aria (Adobe)](https://react-spectrum.adobe.com/react-aria/)** — the most complete accessibility-first component library. If you want to understand what perfect keyboard and screen reader support looks like, study these. The usePress, useFocus, useHover hooks are lessons in how hard accessibility actually is.

**[Vaul](https://github.com/emilkowalski/vaul)** — Emil's drawer library. ~600 lines of source code. Read every line. The gesture handling, the snap points, the spring physics — it's a masterclass in a contained scope.

**[Sonner](https://sonner.emilkowal.ski)** — also Emil. Read the source for how toast stacking, the gap-fill trick, and timer management work.

**[cmdk](https://cmdk.paco.me)** — command menu primitive. Study the keyboard navigation model and the search implementation.

**[Motion (Framer Motion)](https://motion.dev)** — not just the library but the documentation. The examples are production-quality. Study how they animate layout changes, shared elements, and gesture interactions.

---

## Visual Inspiration Sources

**[Dribbble](https://dribbble.com)** — use it to study visual craft, not to copy. Search specifically: "dashboard dark mode", "form design", "empty state", "settings page". Filter by "Designers you follow" once you've curated your follows.

**[Awwwards](https://awwwards.com)** — higher signal-to-noise than Dribbble for web. Study the SOTD (Site of the Day) archives. Filter by category: "Portfolios" and "Apps" are most useful.

**[Godly](https://godly.website)** — curated collection of exceptional websites. Higher quality curation than Awwwards for web craft.

**[Savee](https://savee.it)** — designer-curated inspiration board. More editorial/brand-oriented.

**[Mobbin](https://mobbin.com)** — UI patterns from real mobile and web apps. Exceptional for studying how companies actually solve common problems (onboarding, empty states, error states, settings pages). Screenshot library organized by pattern and company.

---

## Technical Resources

**[Every Layout](https://every-layout.dev)** — Heydon Pickering and Andy Bell on layout. The Sidebar, Stack, Cluster, and Switcher layouts solve 90% of problems. Study the CSS reasoning behind each.

**[CSS Tricks](https://css-tricks.com)** — archive. The flexbox and grid guides are definitive references.

**[Web.dev](https://web.dev)** — Google's guides on Core Web Vitals, performance, and progressive enhancement. The LCP, CLS, and INP articles are essential.

**[Smashing Magazine](https://smashingmagazine.com)** — long-form articles. Particularly good on accessibility, forms, and CSS architecture.

**[The A11y Project](https://www.a11yproject.com)** — accessibility patterns and checklists in plain language.

**[inclusive-components.design](https://inclusive-components.design)** — Heydon Pickering's deep dives on building common components accessibly. Tabs, toggle switches, menus, tooltips — each article is definitive.

---

## Books Worth Reading

**Refactoring UI** (Adam Wathan & Steve Schoger) — the practical design handbook for engineers. Not about theory — about specific decisions and why. More useful than most design school curricula.

**The Design of Everyday Things** (Don Norman) — foundational. Affordances, signifiers, feedback, mappings. You'll see these concepts in every interface you use after reading it.

**Elements of Typographic Style** (Robert Bringhurst) — the typography bible. Dense but worth it for anyone who works with text at scale.

---

## Developing Taste Systematically

Taste is not passive. A structured practice:

**Weekly:** Subscribe to [Dense Discovery](https://www.densediscovery.com) and [Sidebar](https://sidebar.io). Spend 20 minutes actually clicking through and studying (not just skimming).

**When using any app:** Ask "what would I change and why?" Don't settle for "this feels off" — diagnose the specific cause. Is it contrast? Spacing rhythm? Motion timing? Hierarchy?

**Capture what you notice:** Screenshot good and bad patterns with a note about *why*. Revisiting your captures after 6 months is humbling and educational.

**Rebuild what impresses you:** The fastest way to understand how something works is to build it yourself. Pick one impressive interaction per week and implement it from scratch.
