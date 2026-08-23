// content-carve.mjs : ce qu'il nomme, ce qu'il remplace, ce qu'il refuse.
import { test } from "node:test";
import assert from "node:assert/strict";

import { namespaceFor, body, tokenise, nest, carveInPage } from "../null-to-hero/tools/siteasy/cms/content-carve.mjs";

test("le chemin d'une page donne l'espace de noms de son entrée", () => {
  assert.equal(namespaceFor("index.html"), "accueil");
  assert.equal(namespaceFor("a-propos.html"), "a_propos");
  assert.equal(namespaceFor("services/index.html"), "services");
  assert.equal(namespaceFor("createurs/nathalie-blanc/index.html"), "createurs_nathalie_blanc");
});

test("un motif tolère un retour à la ligne là où le navigateur a vu une espace", () => {
  assert.ok(new RegExp(body("deux mots")).test("deux\n     mots"));
});

test("un motif tolère une entité là où le navigateur a vu le caractère", () => {
  assert.ok(new RegExp(body("Cutler & Gross")).test("Cutler &amp; Gross"));
  assert.ok(new RegExp(body("« citation »")).test("&laquo; citation &raquo;"));
});

test("une lettre reste littérale, sans quoi le motif dériverait", () => {
  assert.ok(!new RegExp(body("Lindberg")).test("Lindb&eacute;rg"));
});

const FIELDS = [
  { box: "hero", name: "titre", kind: "text", value: "Osez" },
  { box: "hero", name: "texte", kind: "text", value: "Verres & montures" },
  { box: "hero", name: "image_alt", kind: "attribute", attribute: "alt", value: "Une paire" },
];

test("les jetons remplacent les valeurs, une seule fois chacune", () => {
  const src = `<h1>Osez</h1><p>Verres &amp; montures</p><img alt="Une paire">`;
  const out = tokenise(src, FIELDS, "accueil");
  assert.equal(out.html,
    `<h1>{{accueil.hero.titre}}</h1><p>{{accueil.hero.texte}}</p><img alt="{{accueil.hero.image_alt}}">`);
  assert.ok(out.fields.every((f) => f.placed));
});

test("deux passages identiques reçoivent chacun le leur, dans l'ordre", () => {
  const two = [
    { box: "a", name: "texte", kind: "text", value: "Bonjour" },
    { box: "b", name: "texte", kind: "text", value: "Bonjour" },
  ];
  const out = tokenise("<p>Bonjour</p><p>Bonjour</p>", two, "page");
  assert.equal(out.html, "<p>{{page.a.texte}}</p><p>{{page.b.texte}}</p>");
});

test("une valeur introuvable est signalée et le fichier n'est pas abîmé", () => {
  const out = tokenise("<h1>Osez</h1>", [{ box: "h", name: "titre", kind: "text", value: "Absent" }], "p");
  assert.equal(out.html, "<h1>Osez</h1>");
  assert.equal(out.fields[0].placed, false);
});

test("le curseur n'écrase pas ce qui précède quand une valeur manque", () => {
  const mixed = [
    { box: "a", name: "titre", kind: "text", value: "Absent" },
    { box: "a", name: "texte", kind: "text", value: "Osez" },
  ];
  assert.equal(tokenise("<h1>Osez</h1>", mixed, "p").html, "<h1>{{p.a.texte}}</h1>");
});

test("seules les valeurs posées entrent dans le fichier de contenu", () => {
  const out = tokenise("<h1>Osez</h1>", [
    { box: "h", name: "titre", kind: "text", value: "Osez" },
    { box: "h", name: "autre", kind: "text", value: "Absent" },
  ], "p");
  assert.deepEqual(nest(out.fields), { h: { titre: "Osez" } });
});

/* ── ce qui a besoin d'un vrai DOM ────────────────────────────────────────── */

const PAGE = `<!doctype html><html><body>
<nav><ul><li><a href="/">Accueil</a></li></ul></nav>
<main>
<section id="hero"><h1>Osez</h1><p>Un texte.</p>
<p>Un passage <strong>figé</strong>.</p>
<img src="/a.webp" alt="Une paire"></section>
<section id="atelier"><h2>L'atelier</h2><p>Premier.</p><p>Second.</p>
<nav><ul><li><a href="#x">Repère</a></li></ul></nav></section>
</main>
<footer><p>78 avenue de Wagram</p></footer></body></html>`;

let chromium = null;
try { ({ chromium } = await import("playwright")); } catch { /* signalé plus bas */ }

test("l'extraction nomme, groupe et refuse", { skip: chromium ? false : "playwright absent" }, async () => {
  const browser = await chromium.launch(
    process.env.NTH_CHROMIUM ? { executablePath: process.env.NTH_CHROMIUM } : {});
  try {
    const page = await browser.newPage();
    await page.setContent(PAGE);
    const { fields } = await page.evaluate(carveInPage);
    const seen = fields.map((f) => `${f.box}.${f.name}=${f.value}`);

    assert.ok(seen.includes("hero.titre=Osez"), "le titre de section n'est pas un champ");
    assert.ok(seen.includes("hero.texte=Un texte."));
    assert.ok(seen.includes("hero.image=/a.webp"));
    assert.ok(seen.includes("hero.image_alt=Une paire"));
    assert.ok(seen.includes("atelier.texte=Premier."), "le second bloc a sa propre boîte");
    assert.ok(seen.includes("atelier.texte_2=Second."), "deux champs de même nature sont numérotés");

    assert.ok(!seen.some((s) => s.includes("figé")), "un passage porteur de balisage est devenu un champ");
    assert.ok(!seen.some((s) => s.includes("Accueil")), "la navigation a été extraite");
    assert.ok(!seen.some((s) => s.includes("Repère")), "un repère dans main a été extrait");
    assert.ok(!seen.some((s) => s.includes("Wagram")), "le pied de page a été extrait");
  } finally { await browser.close(); }
});
