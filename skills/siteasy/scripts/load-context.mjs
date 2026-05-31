#!/usr/bin/env node
// load-context.mjs — siteasy shared context loader.
// Reports whether PRODUCT.md and DESIGN.md exist at the project root, returns
// their contents, and migrates a legacy `.impeccable.md` to `PRODUCT.md` once.
// Pure Node standard library, no dependencies. Run from the project root.
//
// Usage: node "${CLAUDE_PLUGIN_ROOT}/skills/siteasy/scripts/load-context.mjs" [projectRoot]
// Output: single-line JSON
//   { ok, root, hasProduct, productPath, product, hasDesign, designPath, design, migrated }

import { existsSync, readFileSync, renameSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] || process.cwd());

function readIf(path) {
  try {
    if (existsSync(path) && statSync(path).isFile()) {
      return readFileSync(path, "utf8");
    }
  } catch { /* fall through */ }
  return null;
}

const productPath = join(root, "PRODUCT.md");
const designPath  = join(root, "DESIGN.md");
const legacyPath  = join(root, ".impeccable.md");

let migrated = false;

// Migrate legacy .impeccable.md -> PRODUCT.md, only when PRODUCT.md is absent.
if (existsSync(legacyPath) && !existsSync(productPath)) {
  try {
    renameSync(legacyPath, productPath);
    migrated = true;
  } catch { /* leave legacy file in place on failure */ }
}

const product = readIf(productPath);
const design  = readIf(designPath);

const out = {
  ok: true,
  root,
  hasProduct: product !== null,
  productPath: product !== null ? productPath : null,
  product,
  hasDesign: design !== null,
  designPath: design !== null ? designPath : null,
  design,
  migrated,
};

process.stdout.write(JSON.stringify(out) + "\n");
