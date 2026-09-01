#!/usr/bin/env node
// score-lab.mjs — what the deterministic floor would become under another
// formula, measured on a real site rather than argued about.
//
// WHY THIS EXISTS
// ---------------
// Since v6 the rules engine runs inside the audit's pre-pass, and its 48 results
// are carried beside the floor rather than inside it (lib/rules-bridge.mjs says
// why). Folding them in needs a formula that divides, and choosing one needs
// numbers: a formula that looks reasonable can either collapse every score or
// flatten them all into a two-point band, and both defects are invisible until
// someone runs them over real pages.
//
// The fixtures under tools/inspect/fixtures cannot answer this. They are small
// targeted files with no stylesheet, so most rules cannot fire: on all 58 of
// them the rules engine reports a median of zero violations. Point this at a
// site with its CSS instead.
//
// Usage:
//   node tools/audit/score-lab.mjs <site-root> [--css path/to/main.css]
//
// It writes nothing and decides nothing.
//
// DEUX CORPUS, 2026-08-24
// -----------------------
// constant-opticien, 33 pages, un site d'opticien écrit à la main :
//
//   A. contrôles seuls (aujourd'hui)   min 78   médiane 93   max 100   étalement 22
//   B. règles à 15/7                   min 27   médiane 42   max  49   étalement 22
//   C. pénalité sur le pire possible   min 94   médiane 95   max  96   étalement  2
//   D. taux de réussite pondéré        min 93   médiane 95   max  95   étalement  2
//   E. règles à 4/2                    min 64   médiane 79   max  86   étalement 22
//
// nth-site, 6 pages, la vitrine du greffon, Next.js exporté :
//
//   A. contrôles seuls (aujourd'hui)   min 100  médiane 100  max 100   étalement  0
//   B. règles à 15/7                   min  49  médiane  64  max  64   étalement 15
//   C. pénalité sur le pire possible   min  95  médiane  97  max  97   étalement  2
//   D. taux de réussite pondéré        min  95  médiane  96  max  97   étalement  2
//   E. règles à 4/2                    min  86  médiane  90  max  90   étalement  4
//
// Le second corpus dit ce que le premier ne pouvait pas dire : le plancher
// actuel met ces six pages à 100 sur 100, sans les distinguer d'un iota, pendant
// que le moteur de règles y trouve quatre violations par page. Un score aveugle
// n'est pas un score sévère, c'est un score muet.
//
// E se comporte bien sur les deux : il garde l'étalement du plancher là où il
// existait, et il en crée là où il n'y en avait pas. C et D restent plates sur
// les deux corpus, donc elles classent des pages sans les ordonner. B punit
// deux sites corrects à 42 et 64.
//
// Le plafond de F n'a jamais mordu sur 39 pages, donc E et F sont identiques
// ici. Il reste pour la page qui déclencherait vingt règles, qu'aucun des deux
// corpus ne contient.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks } from "./lib/checks.mjs";
import { ruleChecks } from "./lib/rules-bridge.mjs";

const args = process.argv.slice(2);
const site = args.find(a => !a.startsWith("--"));
if (!site) {
  console.error("Usage: node tools/audit/score-lab.mjs <site-root> [--css file]");
  process.exit(2);
}
const cssArg = args.indexOf("--css") >= 0 ? args[args.indexOf("--css") + 1] : join(site, "css", "main.css");
const css = existsSync(cssArg) ? readFileSync(cssArg, "utf8") : "";

const SKIP = new Set(["admin", "node_modules", ".git", "content", "img", "images", "photos",
  "fonts", "css", "js", "netlify", "components", "tests", "dist"]);
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.html?$/i.test(name)) pages.push(p);
  }
})(site);

const scored = (cs) => cs.filter(c => c.verdict !== "NOT_MEASURED" && c.verdict !== "ADVISORY");
const counts = (cs) => {
  const s = scored(cs);
  return { n: s.length,
    f: s.filter(c => c.verdict === "FAIL").length,
    w: s.filter(c => c.verdict === "WARN").length,
    p: s.filter(c => c.verdict === "PASS").length };
};

