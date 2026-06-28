---
name: html-report
description: "A self-contained HTML rendering of an audit. Inline CSS, no external dependencies, a score gauge, severity-colored findings and a print-friendly layout, offered alongside the Markdown report and the PDF."
version: 1.18.0
---

# HTML Report

The Markdown report is for working; the HTML report is for showing. It renders the same audit as a single file a client can open in a browser, with the score and severities carried by color and a gauge that Markdown cannot draw. Use it when the audience is non-technical or the report needs to look finished.

It is an alternative rendering of an audit already produced by `/audit`, not a new analysis. The findings are identical; only the presentation changes.

## Rules

- One file. Everything inline: no external stylesheet, no CDN, no web font, no tracking. It must open correctly with no network.
- CSS in a single `<style>` block. JavaScript only if a feature genuinely needs it, and the report must be fully readable with scripting off.
- The copy stays factual and matches the house voice. No promotional language, no emoji. Status markers (PASS, WARN, FAIL) are the only shorthand.
- It must print cleanly: a print stylesheet that drops to black on white and avoids page-breaking a table mid-row.

## Severity and score colors

Use one fixed palette so a reader learns it once. All pairings clear 4.5:1 on white.

- Critical and FAIL: deep red (`#B42318`).
- High and WARN: amber (`#B54708`).
- Medium: slate (`#475467`).
- Low: grey (`#667085`).
- Pass and Excellent: green (`#067647`).

Never carry severity by color alone. Each row also names its severity in text, so the report survives a colorblind reader and a black-and-white print.

## The score gauge

Render the overall Site Health Score as a number inside a band, not a bare figure:

- The number large, with `/100` small beside it.
- A horizontal bar or an arc filled to the score, colored by band (90+ green, 70 to 89 a neutral accent, 50 to 69 amber, below 50 red).
- The band name as text under the number (Excellent, Good, Needs work, Critical), so the color is redundant.

## Structure

1. Header: site URL, audit date, the overall score gauge, and the run mode.
2. Group summary: a small row of the three sub-scores (search visibility, defects, design) each as a labeled bar.
3. Findings by dimension: one section per agent that ran, its score, and its check table. Embed each agent's returned section verbatim, the same content as the Markdown report.
4. Action plan: the consolidated, de-duplicated fix list as a table ordered Critical, High, Medium, Low, with a severity-colored cell and a plain-text severity label.
5. Footer: how the score was computed (the fixed weights), so the number is auditable.

## Accessibility of the report itself

The report audits accessibility, so it must model it.

- Semantic structure: real headings in order, a real `<table>` with header cells for the findings.
- Text contrast at 4.5:1 throughout, including the colored severity labels.
- A visible page title and a logical reading order with no reliance on color alone.

## Template skeleton

Adapt this; keep it self-contained.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Site audit: example.com</title>
<style>
  :root { --crit:#B42318; --high:#B54708; --med:#475467; --low:#667085; --ok:#067647; --ink:#1A1A1A; --line:#E4E7EC; }
  body { font: 16px/1.6 system-ui, sans-serif; color: var(--ink); max-width: 60rem; margin: 2rem auto; padding: 0 1rem; }
  .gauge { font-size: 3.5rem; font-weight: 700; }
  .gauge small { font-size: 1rem; color: var(--low); }
  .bar { height: 10px; border-radius: 5px; background: var(--line); overflow: hidden; }
  .bar > span { display: block; height: 100%; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); }
  .sev { font-weight: 600; }
  .sev-crit { color: var(--crit); } .sev-high { color: var(--high); }
  .sev-med { color: var(--med); } .sev-low { color: var(--low); } .sev-ok { color: var(--ok); }
  @media print { body { max-width: none; } tr { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>Site audit: example.com</h1>
  <p class="gauge">82<small>/100</small></p>
  <p>Band: Good</p>
  <!-- group bars, per-dimension sections, action plan table -->
</body>
</html>
```
