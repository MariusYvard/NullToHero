// La lecture du site avant tout le reste. `content-map` répond à une question
// et une seule : de quoi pourrait-on donner les clés au propriétaire. Ce qu'il
// refuse compte autant que ce qu'il propose, parce que confier un fichier que
// la prochaine construction réécrit est une perte de données silencieuse.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";

import { contentMap, frontMatter, widgetFor, proseRuns, looksGenerated, listFiles }
  from "../null-to-hero/tools/cms/content-map.mjs";

const tmp = () => fs.mkdtempSync(join(os.tmpdir(), "nth-map-"));
const put = (root, path, body) => {
  fs.mkdirSync(join(root, path, ".."), { recursive: true });
  fs.writeFileSync(join(root, path), body);
};

/* ── l'entête des fichiers ────────────────────────────────────────────────── */

test("les trois clôtures d'entête sont reconnues, et rien d'autre", () => {
  assert.equal(frontMatter("---\ntitre: A\n---\ncorps").kind, "yaml");
  assert.equal(frontMatter("+++\ntitre = \"A\"\n+++\ncorps").kind, "toml");
  assert.equal(frontMatter('{\n"titre": "A"\n}\ncorps').kind, "json");
  assert.equal(frontMatter("# Titre\n\ncorps").kind, null);
});

test("les scalaires sont typés, les guillemets retirés, les commentaires ignorés", () => {
  const { fields } = frontMatter([
    "---", "titre: 'Un titre'", "poids: 12", "prix: 9.5", "brouillon: false",
    "note: valeur # commentaire", "vide:", "liste: [a, b]", "---", "",
  ].join("\n"));
  assert.deepEqual(fields, {
    titre: "Un titre", poids: 12, prix: 9.5, brouillon: false,
    note: "valeur", vide: [], liste: ["a", "b"],
  });
});

test("une liste sur plusieurs lignes est lue, une imbrication est déclarée illisible", () => {
  const yaml = ["---", "tags:", "  - un", "  - deux", "seo:", "  titre: A", "---"].join("\n");
  const out = frontMatter(yaml);
  assert.deepEqual(out.fields.tags, ["un", "deux"]);
  assert.ok(out.unread.length, "une structure imbriquée doit être signalée, pas devinée");
});

// Un entête non refermé, lu comme du texte, ferait passer tout le fichier pour
// du corps et proposerait une collection sans champ.
test("un entête non refermé est signalé au lieu d'être deviné", () => {
  const out = frontMatter("---\ntitre: A\ncorps sans clôture");
  assert.deepEqual(out.fields, {});
  assert.deepEqual(out.unread, ["unterminated front matter"]);
  assert.equal(frontMatter('{\n"titre": "A"\ncorps').unread[0], "unterminated JSON front matter");
  assert.equal(frontMatter('{\n"titre": oups\n}\n').unread[0], "unreadable JSON front matter");
});

test("un BOM en tête ne cache pas la clôture", () => {
  assert.equal(frontMatter("﻿---\ntitre: A\n---\n").fields.titre, "A");
});

/* ── le choix du widget ───────────────────────────────────────────────────── */

// Un widget choisi sur une seule valeur se trompe dès la deuxième entrée. La
// règle est l'unanimité : une exception ramène au champ texte.
test("le widget est décidé à l'unanimité des valeurs, pas sur la première", () => {
  assert.equal(widgetFor("x", [true, false]), "boolean");
  assert.equal(widgetFor("x", [true, "oui"]), "string");
  assert.equal(widgetFor("x", [1, 2]), "number");
  assert.equal(widgetFor("x", [1, "deux"]), "string");
  assert.equal(widgetFor("x", [["a"], []]), "list");
  assert.equal(widgetFor("x", ["2026-08-19", "2026-01-01T10:00"]), "datetime");
  assert.equal(widgetFor("x", ["2026-08-19", "hier"]), "string");
});

test("un champ vide partout reste une chaîne plutôt qu'une devinette", () => {
  assert.equal(widgetFor("x", [undefined, null]), "string");
});

test("une longue valeur demande un champ texte, une courte non", () => {
  assert.equal(widgetFor("x", ["a".repeat(200)]), "text");
  assert.equal(widgetFor("x", ["court"]), "string");
});

// Une image reconnue hors du dossier des médias serait proposée à l'envoi vers
// un dossier que le pont refuse d'écrire.
test("une image n'en est une que dans le dossier des médias", () => {
  assert.equal(widgetFor("x", ["/uploads/a.jpg"], "static/uploads"), "image");
  assert.equal(widgetFor("x", ["/ailleurs/a.jpg"], "static/uploads"), "string");
  assert.equal(widgetFor("x", ["/ailleurs/a.jpg"]), "image", "sans dossier déclaré, l'extension décide");
});

/* ── la prose enfermée dans un gabarit ────────────────────────────────────── */

test("les scripts, les styles et les commentaires ne sont pas de la prose", () => {
  const html = [
    "<script>var message = 'une phrase assez longue pour compter comme prose';</script>",
    "<style>.a{content:'une autre phrase assez longue pour compter ici'}</style>",
    "<!-- un commentaire assez long pour ressembler à une vraie phrase -->",
    "<p>Voici une phrase de la page, assez longue pour être comptée.</p>",
  ].join("\n");
  const runs = proseRuns(html);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].line, 4);
  assert.ok(runs[0].text.startsWith("Voici une phrase"));
});

