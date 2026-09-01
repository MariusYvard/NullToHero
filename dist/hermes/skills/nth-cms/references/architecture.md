---
name: cms-architecture
version: 1.0.0
description: >
  How the pieces fit and why each one is shaped the way it is: the two branches,
  the bridge and its allow-list, the token's missing permission, the vendored
  editor, the token substitution, the preview. Read before changing any of them.
---

# How an entrusted site is put together

## Two branches

The bridge writes to the content branch and nowhere else. A workflow copies the
allow-listed paths from there onto the production branch, which is what the host
deploys.

It copies rather than merges. A merge would carry whatever else the content
branch happens to contain, so a rewritten `package.json` would ride in and run as
a build script in the deploy container. Walking the allow-list means the
production branch can only ever receive the paths a client may edit.

The copier lives inside the workflow YAML rather than beside it, because
`.github/workflows/` is the one path a fine-grained token without the `Workflows`
permission cannot write. GitHub's documentation does not say whether the
permission covers every file in that directory or only the YAML, so the copier
goes inside the YAML, where the answer is not in doubt. That leaves two
implementations of the same allow-list, and a fuzz test that fails if they ever
disagree.

## The bridge

A Netlify function. It holds the session, checks a CSRF header the stock proxy
backend cannot send, enforces the allow-list, the quota and the file size caps,
and speaks to GitHub with the token. Every refusal is server side. The interface
is a convenience, never a boundary.

## The editor

Decap CMS, vendored at an exact version. Not a CDN: the admin page's content
security policy then needs no external origin, and a version that moves under a
client's feet is a class of failure that cannot happen.

The browser half, `nth-backend.js`, registers a backend under a name of our own
because `registerBackend` keeps the first registration and `proxy` is taken by the
bundle itself. It also replaces the login screen, because Decap's `loginUser`
never dispatches its done action on failure and the button would spin forever
after one wrong password.

What else it does is worth knowing before touching it: it folds the form into
sections, localises three layers, shrinks images on their way out, renders the
real page as a live preview, lets text be edited in that preview, counts
characters against defensible ranges, shows the quota, marks the passages nobody
can edit, and draws the two device frames. It is one file, and it is the file that
changes most.

## The tokens

A page carries `{{file.section.field}}` and no text. `nth-content.mjs` resolves
them at build time, escaping the four characters that would otherwise break an
entity or close an attribute. A value that is neither string nor number fails the
build loudly rather than printing `[object Object]`.

The same file writes the preview copies: the page with the current entry's tokens
still in place and every other entry's resolved, because the browser fills the
first from the form on each keystroke and the second could never be edited from
the page in hand.

## The preview

A `srcdoc` iframe, same origin, assets resolved root-absolute. Clicks on links and
buttons are cancelled in the capture phase, because a click would otherwise
navigate the frame to the real site and the typing would have nothing to hold on
to. The caret still lands, because it is placed on mousedown.

The phone view keeps a 390 pixel layout width, which is what the site's media
queries read, and scales the whole device to fit the pane. The desktop view keeps
1280 pixels for the same reason: at the pane's real width a site answers with its
narrow layout, which is not what a visitor on a desktop sees.
