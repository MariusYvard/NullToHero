// AI-surface access checks. Everything here answers one question: can the engines
// that write answers reach this site, and does the site say anything to them.
//
// Two design rules run through the file.
//
// 1. Emerging standards never deduct. Content-Signal is an IETF draft, Link-header
//    service discovery is niche, and Markdown negotiation is a CDN feature today.
//    Penalising their absence would price a site against a spec that may not ship.
//    Those checks emit ADVISORY, which the scorer excludes the same way it excludes
//    NOT_MEASURED. ADVISORY means "we looked, here is what we saw, no points move".
//
// 2. robots.txt is not the whole story. Two of the fetchers that matter most are
//    documented by their own operators as not applying robots.txt at all
//    (ChatGPT-User, Perplexity-User), and a WAF can return 403 to a bot the
//    robots.txt welcomes. A robots-only verdict is therefore a partial answer,
//    and the code says so instead of implying coverage it does not have.
//
// Pure Node standard library. No network: the HTTP-level facts arrive as probes
// collected by fetch.mjs.

import { queryAll, first } from "./html.mjs";

const GEO = { agent: "seo-agent-geo", dimension: "Search Visibility" };

// Same value shape as checks.mjs mk(). Duplicated rather than imported to keep the
// dependency one-way (checks.mjs imports this module, never the reverse).
function mk(o) {
  return {
    id: o.id, label: o.label, dimension: o.dimension, agent: o.agent,
    verdict: o.verdict, critical: !!o.critical, method: o.method,
    value: o.value === undefined ? null : o.value, detail: o.detail || "",
  };
}

// ── crawler registry ──────────────────────────────────────────────────────────
// Mirrors tools/data/ai-crawlers.csv, which carries the operator documentation URL
// for every row. Kept inline so the analyzer has no file-read dependency at runtime.
// tier 1 decides whether an assistant can cite the site, tier 2 governs training and
// secondary surfaces, tier 3 is corpus-only and never scored: blocking a training
// crawler is a licensing choice, not a visibility defect.
export const AI_CRAWLERS = [
  { id: "OAI-SearchBot",     operator: "OpenAI",     tier: 1, robots: "respected",   kind: "search" },
  { id: "ChatGPT-User",      operator: "OpenAI",     tier: 1, robots: "not-applied", kind: "user-triggered" },
  { id: "Claude-SearchBot",  operator: "Anthropic",  tier: 1, robots: "respected",   kind: "search" },
  { id: "Claude-User",       operator: "Anthropic",  tier: 1, robots: "respected",   kind: "user-triggered" },
  { id: "PerplexityBot",     operator: "Perplexity", tier: 1, robots: "respected",   kind: "search" },
  { id: "Perplexity-User",   operator: "Perplexity", tier: 1, robots: "not-applied", kind: "user-triggered" },
  { id: "Googlebot",         operator: "Google",     tier: 1, robots: "respected",   kind: "search" },
  { id: "GPTBot",            operator: "OpenAI",     tier: 2, robots: "respected",   kind: "training" },
  { id: "ClaudeBot",         operator: "Anthropic",  tier: 2, robots: "respected",   kind: "training" },
  { id: "Google-Extended",   operator: "Google",     tier: 2, robots: "respected",   kind: "control-token" },
  { id: "GoogleOther",       operator: "Google",     tier: 2, robots: "respected",   kind: "misc" },
  { id: "Applebot",          operator: "Apple",      tier: 2, robots: "respected",   kind: "search" },
  { id: "Applebot-Extended", operator: "Apple",      tier: 2, robots: "respected",   kind: "control-token" },
  { id: "Amazonbot",         operator: "Amazon",     tier: 2, robots: "respected",   kind: "search" },
  { id: "OAI-AdsBot",        operator: "OpenAI",     tier: 3, robots: "unstated",    kind: "verification" },
  { id: "anthropic-ai",      operator: "Anthropic",  tier: 3, robots: "respected",   kind: "legacy" },
  { id: "Meta-ExternalAgent",operator: "Meta",       tier: 3, robots: "respected",   kind: "training" },
  { id: "FacebookBot",       operator: "Meta",       tier: 3, robots: "respected",   kind: "misc" },
  { id: "Bytespider",        operator: "ByteDance",  tier: 3, robots: "contested",   kind: "training" },
  { id: "CCBot",             operator: "Common Crawl", tier: 3, robots: "respected", kind: "training" },
  { id: "cohere-ai",         operator: "Cohere",     tier: 3, robots: "respected",   kind: "training" },
  { id: "YouBot",            operator: "You.com",    tier: 3, robots: "respected",   kind: "search" },
];

