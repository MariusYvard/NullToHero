// Le linter, jugé sur la sortie du générateur plutôt que sur un état inventé.
// La propriété qui compte : ce que `cms-scaffold` écrit passe `cms-lint` sans
// un mot. Tout le reste de ce fichier abîme ce projet d'une façon précise et
// vérifie que le contrôle prévu, et lui seul, se réveille.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";

import { lint, readProject, CHECKS, META } from "../null-to-hero/tools/cms/cms-lint.mjs";
import { readContent, plan, apply } from "../null-to-hero/tools/cms/cms-scaffold.mjs";

const DECLARED = `\`\`\`yaml
branch: cms-content
production_branch: cms
site: https://exemple.netlify.app
locale: fr
publish: manual
roles:
  - editor
  - manager
theme:
  paper: "#ffffff"
  ink: "#111111"
  accent: "#2563eb"
  accent_ink: "#ffffff"
  font: system-ui
  radius: 8
media:
  folder: static/uploads
  public: /uploads
  max_width: 2000
  quality: 0.82
quota:
  - hours: 1
    max: 10
collections:
  - name: accueil
    label: Accueil
    file: content/accueil.json
    fields:
      - name: titre
        label: Titre
        widget: string
        required: true
\`\`\`
`;

// Un projet complet, écrit par le générateur lui-même. Le seul fichier posé à
// la main est celui qu'un site réel pose lui aussi : la configuration de
// l'hébergeur, avec le build qui appelle nth-content.mjs.
function project() {
  const root = fs.mkdtempSync(join(os.tmpdir(), "nth-lint-"));
  fs.writeFileSync(join(root, "CONTENT.md"), `# Contenu\n\n${DECLARED}`);
  const declared = readContent(fs.readFileSync(join(root, "CONTENT.md"), "utf8"));
  apply(root, plan(root, declared), true);
  fs.mkdirSync(join(root, "content"), { recursive: true });
  fs.writeFileSync(join(root, "content/accueil.json"), '{"titre":"Bonjour"}\n');
  fs.mkdirSync(join(root, "static/uploads"), { recursive: true });
  fs.writeFileSync(join(root, "static/uploads/.gitkeep"), "");
  // `vendor-decap.mjs` télécharge le lot. Un test ne va pas sur le réseau, donc
  // les fichiers sont posés vides : ce que CMS-25 compte est leur présence et
  // leur nombre, pas leur contenu. Ce qui n'est donc pas jugé ici, et il faut
  // le dire, c'est que le lot téléchargé soit le bon.
  const bundle = join(root, "admin/decap-cms-3.15.1");
  fs.mkdirSync(bundle, { recursive: true });
  fs.writeFileSync(join(bundle, "decap-cms.js"), "");
  for (let i = 0; i < 12; i++) fs.writeFileSync(join(bundle, `${i}.decap-cms.js`), "");
  fs.writeFileSync(join(root, "netlify.toml"),
    '[build]\n  command = "node build.js && node nth-content.mjs ."\n  publish = "."\n');
  return root;
}

const findings = root => lint(readProject(root));
const edit = (root, rel, change) =>
  fs.writeFileSync(join(root, rel), change(fs.readFileSync(join(root, rel), "utf8")));

/* ── la propriété principale ──────────────────────────────────────────────── */

test("ce que le générateur écrit passe le linter sans un mot", () => {
  const out = findings(project());
  assert.deepEqual(out.map(f => `${f.id} ${f.where}: ${f.detail}`), []);
});

test("chaque contrôle exécuté est recensé, et chaque ligne recensée s'exécute", () => {
  const meta = META();
  const coded = new Set(Object.keys(CHECKS));
  const listed = new Set(meta.keys());
  assert.deepEqual([...coded].filter(id => !listed.has(id)), [], "contrôle sans ligne dans le CSV");
  assert.deepEqual([...listed].filter(id => !coded.has(id)), [], "ligne du CSV sans contrôle");
  assert.equal(coded.size, 29);
});

/* ── une avarie, un contrôle ──────────────────────────────────────────────── */

// Chaque cas abîme le projet d'une façon et nomme le contrôle qui doit parler.
// L'assertion porte aussi sur le silence des autres : un contrôle qui se
// réveille pour la mauvaise raison est aussi faux qu'un contrôle muet.
const only = (root, ...ids) => {
  const got = findings(root);
  assert.deepEqual([...new Set(got.map(f => f.id))].sort(), ids.sort(),
    got.map(f => `${f.id} ${f.where}: ${f.detail}`).join("\n") || "(rien)");
};

test("une collection que le pont refusera d'écrire est vue", () => {
  const root = project();
  edit(root, "netlify/functions/cms-policy.json", t => {
    const policy = JSON.parse(t);
    policy.rules = policy.rules.filter(r => r.prefix !== "content/accueil.json");
    return `${JSON.stringify(policy, null, 2)}\n`;
  });
  assert.ok(findings(root).some(f => /accueil/.test(f.detail || "")),
    "un fichier que l'éditeur propose et que le pont refuse n'a rien déclenché");
});

