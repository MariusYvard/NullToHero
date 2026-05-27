---
name: seo-hreflang
description: >
  Hreflang and international SEO audit, validation, and generation. Detects
  common mistakes, validates language/region codes, generates correct hreflang
  tags. Use for: "hreflang", "international SEO", "multilingual site", "language
  targeting", "hreflang errors", "x-default", "multi-language", "country targeting".
version: 1.0.0
user-invocable: true
argument-hint: "[url]"
---

# Hreflang / International SEO

## When hreflang is needed

Implement hreflang when:
- The same content exists in multiple languages (e.g., `/en/about/` and `/fr/about/`)
- The same language targets different regions (e.g., `en-US` vs `en-GB` vs `en-AU`)
- You want to prevent duplicate content penalties from translated pages

Do NOT implement hreflang for:
- A single-language site with no regional variants
- Content that is substantially different per region (these are separate pages, not regional variants)

---

## Audit Process

### Step 1 — Detect existing hreflang implementation

Check three possible locations:

**1. HTML `<head>` (most common):**
```html
<link rel="alternate" hreflang="en" href="https://example.com/en/page/">
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page/">
<link rel="alternate" hreflang="x-default" href="https://example.com/en/page/">
```

**2. HTTP response headers:**
```
Link: <https://example.com/en/page/>; rel="alternate"; hreflang="en",
      <https://example.com/fr/page/>; rel="alternate"; hreflang="fr"
```

**3. XML sitemap:**
```xml
<url>
  <loc>https://example.com/en/page/</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/page/"/>
  <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/page/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/en/page/"/>
</url>
```

### Step 2 — Validate language and region codes

**Language codes** use ISO 639-1 (2-letter):
`en`, `fr`, `de`, `es`, `pt`, `it`, `nl`, `ja`, `zh`, `ko`, `ar`, `ru`, `pl`, `sv`, `da`, `fi`, `nb`, `tr`

**Region codes** use ISO 3166-1 alpha-2:
`US`, `GB`, `CA`, `AU`, `FR`, `DE`, `ES`, `MX`, `BR`, `IN`, `JP`, `CN`, `KR`, `AE`

**Combined format:** `language-REGION` (both parts required when targeting regions):
`en-US`, `en-GB`, `en-AU`, `fr-FR`, `fr-CA`, `es-ES`, `es-MX`, `pt-BR`, `pt-PT`, `zh-CN`, `zh-TW`

**`x-default`** — for users that don't match any specific language/region. Usually points to the homepage or a language selector page.

**Invalid codes to flag:**
- `en-uk` → should be `en-GB` (region must be uppercase)
- `zh` alone for Chinese (ambiguous — use `zh-CN` or `zh-TW`)
- `iw` → use `he` (Hebrew)
- `ji` → use `yi` (Yiddish)
- `in` → use `id` (Indonesian)

### Step 3 — Check for common errors

**Error 1: Missing return tags**

Every page in the hreflang set must link to ALL other pages in the set, including itself. If page A links to page B, page B must also link back to page A.

```
Page A (/en/) must declare:
  - hreflang="en" pointing to /en/
  - hreflang="fr" pointing to /fr/
  - hreflang="x-default" pointing to /en/

Page B (/fr/) must declare the same set.
```

Missing return tag = Google ignores the entire hreflang annotation for that page.

**Error 2: Hreflang not self-referencing**

Each page must include a `hreflang` tag pointing to itself.
```html
<!-- On https://example.com/en/page/ -->
<link rel="alternate" hreflang="en" href="https://example.com/en/page/">  ← self-reference required
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page/">
```

**Error 3: HTTP/HTTPS mismatch**

All URLs in a hreflang set must use the same protocol. Mixed http/https = broken signal.

**Error 4: Canonical conflicts**

The canonical tag on each page must point to the page itself (self-canonical), not to the default language version. If `/fr/page/` has a canonical pointing to `/en/page/`, Google will index only the English version.

**Error 5: Returning 4xx/5xx URLs**

Every URL referenced in a hreflang annotation must return a 200. Non-200 URLs are ignored.

**Error 6: Using `x-default` as a generic fallback for all language combinations**

`x-default` is for users that don't match any of the explicitly listed language/region combinations. It should typically point to a language selector or the most dominant language version.

**Error 7: Inconsistent annotation method**

Using both HTML tags AND sitemap annotations for the same site can cause conflicts. Pick one method and apply it consistently.

---

## Generation

### Setup questions before generating

1. How many languages/regions does the site target?
2. What is the URL structure? (subdomain `fr.example.com`, subdirectory `/fr/`, ccTLD `example.fr`)
3. Is there a "default" page for users whose language isn't covered?

### URL structure options

| Structure | Example | Pros | Cons |
|-----------|---------|------|------|
| Subdirectory | `example.com/fr/` | Easy to implement, shared domain authority | Slightly lower regional signal than ccTLD |
| Subdomain | `fr.example.com` | Clear separation | Treated somewhat as separate site |
| ccTLD | `example.fr` | Strongest regional signal | Expensive, requires separate domain per country |

**Recommendation for most sites:** Subdirectory (`/en/`, `/fr/`, `/de/`) — simplest to manage, shares domain authority.

### Generated hreflang annotations

For a site with English (US default), French (France), and German:

```html
<!-- On /en/ (or homepage) -->
<link rel="alternate" hreflang="en-US" href="https://example.com/en/">
<link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/">
<link rel="alternate" hreflang="de-DE" href="https://example.com/de/">
<link rel="alternate" hreflang="x-default" href="https://example.com/en/">
```

### Sitemap implementation (for large sites)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://example.com/en/about/</loc>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://example.com/en/about/"/>
    <xhtml:link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/a-propos/"/>
    <xhtml:link rel="alternate" hreflang="de-DE" href="https://example.com/de/ueber-uns/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/en/about/"/>
  </url>
</urlset>
```

---

## Output

### Hreflang Audit Results

**Languages/regions detected:** [list]
**Implementation method:** HTML / HTTP headers / Sitemap

| Error Type | Count | Affected URLs |
|-----------|-------|--------------|
| Missing return tags | X | [list] |
| Missing self-reference | X | [list] |
| Invalid language/region codes | X | [list] |
| HTTP/HTTPS mismatch | X | [list] |
| Canonical conflicts | X | [list] |
| Non-200 referenced URLs | X | [list] |

**Priority fixes (in order)**

### Generated Code
Ready-to-use hreflang annotations for all pages (HTML `<link>` tags or sitemap XML).

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No hreflang found on multilingual site | Generate complete implementation. Confirm URL structure with user. |
| Only some pages have hreflang | Identify the gap. All pages in a language set must be annotated, not just some. |
| Machine-translated content flagged | Note that Google may identify thin machine-translated content. Recommend human editing at minimum. |
| ccTLD setup | Validate each domain separately. Each ccTLD needs its own hreflang pointing to the others. |

## CROSS-SKILL REFERENCES

| Need | Skill |
|------|-------|
| Sitemap with hreflang | `/seo sitemap` |
| Technical audit (canonical conflicts) | `/seo technical` |
| Content quality for translated pages | `/seo content` |
| Full site audit | `/seo audit` |