// Le numéro de ligne est ce qui rend le rapport utilisable : sans lui, l'agence
// cherche la phrase dans un gabarit de mille lignes.
test("le numéro de ligne survit au blanchiment des balises", () => {
  const html = `<div>\n<script>\nvar x = 1;\n</script>\n<p>${"Une phrase de la page. ".repeat(3)}</p>`;
  assert.equal(proseRuns(html)[0].line, 5);
});

test("une suite trop courte n'est pas une phrase", () => {
  assert.deepEqual(proseRuns("<p>Trop court</p>"), []);
  assert.equal(proseRuns("<p>Trop court</p>", 5).length, 1);
});

test("une suite sans lettres n'est pas de la prose", () => {
  assert.deepEqual(proseRuns(`<p>${"12 34 56 78 90 12 34 56 78 90 12 34 56"}</p>`), []);
});

/* ── ce que la carte refuse ───────────────────────────────────────────────── */

test("un fichier qui se déclare généré est reconnu comme tel", () => {
  assert.ok(looksGenerated("<!-- Generated by something. Do not edit -->\n<p>x</p>"));
  assert.ok(!looksGenerated("<p>Un fichier ordinaire qui parle de génération</p>"));
});

// LA PERTE DE DONNÉES QUE CE REFUS ÉVITE
// --------------------------------------
// Confier un fichier que la prochaine construction réécrit donne au client un
// champ qu'il remplit, enregistre, et qui redevient vide au déploiement suivant.
// Rien ne le signale : ni le pont, qui a bien écrit, ni le build, qui a bien
// construit.
test("un fichier généré est refusé avec sa raison, pas ignoré", () => {
  const root = tmp();
  put(root, "content/a.md", "---\ntitre: A\n---\ncorps");
  put(root, "content/b.md", "---\n# Generated by a tool, do not edit\ntitre: B\n---\ncorps");
  const map = contentMap(root, { tracked: null });
  assert.ok(map.refused.some(r => r.path === "content/b.md" && /generated/.test(r.why)));
  assert.ok(!map.refused.some(r => r.path === "content/a.md"));
});

test("hors du suivi de git, un fichier est refusé plutôt que confié", () => {
  const root = tmp();
  put(root, "content/a.md", "---\ntitre: A\n---\n");
  put(root, "content/b.md", "---\ntitre: B\n---\n");
  const map = contentMap(root, { tracked: new Set(["content/a.md"]) });
  assert.ok(map.refused.some(r => r.path === "content/b.md" && /git/.test(r.why)));
});

// Hors dépôt, git ne peut rien écarter. Refuser tout serait aussi faux que
// tout accepter, donc l'absence de git est traitée comme une absence d'avis.
test("hors dépôt, git n'écarte rien", () => {
  const root = tmp();
  put(root, "content/a.md", "---\ntitre: A\n---\n");
  const map = contentMap(root, { tracked: null });
  assert.deepEqual(map.refused, []);
});

test("les dossiers de construction ne sont pas parcourus", () => {
  const root = tmp();
  put(root, "content/a.md", "x");
  put(root, "node_modules/paquet/index.js", "x");
  put(root, "dist/a.html", "x");
  assert.deepEqual(listFiles(root), ["content/a.md"]);
});

/* ── ce que la carte propose ──────────────────────────────────────────────── */

test("un dossier à plusieurs fichiers est une collection, un seul fichier est une page", () => {
  const root = tmp();
  put(root, "pages/a.md", "---\ntitre: A\n---\n");
  put(root, "pages/b.md", "---\ntitre: B\n---\n");
  put(root, "reglages/site.md", "---\nnom: Site\n---\n");
  const map = contentMap(root, { tracked: null });
  assert.deepEqual(map.collections.map(c => c.folder), ["pages"]);
  assert.deepEqual(map.singles.map(c => c.folder), ["reglages"]);
});

// L'échantillon est là pour qu'un humain l'ouvre. Un brouillon à moitié rempli
// est le pire choix possible.
test("l'échantillon proposé est l'entrée la plus fournie du dossier", () => {
  const root = tmp();
  put(root, "pages/pauvre.md", "---\ntitre: A\n---\n");
  put(root, "pages/riche.md", "---\ntitre: B\nresume: R\nauteur: C\n---\n");
  const [collection] = contentMap(root, { tracked: null }).collections;
  assert.equal(collection.sample, "pages/riche.md");
});

test("un champ absent d'une entrée n'est pas déclaré obligatoire", () => {
  const root = tmp();
  put(root, "pages/a.md", "---\ntitre: A\nresume: R\n---\n");
  put(root, "pages/b.md", "---\ntitre: B\n---\n");
  const [collection] = contentMap(root, { tracked: null }).collections;
  const champ = name => collection.fields.find(f => f.name === name);
  assert.equal(champ("titre").required, true);
  assert.equal(champ("resume").required, false);
});

test("la liste blanche proposée couvre ce que la carte propose, et rien d'autre", () => {
  const root = tmp();
  put(root, "pages/a.md", "---\ntitre: A\n---\n");
  put(root, "pages/b.md", "---\ntitre: B\n---\n");
  const map = contentMap(root, { tracked: null });
  const prefixes = map.allowList.map(r => r.prefix || r);
  assert.ok(prefixes.some(p => String(p).startsWith("pages")), JSON.stringify(map.allowList));
});
