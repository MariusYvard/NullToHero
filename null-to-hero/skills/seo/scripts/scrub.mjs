#!/usr/bin/env node
/**
 * scrub.mjs - deterministic, idempotent hygiene pass over Markdown or plain text.
 *
 *   --check <file...>   report what would change, write nothing, exit 1 if anything would
 *   --fix   <file...>   rewrite in place (or to --out FILE for a single input)
 *   --selftest          prove idempotence and the stats contract on a built-in sample
 *
 * Options
 *   --out FILE     with --fix and exactly one input, write there instead of in place
 *   --keep-bidi    keep bidi controls, which real RTL content needs in order to lay out
 *   --json         machine-readable report instead of the human one
 *   --quiet        exit code only
 *
 * Exit codes
 *   0  nothing to change (--check), file written and stable (--fix), selftest passed
 *   1  deviations remain (--check), a second pass would still move the file, selftest failed
 *   2  usage error, unreadable input, unwritable output
 *
 * Four passes, in this order. Pure Node, no dependencies, and no model call anywhere:
 *   A  invisible codepoints  deleted, never swapped for a space. A space inside a URL
 *                            breaks the URL; deleting only removes what nothing renders.
 *   B  em dash and en dash   replaced by the punctuation the surrounding words call for
 *   C  stock phrases         filler openers, and long verbs the plain word already covers
 *   D  spacing               last, so it tidies what B and C leave behind
 *
 * Code fences, indented code, inline code spans, URLs, Markdown link targets and table
 * separator rows are never rewritten by B, C or D. A runs everywhere: a zero-width
 * character inside a code block is a bug there too.
 *
 * Every codepoint this file targets is written in \uXXXX form on purpose. A source file
 * that carries raw invisibles cannot be reviewed, and a raw long dash in here would be
 * the exact artefact the script exists to remove.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const die = (m, c = 2) => { console.error(`[scrub] ${m}`); process.exit(c); };

const EM = "\u2014"; // em dash
const EN = "\u2013"; // en dash

// ── A. invisible codepoints ───────────────────────────────────────────────────

/* The fifteen that machine-written text actually carries. Deleted, not replaced by a
   space: these characters have zero advance width, so anything that "restores" a space in
   their place invents one, and a single invented space inside a URL or an identifier turns
   a working link into a 404. Deleting something nothing renders can only change bytes. */
const INVISIBLE = [
  "\u200B", // zero width space
  "\uFEFF", // zero width no-break space; mid-file it is a stray BOM and pure noise
  "\u200C", // zero width non-joiner
  "\u200D", // zero width joiner
  "\u2060", // word joiner
  "\u00AD", // soft hyphen, invisible until a line break splits the word somewhere random
  "\u202F", // narrow no-break space
  "\u2062", // invisible times
  "\u2063", // invisible separator
  "\u2064", // invisible plus
  "\u180E", // mongolian vowel separator
  "\u200E", // left-to-right mark
  "\u200F", // right-to-left mark
  "\u2028", // line separator: a line break to JS string handling, nothing to Markdown
  "\u2029", // paragraph separator
];

/* Bidi controls. Under --keep-bidi these survive both the explicit list and the Cf sweep,
   because mixed-script RTL content genuinely needs them: strip the LRM or the isolate from
   an Arabic paragraph that contains a Latin product name and the paragraph reorders on
   screen. Without the flag they go, since LTR-only content never needs one. */
const BIDI = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/u;

function classOf(chars) {
  const body = chars.map(c => "\\u" + c.codePointAt(0).toString(16).padStart(4, "0")).join("");
  return new RegExp(`[${body}]`, "gu");
}

