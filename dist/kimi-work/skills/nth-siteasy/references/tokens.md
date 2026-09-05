---
name: tokens
description: "Builds and audits design token systems. A proper token system is the foundation of every maintainable design - done right once, everything else becomes easy."
version: 1.6.0
---

# Design Token System, audit and creation

Builds and audits design token systems. A proper token system is the foundation of every maintainable design (done right once, everything else becomes easy).

## Modes

- **`--audit`** (default): Scan the project, report what's there, diagnose problems
- **`--create`**: Generate a full two-layer token file
- **`--darkmode`**: Audit or generate dark mode token coverage

## Step 1. Discover existing tokens

```bash
# Find all CSS custom properties
grep -r "^\s*--" --include="*.css" --include="*.scss" --include="*.tsx" \
  --include="*.ts" --include="*.js" -h [path] | sort | uniq

# Find token/theme/variable files
find [path] \( -name "*token*" -o -name "*theme*" -o -name "*variable*" \) \
  -not -path "*/node_modules/*" | head -20
```

Then read the conventions that govern those tokens: any charter or style guide at the root or in `docs/` (STYLEGUIDE, STYLE, CONVENTIONS, CONTRIBUTING, BRAND, DESIGN, `.editorconfig`), the class naming convention visible in the code (BEM, utility classes, CSS modules), and the fonts already loaded and used.

Project conventions are binding and outrank every generic recommendation in this reference. When a recommendation here contradicts the project's charter, the charter wins: report the conflict to the user instead of settling it silently. Never rename an existing token, never add a web font to a project that uses none, and never add motion to a project that has none, without asking first.

## Step 2. What to look for

**Problem 1: Named by value, not role**
```css
/* Bad */ --blue-500: #3b82f6;
button { background: var(--blue-500); }

/* Good */ --color-primary: var(--blue-500);
button { background: var(--color-primary); }
```

**Problem 2: Missing semantic layer.** Primitives used directly in components. When the brand colour changes, you update one semantic token. Without it, you update every component.

**Problem 3: Alpha everywhere.** `rgba(59, 130, 246, 0.1)` everywhere signals an incomplete palette. Define explicit named tokens.

**Problem 4: Magic numbers.** `margin: 13px`, `padding: 7px 11px`. Values not on a 4pt scale.

**Problem 5: Missing dark mode.** Semantic tokens with no dark mode override.

**Problem 6: Hardcoded colours in components.** Hex values outside `:root` blocks.

## Step 3. Audit report format

```markdown
## Token Audit, [project]

### What exists
- [N] CSS custom properties | [N] primitives | [N] semantic | Files: [list]

### Issues found
**Critical**
- [ ] No semantic layer: primitives used directly ([N] instances)
- [ ] [N] hardcoded hex values in components
- [ ] No dark mode tokens

**Structural**
- [ ] [N] tokens named by value (`--blue-500`) not role
- [ ] Magic numbers: `13px`, `7px`

### Score: [X]/10
### Recommendation: [Create from scratch | Refactor | Dark mode additions]
```

## Step 4. Create the token file

1. Identify brand colour from existing CSS, logo, Tailwind config, README
2. Build OKLCH palette from brand colour
3. Name neutrals with tiny brand-hued chroma (0.005 to 0.01)
4. Generate two-layer file per [design-tokens.md](design-tokens.md)
5. Write to `src/styles/tokens.css`, `styles/tokens.css`, or `app/globals.css`

Load [design-tokens.md](design-tokens.md) before generating, it contains the complete reference structure.

## Step 5. Dark mode (`--darkmode`)

1. List every semantic colour token
2. Check which have dark mode overrides
3. For missing: invert lightness (90% light → ~10% dark), keep hue/chroma + adjust
4. Generate `@media (prefers-color-scheme: dark)` block

Load [dark-mode-engineering.md](dark-mode-engineering.md) first.

Always **Write** the token file to disk, don't just show it in chat.


## Generate a starter theme

To produce a drop-in `:root` stylesheet instead of hand-writing one, run the theme generator. It emits semantic tokens, neutral and accent ramps, an elevation ramp, a fluid type scale and a print sheet, and flags any pairing that fails WCAG contrast:

```
python3 tools/design-system/scripts/theme_css.py --bg "#0B0B0C" --ink "#F5F5F4" --accent "#6E56CF" --out theme.css
```

Treat the output as a seed for DESIGN.md, then refine the palette in OKLCH. See [color-systems.md](color-systems.md) for the role of each token and [elevation.md](elevation.md) for the shadow ramp.

### The same palette, in the format the project already uses

One computation, four spellings. Emit the one the project consumes rather than making somebody re-type the palette into it, which is where the second, slightly different palette comes from.

```
python3 tools/design-system/scripts/theme_css.py --accent "#6E56CF" --format tailwind --out theme.css
python3 tools/design-system/scripts/theme_css.py --accent "#6E56CF" --format dtcg    --out tokens.json
python3 tools/design-system/scripts/theme_css.py --accent "#6E56CF" --format shadcn  --out shadcn-vars.css
```

| Format | What it writes | The trap it avoids |
|---|---|---|
| `css` (default) | `:root` custom properties | none, this is the source shape |
| `tailwind` | a v4 `@theme` block | `--spacing-*`, which is what Tailwind reads; `--space-*` generates no utility and no error |
| `dtcg` | W3C design-tokens JSON with `$value` and `$type` | the fluid type scale is omitted, because `clamp()` is not a `dimension` and a mistyped token is worse than an absent one |
| `shadcn` | the `globals.css` variable block | the brand goes to `--primary`; shadcn's `--accent` is the subtle hover surface, and putting the brand there is what makes a themed app look mis-themed |

`--destructive` is never derived. Choose it, because a destructive colour that falls out of a hue ramp reads as decoration.
