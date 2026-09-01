---
name: head-meta
description: "Document head hygiene: charset order, favicon set, web app manifest, theme-color and Open Graph basics."
version: 1.22.0
---

# Head metadata

The document head carries the signals a browser, a crawler and a social preview need before any content paints. The deterministic `head-meta` and `charset-early` checks flag the gaps; this reference is the fix.

## Charset first

Declare the encoding as the first element in the head, within the first 1024 bytes, so the parser never restarts on a late discovery.

```html
<meta charset="utf-8">
```

A missing or late `<meta charset>` lets the browser guess, which can corrupt non-ASCII text.

## Favicon set

Ship three references that cover legacy, modern and iOS surfaces.

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

A single 180 by 180 `apple-touch-icon.png` is enough for iOS. Generate the full set with a favicon generator (see references/generators data).

## Web app manifest and theme

A manifest turns the page into an installable app and colours the mobile UI chrome.

```html
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="color-scheme" content="light dark">
```

The manifest needs at minimum `name`, `icons` (192 and 512), `start_url`, `background_color` and `theme_color`. `color-scheme` lets native form controls and scrollbars follow the page theme.

## Open Graph basics

Four properties give a usable link preview. Mark a decorative preview image with an empty `og:image:alt`.

```html
<meta property="og:title" content="Page title">
<meta property="og:type" content="website">
<meta property="og:url" content="https://example.com/page">
<meta property="og:image" content="https://example.com/preview.png">
```

## What not to add

Do not add `X-UA-Compatible` (`IE=edge`). It targets a retired browser and modern boilerplates removed it. Its absence is correct, not a defect.
