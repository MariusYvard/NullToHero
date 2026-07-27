#!/usr/bin/env node
/**
 * score.mjs - composite editorial-quality score for a Markdown draft, computed without a
 * model.
 *
 * What this measures is craft, not disguise. Prose with varied sentence rhythm, concrete
 * claims and a real balance of paragraph to list is easier to read, easier to trust and
 * easier to quote, whether the reader is a person skimming on a phone or an engine picking
 * a passage to cite. Every number below is a proxy for one of those three, measured the
 * same way twice, so a draft can be compared against itself across revisions.
 *
 *   node score.mjs <file.md> [--keyword "target phrase"] [--markdown]
 *
 * Options
 *   --keyword K      primary keyword or phrase, needed for the density checks
 *   --title T        override the title (default: front matter, then the first H1)
 *   --description D  override the meta description (default: front matter)
 *   --domain HOST    treat links to HOST as internal rather than external
 *   --markdown       human report instead of JSON
 *   --min N          pass mark, default 70
 *
 * Exit codes
 *   0  composite at or above the pass mark
 *   1  composite below the pass mark
 *   2  usage error, unreadable file, or a broken scoring config
 *
 * Pure Node standard library, no dependencies, no network, no model call. The code
 * computes; the report says what the numbers are and what to do about them.
 */
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const die = (m, c = 2) => { console.error(`[score] ${m}`); process.exit(c); };

// ── weights ───────────────────────────────────────────────────────────────────

/* Humanity first because rhythm and filler are what a reader feels in the first paragraph.
   Specificity second because it is what makes a passage worth quoting. SEO is weighted
   lightest of the deliberate levers: the mechanics are cheap to fix and cheap to fake, so
   they should never carry a weak draft over the line. */
const WEIGHTS = { humanity: 0.30, specificity: 0.25, structureBalance: 0.20, seo: 0.15, readability: 0.10 };

/* The composite is a weighted mean, so the weights have to sum to exactly 1.00 or "out of
   100" is a false claim. A sibling repo shipped weights summing to 1.05 and could return a
   composite of 105 on a 100-point scale, which no consumer of the JSON was checking for.
   Asserted at startup and fatal, because a config this small has no excuse for drifting. */
const WEIGHT_SUM = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  die(`weights sum to ${WEIGHT_SUM.toFixed(4)}, not 1.00. The composite would not be out of 100.`);
}

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const r1 = (n) => Math.round(n * 10) / 10;

// ── vocabulary ────────────────────────────────────────────────────────────────

/* Filler connectives: stock openers and hedges that take up words without adding a fact.
   Each one is a phrase a reader can delete and lose nothing. */
const FILLER = [
  "it's important to note", "it is important to note", "it's worth noting", "it is worth noting",
  "in today's", "in conclusion", "at the end of the day", "without further ado",
  "needless to say", "when it comes to", "in the realm of", "in the world of",
  "delve into", "delve deeper", "leverage", "utilize", "harness the power",
  "navigate the complexities", "unlock the potential", "a testament to",
  "plays a crucial role", "plays a vital role", "it is essential to",
  "ever-evolving", "rapidly changing landscape", "game-changer", "moreover",
  "furthermore", "in summary", "that being said", "last but not least",
];

/* Vague quantifiers and empty adjectives: words that occupy the slot where a number, a
   name or a date belongs. */
const VAGUE = [
  "various", "several", "many", "some", "significant", "substantial", "numerous",
  "often", "typically", "generally", "usually", "certain", "appropriate", "effective",
  "efficient", "robust", "powerful", "seamless", "innovative", "cutting-edge",
  "state-of-the-art", "world-class", "leading", "comprehensive", "holistic", "synergy",
  "solutions", "things", "stuff", "very", "really", "quite", "relatively", "arguably",
  "essentially", "basically", "potentially", "a range of", "a variety of", "a number of",
];

