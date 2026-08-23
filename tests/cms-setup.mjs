// La fiche de mise en service, et le seul appel que le générateur ne peut pas
// faire à la place du site.
import { test } from "node:test";
import assert from "node:assert/strict";

import { handoverFor, policyFrom } from "../null-to-hero/tools/cms/cms-scaffold.mjs";
import { CHECKS } from "../null-to-hero/tools/cms/cms-lint.mjs";
import { checkPath } from "../null-to-hero/tools/cms/bridge.mjs";

const SITE = {
  locale: "fr", branch: "cms-content", production_branch: "cms",
  site: "https://exemple.netlify.app", repo: "moi/mon-site", roles: ["editor", "manager"],
};

test("la fiche porte les vrais noms de ce site, pas un modèle à trous", () => {
  const fiche = handoverFor(SITE);
  assert.ok(fiche.includes("git branch cms-content cms"));
  assert.ok(fiche.includes("moi/mon-site"));
  assert.ok(fiche.includes("https://exemple.netlify.app"));
  assert.ok(!/<[a-z]+\/[a-z]+>/.test(fiche), "un trou est resté dans la fiche");
});

test("la fiche suit la langue déclarée", () => {
  assert.ok(handoverFor(SITE).startsWith("# Mise en service"));
  assert.ok(handoverFor({ ...SITE, locale: "en" }).startsWith("# Putting the editor"));
});

test("la fiche nomme les quatre variables et refuse Workflows au jeton", () => {
  for (const lang of ["fr", "en"]) {
    const fiche = handoverFor({ ...SITE, locale: lang });
    for (const name of ["NTH_CMS_SESSION_SECRET", "NTH_CMS_ACCOUNTS", "NTH_CMS_GITHUB_TOKEN", "NTH_CMS_REPO"]) {
      assert.ok(fiche.includes(name), `${name} absent de la fiche ${lang}`);
    }
    assert.ok(/Workflows/.test(fiche));
  }
});

test("la fiche dit ce qu'aucun contrôle ne pourra constater", () => {
  const fiche = handoverFor(SITE);
  assert.ok(/DNS/.test(fiche));
  assert.ok(/Workflows/.test(fiche), "la permission invérifiable n'est pas signalée");
});

// Ce que la fiche déclarait invérifiable il y a une version l'est depuis
// l'intérieur du pont. Une fiche qui ne nomme pas le diagnostic renvoie le
// propriétaire à un "on verra bien" qui n'a plus lieu d'être.
test("la fiche envoie vers le diagnostic du pont, dans les deux langues", () => {
  for (const locale of ["fr", "en"]) {
    const fiche = handoverFor({ ...SITE, locale });
    assert.ok(fiche.includes("cms-diagnose.mjs"), `diagnostic absent de la fiche ${locale}`);
    assert.ok(fiche.includes(SITE.site), `l'adresse du site manque à la commande ${locale}`);
  }
});

// Révoquer avant d'avoir redéployé met le site hors service entre les deux.
// L'ordre est le seul contenu utile de ce paragraphe, donc il est gardé.
test("la fiche donne l'ordre de remplacement du jeton, révocation en dernier", () => {
  for (const locale of ["fr", "en"]) {
    const fiche = handoverFor({ ...SITE, locale });
    // La fiche est du texte enroulé : une coupure de ligne tombe n'importe où.
    const loose = words => new RegExp(words.join("[\\s\\S]{0,80}"));
    const rotation = locale === "fr"
      ? loose(["poser la", "variable", "redéployer", "vérifier", "révoquer l'ancien seulement ensuite"])
      : loose(["set the variable", "redeploy", "confirm", "only then revoke the old one"]);
    assert.ok(rotation.test(fiche), `l'ordre de rotation manque à la fiche ${locale}`);
  }
});

test("sans dépôt déclaré, la fiche le dit au lieu d'inventer", () => {
  const fiche = handoverFor({ ...SITE, repo: undefined });
  assert.ok(fiche.includes("<propriétaire/dépôt>"));
});

/* ── la liste blanche compilée ────────────────────────────────────────────── */

// LE TROU QUE CE TEST FERME
// -------------------------
// Le générateur sautait la règle exacte d'un fichier déjà couvert par la règle
// de son dossier. Le rôle déclaré sur ce fichier disparaissait avec elle, la
// règle du dossier ne nomme aucun rôle, et n'importe quel compte connecté
// pouvait l'écrire pendant que l'éditeur affichait la restriction.
const declared = (roles) => ({
  branch: "cms-content", roles: ["editor", "manager"], quota: [{ hours: 1, max: 5 }],
  media: { folder: "static/uploads" },
  collections: [
    { folder: "content", name: "pages" },
    { file: "content/prix.json", name: "prix", roles },
  ],
});

test("un fichier réservé à un rôle garde sa règle, même sous un dossier ouvert", () => {
  const policy = policyFrom(declared(["manager"]));
  assert.ok(policy.rules.some(r => r.prefix === "content/prix.json"),
    "la règle exacte a été avalée par la règle du dossier");
  assert.equal(checkPath("content/prix.json", policy, ["editor"]), "role");
  assert.equal(checkPath("content/prix.json", policy, ["manager"]), null);
  assert.equal(checkPath("content/autre.json", policy, ["editor"]), null);
});

test("un fichier sans rôle n'ajoute pas de règle pour rien", () => {
  const policy = policyFrom(declared([]));
  assert.ok(!policy.rules.some(r => r.prefix === "content/prix.json"));
  assert.equal(checkPath("content/prix.json", policy, ["editor"]), null);
});

// L'ordre du fichier de politique ne doit plus décider de rien.
test("la règle exacte gagne quelle que soit sa place dans la liste", () => {
  const rules = [
    { prefix: "content/prix.json", extensions: [], roles: ["manager"] },
    { prefix: "content/", extensions: [".json"], roles: [] },
  ];
  for (const order of [rules, [...rules].reverse()]) {
    assert.equal(checkPath("content/prix.json", { rules: order }, ["editor"]), "role");
  }
});

function run(state) {
  const found = [];
  CHECKS["CMS-29"](state, (path, message) => found.push(`${path}: ${message}`));
  return found;
}

test("un build qui n'appelle pas nth-content.mjs est une erreur", () => {
  const out = run({ files: new Set(["nth-content.mjs"]), build: 'command = "node build.js"' });
  assert.equal(out.length, 1);
  assert.ok(out[0].includes("no build command calls it"));
});

test("un build qui l'appelle passe", () => {
  assert.deepEqual(run({ files: new Set(["nth-content.mjs"]), build: "node build.js && node nth-content.mjs" }), []);
});

test("le fichier absent est signalé pour lui-même", () => {
  const out = run({ files: new Set(), build: "node nth-content.mjs" });
  assert.equal(out.length, 1);
  assert.ok(out[0].includes("the file is missing"));
});

// Le fichier de contrôles annonce ce garde-fou dans son propre en-tête : une
// ligne sans contrôle et un contrôle sans ligne sont deux façons de mentir sur
// ce qui est vérifié.
test("chaque contrôle a sa ligne dans le référentiel, et réciproquement", async () => {
  const { readFileSync } = await import("node:fs");
  const csv = readFileSync(new URL("../null-to-hero/tools/data/cms-checks.csv", import.meta.url), "utf8");
  const rows = csv.trim().split("\n").slice(1).map((line) => line.split(",")[0]);
  assert.deepEqual([...new Set(rows)].sort(), Object.keys(CHECKS).sort());
});
