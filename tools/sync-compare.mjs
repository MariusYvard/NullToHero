#!/usr/bin/env node
// Renders docs/compare.svg from the comparison table in README.md (the text
// version inside the details block is the source of truth). Deterministic
// output, self-contained SVG (system fonts, no scripts, no external refs), so
// it renders identically in GitHub's sanitized <img> context on light and dark.
// Run after editing the table: node tools/sync-compare.mjs && commit both files.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(join(root, "README.md"), "utf8");

const lines = readme.split("\n").filter(l => l.startsWith("|"));
const headerLine = lines.find(l => l.startsWith("| Capability |"));
if (!headerLine) { console.error("comparison table not found"); process.exit(1); }
const start = readme.split("\n").indexOf(headerLine);
const all = readme.split("\n");
const rows = [];
let headers = [];
for (let i = start; i < all.length; i++) {
  const l = all[i];
  if (!l.startsWith("|")) break;
  const cells = l.split("|").slice(1, -1).map(c => c.trim());
  if (i === start) headers = cells;
  else if (!/^[-:| ]+$/.test(l)) rows.push(cells);
}

const cols = headers.slice(1).map(h => {
  const name = h.replace(/\*\*/g, "").replace(/<br>.*$/, "").trim();
  const m = h.match(/<sub>(.*?)<\/sub>/);
  return { name, sub: m ? m[1].replace(/&amp;/g, "&") : "" };
});

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// layout
const PAD = 26, CAP_W = 372, COL_W = 124, ROW_H = 35, HDR_H = 64, TITLE_H = 46, LEG_H = 40;
const W = PAD * 2 + CAP_W + COL_W * cols.length;
const H = PAD * 2 + TITLE_H + HDR_H + ROW_H * rows.length + LEG_H;
const tableX = PAD, tableY = PAD + TITLE_H;
const FONT = `-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

// palette (marine / sarcelle / crème / camel)
const BG = "#0F1E33", PANEL = "#13263F", INK = "#F4EFE6", MUTED = "#8FA1B8",
      TEAL = "#2FBFA7", AMBER = "#E4B363", DIM = "#54677F", STRIPE = "rgba(244,239,230,0.03)",
      NTH_BG = "rgba(47,191,167,0.10)", NTH_EDGE = "rgba(47,191,167,0.55)";

function symbol(v, cx, cy) {
  if (v.includes("✅")) return `<circle cx="${cx}" cy="${cy}" r="9" fill="${TEAL}" fill-opacity="0.16" stroke="${TEAL}" stroke-width="1.4"/>
<path d="M ${cx - 4.2} ${cy + 0.4} l 3 3.2 l 5.4 -6.4" fill="none" stroke="${TEAL}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (v.includes("🟡")) return `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="${AMBER}" stroke-width="1.4" stroke-opacity="0.85"/>
<path d="M ${cx} ${cy - 8} a 8 8 0 0 1 0 16 z" fill="${AMBER}" fill-opacity="0.75"/>`;
  return `<rect x="${cx - 5.5}" y="${cy - 1}" width="11" height="2" rx="1" fill="${DIM}"/>`;
}

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="NullToHero comparison matrix">
<rect width="${W}" height="${H}" rx="14" fill="${BG}"/>
<text x="${PAD}" y="${PAD + 22}" font-family="${FONT}" font-size="18" font-weight="700" fill="${INK}">How NullToHero compares</text>
<text x="${W - PAD}" y="${PAD + 22}" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="end">12 capabilities · 5 tool families</text>
<rect x="${tableX}" y="${tableY}" width="${W - PAD * 2}" height="${HDR_H + ROW_H * rows.length}" rx="10" fill="${PANEL}"/>`;

// NullToHero column highlight
const nthX = tableX + CAP_W;
svg += `<rect x="${nthX}" y="${tableY}" width="${COL_W}" height="${HDR_H + ROW_H * rows.length}" fill="${NTH_BG}" stroke="${NTH_EDGE}" stroke-width="1.2" rx="8"/>`;

// headers
cols.forEach((c, i) => {
  const cx = tableX + CAP_W + COL_W * i + COL_W / 2;
  const main = i === 0;
  svg += `<text x="${cx}" y="${tableY + 26}" font-family="${FONT}" font-size="${main ? 14 : 12.5}" font-weight="700" fill="${main ? TEAL : INK}" text-anchor="middle">${esc(c.name)}</text>`;
  if (c.sub) {
    const parts = c.sub.split("·").map(x => x.trim());
    parts.forEach((p2, j) => {
      svg += `<text x="${cx}" y="${tableY + 40 + j * 11}" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">${esc(p2)}</text>`;
    });
  }
});

// rows
rows.forEach((r, ri) => {
  const y = tableY + HDR_H + ROW_H * ri;
  if (ri % 2 === 0) svg += `<rect x="${tableX}" y="${y}" width="${W - PAD * 2}" height="${ROW_H}" fill="${STRIPE}"/>`;
  svg += `<text x="${tableX + 16}" y="${y + ROW_H / 2 + 4.5}" font-family="${FONT}" font-size="13" fill="${INK}">${esc(r[0])}</text>`;
  r.slice(1).forEach((v, ci) => {
    svg += symbol(v, tableX + CAP_W + COL_W * ci + COL_W / 2, y + ROW_H / 2);
  });
});

// legend
const ly = tableY + HDR_H + ROW_H * rows.length + 24;
svg += symbol("✅", tableX + 8, ly) + `<text x="${tableX + 24}" y="${ly + 4}" font-family="${FONT}" font-size="11.5" fill="${MUTED}">yes</text>`;
svg += symbol("🟡", tableX + 70, ly) + `<text x="${tableX + 86}" y="${ly + 4}" font-family="${FONT}" font-size="11.5" fill="${MUTED}">partial</text>`;
svg += symbol("—", tableX + 152, ly) + `<text x="${tableX + 168}" y="${ly + 4}" font-family="${FONT}" font-size="11.5" fill="${MUTED}">no</text>`;
svg += `<text x="${W - PAD}" y="${ly + 4}" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="end">Apache-2.0 · runs inside Claude · github.com/MariusYvard/NullToHero</text>`;
svg += `</svg>\n`;

writeFileSync(join(root, "docs", "compare.svg"), svg);
console.log(`docs/compare.svg: ${cols.length} columns, ${rows.length} rows, ${W}x${H}`);
