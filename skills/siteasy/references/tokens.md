# Design Token System — Audit & Creation

Builds and audits design token systems. A proper token system is the foundation of every maintainable design — done right once, everything else becomes easy.

## Modes

- **`--audit`** (default): Scan the project, report what's there, diagnose problems
- **`--create`**: Generate a full two-layer token file
- **`--darkmode`**: Audit or generate dark mode token coverage

## Step 1 — Discover Existing Tokens

```bash
# Find all CSS custom properties
grep -r "^\s*--" --include="*.css" --include="*.scss" --include="*.tsx" \
  --include="*.ts" --include="*.js" -h [path] | sort | uniq

# Find token/theme/variable files
find [path] \( -name "*token*" -o -name "*theme*" -o -name "*variable*" \) \
  -not -path "*/node_modules/*" | head -20
```

## Step 2 — What to Look For

**Problem 1: Named by value, not role**
```css
/* Bad */ --blue-500: #3b82f6;
button { background: var(--blue-500); }

/* Good */ --color-primary: var(--blue-500);
button { background: var(--color-primary); }
```

**Problem 2: Missing semantic layer** — Primitives used directly in components. When the brand colour changes, you update one semantic token. Without it, you update every component.

**Problem 3: Alpha everywhere** — `rgba(59, 130, 246, 0.1)` everywhere signals an incomplete palette. Define explicit named tokens.

**Problem 4: Magic numbers** — `margin: 13px`, `padding: 7px 11px`. Values not on a 4pt scale.

**Problem 5: Missing dark mode** — Semantic tokens with no dark mode override.

**Problem 6: Hardcoded colours in components** — Hex values outside `:root` blocks.

## Step 3 — Audit Report Format

```markdown
## Token Audit — [project]

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

## Step 4 — Create Token File

1. Identify brand colour from existing CSS, logo, Tailwind config, README
2. Build OKLCH palette from brand colour
3. Name neutrals with tiny brand-hued chroma (0.005–0.01)
4. Generate two-layer file per [references/design-tokens.md](references/design-tokens.md)
5. Write to `src/styles/tokens.css`, `styles/tokens.css`, or `app/globals.css`

Load [references/design-tokens.md](references/design-tokens.md) before generating — it contains the complete reference structure.

## Step 5 — Dark Mode (`--darkmode`)

1. List every semantic colour token
2. Check which have dark mode overrides
3. For missing: invert lightness (90% light → ~10% dark), keep hue/chroma + adjust
4. Generate `@media (prefers-color-scheme: dark)` block

Load [references/dark-mode-engineering.md](references/dark-mode-engineering.md) first.

Always **Write** the token file to disk — don't just show it in chat.
