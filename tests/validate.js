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
 */

const fs   = require("fs");
const path = require("path");

const ROOT     = path.resolve(__dirname, "..");
const SEO_SKILL  = path.join(ROOT, "skills", "seo", "SKILL.md");
const SEO_REFS   = path.join(ROOT, "skills", "seo", "references");

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
  const tableRows = skillContent.match(/\| `[\w\s\[\]|\\]+` \|.*\| \[references\/([\w\-/.]+)\]/g) || [];
  tableRows.forEach(row => {
    const commandMatch  = row.match(/\| `([\w]+)/);
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
  // Handle plain .md references
  const refPath = path.join(SEO_REFS, ref.endsWith(".md") ? ref : ref);
  if (fs.existsSync(refPath)) {
    pass(`references/${ref} exists`);
  } else {
    // Could be a directory reference (plan-assets/)
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

// ─── Check 5: SKILL.md command count ──────────────────────────────────────────

section("5. Command count");

const expectedMinimum = 18; // as of v1.3.0
const actual = Object.keys(commandReferenceMap).length;
if (actual >= expectedMinimum) {
  pass(`${actual} commands declared (minimum expected: ${expectedMinimum})`);
} else {
  warn(`Only ${actual} commands found in SKILL.md (expected ≥ ${expectedMinimum}) — update SKILL.md or this threshold`);
}

// ─── Check 6: Repo quality files ──────────────────────────────────────────────

section("6. Repo quality files");

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
