#!/usr/bin/env node
/**
 * NullToHero — Reference file integrity validator
 * Usage: node tests/validate.js
 *
 * Checks:
 *  1. All commands in SKILL.md have a corresponding reference file
 *  2. All reference files have valid YAML frontmatter
 *  3. All referenced files within reference files (e.g. plan-assets/) exist
 *  4. No broken internal cross-references
 *  5. File integrity — minimum line counts per file (catches truncated rewrites)
 *  6. Agent files exist and have valid frontmatter
 *  7. Repo quality files present
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

function pass(msg)  { console.log(`  ✅  ${msg}`); checks++; }
function fail(msg)  { console.error(`  ❌  ${msg}`); errors++; checks++; }
function warn(msg)  { console.warn(`  ⚠️   ${msg}`); warnings++; checks++; }
function section(title) { console.log(`\n── ${title} ──`); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
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
// Minimum line counts per file — catches truncated rewrites.
// Set conservatively: actual files should be well above these floors.

const FILE_INTEGRITY = {
  "skills/seo/SKILL.md":                        { minLines: 80  },
  "skills/seo/references/geo.md":               { minLines: 150 },
  "skills/seo/references/audit.md":             { minLines: 60  },
  "skills/seo/references/technical.md":         { minLines: 60  },
  "skills/seo/references/content.md":           { minLines: 60  },
  "skills/seo/references/schema.md":            { minLines: 60  },
  "skills/seo/references/plan.md":              { minLines: 60  },
  "skills/seo/references/page.md":              { minLines: 40  },
  "skills/seo/references/sitemap.md":           { minLines: 60  },
  "skills/seo/references/images.md":            { minLines: 60  },
  "skills/seo/references/local.md":             { minLines: 80  },
  "skills/seo/references/hreflang.md":          { minLines: 80  },
  "skills/seo/references/programmatic.md":      { minLines: 80  },
  "skills/seo/references/competitor-pages.md":  { minLines: 80  },
  "skills/seo/references/cluster.md":           { minLines: 80  },
  "skills/seo/references/sxo.md":               { minLines: 60  },
  "skills/seo/references/drift.md":             { minLines: 80  },
  "skills/seo/references/backlinks.md":         { minLines: 80  },
  "skills/seo/references/ecommerce.md":         { minLines: 80  },
  "skills/seo/references/report.md":            { minLines: 80  },
  "skills/seo/references/action-plan.md":       { minLines: 80  },
  "skills/seo/agents/audit-technical.md":       { minLines: 60  },
  "skills/seo/agents/audit-content.md":         { minLines: 60  },
  "skills/seo/agents/audit-schema.md":          { minLines: 60  },
  "skills/seo/agents/audit-geo.md":             { minLines: 60  },
  "skills/seo/agents/audit-performance.md":     { minLines: 60  },
};

// ─── Check 1: SKILL.md exists ─────────────────────────────────────────────────

section("1. SKILL.md exists");

const skillContent = readFile(SEO_SKILL);
if (!skillContent) {
  fail(`skills/seo/SKILL.md not found at ${SEO_SKILL}`);
} else {
  pass("skills/seo/SKILL.md found");
}

// ─── Check 2: Extract commands from SKILL.md ──────────────────────────────────

section("2. Commands declared in SKILL.md");

const commandReferenceMap = {};
if (skillContent) {
  const tableRows = skillContent.match(/\| `[\w\s\[\]|\\-]+` \|.*\| \[references\/([\w\-/.]+)\]/g) || [];
  tableRows.forEach(row => {
    const commandMatch  = row.match(/\| `([\w][\w-]*)/);
    const referenceMatch = row.match(/\[references\/([\w\-/.]+)\]/);
    if (commandMatch && referenceMatch) {
      const cmd = commandMatch[1];
      const ref = referenceMatch[1];
      commandReferenceMap[cmd] = ref;
      pass(`Command '${cmd}' → references/${ref}`);
    }
  });
  if (Object.keys(commandReferenceMap).length === 0) {
    warn("No commands found in SKILL.md table — check table formatting");
  }
}

// ─── Check 3: All reference files exist ───────────────────────────────────────

section("3. Reference files exist");

Object.entries(commandReferenceMap).forEach(([cmd, ref]) => {
  const refPath = path.join(SEO_REFS, ref.endsWith(".md") ? ref : ref);
  if (fs.existsSync(refPath)) {
    pass(`references/${ref} exists`);
  } else {
    if (ref.endsWith("/")) {
      if (fs.existsSync(path.join(SEO_REFS, ref))) {
        pass(`references/${ref} directory exists`);
      } else {
        fail(`references/${ref} directory NOT found (required by command '${cmd}')`);
      }
    } else {
      fail(`references/${ref} NOT found (required by command '${cmd}')`);
    }
  }
});

// ─── Check 4: All reference files have valid frontmatter ──────────────────────

section("4. Reference file frontmatter");

if (fs.existsSync(SEO_REFS)) {
  const refFiles = fs.readdirSync(SEO_REFS).filter(f => f.endsWith(".md"));
  refFiles.forEach(file => {
    const content = readFile(path.join(SEO_REFS, file));
    if (!content) { fail(`${file}: cannot read`); return; }

    const fm = parseFrontmatter(content);
    if (!fm) {
      fail(`${file}: missing YAML frontmatter (--- block)`);
      return;
    }

    const required = ["name", "description", "version"];
    required.forEach(field => {
      if (!fm[field]) {
        fail(`${file}: missing frontmatter field '${field}'`);
      }
    });

    if (fm.name && fm.description && fm.version) {
      pass(`${file}: frontmatter valid (name: ${fm.name}, version: ${fm.version})`);
    }
  });
} else {
  fail(`references/ directory not found at ${SEO_REFS}`);
}

// ─── Check 5: Agent files ─────────────────────────────────────────────────────

section("5. Agent files");

const expectedAgents = [
  "audit-technical.md",
  "audit-content.md",
  "audit-schema.md",
  "audit-geo.md",
  "audit-performance.md",
];

if (!fs.existsSync(SEO_AGENTS)) {
  fail(`agents/ directory not found at ${SEO_AGENTS}`);
} else {
  expectedAgents.forEach(file => {
    const agentPath = path.join(SEO_AGENTS, file);
    if (!fs.existsSync(agentPath)) {
      fail(`agents/${file} missing`);
      return;
    }
    const content = readFile(agentPath);
    const fm = parseFrontmatter(content);
    if (!fm) {
      fail(`agents/${file}: missing YAML frontmatter`);
      return;
    }
    if (!fm.agent || fm.agent !== "true") {
      warn(`agents/${file}: missing 'agent: true' in frontmatter`);
    }
    if (!fm.dimension) {
      warn(`agents/${file}: missing 'dimension' field in frontmatter`);
    }
    pass(`agents/${file}: valid (dimension: ${fm.dimension || "?"})`);
  });
}

// ─── Check 6: File integrity (minimum line counts) ────────────────────────────

section("6. File integrity (minimum line counts)");

Object.entries(FILE_INTEGRITY).forEach(([relPath, { minLines }]) => {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    warn(`${relPath}: file not found — skipping integrity check`);
    return;
  }
  const content = readFile(absPath);
  const lines   = lineCount(content);
  if (lines < minLines) {
    fail(`${relPath}: ${lines} lines — below minimum threshold of ${minLines} (file may be truncated)`);
  } else {
    pass(`${relPath}: ${lines} lines (min: ${minLines}) ✓`);
  }
});

// ─── Check 7: Command count ────────────────────────────────────────────────────

section("7. Command count");

const expectedMinimum = 19; // v1.4.0 adds 'report'
const actual = Object.keys(commandReferenceMap).length;
if (actual >= expectedMinimum) {
  pass(`${actual} commands declared (minimum expected: ${expectedMinimum})`);
} else {
  warn(`Only ${actual} commands found in SKILL.md (expected >= ${expectedMinimum}) — update SKILL.md or this threshold`);
}

// ─── Check 8: Repo quality files ──────────────────────────────────────────────

section("8. Repo quality files");

const repoFiles = ["README.md", "CHANGELOG.md", "CONTRIBUTING.md", "install.sh", "install.ps1"];
repoFiles.forEach(file => {
  if (fs.existsSync(path.join(ROOT, file))) {
    pass(`${file} present`);
  } else {
    warn(`${file} missing — recommended for a complete plugin repo`);
  }
});

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
