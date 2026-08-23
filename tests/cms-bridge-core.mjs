// Le coeur du pont : la liste blanche, la session, le mot de passe, le quota.
// Ce que l'en-tête de bridge.mjs appelle "the design" plutôt qu'un durcissement,
// donc ce qui doit casser bruyamment si quelqu'un l'assouplit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";

import {
  handle, loadPolicy, checkPath, loadAccounts, authenticate, verifyPassword,
  signSession, verifySession, quotaUsage, pendingCount,
} from "../null-to-hero/tools/cms/bridge.mjs";

const SECRET = "x".repeat(48);
const NOW = Date.parse("2026-08-19T10:00:00Z");
const POLICY = {
  branch: "cms-content", productionBranch: "cms", publish: "simple", locale: "fr",
  requiredRoles: [], sessionHours: 8, maxSessionHours: 24,
  maxFileBytes: 64, maxRequestBytes: 4096, writeQuota: [{ hours: 1, max: 2 }],
  rules: [
    { prefix: "content/", extensions: [".json"], roles: [] },
    { prefix: "content/prix.json", extensions: [], roles: ["manager"] },
    { prefix: "static/uploads/", extensions: [".jpg"], roles: [] },
  ],
};

/* ── la liste blanche ─────────────────────────────────────────────────────── */

// Le cas que decap-server rate : sa vérification résout le chemin et compare des
// chaînes, donc un voisin dont le nom commence pareil passe.
test("un dossier voisin au nom proche n'est pas dans le dossier", () => {
  assert.equal(checkPath("content/a.json", POLICY), null);
  assert.equal(checkPath("content-secret/a.json", POLICY), "outside the allow-list");
  assert.equal(checkPath("contentX/a.json", POLICY), "outside the allow-list");
});

test("une extension hors de la liste est refusée, casse comprise", () => {
  assert.equal(checkPath("content/a.JSON", POLICY), null, "la casse ne doit pas décider");
  assert.equal(checkPath("content/a.md", POLICY), "extension .md");
  assert.equal(checkPath("content/sans-extension", POLICY), "extension none");
});

test("la traversée et les octets de contrôle sont refusés avant tout le reste", () => {
  for (const path of ["../secret", "content/../../etc/passwd", "/content/a.json",
                      "content//a.json", "content/a\0.json", "content\\a.json",
                      "content/a.json#x", "content/a.json?x", "content/a%2ejson"]) {
    assert.ok(checkPath(path, POLICY), `${JSON.stringify(path)} aurait dû être refusé`);
  }
});

test("un chemin trop long est refusé sur sa forme, pas sur son préfixe", () => {
  assert.equal(checkPath(`content/${"a".repeat(600)}.json`, POLICY), "shape");
  assert.equal(checkPath("", POLICY), "shape");
  assert.equal(checkPath(null, POLICY), "shape");
});

// La règle la plus précise gagne, sinon un fichier protégé par un rôle serait
// ouvert par la règle de son dossier.
test("une règle de fichier exact l'emporte sur la règle du dossier", () => {
  assert.equal(checkPath("content/prix.json", POLICY, []), "role");
  assert.equal(checkPath("content/prix.json", POLICY, ["manager"]), null);
  assert.equal(checkPath("content/prix.json", POLICY, ["editor"]), "role");
});

/* ── la politique ─────────────────────────────────────────────────────────── */

test("une politique sans règle est une erreur, pas une permission", () => {
  assert.throws(() => loadPolicy({ ...POLICY, rules: [] }), /no rules/);
});

// Un dossier sans filtre d'extension est une permission d'écriture sur tout le
// dossier. Ce n'est jamais ce qu'une liste blanche de contenu veut dire.
test("une règle de dossier doit nommer ses extensions", () => {
  assert.throws(() => loadPolicy({ ...POLICY, rules: [{ prefix: "content/", extensions: [], roles: [] }] }),
    /must name its extensions/);
});

test("un préfixe qui remonte ou qui est absolu est refusé au chargement", () => {
  for (const prefix of ["/content/", "../content/", "./content/", ""]) {
    assert.throws(() => loadPolicy({ ...POLICY, rules: [{ prefix, extensions: [".json"], roles: [] }] }),
      /refusing rule prefix/);
  }
});

// Le quota se compte sur une page d'historique. Au dessus de cent, il faudrait
// paginer, et un compteur qui s'arrête en silence se lit "pas de limite".
test("une fenêtre de quota au dessus d'une page d'historique est refusée", () => {
  assert.throws(() => loadPolicy({ ...POLICY, writeQuota: [{ hours: 24, max: 101 }] }), /caps at 100/);
  assert.throws(() => loadPolicy({ ...POLICY, writeQuota: [{ hours: 0, max: 5 }] }), /needs hours and max/);
});

/* ── les comptes ──────────────────────────────────────────────────────────── */

