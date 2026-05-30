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
 *  6.  Repo quality files present
 *  7.  seo command count meets minimum
 *  8.  siteasy SKILL.md and all reference files exist with valid frontmatter
 *  9.  inspect SKILL.md and all reference files exist with valid frontmatter
 * 10.  Version consistency — plugin.json, marketplace.json, all SKILL.md must match
 * 11.  Large files warning — files over 500 KB in tools/ are flagged
 */

const fs   = require("fs");
const path = require("path");

const ROOT       = path.resolve(__dirname, "..");
const SEO_SKILL  = path.join(ROOT, "skills", "seo", "SKILL.md");
const SEO_REFS   = path.join(ROOT, "skills", "seo", "references");
const SEO_AGENTS = path.join(ROOT, "skills", "seo", "agents");

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
  const match = content.match(/^---\n([\s\S]*?)\n---/);
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
  "skills/seo/agents/audit-technical.md":       { minLines:  60 },
  "skills/seo/agents/audit-content.md":         { minLines:  60 },
  "skills/seo/agents/audit-schema.md":          { minLines:  60 },
  "skills/seo/agents/audit-geo.md":             { minLines:  60 },
  "skills/seo/agents/audit-performance.md":     { minLines:  60 },
  // ── siteasy ──────────────────────────────────────────────────────────────
  "skills/siteasy/SKILL.md":                                { minLines: 200 },
  "skills/siteasy/references/live.md":                      { minLines: 700 },
  "skills/siteasy/references/document.md":                  { minLines: 500 },
  "skills/siteasy/references/parallax.md":                  { minLines: 380 },
  "skills/siteasy/references/craft.md":                     { minLines: 250 },
  "skills/siteasy/references/accessibility-engineering.md": { minLines: 230 },
  "skills/siteasy/references/critique.md":                  { minLines: 230 },
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
  "skills/siteasy/references/inspiration.md":               { minLines: 160 },
  "skills/siteasy/references/shape.md":                     { minLines: 160 },
  "skills/siteasy/references/teach.md":                     { minLines: 160 },
  "skills/siteasy/references/brand.md":                     { minLines: 160 },
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
  "skills/siteasy/references/playwright.md":                { minLines: 100 },
  "skills/siteasy/references/distill.md":                   { minLines:  90 },
  "skills/siteasy/references/cognitive-load.md":            { minLines:  80 },
  "skills/siteasy/references/typography.md":                { minLines:  75 },
  "skills/siteasy/references/color-and-contrast.md":        { minLines:  70 },
  "skills/siteasy/references/ux-writing.md":                { minLines:  70 },
  "skills/siteasy/references/product.md":                   { minLines:  70 },
  "skills/siteasy/references/extract.md":                   { minLines:  55 },
  "skills/siteasy/references/responsive-design.md":         { minLines:  55 },
  "skills/siteasy/references/interaction-design.md":        { minLines:  50 },
  "skills/siteasy/references/tokens.md":                    { minLines:  50 },
  "skills/siteasy/references/spatial-design.md":            { minLines:  45 },
  // ── inspect ──────────────────────────────────────────────────────────────
  "skills/inspect/SKILL.md":                    { minLines:  65 },
  "skills/inspect/references/detect.md":        { minLines: 140 },
  "skills/inspect/references/review.md":        { minLines: 100 },
  "skills/inspect/references/preview.md":       { minLines:  35 },
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

section("5. seo agent files");

const expectedAgents = [
  "audit-technical.md", "audit-content.md",
  "audit-schema.md", "audit-geo.md", "audit-performance.md",
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
    if (!fm.agent || fm.agent !== "true") warn(`agents/${file}: missing 'agent: true'`);
    if (!fm.dimension) warn(`agents/${file}: missing 'dimension' field`);
    pass(`agents/${file}: valid (dimension: ${fm.dimension || "?"})`);
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

const expectedMinimum = 19; // v1.5.0
const actual = Object.keys(commandReferenceMap).length;
if (actual >= expectedMinimum) {
  pass(`${actual} commands declared (minimum: ${expectedMinimum})`);
} else {
  warn(`Only ${actual} commands found in seo/SKILL.md (expected >= ${expectedMinimum})`);
}

// ─── Check 8: Repo quality files ──────────────────────────────────────────────

section("8. Repo quality files");

["README.md", "CHANGELOG.md", "CONTRIBUTING.md", "ATTRIBUTION.md", "install.sh", "install.ps1"].forEach(file => {
  if (fs.existsSync(path.join(ROOT, file))) {
    pass(`${file} present`);
  } else {
    warn(`${file} missing`);
  }
});

// ─── Check 9: siteasy skill ───────────────────────────────────────────────────

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

// ─── Check 10: inspect skill ──────────────────────────────────────────────────

section("10. inspect SKILL.md and references");

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

// ─── Check 11: Version consistency ────────────────────────────────────────────

section("11. Version consistency (plugin.json / marketplace.json / SKILL.md)");

const versionSources = {};

const pluginJsonContent = readFile(path.join(ROOT, ".claude-plugin", "plugin.json"));
if (pluginJsonContent) {
  try {
    const pj = JSON.parse(pluginJsonContent);
    versionSources[".claude-plugin/plugin.json"] = pj.version || null;
    if (!pj.version) fail("plugin.json: missing 'version'");
  } catch { fail("plugin.json: invalid JSON"); }
} else { fail(".claude-plugin/plugin.json: not found"); }

const marketplaceJsonContent = readFile(path.join(ROOT, ".claude-plugin", "marketplace.json"));
if (marketplaceJsonContent) {
  try {
    const mj = JSON.parse(marketplaceJsonContent);
    const v = mj.plugins?.[0]?.version || null;
    versionSources[".claude-plugin/marketplace.json"] = v;
    if (!v) fail("marketplace.json: missing plugins[0].version");
  } catch { fail("marketplace.json: invalid JSON"); }
} else { fail(".claude-plugin/marketplace.json: not found"); }

["seo", "siteasy", "inspect"].forEach(skill => {
  const content = readFile(path.join(ROOT, "skills", skill, "SKILL.md"));
  if (content) {
    const fm = parseFrontmatter(content);
    versionSources[`skills/${skill}/SKILL.md`] = fm?.version || null;
    if (!fm?.version) fail(`skills/${skill}/SKILL.md: version missing from frontmatter`);
  } else {
    fail(`skills/${skill}/SKILL.md: not found`);
  }
});

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

// ─── Check 12: Large files warning ────────────────────────────────────────────

section("12. Large files (> 500 KB in tools/)");

const SIZE_LIMIT = 500 * 1024;

function scanDir(dir, root) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) scanDir(full, root);
    else if (stat.size > SIZE_LIMIT) {
      const rel = full.slice(root.length + 1).split("\\").join("/");
      warn(`${rel}: ${(stat.size / 1024).toFixed(0)} KB — consider offloading to a release asset`);
    }
  }
}

scanDir(path.join(ROOT, "tools"), ROOT);
pass("Large-file scan complete");

// ─── Summary ──────────────────────────────────────────────────────────────────

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
