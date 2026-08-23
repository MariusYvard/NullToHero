// content-fill.mjs : ce que l'aperçu garde, ce qu'il résout, ce qu'il signale.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  namespaceOf, pageNamespace, markFixed, previewOf, fillTokens, valueAt, run,
} from "../null-to-hero/tools/siteasy/cms/content-fill.mjs";

const BAG = {
  accueil: { hero: { titre: "Osez", texte: "Verres & montures" } },
  boutique: { telephone: "01 40 54 03 90" },
};

const PAGE = `<!doctype html><html><body>
<nav><a href="/">{{boutique.telephone}}</a></nav>
<main>
<h1>{{accueil.hero.titre}}</h1>
<p>{{accueil.hero.texte}}</p>
<p>Un passage <strong>figé</strong> avec du balisage.</p>
<p>Un passage nu.</p>
<nav><ul><li><a href="#a">Repère <em>ici</em></a></li></ul></nav>
</main>
<footer><p>Appeler <a href="tel:x">{{boutique.telephone}}</a></p></footer>
</body></html>`;

test("le nom de fichier devient un espace de noms utilisable dans un jeton", () => {
  assert.equal(namespaceOf("a-propos.json"), "a_propos");
  assert.equal(namespaceOf("createurs/nathalie-blanc.json"), "createurs_nathalie_blanc");
});

test("la page appartient à l'entrée dont les jetons sont dans main", () => {
  assert.equal(pageNamespace(PAGE), "accueil");
});

test("un pied de page bavard ne s'approprie pas la page", () => {
  const bavard = PAGE.replace("<footer>", "<footer>{{boutique.a}}{{boutique.b}}{{boutique.c}}");
  assert.equal(pageNamespace(bavard), "accueil");
});

test("sans main, la page entière est comptée", () => {
  assert.equal(pageNamespace("<body>{{fiche.titre}}</body>"), "fiche");
});

test("l'aperçu garde les jetons de la page et résout les autres", () => {
  const out = previewOf(BAG, PAGE, "accueil").html;
  assert.ok(out.includes("{{accueil.hero.titre}}"), "le jeton de la page a disparu");
  assert.ok(!out.includes("{{boutique.telephone}}"), "le jeton du pied de page est resté");
  assert.ok(out.includes("01 40 54 03 90"));
});

test("un passage porteur de balisage est signalé, un passage nu ne l'est pas", () => {
  const out = markFixed(PAGE);
  assert.equal(out.count, 1);
  assert.ok(out.html.includes('<p data-nth-fixed>Un passage <strong>'));
  assert.ok(out.html.includes("<p>Un passage nu.</p>"));
});

test("un repère de navigation dans main n'est pas signalé", () => {
  assert.ok(!markFixed(PAGE).html.includes('href="#a"><em') );
  assert.ok(markFixed(PAGE).html.includes('<nav><ul><li><a href="#a">Repère <em>ici</em></a></li></ul></nav>'));
});

test("hors de main, rien n'est signalé", () => {
  assert.ok(!markFixed(PAGE).html.includes("<footer><p data-nth-fixed>"));
});

test("une valeur écrite par le client est échappée", () => {
  assert.equal(fillTokens(BAG, "<p>{{accueil.hero.texte}}</p>", "x"), "<p>Verres &amp; montures</p>");
});

test("un objet n'est pas substitué", () => {
  assert.equal(valueAt(BAG, "accueil.hero"), undefined);
  assert.equal(valueAt(BAG, "accueil.hero.titre"), "Osez");
});

function site() {
  const root = mkdtempSync(join(tmpdir(), "nth-fill-"));
  mkdirSync(join(root, "content"), { recursive: true });
  writeFileSync(join(root, "content", "accueil.json"), JSON.stringify(BAG.accueil));
  writeFileSync(join(root, "content", "boutique.json"), JSON.stringify(BAG.boutique));
  writeFileSync(join(root, "index.html"), PAGE);
  return root;
}

const quiet = { log() {}, err() {} };

test("la chaîne écrit l'aperçu, l'index et la page remplie", () => {
  const root = site();
  const out = run(root, quiet);
  assert.deepEqual(out.previews, ["accueil"]);
  assert.equal(out.missing.length, 0);
  assert.equal(readFileSync(join(root, "admin/preview/index.json"), "utf8").trim(), '["accueil"]');
  assert.ok(readFileSync(join(root, "index.html"), "utf8").includes("<h1>Osez</h1>"));
  assert.ok(readFileSync(join(root, "admin/preview/accueil.html"), "utf8").includes("{{accueil.hero.titre}}"));
});

test("--check ne touche à rien", () => {
  const root = site();
  run(root, { ...quiet, check: true });
  assert.ok(readFileSync(join(root, "index.html"), "utf8").includes("{{accueil.hero.titre}}"));
});

test("un jeton sans valeur est nommé", () => {
  const root = site();
  writeFileSync(join(root, "index.html"), "<main><p>{{accueil.absent}}</p></main>");
  const out = run(root, quiet);
  assert.equal(out.missing.length, 1);
  assert.ok(out.missing[0].startsWith("accueil.absent"));
});

test("deux fichiers pour un même espace de noms sont refusés", () => {
  const root = site();
  mkdirSync(join(root, "content", "a"), { recursive: true });
  writeFileSync(join(root, "content", "a-propos.json"), "{}");
  writeFileSync(join(root, "content", "a", "propos.json"), "{}");
  const out = run(root, quiet);
  assert.equal(out.errors.length, 1);
});