test("un enregistrement de mot de passe malformé ne vaut jamais vrai", () => {
  for (const record of ["", "scrypt$1$1$1$AA", "bcrypt$1$1$1$AA$AA", "scrypt$1$1$1$AA$", null]) {
    assert.equal(verifyPassword("x", record), false, `${record} accepté`);
  }
});

test("les paramètres viennent de l'enregistrement, pas d'une constante", () => {
  // Frappé avec N=1024 : un pont qui lirait un N codé en dur le refuserait.
  const record = mint("secret", 1024);
  assert.equal(verifyPassword("secret", record), true);
  assert.equal(verifyPassword("secrey", record), false);
});

test("une adresse inconnue est refusée sans dire qu'elle est inconnue", () => {
  const accounts = loadAccounts(JSON.stringify([
    { email: "A@B.fr", roles: ["editor"], password: mint("bon") },
  ]));
  assert.equal(authenticate("a@b.fr", "bon", accounts).email, "a@b.fr", "la casse ne décide pas");
  assert.equal(authenticate("  a@b.fr  ", "bon", accounts).email, "a@b.fr");
  assert.equal(authenticate("a@b.fr", "mauvais", accounts), null);
  assert.equal(authenticate("inconnu@b.fr", "bon", accounts), null);
});

test("un compte sans mot de passe n'existe pas", () => {
  assert.deepEqual(loadAccounts(JSON.stringify([{ email: "a@b.fr" }])), []);
  assert.deepEqual(loadAccounts(JSON.stringify([{ password: "x" }])), []);
  assert.throws(() => loadAccounts("{}"), /not a list/);
  assert.throws(() => loadAccounts("pas du JSON"), /not JSON/);
});

/* ── la session ───────────────────────────────────────────────────────────── */

test("une session altérée d'un octet ne vaut plus rien", () => {
  const token = signSession({ email: "a@b.fr", exp: NOW + 1000 }, SECRET);
  assert.ok(verifySession(token, SECRET, NOW));
  assert.equal(verifySession(token.slice(0, -1) + "A", SECRET, NOW), null);
  assert.equal(verifySession(token, "y".repeat(48), NOW), null, "un autre secret ne signe pas");
  assert.equal(verifySession(token.replace(".", "").concat(".x"), SECRET, NOW), null);
});

// Une charge utile sans `exp` numérique serait une session éternelle si la
// signature suffisait.
test("une session sans date de fin lisible est refusée", () => {
  for (const claims of [{ email: "a@b.fr" }, { email: "a@b.fr", exp: "demain" }]) {
    assert.equal(verifySession(signSession(claims, SECRET), SECRET, NOW), null);
  }
  assert.equal(verifySession(signSession({ exp: NOW - 1 }, SECRET), SECRET, NOW), null);
});

/* ── la route ─────────────────────────────────────────────────────────────── */

