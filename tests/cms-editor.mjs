// La moitié navigateur du CMS. Elle tourne dans la page de l'éditeur, donc elle
// ne peut être jugée qu'à travers ses fonctions pures : celles qui décident, par
// opposition à celles qui dessinent. Le cadrage des appareils est jugé à part,
// dans tests/cms-frames.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const nth = createRequire(import.meta.url)("../null-to-hero/tools/cms/nth-backend.js");
const {
  readCookie, explain, words, Transport, fillTokens, fillEditable, flatten,
  changesBetween, labelsOf, tightest, quotaText, countWords, counterText,
  targetFor, imagePlan, fitWithin, chooseResult, previewNames, filesOf, whenText,
} = nth;

/* ── le fil ───────────────────────────────────────────────────────────────── */

test("le cookie CSRF est lu par son nom exact, pas par un préfixe", () => {
  const jar = "__Host-nth_cms=A; __Host-nth_cms_csrf=B; autre=C";
  assert.equal(readCookie("__Host-nth_cms_csrf", jar), "B");
  assert.equal(readCookie("__Host-nth_cms", jar), "A");
  assert.equal(readCookie("absent", jar), "");
  assert.equal(readCookie("x", ""), "");
});

// Sans cet en-tête, le pont refuse en 403 et l'éditeur paraît cassé. C'est la
// raison d'être de cette moitié navigateur : le backend `proxy` de Decap
// n'envoie aucun en-tête personnalisé.
test("l'en-tête CSRF part avec chaque requête, tiré du cookie", async () => {
  const seen = [];
  const transport = new Transport("/api/cms", {
    fetch: (url, init) => { seen.push([url, init]); return Promise.resolve(ok({ ok: true })); },
    cookies: () => "__Host-nth_cms_csrf=jeton",
  }, "fr");
  await transport.post("/api/cms", { action: "info" });
  assert.equal(seen[0][1].headers["X-NTH-CSRF"], "jeton");
  assert.equal(seen[0][1].credentials, "same-origin");
  assert.equal(seen[0][1].method, "POST");
});

test("sans cookie, aucun en-tête vide n'est envoyé", async () => {
  const seen = [];
  const transport = new Transport("/api/cms", {
    fetch: (url, init) => { seen.push(init); return Promise.resolve(ok({})); },
    cookies: () => "",
  }, "fr");
  await transport.post("/api/cms", {});
  assert.ok(!("X-NTH-CSRF" in seen[0].headers));
});

const ok = body => ({ ok: true, status: 200, json: () => Promise.resolve(body) });
const ko = (status, body) => ({ ok: false, status, json: () => Promise.resolve(body) });

// Un 401 sur la route de session veut dire "mauvais mot de passe". Le même 401
// ailleurs veut dire "la session a expiré". Les confondre envoie le client
// retaper un mot de passe correct.
test("un 401 ne dit pas la même chose à la connexion et en cours de travail", () => {
  const w = words("fr");
  assert.equal(explain(401, null, true, "fr"), w.wrong);
  assert.equal(explain(401, null, false, "fr"), w.ended);
});

test("le message du pont est préféré au nôtre quand il y en a un", () => {
  assert.equal(explain(403, { error: "path not allowed" }, false, "fr"), "path not allowed");
  assert.ok(/500/.test(explain(500, {}, false, "fr")), "un statut sans message doit au moins se nommer");
});

test("une erreur portée par la promesse garde son statut", async () => {
  const transport = new Transport("/api/cms", {
    fetch: () => Promise.resolve(ko(429, { error: "trop d'écritures" })),
    cookies: () => "",
  }, "fr");
  await assert.rejects(transport.post("/api/cms", {}), e => {
    assert.equal(e.status, 429);
    assert.equal(e.message, "trop d'écritures");
    return true;
  });
});

/* ── l'aperçu ─────────────────────────────────────────────────────────────── */

test("un jeton est remplacé par sa valeur, échappée", () => {
  const html = "<h1>{{accueil.titre}}</h1>";
  assert.equal(fillTokens(html, "accueil", { titre: "Vins & Cie" }), "<h1>Vins &amp; Cie</h1>");
});

