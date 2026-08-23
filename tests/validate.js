#!/usr/bin/env node
/**
 * NullToHero — Reference file integrity validator
 * Usage: node tests/validate.js
 *
 * Checks:
 *  1.  Commands in seo/SKILL.md have corresponding reference files
 *  2.  seo reference files have valid YAML frontmatter
 *  3.  Referenced files exist
 *  4.  File integrity — minimum line counts (catches truncated rewrites)
 *  5.  Agent files exist and have valid frontmatter
 *  6.  Repo quality files present (CHANGELOG.md absence = error)
 *  8b. LICENSE matches the canonical Apache-2.0 body (normalized SHA-256)
 *  7.  seo command count meets minimum (≥19) — error if not met
 *  8.  siteasy SKILL.md and all reference files exist with valid frontmatter
 *  9.  siteasy command→reference mapping (every declared command has a backing file)
 * 10.  siteasy command count meets minimum (≥25)
 * 11.  inspect SKILL.md and all reference files exist with valid frontmatter
 * 11b. audit (meta-orchestrator) SKILL.md, command->reference mapping, reference frontmatter
 * 12.  Version consistency — plugin.json, marketplace.json, package.json, all SKILL.md, install.sh, install.ps1
 * 12b. SECURITY.md supported line (major.minor) and README **vX.Y.Z** token match plugin.json
 * 13.  Large files warning — files over 500 KB in tools/ (known exceptions excluded)
 * 14.  No stale /impeccable command references
 * 15.  Referenced helper scripts exist on disk
 * 16.  All plugin agents are dispatched by an orchestrator reference
 * 17.  In-doc references/*.md and schema/*.json pointers resolve
 * 18.  README headline counts are accurate
 * 19.  reference-index.json matches references on disk (stale-index guard)
 * 20.  No stale present-tense "FAQ restricted to gov/health" claims in SEO references
 * 21.  CSV column integrity - header vs row field counts in tools/ data (quote-aware)
 * 22.  Audit sub-agents are read-only (least agency, no write-class tools)
 * 23.  Every audit sub-agent carries a '## Trust boundary' block
 * 24.  /audit verify consensus mode is wired (SKILL.md command + full.md sections)
 * 25.  docs/ARCHITECTURE.md rationale doc is present
 * 26.  Agents use the deterministic scoring rubric (formula + critical checks)
 * 27.  Orchestrator severity cap is rule-based (deterministic)
 * 28.  /audit compare mode is wired (command + compare.md diff sections)
 * 29.  /audit checks deterministic pre-pass is wired (command + checks.md)
 * 30.  Deterministic audit tooling + JSON schema present (tools/audit/*)
 * 31.  SITE-AUDIT.json + cost ledger wired into the orchestration docs
 * 32.  Reference eval set present and consistent (tests/eval)
 * 33.  Audit-gate GitHub Action + self-test workflow present
 * 34.  Agents read shared audit-assets inputs and return only their section
 * 35.  Stated agent and rule counts match the repository (drift guard)
 * 36.  Reference graph: committed, current, no orphan references, data domains cited
 * 37.  Canonical laws registry: well-formed, unique ids, every law cited in the skills
 */

const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const ROOT       = path.resolve(__dirname, "..");
// The repository is the marketplace; the plugin lives in one subfolder so that
// Claude Code sees a versioned plugin source it can update. Paths written
// plugin-relative (skills/..., agents/..., assets/...) resolve under PLUG;
// tooling, docs and the marketplace manifest stay at ROOT.
const PLUG       = path.join(ROOT, "null-to-hero");
const anyPath    = (rel) => fs.existsSync(path.join(PLUG, rel)) ? path.join(PLUG, rel) : path.join(ROOT, rel);
const SEO_SKILL  = path.join(PLUG, "skills", "seo", "SKILL.md");
const SEO_REFS   = path.join(PLUG, "skills", "seo", "references");
const SEO_AGENTS = path.join(PLUG, "agents");

let errors   = 0;
let warnings = 0;
let checks   = 0;

