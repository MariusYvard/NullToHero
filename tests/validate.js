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
 */

const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const ROOT       = path.resolve(__dirname, "..");
const SEO_SKILL  = path.join(ROOT, "skills", "seo", "SKILL.md");
const SEO_REFS   = path.join(ROOT, "skills", "seo", "references");
const SEO_AGENTS = path.join(ROOT, "agents");

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
  "skills/seo/references/report.md":            { minLines:  80 },
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
  // ── siteasy ──────────────────────────────────────────────────────────────
  "skills/siteasy/SKILL.md":                                { minLines: 140 },  // actual: 153
  "skills/siteasy/references/live.md":                      { minLines: 520 },  // actual: 546
  "skills/siteasy/references/document.md":                  { minLines: 400 },  // actual: 428
  "skills/siteasy/references/parallax.md":                  { minLines: 380 },
  "skills/siteasy/references/craft.md":                     { minLines: 180 },  // actual: 194
  "skills/siteasy/references/accessibility-engineering.md": { minLines: 230 },
  "skills/siteasy/references/critique.md":                  { minLines: 200 },  // actual: 214
  "skills/siteasy/references/polish.md":                    { minLines: 200 },
  "skills/siteasy/references/css-architecture.md":          { minLines: 200 },
  "skills/siteasy/references/animation-engineering.md":     { minLines: 200 },
  "skills/siteasy/references/component-patterns.md":        { minLines: 200 },
  "skills/siteasy/references/design-tokens.md":             { minLines: 200 },
  "skills/siteasy/references/form-patterns.md":             { minLines: 190 },
  "skills/siteasy/references/image-strategy.md":            { minLines: 180 },
  "skills/siteasy/references/wcag-2-2.md":                  { minLines: 180 },
  "skills/siteasy/references/dark-mode-engineering.md":     { minLines: 180 },
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
  // ── inspect ──────────────────────────────────────────────────────────────
  "skills/inspect/SKILL.md":                    { minLines:  65 },
  "skills/inspect/references/detect.md":        { minLines: 115 },  // actual: 125
  "skills/inspect/references/review.md":        { minLines: 100 },
  "skills/inspect/references/preview.md":       { minLines:  35 },
  // -- audit (meta-orchestrator) ------------------------------------------
  "skills/audit/SKILL.md":                      { minLines:  60 },
  "skills/audit/references/full.md":            { minLines: 150 },
  "skills/audit/references/report.md":          { minLines:  60 },
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
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    warn(`${relPath}: not found — skipping integrity check`);
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

const seoExpectedMinimum = 19; // minimum floor
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

const SITEASY_SKILL = path.join(ROOT, "skills", "siteasy", "SKILL.md");
const SITEASY_REFS  = path.join(ROOT, "skills", "siteasy", "references");

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

const INSPECT_SKILL = path.join(ROOT, "skills", "inspect", "SKILL.md");
const INSPECT_REFS  = path.join(ROOT, "skills", "inspect", "references");

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

const AUDIT_SKILL = path.join(ROOT, "skills", "audit", "SKILL.md");
const AUDIT_REFS  = path.join(ROOT, "skills", "audit", "references");

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

const pluginJsonContent = readFile(path.join(ROOT, ".claude-plugin", "plugin.json"));
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
    const v = mj.plugins?.[0]?.version || null;
    versionSources[".claude-plugin/marketplace.json"] = v;
    if (!v) fail("marketplace.json: missing plugins[0].version");
  } catch { fail("marketplace.json: invalid JSON"); }
} else { fail(".claude-plugin/marketplace.json: not found"); }

["seo", "siteasy", "inspect", "audit"].forEach(skill => {
  const content = readFile(path.join(ROOT, "skills", skill, "SKILL.md"));
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
    }
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

scanDir(path.join(ROOT, "tools"), ROOT);
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

const SKILLS_DIR = path.join(ROOT, "skills");
const allSkillMd = walkMd(SKILLS_DIR, []);
let impeccableHits = 0;
allSkillMd.forEach(f => {
  const content = readFile(f) || "";
  content.split("\n").forEach((line, i) => {
    if (/\/impeccable\b/.test(line)) {
      const rel = f.slice(ROOT.length + 1).split("\\").join("/");
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
      const relFile = f.slice(ROOT.length + 1).split("\\").join("/");
      fail(`${relFile}: script path "${rel}" assumes external .claude/ layout — use \${CLAUDE_PLUGIN_ROOT}`);
      missingScripts++;
      continue;
    }
    scriptRefs++;
    if (!fs.existsSync(path.join(ROOT, rel))) {
      const relFile = f.slice(ROOT.length + 1).split("\\").join("/");
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
      path.join(ROOT, "skills", ref),      // skill-qualified, e.g. siteasy/references/x.md
      path.join(ROOT, "skills", "seo", ref),
      path.join(ROOT, ref),                // repo-root relative
    ];
    if (!candidates.some(c => fs.existsSync(c))) {
      const relFile = f.slice(ROOT.length + 1).split("\\").join("/");
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
const SKILLS_ROOT = path.join(ROOT, "skills");
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
const actualCommands = seoActual + siteasyCmdCount + inspectCmdCount + auditCmdCount;

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
  for (const file of walk(path.join(ROOT, "skills"))) {
    const rel = file.slice(ROOT.length + 1).split("\\").join("/");
    const skill = rel.split("/")[1];
    const text = fs.readFileSync(file, "utf8");
    const title = firstHeading(text);
    entries.push({ skill, path: rel, title: title || path.basename(file, ".md"), keywords: kw(title, file) });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const expected = JSON.stringify(entries, null, 2) + "\n";
  const indexPath = path.join(ROOT, "tools", "reference-index.json");
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
        const rel = f.slice(ROOT.length + 1).split("\\").join("/");
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
  walkCsv(path.join(ROOT, "tools"), []).forEach(f => {
    const rel = f.slice(ROOT.length + 1).split(path.sep).join("/");
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