// A : ce que fait le plancher aujourd'hui, sur les contrôles seuls.
const subtraction = (cs) => { const { f, w } = counts(cs); return Math.max(0, 100 - 15 * f - 7 * w); };
// C : la pénalité rapportée au pire possible, chaque contrôle valant quinze.
const ratio = (cs) => { const { n, f, w } = counts(cs); return n ? Math.round(100 * (1 - (15 * f + 7 * w) / (15 * n))) : null; };
// D : un taux de réussite pondéré, l'avertissement valant une demi-réussite.
const rate = (cs) => { const { n, w, p } = counts(cs); return n ? Math.round(100 * (p + 0.5 * w) / n) : null; };

// E et F : garder la soustraction, changer le poids plutôt que le diviseur.
//
// CE QUE LES NOMBRES DISENT
// -------------------------
// Sur ces pages, cinq règles en violation suffisent à faire tomber B de 93 à 42.
// Ce n'est donc pas le nombre de règles qui pose problème, c'est leur prix :
// une règle du moteur coûte aujourd'hui le même quinze points qu'un contrôle
// choisi à la main. Or les dix-huit contrôles sont curés et gros, les
// quarante-huit règles sont fines et nombreuses. Leur donner un prix plus bas
// garde le mordant du plancher là où il vient, sans diviser par un dénominateur
// que les réussites gonflent.
//
// Le plafond de F répond à la seule objection sérieuse contre E : une page qui
// déclenche vingt règles ne doit pas tomber à zéro sur des constats fins.
const RULE_FAIL = 4, RULE_WARN = 2, RULE_CAP = 30;
const weighted = (base, rules, cap) => {
  const b = counts(base), r = counts(rules);
  const rulePenalty = RULE_FAIL * r.f + RULE_WARN * r.w;
  return Math.max(0, 100 - 15 * b.f - 7 * b.w - (cap ? Math.min(RULE_CAP, rulePenalty) : rulePenalty));
};

const A = [], B = [], C = [], D = [], E = [], F = [], firing = [];
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const base = runChecks({ rawHtml: html, css, js: "" });
  const rules = ruleChecks({ html, css, js: "" });
  const all = base.concat(rules);
  A.push(subtraction(base));
  B.push(subtraction(all));
  C.push(ratio(all));
  D.push(rate(all));
  E.push(weighted(base, rules, false));
  F.push(weighted(base, rules, true));
  firing.push(rules.filter(c => c.verdict === "FAIL" || c.verdict === "WARN").length);
}

const q = (a, k) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) * k)]; };
const line = (name, a) => `${name.padEnd(48)} min ${String(q(a, 0)).padStart(3)}   median ${String(q(a, .5)).padStart(3)}   max ${String(q(a, 1)).padStart(3)}`;

console.log(`${pages.length} page(s), ${css.length} bytes of CSS\n`);
console.log(line("A. subtraction, checks only (today)", A));
console.log(line("B. subtraction, rules folded in", B));
console.log(line("C. penalty over the worst possible", C));
console.log(line("D. weighted pass rate", D));
console.log(line(`E. subtraction, rules at ${RULE_FAIL}/${RULE_WARN}`, E));
console.log(line(`F. same, rules capped at ${RULE_CAP}`, F));
console.log(`\nB puts ${B.filter(x => x === 0).length} of ${pages.length} page(s) at zero.`);
console.log(`E puts ${E.filter(x => x === 0).length}, F puts ${F.filter(x => x === 0).length}.`);
// L'étalement est ce qui distingue une note d'une constante. Une formule dont
// toutes les pages tiennent dans deux points ne classe rien.
const spread = (a) => q(a, 1) - q(a, 0);
console.log(`Spread: A ${spread(A)}, B ${spread(B)}, C ${spread(C)}, D ${spread(D)}, E ${spread(E)}, F ${spread(F)}.`);
console.log(`Rules in violation per page: median ${q(firing, .5)}, max ${q(firing, 1)}.`);