function pass(msg)    { console.log(`  ✅  ${msg}`); checks++; }
function fail(msg)    { console.error(`  ❌  ${msg}`); errors++; checks++; }
function warn(msg)    { console.warn(`  ⚠️   ${msg}`); warnings++; checks++; }
function section(t)   { console.log(`\n── ${t} ──`); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(filePath) {
  try { return fs.readFileSync(filePath, "utf8"); } catch { return null; }
}

function lineCount(content) {
  return content ? content.split("\n").length : 0;
}

function parseFrontmatter(content) {
  const stripped = content.replace(/^\uFEFF/, ""); // strip UTF-8 BOM
  const match = stripped.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  match[1].split("\n").forEach(line => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) {
      fm[key.trim()] = rest.join(":").trim().replace(/^["']|["']$/g, "");
    }
  });
  return fm;
}

/**
 * Extract command→[refs] map from a SKILL.md Commands table.
 * Handles multiple references per row (separated by " + ").
 */
function extractCommandRefs(skillContent) {
  const map = {};
  if (!skillContent) return map;
  skillContent.split("\n").forEach(line => {
    const cmdMatch = line.match(/^\| `([\w][\w-]*)/);
    if (!cmdMatch) return;
    const cmd = cmdMatch[1];
    const refs = [...line.matchAll(/\[references\/([\w\-/.]+\.md)\]/g)].map(m => m[1]);
    if (refs.length > 0) {
      map[cmd] = refs;
    }
  });
  return map;
}

// ─── Integrity thresholds ─────────────────────────────────────────────────────
// Conservative minimums — actual files are well above these floors.

const FILE_INTEGRITY = {
  // ── seo ──────────────────────────────────────────────────────────────────
  "skills/seo/SKILL.md":                        { minLines:  80 },
  "skills/seo/references/geo.md":               { minLines: 150 },
  "skills/seo/references/audit.md":             { minLines:  60 },
  "skills/seo/references/technical.md":         { minLines:  60 },
  "skills/seo/references/content.md":           { minLines:  60 },
  "skills/seo/references/schema.md":            { minLines:  60 },
  "skills/seo/references/plan.md":              { minLines:  60 },
  "skills/seo/references/page.md":              { minLines:  40 },
  "skills/seo/references/sitemap.md":           { minLines:  60 },
  "skills/seo/references/images.md":            { minLines:  60 },
  "skills/seo/references/local.md":             { minLines:  80 },
  "skills/seo/references/hreflang.md":          { minLines:  80 },
  "skills/seo/references/programmatic.md":      { minLines:  80 },
  "skills/seo/references/competitor-pages.md":  { minLines:  80 },
  "skills/seo/references/cluster.md":           { minLines:  80 },
  "skills/seo/references/sxo.md":               { minLines:  60 },
  "skills/seo/references/drift.md":             { minLines:  80 },
  "skills/seo/references/backlinks.md":         { minLines:  80 },
  "skills/seo/references/ecommerce.md":         { minLines:  80 },
  "skills/seo/references/action-plan.md":       { minLines:  80 },
  "agents/seo-agent-technical.md":      { minLines:  60 },
  "agents/seo-agent-content.md":        { minLines:  60 },
  "agents/seo-agent-schema.md":         { minLines:  60 },
  "agents/seo-agent-geo.md":            { minLines:  60 },
  "agents/seo-agent-performance.md":    { minLines:  60 },
  "agents/inspect-agent-a11y.md":         { minLines:  60 },
  "agents/inspect-agent-interaction.md":  { minLines:  60 },
  "agents/inspect-agent-layout.md":       { minLines:  60 },
  "agents/inspect-agent-code.md":         { minLines:  60 },
  "agents/siteasy-agent-ux.md":           { minLines:  60 },
  "agents/siteasy-agent-visual.md":       { minLines:  60 },
  "agents/siteasy-agent-motion.md":       { minLines:  60 },
  "agents/siteasy-agent-content.md":      { minLines:  60 },
  "agents/siteasy-agent-claims.md":      { minLines:  60 },
  // ── siteasy ──────────────────────────────────────────────────────────────
  "skills/siteasy/SKILL.md":                                { minLines: 140 },  // actual: 153
  "skills/siteasy/references/live.md":                      { minLines: 520 },  // actual: 546
  "skills/siteasy/references/document.md":                  { minLines: 400 },  // actual: 428
  "skills/siteasy/references/parallax.md":                  { minLines: 380 },
  "skills/siteasy/references/craft.md":                     { minLines: 180 },  // actual: 194
  "skills/siteasy/references/accessibility-engineering.md": { minLines: 230 },
  "skills/siteasy/references/critique.md":                  { minLines: 200 },  // actual: 214
  "skills/siteasy/references/improve.md":                   { minLines:  70 },
  "skills/siteasy/references/fix.md":                       { minLines:  60 },
  "skills/siteasy/references/polish.md":                    { minLines: 200 },
  "skills/siteasy/references/css-architecture.md":          { minLines: 110 },
  "skills/siteasy/references/animation-engineering.md":     { minLines: 200 },
  "skills/siteasy/references/component-patterns.md":        { minLines: 55 },
  "skills/siteasy/references/design-tokens.md":             { minLines: 110 },
  "skills/siteasy/references/form-patterns.md":             { minLines: 190 },
  "skills/siteasy/references/image-strategy.md":            { minLines: 180 },
  "skills/siteasy/references/wcag-2-2.md":                  { minLines: 180 },
  "skills/siteasy/references/dark-mode-engineering.md":     { minLines: 105 },
  "skills/siteasy/references/creative-patterns.md":         { minLines: 180 },
  "skills/siteasy/references/delight.md":                   { minLines: 170 },
  "skills/siteasy/references/inspiration.md":               { minLines: 130 },  // actual: 140
  "skills/siteasy/references/shape.md":                     { minLines: 140 },  // actual: 152
  "skills/siteasy/references/teach.md":                     { minLines: 145 },  // actual: 157
  "skills/siteasy/references/brand.md":                     { minLines:  95 },  // actual: 105
  "skills/siteasy/references/heuristics-scoring.md":        { minLines: 150 },
  "skills/siteasy/references/ux-research.md":               { minLines: 150 },
  "skills/siteasy/references/harden.md":                    { minLines: 150 },
  "skills/siteasy/references/information-architecture.md":  { minLines: 150 },
  "skills/siteasy/references/colorize.md":                  { minLines: 140 },
  "skills/siteasy/references/animate.md":                   { minLines: 130 },
  "skills/siteasy/references/optimize.md":                  { minLines: 130 },
  "skills/siteasy/references/onboard.md":                   { minLines: 130 },
  "skills/siteasy/references/personas.md":                  { minLines: 120 },
  "skills/siteasy/references/journey-mapping.md":           { minLines: 110 },
  "skills/siteasy/references/gestalt.md":                   { minLines: 110 },
  "skills/siteasy/references/bolder.md":                    { minLines: 110 },
  "skills/siteasy/references/adapt.md":                     { minLines: 110 },
  "skills/siteasy/references/typeset.md":                   { minLines: 100 },
  "skills/siteasy/references/clarify.md":                   { minLines: 100 },
  "skills/siteasy/references/distill.md":                   { minLines:  90 },
  "skills/siteasy/references/cognitive-load.md":            { minLines:  80 },
  "skills/siteasy/references/typography.md":                { minLines:  75 },
  "skills/siteasy/references/color-and-contrast.md":        { minLines:  70 },
  "skills/siteasy/references/ux-writing.md":                { minLines:  70 },
  "skills/siteasy/references/product.md":                   { minLines:  55 },  // actual:  63
  "skills/siteasy/references/extract.md":                   { minLines:  55 },
  "skills/siteasy/references/responsive-design.md":         { minLines:  55 },
  "skills/siteasy/references/interaction-design.md":        { minLines:  50 },
  "skills/siteasy/references/tokens.md":                    { minLines:  50 },
  "skills/siteasy/references/spatial-design.md":            { minLines:  45 },
  "skills/siteasy/references/data-viz.md": { minLines: 68 },
  "skills/siteasy/references/elevation.md": { minLines: 57 },
  "skills/siteasy/references/color-systems.md": { minLines: 50 },
  "skills/siteasy/references/style-systems.md": { minLines: 62 },
  "skills/siteasy/references/landing-patterns.md": { minLines: 40 },
  "skills/siteasy/references/handoff.md": { minLines: 75 },
  "skills/siteasy/references/ship-checklist.md": { minLines: 55 },
  // ── inspect ──────────────────────────────────────────────────────────────
  "skills/inspect/SKILL.md":                    { minLines:  65 },
  "skills/inspect/references/detect.md":        { minLines: 115 },  // actual: 125
  "skills/inspect/references/review.md":        { minLines: 100 },
  "skills/inspect/references/code-quality.md": { minLines: 70 },
  "skills/inspect/references/preview.md":       { minLines:  35 },
  // -- audit (meta-orchestrator) ------------------------------------------
  "skills/audit/SKILL.md":                      { minLines:  60 },
  "skills/audit/references/full.md":            { minLines: 150 },
  "skills/audit/references/report.md":          { minLines: 130 },
  "skills/audit/references/html-report.md": { minLines: 80 },
  "skills/audit/references/checks.md":          { minLines:  90 },
};

// ─── Check 1: seo/SKILL.md exists ─────────────────────────────────────────────

section("1. seo/SKILL.md exists");

const skillContent = readFile(SEO_SKILL);
if (!skillContent) {
  fail(`skills/seo/SKILL.md not found at ${SEO_SKILL}`);
} else {
  pass("skills/seo/SKILL.md found");
}

// ─── Check 2: Extract commands from seo/SKILL.md ──────────────────────────────

section("2. Commands declared in seo/SKILL.md");

const commandReferenceMap = {};
if (skillContent) {
  const tableRows = skillContent.match(/\| `[\w\s\[\]|\\-]+` \|.*\| \[references\/([\w\-/.]+)\]/g) || [];
  tableRows.forEach(row => {
    const commandMatch   = row.match(/\| `([\w][\w-]*)/);
    const referenceMatch = row.match(/\[references\/([\w\-/.]+)\]/);
    if (commandMatch && referenceMatch) {
      const cmd = commandMatch[1];
      const ref = referenceMatch[1];
      commandReferenceMap[cmd] = ref;
      pass(`Command '${cmd}' → references/${ref}`);
    }
  });
  if (Object.keys(commandReferenceMap).length === 0) {
    warn("No commands found in seo/SKILL.md table — check table formatting");
  }
}

// ─── Check 3: seo reference files exist ───────────────────────────────────────

section("3. seo reference files exist");

Object.entries(commandReferenceMap).forEach(([cmd, ref]) => {
  const refPath = path.join(SEO_REFS, ref);
  if (fs.existsSync(refPath)) {
    pass(`references/${ref} exists`);
  } else if (ref.endsWith("/") && fs.existsSync(path.join(SEO_REFS, ref))) {
    pass(`references/${ref} directory exists`);
  } else {
    fail(`references/${ref} NOT found (required by command '${cmd}')`);
  }
});

// ─── Check 4: seo reference file frontmatter ──────────────────────────────────

section("4. seo reference file frontmatter");

if (fs.existsSync(SEO_REFS)) {
  fs.readdirSync(SEO_REFS).filter(f => f.endsWith(".md")).forEach(file => {
    const content = readFile(path.join(SEO_REFS, file));
    if (!content) { fail(`${file}: cannot read`); return; }
    const fm = parseFrontmatter(content);
    if (!fm) { fail(`${file}: missing YAML frontmatter`); return; }
    ["name", "description", "version"].forEach(field => {
      if (!fm[field]) fail(`${file}: missing frontmatter field '${field}'`);
    });
    if (fm.name && fm.description && fm.version) {
      pass(`${file}: frontmatter valid (v${fm.version})`);
    }
  });
} else {
  fail(`references/ not found at ${SEO_REFS}`);
}

// ─── Check 5: Agent files ─────────────────────────────────────────────────────

section("5. plugin agent files (SEO + inspect + siteasy)");

const expectedAgents = [
  "seo-agent-technical.md", "seo-agent-content.md",
  "seo-agent-schema.md", "seo-agent-geo.md", "seo-agent-performance.md",
  "inspect-agent-a11y.md", "inspect-agent-interaction.md",
  "inspect-agent-layout.md", "inspect-agent-code.md",
  "siteasy-agent-ux.md", "siteasy-agent-visual.md",
  "siteasy-agent-motion.md", "siteasy-agent-content.md",
];

if (!fs.existsSync(SEO_AGENTS)) {
  fail(`agents/ not found at ${SEO_AGENTS}`);
} else {
  expectedAgents.forEach(file => {
    const agentPath = path.join(SEO_AGENTS, file);
    if (!fs.existsSync(agentPath)) { fail(`agents/${file} missing`); return; }
    const content = readFile(agentPath);
    const fm = parseFrontmatter(content);
    if (!fm) { fail(`agents/${file}: missing frontmatter`); return; }
    ["name", "description", "model", "tools"].forEach(field => {
      if (!fm[field]) fail(`agents/${file}: missing standard plugin-agent field '${field}'`);
    });
    if (fm.name && fm.description && fm.model && fm.tools) {
      pass(`agents/${file}: valid plugin agent (${fm.name}, model: ${fm.model})`);
    }
  });
}

// ─── Check 6: File integrity (minimum line counts) ────────────────────────────

section("6. File integrity (minimum line counts — all skills)");

Object.entries(FILE_INTEGRITY).forEach(([relPath, { minLines }]) => {
  const absPath = path.join(PLUG, relPath);
  if (!fs.existsSync(absPath)) {
    // P14. Ce contrôle dégradait un fichier absent en avertissement, et un lot
    // d'avertissements sort 0. Le contrôle 6 se taisait donc là où il devait
    // parler. Quatre autres contrôles rattrapent la suppression et font sortir 1,
    // ce qui a fait ramener le dégât de ce point de 3 à 1, mais un fichier
    // attendu et absent est un échec du contrôle d'intégrité lui-même.
    fail(`${relPath}: expected by FILE_INTEGRITY and not found. A file that is gone is not a file that passed its integrity check.`);
    return;
  }
  const lines = lineCount(readFile(absPath));
  if (lines < minLines) {
    fail(`${relPath}: ${lines} lines — below minimum ${minLines} (may be truncated)`);
  } else {
    pass(`${relPath}: ${lines} lines (min: ${minLines}) ✓`);
  }
});

// ─── Check 7: seo command count ───────────────────────────────────────────────

section("7. seo command count");

const seoExpectedMinimum = 18; // minimum floor (sxo folded into page in v2.1.0)
const seoActual = Object.keys(commandReferenceMap).length;
if (seoActual >= seoExpectedMinimum) {
  pass(`${seoActual} commands declared (minimum: ${seoExpectedMinimum})`);
} else {
  fail(`Only ${seoActual} commands found in seo/SKILL.md (expected >= ${seoExpectedMinimum}) — add missing commands to the table`);
}

// ─── Check 8: Repo quality files ──────────────────────────────────────────────

section("8. Repo quality files");

const REQUIRED_FILES  = ["README.md", "CHANGELOG.md"];
const EXPECTED_FILES  = ["CONTRIBUTING.md", "ATTRIBUTION.md", "install.sh", "install.ps1"];

REQUIRED_FILES.forEach(file => {
  if (fs.existsSync(path.join(ROOT, file))) {
    pass(`${file} present`);
  } else {
    fail(`${file} missing — this file is required`);
  }
});

EXPECTED_FILES.forEach(file => {
  if (fs.existsSync(path.join(ROOT, file))) {
    pass(`${file} present`);
  } else {
    warn(`${file} missing`);
  }
});

// ─── Check 8b: LICENSE is the canonical Apache-2.0 text ───────────────────────

section("8b. LICENSE canonical Apache-2.0 body");
{
  // Normalized (whitespace-collapsed) SHA-256 of the license body up to and
  // including "END OF TERMS AND CONDITIONS". The appendix and any copyright
  // line below it are excluded, mirroring what GitHub's licensee ignores.
  // Reference text: https://www.apache.org/licenses/LICENSE-2.0.txt
  const APACHE2_BODY_SHA256 = "59d8f0ba87ad9a2f1a431123c8d16646e5b89ba53653e818f16d136d77263c99";
  const lic = readFile(path.join(ROOT, "LICENSE"));
  if (lic === null) {
    fail("LICENSE not found");
  } else {
    const marker = "END OF TERMS AND CONDITIONS";
    const unified = lic.replace(/\r\n/g, "\n");
    const idx = unified.indexOf(marker);
    if (idx === -1) {
      fail(`LICENSE: marker "${marker}" not found — not the Apache-2.0 text`);
    } else {
      const norm = unified.slice(0, idx + marker.length).replace(/\s+/g, " ").trim();
      const sha = crypto.createHash("sha256").update(norm).digest("hex");
      if (sha === APACHE2_BODY_SHA256) {
        pass("LICENSE body matches the canonical Apache-2.0 text (normalized SHA-256)");
      } else {
        fail("LICENSE body deviates from the canonical Apache-2.0 text — GitHub license detection (licensee) will fail");
      }
    }
  }
}

// ─── Check 9: siteasy SKILL.md and references ─────────────────────────────────

section("9. siteasy SKILL.md and references");

const SITEASY_SKILL = path.join(PLUG, "skills", "siteasy", "SKILL.md");
const SITEASY_REFS  = path.join(PLUG, "skills", "siteasy", "references");

const siteasySKILL = readFile(SITEASY_SKILL);
if (!siteasySKILL) {
  fail("skills/siteasy/SKILL.md not found");
} else {
  const fm = parseFrontmatter(siteasySKILL);
  if (!fm) fail("skills/siteasy/SKILL.md: missing frontmatter");
  else if (!fm.version) fail("skills/siteasy/SKILL.md: missing 'version' field");
  else pass(`skills/siteasy/SKILL.md found (v${fm.version})`);
}

if (!fs.existsSync(SITEASY_REFS)) {
  fail("skills/siteasy/references/ not found");
} else {
  const refs = fs.readdirSync(SITEASY_REFS).filter(f => f.endsWith(".md"));
  pass(`${refs.length} reference files in siteasy/references/`);
  refs.forEach(file => {
    const content = readFile(path.join(SITEASY_REFS, file));
    if (!content) { fail(`siteasy/references/${file}: cannot read`); return; }
    const fm = parseFrontmatter(content);
    if (!fm) warn(`siteasy/references/${file}: missing frontmatter`);
    else if (!fm.name || !fm.version) warn(`siteasy/references/${file}: incomplete frontmatter`);
    else pass(`siteasy/references/${file}: ok (v${fm.version})`);
  });
}

// ─── Check 9b: siteasy command→reference mapping ──────────────────────────────

section("9b. siteasy command→reference mapping");

const siteasyCmdRefMap = extractCommandRefs(siteasySKILL);

if (Object.keys(siteasyCmdRefMap).length === 0) {
  warn("No commands with references found in siteasy/SKILL.md — check table formatting");
} else {
  Object.entries(siteasyCmdRefMap).forEach(([cmd, refs]) => {
    refs.forEach(ref => {
      const refPath = path.join(SITEASY_REFS, ref);
      if (fs.existsSync(refPath)) {
        pass(`siteasy '${cmd}' → references/${ref} ✓`);
      } else {
        fail(`siteasy '${cmd}' → references/${ref} NOT found`);
      }
    });
  });
}

// ─── Check 10: siteasy command count ──────────────────────────────────────────

section("10. siteasy command count");

const siteasyCmdMinimum = 25; // minimum floor
const siteasyCmdCount   = Object.keys(siteasyCmdRefMap).length;
if (siteasyCmdCount >= siteasyCmdMinimum) {
  pass(`siteasy: ${siteasyCmdCount} commands declared (minimum: ${siteasyCmdMinimum})`);
} else {
  warn(`siteasy: only ${siteasyCmdCount} commands found in SKILL.md (expected >= ${siteasyCmdMinimum})`);
}

// ─── Check 11: inspect SKILL.md and references ────────────────────────────────

section("11. inspect SKILL.md and references");

const INSPECT_SKILL = path.join(PLUG, "skills", "inspect", "SKILL.md");
const INSPECT_REFS  = path.join(PLUG, "skills", "inspect", "references");

const inspectSKILL = readFile(INSPECT_SKILL);
if (!inspectSKILL) {
  fail("skills/inspect/SKILL.md not found");
} else {
  const fm = parseFrontmatter(inspectSKILL);
  if (!fm) fail("skills/inspect/SKILL.md: missing frontmatter");
  else if (!fm.version) fail("skills/inspect/SKILL.md: missing 'version' field");
  else pass(`skills/inspect/SKILL.md found (v${fm.version})`);
}

if (!fs.existsSync(INSPECT_REFS)) {
  fail("skills/inspect/references/ not found");
} else {
  const refs = fs.readdirSync(INSPECT_REFS).filter(f => f.endsWith(".md"));
  pass(`${refs.length} reference files in inspect/references/`);
  refs.forEach(file => {
    const content = readFile(path.join(INSPECT_REFS, file));
    if (!content) { fail(`inspect/references/${file}: cannot read`); return; }
    const fm = parseFrontmatter(content);
    if (!fm) warn(`inspect/references/${file}: missing frontmatter`);
    else if (!fm.name || !fm.version) warn(`inspect/references/${file}: incomplete frontmatter`);
    else pass(`inspect/references/${file}: ok (v${fm.version})`);
  });
}

// --- Check 11b: audit (meta-orchestrator) SKILL.md and references ------------

section("11b. audit SKILL.md and references");

const AUDIT_SKILL = path.join(PLUG, "skills", "audit", "SKILL.md");
const AUDIT_REFS  = path.join(PLUG, "skills", "audit", "references");

const auditSKILL = readFile(AUDIT_SKILL);
if (!auditSKILL) {
  fail("skills/audit/SKILL.md not found");
} else {
  const fm = parseFrontmatter(auditSKILL);
  if (!fm) fail("skills/audit/SKILL.md: missing frontmatter");
  else if (!fm.version) fail("skills/audit/SKILL.md: missing 'version' field");
  else pass(`skills/audit/SKILL.md found (v${fm.version})`);

  const auditCmdRefMap = extractCommandRefs(auditSKILL);
  if (Object.keys(auditCmdRefMap).length === 0) {
    warn("No commands with references found in audit/SKILL.md - check table formatting");
  } else {
    Object.entries(auditCmdRefMap).forEach(([cmd, refs]) => {
      refs.forEach(ref => {
        if (fs.existsSync(path.join(AUDIT_REFS, ref))) pass(`audit '${cmd}' -> references/${ref} ok`);
        else fail(`audit '${cmd}' -> references/${ref} NOT found`);
      });
    });
  }
}

if (fs.existsSync(AUDIT_REFS)) {
  fs.readdirSync(AUDIT_REFS).filter(f => f.endsWith(".md")).forEach(file => {
    const fm = parseFrontmatter(readFile(path.join(AUDIT_REFS, file)) || "");
    if (!fm) warn(`audit/references/${file}: missing frontmatter`);
    else if (!fm.name || !fm.version) warn(`audit/references/${file}: incomplete frontmatter`);
    else pass(`audit/references/${file}: ok (v${fm.version})`);
  });
}

// --- Check 12: Version consistency ----------------------------------------------

section("12. Version consistency (plugin.json / marketplace.json / SKILL.md)");

const versionSources = {};

const pluginJsonContent = readFile(path.join(PLUG, ".claude-plugin", "plugin.json"));
if (pluginJsonContent) {
  try {
    const pj = JSON.parse(pluginJsonContent);
    versionSources[".claude-plugin/plugin.json"] = pj.version || null;
    if (!pj.version) fail("plugin.json: missing 'version'");
  } catch { fail("plugin.json: invalid JSON"); }
} else { fail(".claude-plugin/plugin.json: not found"); }

const packageJsonContent = readFile(path.join(ROOT, "package.json"));
if (packageJsonContent) {
  try {
    const pkg = JSON.parse(packageJsonContent);
    versionSources["package.json"] = pkg.version || null;
    if (!pkg.version) fail("package.json: missing 'version'");
  } catch { fail("package.json: invalid JSON"); }
} else { warn("package.json: not found"); }

const marketplaceJsonContent = readFile(path.join(ROOT, ".claude-plugin", "marketplace.json"));
if (marketplaceJsonContent) {
  try {
    const mj = JSON.parse(marketplaceJsonContent);
    const entry = (mj.plugins && mj.plugins[0]) || {};
    // The version lives in plugin.json and nowhere else. A second copy here
    // drifted silently between clones; Claude Code reads the manifest anyway.
    if (entry.version) fail("marketplace.json: plugins[0].version must not exist — plugin.json is the only version source");
    else pass("marketplace.json declares no version (plugin.json is the single source)");
    if (entry.name !== "null-to-hero") fail(`marketplace.json: plugins[0].name is "${entry.name}", expected "null-to-hero"`);
    else pass('marketplace.json: plugins[0].name is "null-to-hero"');
    if (entry.source !== "./null-to-hero") fail(`marketplace.json: plugins[0].source is "${entry.source}", expected "./null-to-hero"`);
    else pass("marketplace.json: plugins[0].source points at the plugin subfolder");
  } catch { fail("marketplace.json: invalid JSON"); }
} else { fail(".claude-plugin/marketplace.json: not found"); }

["seo", "siteasy", "inspect", "audit"].forEach(skill => {
  const content = readFile(path.join(PLUG, "skills", skill, "SKILL.md"));
  if (content) {
    const fm = parseFrontmatter(content);
    versionSources[`skills/${skill}/SKILL.md`] = fm?.version || null;
    if (!fm?.version) fail(`skills/${skill}/SKILL.md: version missing from frontmatter`);
  } else {
    fail(`skills/${skill}/SKILL.md: not found`);
  }
});

const shInstaller = readFile(path.join(ROOT, "install.sh"));
if (shInstaller) {
  const m = shInstaller.match(/PLUGIN_VERSION="([^"]+)"/);
  if (m) versionSources["install.sh"] = m[1];
  else warn("install.sh: PLUGIN_VERSION not found");
}
const ps1Installer = readFile(path.join(ROOT, "install.ps1"));
if (ps1Installer) {
  const m = ps1Installer.match(/\$PLUGIN_VERSION\s*=\s*"([^"]+)"/);
  if (m) versionSources["install.ps1"] = m[1];
  else warn("install.ps1: PLUGIN_VERSION not found");
}