function stripInvisible(text, stats, keepBidi) {
  const list = keepBidi ? INVISIBLE.filter(c => !BIDI.test(c)) : INVISIBLE;
  let out = text.replace(classOf(list), () => { stats.invisibles++; return ""; });
  /* Then the whole Unicode format category, which catches what a named list never will:
     LRE/RLE/PDF and the other explicit bidi controls, interlinear annotation, the tag
     block, and whatever the next generation of tooling starts emitting. The named list
     stays anyway because it also covers U+202F, U+2028 and U+2029, which are Zs/Zl/Zp and
     survive this sweep.

     Variation selectors are deliberately NOT swept. They read as format characters but
     Unicode files them under Mn, and stripping U+FE0F rewrites every emoji on the page
     from colour presentation to monochrome, which is a visible content change rather than
     hygiene. Deleting an invisible is only safe while it stays invisible. */
  out = out.replace(/\p{Cf}/gu, (c) => {
    if (keepBidi && BIDI.test(c)) return c;
    stats.invisibles++;
    return "";
  });
  return out;
}

// ── protected regions ─────────────────────────────────────────────────────────

/* Where passes B, C and D are not allowed to touch anything. A long dash inside a shell
   command is an option flag, and a run of hyphens inside a table row is the table. */
function protectedRanges(text) {
  const out = [];
  const add = (s, e) => { if (e > s) out.push([s, e]); };

  const lines = [];
  let pos = 0;
  for (const line of text.split("\n")) { lines.push({ text: line, start: pos }); pos += line.length + 1; }

  /* Block ranges cover whole lines but STOP BEFORE the line's own newline. That newline is
     the boundary between the block and whatever follows, and swallowing it means a fence
     closed by two blank lines reads as a two-newline run to the blank-line rule and a
     three-newline run to everything else, so the file never settles. Multi-line blocks are
     accumulated into ONE range instead, which keeps their interior newlines protected. */
  let fenceStart = null, fenceMark = null, indentStart = null, indentEnd = 0;
  const flushIndent = () => { if (indentStart !== null) { add(indentStart, indentEnd); indentStart = null; } };

  for (const ln of lines) {
    const lineEnd = ln.start + ln.text.length;
    const f = ln.text.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMark) {
      if (f && f[1][0] === fenceMark[0] && f[1].length >= fenceMark.length) { add(fenceStart, lineEnd); fenceMark = null; }
      continue;
    }
    if (f) { flushIndent(); fenceMark = f[1]; fenceStart = ln.start; continue; }
    // Indented code block: four spaces or a tab, then content. Consecutive lines merge.
    if (/^(?: {4}|\t)\S/.test(ln.text)) {
      if (indentStart === null) indentStart = ln.start;
      indentEnd = lineEnd;
      continue;
    }
    flushIndent();
    /* Table rows, separator and body alike. The separator row is the one the spec has to
       protect, because `|---|` is structure; the body rows are protected for a related
       reason. A cell holding a lone dash means "not applicable", and a cell has no
       surrounding clause, so every dash rule would fall through to the default comma and
       turn the placeholder into punctuation. Leaving the table alone is the honest answer. */
    if (/^\s*\|/.test(ln.text) || (ln.text.includes("|") && /^\s*\|?[\s:|-]*-[\s:|-]*\|[\s:|-]*$/.test(ln.text))) add(ln.start, lineEnd);
  }
  flushIndent();
  // An unterminated fence protects the rest of the file, which is the safe way to fail.
  if (fenceMark) add(fenceStart, text.length);

  // Inline code spans. The backreference is what makes ``a`b`` read the way CommonMark does.
  for (const m of text.matchAll(/(`+)(?:(?!\1)[\s\S])*?\1/g)) add(m.index, m.index + m[0].length);
  // Bare URLs and autolinks.
  for (const m of text.matchAll(/(?:https?:\/\/|www\.)[^\s<>()[\]"'`]+/g)) add(m.index, m.index + m[0].length);
  // Link and image targets. The visible text stays scrubbable; the target does not.
  for (const m of text.matchAll(/\]\([^)\n]*\)/g)) add(m.index, m.index + m[0].length);

  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

function inRanges(i, ranges) {
  let lo = 0, hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (i < ranges[mid][0]) hi = mid - 1;
    else if (i >= ranges[mid][1]) lo = mid + 1;
    else return true;
  }
  return false;
}

