#!/usr/bin/env node
// build-figures.mjs — draws the README's figures, in both themes: the
// comparison matrix from tools/data/compare-matrix.csv, the banner from the
// skills present on disk, and the editor schematic.
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

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CSV = join(ROOT, "null-to-hero", "tools", "data", "compare-matrix.csv");
const SKILLS_DIR = join(ROOT, "null-to-hero", "skills");
const OUT = (name) => join(ROOT, "docs", name);

const FONT = "Segoe UI, system-ui, -apple-system, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const THEMES = {
  light: { key: "light", compare: "compare-light.svg", banner: "banner.svg", editor: "editor-light.svg",
           ground: "#f8fafc", card: "#ffffff", hairline: "#e6e8ec",
           ink: "#0f172a", muted: "#64748b", faint: "#9da7b3", accent: "#4f46e5", partial: "#b45309",
           band: "rgba(79,70,229,0.06)", stripe: "rgba(15,23,42,0.025)",
           inset: "#f1f5f9", shade: "rgba(15,23,42,0.06)" },
  dark:  { key: "dark", compare: "compare-dark.svg", banner: "banner-dark.svg", editor: "editor-dark.svg",
           ground: "#0d1117", card: "#161b22", hairline: "#30363d",
           ink: "#e6edf3", muted: "#8b949e", faint: "#6b7684", accent: "#818cf8", partial: "#fbbf24",
           band: "rgba(129,140,248,0.10)", stripe: "rgba(230,237,243,0.03)",
           inset: "#0d1117", shade: "rgba(230,237,243,0.07)" },
};

// LES COULEURS DES QUATRE COMPÉTENCES
// -----------------------------------
// Les mêmes que les pastilles du readme et que `docs/overview.svg`. En sombre,
// chaque teinte est éclaircie plutôt que remplacée : une compétence garde son
// identité d'un thème à l'autre.
const SKILL_COLOURS = {
  siteasy: { light: "#4f46e5", dark: "#818cf8" },
  seo:     { light: "#0ea5e9", dark: "#38bdf8" },
  audit:   { light: "#7c3aed", dark: "#a78bfa" },
  cms:     { light: "#16a34a", dark: "#4ade80" },
};
const SKILL_ORDER = ["siteasy", "seo", "audit", "cms"];

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

/* ── the banner ───────────────────────────────────────────────────────────── */

// POURQUOI LA BANNIÈRE LIT LE DOSSIER DES COMPÉTENCES
// ---------------------------------------------------
// La bannière écrite à la main annonçait encore `inspect`, une compétence
// supprimée par la refonte v6, et ne connaissait pas `cms`. Une image ne se
// relit pas comme du texte : personne ne l'avait vue. Elle lit maintenant
// `skills/`, donc elle ne peut plus nommer une compétence qui n'existe pas, ni
// en oublier une qui existe.
export function skillNames(dir = SKILLS_DIR) {
  const found = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name);
  const known = SKILL_ORDER.filter((name) => found.includes(name));
  const strangers = found.filter((name) => !SKILL_ORDER.includes(name));
  if (strangers.length) {
    throw new Error(`skills/ holds ${strangers.join(", ")}, which build-figures.mjs has no colour for`);
  }
  if (known.length !== found.length) throw new Error("a skill disappeared between two readings");
  return known;
}

export function drawBanner(skills, t) {
  const W = 1200, H = 300, colour = (name) => SKILL_COLOURS[name][t.key];
  const chipW = 168, chipH = 46, gap = 22;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="NullToHero: the skills ${skills.join(", ")} for Claude">`);
  out.push(`<rect width="${W}" height="${H}" fill="${t.ground}"/>`);
  // Le filet du haut porte les quatre teintes dans l'ordre du parcours, ce qui
  // dit la progression sans une flèche ni un mot.
  skills.forEach((name, i) => {
    const w = W / skills.length;
    out.push(`<rect x="${i * w}" y="0" width="${w}" height="3" fill="${colour(name)}"/>`);
  });
  out.push(text(72, 116, "NullToHero", { size: 62, weight: 700, fill: t.ink }));
  out.push(text(76, 152, "Design, SEO, quality audit and handover skills for Claude.", { size: 19, fill: t.muted }));

  skills.forEach((name, i) => {
    const x = 72 + i * (chipW + gap);
    const c = colour(name);
    out.push(`<rect x="${x}" y="196" width="${chipW}" height="${chipH}" rx="${chipH / 2}" fill="${t.card}" stroke="${c}" stroke-opacity="0.55" stroke-width="1.4"/>`);
    out.push(`<circle cx="${x + 26}" cy="${196 + chipH / 2}" r="5" fill="${c}"/>`);
    out.push(text(x + 42, 196 + chipH / 2 + 5, `/${name}`, { size: 16, weight: 600, fill: t.ink }));
  });

  // Trois pages empilées, de la feuille blanche au site fini, dans le même
  // langage de traits que le reste des figures.
  [0, 1, 2].forEach((i) => {
    const x = 902 + i * 34, y = 74 + i * 8, w = 176, h = 152;
    const filled = i === 2;
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${t.card}" stroke="${t.hairline}" stroke-width="1.4"/>`);
    if (!filled) return;
    out.push(`<rect x="${x + 18}" y="${y + 20}" width="72" height="6" rx="3" fill="${colour(skills[0] || "siteasy")}"/>`);
    [0, 1, 2, 3].forEach((k) =>
      out.push(`<rect x="${x + 18}" y="${y + 40 + k * 16}" width="${k === 3 ? 92 : 140}" height="4" rx="2" fill="${t.shade}"/>`));
    out.push(`<rect x="${x + 18}" y="${y + 116}" width="66" height="18" rx="9" fill="${colour(skills[skills.length - 1] || "cms")}" fill-opacity="0.18"/>`);
  });
  out.push("</svg>");
  return out.join("\n") + "\n";
}