const versions = Object.values(versionSources).filter(Boolean);
if (versions.length > 0) {
  const allSame = versions.every(v => v === versions[0]);
  if (allSame) {
    pass(`All versions consistent at ${versions[0]}`);
  } else {
    const details = Object.entries(versionSources).map(([k, v]) => `${k}=${v}`).join(" | ");
    fail(`Version mismatch — fix before releasing: ${details}`);
  }
}

// ─── Check 12b: SECURITY.md supported line + README version token ──────────

section("12b. SECURITY.md and README version alignment");
{
  const pv = versionSources[".claude-plugin/plugin.json"];
  if (!pv) {
    warn("plugin.json version unavailable; skipping 12b");
  } else {
    const [maj, min] = pv.split(".");
    const sec = readFile(path.join(ROOT, "SECURITY.md"));
    if (sec === null) {
      fail("SECURITY.md not found");
    } else {
      const m = sec.match(/^\|\s*(\d+)\.(\d+)\.x\s*\|\s*Yes/m);
      if (!m) fail("SECURITY.md: no 'X.Y.x | Yes' supported row found");
      else if (m[1] === maj && m[2] === min) pass(`SECURITY.md supported line ${m[1]}.${m[2]}.x matches plugin ${maj}.${min}`);
      else fail(`SECURITY.md supported line ${m[1]}.${m[2]}.x does not match plugin ${maj}.${min}`);
    }
    const rd = readFile(path.join(ROOT, "README.md"));
    if (rd === null) {
      fail("README.md not found");
    } else {
      const mm = rd.match(/\*\*v(\d+\.\d+\.\d+)\*\*/);
      if (!mm) fail("README.md: no **vX.Y.Z** version token found");
      else if (mm[1] === pv) pass(`README version token v${mm[1]} matches plugin ${pv}`);
      else fail(`README version token v${mm[1]} does not match plugin ${pv}`);
      // The shields badge is a SECOND version in the same file, and it went unchecked
      // until v1.34.0: it had read 1.21.0 for thirteen releases while the token beside
      // it was current. Checking one version site per file is how the other one rots.
      const bm = rd.match(/img\.shields\.io\/badge\/version-(\d+\.\d+\.\d+)-/);
      if (!bm) fail("README.md: no shields.io version badge found");
      else if (bm[1] === pv) pass(`README version badge ${bm[1]} matches plugin ${pv}`);
      else fail(`README version badge ${bm[1]} does not match plugin ${pv}`);
    }
    const svg = readFile(path.join(ROOT, "docs", "overview.svg"));
    if (svg === null) fail("docs/overview.svg not found");
    else if (svg.includes(`>v${pv}<`)) pass(`overview.svg version label matches plugin ${pv}`);
    else fail("docs/overview.svg version label is stale: run `node tools/sync-overview.mjs` and commit");
  }
}

