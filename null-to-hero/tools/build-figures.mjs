#!/usr/bin/env node
// build-figures.mjs — draws the README's comparison matrix, in both themes,
// from tools/data/compare-matrix.csv.
//
// WHY A GENERATOR AND NOT TWO HAND-BUILT FILES
// --------------------------------------------
// The matrix existed as two 16 kB SVGs written by hand, one per theme. Adding a
// capability meant editing both, moving every row below it, growing two cards
// and two viewBoxes, and hoping the light and the dark copy stayed in step. They
// had also drifted into a third visual language: a cream and teal palette that
// matched neither the skill badges nor `docs/overview.svg`.
//
// So the figure follows the rule the rest of this repository already follows:
// the data lives in a CSV, the drawing is derived, and `--check` fails the build
// when the committed SVG no longer matches its source.
//
// THE PALETTE IS NOT A CHOICE MADE HERE
// -------------------------------------
// It is the one `docs/overview.svg` and the README badges already use: slate ink,
// hairline borders, white cards on a light ground, and indigo for NullToHero's
// own column, the same indigo as the siteasy badge. Amber marks a partial, and it
// is the amber already present in the overview. Nothing new is invented.
//
// Usage:
//   node tools/build-figures.mjs [--check]

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CSV = join(ROOT, "null-to-hero", "tools", "data", "compare-matrix.csv");
const OUT = (name) => join(ROOT, "docs", name);

const FONT = "Segoe UI, system-ui, -apple-system, Helvetica, Arial, sans-serif";

const THEMES = {
  light: { file: "compare-light.svg", ground: "#f8fafc", card: "#ffffff", hairline: "#e6e8ec",
           ink: "#0f172a", muted: "#64748b", faint: "#9da7b3", accent: "#4f46e5", partial: "#b45309",
           band: "rgba(79,70,229,0.06)", stripe: "rgba(15,23,42,0.025)" },
  dark:  { file: "compare-dark.svg",  ground: "#0d1117", card: "#161b22", hairline: "#30363d",
           ink: "#e6edf3", muted: "#8b949e", faint: "#6b7684", accent: "#818cf8", partial: "#fbbf24",
           band: "rgba(129,140,248,0.10)", stripe: "rgba(230,237,243,0.03)" },
};

// The columns the matrix compares, and the products each one stands for.
const COLUMNS = [
  { key: "nulltohero",    title: "NullToHero",       under: [] },
  { key: "builders",      title: "AI site builders", under: ["v0", "Lovable", "Bolt"] },
  { key: "audit-tools",   title: "Audit tools",      under: ["Lighthouse", "axe"] },
  { key: "seo-suites",    title: "SEO suites",       under: ["Semrush", "Ahrefs"] },
  { key: "design-skills", title: "Design skills",    under: ["ui-ux-pro-max", "ux-ui-mastery", "Taste"] },
];

/* ── the data ─────────────────────────────────────────────────────────────── */

export function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function readMatrix(text) {
  const rows = parseCsv(text.trim());
  const head = rows[0];
  for (const col of COLUMNS) {
    if (!head.includes(col.key)) throw new Error(`compare-matrix.csv has no column ${col.key}`);
  }
  return rows.slice(1).map((r) => {
    const o = Object.fromEntries(head.map((h, i) => [h, r[i]]));
    for (const col of COLUMNS) {
      if (!["yes", "partial", "no"].includes(o[col.key])) {
        throw new Error(`${o.capability}: ${col.key} is "${o[col.key]}", expected yes, partial or no`);
      }
    }
    return o;
  });
}

/* ── the drawing ──────────────────────────────────────────────────────────── */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (x, y, s, { size = 13, weight = 400, fill, anchor = "start" }) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"`
  + (weight !== 400 ? ` font-weight="${weight}"` : "")
  + ` fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${esc(s)}</text>`;

