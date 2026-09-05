#!/usr/bin/env node
// load-context.mjs — siteasy shared context loader.
// Reports whether PRODUCT.md and DESIGN.md exist at the project root, returns
// their contents, migrates a legacy `.impeccable.md` to `PRODUCT.md` once, and
// scans the project for the conventions a build must not stomp on.
//
// The Conventions gate has always required reading the fonts already loaded, the
// custom properties already defined and the naming convention already in use.
// It was a prose instruction, so it was followed when it was remembered. The
// scan below answers the same question as machine output the gate can require.
//
// Usage: node "${NTH_ROOT}/skills/siteasy/scripts/load-context.mjs" [projectRoot]
// Output: single-line JSON
//   { ok, root, hasProduct, productPath, product, hasDesign, designPath, design,
//     migrated, preflight }
//
// No cache. hallmark-style tooling caches this because the scan is done by a
// model reading files; here it is a few dozen regex passes over bounded input and
// finishes in milliseconds, so a cache would only add a staleness bug.
//
// Pure Node standard library, no dependencies. Run from the project root.

import { existsSync, readFileSync, readdirSync, renameSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] || process.cwd());

function readIf(path) {
  try {
    if (existsSync(path) && statSync(path).isFile()) {
      return readFileSync(path, "utf8");
    }
  } catch { /* fall through */ }
  return null;
}

/* ---------------------------- the file walk ---------------------------- */

// Bounded on purpose. A build's conventions live in the project's own source, and
// a scan that wanders into node_modules reports the conventions of somebody else's
// code. The caps stop a monorepo from turning a context load into a full crawl.
const SKIP = new Set([
  "node_modules", ".git", ".next", ".nuxt", ".svelte-kit", ".astro", ".vercel",
  "dist", "build", "out", "coverage", "vendor", ".venv", "__pycache__",
]);
const MAX_DEPTH = 4;
const MAX_FILES = 80;
const MAX_BYTES = 512 * 1024;

function collect(dir, exts, depth = 0, out = []) {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES) return out;
  let names;
  try { names = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const d of names) {
    if (out.length >= MAX_FILES) break;
    if (d.name.startsWith(".") && d.name !== ".") { if (SKIP.has(d.name)) continue; }
    const p = join(dir, d.name);
    if (d.isDirectory()) {
      if (SKIP.has(d.name)) continue;
      collect(p, exts, depth + 1, out);
    } else if (exts.some((e) => d.name.endsWith(e))) {
      try { if (statSync(p).size <= MAX_BYTES) out.push(p); } catch { /* skip */ }
    }
  }
  return out;
}

// file:line, relative to the project root, so a reader can go and check.
function where(path, text, index) {
  const line = text.slice(0, index).split("\n").length;
  return `${relative(root, path).replace(/\\/g, "/")}:${line}`;
}

function scanAll(files, re, take) {
  const hits = [];
  for (const p of files) {
    let text;
    try { text = readFileSync(p, "utf8"); } catch { continue; }
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      hits.push(take(m, where(p, text, m.index)));
      if (hits.length >= 40) return hits;
    }
  }
  return hits;
}

/* ------------------------------ the signals ---------------------------- */

const FRAMEWORKS = [
  ["next", "Next.js"], ["astro", "Astro"], ["nuxt", "Nuxt"],
  ["@remix-run/react", "Remix"], ["@sveltejs/kit", "SvelteKit"], ["svelte", "Svelte"],
  ["vue", "Vue"], ["react", "React"],
];
const MOTION = [
  "framer-motion", "motion", "gsap", "lenis", "lottie-react", "lottie-web",
  "@react-spring/web", "@formkit/auto-animate", "three",
];
const FONT_PKGS = ["geist", "next/font", "@fontsource", "expo-google-fonts", "@next/font"];

