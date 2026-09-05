---
name: code-quality
description: "Reviewing the robustness of emitted code, the part interface review skips. Security, performance, correctness and maintainability checks for the HTML, CSS and JavaScript a build ships, plus how to pull stack-specific rules from the bundled design-system data."
version: 1.16.0
---

# Code Quality

`/inspect review` judges interface quality: motion, accessibility, layout, tokens. This reference covers the other half, the robustness of the code that ships. A page can be visually perfect and still leak a key, block the main thread, or crash on an empty array. Run this pass on any HTML, CSS or JavaScript a build emits, before it ships.

Scope: the static front-end artifact. Server logic and architecture are out of scope. The four dimensions below are ordered by how much damage a miss does.

## Security

A static site has a small attack surface, but the misses are severe.

- External links that open a new tab carry `rel="noopener noreferrer"`. Without it the new page can reach `window.opener` and redirect the original tab.
- User-supplied or remote content is set with `textContent`, never assigned to `innerHTML`. If HTML insertion is unavoidable, sanitize first. An unescaped string is a cross-site scripting hole.
- No secret in shipped code. API keys, tokens and private endpoints belong behind a server or proxy, not in a `<script>` the browser hands to everyone. Search the bundle for `sk_`, `Bearer`, `api_key` before shipping.
- No `eval`, no `new Function(userInput)`, no `javascript:` URLs.
- Forms post over HTTPS to an absolute, expected origin. Sensitive values never land in `localStorage`, which any script on the page can read.

## Performance

Beyond the image and CLS rules the detector already enforces:

- Scripts are `defer` or `async`, or sit at the end of the body, so parsing does not block the first paint. A render-blocking `<script>` in the head is the most common needless delay.
- CSS that is not needed for the first screen is split or deferred; the critical path stays small. One large blocking stylesheet holds the whole page hostage.
- Web fonts declare `font-display: swap` so text renders immediately rather than waiting on the download.
- No request waterfall: data the first screen needs is not fetched one item at a time in a loop (the client-side N+1). Batch it.
- Event handlers on scroll, resize and input are throttled or debounced and registered `{ passive: true }` where they do not call `preventDefault`.

## Correctness and robustness

The happy path is the easy 80%. Robustness is the rest.

- Every state is designed, not just the populated one: loading, empty, error, and the zero-or-one-item edge. A list that maps straight over `items` breaks the moment `items` is `[]` or `undefined`.
- Asynchronous calls handle failure. Every `fetch` has a `catch` and a visible recovery path, not a silent dead end. Assume the network fails, the request times out, and the response is malformed.
- Optional data is guarded before access (`user?.profile?.name`), so one missing field does not throw and blank the page.
- Inputs are validated on the client for fast feedback and never trusted as the only check.
- Interactive handlers are idempotent: a double-tap, a fast resubmit, or a back-button replay does not double-charge or duplicate.

## Maintainability

- Names say what the thing is. A function named `handleClick2` is a future bug.
- A component does one thing; when it does five, it is split.
- No copy-pasted block that should be a function or a token. Duplication is where fixes go to be forgotten.
- The non-obvious carries a one-line comment explaining why, not what.
- No debug noise (`console.log`, commented-out code) in the shipped artifact.

## Stack-specific rules

The plugin ships a per-stack rule base. For the project's framework, pull its rules rather than guessing:

```
python3 tools/design-system/scripts/search.py "performance" --stack react
python3 tools/design-system/scripts/search.py "<topic>" --stack <react|nextjs|vue|svelte|astro|angular|...>
```

This surfaces the React render rules (barrel imports, memoization, `content-visibility`), the framework best practices, and the web anti-pattern set, each with a good and bad code example. Use them to ground the review in the actual stack.

## Output

Group findings by dimension, severity first, each with the fix:

```
## Code Quality Review: [target]

### Security (critical first)
**[issue]** — [file]:[line]
→ Fix: [concrete change]

### Performance
### Correctness and robustness
### Maintainability
```

If a dimension is clean, say so in one line. A review that only lists problems hides the parts that were done right.