// A tick, a half disc, a dash. Three marks that stay apart without colour, so
// the figure survives a greyscale print and a colour-blind reader.
function mark(kind, cx, cy, t) {
  if (kind === "yes") {
    return `<circle cx="${cx}" cy="${cy}" r="9" fill="${t.accent}" fill-opacity="0.14" stroke="${t.accent}" stroke-width="1.4"/>`
      + `<path d="M ${cx - 4.2} ${cy + 0.4} l 3 3.2 l 5.4 -6.4" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (kind === "partial") {
    return `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="${t.partial}" stroke-width="1.4" stroke-opacity="0.85"/>`
      + `<path d="M ${cx} ${cy - 8} a 8 8 0 0 1 0 16 z" fill="${t.partial}" fill-opacity="0.75"/>`;
  }
  return `<rect x="${cx - 5.5}" y="${cy - 1}" width="11" height="2" rx="1" fill="${t.faint}"/>`;
}

export function draw(matrix, t) {
  // La hauteur d'en-tete suit la colonne qui porte le plus de noms : trois pour
  // les generateurs, et un titre qui ne doit pas toucher la premiere ligne.
  const W = 1044, PAD = 26, LABEL_W = 372, COL_W = 124, ROW_H = 35;
  const deepest = Math.max(...COLUMNS.map((c) => c.under.length));
  const HEAD_H = 46 + deepest * 11 + 16;
  const cardX = PAD, cardY = 72, cardW = W - PAD * 2;
  const cardH = HEAD_H + (matrix.length - 1) * ROW_H + 26;
  const H = cardY + cardH + 58;
  const colX = (i) => cardX + LABEL_W + i * COL_W + COL_W / 2;

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="NullToHero comparison matrix: ${matrix.length} capabilities across ${COLUMNS.length} tool families, NullToHero being the only column that carries every one">`);
  out.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.ground}" stroke="${t.hairline}" stroke-width="1"/>`);
  out.push(text(PAD, 48, "How NullToHero compares", { size: 18, weight: 700, fill: t.ink }));
  out.push(text(W - PAD, 48, `${matrix.length} capabilities · ${COLUMNS.length} tool families`, { size: 11, fill: t.muted, anchor: "end" }));

  out.push(`<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="10" fill="${t.card}" stroke="${t.hairline}" stroke-width="1"/>`);
  // La colonne du greffon est celle que la figure defend : elle porte un fond.
  out.push(`<rect x="${cardX + LABEL_W}" y="${cardY}" width="${COL_W}" height="${cardH}" rx="8" fill="${t.band}" stroke="${t.accent}" stroke-opacity="0.45" stroke-width="1.2"/>`);

  COLUMNS.forEach((col, i) => {
    const x = colX(i);
    out.push(text(x, cardY + 26, col.title, { size: i ? 12.5 : 14, weight: 700, fill: i ? t.ink : t.accent, anchor: "middle" }));
    col.under.forEach((name, k) => out.push(text(x, cardY + 41 + k * 11, name, { size: 9, fill: t.muted, anchor: "middle" })));
  });

  matrix.forEach((row, r) => {
    const y = cardY + HEAD_H + r * ROW_H;
    if (r % 2) out.push(`<rect x="${cardX + 1}" y="${y - 22}" width="${cardW - 2}" height="${ROW_H}" fill="${t.stripe}"/>`);
    out.push(text(cardX + 16, y, row.capability, { size: 13, fill: t.ink }));
    COLUMNS.forEach((col, i) => out.push(mark(row[col.key], colX(i), y - 4.5, t)));
  });

  const legendY = H - 32;
  out.push(text(PAD, legendY, "Tick: yes.  Half disc: partial.  Dash: no.", { size: 11, fill: t.muted }));
  out.push(text(W - PAD, legendY,
    "Lighthouse scores performance, not design. Semrush's Site Health is proprietary and not CI-native.",
    { size: 11, fill: t.faint, anchor: "end" }));
  out.push("</svg>");
  return out.join("\n") + "\n";
}

/* ── the run ──────────────────────────────────────────────────────────────── */

if (/build-figures\.mjs$/.test(process.argv[1] || "")) {
  const matrix = readMatrix(readFileSync(CSV, "utf8"));
  const check = process.argv.includes("--check");
  let drift = 0;
  for (const t of Object.values(THEMES)) {
    const svg = draw(matrix, t);
    const path = OUT(t.file);
    let current = null;
    try { current = readFileSync(path, "utf8"); } catch { /* absent */ }
    if (check) {
      if (current !== svg) { console.error(`docs/${t.file} is out of date. Run: node tools/build-figures.mjs`); drift++; }
      else console.log(`docs/${t.file} matches compare-matrix.csv`);
    } else {
      writeFileSync(path, svg);
      console.log(`wrote docs/${t.file} (${matrix.length} capabilities)`);
    }
  }
  if (drift) process.exitCode = 1;
}