// ─── Check 13: Large files warning ────────────────────────────────────────────

section("13. Large files (> 500 KB in tools/)");

const SIZE_LIMIT = 500 * 1024;

// Known exceptions — predating the 500 KB limit, kept for lookup coverage.
// See CONTRIBUTING.md before adding new entries here.
const LARGE_FILE_EXCEPTIONS = new Set([
  "tools/design-system/data/google-fonts.csv",
]);

function scanDir(dir, root) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) scanDir(full, root);
    else if (stat.size > SIZE_LIMIT) {
      const rel = full.slice(root.length + 1).split("\\").join("/");
      if (LARGE_FILE_EXCEPTIONS.has(rel)) return; // known exception, skip
      warn(`${rel}: ${(stat.size / 1024).toFixed(0)} KB — consider offloading to a release asset`);
    }
  }
}

scanDir(path.join(PLUG, "tools"), PLUG);
pass("Large-file scan complete");

// ─── Check 14: no stale /impeccable command references ────────────────────────

section("14. No stale /impeccable command references in skills");

function walkMd(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkMd(full, acc);
    else if (name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

const SKILLS_DIR = path.join(PLUG, "skills");
const allSkillMd = walkMd(SKILLS_DIR, []);
let impeccableHits = 0;
allSkillMd.forEach(f => {
  const content = readFile(f) || "";
  content.split("\n").forEach((line, i) => {
    if (/\/impeccable\b/.test(line)) {
      const rel = f.slice(PLUG.length + 1).split("\\").join("/");
      fail(`${rel}:${i + 1}: stale /impeccable command reference — use /siteasy`);
      impeccableHits++;
    }
  });
});
if (impeccableHits === 0) pass("No /impeccable command references in skills/");

// ─── Check 15: referenced helper scripts exist ────────────────────────────────

section("15. Referenced helper scripts exist on disk");

const scriptRefRe = /(?:node|python3)\s+(?:"?\$\{CLAUDE_PLUGIN_ROOT\}\/)?([^"`\s)]+\.(?:mjs|js|py))/g;
let missingScripts = 0;
let scriptRefs = 0;
allSkillMd.forEach(f => {
  const content = readFile(f) || "";
  let m;
  while ((m = scriptRefRe.exec(content)) !== null) {
    let rel = m[1];
    if (rel.startsWith("./")) rel = rel.slice(2);
    // resolve plugin-root-relative paths only (skip bare names / node_modules tools)
    if (!rel.includes("/")) continue;
    if (rel.startsWith(".claude/")) {
      const relFile = f.slice(PLUG.length + 1).split("\\").join("/");
      fail(`${relFile}: script path "${rel}" assumes external .claude/ layout — use \${CLAUDE_PLUGIN_ROOT}`);
      missingScripts++;
      continue;
    }
    scriptRefs++;
    if (!fs.existsSync(anyPath(rel))) {
      const relFile = f.slice(PLUG.length + 1).split("\\").join("/");
      fail(`${relFile}: referenced script not found: ${rel}`);
      missingScripts++;
    }
  }
});
if (missingScripts === 0) pass(`All ${scriptRefs} referenced helper scripts exist`);

// ─── Check 16: declared agents are actually dispatched ────────────────────────

section("16. All plugin agents are dispatched by an orchestrator, not orphaned");

if (fs.existsSync(SEO_AGENTS)) {
  const agentFiles = fs.readdirSync(SEO_AGENTS).filter(f => f.endsWith(".md"));
  const allSkillText = allSkillMd.map(f => readFile(f) || "").join("\n");
  let orphan = 0;
  agentFiles.forEach(file => {
    const fm = parseFrontmatter(readFile(path.join(SEO_AGENTS, file)) || "");
    const agentName = fm && fm.name;
    if (agentName && !allSkillText.includes(agentName)) {
      fail(`agents/${file}: agent '${agentName}' is never dispatched by any skill reference (orphaned)`);
      orphan++;
    }
  });
  if (orphan === 0 && agentFiles.length > 0) {
    pass(`All ${agentFiles.length} agents are dispatched by an orchestrator`);
  }
}

// ─── Check 17: in-doc references/*.md and schema/*.json pointers resolve ──────

section("17. In-doc reference pointers resolve to real files");

// Matches inline-code paths that point into a references/ tree or a schema/ dir.
// Deliberately narrow: skips bare filenames (e.g. `saas.md`) and output-file
// templates with placeholders (e.g. `ACTION-PLAN-[domain].md`).
const DOC_REF_RE = /`([\w./-]*(?:references|schema)\/[\w./-]+\.(?:md|json))`/g;
let deadDocRefs = 0;
let docRefsChecked = 0;
allSkillMd.forEach(f => {
  const content = readFile(f) || "";
  const dir = path.dirname(f);
  let m;
  while ((m = DOC_REF_RE.exec(content)) !== null) {
    const ref = m[1];
    if (ref.includes("[") || ref.includes("]")) continue; // output template, not a pointer
    docRefsChecked++;
    // Try resolving against the file's own dir, the skill root, and the repo root.
    const candidates = [
      path.join(dir, ref),                 // relative to the doc itself
      path.join(dir, path.basename(ref)),  // same dir, by basename
      path.join(PLUG, "skills", ref),      // skill-qualified, e.g. siteasy/references/x.md
      path.join(PLUG, "skills", "seo", ref),
      path.join(PLUG, ref),                // plugin-root relative
      path.join(ROOT, ref),                // repo-root relative
    ];
    if (!candidates.some(c => fs.existsSync(c))) {
      const relFile = f.slice(PLUG.length + 1).split("\\").join("/");
      fail(`${relFile}: in-doc reference not found: ${ref}`);
      deadDocRefs++;
    }
  }
});
if (deadDocRefs === 0) pass(`All ${docRefsChecked} in-doc reference pointers resolve`);

// ─── Check 18: README headline counts match reality ─────────────────────────

section("18. README headline counts are accurate");

const README_PATH = path.join(ROOT, "README.md");
const readmeTxt = readFile(README_PATH) || "";

function countRefDocs(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) n += countRefDocs(fp);
    else if (e.name.endsWith(".md") && e.name !== "SKILL.md") n++;
  }
  return n;
}
const SKILLS_ROOT = path.join(PLUG, "skills");
const actualRefDocs = countRefDocs(SKILLS_ROOT);
const actualSkills = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory() && fs.existsSync(path.join(SKILLS_ROOT, d.name, "SKILL.md")))
  .length;
const inspectCmdCount = Object.keys(
  extractCommandRefs(readFile(path.join(SKILLS_ROOT, "inspect", "SKILL.md")))
).length;
const auditCmdCount = Object.keys(
  extractCommandRefs(readFile(path.join(SKILLS_ROOT, "audit", "SKILL.md")))
).length;
const cmsCmdCount = Object.keys(
  extractCommandRefs(readFile(path.join(SKILLS_ROOT, "cms", "SKILL.md")))
).length;
const actualCommands = seoActual + siteasyCmdCount + inspectCmdCount + auditCmdCount + cmsCmdCount;

function readmeNum(re) { const m = readmeTxt.match(re); return m ? Number(m[1]) : null; }
const claims = [
  ["skills",         readmeNum(/(\d+)\s+skills/i),                    actualSkills],
  ["commands",       readmeNum(/(\d+)\s+(?:sub-)?commands/i),          actualCommands],
  ["reference docs", readmeNum(/(\d+)\s+reference docs/i),            actualRefDocs],
];
claims.forEach(([label, claimed, actual]) => {
  if (claimed === null) warn(`README: no "${label}" count found to verify`);
  else if (claimed === actual) pass(`README "${label}" count ${claimed} matches actual ${actual}`);
  else fail(`README "${label}" count ${claimed} does not match actual ${actual}`);
});

// Every occurrence must match, not just the first: the second "reference docs"
// claim drifted to 110 against an actual 119 and slept through releases.
{
  const all = [...readmeTxt.matchAll(/(\d+)\s+reference docs/g)].map(m => Number(m[1]));
  const wrong = all.filter(n => n !== actualRefDocs);
  if (wrong.length) fail(`README: ${wrong.length} "reference docs" occurrence(s) say ${wrong.join(", ")} but actual is ${actualRefDocs}`);
  else pass(`README: all ${all.length} "reference docs" occurrences match actual ${actualRefDocs}`);
}

// Per-skill "All N commands" collapsible counts, in README order.
{
  const perSkill = [...readmeTxt.matchAll(/All (\d+) commands/g)].map(m => Number(m[1]));
  const actualPerSkill = [
    ["siteasy", siteasyCmdCount], ["seo", seoActual],
    ["inspect", inspectCmdCount], ["audit", auditCmdCount],
  ];
  if (perSkill.length !== actualPerSkill.length) {
    fail(`README: expected ${actualPerSkill.length} "All N commands" blocks, found ${perSkill.length}`);
  } else {
    actualPerSkill.forEach(([label, actual], i) => {
      if (perSkill[i] === actual) pass(`README "All ${perSkill[i]} commands" (${label}) matches the SKILL table`);
      else fail(`README "All ${perSkill[i]} commands" (${label}) does not match the SKILL table (${actual})`);
    });
  }
}

// ─── Check 19: reference-index.json is up to date ────────────────────────────
// Mirrors the algorithm in tools/build-index.mjs. Keep the two in sync.
section("19. reference-index.json matches references on disk");
{
  const STOP = new Set(["the","a","an","and","or","for","to","of","in","on","with","is","are","by","use","using","when","your","you"]);
  const firstHeading = (text) => {
    for (const line of text.split("\n")) { const m = line.match(/^#\s+(.+)/); if (m) return m[1].trim(); }
    return null;
  };
  const kw = (title, file) => {
    const base = path.basename(file, ".md").replace(/-/g, " ");
    const words = `${base} ${title || ""}`.toLowerCase().match(/[a-z0-9]+/g) || [];
    return [...new Set(words.filter((w) => w.length > 2 && !STOP.has(w)))];
  };
  const walk = (dir) => {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) out.push(...walk(p));
      else if (name.endsWith(".md") && name !== "SKILL.md") out.push(p);
    }
    return out;
  };
  const entries = [];
  for (const file of walk(path.join(PLUG, "skills"))) {
    const rel = file.slice(PLUG.length + 1).split("\\").join("/");
    const skill = rel.split("/")[1];
    const text = fs.readFileSync(file, "utf8");
    const title = firstHeading(text);
    entries.push({ skill, path: rel, title: title || path.basename(file, ".md"), keywords: kw(title, file) });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const expected = JSON.stringify(entries, null, 2) + "\n";
  const indexPath = path.join(PLUG, "tools", "reference-index.json");
  const committed = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : null;
  if (committed === null) fail("tools/reference-index.json missing — run `node tools/build-index.mjs`");
  else if (committed === expected) pass(`reference-index.json is current (${entries.length} entries)`);
  else fail("tools/reference-index.json is stale — run `node tools/build-index.mjs` and commit the result");
}

// ─── Check 20: no stale present-tense FAQ "restricted to gov/health" claims ──
// Google removed FAQ rich results for all sites on May 7, 2026. References must not
// assert a *current* gov/health restriction. The historical "previously restricted"
// note in schema.md is exempt, as is any line that also says the feature was removed.
section("20. No stale FAQ 'restricted to gov/health' claims in SEO references");
{
  const RESTRICT_RE = /restrict(?:ed|ion)?\s+to\s+gov(?:ernment)?/i;
  let staleFaq = 0;
  let faqLinesScanned = 0;
  function walkSeoRefs(dir, acc) {
    if (!fs.existsSync(dir)) return acc;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walkSeoRefs(full, acc);
      else if (name.endsWith(".md")) acc.push(full);
    }
    return acc;
  }
  walkSeoRefs(SEO_REFS, []).forEach(f => {
    (readFile(f) || "").split("\n").forEach((line, i) => {
      if (!/FAQ/i.test(line)) return;
      faqLinesScanned++;
      if (RESTRICT_RE.test(line) && !/previously/i.test(line) && !/removed/i.test(line)) {
        const rel = f.slice(PLUG.length + 1).split("\\").join("/");
        fail(`${rel}:${i + 1}: stale present-tense FAQ gov/health restriction — FAQ rich results were removed for all sites May 7, 2026 (see schema.md)`);
        staleFaq++;
      }
    });
  });
  if (staleFaq === 0) pass(`No stale FAQ gov/health claims (${faqLinesScanned} FAQ mentions scanned)`);
}

// --- Check 21: CSV column integrity -------------------------------------------
// Catches unescaped commas that silently shift columns in the data CSVs consumed
// by the design-system generator and /inspect. Quote-aware: commas inside double
// quotes are legitimate. Free-form backup files are exempt.
section("21. CSV column integrity (header vs rows)");
{
  const CSV_EXEMPT = new Set([
  ]);
  function countFields(line) {
    let cnt = 1, inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) cnt++;
    }
    return cnt;
  }
  function walkCsv(dir, acc) {
    if (!fs.existsSync(dir)) return acc;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walkCsv(full, acc);
      else if (name.endsWith(".csv")) acc.push(full);
    }
    return acc;
  }
  let badCsv = 0, csvScanned = 0;
  walkCsv(path.join(PLUG, "tools"), []).forEach(f => {
    const rel = f.slice(PLUG.length + 1).split(path.sep).join("/");
    if (CSV_EXEMPT.has(rel)) return;
    const lines = (readFile(f) || "").split("\n").filter(l => l.length > 0);
    if (lines.length < 2) return;
    csvScanned++;
    const header = countFields(lines[0]);
    let fileBad = 0;
    lines.slice(1).forEach((line, i) => {
      if (countFields(line) !== header) {
        fail(`${rel}:${i + 2}: ${countFields(line)} columns, header has ${header} (unescaped comma?)`);
        badCsv++; fileBad++;
      }
    });
    if (fileBad === 0) pass(`${rel}: ${header} columns consistent across ${lines.length - 1} rows`);
  });
  if (csvScanned === 0) warn("No CSV files scanned");
}

// --- Check 22: audit sub-agents declare only read-only tools -----------------

section("22. Audit sub-agents are read-only (least agency)");
{
  const READONLY = new Set(["Read", "Grep", "Glob", "WebFetch"]);
  const agentFiles = fs.existsSync(SEO_AGENTS)
    ? fs.readdirSync(SEO_AGENTS).filter(f => f.endsWith(".md")) : [];
  let bad = 0;
  agentFiles.forEach(file => {
    const fm = parseFrontmatter(readFile(path.join(SEO_AGENTS, file)) || "");
    const toolsRaw = fm && fm.tools;
    if (!toolsRaw) { fail(`agents/${file}: no 'tools' field in frontmatter`); bad++; return; }
    const tools = toolsRaw.split(",").map(t => t.trim()).filter(Boolean);
    const offenders = tools.filter(t => !READONLY.has(t));
    if (offenders.length) {
      fail(`agents/${file}: non-read-only tool(s) [${offenders.join(", ")}]; sub-agents must stay read-only`);
      bad++;
    }
  });
  if (agentFiles.length && bad === 0) {
    pass(`All ${agentFiles.length} sub-agents declare only read-only tools (Read, Grep, Glob, WebFetch)`);
  }
}

// --- Check 23: every sub-agent carries the Trust boundary block ---------------

section("23. Sub-agents carry the Trust boundary block");
{
  const agentFiles = fs.existsSync(SEO_AGENTS)
    ? fs.readdirSync(SEO_AGENTS).filter(f => f.endsWith(".md")) : [];
  let missing = 0;
  agentFiles.forEach(file => {
    const c = readFile(path.join(SEO_AGENTS, file)) || "";
    if (!/^##\s+Trust boundary\s*$/m.test(c)) {
      fail(`agents/${file}: missing '## Trust boundary' block (untrusted-input guardrail)`);
      missing++;
    }
  });
  if (agentFiles.length && missing === 0) {
    pass(`All ${agentFiles.length} sub-agents carry a Trust boundary block`);
  }
}

// --- Check 24: /audit verify consensus mode is wired -------------------------

section("24. /audit verify consensus mode is wired");
{
  const auditSkill = readFile(path.join(PLUG, "skills", "audit", "SKILL.md")) || "";
  const full = readFile(path.join(PLUG, "skills", "audit", "references", "full.md")) || "";
  const cmds = extractCommandRefs(auditSkill);
  if (cmds.verify) pass("audit/SKILL.md declares the 'verify' command");
  else fail("audit/SKILL.md: 'verify' command row missing from the Commands table");
  if (/^##\s+Consensus verification/m.test(full)) pass("full.md documents Consensus verification");
  else fail("full.md: '## Consensus verification' section missing");
  if (/^\|\s*`verify`\s*\|/m.test(full)) pass("full.md modes table lists the verify row");
  else fail("full.md: verify row missing from the Modes table");
}

// --- Check 25: architecture rationale doc present ----------------------------

section("25. docs/ARCHITECTURE.md present");
{
  const arch = readFile(path.join(ROOT, "docs", "ARCHITECTURE.md"));
  if (arch === null) fail("docs/ARCHITECTURE.md not found");
  else if (!/^#\s+Multi-Agent Architecture/m.test(arch)) fail("docs/ARCHITECTURE.md: missing '# Multi-Agent Architecture' heading");
  else if (arch.length < 1500) warn("docs/ARCHITECTURE.md is unexpectedly short");
  else pass("docs/ARCHITECTURE.md present and non-trivial");
}

// --- Check 26: agents use the deterministic scoring rubric -------------------

section("26. Agent scoring rubric is deterministic");
{
  const agentFiles = fs.existsSync(SEO_AGENTS)
    ? fs.readdirSync(SEO_AGENTS).filter(f => f.endsWith(".md")) : [];
  let bad = 0;
  agentFiles.forEach(file => {
    const c = readFile(path.join(SEO_AGENTS, file)) || "";
    if (!/Deterministic (rubric|scoring)/.test(c)) {
      fail(`agents/${file}: Scoring section lacks the deterministic rubric marker`);
      bad++;
    }
  });
  if (agentFiles.length && bad === 0) {
    pass(`All ${agentFiles.length} agents declare a deterministic scoring rubric`);
  }
  const formulaAgents = agentFiles.filter(f => f !== "seo-agent-geo.md");
  let nf = 0;
  formulaAgents.forEach(file => {
    const c = readFile(path.join(SEO_AGENTS, file)) || "";
    if (!/Start at 100/.test(c) || !/Subtract 15 for every FAIL/.test(c)) {
      fail(`agents/${file}: missing the explicit rubric formula (Start at 100 / Subtract 15 per FAIL)`);
      nf++;
    }
  });
  if (formulaAgents.length && nf === 0) {
    pass(`All ${formulaAgents.length} check-table agents carry the explicit rubric formula`);
  }
  [["inspect-agent-a11y.md", /Critical checks[^\n]*(Keyboard|contrast)/i],
   ["inspect-agent-interaction.md", /Critical checks[^\n]*(Interactive states|Action feedback)/i]].forEach(([file, re]) => {
    const c = readFile(path.join(SEO_AGENTS, file)) || "";
    if (re.test(c)) pass(`${file}: declares concrete critical checks for the cap`);
    else fail(`${file}: gating agent must declare concrete critical checks for the cap trigger`);
  });
}

// --- Check 27: orchestrator severity cap is deterministic --------------------

section("27. Orchestrator severity cap is rule-based");
{
  const full = readFile(path.join(PLUG, "skills", "audit", "references", "full.md")) || "";
  if (/Severity cap \(deterministic\)/.test(full)) pass("full.md severity cap is rule-based (deterministic)");
  else fail("full.md: severity cap is not marked deterministic");
  if (/subtract 15 per FAIL/i.test(full)) pass("full.md scoring intro references the rubric formula");
  else fail("full.md: scoring intro does not reference the deterministic rubric");
}

// --- Check 28: /audit compare mode is wired ---------------------------------

section("28. /audit compare mode is wired");
{
  const auditSkill = readFile(path.join(PLUG, "skills", "audit", "SKILL.md")) || "";
  const cmp = readFile(path.join(PLUG, "skills", "audit", "references", "compare.md"));
  const cmds = extractCommandRefs(auditSkill);
  if (cmds.compare) pass("audit/SKILL.md declares the 'compare' command");
  else fail("audit/SKILL.md: 'compare' command row missing from the Commands table");
  if (cmp === null) {
    fail("skills/audit/references/compare.md not found");
  } else {
    const need = ["## Process", "Regressions", "Improvements", "deterministic"];
    const missing = need.filter(t => !cmp.includes(t));
    if (missing.length === 0) pass("compare.md carries the diff sections (Process, Regressions, Improvements, determinism note)");
    else fail(`compare.md missing expected content: ${missing.join(", ")}`);
  }
}

// --- Check 29: /audit checks deterministic pre-pass is wired -----------------

section("29. /audit checks deterministic pre-pass is wired");
{
  const auditSkill = readFile(path.join(PLUG, "skills", "audit", "SKILL.md")) || "";
  const cmds = extractCommandRefs(auditSkill);
  if (cmds.checks) pass("audit/SKILL.md declares the 'checks' command");
  else fail("audit/SKILL.md: 'checks' command row missing from the Commands table");
  const checksRef = readFile(path.join(PLUG, "skills", "audit", "references", "checks.md"));
  if (checksRef === null) {
    fail("skills/audit/references/checks.md not found");
  } else {
    const need = ["analyze.mjs", "SITE-AUDIT.json", "clientRendered", "## Process"];
    const missing = need.filter(t => !checksRef.includes(t));
    if (missing.length === 0) pass("checks.md documents the pre-pass (analyzer, SITE-AUDIT.json, client-rendered, process)");
    else fail(`checks.md missing expected content: ${missing.join(", ")}`);
  }
}

// --- Check 30: deterministic audit tooling + JSON schema present -------------

section("30. Deterministic audit tooling present");
{
  const need = [
    "tools/audit/fetch.mjs", "tools/audit/analyze.mjs", "tools/audit/gate.mjs",
    "tools/audit/compare.mjs", "tools/audit/cost.mjs", "tools/audit/eval.mjs",
    "tools/audit/lib/html.mjs", "tools/audit/lib/contrast.mjs", "tools/audit/lib/checks.mjs",
    "tools/audit/lib/css.mjs", "tools/audit/lib/site-audit.mjs", "tools/audit/reaudit.mjs",
    "tools/audit/schema/site-audit.schema.json",
    "tools/audit/README.md",
  ];
  let miss = 0;
  for (const rel of need) if (!fs.existsSync(anyPath(rel))) { fail(`missing ${rel}`); miss++; }
  if (miss === 0) pass(`all ${need.length} deterministic audit tooling files present`);
  const schemaTxt = readFile(path.join(PLUG, "tools", "audit", "schema", "site-audit.schema.json"));
  try {
    const sc = JSON.parse(schemaTxt);
    if (sc.$schema && sc.properties && sc.properties.checks) pass("site-audit schema is valid JSON with a checks array");
    else fail("site-audit schema missing expected keys ($schema, properties.checks)");
  } catch { fail("site-audit schema is not valid JSON"); }
}

// --- Check 31: SITE-AUDIT.json + cost ledger wired into orchestration ---------

section("31. SITE-AUDIT.json and cost ledger wired into the orchestration");
{
  const full = readFile(path.join(PLUG, "skills", "audit", "references", "full.md")) || "";
  const report = readFile(path.join(PLUG, "skills", "audit", "references", "report.md")) || "";
  const compare = readFile(path.join(PLUG, "skills", "audit", "references", "compare.md")) || "";
  const items = [
    ["full.md references SITE-AUDIT.json", full.includes("SITE-AUDIT.json")],
    ["full.md documents the ground-truth pre-pass", /Ground truth from computed checks/.test(full)],
    ["full.md documents a cost ledger", /Cost ledger/.test(full)],
    ["report.md reads SITE-AUDIT.json", report.includes("SITE-AUDIT.json")],
    ["compare.md uses the structural JSON diff (compare.mjs)", compare.includes("compare.mjs")],
  ];
  for (const [label, ok] of items) ok ? pass(label) : fail(`missing: ${label}`);
}

// --- Check 32: reference eval set present and consistent ---------------------

section("32. Reference eval set present and consistent");
{
  const labelsPath = path.join(ROOT, "tests", "eval", "labels.json");
  const baselinePath = path.join(ROOT, "tests", "eval", "baseline.json");
  const fixturesDir = path.join(ROOT, "tests", "eval", "fixtures");
  let labels = null;
  try { labels = JSON.parse(readFile(labelsPath)); } catch { fail("tests/eval/labels.json missing or invalid JSON"); }
  if (Array.isArray(labels)) {
    if (labels.length >= 20) pass(`labels.json has ${labels.length} labeled fixtures (min 20)`);
    else fail(`labels.json has only ${labels.length} fixtures (expected >= 20)`);
    let bad = 0;
    for (const l of labels) {
      if (!l.file || !fs.existsSync(path.join(fixturesDir, l.file))) { fail(`eval fixture missing: ${l && l.file}`); bad++; }
      if (!l.expect || Object.keys(l.expect).length === 0) { fail(`eval label without expectations: ${l && l.file}`); bad++; }
    }
    if (bad === 0) pass("every label points to an existing fixture with expectations");
  }
  if (fs.existsSync(baselinePath)) {
    try { JSON.parse(readFile(baselinePath)); pass("baseline.json present and valid JSON"); } catch { fail("baseline.json invalid JSON"); }
  } else fail("tests/eval/baseline.json missing");
}

// --- Check 33: audit-gate Action + self-test workflow ------------------------

section("33. Audit-gate GitHub Action and self-test workflow present");
{
  const action = readFile(path.join(ROOT, "action.yml"));
  if (action === null) fail("action.yml not found");
  else if (/using:\s*composite/.test(action) && action.includes("tools/audit/gate.mjs")) pass("action.yml is a composite action that runs the audit gate");
  else fail("action.yml present but does not run tools/audit/gate.mjs as a composite action");
  const wf = readFile(path.join(ROOT, ".github", "workflows", "audit-selftest.yml"));
  if (wf === null) fail(".github/workflows/audit-selftest.yml not found");
  else if (wf.includes("eval.mjs") && wf.includes("gate.mjs")) pass("audit-selftest workflow runs eval and gate");
  else fail("audit-selftest workflow missing eval/gate steps");
}

// --- Check 34: agents wire to shared inputs and constrain their output -------

section("34. Agents read shared audit-assets inputs and return only their section");
{
  const agentFiles = fs.existsSync(SEO_AGENTS)
    ? fs.readdirSync(SEO_AGENTS).filter(f => f.endsWith(".md")) : [];
  let bad = 0;
  agentFiles.forEach(file => {
    const c = readFile(path.join(SEO_AGENTS, file)) || "";
    if (!/audit-assets\//.test(c)) { fail(`agents/${file}: Inputs do not reference the shared audit-assets files (agents must Read, not WebFetch)`); bad++; }
    if (!/Return ONLY this section\./.test(c)) { fail(`agents/${file}: missing the strict output contract ('Return ONLY this section.')`); bad++; }
  });
  if (agentFiles.length && bad === 0) pass(`all ${agentFiles.length} agents read shared inputs and constrain output to the scored section`);
}

// --- Check 35: doc-stated counts match the source of truth ------------------
section("35. Stated agent and rule counts match the repository");
{
  const agentCount = fs.existsSync(SEO_AGENTS)
    ? fs.readdirSync(SEO_AGENTS).filter(f => f.endsWith(".md")).length : 0;
  const rulesCsv = readFile(path.join(PLUG, "tools", "data", "inspect-rules.csv"));
  const ruleCount = rulesCsv ? rulesCsv.trim().split(/\r?\n/).length - 1 : 0;

  const claims = [
    ["README.md",               /(\d+)\s+audit sub-agents/, agentCount, "README audit sub-agents"],
    ["README.md",               /All\s+(\d+)\s+sub-agents/, agentCount, "README full-command sub-agents"],
    ["skills/audit/SKILL.md",   /All\s+(\d+)\s+sub-agents/, agentCount, "audit SKILL sub-agents"],
    ["tools/README.md",         /\((\d+)\s+rules\)/,       ruleCount,  "tools README inspect rules"],
    ["skills/inspect/SKILL.md", /\((\d+)\s+rules\)/,       ruleCount,  "inspect SKILL rules"],
  ];

  let bad = 0;
  claims.forEach(([rel, re, expected, label]) => {
    const body = readFile(anyPath(rel));
    if (body == null) { fail(`${label}: ${rel} not found`); bad++; return; }
    const m = body.match(re);
    if (!m) { fail(`${label}: no count matching ${re} in ${rel}`); bad++; }
    else if (Number(m[1]) !== expected) {
      fail(`${label}: ${rel} states ${m[1]} but the repository has ${expected}`); bad++;
    }
  });

  if (bad === 0) {
    pass(`agent count (${agentCount}) and inspect-rule count (${ruleCount}) match every stated figure`);
  }
}


// ─── Check 36: reference graph — committed, current, no orphans, domains cited ─
section("36. Reference graph: no orphan references, all data domains cited");
{
  // Mirrors the algorithm in tools/build-index.mjs. Keep the two in sync.
  const walkAll = (dir) => {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) out.push(...walkAll(p));
      else if (name.endsWith(".md")) out.push(p);
    }
    return out;
  };
  const walkRefs = (dir) => walkAll(dir).filter(p => path.basename(p) !== "SKILL.md");
  const skillsRoot = path.join(PLUG, "skills");
  const nodeSet = new Set(walkRefs(skillsRoot).map(p => p.slice(PLUG.length + 1).split("\\").join("/")));
  const norm = (p) => {
    const parts = [];
    for (const seg of p.split("/")) {
      if (seg === "" || seg === ".") continue;
      if (seg === "..") { if (parts.length === 0) return null; parts.pop(); }
      else parts.push(seg);
    }
    return parts.join("/");
  };
  const edges = new Set();
  for (const file of walkAll(skillsRoot)) {
    const relSource = file.slice(PLUG.length + 1).split("\\").join("/");
    const text = fs.readFileSync(file, "utf8");
    const dir = relSource.split("/").slice(0, -1).join("/");
    for (const m of text.matchAll(/[A-Za-z0-9_./-]+\.md\b/g)) {
      const cand = m[0];
      const resolved = cand.startsWith("skills/") ? norm(cand) : norm(dir + "/" + cand);
      if (resolved && nodeSet.has(resolved) && resolved !== relSource) edges.add(relSource + " -> " + resolved);
    }
  }
  const inbound = {};
  for (const n of nodeSet) inbound[n] = 0;
  for (const e of edges) inbound[e.split(" -> ")[1]]++;
  const orphans = [...nodeSet].filter(n => inbound[n] === 0).sort();
  const graph = {
    nodes: [...nodeSet].sort(),
    edges: [...edges].sort().map(e => { const [from, to] = e.split(" -> "); return { from, to }; }),
    orphans,
  };
  const expected = JSON.stringify(graph, null, 2) + "\n";
  const graphPath = path.join(PLUG, "tools", "reference-graph.json");
  if (!fs.existsSync(graphPath)) fail("tools/reference-graph.json missing — run `node tools/build-index.mjs`");
  else if (fs.readFileSync(graphPath, "utf8") !== expected) fail("tools/reference-graph.json is stale — run `node tools/build-index.mjs` and commit the result");
  else pass(`reference-graph.json is current (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
  if (orphans.length) orphans.forEach(o => fail(`orphan reference (no inbound link from any reference or SKILL command table): ${o}`));
  else pass("no orphan references — every reference is reachable from another reference or a command table");

  let corpus = "";
  for (const f of walkAll(skillsRoot)) corpus += fs.readFileSync(f, "utf8");
  for (const extra of ["tools/design-system/README.md", "tools/README.md", "tools/design-system/scripts/core.py"]) {
    const fp = anyPath(extra);
    if (fs.existsSync(fp)) corpus += fs.readFileSync(fp, "utf8");
  }
  const dataDir = path.join(PLUG, "tools", "design-system", "data");
  const csvs = [];
  const walkCsv = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walkCsv(p);
      else if (name.endsWith(".csv")) csvs.push(p);
    }
  };
  walkCsv(dataDir);
  const uncited = csvs.filter(p => {
    const base = path.basename(p);
    const stem = base.replace(/\.csv$/, "");
    return !corpus.includes(base) && !corpus.includes(`--stack ${stem}`) && !corpus.includes(`--domain ${stem}`);
  });
  if (uncited.length) uncited.forEach(u => fail(`data file never cited by any skill, README or engine config: ${u.slice(PLUG.length + 1)}`));
  else pass(`all ${csvs.length} design-system data files are cited by a skill, a README or the engine config`);
}


// ─── Check 37: canonical laws registry ────────────────────────────────────────
// Two guarantees, and the second exists because the first was not enough.
//
// The first is that every declared law is cited somewhere. That has held since
// v2.5.0. It catches a law that nobody uses. It does not catch the opposite and
// more damaging case: a threshold restated in prose, in its own words, with a
// different number. v2.5.0 fixed five of those by hand. By v2.6.0 the seo corpus
// had grown four more, and one of them mattered: the programmatic hard stop read
// 5,000 in programmatic.md and 500 in both SKILL.md and the README, so the same
// question got a refusal or an execution depending on which file loaded. Nothing
// failed, because nothing was looking.
//
// The second guarantee closes that. A law may declare a `guard`: a regex that
// matches the shape of the threshold being stated. Any file matching a guard must
// cite the law id, or it fails. The law's own anchor file is exempt, since that is
// where the value is defined. Guards are opt-in per law and deliberately narrow,
// because a guard that cries wolf gets deleted and then guards nothing.
section("37. Canonical laws: registry well-formed, every law cited, no restated threshold");
{
  const lawsPath = path.join(PLUG, "tools", "data", "laws.csv");
  if (!fs.existsSync(lawsPath)) fail("tools/data/laws.csv missing");
  else {
    // RFC4180-ish: the statement column has embedded commas, so a naive split
    // would shear the row. Only col 0 was read before, which worked by luck.
    const parseCsv = (text) => {
      const rows = []; let row = [], cell = "", q = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
          if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
          else if (c === '"') q = false;
          else cell += c;
        } else if (c === '"') q = true;
        else if (c === ",") { row.push(cell); cell = ""; }
        else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
        else if (c !== "\r") cell += c;
      }
      if (cell || row.length) { row.push(cell); rows.push(row); }
      return rows.filter(r => r.length > 1 || r[0]);
    };
    const rows = parseCsv(fs.readFileSync(lawsPath, "utf8").trim());
    const header = rows[0];
    const col = (name) => header.indexOf(name);
    const laws = rows.slice(1).map(r => ({
      id: r[col("id")], anchor: r[col("anchor")], guard: (r[col("guard")] || "").trim(),
      source: (r[col("source")] || "").trim(), asserted: (r[col("asserted")] || "").trim(),
    })).filter(l => l.id);

    const ids = laws.map(l => l.id);
    const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dupes.length) fail(`laws.csv duplicate ids: ${dupes.join(", ")}`);
    else if (ids.length < 12) fail(`laws.csv has only ${ids.length} laws (expected >= 12)`);
    else pass(`laws.csv: ${ids.length} laws, unique ids`);

    const files = [];
    const walkMd = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) walkMd(p);
        else if (name.endsWith(".md")) files.push(p);
      }
    };
    walkMd(path.join(PLUG, "skills"));
    const readmePath = path.join(ROOT, "README.md");
    if (fs.existsSync(readmePath)) files.push(readmePath);

    const texts = new Map(files.map(p => [p, fs.readFileSync(p, "utf8")]));
    const corpus = [...texts.values()].join("\n");
    const uncited = ids.filter(id => !corpus.includes(id));
    if (uncited.length) uncited.forEach(id => fail(`law never cited in any skill: ${id}`));
    else pass("every law id is cited at least once in the skills");

    // E4. Une loi sans source ni date est un nombre que rien ne rattache au monde.
    // Le contrôle 37 garantissait qu'un seuil vive une fois ; il ne garantissait
    // pas qu'on sache d'où il vient ni quand il a été affirmé. L-PERF-1 valait
    // 2,5 s parce que Google le disait à l'écriture de la ligne, et rien ne datait
    // cette affirmation. Dater ne résout pas la péremption, cela la rend posable.
    const unsourced = laws.filter(l => !l.source || !l.asserted);
    if (unsourced.length) unsourced.forEach(l => fail(`${l.id}: no source or no assertion date. A threshold with nothing behind it is a number, not a law.`));
    else pass(`every law carries a source and the date it was asserted`);
    const badDate = laws.filter(l => l.asserted && !/^\d{4}-\d{2}-\d{2}$/.test(l.asserted));
    if (badDate.length) badDate.forEach(l => fail(`${l.id}: asserted is not an ISO date: ${l.asserted}`));

    let guarded = 0, breaches = 0;
    for (const law of laws) {
      if (!law.guard) continue;
      guarded++;
      let re;
      try { re = new RegExp(law.guard, "g"); }
      catch { fail(`${law.id}: guard is not a valid regex: ${law.guard}`); breaches++; continue; }
      const anchorAbs = anyPath(law.anchor);
      for (const [p, text] of texts) {
        if (p === anchorAbs) continue;
        const hits = text.match(re);
        if (!hits) continue;
        if (text.includes(law.id)) continue;
        breaches++;
        fail(`${path.relative(ROOT, p)} states the ${law.id} threshold ("${hits[0].trim().slice(0, 48)}") without citing ${law.id}`);
      }
    }
    if (!breaches) pass(`${guarded} guarded laws: no threshold restated outside its anchor`);
  }
}


