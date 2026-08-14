#!/usr/bin/env node
/**
 * parasite.mjs - site reputation abuse detection ("parasite SEO") for /seo, aggregated
 * per URL section.
 *
 *   node parasite.mjs --fetch fetch.json          output of tools/audit/fetch.mjs --out
 *   node parasite.mjs --assets ./audit-assets     directory written by --assets-dir
 *   node parasite.mjs --pages pages.json          JSON array of { url, html }
 *   node parasite.mjs a.html b.html c.html        HTML files, URL from canonical or --base-url
 *
 * Options
 *   --min-pages N     pages a section needs before it earns a verdict (default 3)
 *   --third-party N   third-party signature rate per page that flags (default 1.0)
 *   --commercial N    commercial intent rate per page that flags (default 2.0)
 *   --affiliate N     affiliate link rate per page that flags (default 3.0)
 *   --drift N         multiple of the site mean that flags drift (default 2.0)
 *   --base-url URL    base for HTML input that carries no canonical of its own
 *   --root DIR        path root for mapping HTML files onto --base-url
 *   --markdown        human report instead of JSON
 *
 * Exit codes
 *   0  analysis completed, including a documented refusal to judge a section
 *   2  usage error, unreadable input, or no page that could be mapped to a URL
 *
 * Pure Node standard library. No network, no execution of page content, no model call.
 *
 * ── why the section, and not the page or the domain ───────────────────────────────────
 *
 * The unit of analysis is the FIRST URL SEGMENT. That choice is the method, not an
 * implementation convenience. Search engines judge site reputation abuse at the level of
 * a section: a directory that publishes third-party material is assessed as its own
 * thing, independently of how involved the domain owner is, while the rest of the domain
 * keeps its standing. Score a single page and you find one sponsored post, which is
 * ordinary and permitted. Score a domain and the section dissolves into the average of
 * everything else it publishes. Score the section and the pattern becomes visible: forty
 * pages of syndicated coupon copy under /deals on a site whose other sections are clean.
 *
 * ── the section is the FINAL URL, after redirects ─────────────────────────────────────
 *
 * A section is computed on the URL the page ended up at, never on the URL that was
 * requested. A tracking hop such as /go/vpn-42 that lands on /partners/best-vpn-deals
 * belongs to the /partners section; filing it under /go would file the evidence in a
 * directory that holds no pages. tools/audit/fetch.mjs already resolves this: its top
 * level `url` is `finalUrl || target`, and every entry of `pages[]` is `p.finalUrl || u`,
 * so reading those two fields is enough. For `[{ url, html }]` input, `finalUrl` wins
 * over `url`, and a `redirects` or `redirectChain` array is read from its last entry.
 * When the requested URL and the endpoint fall in different sections, that is recorded in
 * `warnings` rather than resolved silently, because it is exactly the case a reader will
 * want to check by hand.
 *
 * ── mean, not median ──────────────────────────────────────────────────────────────────
 *
 * Rates are per-page MEANS inside a section, and the site baseline is the mean across
 * sections. The median is the better statistic for a distribution with contaminated
 * tails; this is the opposite shape. The pattern the detector exists for is one section
 * going feral inside an otherwise ordinary site, so with N quiet sections and one loud
 * one the median site baseline IS a quiet section: the loud section then drifts against a
 * floor of roughly zero, every comparison saturates, and the number stops discriminating
 * between bad and catastrophic. Worse, the median is a statement about how many quiet
 * sections happen to exist, which is a fact about site architecture rather than about
 * third-party content. The mean moves with the outlier, which is what lets "twice the
 * site mean" mean "far from the rest of this site".
 *
 * The cost of that choice, stated rather than hidden: one very large section pulls the
 * mean up and can mask a smaller one next to it. So the site mean is reported alongside
 * every section rate, and the raw counts are reported next to the rates, so a reader can
 * see the baseline that produced the verdict instead of taking it on faith.
 *
 * The second cost is arithmetic and it bounds the drift flag. With k qualifying sections,
 * the largest ratio any one of them can have to the mean of all k is k itself, reached
 * when every other section sits at zero. So a drift factor of 2 is unreachable at k=2 and
 * only becomes informative from three qualifying sections up. The scan says so in
 * `warnings` rather than reporting a flag that could not have fired.
 *
 * ── what this does not see ────────────────────────────────────────────────────────────
 *
 * The pattern tables read visible text, not class names: a `class="sponsored-card"` is a
 * template artifact, while a rendered "Sponsored content" label is what the page tells a
 * reader. Site-wide furniture counts too, so a footer carrying "Advertisement" on every
 * page inflates every section equally; the drift flag is the one that survives that,
 * because it is relative. Nothing here decides intent, and none of it is a penalty
 * prediction. It reports where a section looks unlike the site that hosts it.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";

const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const die = (m, c = 2) => { console.error(`[parasite] ${m}`); process.exit(c); };
const num = (n, d) => {
  const v = val(n, null);
  if (v == null) return d;
  const f = Number(v);
  if (!Number.isFinite(f) || f < 0) die(`${n} needs a non-negative number, got "${v}"`);
  return f;
};

const ROOT_SECTION = "(root)";
const r2 = (n) => Math.round(n * 100) / 100;

// ── pattern tables ────────────────────────────────────────────────────────────────────

/* Ten labels a page uses when it says out loud that the content is not the publisher's.
   These are the strongest signal in the file because they are the site's own admission:
   nothing has to be inferred about who wrote the page. */