const CONJ_START = /^(and|but|so|yet)\b/i;
const PASSIVE = /\b(?:is|are|was|were|been|being)\s+\w+ed\b/gi;
const CONTRACTION = /\b\w+['’](s|t|re|ve|ll|d|m)\b/gi;
const SECOND_PERSON = /\b(you|your|you're|yours)\b/gi;

const words = (t) => t.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];
const per1000 = (count, total) => (total ? (count / total) * 1000 : 0);

// ── source extraction ─────────────────────────────────────────────────────────

function splitFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { front: {}, body: raw };
  const front = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (kv) front[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { front, body: raw.slice(m[0].length) };
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s{0,3}\1[^\n]*$/gm;
const stripFences = (t) => t.replace(FENCE, "").replace(/^\s{0,3}(?:`{3,}|~{3,})[\s\S]*$/m, "");

/* Eight MULTILINE passes that reduce a Markdown document to the prose a reader actually
   reads in sentences. This is not cosmetic: a heading has no terminal stop, a table row is
   two words between pipes, and a bulleted list is a column of five-word fragments. Segment
   a structured document without this and the sentence-length series is mostly structure,
   the standard deviation collapses, and a well-written article scores as monotone. */
function proseOnly(body) {
  let t = body;
  t = t.replace(FENCE, "\n");                                       // 1 fenced code
  t = t.replace(/^\s{0,3}#{1,6}\s+.*$/gm, "");                      // 2 headings
  t = t.replace(/^\s*\|.*$/gm, "");                                 // 3 table rows
  t = t.replace(/^\s*(?:[-*+]|\d+[.)])\s+.*$/gm, "");               // 4 list items
  t = t.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "");            // 5 horizontal rules
  t = t.replace(/^\s*\*\*[^*\n]+\*\*:?\s*$/gm, "");                 // 6 bold labels on their own line
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, "")                        // 7 images, then links to their text
       .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  t = t.replace(/`[^`\n]*`/g, "")                                   // 8 residual inline markup
       .replace(/^\s*>\s?/gm, "")
       .replace(/[*_]{1,3}/g, "");
  return t;
}

// ── sentence rhythm ───────────────────────────────────────────────────────────

/* Rhythm is the single most objective humanity signal available without a model, so it is
   folded into that dimension and also reported on its own. */
function rhythm(prose) {
  const sentences = prose
    .split(/[.!?]+(?:\s|$)/)
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(s => s.length >= 5);          // fragments shorter than this are list debris

  if (sentences.length < 10) {
    // Below ten sentences the standard deviation is noise, so refuse to score rather than
    // report a number the sample cannot support. 70 is neutral and does not move the
    // composite in either direction.
    return { score: 70, label: "insufficient-data", sentences: sentences.length,
      mean: null, stdev: null, monotoneWindows: 0,
      note: "Fewer than 10 prose sentences; rhythm not scored." };
  }

  const lens = sentences.map(s => words(s).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const stdev = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);

  /* A sliding window of five: a stretch where every sentence sits within five words of the
     local average reads as a metronome even when the document-wide deviation looks fine.
     Overlapping windows on purpose, so a long flat passage costs more than a short one. */
  let monotoneWindows = 0;
  for (let i = 0; i + 5 <= lens.length; i++) {
    const win = lens.slice(i, i + 5);
    const m = win.reduce((a, b) => a + b, 0) / 5;
    if (win.every(l => Math.abs(l - m) <= 5)) monotoneWindows++;
  }

  /* Peak at a deviation of 10 words. Below 5 the prose is a metronome and the floor of 40
     says so. Above 15 the variance is real but so is the risk that it comes from runaway
     sentences rather than craft, so the band is capped at 80 instead of rewarded. */
  let score;
  if (stdev < 5) score = 40 + stdev * 6;
  else if (stdev <= 15) score = 100 - Math.abs(10 - stdev) * 2;
  else score = Math.min(80, 100 - Math.abs(10 - stdev) * 2);

  const penalty = Math.min(20, monotoneWindows * 3);   // capped: one flat section is a note, not a verdict
  return {
    score: Math.round(clamp(score - penalty)), label: "measured", sentences: sentences.length,
    mean: r1(mean), stdev: r1(stdev), monotoneWindows, penalty,
    note: `${sentences.length} sentences, mean ${r1(mean)} words, stdev ${r1(stdev)}, ${monotoneWindows} monotone window(s).`,
  };
}

// ── humanity ──────────────────────────────────────────────────────────────────

function humanity(prose, allWords, rhythmResult, locate) {
  const total = allWords.length;
  const findings = [];
  const lower = prose.toLowerCase();

  /* Filler is counted by PRESENCE, not frequency: fifty repeats of one phrase count once.
     That is a deliberate calibration. Repetition of a single tic is a style habit and one
     find-and-replace fixes it; a draft carrying twelve DIFFERENT stock openers has a
     structural problem the writer has to solve paragraph by paragraph. The score is aimed
     at the second, so the metric counts distinct offenders. */
  const present = FILLER.filter(p => lower.includes(p));
  const fillerDensity = per1000(present.length, total);
  let score = 100;
  if (fillerDensity > 5) {
    const p = Math.min(30, (fillerDensity - 5) * 3);
    score -= p;
    findings.push({
      issue: `${present.length} distinct filler phrase(s), ${r1(fillerDensity)} per 1000 words`,
      fix: `Cut or rewrite: ${present.slice(0, 6).join(", ")}. Each one is a sentence opener that says nothing.`,
      severity: fillerDensity > 10 ? "high" : "medium",
      location: locate(present[0]),
    });
  }

  const passiveHits = prose.match(PASSIVE) || [];
  const passive = passiveHits.length;
  const passiveRatio = total ? (passive / total) * 100 : 0;
  if (passiveRatio > 2) {
    score -= Math.min(15, (passiveRatio - 2) * 5);
    findings.push({
      issue: `${passive} passive constructions, ${r1(passiveRatio)}% of words`,
      fix: "Name the actor. Passive voice hides who did the thing, which is usually the fact the reader wanted.",
      severity: passiveRatio > 5 ? "high" : "low",
      location: locate(passiveHits[0] || ""),
    });
  }

  /* Conversational credit, capped at 15 so it can offset a habit but never buy a pass.
     Questions, direct address and a sentence that starts on a conjunction are the cheap
     signals that a person shaped the paragraph for a reader. */
  const questions = (prose.match(/\?/g) || []).length;
  const you = (prose.match(SECOND_PERSON) || []).length;
  const conjunctionStarts = prose.split(/[.!?]+\s/).filter(s => CONJ_START.test(s.trim())).length;
  const bonus = Math.min(15,
    Math.min(6, questions * 2) + Math.min(6, per1000(you, total)) + Math.min(3, conjunctionStarts));
  score += bonus;

  const contractions = (prose.match(CONTRACTION) || []).length;
  const contractionRatio = total ? (contractions / total) * 100 : 0;
  if (contractionRatio < 1) {
    score -= 10;
    findings.push({
      issue: `${r1(contractionRatio)}% contractions`,
      fix: "Use the contraction where you would speak it. Uniformly expanded forms read as dictation, not prose.",
      severity: "low",
      location: "document",
    });
  }

  if (rhythmResult.label === "measured" && rhythmResult.score < 70) {
    findings.push({
      issue: rhythmResult.note,
      fix: rhythmResult.stdev < 5
        ? "Break one long sentence in three and let one run. Uniform length is what makes a page feel flat."
        : "Tighten the outliers; the variance is coming from sentences that lost their way, not from craft.",
      severity: rhythmResult.score < 50 ? "high" : "medium",
      location: "document",
    });
  }

  // Rhythm carries 40% of the dimension: it is measured rather than matched against a word
  // list, so it is the part of "humanity" least able to be gamed by a search and replace.
  const base = clamp(score);
  return {
    score: Math.round(0.6 * base + 0.4 * rhythmResult.score),
    findings,
    detail: { fillerPresent: present.length, fillerDensity: r1(fillerDensity), passive,
      passiveRatio: r1(passiveRatio), conversationalBonus: r1(bonus), contractionRatio: r1(contractionRatio),
      base: Math.round(base), rhythm: rhythmResult.score },
  };
}

// ── specificity ───────────────────────────────────────────────────────────────

/* Two capitalised words in a row, then a verb of attribution. Requiring TWO is the whole
   point: a single capitalised word matches the first word of every sentence, so a
   one-word pattern rewards a draft for having sentences. */
const ENTITY_CLAIM = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b\s+(?:said|reported|found|announced|published|noted|showed|confirmed|estimates?|argues?)\b/g;
const PERCENT = /\d+(?:\.\d+)?\s?%/g;
const MONEY = /[$€£¥]\s?\d[\d,.]*\s?(?:k|m|bn|billion|million|thousand)?\b/gi;
const YEAR = /\b(?:19|20)\d{2}\b/g;
const NUMBER = /\b\d+(?:[.,]\d+)?\b/g;

function specificity(prose, allWords, locate) {
  const total = allWords.length;
  const findings = [];
  /* Base 70, not 100. Specificity is the one dimension where the absence of evidence IS
     the finding: a draft that names nothing starts below the pass mark and has to earn its
     way up with facts, rather than starting perfect and being docked for vagueness. */
  let score = 70;

  const vagueHits = [];
  for (const w of VAGUE) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const n = (prose.match(re) || []).length;
    if (n) vagueHits.push({ w, n });
  }
  const vagueCount = vagueHits.reduce((a, b) => a + b.n, 0);
  const vagueDensity = per1000(vagueCount, total);
  if (vagueDensity > 15) {
    score -= Math.min(25, (vagueDensity - 15) * 1.5);
    const worst = vagueHits.sort((a, b) => b.n - a.n).slice(0, 5);
    findings.push({
      issue: `${vagueCount} vague words, ${r1(vagueDensity)} per 1000 words`,
      fix: `Replace with the number, the name or the date: ${worst.map(h => `${h.w} (${h.n})`).join(", ")}.`,
      severity: vagueDensity > 25 ? "high" : "medium",
      location: locate(worst[0]?.w || ""),
    });
  }

  const markers = (prose.match(PERCENT) || []).length + (prose.match(MONEY) || []).length
    + (prose.match(YEAR) || []).length + (prose.match(ENTITY_CLAIM) || []).length;
  const markerDensity = per1000(markers, total);
  if (markerDensity > 2) {
    score += Math.min(30, markerDensity * 5);
  } else {
    findings.push({
      issue: `${markers} specific marker(s), ${r1(markerDensity)} per 1000 words`,
      fix: "Add percentages, amounts, dated years, or an attributed claim (\"Maria Perez reported...\"). These are what a reader quotes.",
      severity: markers === 0 ? "high" : "medium",
      location: "document",
    });
  }

  const numbers = (prose.match(NUMBER) || []).length;
  const numberDensity = per1000(numbers, total);
  if (numberDensity < 3) {
    score -= Math.min(15, (3 - numberDensity) * 5);
    findings.push({
      issue: `${numbers} numbers, ${r1(numberDensity)} per 1000 words`,
      fix: "Quantify at least one claim per section. A number is the cheapest evidence there is.",
      severity: "medium",
      location: "document",
    });
  }

  return {
    score: clamp(score),
    findings,
    detail: { vagueCount, vagueDensity: r1(vagueDensity), markers, markerDensity: r1(markerDensity),
      numbers, numberDensity: r1(numberDensity) },
  };
}

// ── structure balance ─────────────────────────────────────────────────────────

const PROSE_FLOOR = 0.50, PROSE_CEIL = 0.75;

function structureBalance(body) {
  const findings = [];
  const lines = stripFences(body).split("\n").filter(l => l.trim() !== "");
  const headings = lines.filter(l => /^\s{0,3}#{1,6}\s/.test(l)).length;
  const lists = lines.filter(l => /^\s*(?:[-*+]|\d+[.)])\s/.test(l)).length;
  const tables = lines.filter(l => /^\s*\|/.test(l)).length;
  const total = lines.length;
  const denom = total - headings;

  if (denom <= 0) {
    return { score: 70, proseRatio: null, findings,
      detail: { total, headings, lists, tables, note: "nothing but headings; not scored" } };
  }
  const proseRatio = (total - lists - tables - headings) / denom;

  /* Under-listing costs 150 per unit of deficit, over-listing 100 per unit of excess. The
     asymmetry is deliberate and the harsher side is the one people reach for: a wall of
     bullets looks organised and skims well, but it drops every connective that carried the
     argument, so the reader gets the labels and none of the reasoning. A page of unbroken
     paragraphs is harder to skim and still contains the thinking. */
  let score;
  if (proseRatio < PROSE_FLOOR) {
    score = 100 - (PROSE_FLOOR - proseRatio) * 150;
    findings.push({
      issue: `${Math.round(proseRatio * 100)}% prose (${lists} list line(s), ${tables} table line(s))`,
      fix: "Turn the two longest lists back into paragraphs. Bullets hold the labels; the sentences held the argument.",
      severity: proseRatio < 0.3 ? "high" : "medium",
      location: "document",
    });
  } else if (proseRatio > PROSE_CEIL) {
    score = 100 - (proseRatio - PROSE_CEIL) * 100;
    findings.push({
      issue: `${Math.round(proseRatio * 100)}% prose, almost no scannable structure`,
      fix: "Pull one enumeration per section out into a list, and add a table where you are comparing options.",
      severity: "low",
      location: "document",
    });
  } else {
    score = 100;
  }

  return { score: clamp(score), proseRatio: r1(proseRatio * 100) / 100, findings,
    detail: { total, headings, lists, tables, proseRatio: r1(proseRatio * 100) / 100 } };
}

// ── readability ───────────────────────────────────────────────────────────────

/* Flesch Reading Ease and Flesch-Kincaid Grade Level are closed formulas, so they are
   implemented rather than imported. Both need a syllable count, which no closed formula
   provides; the vowel-group heuristic below is the classic one, with the two exceptions
   that matter in English: a silent trailing "e" ("made" is one syllable) and the "-le"
   ending after a consonant, which keeps its own ("table" is two). */
function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // Not stripping the "e" after an "l" is what preserves table, little, cycle.
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

function readability(prose) {
  const findings = [];
  const sentences = prose.split(/[.!?]+(?:\s|$)/).map(s => s.trim()).filter(s => s.length >= 5);
  const w = words(prose);
  if (sentences.length < 3 || w.length < 30) {
    return { score: 70, findings, detail: { note: "too short to score", flesch: null, grade: null } };
  }
  const wps = w.length / sentences.length;
  const spw = w.reduce((a, x) => a + syllables(x), 0) / w.length;
  const flesch = 206.835 - 1.015 * wps - 84.6 * spw;
  const grade = 0.39 * wps + 11.8 * spw - 15.59;

  /* Target band 50 to 70: plain professional English. Below it the prose is dense and
     costs readers, which is why the penalty is steeper. Above it the writing is simple,
     which is a milder problem and sometimes the right call for the audience. */
  let score;
  if (flesch < 50) {
    score = 100 - (50 - flesch) * 1.5;
    findings.push({
      issue: `Flesch ${r1(flesch)}, grade level ${r1(grade)}, ${r1(wps)} words per sentence`,
      fix: "Split the sentences over 30 words and swap the three longest words for shorter ones.",
      severity: flesch < 30 ? "high" : "medium",
      location: "document",
    });
  } else if (flesch > 70) {
    score = 100 - (flesch - 70);
    findings.push({
      issue: `Flesch ${r1(flesch)}, grade level ${r1(grade)}`,
      fix: "Simple to the point of thin. Combine short sentences where they share a subject and add the precise term.",
      severity: "low",
      location: "document",
    });
  } else {
    score = 100;
  }
  return { score: clamp(score), findings,
    detail: { flesch: r1(flesch), grade: r1(grade), wordsPerSentence: r1(wps), syllablesPerWord: r1(spw) } };
}

// ── seo ───────────────────────────────────────────────────────────────────────

/* Multi-word keyword density is the trap here. A sibling repo divided the number of
   OCCURRENCES by the number of words, which silently under-reports every phrase longer
   than one word: a four-word phrase appearing 39 times in a 2600-word article occupies
   156 words, which is 6% of the copy, but occurrence-over-words reports 1.5% and calls it
   ideal. Density has to be measured in words COVERED, which is what this does: match the
   phrase over a token window, count occurrences, multiply by the phrase length. */
function keywordDensity(tokens, keyword) {
  const kw = words(keyword.toLowerCase());
  if (kw.length === 0 || tokens.length === 0) return { occurrences: 0, covered: 0, density: 0, phraseWords: 0 };
  const lower = tokens.map(t => t.toLowerCase());
  let occurrences = 0;
  for (let i = 0; i + kw.length <= lower.length; i++) {
    let hit = true;
    for (let j = 0; j < kw.length; j++) if (lower[i + j] !== kw[j]) { hit = false; break; }
    if (hit) { occurrences++; i += kw.length - 1; }   // non-overlapping: a word is covered once
  }
  const covered = occurrences * kw.length;
  return { occurrences, covered, density: (covered / tokens.length) * 100, phraseWords: kw.length };
}

function seo(body, allWords, { title, description, keyword, domain }) {
  const findings = [];
  let score = 100;
  const lines = body.split("\n");
  const h2 = lines.filter(l => /^\s{0,3}##\s+\S/.test(l)).length;

  const targets = [...body.matchAll(/\[[^\]]*\]\(\s*([^)\s]+)/g)].map(m => m[1])
    .concat([...body.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]));
  /* A link is external when it is absolute AND does not point at --domain. Everything
     else that is not a mailto or a tel is a link into this site: a bare "/docs/x", an
     anchor, a relative path, or an absolute URL on the site's own host. */
  const contact = (t) => /^(?:mailto:|tel:)/i.test(t);
  const absolute = (t) => /^(?:https?:)?\/\//i.test(t);
  const onDomain = (t) => !!domain && t.toLowerCase().includes(domain.toLowerCase());
  const external = targets.filter(t => absolute(t) && !onDomain(t)).length;
  const internal = targets.filter(t => !contact(t) && (!absolute(t) || onDomain(t))).length;

  if (!title) {
    score -= 25;
    findings.push({ issue: "No title", fix: "Add a front matter title or an H1 of 50 to 60 characters.", severity: "high", location: "front matter" });
  } else if (title.length < 50 || title.length > 60) {
    score -= 8;
    findings.push({
      issue: `Title is ${title.length} characters`,
      fix: "Aim for 50 to 60 so it survives the SERP truncation and still reads as a claim.",
      severity: "low", location: "title",
    });
  }

  if (!description) {
    score -= 20;
    findings.push({ issue: "No meta description", fix: "Write 150 to 160 characters that make the promise the page keeps.", severity: "medium", location: "front matter" });
  } else if (description.length < 150 || description.length > 160) {
    score -= 8;
    findings.push({
      issue: `Meta description is ${description.length} characters`,
      fix: "Aim for 150 to 160. Shorter wastes the slot, longer gets cut mid-sentence.",
      severity: "low", location: "front matter",
    });
  }

  if (h2 < 4) {
    score -= 12;
    findings.push({ issue: `${h2} H2 heading(s)`, fix: "Four or more H2s give the page addressable sections a reader and an engine can both jump to.", severity: "medium", location: "document" });
  }
  if (internal < 3) {
    score -= 10;
    findings.push({ issue: `${internal} internal link(s)`, fix: "Link at least three related pages of your own; it is how the rest of the site gets found.", severity: "medium", location: "document" });
  }
  if (external < 2) {
    score -= 8;
    findings.push({ issue: `${external} external link(s)`, fix: "Cite at least two outside sources. Unsourced claims are the ones a reader discounts.", severity: "low", location: "document" });
  }

  let kd = null;
  if (keyword) {
    kd = keywordDensity(allWords, keyword);
    if (kd.density > 3) {
      score -= 25;
      findings.push({
        issue: `Keyword density ${r1(kd.density)}% (${kd.occurrences} occurrence(s) of a ${kd.phraseWords}-word phrase covering ${kd.covered} words)`,
        fix: "Cut roughly half the occurrences and let synonyms and pronouns carry the rest. Past 3% the copy stops reading like a sentence.",
        severity: "high", location: "document",
      });
    } else if (kd.density < 1 || kd.density > 2) {
      score -= 10;
      findings.push({
        issue: `Keyword density ${r1(kd.density)}% (${kd.occurrences} occurrence(s) covering ${kd.covered} of ${allWords.length} words)`,
        fix: kd.density < 1
          ? "Work the phrase into the title, the first paragraph and one H2, in a sentence that would exist anyway."
          : "Trim to the 1 to 2% band; the extra repeats are not buying anything.",
        severity: "medium", location: "document",
      });
    }
  } else {
    findings.push({ issue: "No --keyword given, density not measured", fix: "Re-run with --keyword \"target phrase\" to include the density checks.", severity: "low", location: "cli" });
  }

  return { score: clamp(score), findings,
    detail: { title: title ? title.length : 0, description: description ? description.length : 0,
      h2, internal, external, keyword: keyword || null, keywordDensity: kd ? r1(kd.density) : null,
      keywordOccurrences: kd ? kd.occurrences : null, keywordWordsCovered: kd ? kd.covered : null } };
}

// ── helpers ───────────────────────────────────────────────────────────────────

/* Locations are resolved against the RAW file, never against the stripped prose or the
   post-front-matter body. The prose copy has had headings, lists and tables deleted out of
   it and the body has lost the front matter, so both number their lines differently from
   the file the writer actually opens. */
function makeLocator(raw) {
  const lines = raw.split("\n");
  return (needle) => {
    if (!needle) return "document";
    const n = needle.toLowerCase();
    for (let i = 0; i < lines.length; i++) if (lines[i].toLowerCase().includes(n)) return `line ${i + 1}`;
    return "document";
  };
}

// ── engine ────────────────────────────────────────────────────────────────────

export function scoreDocument(raw, opts = {}) {
  const { front, body } = splitFrontMatter(raw);
  const prose = proseOnly(body);
  const allWords = words(stripFences(body));

  const title = opts.title || front.title || (body.match(/^\s{0,3}#\s+(.+)$/m) || [])[1] || "";
  const description = opts.description || front.description || front.excerpt || "";

  const rhythmResult = rhythm(prose);
  const locate = makeLocator(raw);
  const dims = {
    humanity: humanity(prose, allWords, rhythmResult, locate),
    specificity: specificity(prose, allWords, locate),
    structureBalance: structureBalance(body),
    seo: seo(body, allWords, { title: title.trim(), description: description.trim(), keyword: opts.keyword, domain: opts.domain }),
    readability: readability(prose),
  };

  const scores = {};
  for (const [k, v] of Object.entries(dims)) scores[k] = Math.round(v.score);
  const composite = Math.round(Object.entries(WEIGHTS).reduce((a, [k, w]) => a + w * scores[k], 0));

  /* Impact ranks a fix by what fixing it is worth: the dimension's weight times the points
     it is currently leaving on the table. A perfect dimension contributes zero however many
     findings it produced, and a heavy dimension at 40 outranks a light one at 0.

     Severity breaks the tie, and it has to. Impact is a per-DIMENSION number, so every
     finding inside one dimension carries the same figure; without the tiebreak the order
     inside a dimension is whatever order the checks happen to run in, and a page stuffed to
     5% keyword density got a top five of "title is 13 characters" while the one finding
     that mattered sat sixth. */
  const RANK = { high: 0, medium: 1, low: 2 };
  const priorityFixes = Object.entries(dims)
    .flatMap(([dimension, v]) => v.findings.map(f => ({
      location: f.location, dimension, issue: f.issue, fix: f.fix, severity: f.severity,
      impact: r1(WEIGHTS[dimension] * (100 - scores[dimension])),
    })))
    .sort((a, b) => b.impact - a.impact || (RANK[a.severity] ?? 3) - (RANK[b.severity] ?? 3))
    .slice(0, 5);

  const passMark = opts.min ?? 70;
  return {
    scores, composite, passed: composite >= passMark, passMark,
    proseRatio: dims.structureBalance.proseRatio ?? null,
    rhythm: rhythmResult,
    priorityFixes,
    weights: WEIGHTS,
    words: allWords.length,
    detail: Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, v.detail])),
  };
}

