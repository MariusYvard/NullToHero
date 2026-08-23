---
name: cms-carve
version: 1.0.0
description: >
  Turning hardcoded HTML prose into editable fields: what the extraction takes,
  what it refuses, how it names things, and what to read back before writing.
  Backs /cms carve and step 2 of /cms entrust.
---

# Carving a site into fields

`content-carve.mjs` reads a finished HTML site and proposes one content file per
page plus the same pages with a token where each editable value used to be. It
reads the tree in Chromium, which `playwright` installs for the rendered rules,
and refuses loudly when playwright is missing rather than falling back to a
regular expression that would misread nested markup.

## What it takes

An element with no element inside it, carrying text, inside `<main>`, and one of
`p li h1..h6 figcaption dt dd blockquote summary span a button strong em time
address`. Plus every `img`, as two fields: the source and the alt text.

## What it refuses, and why that is the point

- **Anything outside `<main>`.** The navigation and the footer belong to a shared
  entry, not to a page. A site that has no `<main>` gets the whole document, which
  is right on a one-entry page and a guess on any other.
- **Anything inside a `<nav>`.** Those are landmarks.
- **Any passage carrying a tag inside its own text.** A paragraph holding a link,
  an address broken by a `<br>`. Editing it would mean writing HTML in a form. The
  build marks these in the preview with `data-nth-fixed`, and the editor explains
  them in the site's language, so the owner learns why they cannot touch that
  sentence instead of reading it as a defect.

The blunt rule (no element children at all, rather than no children carrying
text) is deliberate. The subtler rule accepts elements whose text the file does
not hold contiguously, and those cannot be put back where they came from.

## Lines, and why a `<br>` is not markup

An address and a set of opening hours are the two things a shop owner most wants
to change, and both are written as lines separated by `<br>`. Freezing the whole
block over its separators would hand back a site whose telephone number is the
one thing nobody can edit, which is the opposite of the point.

So a block carrying breaks is cut on them, and each line becomes a field when it
is simple enough to be put back where it came from: plain text, or a single
element carrying nothing but text, which is what a telephone number inside a
`tel:` link looks like. A line holding two elements, or text wrapped around one,
freezes the whole block again. That rule is what keeps every field contiguous in
the file, and contiguity is what lets the token go back exactly where the value
was.

One consequence worth stating. When a value appears twice, once in an attribute
and once as the text, an email address inside a `mailto:` link being the usual
case, the token goes on the text. Putting it in the attribute would hand the
owner a field that edits the link and leaves the visible address frozen, and the
divergence would only show the day someone changed it.

## Shared content

Nothing outside `<main>` is extracted from a page, so the footer's telephone
number, opening hours and address stay hardcoded. They do not belong to a page:
they belong to all of them.

    node "${CLAUDE_PLUGIN_ROOT}/tools/cms/content-carve.mjs" . --shared boutique --write

With `--shared`, the fragments (any HTML file with no document around it, which
is what a shared component is) are carved into one entry of that name, each under
a box named after its file: `components/footer.html` gives
`{{boutique.footer.adresse}}`. Several fragments share the entry, so the content
file is completed rather than rewritten, and the footer does not erase the
navigation.

Without `--shared`, fragments are left alone. A namespace for shared content is a
decision about the site, not something an extractor should invent.

A navigation is still skipped, breaks or not. Its links are landmarks, and a menu
label that a client can change while the URL stays put is a trap rather than a
feature.

## How it names

The box is the nearest `section`, `article`, or element with an id, because that
is the unit the editor folds. Its key comes from the id, then from its heading,
then from its first class. The field name comes from the tag: `titre` for a
heading, `bouton` for a link or a button, `element` for a list item, `texte`
otherwise, numbered `_2`, `_3` when a box holds several of the same kind.

This is mechanical, and it shows. On a real site the difference between the
generated names and hand-chosen ones is the difference between `atelier.texte_2`
and `atelier.description`. Rename in `CONTENT.md` and in the JSON before the
client ever sees them, or accept the mechanical names and spend the effort on the
labels, which are what the editor actually displays.

## What to read back before writing

1. **The pages that do not come back identical.** The tool refills each page from
   its own values and compares. A doubled space that HTML collapses anyway is
   benign. An entity that moved, or a value found in the wrong place, is not.
2. **The count of fixed passages.** More than a handful on one page usually means
   the markup wraps its sentences in `<span>` for styling, and the fix is in the
   template rather than in the extraction.
3. **The boxes named `bloc`, `bloc_2`, `bloc_3`.** They are sections the page gave
   no id and no heading. They will be folders with no name in the editor.
4. **The shared content.** Nothing outside `<main>` was extracted, so the footer's
   telephone number and opening hours are still hardcoded. They usually deserve
   their own entry, declared by hand in `CONTENT.md` and tokenised with a text
   editor. That is a decision, not an omission.

## Measured on a real site

Thirty-three pages of an optician's site, put back into their pre-CMS state:
704 fields, none unplaced, and thirty-two of the thirty-three pages come back
byte for byte identical after extraction then refilling. The thirty-third holds a
doubled space. The same site, migrated by hand a week earlier, produced 704 fields
too, but left 25 passages fixed where the tool leaves 37: the tool refuses to
split a sentence that carries markup, and a person will do it when it is worth it.

## After writing

The tokens are in the pages and the values are in `content/`. Nothing renders
until the build calls `nth-content.mjs`, which resolves them and writes the
preview copies. Run it before looking at the site, or every page will show its
braces.