// ─── Check 43: detector rules are coupled to the registry ─────────────────────
// The detector reports against tools/data/inspect-rules.csv, so a rule id that
// drifts out of the registry would emit a finding with no severity, no rationale
// and no standard behind it. Cheap to assert, and it fails the build the moment
// somebody renumbers the CSV without touching the engine.
section("43. Detector rules resolve in the inspect registry");
{
  const rulesPath = path.join(PLUG, "tools", "inspect", "rules.mjs");
  const csvPath = path.join(PLUG, "tools", "data", "inspect-rules.csv");
  if (!fs.existsSync(rulesPath) || !fs.existsSync(csvPath)) {
    fail("detector engine or inspect-rules.csv missing");
  } else {
    const known = new Set(
      fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/).slice(1)
        .map(l => l.split(",")[0]).filter(Boolean));
    const implemented = [...fs.readFileSync(rulesPath, "utf8").matchAll(/^\s{4}id:\s*(\d+),/gm)]
      .map(m => m[1]);
    if (!implemented.length) fail("rules.mjs declares no rule ids");
    else {
      const orphans = implemented.filter(id => !known.has(id));
      if (orphans.length) orphans.forEach(id => fail(`detector rule ${id} is not in inspect-rules.csv`));
      else pass(`${implemented.length} detector rules all resolve in the registry of ${known.size}`);
    }
  }
}