const post = async (body, opts = {}) => {
  const claims = {
    sub: "a@b.fr", email: "a@b.fr", roles: opts.roles || ["editor"], csrf: "c",
    iat: opts.iat ?? NOW, exp: NOW + 3600_000,
  };
  const headers = { "content-type": "application/json" };
  if (opts.csrf !== null) headers["x-nth-csrf"] = opts.csrf || "c";
  if (opts.signedIn !== false) headers.cookie = `__Host-nth_cms=${signSession(claims, SECRET)}`;
  const req = new Request(opts.url || "https://site.fr/api/cms", {
    method: opts.method || "POST", headers,
    ...(opts.method === "GET" ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
  const res = await handle(req, opts.env || ENV, {
    fetch: opts.fetch || (async () => { throw new Error("le réseau ne devait pas être touché"); }),
    now: NOW, policy: opts.policy || POLICY,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const ENV = {
  NTH_CMS_SESSION_SECRET: SECRET, NTH_CMS_ACCOUNTS: "[]",
  NTH_CMS_GITHUB_TOKEN: "ghp_forge", NTH_CMS_REPO: "moi/mon-site",
};

test("un secret de session trop court arrête le pont avant toute chose", async () => {
  const { status } = await post({ action: "info" }, { env: { ...ENV, NTH_CMS_SESSION_SECRET: "court" } });
  assert.equal(status, 500);
});

test("seul POST est accepté", async () => {
  assert.equal((await post(null, { method: "GET" })).status, 405);
});

// SameSite=Strict tient déjà le cookie hors d'un POST inter-site. L'en-tête est
// la seconde serrure, et notre seul client l'envoie.
test("un en-tête CSRF absent ou faux est refusé", async () => {
  assert.equal((await post({ action: "info" }, { csrf: null })).status, 403);
  assert.equal((await post({ action: "info" }, { csrf: "autre" })).status, 403);
});

test("sans cookie, rien ne passe", async () => {
  assert.equal((await post({ action: "info" }, { signedIn: false })).status, 401);
});

// La fenêtre glissante garde un éditeur au travail connecté, mais le plafond
// fait mourir un cookie capturé même s'il sert toutes les minutes.
test("le plafond de session tue une session trop vieille malgré son sursis", async () => {
  const { status } = await post({ action: "info" }, { iat: NOW - 25 * 3600_000 });
  assert.equal(status, 401);
});

// Observé pour de vrai : un client en Latin-1 a envoyé `Métro` sur un octet et
// le site a publié `M<?>tro` sans que rien ne le signale.
test("un corps qui n'est pas de l'UTF-8 valide est refusé, pas réparé", async () => {
  const { status } = await post('{"action":"info","x":"M�tro"}');
  assert.equal(status, 400);
});

test("un corps plus gros que la limite est refusé sur sa taille", async () => {
  const { status } = await post({ action: "info", pad: "a".repeat(5000) });
  assert.equal(status, 413);
});

test("une action inconnue est refusée nommément", async () => {
  const { status } = await post({ action: "rm-rf" });
  assert.equal(status, 422);
});

test("un chemin hors liste blanche est refusé sans dire pourquoi", async () => {
  const { status, body } = await post({ action: "getEntry", params: { path: "package.json" } });
  assert.equal(status, 403);
  assert.ok(!/allow|liste|package/.test(body.error || ""), "le refus cartographie la liste blanche");
});

// Le rôle est vérifié sur le chemin, pas à l'entrée : un éditeur signe, ouvre
// l'éditeur, et se voit refuser le seul fichier que le gérant garde.
test("un rôle manquant refuse le fichier, pas la session", async () => {
  assert.equal((await post({ action: "getEntry", params: { path: "content/prix.json" } })).status, 403);
  assert.equal((await post({ action: "getEntry", params: { path: "content/prix.json" } },
    { roles: ["manager"], fetch: async () => ({ ok: true, status: 200, headers: new Headers(),
      json: async () => ({ content: Buffer.from("{}").toString("base64"), sha: "abc" }) }) })).status, 200);
});

test("mettre en ligne n'a pas de sens quand le site publie à l'enregistrement", async () => {
  const { status, body } = await post({ action: "publishSite" });
  assert.equal(status, 422);
  assert.ok(/enregistr|save/.test(body.error || ""), body.error);
});

/* ── le quota ────────────────────────────────────────────────────────────── */

const commits = n => async () => ({
  ok: true, status: 200, headers: new Headers(),
  json: async () => Array.from({ length: n }, () => ({
    commit: { committer: { date: new Date(NOW - 60_000).toISOString() } },
  })),
});

test("le quota compte les commits de la fenêtre et rend ce qui reste", async () => {
  const windows = await quotaUsage(async () => (await commits(1)()).json(), POLICY, "cms-content", NOW);
  assert.deepEqual(windows, [{ hours: 1, max: 2, used: 1, left: 1 }]);
});

test("une branche absente vaut zéro commit, pas une panne", async () => {
  const call = async () => { const e = new Error("nope"); e.status = 404; throw e; };
  assert.deepEqual(await quotaUsage(call, POLICY, "cms-content", NOW), [{ hours: 1, max: 2, used: 0, left: 2 }]);
});

test("une écriture au delà du quota est refusée avec la limite dans le message", async () => {
  const { status, body } = await post(
    { action: "persistEntry", params: { dataFiles: [{ path: "content/a.json", raw: "{}" }] } },
    { fetch: commits(2) });
  assert.equal(status, 429);
  assert.ok(/2/.test(body.error || ""), body.error);
});

test("un fichier plus gros que la limite est refusé avant d'atteindre GitHub", async () => {
  const { status } = await post(
    { action: "persistEntry", params: { dataFiles: [{ path: "content/a.json", raw: "a".repeat(200) }] } },
    { fetch: commits(0) });
  assert.equal(status, 413);
});

test("la distance entre production et contenu n'est comptée que si elles diffèrent", async () => {
  const call = async () => ({ ahead_by: 3 });
  assert.equal(await pendingCount(call, POLICY, "cms-content"), 3);
  assert.equal(await pendingCount(call, { productionBranch: "cms-content" }, "cms-content"), null);
  assert.equal(await pendingCount(async () => { throw new Error("404"); }, POLICY, "cms-content"), null);
});

/* ── outillage ────────────────────────────────────────────────────────────── */

// Frapper un enregistrement comme cms-account.mjs le fait, mais à un coût
// dérisoire : ce qui est jugé ici est le format, pas la lenteur.
function mint(password, N = 1024) {
  const salt = Buffer.from("selpourletest01", "utf8");
  const hash = scryptSync(password, salt, 32, { N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return ["scrypt", N, 8, 1, salt.toString("base64url"), hash.toString("base64url")].join("$");
}
