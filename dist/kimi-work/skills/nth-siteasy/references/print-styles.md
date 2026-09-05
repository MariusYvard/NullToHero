---
name: print-styles
description: "A print stylesheet that makes a page usable on paper and in PDF: readable ink, exposed link URLs and controlled page breaks."
version: 1.22.0
---

# Print styles

Users print pages, save them to PDF and share them offline. Without a print stylesheet the output wastes ink on dark backgrounds, hides link targets and breaks tables across pages. One `@media print` block fixes it.

## Reset ink and background

Force black text on white and drop shadows and background images so the page is legible and cheap to print.

```css
@media print {
  *, *::before, *::after { background: transparent !important; color: #000 !important; box-shadow: none !important; }
}
```

## Expose link targets

On paper a link is invisible. Print its URL after the text.

```css
@media print {
  a[href]::after { content: " (" attr(href) ")"; }
  a[href^="#"]::after, a[href^="javascript:"]::after { content: ""; }
}
```

## Control page breaks

Keep headings with their content and avoid splitting a block across a page.

```css
@media print {
  h2, h3 { break-after: avoid; }
  img, table, blockquote { break-inside: avoid; }
  p { orphans: 3; widows: 3; }
}
```

## Hide the chrome

Suppress navigation, cookie banners and share widgets that carry no meaning on paper with a print-only `display: none`.