// Un jeton d'un autre fichier laissé tel quel est visible dans l'aperçu, donc
// corrigeable. Remplacé par du vide, il disparaît sans que personne ne le sache.
test("un jeton d'un autre espace de noms reste visible plutôt que vidé", () => {
  assert.equal(fillTokens("{{autre.titre}}", "accueil", { titre: "X" }), "{{autre.titre}}");
  assert.equal(fillTokens("{{accueil.absent}}", "accueil", { titre: "X" }), "{{accueil.absent}}");
});

test("une valeur qui n'est ni texte ni nombre laisse le jeton en place", () => {
  assert.equal(fillTokens("{{a.liste}}", "a", { liste: ["x"] }), "{{a.liste}}");
  assert.equal(fillTokens("{{a.n}}", "a", { n: 0 }), "0", "zéro est un nombre, pas une absence");
});

test("un chemin profond descend, un chemin qui traverse une feuille s'arrête", () => {
  assert.equal(fillTokens("{{a.b.c}}", "a", { b: { c: "ok" } }), "ok");
  assert.equal(fillTokens("{{a.b.c}}", "a", { b: "feuille" }), "{{a.b.c}}");
});

// L'entête reçoit bien ses valeurs, sinon l'onglet du navigateur afficherait
// des accolades. Ce qu'il ne reçoit pas, c'est l'attribut d'édition : un
// contenteditable posé dans un <title> ou un <meta> n'est éditable nulle part
// et casse la page sans rien montrer.
test("l'entête est rempli mais jamais rendu éditable", () => {
  const html = '<html><head><title>{{a.titre}}</title></head><body><h1>{{a.titre}}</h1></body></html>';
  const out = fillEditable(html, "a", { titre: "Bonjour" });
  const head = out.slice(0, out.toLowerCase().indexOf("</head>"));
  assert.ok(head.includes("<title>Bonjour</title>"), "l'entête garde ses accolades");
  assert.ok(!/data-nth/.test(head), "l'entête a reçu un attribut d'édition");
  assert.ok(/<h1[^>]*data-nth="titre"[^>]*contenteditable="true">Bonjour<\/h1>/.test(out), out);
});

test("l'édition dans la page échappe la valeur comme le reste", () => {
  const out = fillEditable("<body><p>{{a.t}}</p></body>", "a", { t: "<script>x</script>" });
  assert.ok(!out.includes("<script>x"), "une valeur a été injectée telle quelle");
});

/* ── le retour arrière ────────────────────────────────────────────────────── */

test("les couples chemin/valeur d'un objet imbriqué sont mis à plat", () => {
  assert.deepEqual(flatten({ a: { b: "x" }, c: 2, d: null }, ""),
    { "a.b": "x", c: "2", d: "" });
});

// Le bouton de retour arrière montre ce qui va changer. Un champ ajouté ou
// retiré est un changement au même titre qu'un champ modifié.
test("ce qui change entre deux versions comprend l'ajout et le retrait", () => {
  const out = changesBetween({ titre: "A", parti: "x" }, { titre: "B", nouveau: "y" });
  assert.deepEqual(out.sort((a, b) => a.path.localeCompare(b.path)), [
    { path: "nouveau", before: "", after: "y" },
    { path: "parti", before: "x", after: "" },
    { path: "titre", before: "A", after: "B" },
  ]);
});

test("deux versions identiques ne changent rien", () => {
  assert.deepEqual(changesBetween({ a: { b: 1 } }, { a: { b: 1 } }), []);
});

// Sans les intitulés, la liste des changements parle en chemins techniques,
// que le propriétaire du site n'a jamais vus.
test("les intitulés imbriqués portent le chemin de leurs parents", () => {
  const labels = labelsOf([
    { name: "seo", label: "Référencement", fields: [{ name: "titre", label: "Titre" }] },
    { name: "nu" },
  ]);
  assert.equal(labels["seo.titre"], "Référencement › Titre");
  assert.equal(labels.nu, "nu", "sans intitulé, le nom du champ sert d'intitulé");
});

/* ── le compteur du quota ─────────────────────────────────────────────────── */

test("c'est la fenêtre la plus serrée qui est montrée", () => {
  assert.deepEqual(tightest([{ left: 9, hours: 720 }, { left: 2, hours: 1 }]), { left: 2, hours: 1 });
  assert.equal(tightest([]), null);
  assert.equal(tightest([{ hours: 1 }]), null, "une fenêtre sans compte n'en est pas une");
});