// Run fn over every stretch that is not protected, splice the protected stretches back in
// untouched.
function mapUnprotected(text, fn) {
  const guard = protectedRanges(text);
  if (guard.length === 0) return fn(text);
  const parts = [];
  let cur = 0;
  for (const [s, e] of guard) {
    if (s > cur) parts.push(fn(text.slice(cur, s)));
    parts.push(text.slice(s, e));
    cur = e;
  }
  if (cur < text.length) parts.push(fn(text.slice(cur)));
  return parts.join("");
}

// ── B. em dash and en dash ────────────────────────────────────────────────────

/* Nine ordered rules, decided on 50 characters of context each side. The order IS the
   rule: the first one that fires wins, so the specific cases sit above the general ones.
   Rules 6 to 9 all end in a comma but stay separate, because the rule name is reported and
   "there was already a comma nearby" is a different fact from "we defaulted". */
const STRONG_AFTER  = /^[.!?,;:]/;
const ATTRIB_BEFORE = /\b(said|wrote|noted|according to|via)\s*$/i;
const ATTRIB_AFTER  = /^[A-Z][a-z]+ [A-Z]/;
const CONJUNCTIVE   = /^\s*(however|therefore|moreover|nonetheless|thus|hence)\b/i;
/* Auxiliaries and modals over a 30-character window: cheap, high-precision evidence that
   the side holds a clause and not a noun phrase. Two clauses joined by a long dash want a
   real sentence boundary, one clause and an aside only wants a comma. */
const VERB = /\b(is|are|was|were|has|have|had|do|does|did|can|could|will|would|should|may|might)\b/i;

function decideDash(before, after) {
  const verbBefore = VERB.test(before.slice(-30));
  const verbAfter = VERB.test(after.slice(0, 30));
  if (STRONG_AFTER.test(after)) return { rep: "", rule: "punctuation-already-there" };
  if (ATTRIB_BEFORE.test(before) || ATTRIB_AFTER.test(after)) return { rep: ", ", rule: "attribution" };
  if (verbBefore && verbAfter && /^[A-Z]/.test(after)) return { rep: ". ", rule: "two-clauses-new-sentence" };
  if (verbBefore && verbAfter && CONJUNCTIVE.test(after)) return { rep: "; ", rule: "two-clauses-conjunctive" };
  if (verbBefore && verbAfter) return { rep: "; ", rule: "two-clauses" };
  if (before.slice(-20).includes(",") || after.slice(0, 20).includes(",")) return { rep: ", ", rule: "comma-nearby" };
  if (/^[a-z]/.test(after)) return { rep: ", ", rule: "lowercase-continues" };
  if (after.length < 30) return { rep: ", ", rule: "tail-of-text" };
  return { rep: ", ", rule: "default" };
}

function nextDashOutside(text, from, guard) {
  let i = from;
  for (;;) {
    const a = text.indexOf(EM, i), b = text.indexOf(EN, i);
    const j = a < 0 ? b : (b < 0 ? a : Math.min(a, b));
    if (j < 0) return -1;
    if (!inRanges(j, guard)) return j;
    i = j + 1;
  }
}

/* One occurrence at a time, left to right, with the context read off the CURRENT text.
   A single global replace with the context baked into the pattern CONSUMES that context,
   so the second of two neighbouring dashes gets judged against a window the first one
   already ate and silently draws the wrong rule. Here every decision sees the text as it
   stands, and the guard ranges are shifted by the exact delta rather than recomputed,
   which keeps the loop linear. */
function fixDashes(text, stats) {
  let out = text;
  const guard = protectedRanges(out);
  let from = 0;
  for (;;) {
    const idx = nextDashOutside(out, from, guard);
    if (idx < 0) break;
    const isEm = out[idx] === EM;
    let s = idx, e = idx + 1;
    while (s > 0 && (out[s - 1] === " " || out[s - 1] === "\t")) s--;
    while (e < out.length && (out[e] === " " || out[e] === "\t")) e++;
    const before = out.slice(Math.max(0, s - 50), s);
    const after = out.slice(e, e + 50);
    const { rep } = decideDash(before, after);
    out = out.slice(0, s) + rep + out.slice(e);
    const delta = rep.length - (e - s);
    if (delta !== 0) for (const r of guard) if (r[0] >= e) { r[0] += delta; r[1] += delta; }
    from = s + rep.length;
    if (isEm) stats.emdash++; else stats.endash++;
  }
  return out;
}