function scanPreflight() {
  const pkgPath = join(root, "package.json");
  const pkgText = readIf(pkgPath);
  let pkg = null;
  if (pkgText) { try { pkg = JSON.parse(pkgText); } catch { /* unparseable is no signal */ } }
  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const depLine = (name) => {
    if (!pkgText) return null;
    const i = pkgText.indexOf(`"${name}"`);
    return i === -1 ? "package.json" : where(pkgPath, pkgText, i);
  };

  const cssFiles = collect(root, [".css", ".scss"]);
  const markupFiles = collect(root, [".html", ".htm"]).concat(
    ["app/layout.tsx", "src/app/layout.tsx", "app/layout.jsx", "src/routes/+layout.svelte"]
      .map((r) => join(root, r)).filter((p) => existsSync(p)));

  // Framework: first match wins, and the list is ordered meta-framework first so
  // a Next project does not report as React.
  let framework = null;
  for (const [dep, name] of FRAMEWORKS) {
    if (deps[dep]) { framework = { name, package: dep, version: deps[dep], evidence: depLine(dep) }; break; }
  }
  if (!framework && markupFiles.some((p) => p.endsWith(".html"))) {
    framework = { name: "vanilla HTML", package: null, version: null, evidence: relative(root, markupFiles[0]).replace(/\\/g, "/") };
  }

  const motion = MOTION.filter((m) => deps[m])
    .map((m) => ({ package: m, version: deps[m], evidence: depLine(m) }));

  const fonts = [];
  for (const p of FONT_PKGS) {
    for (const dep of Object.keys(deps)) {
      if (dep === p || dep.startsWith(p + "/")) fonts.push({ kind: "package", value: dep, evidence: depLine(dep) });
    }
  }
  fonts.push(...scanAll(markupFiles, /fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/g,
    (m, ev) => ({ kind: "google-link", value: decodeURIComponent(m[1].replace(/\+/g, " ")), evidence: ev })));
  fonts.push(...scanAll(cssFiles, /@import\s+url\(["']?https?:\/\/fonts\.googleapis\.com\/css2?\?family=([^"'&)]+)/g,
    (m, ev) => ({ kind: "google-import", value: decodeURIComponent(m[1].replace(/\+/g, " ")), evidence: ev })));
  fonts.push(...scanAll(cssFiles, /@font-face\s*\{[^}]*?font-family\s*:\s*["']?([^"';]+)/g,
    (m, ev) => ({ kind: "self-hosted", value: m[1].trim(), evidence: ev })));
  fonts.push(...scanAll(cssFiles, /--font[\w-]*\s*:\s*([^;]+);/g,
    (m, ev) => ({ kind: "token", value: m[1].trim().slice(0, 80), evidence: ev })));

  const colorProps = scanAll(cssFiles, /(--(?:color|c|clr|brand|accent|bg|fg|surface|ink)[\w-]*)\s*:/g,
    (m, ev) => ({ name: m[1], evidence: ev }));
  const spaceProps = scanAll(cssFiles, /(--(?:space|spacing|gap|size)[\w-]*)\s*:/g,
    (m, ev) => ({ name: m[1], evidence: ev }));

  const tw = ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs", "tailwind.config.cjs"]
    .map((f) => join(root, f)).find((p) => existsSync(p));
  let tailwind = null;
  if (tw) {
    const t = readIf(tw) || "";
    tailwind = {
      path: relative(root, tw).replace(/\\/g, "/"),
      extendsColors: /colors\s*:/.test(t),
      extendsSpacing: /spacing\s*:/.test(t),
      extendsFonts: /fontFamily\s*:/.test(t),
    };
  } else if (deps.tailwindcss) {
    // Tailwind v4 moves the theme into CSS, so an absent config is not an absent Tailwind.
    tailwind = { path: null, version: deps.tailwindcss, inlineTheme: cssFiles.some((p) => /@theme/.test(readIf(p) || "")) };
  }

  const notes = [];
  if (fonts.length && !pkg) notes.push("fonts found in CSS with no package.json: self-hosted or linked, check the licence before adding another");
  if (deps.tailwindcss && colorProps.length)
    notes.push("Tailwind and raw CSS custom properties both present: find out which one the project treats as the source of truth before adding tokens to either");
  if (!framework && !cssFiles.length && !markupFiles.length) notes.push("no signals found, nothing to preserve");

  return {
    framework,
    motion,
    motionStance: motion.length ? "motion-on" : "motion-cut",
    fonts: fonts.slice(0, 20),
    tokens: {
      colorProps: colorProps.length,
      spaceProps: spaceProps.length,
      sample: [...colorProps.slice(0, 6), ...spaceProps.slice(0, 4)],
    },
    tailwind,
    scanned: { cssFiles: cssFiles.length, markupFiles: markupFiles.length, capped: cssFiles.length >= MAX_FILES },
    notes,
  };
}

/* -------------------------------- output ------------------------------- */

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
  preflight: scanPreflight(),
};

process.stdout.write(JSON.stringify(out) + "\n");