// ─── Check 38: intent routes and alias registry ───────────────────────────────
// The command surface is governed: every route in tools/data/intents.csv points
// at a live command, aliases never mask a live command and never linger in the
// docs as canonical usage, the README doors resolve, and the marketplace
// description's counts match reality (they have drifted before).
section("38. Intent routes, aliases, doors and marketplace counts");
{
  const SKILL_NAMES = ["siteasy", "seo", "inspect", "audit", "cms"];
  const AUDIT_SCOPES = new Set(["seo", "defects", "design", "quick"]);
  const liveCmds = {};
  for (const s of SKILL_NAMES) {
    liveCmds[s] = new Set(Object.keys(
      extractCommandRefs(readFile(path.join(PLUG, "skills", s, "SKILL.md")) || "")
    ));
  }
  const isLive = (skill, cmd) =>
    (liveCmds[skill] && liveCmds[skill].has(cmd)) ||
    (skill === "audit" && AUDIT_SCOPES.has(cmd));

  const intentsPath = path.join(PLUG, "tools", "data", "intents.csv");
  if (!fs.existsSync(intentsPath)) {
    fail("tools/data/intents.csv missing");
  } else {
    const lines = fs.readFileSync(intentsPath, "utf8").trim().split(/\r?\n/);
    if (lines[0] !== "intent,phrases,command,status")
      fail(`intents.csv: unexpected header "${lines[0]}"`);
    const aliases = [];
    let routeErrors = 0;
    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      const [intent, , command, status] = [cols[0], cols[1], cols[2], cols[3]];
      if (!["current", "alias"].includes(status)) {
        fail(`intents.csv: "${intent}" has unknown status "${status}"`); routeErrors++; continue;
      }
      const m = (command || "").match(/^\/([a-z-]+) ([a-z-]+)/);
      if (!m || !SKILL_NAMES.includes(m[1]) || !isLive(m[1], m[2])) {
        fail(`intents.csv: "${intent}" routes to "${command}" which is not a live command`); routeErrors++; continue;
      }
      if (status === "alias") {
        const a = intent.match(/^\/([a-z-]+) ([a-z-]+)$/);
        if (!a || !SKILL_NAMES.includes(a[1])) {
          fail(`intents.csv: alias "${intent}" is not of the form "/skill name"`); routeErrors++;
        } else if (liveCmds[a[1]].has(a[2])) {
          fail(`intents.csv: alias "${intent}" masks a live command of the same name`); routeErrors++;
        } else {
          aliases.push(intent);
        }
      }
    }
    if (!routeErrors) pass(`intents.csv: ${lines.length - 1} routes, every command live, ${aliases.length} alias(es) clean`);

    // Aliased legacy names must not survive as canonical usage in the docs.
    const staleTargets = [];
    const collect = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        const p2 = path.join(dir, name);
        if (fs.statSync(p2).isDirectory()) collect(p2);
        else if (name.endsWith(".md")) staleTargets.push(p2);
      }
    };
    collect(path.join(PLUG, "skills"));
    if (fs.existsSync(path.join(ROOT, "docs"))) collect(path.join(ROOT, "docs"));
    if (fs.existsSync(path.join(PLUG, "agents"))) collect(path.join(PLUG, "agents"));
    staleTargets.push(path.join(ROOT, "README.md"));
    staleTargets.push(path.join(PLUG, "tools", "data", "remediation-map.csv"));
    let stale = 0;
    for (const f of staleTargets) {
      const txt = fs.readFileSync(f, "utf8");
      for (const a of aliases) {
        if (txt.includes(a)) {
          fail(`stale legacy name "${a}" still used in ${f.slice(ROOT.length + 1)} — use its canonical command (see intents.csv)`);
          stale++;
        }
      }
    }
    if (!stale) pass("no aliased legacy name survives in skills/, docs/, agents/, README or the remediation map");
  }

  // README doors: every backticked /skill command in "Pick your goal" resolves.
  const readme = readFile(path.join(ROOT, "README.md")) || "";
  const doorsSection = readme.match(/## Pick your goal([\s\S]*?)\n## /);
  if (!doorsSection) fail("README: 'Pick your goal' section not found");
  else {
    let doorErrors = 0, doorCount = 0;
    for (const m of doorsSection[1].matchAll(/`\/([a-z-]+)(?: ([a-z-]+)(?![\w.]))?[^`]*`/g)) {
      if (!SKILL_NAMES.includes(m[1])) continue;
      doorCount++;
      if (m[2] && !isLive(m[1], m[2])) {
        fail(`README door \`/${m[1]} ${m[2]}\` is not a live command`); doorErrors++;
      }
    }
    if (!doorErrors) pass(`README doors: ${doorCount} invocation(s) in 'Pick your goal', all resolve`);
  }

  // Marketplace description counts match reality.
  const mkt = JSON.parse(readFile(path.join(ROOT, ".claude-plugin", "marketplace.json")) || "{}");
  const desc = (mkt.plugins && mkt.plugins[0] && mkt.plugins[0].description) || "";
  const totalCmds = SKILL_NAMES.reduce((n, s) => n + liveCmds[s].size, 0);
  const agentCount = fs.readdirSync(path.join(PLUG, "agents")).filter(f => f.endsWith(".md")).length;
  const mc = desc.match(/(\d+)\s+commands/);
  const ma = desc.match(/(\d+)\s+(?:parallel\s+)?sub-agents/);
  if (!mc) fail("marketplace description: no command count found");
  else if (Number(mc[1]) !== totalCmds) fail(`marketplace description says ${mc[1]} commands, actual ${totalCmds}`);
  else pass(`marketplace description command count ${mc[1]} matches actual`);
  if (!ma) fail("marketplace description: no sub-agent count found");
  else if (Number(ma[1]) !== agentCount) fail(`marketplace description says ${ma[1]} sub-agents, actual ${agentCount}`);
  else pass(`marketplace description sub-agent count ${ma[1]} matches actual`);
}