// ── C. stock phrases ──────────────────────────────────────────────────────────

/* Twelve entries: three verb swaps and nine deletions. Matching is case-insensitive and
   the swaps put the original casing back, so a sentence-initial "Leverage" does not come
   out as "use". The deletions are openers that announce a sentence instead of being one;
   cutting them costs the reader nothing and hands back the words. */
const PHRASES = [
  { id: "leverage", re: /\bleverag(e|es|ed|ing)\b/gi,
    map: { e: "use", es: "uses", ed: "used", ing: "using" } },
  { id: "utilize", re: /\butiliz(e|es|ed|ing)\b/gi,
    map: { e: "use", es: "uses", ed: "used", ing: "using" } },
  { id: "delve-into", re: /\bdelv(e|es|ed|ing)\s+(?:deeper\s+)?into\b/gi,
    map: { e: "explore", es: "explores", ed: "explored", ing: "exploring" } },
  { id: "important-to-note", cut: "it['’]s important to note that" },
  { id: "worth-noting",      cut: "it['’]s worth noting that" },
  { id: "todays-landscape",  cut: "in today['’]s\\s+[\\w-]+(?:\\s+[\\w-]+)?\\s+landscape,?" },
  { id: "in-conclusion",     cut: "in conclusion,?" },
  { id: "end-of-the-day",    cut: "at the end of the day,?" },
  { id: "further-ado",       cut: "without further ado,?" },
  { id: "needless-to-say",   cut: "needless to say,?" },
  { id: "when-it-comes-to",  cut: "when it comes to" },
  { id: "in-the-realm-of",   cut: "in the realm of" },
];

function preserveCase(src, repl) {
  if (/[A-Z]{2}/.test(src) && src === src.toUpperCase()) return repl.toUpperCase();
  if (/^[A-Z]/.test(src)) return repl[0].toUpperCase() + repl.slice(1);
  return repl;
}

/* Each deletion swallows the trailing space and the character after it, so the replacer can
   hand that character back with the capital the phrase was carrying.

   The boundary is decided from the offset, NOT from an optional prefix group. A group like
   `(^|[.!?] +)?` looks equivalent and is not: ECMAScript discards a quantified iteration
   that matched the empty string, so when the `^` branch fires the capture comes back
   undefined and every sentence-initial deletion silently loses its capital. */
function cutRegex(src) {
  return new RegExp(`${src}[ \\t]*(.?)`, "gmi");
}

/* What counts as "the phrase was holding the capital": the start of a line, including the
   heading hashes, blockquote marks and list bullet that may sit in front of it, or a
   sentence stop plus its space. A list item is a sentence for this purpose. */