const THIRD_PARTY = [
  ["partner-content", /\bpartner\s+content\b/gi],
  ["sponsored-content", /\bsponsored\s+content\b/gi],
  ["sponsored-by", /\bsponsored\s+by\b/gi],
  ["brand-studio", /\bbrand\s+studio\b/gi],
  ["in-partnership-with", /\bin\s+partnership\s+with\b/gi],
  ["advertisement", /\badvertisements?\b/gi],
  ["advertorial", /\badvertorials?\b/gi],
  ["paid-post", /\bpaid\s+posts?\b/gi],
  ["promoted", /\bpromoted\b/gi],
  ["paid-content", /\bpaid\s+content\b/gi],
];

/* Nine transactional phrases. Any one of them is ordinary on a shop and unremarkable in a
   review; a section of an editorial site where they are the dominant vocabulary is the
   thing being measured. Hence a threshold twice the third-party one. */
const COMMERCIAL = [
  ["buy-now", /\bbuy\s+now\b/gi],
  ["shop-now", /\bshop\s+now\b/gi],
  ["add-to-cart", /\badd\s+to\s+(?:the\s+)?cart\b/gi],
  ["compare-prices", /\bcompare\s+prices\b/gi],
  ["best-x-deals", /\bbest\b[\w\s,'-]{0,40}?\bdeals?\b/gi],
  ["promo-code", /\bpromo\s+codes?\b/gi],
  ["coupon", /\bcoupons?\b/gi],
  ["discount-code", /\bdiscount\s+codes?\b/gi],
  ["affiliate-disclosure", /\baffiliate\s+disclosures?\b/gi],
];

/* Affiliate parameters on OUTBOUND links only. An internal link carrying tag= is a
   site's own campaign tracking; the same parameter pointing off-domain is a commission
   path, and only the second one describes a monetised third-party section. */
const AFFILIATE_PARAMS = [
  ["tag", /[?&]tag=/i],
  ["aff_id", /[?&]aff_id=/i],
  ["affid", /[?&]affid=/i],
  ["partnerid", /[?&]partnerid=/i],
  ["ref_", /[?&]ref_=/i],
];

// ── html helpers ──────────────────────────────────────────────────────────────────────

function visibleText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s">]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "").trim() : null;
};

function hrefs(html) {
  return [...String(html).matchAll(/<a\b[^>]*>/gi)]
    .map(m => attr(m[0], "href"))
    .filter(Boolean)
    .map(h => h.replace(/&amp;/gi, "&"));
}

// A page's own claim about its address, used when the input carries no URL of its own.
function canonicalOf(html) {
  for (const m of String(html).matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(m[0], "rel") || "").toLowerCase();
    if (rel.split(/\s+/).includes("canonical")) { const h = attr(m[0], "href"); if (h) return h; }
  }
  for (const m of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    if ((attr(m[0], "property") || "").toLowerCase() === "og:url") { const c = attr(m[0], "content"); if (c) return c; }
  }
  return null;
}