// The three UA strings the differential fetch sends. Published by their operators.
export const PROBE_AGENTS = [
  { id: "GPTBot",        ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)" },
  { id: "ClaudeBot",     ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +https://www.anthropic.com/claude-bot)" },
  { id: "PerplexityBot", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)" },
];

// ── robots.txt, parsed into groups ────────────────────────────────────────────

export function parseRobots(txt) {
  const lines = String(txt || "").split(/\r?\n/).map(l => l.replace(/#.*$/, "").trim());
  const groups = [];
  let cur = null;
  const other = [];
  for (const line of lines) {
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1].toLowerCase(), val = m[2].trim();
    if (field === "user-agent") {
      if (cur && !cur._open) cur = null;
      if (!cur) { cur = { agents: [], rules: [], _open: true }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
    } else if (field === "disallow" || field === "allow") {
      if (cur) { cur._open = false; cur.rules.push({ type: field, val }); }
    } else {
      other.push({ field, val });
    }
  }
  return { groups, other };
}

// Six states, evaluated per bot. The binary allowed/blocked that this replaces
// could not tell "named and blocked" from "swept up by a wildcard", which are
// different problems with different fixes.
export function evaluateBot(parsed, botId, hasRobotsTxt) {
  if (!hasRobotsTxt) return "NO_ROBOTS_TXT";
  const id = botId.toLowerCase();
  const own = parsed.groups.filter(g => g.agents.includes(id));
  if (own.length) {
    const dis = own.flatMap(g => g.rules.filter(r => r.type === "disallow").map(r => r.val));
    if (dis.some(d => d === "/")) return "BLOCKED";
    if (dis.some(d => d !== "")) return "PARTIALLY_BLOCKED";
    return "ALLOWED";
  }
  const star = parsed.groups.filter(g => g.agents.includes("*"));
  if (star.length) {
    const dis = star.flatMap(g => g.rules.filter(r => r.type === "disallow").map(r => r.val));
    if (dis.some(d => d === "/")) return "BLOCKED_BY_WILDCARD";
    return "ALLOWED_BY_DEFAULT";
  }
  return "NOT_MENTIONED";
}

const REACHABLE = new Set(["ALLOWED", "ALLOWED_BY_DEFAULT", "NOT_MENTIONED", "PARTIALLY_BLOCKED"]);

export function checkAiCrawlerRobots(robotsTxt) {
  const has = robotsTxt != null;
  if (!has) {
    // No robots.txt is permissive, not unknown: every bot is allowed by default.
    // Report it as a pass with the reason stated, not as an unmeasured gap.
    const states = {};
    for (const b of AI_CRAWLERS) states[b.id] = "NO_ROBOTS_TXT";
    return mk({ id: "ai-crawler-robots", label: "AI crawler access (robots.txt)", ...GEO, verdict: "PASS",
      method: "static", value: { states, score: 100, robotsTxt: false },
      detail: "No robots.txt found. Every AI crawler is allowed by default." });
  }
  const parsed = parseRobots(robotsTxt);
  const states = {};
  for (const b of AI_CRAWLERS) states[b.id] = evaluateBot(parsed, b.id, true);

  // Weighted rather than counted. A site that blocks CCBot and Bytespider (a
  // licensing decision) must not score the same as one that blocks OAI-SearchBot
  // and Claude-SearchBot (an answer-visibility defect).
  //
  // The user-triggered fetchers that their operators document as not applying
  // robots.txt are excluded from the robots-derived score: scoring a site on a
  // directive its target ignores would be measuring the wrong thing. They stay in
  // the reported states so the reader sees them.
  const scored = AI_CRAWLERS.filter(b => b.tier <= 2 && b.robots !== "not-applied");
  const t1 = scored.filter(b => b.tier === 1);
  const t2 = scored.filter(b => b.tier === 2);
  const share = (list) => list.length ? list.filter(b => REACHABLE.has(states[b.id])).length / list.length : 1;

  const star = parsed.groups.filter(g => g.agents.includes("*"));
  const blanket = star.some(g => g.rules.some(r => r.type === "disallow" && r.val === "/"));

  let score = Math.round(50 * share(t1) + 25 * share(t2) + (blanket ? 0 : 15));
  const blockedT1 = t1.filter(b => !REACHABLE.has(states[b.id])).map(b => b.id);
  const partial = AI_CRAWLERS.filter(b => states[b.id] === "PARTIALLY_BLOCKED").map(b => b.id);
  const ignoreRobots = AI_CRAWLERS.filter(b => b.robots === "not-applied").map(b => b.id);

  // The 10 remaining points belong to the AI-file probe, which lives in its own
  // check. Report the robots component out of 90 rather than inflating it to 100.
  const verdict = blockedT1.length ? "FAIL" : (blanket ? "FAIL" : "PASS");
  const detail = blockedT1.length
    ? `Tier 1 crawler(s) blocked: ${blockedT1.join(", ")}. These decide whether an assistant can cite the site.`
    : blanket
      ? "robots.txt carries a blanket Disallow: / on the wildcard group, which blocks every crawler that honours it."
      : `All tier 1 and tier 2 crawlers reachable. ${ignoreRobots.length} user-triggered fetcher(s) do not apply robots.txt and are reported separately.`;

  return mk({ id: "ai-crawler-robots", label: "AI crawler access (robots.txt)", ...GEO,
    verdict, critical: blockedT1.length > 0 || blanket, method: "static",
    value: { states, score, scoredOutOf: 90, blockedTier1: blockedT1, partiallyBlocked: partial, robotsIgnoredBy: ignoreRobots, blanketBlock: blanket },
    detail });
}

// ── HTTP-level access, which robots.txt cannot answer ─────────────────────────

export function checkAiCrawlerHttp(probes) {
  const p = probes && probes.aiCrawlerHttp;
  if (!p || !p.tested) {
    return mk({ id: "ai-crawler-http", label: "AI crawler HTTP access", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No live target, so the per-user-agent fetch was not run." });
  }
  if (p.baseline == null) {
    return mk({ id: "ai-crawler-http", label: "AI crawler HTTP access", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: p, detail: "Baseline request failed, so a divergence could not be established." });
  }
  const diverged = (p.agents || []).filter(a => a.status != null && a.status !== p.baseline && a.status >= 400);
  const errored = (p.agents || []).filter(a => a.status == null);
  if (diverged.length) {
    return mk({ id: "ai-crawler-http", label: "AI crawler HTTP access", ...GEO, verdict: "FAIL", critical: true,
      method: "computed", value: p,
      detail: `Server answers ${diverged.map(a => `${a.id} with ${a.status}`).join(", ")} while a browser user-agent gets ${p.baseline}. robots.txt permits these bots but the edge refuses them, so the site is invisible to those engines. Look at WAF and bot-management rules, not robots.txt.` });
  }
  if (errored.length === (p.agents || []).length) {
    return mk({ id: "ai-crawler-http", label: "AI crawler HTTP access", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: p, detail: "Every per-user-agent request failed to complete." });
  }
  return mk({ id: "ai-crawler-http", label: "AI crawler HTTP access", ...GEO, verdict: "PASS",
    method: "computed", value: p,
    detail: `Bot user-agents receive the same status as a browser (${p.baseline}). No edge-level block detected.` });
}

// ── llms.txt, graded rather than binary ───────────────────────────────────────

const LLMS_RULES = [
  { id: "h1", severity: "critical", label: "first line is an H1 title" },
  { id: "blockquote", severity: "high", label: "a blockquote summary line is present" },
  { id: "section", severity: "critical", label: "at least one H2 section" },
  { id: "entries", severity: "high", label: "at least 5 link entries" },
  { id: "absolute", severity: "high", label: "link targets are absolute URLs" },
  { id: "described", severity: "medium", label: "entries carry a description after the link" },
  { id: "length", severity: "low", label: "file length between 30 and 200 lines" },
];

export function gradeLlmsTxt(body) {
  const text = String(body || "");
  const lines = text.split(/\r?\n/);
  const firstMeaningful = lines.find(l => l.trim().length) || "";
  const entryRe = /^\s*-\s*\[[^\]]+\]\(([^)]+)\)(.*)$/;
  const entries = lines.map(l => l.match(entryRe)).filter(Boolean);
  const results = {
    h1: /^#\s+\S/.test(firstMeaningful),
    blockquote: lines.some(l => /^>\s*\S/.test(l)),
    section: lines.some(l => /^##\s+\S/.test(l)),
    entries: entries.length >= 5,
    absolute: entries.length > 0 && entries.every(m => /^https?:\/\//i.test(m[1].trim())),
    described: entries.length > 0 && entries.filter(m => m[2].replace(/^\s*:\s*/, "").trim().length > 0).length / entries.length >= 0.5,
    length: lines.length >= 30 && lines.length <= 200,
  };
  const failed = LLMS_RULES.filter(r => !results[r.id]);
  return { results, failed: failed.map(r => ({ id: r.id, severity: r.severity, label: r.label })), entryCount: entries.length, lineCount: lines.length };
}

export function checkLlmsTxt(probes) {
  const p = probes && probes.aiFiles && probes.aiFiles["/llms.txt"];
  if (!p || !p.tested) {
    return mk({ id: "llms-txt", label: "llms.txt", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No live target, so /llms.txt was not probed." });
  }
  // Google states it ignores these files. This check is scoped to the engines that
  // have not said so, and it advises rather than deducts for that reason.
  if (p.status === 404 || p.status === 410) {
    return mk({ id: "llms-txt", label: "llms.txt", ...GEO, verdict: "ADVISORY",
      method: "computed", value: { present: false, status: p.status },
      detail: "No llms.txt. Worth adding for the assistants that read it, though Google states it ignores such files. Skip it on a site under about ten pages, or on a platform that cannot serve custom paths." });
  }
  if (p.status === 403 || p.status === 401) {
    // Distinct from absence, and a real misconfiguration: the file exists and the
    // edge is refusing it to the very clients it was written for.
    return mk({ id: "llms-txt", label: "llms.txt", ...GEO, verdict: "FAIL",
      method: "computed", value: { present: true, status: p.status },
      detail: `llms.txt answers ${p.status}. The file is published but the edge refuses it, so no assistant can read it. This is a misconfiguration, not an absence.` });
  }
  if (!(p.status >= 200 && p.status < 300)) {
    return mk({ id: "llms-txt", label: "llms.txt", ...GEO, verdict: "ADVISORY",
      method: "computed", value: { present: false, status: p.status }, detail: `llms.txt returned ${p.status}.` });
  }
  const graded = gradeLlmsTxt(p.body);
  const criticalFails = graded.failed.filter(f => f.severity === "critical");
  const full = probes.aiFiles["/llms-full.txt"];
  const value = { present: true, ...graded, llmsFullPresent: !!(full && full.status >= 200 && full.status < 300) };
  if (criticalFails.length) {
    return mk({ id: "llms-txt", label: "llms.txt", ...GEO, verdict: "WARN",
      method: "computed", value,
      detail: `llms.txt is present but malformed: ${criticalFails.map(f => f.label).join(", ")} missing. A parser that cannot find the title or the sections gets nothing from it.` });
  }
  if (graded.failed.length) {
    return mk({ id: "llms-txt", label: "llms.txt", ...GEO, verdict: "ADVISORY",
      method: "computed", value,
      detail: `llms.txt is well formed. ${graded.failed.length} lower-severity item(s) open: ${graded.failed.map(f => f.label).join(", ")}.` });
  }
  return mk({ id: "llms-txt", label: "llms.txt", ...GEO, verdict: "PASS",
    method: "computed", value, detail: `llms.txt is present and passes all ${LLMS_RULES.length} structural rules (${graded.entryCount} entries).` });
}

// ── Content-Signal, an IETF draft, never a deduction ──────────────────────────

const CONTENT_SIGNAL_KEYS = new Set(["ai-train", "search", "ai-personalization", "ai-retrieval"]);

export function parseContentSignal(robotsTxt) {
  const found = [];
  for (const line of String(robotsTxt || "").split(/\r?\n/)) {
    const m = line.replace(/#.*$/, "").trim().match(/^content-signal\s*:\s*(.*)$/i);
    if (!m) continue;
    for (const part of m[1].split(",")) {
      const kv = part.trim().split("=").map(s => s.trim().toLowerCase());
      if (kv.length !== 2 || !kv[0]) continue;
      found.push({ key: kv[0], value: kv[1], knownKey: CONTENT_SIGNAL_KEYS.has(kv[0]), validValue: kv[1] === "yes" || kv[1] === "no" });
    }
  }
  return found;
}

export function checkContentSignal(robotsTxt) {
  if (robotsTxt == null) {
    return mk({ id: "content-signal", label: "Content-Signal directive", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "robots.txt not provided to the analyzer." });
  }
  const found = parseContentSignal(robotsTxt);
  if (!found.length) {
    return mk({ id: "content-signal", label: "Content-Signal directive", ...GEO, verdict: "ADVISORY",
      method: "static", value: { present: false },
      detail: "No Content-Signal directive. It declares downstream AI usage separately from access. The spec is an IETF draft and Google has stated publicly that it has no effect on its systems, so its absence is never a defect." });
  }
  const bad = found.filter(f => !f.knownKey || !f.validValue);
  if (bad.length) {
    return mk({ id: "content-signal", label: "Content-Signal directive", ...GEO, verdict: "ADVISORY",
      method: "static", value: { present: true, signals: found, unrecognised: bad },
      detail: `Content-Signal present with ${bad.length} unrecognised item(s): ${bad.map(b => `${b.key}=${b.value}`).join(", ")}. Known keys are ${[...CONTENT_SIGNAL_KEYS].join(", ")} and the only valid values are yes and no. The draft is young, so an unknown key is a note rather than an error.` });
  }
  return mk({ id: "content-signal", label: "Content-Signal directive", ...GEO, verdict: "ADVISORY",
    method: "static", value: { present: true, signals: found },
    detail: `Content-Signal declared: ${found.map(f => `${f.key}=${f.value}`).join(", ")}.` });
}

// ── page and header level AI directives ───────────────────────────────────────

export function checkAiMetaDirectives(doc, headers) {
  const h = headers || {};
  const xrt = h["x-robots-tag"] || "";
  const metas = doc ? queryAll(doc, "meta") : [];
  const found = [];

  for (const m of metas) {
    const name = (m.attrs && (m.attrs.name || m.attrs.NAME) || "").toLowerCase();
    const content = (m.attrs && (m.attrs.content || m.attrs.CONTENT) || "").toLowerCase();
    if (!name || !content) continue;
    if (/\bnoai\b/.test(content))      found.push({ where: "meta", name, directive: "noai" });
    if (/\bnoimageai\b/.test(content)) found.push({ where: "meta", name, directive: "noimageai" });
    // Bot-specific meta, for example <meta name="GPTBot" content="noindex">
    const bot = AI_CRAWLERS.find(b => b.id.toLowerCase() === name);
    if (bot && /\bnoindex\b/.test(content)) found.push({ where: "meta", name: bot.id, directive: "noindex" });
  }
  const xl = String(xrt).toLowerCase();
  if (/\bnoai\b/.test(xl))      found.push({ where: "header", name: "x-robots-tag", directive: "noai" });
  if (/\bnoimageai\b/.test(xl)) found.push({ where: "header", name: "x-robots-tag", directive: "noimageai" });
  for (const b of AI_CRAWLERS) {
    const re = new RegExp(`\\b${b.id.toLowerCase().replace(/[-]/g, "\\-")}\\s*:\\s*[^,]*\\bnoindex\\b`);
    if (re.test(xl)) found.push({ where: "header", name: b.id, directive: "noindex" });
  }

  if (!found.length) {
    return mk({ id: "ai-meta-directives", label: "Page-level AI directives", ...GEO, verdict: "PASS",
      method: "static", value: { directives: [] },
      detail: "No noai, noimageai or bot-specific noindex directive found in meta tags or response headers." });
  }
  // Reported, never scored down: opting out is a legitimate choice. What the check
  // guards against is doing it by accident and then wondering about the silence.
  return mk({ id: "ai-meta-directives", label: "Page-level AI directives", ...GEO, verdict: "ADVISORY",
    method: "static", value: { directives: found },
    detail: `${found.length} AI opt-out directive(s) in force: ${found.map(f => `${f.name}=${f.directive} (${f.where})`).join(", ")}. Headers take precedence over meta tags and also cover non-HTML resources. Confirm this is deliberate, since it suppresses the surfaces it names.` });
}

// ── agent-readiness signals, conditional and non-scoring ──────────────────────

const LINK_RELS = new Set(["api-catalog", "describedby", "service-doc", "mcp-server-card"]);

export function parseLinkHeader(v) {
  const out = [];
  for (const part of String(v || "").split(/,(?=\s*<)/)) {
    const m = part.match(/<([^>]+)>\s*;(.*)$/);
    if (!m) continue;
    const rel = (m[2].match(/rel\s*=\s*"?([^";]+)"?/i) || [])[1];
    if (rel) out.push({ href: m[1].trim(), rel: rel.trim().toLowerCase() });
  }
  return out;
}

// A brochure site has no reason to publish an API catalogue. Emitting a finding on
// every such site would be noise, so the section is omitted unless the page itself
// looks API-first.
function looksApiFirst(doc, rawHtml) {
  const t = String(rawHtml || "");
  if (/\/(api|developers|developer|docs\/api)\//i.test(t)) return true;
  if (/\b(openapi|swagger)\b/i.test(t)) return true;
  const links = doc ? queryAll(doc, "a") : [];
  return links.some(a => /\b(api|developers)\b/i.test((a.attrs && a.attrs.href) || ""));
}

export function checkLinkHeader(headers, doc, rawHtml) {
  const raw = headers && headers.link;
  const links = parseLinkHeader(raw);
  const known = links.filter(l => LINK_RELS.has(l.rel));
  if (links.length) {
    return mk({ id: "agent-link-header", label: "RFC 8288 Link header", ...GEO, verdict: "ADVISORY",
      method: "static", value: { links, known: known.map(l => l.rel) },
      detail: known.length
        ? `Link header advertises ${known.map(l => l.rel).join(", ")}, which is machine-readable service discovery without HTML parsing.`
        : `Link header present with ${links.length} relation(s), none of the high-value discovery types (${[...LINK_RELS].join(", ")}).` });
  }
  if (!looksApiFirst(doc, rawHtml)) {
    // Not applicable: report nothing rather than an empty section.
    return mk({ id: "agent-link-header", label: "RFC 8288 Link header", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: { applicable: false },
      detail: "Not an API-first site, so service-discovery Link relations do not apply." });
  }
  return mk({ id: "agent-link-header", label: "RFC 8288 Link header", ...GEO, verdict: "ADVISORY",
    method: "static", value: { links: [], applicable: true },
    detail: "The site exposes API surfaces but publishes no Link header. Advertising a catalogue, for example Link: </.well-known/api-catalog>; rel=\"api-catalog\", lets an agent discover them without scraping." });
}

export function checkMarkdownNegotiation(probes) {
  const p = probes && probes.markdownNegotiation;
  if (!p || !p.tested) {
    return mk({ id: "markdown-negotiation", label: "Markdown content negotiation", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No live target, so content negotiation was not tested." });
  }
  if (p.error) {
    return mk({ id: "markdown-negotiation", label: "Markdown content negotiation", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: p, detail: `Negotiation request did not complete (${p.error}).` });
  }
  if (p.markdown) {
    return mk({ id: "markdown-negotiation", label: "Markdown content negotiation", ...GEO, verdict: "ADVISORY",
      method: "computed", value: p,
      detail: `Server answers text/markdown when asked for it, which removes the de-boilerplating step for any agent reading the page.` });
  }
  return mk({ id: "markdown-negotiation", label: "Markdown content negotiation", ...GEO, verdict: "ADVISORY",
    method: "computed", value: p,
    detail: "Server returns HTML when asked for text/markdown. Serving Markdown is a forward-looking option, observed so far at CDN level rather than as an application setting, so treat it as an experiment and not a one-line change." });
}

// ── other well-known AI files, one grouped probe ──────────────────────────────

export function checkAiFiles(probes) {
  const files = probes && probes.aiFiles;
  if (!files) {
    return mk({ id: "ai-well-known-files", label: "AI discovery files", ...GEO, verdict: "NOT_MEASURED",
      method: "not-measured", value: null, detail: "No live target, so the well-known paths were not probed." });
  }
  const present = Object.entries(files)
    .filter(([, v]) => v && v.status >= 200 && v.status < 300)
    .map(([k]) => k);
  return mk({ id: "ai-well-known-files", label: "AI discovery files", ...GEO, verdict: "ADVISORY",
    method: "computed", value: { probed: Object.keys(files), present },
    detail: present.length
      ? `Published: ${present.join(", ")}.`
      : `None of ${Object.keys(files).join(", ")} is published. Adoption of these paths varies widely and none is required, so this is context rather than a finding.` });
}

export function runAiAccessChecks({ doc, rawHtml, headers, robotsTxt, probes }) {
  return [
    checkAiCrawlerRobots(robotsTxt),
    checkAiCrawlerHttp(probes),
    checkAiMetaDirectives(doc, headers),
    checkLlmsTxt(probes),
    checkContentSignal(robotsTxt),
    checkAiFiles(probes),
    checkLinkHeader(headers, doc, rawHtml),
    checkMarkdownNegotiation(probes),
  ];
}