const SENTENCE_START = /(?:\n[ \t>#]*(?:[-*+]|\d+[.)])?[ \t]*|[.!?]["')\]]?[ \t]+)$/;

function fixPhrases(text, stats) {
  let out = text;
  for (const p of PHRASES) {
    if (p.map) {
      out = out.replace(p.re, (m, suffix) => {
        stats.phrases++;
        return preserveCase(m, p.map[suffix.toLowerCase()]);
      });
    } else {
      out = out.replace(cutRegex(p.cut), (m, next, offset, whole) => {
        /* Refuse a cut that would empty its own line. "In today's data landscape" as an H2
           is still filler, but "## " is not an improvement on it, and a bullet with no item
           is worse than the bullet. Uncounted as well as unapplied, so --check stays honest. */
        const head = whole.slice(whole.lastIndexOf("\n", Math.max(0, offset - 1)) + 1, offset);
        const rest = whole.slice(offset + m.length).split("\n", 1)[0];
        if (!(next + rest).trim() && /^[\s#>*+.)\d-]*$/.test(head)) return m;
        stats.phrases++;
        const opener = offset === 0 || SENTENCE_START.test(whole.slice(Math.max(0, offset - 40), offset));
        return opener && next ? next[0].toUpperCase() + next.slice(1) : next;
      });
    }
  }
  return out;
}

// ── D. spacing ────────────────────────────────────────────────────────────────

/* Five normalisations, ordered so the SET is idempotent, not just each rule. The
   space-before-punctuation rule has to run before missing-space-after-sentence: on
   "word .Next" the reverse order leaves "word.Next" on pass one and only repairs it on
   pass two, which is precisely the property this file exists to guarantee. */
const SPACING = [
  // A no-break space is a machine artefact in body copy far more often than it is
  // typography. The one whitespace rule that replaces rather than deletes.
  { id: "nbsp", re: /\u00A0/g, to: " " },
  { id: "space-before-punctuation", re: /(\w)[ \t]+([,.;:!?])/g, to: "$1$2" },
  /* The (\w) guard is the point of this rule: it only fires when a word character precedes
     the stop, so "1.5" and a bare leading "." are left alone. The trailing (?![A-Z]) covers
     what the guard cannot, namely acronym and extension runs such as "Node.JS" or
     "report.PDF", which are one token and must not be split into two sentences. Real
     sentence boundaries are unaffected, and URLs never reach here at all. */
  { id: "missing-space-after-sentence", re: /(\w)([.!?])([A-Z])(?![A-Z])/g, to: "$1$2 $3" },
  /* Interior runs only. Leading whitespace is list indentation and a trailing double space
     is a deliberate Markdown line break; neither is noise. Runs touching a pipe are the
     padding that keeps a table's columns lined up in the source, so they are left alone
     too: collapsing them reflows every table in the file for no reader-visible gain. */
  { id: "runaway-spaces", re: /([^\s|])[ \t]{2,}(?=[^\s|])/g, to: "$1 " },
  { id: "blank-line-pileup", re: /\n{3,}/g, to: "\n\n" },
];

function fixSpacing(text, stats) {
  let out = text;
  for (const r of SPACING) {
    out = out.replace(r.re, (...m) => {
      stats.spacing++;
      return r.to.replace(/\$(\d)/g, (_, n) => m[Number(n)] ?? "");
    });
  }
  return out;
}

// ── engine ────────────────────────────────────────────────────────────────────

/* Every key any pass increments is declared here. A sibling repo declared three keys and
   incremented a fourth from inside a helper, so `stats.spacing++` ran against undefined and
   every single call came back NaN. checkStatsContract() reads this file back and fails the
   selftest the moment the two sets drift apart again. */
function newStats() {
  return { invisibles: 0, emdash: 0, endash: 0, phrases: 0, spacing: 0 };
}
const totalOf = (s) => Object.values(s).reduce((a, b) => a + b, 0);

export function scrub(text, { keepBidi = false } = {}) {
  const stats = newStats();
  let out = stripInvisible(text, stats, keepBidi);
  out = fixDashes(out, stats);
  out = mapUnprotected(out, (seg) => fixPhrases(seg, stats));
  out = mapUnprotected(out, (seg) => fixSpacing(seg, stats));
  // `changed` is the authoritative answer and it comes from the bytes, never from the
  // counters: a rule can fire and produce identical text, and a counter can be forgotten.
  return { text: out, stats, total: totalOf(stats), changed: out !== text };
}

// ── selftest ──────────────────────────────────────────────────────────────────

const ZWSP = "\u200B";
const SAMPLE = [
  "# Rollout notes",
  "",
  `In today's competitive landscape, the migration is done${ZWSP}. It's important to note that the`,
  `team will leverage the cache ${EM} however the queue is still cold, so throughput is capped.`,
  `The p99 was flat, the vendor said ${EM} the retry budget is fixed.`,
  `Latency dropped 12% ${EN} Maria Perez, SRE lead.`,
  `Needless to say, we utilize the same key ${EM} , and nothing else moved.Nobody noticed.`,
  "",
  `See https://example.com/a${ZWSP}/b?x=1&y=2 and \`npm run build ${EM} watch\` before you delve into`,
  "the traces. When it comes to alerts, the pager is quiet.",
  "",
  "## In today's cold landscape",
  "",
  "- In conclusion, ship it",
  "",
  "| col | col |",
  "|-----|-----|",
  "| a   | b   |",
  "",
  "```sh",
  `ffmpeg -i in.mp4 ${EM} preset slow   out.mp4`,
  "```",
  "",
  "",
  "",
  "Done.",
  "",
].join("\n");

function checkStatsContract() {
  const src = readFileSync(new URL(import.meta.url), "utf8");
  const used = new Set([...src.matchAll(/stats\.(\w+)\s*(?:\+\+|\+=)/g)].map(m => m[1]));
  const declared = new Set(Object.keys(newStats()));
  return {
    used: [...used].sort(),
    declared: [...declared].sort(),
    missing: [...used].filter(k => !declared.has(k)),
    unused: [...declared].filter(k => !used.has(k)),
  };
}

function selftest() {
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass, detail });

  const one = scrub(SAMPLE);
  const two = scrub(one.text);

  ok("idempotence: a second pass changes no bytes", two.text === one.text,
    two.text === one.text ? "byte-identical" : "second pass produced different bytes");
  ok("idempotence: a second pass counts nothing", two.total === 0, `second pass counted ${two.total}`);

  const contract = checkStatsContract();
  ok("stats contract: every incremented key is initialised", contract.missing.length === 0,
    contract.missing.length ? `never initialised: ${contract.missing.join(", ")}` : contract.declared.join(", "));
  ok("stats contract: every initialised key is incremented", contract.unused.length === 0,
    contract.unused.length ? `declared but dead: ${contract.unused.join(", ")}` : "all five in use");
  ok("stats contract: no counter came back NaN", Object.values(one.stats).every(Number.isFinite),
    JSON.stringify(one.stats));

  ok("invisibles are gone", !/\p{Cf}|[\u202F\u2028\u2029]/u.test(one.text), "no format codepoint survives");
  ok("prose carries no long dash",
    nextDashOutside(one.text, 0, protectedRanges(one.text)) === -1, "every occurrence resolved");
  ok("URL survived intact", one.text.includes("https://example.com/a/b?x=1&y=2"),
    "zero-width removed without inserting a space");
  ok("fenced code untouched", one.text.includes(`ffmpeg -i in.mp4 ${EM} preset slow   out.mp4`),
    "fence body byte-identical, triple space included");
  ok("table separator untouched", one.text.includes("|-----|-----|"), "separator row intact");
  ok("inline code untouched", one.text.includes(`\`npm run build ${EM} watch\``), "span intact");
  ok("two clauses became a semicolon", /cache; however/.test(one.text), "rule two-clauses-conjunctive");
  ok("attribution became a comma", /vendor said, the retry/.test(one.text), "rule attribution, before-side");
  ok("named source became a comma", /12%, Maria Perez/.test(one.text), "rule attribution, after-side");
  ok("dash before punctuation was dropped", /same key, and nothing/.test(one.text),
    "rule punctuation-already-there");
  ok("swaps preserved case", /team will use the cache/.test(one.text) && /We use the same key/.test(one.text),
    "leverage and utilize both collapse to use");
  ok("delve into became explore", /you explore/.test(one.text), "verb swap across a line break");
  ok("deleted opener re-capitalised", /^The migration is done\./m.test(one.text),
    "the sentence still starts with a capital");
  ok("list item re-capitalised after a cut", /^- Ship it$/m.test(one.text), "bullet counts as a sentence start");
  ok("a cut that would empty its line is refused", one.text.includes("## In today's cold landscape"),
    "a heading is left whole rather than reduced to its hashes");
  ok("missing space after a stop was added", /moved\. Nobody noticed/.test(one.text), "spacing rule fired");
  ok("blank-line pileup collapsed", !/\n{3,}/.test(one.text), "at most one blank line");

  const failed = results.filter(r => !r.pass);
  if (!has("--quiet")) {
    for (const r of results) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
    console.log(`[scrub] selftest: ${results.length - failed.length}/${results.length} passed. First pass counted ${JSON.stringify(one.stats)}.`);
  }
  process.exit(failed.length ? 1 : 0);
}

// ── cli ───────────────────────────────────────────────────────────────────────

function report(label, r, mode) {
  const s = r.stats;
  const parts = [`${s.invisibles} invisible`, `${s.emdash} em dash`, `${s.endash} en dash`,
    `${s.phrases} phrase`, `${s.spacing} spacing`];
  console.log(`[scrub] ${label}: ${parts.join(", ")} -> ${r.total} change(s) ${mode === "fix" ? "applied" : "pending"}`);
}

function usage(code) {
  console.error("Usage: node scrub.mjs --check <file...> [--keep-bidi] [--json] [--quiet]");
  console.error("       node scrub.mjs --fix   <file...> [--out FILE] [--keep-bidi] [--json] [--quiet]");
  console.error("       node scrub.mjs --selftest");
  console.error("");
  console.error("Removes invisible codepoints, resolves em and en dashes to real punctuation,");
  console.error("cuts stock filler phrases and normalises spacing. Code, URLs and table rules");
  console.error("are left alone. Reading from stdin is supported when no file is given.");
  console.error("");
  console.error("Exit 0 clean, 1 deviations remain or selftest failed, 2 usage or I/O error.");
  process.exit(code);
}

function main() {
  if (has("--help") || has("-h") || args.length === 0) usage(args.length === 0 ? 2 : 0);
  if (has("--selftest")) selftest();
  if (has("--fix") && has("--check")) die("--check and --fix are mutually exclusive");
  const mode = has("--fix") ? "fix" : has("--check") ? "check" : null;
  if (!mode) die("pick a mode: --check, --fix or --selftest");

  const FLAGS = new Set(["--check", "--fix", "--selftest", "--keep-bidi", "--json", "--quiet", "--help", "-h", "--out"]);
  const files = args.filter((a, i) => !FLAGS.has(a) && args[i - 1] !== "--out");
  const outPath = val("--out", null);
  if (outPath && (mode !== "fix" || files.length !== 1)) die("--out needs --fix and exactly one input file");

  const opts = { keepBidi: has("--keep-bidi") };
  const results = [];
  let dirty = 0;

  if (files.length === 0) {
    let stdin = "";
    try { stdin = readFileSync(0, "utf8"); } catch { die("no input file and nothing on stdin"); }
    const r = scrub(stdin, opts);
    if (mode === "fix") process.stdout.write(r.text);
    else if (!has("--quiet") && !has("--json")) report("<stdin>", r, mode);
    if (has("--json")) console.log(JSON.stringify({ mode, files: [{ path: "<stdin>", ...r.stats, total: r.total, changed: r.changed }] }, null, 2));
    process.exit(mode === "check" && r.changed ? 1 : 0);
  }

  for (const f of files) {
    let text;
    try { text = readFileSync(f, "utf8"); } catch (e) { die(`cannot read ${f}: ${e.message}`); }
    const r = scrub(text, opts);
    // A second pass over the output. If it still moves, the bug is in this file rather than
    // in the input, and saying so loudly is worth more than a quiet write.
    const again = scrub(r.text, opts);
    const stable = again.text === r.text;
    if (mode === "fix") {
      const dest = outPath || f;
      try { writeFileSync(dest, r.text); } catch (e) { die(`cannot write ${dest}: ${e.message}`); }
    }
    if (!stable) console.error(`[scrub] ${basename(f)}: NOT STABLE, a second pass would change ${again.total} more thing(s)`);
    if (r.changed || !stable) dirty++;
    results.push({ path: f, ...r.stats, total: r.total, changed: r.changed, stable });
    if (!has("--quiet") && !has("--json")) report(basename(f), r, mode);
  }

  if (has("--json")) console.log(JSON.stringify({ mode, files: results }, null, 2));
  // --check reports what is pending; --fix already wrote, so it only fails when a file
  // refused to settle.
  process.exit(mode === "check" ? (dirty ? 1 : 0) : (results.some(r => !r.stable) ? 1 : 0));
}

// Only run the CLI when this file IS the command. `scrub()` is exported so other tools in
// the repo can call it, and an import must never exit the importing process.
const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (decodeURIComponent(new URL(import.meta.url).pathname) === entry) main();