const countOf = (text, table) => {
  const per = {};
  let total = 0;
  for (const [id, re] of table) {
    const n = (text.match(re) || []).length;
    if (n) { per[id] = n; total += n; }
  }
  return { total, per };
};

function affiliateOf(html, pageUrl) {
  const per = {};
  let total = 0;
  let host = null;
  try { host = pageUrl ? new URL(pageUrl).host.toLowerCase() : null; } catch { /* unknown */ }
  for (const raw of hrefs(html)) {
    let u;
    try { u = pageUrl ? new URL(raw, pageUrl) : new URL(raw); } catch { continue; }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    if (host && u.host.toLowerCase() === host) continue;
    for (const [id, re] of AFFILIATE_PARAMS) {
      if (re.test(u.search)) { per[id] = (per[id] || 0) + 1; total++; }
    }
  }
  return { total, per };
}

function sectionOf(url) {
  let p;
  try { p = new URL(url).pathname; } catch { return null; }
  const seg = p.split("/").filter(Boolean)[0];
  if (!seg) return ROOT_SECTION;
  try { return decodeURIComponent(seg).toLowerCase(); } catch { return seg.toLowerCase(); }
}

/* The endpoint of a redirect chain, in the shapes the three input modes produce. Reading
   `url` alone would silently file a tracking hop under the section it left, not the one
   it landed in. */
function endpointUrl(o) {
  const chain = o.redirects || o.redirectChain || o.chain;
  if (Array.isArray(chain) && chain.length) {
    const last = chain[chain.length - 1];
    const u = typeof last === "string" ? last : (last && (last.to || last.url || last.location));
    if (u) return String(u);
  }
  return o.finalUrl || o.url || o.href || o.target || null;
}

// ── input ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = val("--base-url", null);
const warnings = [];

const readJson = (p) => {
  let txt;
  try { txt = readFileSync(p, "utf8"); } catch (e) { die(`cannot read ${p}: ${e.message}`); }
  try { return JSON.parse(txt); } catch (e) { die(`${p} is not valid JSON: ${e.message}`); }
};

// fetch.mjs writes { url, target, rawHtml, renderedHtml, pages: [{ url, rawHtml }] }.
// The rendered DOM is preferred where it exists: sponsored labels and affiliate rails are
// routinely injected client-side, and the raw shell would report a section as clean.
function fromFetchJson(j) {
  const out = [];
  const push = (requested, endpoint, html, source) => {
    if (!endpoint || html == null) return;
    out.push({ requested: requested || endpoint, url: endpoint, html, source });
  };
  push(j.target, endpointUrl(j), j.renderedHtml || j.rawHtml, j.renderedHtml ? "rendered" : "raw");
  for (const p of Array.isArray(j.pages) ? j.pages : []) {
    push(p.requested || p.url, endpointUrl(p), p.renderedHtml || p.rawHtml || p.html, p.renderedHtml ? "rendered" : "raw");
  }
  return out;
}

function fromPagesJson(j) {
  const list = Array.isArray(j) ? j : (Array.isArray(j.pages) ? j.pages : null);
  if (!list) die("--pages expects a JSON array of { url, html } (or an object with a pages array)");
  return list.map(o => ({
    requested: o.url || endpointUrl(o),
    url: endpointUrl(o),
    html: o.html ?? o.renderedHtml ?? o.rawHtml ?? null,
    source: o.renderedHtml && !o.html ? "rendered" : "raw",
  })).filter(p => p.html != null);
}