/* ── the editor ───────────────────────────────────────────────────────────── */

// CE QUE LE README NE POUVAIT PAS MONTRER
// ---------------------------------------
// La section `/cms` décrivait un éditeur que rien n'illustrait. Une capture
// serait datée le jour où l'interface bouge et porterait le contenu d'un vrai
// client ; un schéma dit ce qui compte, à savoir où passe la frontière entre ce
// que le propriétaire atteint et ce qu'il n'atteint pas.
export function drawEditor(t) {
  const W = 1044, H = 470, PAD = 26;
  const out = [];
  const rect = (x, y, w, h, r, fill, stroke) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"`
    + (stroke ? ` stroke="${stroke}" stroke-width="1"` : "") + "/>";
  const bar = (x, y, w, h = 5) => rect(x, y, w, h, h / 2, t.shade);

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="The editor an entrusted site's owner sees: a collection list, a field panel with a character counter, a live preview of the real page in a phone frame, and the remaining write quota">`);
  out.push(rect(0.5, 0.5, W - 1, H - 1, 14, t.ground, t.hairline));
  out.push(text(PAD, 46, "What the owner gets", { size: 18, weight: 700, fill: t.ink }));
  out.push(text(W - PAD, 46, "vendored editor · server-side allow-list · write quota", { size: 11, fill: t.muted, anchor: "end" }));

  // La fenêtre du navigateur, avec l'adresse : /admin/ est sur le site du
  // client, pas sur un service tiers.
  const winX = PAD, winY = 66, winW = W - PAD * 2, winH = 336;
  out.push(rect(winX, winY, winW, winH, 10, t.card, t.hairline));
  out.push(rect(winX, winY, winW, 34, 10, t.inset, t.hairline));
  [0, 1, 2].forEach((i) => out.push(`<circle cx="${winX + 20 + i * 16}" cy="${winY + 17}" r="4.5" fill="${t.faint}" fill-opacity="0.6"/>`));
  out.push(rect(winX + 78, winY + 8, 250, 18, 9, t.card, t.hairline));
  out.push(`<text x="${winX + 90}" y="${winY + 21}" font-family="${MONO}" font-size="10.5" fill="${t.muted}">example.com/admin/</text>`);

  // Colonne des collections.
  const sideX = winX + 1, sideY = winY + 34, sideW = 196, sideH = winH - 35;
  out.push(rect(sideX, sideY, sideW, sideH, 0, t.inset));
  out.push(text(sideX + 18, sideY + 30, "Content", { size: 12, weight: 700, fill: t.ink }));
  ["Home", "Opening hours", "Services", "Photos"].forEach((name, i) => {
    const y = sideY + 54 + i * 34;
    if (i === 1) out.push(rect(sideX + 10, y - 16, sideW - 20, 28, 6, t.band));
    out.push(text(sideX + 22, y + 3, name, { size: 12, fill: i === 1 ? t.accent : t.muted }));
  });
  out.push(text(sideX + 22, sideY + sideH - 100, "Templates, scripts", { size: 10.5, fill: t.faint }));
  out.push(text(sideX + 22, sideY + sideH - 86, "and styles are absent", { size: 10.5, fill: t.faint }));
  out.push(text(sideX + 22, sideY + sideH - 72, "from this list.", { size: 10.5, fill: t.faint }));

  // L'aperçu occupe le bord droit de la fenêtre, et le panneau des champs
  // prend tout ce qui reste : une figure qui laisse un quart de sa surface vide
  // se lit comme une figure inachevée.
  const pw = 150, ph = 250;
  const px = winX + winW - pw - 48, py = sideY + 22;
  const fx = sideX + sideW + 26, fy = sideY + 22, fw = px - fx - 46;
  out.push(text(fx, fy + 8, "Opening hours", { size: 14, weight: 700, fill: t.ink }));
  [["Title", "Our hours", false], ["Weekdays", "9am to 7pm", false], ["Sunday", "Closed", true]]
    .forEach(([label, value, last], i) => {
      const y = fy + 36 + i * 62;
      out.push(text(fx, y, label, { size: 10.5, weight: 600, fill: t.muted }));
      out.push(rect(fx, y + 8, fw, 32, 6, t.card, last ? t.accent : t.hairline));
      out.push(text(fx + 12, y + 29, value, { size: 12, fill: t.ink }));
      if (last) out.push(text(fx + fw, y + 54, "7 characters (advised 20 to 60)", { size: 10, fill: t.partial, anchor: "end" }));
    });
  out.push(rect(fx, fy + 232, 92, 30, 6, t.accent, null));
  out.push(text(fx + 46, fy + 251, "Save", { size: 12, weight: 600, fill: t.card, anchor: "middle" }));
  out.push(rect(fx + 104, fy + 232, 118, 30, 6, t.card, t.hairline));
  out.push(text(fx + 163, fy + 251, "Previous version", { size: 11, fill: t.muted, anchor: "middle" }));

  // L'aperçu : la vraie page, dans un appareil, à l'échelle.
  out.push(rect(px, py, pw, ph, 20, t.ink, null));
  out.push(rect(px + 5, py + 5, pw - 10, ph - 10, 16, t.card, null));
  out.push(rect(px + 5, py + 5, pw - 10, 26, 16, t.inset, null));
  out.push(bar(px + 20, py + 44, 74, 7));
  out.push(rect(px + 20, py + 62, pw - 50, 44, 4, t.band, null));
  out.push(text(px + 26, py + 80, "Our hours", { size: 9.5, weight: 700, fill: t.accent }));
  out.push(text(px + 26, py + 96, "9am to 7pm", { size: 9, fill: t.muted }));
  [0, 1, 2, 3, 4].forEach((k) => out.push(bar(px + 20, py + 124 + k * 16, k === 4 ? 62 : 106, 4)));
  out.push(rect(px + 20, py + 206, 66, 20, 10, t.shade, null));
  out.push(text(px + pw / 2, py + ph + 24, "the real page, at 390px", { size: 10, fill: t.faint, anchor: "middle" }));

  // Le compteur du quota, en bas à gauche de la fenêtre comme dans l'éditeur.
  out.push(rect(sideX + 14, winY + winH - 50, 168, 28, 14, t.card, t.hairline));
  out.push(`<circle cx="${sideX + 32}" cy="${winY + winH - 36}" r="4" fill="${t.partial}"/>`);
  out.push(text(sideX + 44, winY + winH - 32, "3 changes left this hour", { size: 10.5, fill: t.muted }));

  const legendY = H - 30;
  out.push(text(PAD, legendY, "The bridge refuses any path outside the compiled allow-list, whatever the interface offers.", { size: 11, fill: t.muted }));
  out.push(text(W - PAD, legendY, "No token in the browser.", { size: 11, fill: t.faint, anchor: "end" }));
  out.push("</svg>");
  return out.join("\n") + "\n";
}

/* ── the run ──────────────────────────────────────────────────────────────── */

if (/build-figures\.mjs$/.test(process.argv[1] || "")) {
  const matrix = readMatrix(readFileSync(CSV, "utf8"));
  const skills = skillNames();
  const check = process.argv.includes("--check");
  let drift = 0;
  for (const t of Object.values(THEMES)) {
    const figures = [
      [t.compare, draw(matrix, t), `${matrix.length} capabilities`],
      [t.banner, drawBanner(skills, t), `${skills.length} skills`],
      [t.editor, drawEditor(t), "schematic"],
    ];
    for (const [file, svg, note] of figures) {
      const path = OUT(file);
      let current = null;
      try { current = readFileSync(path, "utf8"); } catch { /* absent */ }
      if (check) {
        if (current !== svg) { console.error(`docs/${file} is out of date. Run: node tools/build-figures.mjs`); drift++; }
        else console.log(`docs/${file} matches its source`);
      } else {
        writeFileSync(path, svg);
        console.log(`wrote docs/${file} (${note})`);
      }
    }
  }
  if (drift) process.exitCode = 1;
}
