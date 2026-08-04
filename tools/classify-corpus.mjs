#!/usr/bin/env node
/**
 * NullToHero :: Corpus classifier
 * Usage: node tools/classify-corpus.mjs [--json] [--ledger] [--sample N]
 *
 * WHY THIS EXISTS
 * ---------------
 * v2.6.0 cut four reference files by hand. It worked because four files fit in
 * one head: each was read, measured with and without, and cut against a rule
 * ("keep what is a choice, drop what is a capability"). That does not scale to
 * 123 files. Cutting the rest by feel is how a real loss hides behind a plausible
 * story, and the near miss in 2.6.0 proved it: the inspector reflex was almost
 * dropped because nobody had measured that it was there.
 *
 * This tool does not decide what to cut. It ranks files so a human or an agent
 * reads the right ones first, and it makes that ranking reproducible so two
 * people arguing about a file are arguing about the same numbers.
 *
 * DESIGN CONSTRAINT: STRUCTURAL ONLY, LIKE THE BUDGET GUARD
 * --------------------------------------------------------
 * No model call, no network, no randomness. Same bytes in, same bytes out,
 * forever. The sample drawn for blind review is selected by a hash of the file
 * path, not by a random number generator, so the reviewer and the classifier
 * are looking at the same ten files on any machine on any day.
 *
 * WHAT THESE SIGNALS ARE, AND WHAT THEY ARE NOT
 * ---------------------------------------------
 * They are proxies. A regex cannot read. The claim here is narrow and testable:
 *
 *   - A table whose cells are short values is a lookup. A table whose cells are
 *     sentences is a decision matrix. Average cell word count separates them,
 *     and the separation is sharp enough to rank on.
 *   - A long fenced block with few magic values is explaining how a feature
 *     works. A short fenced block dense in specific values is carrying a
 *     prescription. Length and value density separate them.
 *   - A line that forbids something AND names a checkable object is a candidate
 *     rule for the detector. A line that states a preference with a reason is
 *     judgment and belongs in prose.
 *
 * Every one of those claims can be wrong on a given file. That is why the gate
 * for this tool is not "the numbers look right", it is agreement with reviewers
 * who never saw the numbers. If agreement is poor, the signals are wrong and
 * this file gets rewritten, not the reviewers overruled.
 *
 * MEASURED: WHAT WORKS AND WHAT DOES NOT
 * -------------------------------------
 * Two validations were run, and they disagree. Both results are recorded here
 * because the second one is the reason this tool must not be trusted alone.
 *
 * Back-test, PASSED. Run against the corpus as it stood before v2.6.0, the four
 * files that were then cut by hand land at ranks 1, 2, 7 and 10 out of 123 on
 * redundant-documentation share, all four with verdict CUT. The tool rediscovers
 * a judgment already made and shipped, without being told about it.
 *
 * Blind review, FAILED. Ten files drawn by path hash were judged by a reviewer
 * who never saw these numbers. Agreement was 4 of 10, against a gate set at 8.
 * The disagreement is not noise, it has one shape: on technical.md, polish.md,
 * sxo.md and content.md the reviewer says CUT at 65 to 70 percent and this tool
 * says KEEP or EXTRACT. Those four files hold 0.0 to 8.2 percent of their lines
 * in code fences. The redundancy in them is in prose, and a fence-ratio signal
 * cannot see prose.
 *
 * The consequence reaches further than this file. v2.6.0 cut four references on
 * the strength of their code-block share, and the cut was correct. But those
 * four were code-heavy, and that is why the signal found them. It does not
 * generalise: here teach.md carries the highest fence ratio of the sample at
 * 17.8 percent and the reviewer keeps it, while polish.md and content.md carry
 * zero and the reviewer cuts two thirds of each. Ranking 123 files on fence
 * ratio would systematically protect the wrong ones.
 *
 * So the honest scope of this tool, today, is narrow: it ranks code-form
 * redundancy and lookup data, both reliably. It does not measure prose-form
 * redundancy at all, and prose is where most of the remaining bloat sits. The
 * corpus-wide removable share is currently bounded, not known: 8.6 percent is
 * the mechanical floor this tool can see, and a single unverified reviewer pass
 * put it near 54 percent. Closing that gap needs a semantic pass per file, run
 * under the v2.6.0 two-test protocol, not a better regex.
 *
 * VERDICTS
 * --------
 *   KEEP     mostly judgment. Prose is the right home. Leave it alone.
 *   EXTRACT  carries lookup data that should move to a queryable store.
 *   HARDEN   carries checkable interdictions that should become detector rules.
 *   CUT      carries feature documentation the model already has.
 *
 * A file gets the verdict of its largest actionable share, with KEEP as the
 * default when nothing crosses its threshold. Ties break in the order
 * CUT > EXTRACT > HARDEN, because removing beats moving and moving beats
 * rewriting.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS = ["audit", "inspect", "seo", "siteasy"];
const ROOT = new URL("..", import.meta.url).pathname;

// A value the model would not produce on its own: hex colours, bezier control
// points, numbers carrying a unit, and bare decimals that are not list markers.
const MAGIC =
  /#[0-9a-fA-F]{3,8}\b|cubic-bezier\([^)]*\)|\b\d+(?:\.\d+)?\s*(?:ms|s|px|rem|em|ch|vw|vh|%|:1|Hz|KB|MB)\b|\b0\.\d{2,}\b/g;

// Forbids or mandates something. Deliberately narrow: "should" and "consider"
// are not here, because a rule the detector can enforce is never a suggestion.
const MANDATE =
  /\b(never|don't|do not|must not|must|always|ban(?:ned)?|forbidden|required|no more than|at least|at most|max(?:imum)?|min(?:imum)?|cap(?:ped)?|fails?\b)/i;

// Names something a script could look at.
const CHECKABLE =
  /`[^`]+`|#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?\s*(?:ms|s|px|rem|em|ch|vw|vh|%|:1)\b|\b(?:aria-|data-|--)[a-z-]+/;

// Preference with a reason attached. This is the shape of an arbitrage.
const JUDGMENT =
  /\b(prefer|rather than|instead of|reach for|because|so that|the reason|trade-?off|unless|when the brief|by default|the point is|which is why)\b/i;

function classifyFile(path, text) {
  const lines = text.split("\n");
  const b = { fenceDoc: 0, fenceValue: 0, tableData: 0, tableJudgment: 0, assertion: 0, judgment: 0, prose: 0 };

  // Pass 1: collect fenced blocks whole, so a block can be judged by its own
  // length and value density rather than line by line.
  const blocks = [];
  let cur = null;
  const nonFence = [];
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (cur) { blocks.push(cur); cur = null; } else { cur = []; }
      continue;
    }
    if (cur) cur.push(line); else nonFence.push(line);
  }
  if (cur) blocks.push(cur);

  for (const blk of blocks) {
    const body = blk.join("\n");
    const magic = (body.match(MAGIC) || []).length;
    // A block is carrying prescription if it is short, or if it is dense in
    // values the model cannot guess. Otherwise it is explaining a feature.
    const carriesValue = blk.length <= 6 || magic / Math.max(blk.length, 1) >= 0.3;
    if (carriesValue) b.fenceValue += blk.length + 2; else b.fenceDoc += blk.length + 2;
  }

  for (const line of nonFence) {
    const t = line.trim();
    if (!t) { b.prose++; continue; }

    if (t.startsWith("|") && (t.match(/\|/g) || []).length >= 3) {
      const cells = t.split("|").slice(1, -1).map((c) => c.trim()).filter(Boolean);
      if (!cells.length || /^[-: ]+$/.test(cells.join(""))) { b.tableData++; continue; }
      const avgWords = cells.reduce((s, c) => s + c.split(/\s+/).length, 0) / cells.length;
      // Short cells are values in a lookup. Long cells are sentences, which
      // means the table is a decision matrix and belongs in prose.
      if (avgWords <= 4) b.tableData++; else b.tableJudgment++;
      continue;
    }

    if (MANDATE.test(t) && CHECKABLE.test(t)) { b.assertion++; continue; }
    if (JUDGMENT.test(t)) { b.judgment++; continue; }
    b.prose++;
  }

  const total = lines.length;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  const magicDensity = ((text.match(MAGIC) || []).length / Math.max(total, 1)) * 100;

  const shares = {
    cut: pct(b.fenceDoc),
    extract: pct(b.tableData),
    harden: pct(b.assertion),
    keep: pct(b.judgment + b.tableJudgment + b.fenceValue),
  };

  // Thresholds. Chosen so a file has to be substantially made of a thing before
  // it is labelled that thing. They are arguable, which is what the blind
  // review is for.
  const T = { cut: 20, extract: 15, harden: 12 };
  let verdict = "KEEP";
  const candidates = [];
  if (shares.cut >= T.cut) candidates.push(["CUT", shares.cut / T.cut]);
  if (shares.extract >= T.extract) candidates.push(["EXTRACT", shares.extract / T.extract]);
  if (shares.harden >= T.harden) candidates.push(["HARDEN", shares.harden / T.harden]);
  if (candidates.length) {
    const order = { CUT: 3, EXTRACT: 2, HARDEN: 1 };
    candidates.sort((x, y) => y[1] - x[1] || order[y[0]] - order[x[0]]);
    verdict = candidates[0][0];
  }

  return { path, lines: total, buckets: b, shares, magicDensity, verdict };
}

// Deterministic sample: FNV-1a over the path. No RNG, so the ten files drawn
// for blind review are the same ten on every machine.
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

const files = [];
for (const skill of SKILLS) {
  const dir = join(ROOT, "skills", skill, "references");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const rel = `skills/${skill}/references/${f}`;
    files.push(classifyFile(rel, readFileSync(join(dir, f), "utf8")));
  }
}
files.sort((a, b) => a.path.localeCompare(b.path));

const args = process.argv.slice(2);
const sampleN = args.includes("--sample") ? Number(args[args.indexOf("--sample") + 1]) || 10 : 0;

if (args.includes("--json")) {
  console.log(JSON.stringify({ files, generated: "deterministic" }, null, 2));
} else if (sampleN) {
  const sample = [...files].sort((a, b) => hash(a.path) - hash(b.path)).slice(0, sampleN);
  for (const f of sample) console.log(f.path);
} else {
  const agg = files.reduce((a, f) => {
    a[f.verdict] = (a[f.verdict] || 0) + 1;
    a.lines += f.lines;
    a.cutLines += Math.round((f.shares.cut / 100) * f.lines);
    a.extractLines += Math.round((f.shares.extract / 100) * f.lines);
    a.hardenLines += Math.round((f.shares.harden / 100) * f.lines);
    return a;
  }, { lines: 0, cutLines: 0, extractLines: 0, hardenLines: 0 });

  console.log(`Corpus: ${files.length} references, ${agg.lines} lines\n`);
  console.log("Verdicts:");
  for (const v of ["KEEP", "CUT", "EXTRACT", "HARDEN"]) console.log(`  ${v.padEnd(9)} ${String(agg[v] || 0).padStart(3)} files`);
  console.log(`\nAddressable lines (upper bound, before review):`);
  console.log(`  documentation the model has   ${String(agg.cutLines).padStart(5)} lines`);
  console.log(`  lookup data to extract        ${String(agg.extractLines).padStart(5)} lines`);
  console.log(`  interdictions to harden       ${String(agg.hardenLines).padStart(5)} lines`);
  console.log(`\nTop 12 by addressable share:`);
  const scored = files
    .map((f) => ({ ...f, addr: f.shares.cut + f.shares.extract + f.shares.harden }))
    .sort((a, b) => b.addr - a.addr)
    .slice(0, 12);
  for (const f of scored) {
    console.log(`  ${f.verdict.padEnd(8)} ${String(f.lines).padStart(4)}l  cut ${f.shares.cut.toFixed(0).padStart(2)}%  data ${f.shares.extract.toFixed(0).padStart(2)}%  hard ${f.shares.harden.toFixed(0).padStart(2)}%  ${f.path.replace("skills/", "")}`);
  }
}

if (args.includes("--ledger")) {
  const out = join(ROOT, "tools", "data", "corpus-ledger.json");
  writeFileSync(out, JSON.stringify({ files }, null, 2) + "\n");
  console.error(`\nledger written: tools/data/corpus-ledger.json`);
}