// One directory as written by writeAssets(): raw.html, rendered.html, styles.css,
// scripts.js, headers.json, robots.txt. That writer records no URL, so it is recovered
// from a sibling fetch.json, then a url.txt a harvest may have left, then the page's own
// canonical, then --base-url.
function fromAssetsPage(dir) {
  const rendered = join(dir, "rendered.html"), raw = join(dir, "raw.html");
  let html = null, source = null;
  if (existsSync(rendered)) { html = readFileSync(rendered, "utf8"); source = "rendered"; }
  else if (existsSync(raw)) { html = readFileSync(raw, "utf8"); source = "raw"; }
  if (html == null) return null;
  const ut = join(dir, "url.txt");
  const url = (existsSync(ut) ? readFileSync(ut, "utf8").trim() : null) || canonicalOf(html) || BASE_URL;
  return { requested: url, url, html, source };
}

function fromAssetsDir(dir) {
  if (!existsSync(dir)) die(`no such directory: ${dir}`);
  const fj = join(dir, "fetch.json");
  if (existsSync(fj)) return fromFetchJson(readJson(fj));
  const one = fromAssetsPage(dir);
  if (one) {
    warnings.push(`${dir} holds a single page; one page cannot form a section, so it will report insufficient-data. Point --assets at a directory of per-page asset directories, or use --fetch with a multi-page fetch.json.`);
    return [one];
  }
  const pages = [];
  for (const name of readdirSync(dir).sort()) {
    const sub = join(dir, name);
    let isDir = false;
    try { isDir = statSync(sub).isDirectory(); } catch { continue; }
    if (!isDir) continue;
    const p = fromAssetsPage(sub);
    if (p) pages.push(p);
  }
  if (!pages.length) die(`${dir} contains neither fetch.json, nor raw.html/rendered.html, nor per-page subdirectories`);
  return pages;
}