test("un build qui n'appelle jamais nth-content.mjs est vu", () => {
  const root = project();
  fs.writeFileSync(join(root, "netlify.toml"), '[build]\n  command = "node build.js"\n');
  only(root, "CMS-29");
});

test("le fichier de contenu que l'éditeur propose doit exister", () => {
  const root = project();
  fs.rmSync(join(root, "content/accueil.json"));
  only(root, "CMS-06");
});

test("un lot vendu sans ses morceaux est vu, l'entrée seule est un écran de connexion", () => {
  const root = project();
  for (let i = 0; i < 12; i++) fs.rmSync(join(root, `admin/decap-cms-3.15.1/${i}.decap-cms.js`));
  only(root, "CMS-25");
});

test("sans theme.css l'éditeur porte les couleurs de Decap, et c'est dit", () => {
  const root = project();
  fs.rmSync(join(root, "admin/theme.css"));
  only(root, "CMS-26");
});

test("un dossier public absent casse chaque URL d'image", () => {
  const root = project();
  edit(root, "admin/config.yml", t => t.replace(/^public_folder:.*\n/m, ""));
  only(root, "CMS-01");
});

test("un pont joint par une URL absolue perd le cookie de session", () => {
  const root = project();
  edit(root, "admin/config.yml", t => t.replace("proxy_url: /api/cms", "proxy_url: https://ailleurs.fr/api/cms"));
  only(root, "CMS-16");
});

test("les en-têtes qui ferment /admin/ sont attendus", () => {
  const root = project();
  fs.writeFileSync(join(root, "_headers"), "/*\n  X-Frame-Options: DENY\n");
  assert.ok(findings(root).some(f => f.id === "CMS-22"));
});

/* ── le second outil : la dérive des fichiers compilés ────────────────────── */

// Une modification à la main d'un fichier compilé n'est pas l'affaire du
// linter, qui juge la cohérence, mais de `cms-scaffold --check`, qui compare
// chaque fichier à ce que CONTENT.md produirait. Les deux commandes de
// `/cms check` sont là pour cela, et elles ne se remplacent pas.
test("cms-scaffold voit la main qui a modifié un fichier compilé", () => {
  const root = project();
  edit(root, "admin/config.yml", t => `${t}\n# ajouté à la main\n`);
  const declared = readContent(fs.readFileSync(join(root, "CONTENT.md"), "utf8"));
  const drifted = plan(root, declared).filter(s => s.state === "drift").map(s => s.path);
  assert.deepEqual(drifted, ["admin/config.yml"]);
  assert.deepEqual(findings(root), [], "le linter n'a pas à juger la dérive, cms-scaffold s'en charge");
});

// Python écrit ses fins de ligne au format de la plateforme. Sans normalisation,
// admin/theme.css écrit sous Windows paraissait modifié à la main à chaque
// contrôle, indéfiniment, et l'agence apprenait à ignorer le message.
test("un projet fraîchement écrit ne dérive de rien, sur n'importe quel système", () => {
  const root = project();
  const declared = readContent(fs.readFileSync(join(root, "CONTENT.md"), "utf8"));
  const states = plan(root, declared).filter(s => s.state !== "same").map(s => `${s.path} ${s.state}`);
  assert.deepEqual(states, []);
  assert.ok(!fs.readFileSync(join(root, "admin/theme.css"), "utf8").includes("\r\n"),
    "un artefact compilé porte des CRLF");
});

/* ── ce qu'aucun des deux ne voit ─────────────────────────────────────────── */

// CE TEST DOCUMENTE DES TROUS, IL N'EN CÉLÈBRE AUCUN
// -------------------------------------------------
// Les deux cas ci-dessous cassent l'éditeur et passent les vingt-neuf contrôles
// sans un mot. Les écrire ici plutôt que les taire évite que quelqu'un lise le
// silence du linter comme une garantie. Le jour où un contrôle les couvre, ce
// test échoue, et c'est le signal qu'il faut le supprimer.
test("connus et non couverts : nth-backend.js absent, public_folder mal formé", () => {
  const sans = project();
  fs.rmSync(join(sans, "admin/nth-backend.js"));
  assert.deepEqual(findings(sans), [],
    "un contrôle couvre maintenant nth-backend.js absent : retirer ce cas");

  const mauvais = project();
  edit(mauvais, "admin/config.yml", t => t.replace("public_folder: /uploads", "public_folder: static/uploads"));
  assert.deepEqual(findings(mauvais), [],
    "un contrôle couvre maintenant un public_folder non racine : retirer ce cas");
});

// Le linter lit le dépôt. Un dépôt parfait et un pont éteint se ressemblent
// exactement, et c'est pour cela que `cms-diagnose.mjs` existe.
test("un projet propre ne dit rien du pont déployé", () => {
  const root = project();
  assert.deepEqual(findings(root), []);
  assert.ok(!JSON.stringify(readProject(root)).includes("NTH_CMS_GITHUB_TOKEN"),
    "le linter ne doit jamais avoir de secret sous la main");
});
