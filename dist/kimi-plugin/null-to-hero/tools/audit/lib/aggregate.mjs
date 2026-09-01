// Per-page aggregation for the checks that are questions about a document.
//
// runChecks answers "is THIS page ok". The audit's claim is about a site. Those are
// different questions, and the gap was papered over by only ever asking the first one:
// a title check passing on the home page said nothing about /journey, but read exactly
// like it did.
//
// So: run the document-level checks on every discovered page and merge to the worst
// verdict, naming the pages that fail. The verdict a reader sees is then a verdict
// about the pages we actually opened, and `perPage` says which those were.
//
// Pure Node standard library. No network: the caller supplies the fetched pages.

import { runChecks } from "./checks.mjs";

/* Checks that are a property of ONE document, so asking every page is meaningful.
   Deliberately a whitelist, not a blacklist: a new check aggregates only when someone
   has thought about what "worst across pages" means for it. */
const PER_PAGE = new Set([
  "title-tag", "meta-description", "heading-order", "html-lang", "canonical-url",
  "viewport-meta", "img-dimensions", "invalid-dom-nesting", "invalid-aria-attribute",
  "charset-early", "head-meta", "mixed-script-homoglyph", "robots-disallow",
  "video-embed-hygiene", "subresource-integrity", "open-redirect-param",
  "contrast-exempt-undeclared",
]);

/* Everything else stays on the entry page, for one of two honest reasons:
     - it is already site-wide (contrast-ratio sweeps every page itself)
     - it is a property of the origin or the shared bundles, not of a page
       (security headers, CSS/JS bundle checks, robots.txt, the probes)
   Re-running those per page would multiply one fact into N identical ones. */

// FAIL beats WARN beats PASS. NOT_MEASURED and ADVISORY are not severities: a page
// we could not judge, and a signal we chose not to score, must never outrank a page
// we judged and failed.
const RANK = { FAIL: 3, WARN: 2, PASS: 1 };

export function aggregateChecks({ entry, pages = [], robotsTxt = null }) {
  const base = runChecks(entry);
  if (!pages.length) return base;

  // Each extra page answers the document questions only: no computed pass (that is
  // site-wide already) and no shared bundles (they belong to the origin, not the page).
  const perPageRuns = pages.map(p => ({
    url: p.url,
    checks: runChecks({ rawHtml: p.rawHtml || "", renderedHtml: p.renderedHtml || null, url: p.url, headers: p.headers || null, robotsTxt, css: "", js: "", computed: null }),
  }));

  return base.map((check) => {
    if (!PER_PAGE.has(check.id)) return check;
    const rows = [
      { url: entry.url, verdict: check.verdict, detail: check.detail },
      ...perPageRuns.map(r => {
        const c = r.checks.find(x => x.id === check.id);
        return c ? { url: r.url, verdict: c.verdict, detail: c.detail } : null;
      }).filter(Boolean),
    ];
    const judged = rows.filter(r => RANK[r.verdict]);
    if (!judged.length) return { ...check, value: { ...(check.value && typeof check.value === "object" && !Array.isArray(check.value) ? check.value : { entry: check.value }), perPage: rows } };

    const worst = judged.reduce((a, b) => (RANK[b.verdict] > RANK[a.verdict] ? b : a));
    const failing = judged.filter(r => r.verdict === "FAIL" || r.verdict === "WARN");
    const value = check.value && typeof check.value === "object" && !Array.isArray(check.value)
      ? { ...check.value, perPage: rows }
      : { entry: check.value, perPage: rows };

    // One page failing makes the site fail: a reader lands on any of them.
    if (worst.verdict === check.verdict && failing.length <= (RANK[check.verdict] > 1 ? 1 : 0)) {
      return { ...check, value, detail: `${check.detail} Checked on ${rows.length} page(s).` };
    }
    const named = failing.map(r => `${short(r.url)}: ${r.verdict}`).join(", ");
    return {
      ...check,
      verdict: worst.verdict,
      value,
      // The worst page's own detail, then the roll-call. A verdict a reader cannot
      // trace to a URL is a verdict they cannot act on.
      detail: `${worst.detail}${failing.length ? ` ${failing.length} of ${rows.length} page(s) not clean: ${named}.` : ` Clean on all ${rows.length} page(s).`}`,
    };
  });
}

function short(u) { try { return new URL(u).pathname || u; } catch { return u; } }
