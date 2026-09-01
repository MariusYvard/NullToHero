---
name: motion-design
description: "Exit animations are faster than entrances - use ~75% of enter duration (L-MOTION-6)."
version: 1.9.1
---

# Motion Design

## Duration: The 100/300/500 Rule

Canonical law: L-MOTION-1 (tools/data/laws.csv). Cite the identifier when quoting the range.

| Duration | Use Case | Examples |
|----------|----------|----------|
| **100-150ms** | Instant feedback | Button press, toggle, color change |
| **200-300ms** | State changes | Menu open, tooltip, hover states |
| **300-500ms** | Layout changes | Accordion, modal, drawer |
| **500-800ms** | Entrance animations | Page load, hero reveals |

**Exit animations are faster than entrances**, use ~75% of enter duration.

## Easing: Pick the Right Curve

**Don't use `ease`.** Instead:

| Curve | Use For | CSS |
|-------|---------|-----|
| **ease-out** | Elements entering | `cubic-bezier(0.16, 1, 0.3, 1)` |
| **accelerate** | Elements leaving the screen (a custom curve, never the bare `ease-in` keyword) | `cubic-bezier(0.7, 0, 0.84, 0)` |
| **ease-in-out** | State toggles | `cubic-bezier(0.65, 0, 0.35, 1)` |

**For micro-interactions, use exponential curves:**

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);   /* Smooth, refined (recommended default) */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);  /* Slightly more dramatic */
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);   /* Snappy, confident */
```

**Avoid bounce and elastic curves.** They were trendy in 2015 but now feel tacky and amateurish. Real objects don't bounce when they stop, they decelerate smoothly.

## Premium Motion Materials

Transform and opacity are reliable defaults, not the whole palette. Premium interfaces often need:
- **Blur / filter / backdrop-filter**: focus pulls, depth, atmospheric transitions
- **Clip path / masks**: wipes, reveals, editorial cropping
- **Shadow / glow / color filters**: energy, affordance, warmth, active state
- **Grid-template rows or FLIP-style transforms**: expanding and reflowing layout without animating `height`

The hard rule is not "transform and opacity only." The hard rule is: avoid animating layout-driving properties casually (`width`, `height`, `top`, `left`, margins), keep expensive effects bounded to small or isolated areas, and verify in-browser that the result is smooth.

## Staggered Animations

Use CSS custom properties for cleaner stagger: `animation-delay: calc(var(--i, 0) * 50ms)` with `style="--i: 0"` on each item. **Cap total stagger time**, 10 items at 50ms = 500ms total.

## Reduced Motion

This is not optional. Vestibular dysfunction was measured in 35.4% of US adults aged 40 and over, about 69 million people ([Agrawal et al., Archives of Internal Medicine, 2009](https://pubmed.ncbi.nlm.nih.gov/19468085/), NHANES 2001-2004). That figure is US-only and comes from a balance test, not a diagnosis count. For parallax-specific reduced-motion patterns plus the manual toggle required by WCAG 2.2.2, see [parallax.md](parallax.md).

Substitute, never strip: under `prefers-reduced-motion: reduce`, swap the movement for a
crossfade of about 200ms rather than a blanket `animation: none`, which removes the feedback
along with the motion and leaves state changes unannounced.

## Perceived Performance

**The 80ms threshold**: Anything under 80ms feels instant and simultaneous. This is your target for micro-interactions.

**Optimistic UI**: Update the interface immediately, handle failures gracefully. Use for low-stakes actions; avoid for payments or destructive operations.

**Caution**: Too-fast responses can decrease perceived value. Users may distrust instant results for complex operations.

---

**Avoid**: Animating everything (animation fatigue is real). Using >300ms for UI feedback (L-MOTION-1; modals and drawers may take up to 500ms). Ignoring `prefers-reduced-motion`. Using animation to hide slow loading.

For sites to source this from at build time, see [resource-recommendations.md](resource-recommendations.md).
