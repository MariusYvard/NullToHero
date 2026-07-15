# tools

Shared helpers for NullToHero skills. Pure Node and Python standard libraries, no dependencies.

## Searchable reference index

NullToHero ships 84 reference docs. Loading the large ones whole (live.md, document.md, parallax.md) is expensive on the context window. Use the index instead:

```
node tools/build-index.mjs                                   # rebuild reference-index.json after adding refs
node tools/search-references.mjs "<query>" [--skill seo|siteasy|inspect] [--max 5]
```

The search returns the most relevant reference paths so a skill opens only what it needs. `reference-index.json` is generated; rerun `build-index.mjs` whenever reference files are added or renamed.

## data/

- `inspect-rules.csv` — Do/Don't rules with good and bad code examples (71 rules), consumable by `/inspect` as editable detection rules. Authored for NullToHero; schema and severity model inspired by ui-ux-pro-max-skill (MIT). See ../ATTRIBUTION.md.