// ─── Check 39: hints cover the tables, remediation routes are live, docs agent counts match ─
section("39. Argument-hint coverage, remediation routes live, doc agent counts");
{
  const SKILLS39 = ["siteasy", "seo", "inspect", "audit"];
  const live39 = {};
  for (const s of SKILLS39) {
    const txt = readFile(path.join(PLUG, "skills", s, "SKILL.md")) || "";
    live39[s] = new Set(Object.keys(extractCommandRefs(txt)));
    const hint = (txt.match(/argument-hint:\s*"([^"]+)"/) || [])[1] || "";
    const missing = [...live39[s]].filter(c => !hint.includes(c));
    if (missing.length) fail(`${s}: argument-hint omits command(s): ${missing.join(", ")}`);
    else pass(`${s}: argument-hint covers all ${live39[s].size} commands`);
  }
  const AUDIT_SCOPES39 = new Set(["seo", "defects", "design", "quick"]);
  const remLines = (readFile(path.join(PLUG, "tools", "data", "remediation-map.csv")) || "").trim().split(/\r?\n/).slice(1);
  let deadRoutes = 0;
  for (const line of remLines) {
    const cmd = line.split(",")[2] || "";
    const m = cmd.match(/^\/([a-z-]+) ([a-z-]+)$/);
    if (!m || !(live39[m[1]] && (live39[m[1]].has(m[2]) || (m[1] === "audit" && AUDIT_SCOPES39.has(m[2]))))) {
      fail(`remediation-map routes to "${cmd}" which is not a live command`); deadRoutes++;
    }
  }
  if (!deadRoutes) pass(`remediation-map: all ${remLines.length} routes point at live commands`);
  const agentCount39 = fs.readdirSync(path.join(PLUG, "agents")).filter(f => f.endsWith(".md")).length;
  const arch = readFile(path.join(ROOT, "docs", "ARCHITECTURE.md")) || "";
  const claims39 = [...arch.matchAll(/(?:its|all|earns) (\d+) (?:specialist )?(?:sub-)?agents/g)].map(m => Number(m[1]));
  const wrong39 = claims39.filter(n => n !== agentCount39);
  if (wrong39.length) fail(`ARCHITECTURE.md agent-count claim(s) ${wrong39.join(", ")} do not match actual ${agentCount39}`);
  else pass(`ARCHITECTURE.md: all ${claims39.length} agent-count claims match actual ${agentCount39}`);
}