// ── report ────────────────────────────────────────────────────────────────────

function markdownReport(name, res) {
  const bar = (n) => "#".repeat(Math.round(n / 10)).padEnd(10, ".");
  const out = [];
  out.push(`# Editorial quality: ${name}`);
  out.push("");
  out.push(`**${res.composite}/100** against a pass mark of ${res.passMark}: ${res.passed ? "PASS" : "BELOW THRESHOLD"}. ${res.words} words.`);
  out.push("");
  out.push("| Dimension | Weight | Score | |");
  out.push("|---|---|---|---|");
  for (const [k, w] of Object.entries(res.weights)) {
    out.push(`| ${k} | ${w.toFixed(2)} | ${res.scores[k]} | \`${bar(res.scores[k])}\` |`);
  }
  out.push("");
  out.push(`Prose ratio ${res.proseRatio === null ? "not scored" : `${Math.round(res.proseRatio * 100)}%`} (target 50 to 75%). Rhythm: ${res.rhythm.note}`);
  out.push("");
  if (res.priorityFixes.length === 0) {
    out.push("No findings. Every dimension is inside its band.");
  } else {
    out.push("## Fix these first");
    out.push("");
    out.push("Ranked by weight times points available, so the top line is worth the most to the composite.");
    out.push("");
    for (const [i, f] of res.priorityFixes.entries()) {
      out.push(`${i + 1}. **${f.dimension}** (${f.severity}, impact ${f.impact}) at ${f.location}`);
      out.push(`   - ${f.issue}`);
      out.push(`   - ${f.fix}`);
    }
  }
  return out.join("\n");
}

