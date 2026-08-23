// La fiche de mise en service, et le seul appel que le générateur ne peut pas
// faire à la place du site.
import { test } from "node:test";
import assert from "node:assert/strict";

import { handoverFor } from "../null-to-hero/tools/cms/cms-scaffold.mjs";
import { CHECKS } from "../null-to-hero/tools/cms/cms-lint.mjs";

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
  assert.ok(/ne les expose pas/.test(fiche), "le jeton non vérifiable n'est pas signalé");
});

test("sans dépôt déclaré, la fiche le dit au lieu d'inventer", () => {
  const fiche = handoverFor({ ...SITE, repo: undefined });
  assert.ok(fiche.includes("<propriétaire/dépôt>"));
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