// ─── Check 40: AI crawler registry is consistent across its three homes ──────
// The registry lives in tools/data/ai-crawlers.csv (with the operator doc URL), is
// mirrored inline in tools/audit/lib/ai-access.mjs (so the analyzer has no runtime
// file read), and is published as a table in skills/seo/references/geo.md. Three
// copies drift. This check makes drift a build failure rather than a wrong answer,
// which is the exact defect that shipped before: a crawler table missing the three
// bots that decide assistant citations.
section("40. AI crawler registry consistency (csv, analyzer, geo.md)");
{
  const csvPath = path.join(PLUG, "tools/data/ai-crawlers.csv");
  const modPath = path.join(PLUG, "tools/audit/lib/ai-access.mjs");
  const geoPath = path.join(PLUG, "skills/seo/references/geo.md");
  const csvTxt = readFile(csvPath), modTxt = readFile(modPath), geoTxt = readFile(geoPath);
  if (!csvTxt || !modTxt || !geoTxt) {
    fail("AI crawler registry: one of csv / ai-access.mjs / geo.md is missing");
  } else {
    const rows = csvTxt.split("\n").filter(l => l.trim()).slice(1);
    const csvIds = rows.map(l => l.split(",")[0].trim()).filter(Boolean);
    const modIds = [...modTxt.matchAll(/\{\s*id:\s*"([^"]+)",\s*operator:/g)].map(m => m[1]);
    const missingInMod = csvIds.filter(id => !modIds.includes(id));
    const extraInMod = modIds.filter(id => !csvIds.includes(id));
    if (missingInMod.length) fail(`ai-access.mjs is missing crawler(s) present in the CSV: ${missingInMod.join(", ")}`);
    if (extraInMod.length) fail(`ai-access.mjs declares crawler(s) absent from the CSV: ${extraInMod.join(", ")}`);
    if (!missingInMod.length && !extraInMod.length) pass(`ai-crawlers.csv and ai-access.mjs agree on ${csvIds.length} crawlers`);

    const missingInGeo = csvIds.filter(id => !geoTxt.includes(id));
    if (missingInGeo.length) fail(`geo.md crawler table is missing: ${missingInGeo.join(", ")}`);
    else pass(`geo.md documents all ${csvIds.length} crawlers`);

    // The three tokens whose absence caused a real false negative. Named explicitly so
    // a future edit cannot quietly drop them again.
    const SENTINELS = ["Claude-SearchBot", "Claude-User", "Perplexity-User"];
    const lostSentinels = SENTINELS.filter(id => !csvIds.includes(id));
    if (lostSentinels.length) fail(`crawler registry lost the citation-deciding token(s): ${lostSentinels.join(", ")}`);
    else pass("the three citation-deciding fetchers are still registered");

    // Every row must carry an operator documentation URL: this registry is the kind of
    // data that rots into folklore without a primary source attached to each line.
    const noSource = rows.filter(l => !/https?:\/\//.test(l)).length;
    if (noSource) fail(`${noSource} crawler row(s) carry no operator documentation URL`);
    else pass(`all ${rows.length} crawler rows cite an operator source`);
  }
}

// ─── Check 41: the ADVISORY verdict is declared and excluded from scoring ────
// ADVISORY exists so an emerging standard can be reported without being priced. If
// the schema forgets it, valid reports fail validation; if the scorer forgets it, a
// draft spec starts costing sites points. Both directions are guarded here.
section("41. ADVISORY verdict wired end to end");
{
  const schema = readFile(path.join(PLUG, "tools/audit/schema/site-audit.schema.json")) || "";
  const checksMjs = readFile(path.join(PLUG, "tools/audit/lib/checks.mjs")) || "";
  let ok = true;
  try {
    const enumVals = JSON.parse(schema).properties.checks.items.properties.verdict.enum;
    if (!enumVals.includes("ADVISORY")) { fail("site-audit.schema.json verdict enum does not allow ADVISORY"); ok = false; }
    else pass(`schema verdict enum carries ADVISORY (${enumVals.length} values)`);
  } catch { fail("could not read the verdict enum from site-audit.schema.json"); ok = false; }
  if (!/verdict !== "ADVISORY"/.test(checksMjs)) {
    fail("scoreFromChecks does not exclude ADVISORY: a non-scoring signal would cost points");
  } else pass("scoreFromChecks excludes ADVISORY from the scored set");
}

// ─── Check 42: new deterministic tooling is present and self-describing ──────
section("42. Deterministic tooling present");
{
  const TOOLS = [
    "skills/seo/scripts/gsc-analyze.mjs",
    "skills/seo/scripts/scrub.mjs",
    "skills/seo/scripts/parasite.mjs",
    "tools/content/score.mjs",
    "tools/check-context-budget.mjs",
    "tools/check-routing.mjs",
    "tools/audit/lib/ai-access.mjs",
    "tools/audit/lib/url-safety.mjs",
    "tools/inspect/three.mjs",
    "tools/inspect/motion.mjs",
    "tools/inspect/capture.mjs",
    "tools/siteasy/variety.mjs",
    "tests/behavior/run.mjs",
  ];
  let missingTools = 0;
  TOOLS.forEach(rel => {
    if (!fs.existsSync(anyPath(rel))) { fail(`missing tool: ${rel}`); missingTools++; }
  });
  if (!missingTools) pass(`all ${TOOLS.length} deterministic tools present`);
}


// --- Summary --------------------------------------------------------------------

console.log("\n" + "═".repeat(50));
console.log(`  Checks run:  ${checks}`);
console.log(`  Passed:      ${checks - errors - warnings}`);
console.log(`  Warnings:    ${warnings}`);
console.log(`  Errors:      ${errors}`);
console.log("═".repeat(50) + "\n");

if (errors > 0) {
  console.error(`❌  Validation FAILED with ${errors} error(s). Fix before submitting a PR.`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`⚠️   Validation passed with ${warnings} warning(s).`);
  process.exit(0);
} else {
  console.log("✅  All checks passed.");
  process.exit(0);
}