// ── cli ───────────────────────────────────────────────────────────────────────

function usage(code) {
  console.error("Usage: node score.mjs <file.md> [--keyword \"target phrase\"] [--markdown]");
  console.error("");
  console.error("  --keyword K      primary keyword or phrase, needed for the density checks");
  console.error("  --title T        override the title (default: front matter, then the first H1)");
  console.error("  --description D  override the meta description (default: front matter)");
  console.error("  --domain HOST    count links to HOST as internal");
  console.error("  --min N          pass mark, default 70");
  console.error("  --markdown       human report instead of JSON");
  console.error("");
  console.error("Scores editorial quality on five weighted dimensions: humanity 0.30,");
  console.error("specificity 0.25, structureBalance 0.20, seo 0.15, readability 0.10.");
  console.error("Deterministic, no network, no model.");
  console.error("");
  console.error("Exit 0 at or above the pass mark, 1 below it, 2 usage or config error.");
  process.exit(code);
}

function main() {
  if (has("--help") || has("-h") || args.length === 0) usage(args.length === 0 ? 2 : 0);
  const VALUED = new Set(["--keyword", "--title", "--description", "--domain", "--min"]);
  const FLAGS = new Set(["--markdown", "--help", "-h", ...VALUED]);
  const file = args.find((a, i) => !FLAGS.has(a) && !VALUED.has(args[i - 1]));
  if (!file) die("no input file given");

  let raw;
  try { raw = readFileSync(file, "utf8"); } catch (e) { die(`cannot read ${file}: ${e.message}`); }

  const min = Number(val("--min", "70"));
  if (!Number.isFinite(min)) die("--min must be a number");

  const res = scoreDocument(raw, {
    keyword: val("--keyword", null), title: val("--title", null),
    description: val("--description", null), domain: val("--domain", null), min,
  });

  if (has("--markdown")) console.log(markdownReport(basename(file), res));
  else console.log(JSON.stringify(res, null, 2));
  process.exit(res.passed ? 0 : 1);
}

// Only run the CLI when this file IS the command, so importing scoreDocument() from another
// tool cannot exit the importing process.
const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (decodeURIComponent(new URL(import.meta.url).pathname) === entry) main();