// Bare HTML files. Their address comes from the page's own canonical; failing that, from
// --base-url plus the file's path relative to --root (or to the common parent of the
// files given), so that fixtures laid out as blog/a.html and deals/b.html land in the
// sections their directories describe.
function fromHtmlFiles(files) {
  const dirs = files.map(f => resolve(dirname(f)).split(sep));
  let common = dirs[0] || [];
  for (const d of dirs) {
    let i = 0;
    while (i < common.length && i < d.length && common[i] === d[i]) i++;
    common = common.slice(0, i);
  }
  const root = resolve(val("--root", common.join(sep) || "."));
  return files.map(f => {
    let html;
    try { html = readFileSync(f, "utf8"); } catch (e) { die(`cannot read ${f}: ${e.message}`); }
    let url = canonicalOf(html);
    if (!url && BASE_URL) {
      const rel = relative(root, resolve(f)).split(sep).join("/");
      try { url = new URL(rel, BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`).href; } catch { url = null; }
    }
    return { requested: url, url, html, source: "file", file: f };
  });
}

// ── analysis ──────────────────────────────────────────────────────────────────────────

const MIN_PAGES = num("--min-pages", 3);
const T = {
  thirdParty: num("--third-party", 1.0),
  commercial: num("--commercial", 2.0),
  affiliate: num("--affiliate", 3.0),
  drift: num("--drift", 2.0),
};

/* The risk ladder, in one place so it can be argued with.

   A third-party signature is the section saying, in its own words, that the content is
   somebody else's, so it stands alone at high. Commercial intent and affiliate links are
   each unremarkable by themselves (a shop says "Buy now"; a review links out with a
   parameter) and only together describe a monetised third-party section, so the pair is
   high and either one alone is medium. Drift is a shape rather than a claim: it says this
   section is unlike the rest of the site, which is a reason to look and not a finding, so
   on its own it lifts low to medium and never further. */
function riskOf(f) {
  if (f.thirdParty) return "high";
  if (f.commercial && f.affiliate) return "high";
  if (f.commercial || f.affiliate) return "medium";
  if (f.drift) return "medium";
  return "low";
}

function analyze(rawPages) {
  const pages = [];
  let skipped = 0;
  for (const p of rawPages) {
    const section = p.url ? sectionOf(p.url) : null;
    if (!section) { skipped++; continue; }
    if (p.requested && p.requested !== p.url) {
      const before = sectionOf(p.requested);
      if (before && before !== section) {
        warnings.push(`${p.requested} redirects to ${p.url}; counted under section "${section}", not "${before}".`);
      }
    }
    const text = visibleText(p.html);
    const tp = countOf(text, THIRD_PARTY);
    const cm = countOf(text, COMMERCIAL);
    const af = affiliateOf(p.html, p.url);
    pages.push({ url: p.url, section, source: p.source, thirdParty: tp, commercial: cm, affiliate: af });
  }
  if (skipped) warnings.push(`${skipped} page(s) carried no resolvable URL and were not analyzed; pass --base-url, or use an input that records the final URL.`);
  if (!pages.length) die("no page could be mapped to a URL, so no section could be formed");

  const bySection = new Map();
  for (const p of pages) {
    if (!bySection.has(p.section)) bySection.set(p.section, []);
    bySection.get(p.section).push(p);
  }

  const sections = [];
  for (const [segment, ps] of [...bySection.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sum = (k) => ps.reduce((a, p) => a + p[k].total, 0);
    const counts = { thirdParty: sum("thirdParty"), commercial: sum("commercial"), affiliate: sum("affiliate") };
    const rates = {
      thirdParty: r2(counts.thirdParty / ps.length),
      commercial: r2(counts.commercial / ps.length),
      affiliate: r2(counts.affiliate / ps.length),
    };
    rates.total = r2(rates.thirdParty + rates.commercial + rates.affiliate);
    const patterns = {};
    for (const p of ps) {
      for (const k of ["thirdParty", "commercial", "affiliate"]) {
        for (const [id, n] of Object.entries(p[k].per)) patterns[id] = (patterns[id] || 0) + n;
      }
    }
    sections.push({
      segment, pages: ps.length, counts, rates, patterns,
      samplePages: ps.slice(0, 3).map(p => p.url),
      qualified: ps.length >= MIN_PAGES,
    });
  }

  /* The baseline is built from qualifying sections only. A one-page section is exactly
     the noisiest possible estimate of a rate, and letting it into the mean would move the
     bar that every real section is then measured against. */
  const qual = sections.filter(s => s.qualified);
  const mean = (k) => qual.length ? r2(qual.reduce((a, s) => a + s.rates[k], 0) / qual.length) : null;
  const siteMean = qual.length
    ? { sections: qual.length, thirdParty: mean("thirdParty"), commercial: mean("commercial"), affiliate: mean("affiliate"), total: mean("total") }
    : null;

  if (!qual.length) {
    warnings.push(`no section reached the ${MIN_PAGES}-page minimum, so no verdict was produced for any section.`);
  } else if (qual.length === 1) {
    warnings.push(`only one section reached the ${MIN_PAGES}-page minimum, so drift was not evaluated: a section cannot drift from itself.`);
  } else if (qual.length <= T.drift) {
    // Arithmetic ceiling, not a quiet site: with k qualifying sections no section can
    // exceed k times the mean of all k, so a drift factor at or above k can never fire.
    // Reporting the flag as false without saying this would read as evidence of calm.
    warnings.push(`${qual.length} qualifying section(s) against a drift factor of ${T.drift}: a section can never exceed ${qual.length}x the mean of ${qual.length} sections, so the drift flag could not fire. It becomes informative above ${T.drift} qualifying sections, or lower --drift.`);
  }

  for (const s of sections) {
    if (!s.qualified) {
      // The guardrail. One page, or two, is an anecdote about a directory, not a
      // description of it, and a verdict drawn from it would be indistinguishable in the
      // output from one drawn from forty pages.
      s.flags = null;
      s.risk = "insufficient-data";
      s.note = `${s.pages} page(s) analyzed, below the ${MIN_PAGES}-page minimum. Rates are reported for information; no verdict is drawn.`;
      warnings.push(`section "${s.segment}" has ${s.pages} page(s), below the ${MIN_PAGES}-page minimum: no verdict.`);
      continue;
    }
    const driftable = qual.length >= 2 && siteMean && siteMean.total > 0;
    s.flags = {
      thirdParty: s.rates.thirdParty >= T.thirdParty,
      commercial: s.rates.commercial >= T.commercial,
      affiliate: s.rates.affiliate >= T.affiliate,
      drift: driftable ? s.rates.total > T.drift * siteMean.total : false,
    };
    s.risk = riskOf(s.flags);
  }

  delete_qualified(sections);
  return { sections, siteMean, pagesAnalyzed: pages.length };
}

// `qualified` is scaffolding for the pass above, not part of the contract: `risk` already
// says "insufficient-data" and carrying both invites them to disagree.
function delete_qualified(sections) { for (const s of sections) delete s.qualified; }

// ── output ────────────────────────────────────────────────────────────────────────────

const FLAG_LABEL = { thirdParty: "third-party", commercial: "commercial", affiliate: "affiliate", drift: "drift" };
const flagList = (f) => f ? Object.entries(f).filter(([, on]) => on).map(([k]) => FLAG_LABEL[k]) : [];

function markdown(res, inputLabel) {
  const L = [];
  L.push("# Parasite SEO section scan");
  L.push("");
  L.push(`Input: ${inputLabel}. ${res.pagesAnalyzed} page(s) across ${res.sections.length} section(s). Sections are first URL segments, taken from the final URL after redirects.`);
  L.push("");
  L.push(res.siteMean
    ? `Site mean over ${res.siteMean.sections} qualifying section(s): ${res.siteMean.total} signal(s) per page (third-party ${res.siteMean.thirdParty}, commercial ${res.siteMean.commercial}, affiliate ${res.siteMean.affiliate}). Drift fires above ${r2(T.drift * res.siteMean.total)} per page.`
    : `No section reached the ${MIN_PAGES}-page minimum, so there is no site mean and no verdict.`);
  L.push("");
  L.push("| Section | Pages | Third-party/pg | Commercial/pg | Affiliate/pg | Flags | Risk |");
  L.push("|---------|-------|----------------|---------------|--------------|-------|------|");
  for (const s of res.sections) {
    const flags = s.flags ? (flagList(s.flags).join(", ") || "none") : "not evaluated";
    L.push(`| ${s.segment} | ${s.pages} | ${s.rates.thirdParty} | ${s.rates.commercial} | ${s.rates.affiliate} | ${flags} | ${s.risk} |`);
  }
  L.push("");
  L.push(`Thresholds: third-party ${T.thirdParty}/page, commercial ${T.commercial}/page, affiliate ${T.affiliate}/page, drift ${T.drift}x the site mean. Minimum ${MIN_PAGES} page(s) per section.`);
  const flagged = res.sections.filter(s => s.risk === "high" || s.risk === "medium");
  if (flagged.length) {
    L.push("");
    L.push("## Flagged sections");
    for (const s of flagged) {
      L.push("");
      L.push(`### ${s.segment} (${s.risk})`);
      const top = Object.entries(s.patterns).sort((a, b) => b[1] - a[1]).slice(0, 6);
      L.push(`- Flags: ${flagList(s.flags).join(", ")}`);
      L.push(`- Counts over ${s.pages} page(s): third-party ${s.counts.thirdParty}, commercial ${s.counts.commercial}, affiliate ${s.counts.affiliate}`);
      if (top.length) L.push(`- Patterns: ${top.map(([id, n]) => `${id} x${n}`).join(", ")}`);
      L.push(`- Sample pages: ${s.samplePages.join(", ")}`);
    }
  }
  const unjudged = res.sections.filter(s => s.risk === "insufficient-data");
  if (unjudged.length) {
    L.push("");
    L.push("## Not judged");
    for (const s of unjudged) L.push(`- ${s.segment}: ${s.note}`);
  }
  if (res.warnings.length) {
    L.push("");
    L.push("## Warnings");
    for (const w of res.warnings) L.push(`- ${w}`);
  }
  return L.join("\n");
}

// ── cli ───────────────────────────────────────────────────────────────────────────────

function usage(code) {
  console.error("Usage: node parasite.mjs --fetch fetch.json [--markdown]");
  console.error("       node parasite.mjs --assets ./audit-assets [--base-url URL]");
  console.error("       node parasite.mjs --pages pages.json");
  console.error("       node parasite.mjs a.html b.html c.html --base-url https://example.com/");
  console.error("");
  console.error("Aggregates third-party content signatures, commercial intent and outbound");
  console.error("affiliate links per first URL segment, taken from the final URL after");
  console.error("redirects, and flags sections that read as somebody else's site.");
  console.error("");
  console.error("Options: --min-pages N --third-party N --commercial N --affiliate N --drift N");
  console.error("         --base-url URL --root DIR --markdown");
  console.error("");
  console.error("Exit 0 on any completed analysis, including a refusal to judge a section. Exit 2 on usage.");
  process.exit(code);
}

function main() {
  if (has("--help") || has("-h") || args.length === 0) usage(args.length === 0 ? 2 : 0);

  const FLAGS = new Set(["--markdown", "--help", "-h"]);
  const VALUED = new Set(["--fetch", "--assets", "--pages", "--min-pages", "--third-party",
    "--commercial", "--affiliate", "--drift", "--base-url", "--root"]);

  const fetchFile = val("--fetch", null);
  const assetsDir = val("--assets", null);
  const pagesFile = val("--pages", null);
  const chosen = [fetchFile, assetsDir, pagesFile].filter(Boolean);
  if (chosen.length > 1) die("pick one input: --fetch, --assets or --pages");

  let raw, inputLabel;
  if (fetchFile) { raw = fromFetchJson(readJson(fetchFile)); inputLabel = `fetch.json (${fetchFile})`; }
  else if (assetsDir) { raw = fromAssetsDir(assetsDir); inputLabel = `assets directory (${assetsDir})`; }
  else if (pagesFile) { raw = fromPagesJson(readJson(pagesFile)); inputLabel = `pages JSON (${pagesFile})`; }
  else {
    const files = args.filter((a, i) => !a.startsWith("--") && !FLAGS.has(a) && !VALUED.has(args[i - 1]));
    if (!files.length) usage(2);
    raw = fromHtmlFiles(files);
    inputLabel = `${files.length} HTML file(s)`;
  }
  if (!raw.length) die("input produced no page to analyze");

  const res = analyze(raw);
  const out = {
    tool: "parasite.mjs",
    generatedAt: new Date().toISOString(),
    input: inputLabel,
    unit: "first URL segment of the final URL after redirects",
    thresholds: { minPages: MIN_PAGES, ...T },
    pagesAnalyzed: res.pagesAnalyzed,
    sections: res.sections,
    siteMean: res.siteMean,
    warnings,
  };
  if (has("--markdown")) console.log(markdown({ ...res, warnings }, inputLabel));
  else console.log(JSON.stringify(out, null, 2));

  // A detected section is a finding, not a failure of this program: the caller reads
  // `risk`. Exit 0 covers a clean site, a flagged one and a documented refusal alike, so
  // that a shell pipeline is never forced to treat "I will not judge this" as a crash.
  process.exit(0);
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (decodeURIComponent(new URL(import.meta.url).pathname) === entry) main();

export { analyze, sectionOf, endpointUrl, visibleText, THIRD_PARTY, COMMERCIAL, AFFILIATE_PARAMS };