test("le quota épuisé et le quota restant ne disent pas la même chose", () => {
  const reste = quotaText("fr", { left: 3, hours: 1, max: 10, used: 7 });
  const fini = quotaText("fr", { left: 0, hours: 1, max: 10, used: 10 });
  assert.ok(/3/.test(reste));
  assert.notEqual(reste, fini);
  assert.ok(!/0/.test(fini) || /limite|atteinte/i.test(fini));
});

/* ── le compteur de caractères ────────────────────────────────────────────── */

test("les mots se comptent sur les espaces, et rien ne vaut zéro", () => {
  assert.equal(countWords("un deux trois"), 3);
  assert.equal(countWords("  un   deux  "), 2);
  assert.equal(countWords(""), 0);
  assert.equal(countWords(null), 0);
});

test("le conseil de longueur ne s'affiche que là où il y en a un", () => {
  const w = words("fr");
  assert.ok(/\(/.test(counterText("x", targetFor("seo.title") || { min: 1, max: 2 }, false, w)));
  assert.ok(!/\(/.test(counterText("x", null, false, w)));
  assert.ok(counterText("un deux", null, true, w).length > counterText("un deux", null, false, w).length,
    "un champ long doit aussi compter ses mots");
});

/* ── les images qui partent ───────────────────────────────────────────────── */

// Une animation relue par un canevas revient sur une image fixe, et un vecteur
// passé au raster est détruit. Les deux sont des refus, pas des oublis.
test("une animation et un vecteur ne sont jamais réencodés", () => {
  assert.equal(imagePlan("a.gif").convert, false);
  assert.equal(imagePlan("a.svg").convert, false);
  assert.ok(imagePlan("a.gif").why, "un refus sans raison ne s'explique pas au client");
});

test("la conversion se coupe par la configuration, et le refus le dit", () => {
  assert.equal(imagePlan("a.jpg", { convert: "off" }).convert, false);
  assert.match(imagePlan("a.jpg", { convert: "off" }).why, /config/);
});

test("un fichier qui n'est pas une image matricielle est laissé tranquille", () => {
  assert.equal(imagePlan("a.pdf").convert, false);
  assert.equal(imagePlan("sans-extension").convert, false);
});

test("la réduction garde les proportions et ne grossit jamais", () => {
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
  assert.deepEqual(fitWithin(800, 600, 2000), { width: 800, height: 600 });
  assert.equal(fitWithin(4000, 1, 2000).height, 1, "une hauteur ne tombe jamais à zéro");
});

// Garder le plus gros des deux serait une chaîne qui alourdit les sites en
// silence.
test("un réencodage plus lourd que l'original est jeté, avec sa raison", () => {
  assert.equal(chooseResult(1000, { size: 1200, type: "image/webp" }, "image/webp").keep, "original");
  assert.equal(chooseResult(1000, { size: 800, type: "image/webp" }, "image/webp").keep, "encoded");
  assert.equal(chooseResult(1000, { size: 100, type: "image/png" }, "image/webp").keep, "original");
  assert.equal(chooseResult(1000, null, "image/webp").keep, "original");
});

/* ── l'aperçu, côté configuration ─────────────────────────────────────────── */

test("seules les collections qui ont un aperçu compilé sont nommées", () => {
  const config = {
    collections: [
      { name: "pages", folder: "content/pages" },
      { name: "reglages", files: [{ name: "accueil", file: "content/accueil.json" }] },
    ],
  };
  assert.deepEqual(previewNames(config, ["pages", "accueil"]).sort(), ["accueil", "pages"]);
  assert.deepEqual(previewNames(config, ["rien"]), []);
});

test("les fichiers exacts sont indexés par leur nom de collection", () => {
  const config = { collections: [{ name: "r", files: [{ name: "accueil", file: "content/accueil.json" }] }] };
  assert.deepEqual(filesOf(config), { accueil: "content/accueil.json" });
  assert.deepEqual(filesOf({ collections: [{ name: "p", folder: "x" }] }), {});
});

// Une date illisible affichée telle quelle mettrait "Invalid Date" sous le
// bouton de retour arrière.
test("une date illisible ne s'affiche pas du tout", () => {
  assert.equal(whenText("pas une date", "fr"), "");
  assert.equal(whenText("", "fr"), "");
  assert.ok(whenText("2026-08-19T10:00:00Z", "fr").length);
});
