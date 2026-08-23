// Le pont qui se diagnostique lui-même. Ce que le dépôt ne peut pas savoir, il
// le sait : les droits du jeton, les variables du contexte servi, les branches.
import { test } from "node:test";
import assert from "node:assert/strict";

import { handle, signSession, envState, tokenExpiry } from "../null-to-hero/tools/cms/bridge.mjs";
import { cookiesFrom, verdict } from "../null-to-hero/tools/cms/cms-diagnose.mjs";

const SECRET = "x".repeat(48);
const POLICY = {
  branch: "cms-content", productionBranch: "cms", publish: "manual", locale: "fr",
  requiredRoles: [], sessionHours: 8, maxSessionHours: 24,
  maxFileBytes: 1024, maxRequestBytes: 4096, writeQuota: [],
  rules: [{ prefix: "content/", extensions: [".json"], roles: [] }],
};
const ACCOUNT = JSON.stringify([{ email: "a@b.fr", roles: ["editor"], password: "scrypt$1$1$1$AA$AA" }]);
const ENV = {
  NTH_CMS_SESSION_SECRET: SECRET, NTH_CMS_ACCOUNTS: ACCOUNT,
  NTH_CMS_GITHUB_TOKEN: "ghp_forge", NTH_CMS_REPO: "moi/mon-site",
};

const NOW = Date.parse("2026-08-19T10:00:00Z");
const claims = { sub: "a@b.fr", email: "a@b.fr", roles: ["editor"], csrf: "c", iat: NOW, exp: NOW + 3600_000 };

// Un faux GitHub : chaque route rend ce que la table dit, et une route absente
// rend 404, ce qui est exactement le cas que `diagnose` doit traverser sans
// tomber. Une valeur numérique dans la table est un statut de refus.
const forge = (routes, expiry) => async url => {
  const headers = new Headers(expiry ? { "github-authentication-token-expiration": expiry } : {});
  const path = String(url).replace("https://api.github.com/repos/moi/mon-site", "");
  const hit = Object.entries(routes).find(([k]) => path === k || path.startsWith(`${k}?`));
  if (!hit) return { ok: false, status: 404, headers, json: async () => ({}) };
  if (typeof hit[1] === "number") return { ok: false, status: hit[1], headers, json: async () => ({}) };
  return { ok: true, status: 200, headers, json: async () => hit[1] };
};

const call = async (routes, env = ENV, policy = POLICY, expiry = null) => {
  const req = new Request("https://site.fr/api/cms", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nth-csrf": "c",
      cookie: `__Host-nth_cms=${signSession(claims, SECRET)}`,
    },
    body: JSON.stringify({ action: "diagnose" }),
  });
  const res = await handle(req, env, { fetch: forge(routes, expiry), now: NOW, policy });
  return { status: res.status, body: await res.json() };
};

const FULL = {
  "": { full_name: "moi/mon-site" },
  "/git/blobs": { sha: "0".repeat(40) },
  "/branches/cms-content": { name: "cms-content" },
  "/branches/cms": { name: "cms" },
  "/actions/workflows/publish-content.yml/runs":
    { workflow_runs: [{ conclusion: "success", updated_at: "2026-08-18T09:00:00Z" }] },
};

test("un pont complet répond oui à tout ce qu'il peut constater", async () => {
  const { status, body } = await call(FULL);
  assert.equal(status, 200);
  assert.deepEqual(body.env, {
    session_secret: true, accounts: 1, github_token: true, repo: true,
  });
  assert.deepEqual(body.token,
    { reads: true, writes: true, expires_at: null, expires_in_days: null });
  assert.deepEqual(body.branches, { content: true, production: true });
  assert.equal(body.publish.workflow_readable, true);
  assert.equal(body.publish.last_run_ok, true);
  assert.equal(body.publish.last_run_at, "2026-08-18T09:00:00Z");
});

test("le diagnostic ne rend jamais une valeur de variable", async () => {
  const { body } = await call(FULL);
  const dump = JSON.stringify(body);
  for (const secret of [SECRET, "ghp_forge", "scrypt$1$1$1$AA$AA", "a@b.fr"]) {
    assert.ok(!dump.includes(secret), `${secret.slice(0, 8)} est sorti du pont`);
  }
});

// Le champ `permissions` du dépôt décrit le rôle du compte, pas le jeton : sur
// son propre dépôt il dirait "push" à un jeton en lecture seule. Le diagnostic
// doit donc lire le refus d'une écriture, et rien d'autre.
test("un jeton en lecture seule est nommé comme tel, pas comme une panne", async () => {
  const { body } = await call({ ...FULL, "": { permissions: { push: true } }, "/git/blobs": 403 });
  assert.equal(body.token.reads, true);
  assert.equal(body.token.writes, false);
  assert.ok(verdict(body).some(l => l.fatal && !l.ok && /Contents/.test(l.label)));
});

test("un refus qui n'est pas un interdit laisse la question ouverte", async () => {
  const { body } = await call({ ...FULL, "/git/blobs": 500 });
  assert.equal(body.token.writes, null);
  assert.ok(verdict(body).some(l => !l.ok && /pas pu être testé/.test(l.label)));
});

test("un jeton qui ne lit rien laisse ses droits inconnus plutôt que faux", async () => {
  const { body } = await call({});
  assert.equal(body.token.reads, false);
  assert.equal(body.token.writes, null);
  assert.equal(body.branches.content, false);
});

test("une branche de contenu absente est vue, et le reste du diagnostic tient", async () => {
  const routes = { ...FULL };
  delete routes["/branches/cms-content"];
  const { status, body } = await call(routes);
  assert.equal(status, 200);
  assert.equal(body.branches.content, false);
  assert.equal(body.token.writes, true);
});

test("sans branche de production distincte, la question ne se pose pas", async () => {
  const { body } = await call(FULL, ENV, { ...POLICY, productionBranch: "cms-content" });
  assert.equal(body.branches.production, null);
});

test("en publication manuelle, un flux illisible est une panne", async () => {
  const routes = { ...FULL };
  delete routes["/actions/workflows/publish-content.yml/runs"];
  const { body } = await call(routes);
  assert.equal(body.publish.workflow_readable, false);
  assert.ok(verdict(body).some(l => l.fatal && !l.ok && /Actions/.test(l.label)));
});

test("en publication à l'enregistrement, le même flux illisible est attendu", async () => {
  const routes = { ...FULL };
  delete routes["/actions/workflows/publish-content.yml/runs"];
  const { body } = await call(routes, ENV, { ...POLICY, publish: "simple" });
  assert.ok(!verdict(body).some(l => l.fatal && !l.ok && /Actions/.test(l.label)));
});

test("le flux nommé par la politique est celui qu'on interroge", async () => {
  const routes = { ...FULL, "/actions/workflows/mon-flux.yml/runs": { workflow_runs: [] } };
  delete routes["/actions/workflows/publish-content.yml/runs"];
  const { body } = await call(routes, ENV, { ...POLICY, publishWorkflow: "mon-flux.yml" });
  assert.equal(body.publish.workflow_readable, true);
  assert.equal(body.publish.last_run_at, null);
});

test("envState distingue la variable absente de la variable vide", () => {
  assert.equal(envState({ ...ENV, NTH_CMS_ACCOUNTS: undefined }).accounts, 0);
  assert.equal(envState({ ...ENV, NTH_CMS_ACCOUNTS: "pas du JSON" }).accounts, null);
  assert.equal(envState({ ...ENV, NTH_CMS_ACCOUNTS: "[]" }).accounts, 0);
  assert.equal(envState({ ...ENV, NTH_CMS_SESSION_SECRET: "trop court" }).session_secret, false);
  assert.equal(envState({ ...ENV, NTH_CMS_REPO: "sans-barre" }).repo, false);
});

// Un blob sans arbre ni commit ne référence rien et ne déclenche aucun build.
// Si l'épreuve d'écriture devenait un commit, elle publierait le site à chaque
// diagnostic.
test("l'épreuve d'écriture ne touche ni branche ni commit", async () => {
  const seen = [];
  const req = new Request("https://site.fr/api/cms", {
    method: "POST",
    headers: {
      "content-type": "application/json", "x-nth-csrf": "c",
      cookie: `__Host-nth_cms=${signSession(claims, SECRET)}`,
    },
    body: JSON.stringify({ action: "diagnose" }),
  });
  const spy = forge(FULL);
  await handle(req, ENV, {
    now: NOW, policy: POLICY,
    fetch: (url, init) => { seen.push([String(url), init?.method || "GET"]); return spy(url, init); },
  });
  const writes = seen.filter(([, method]) => method !== "GET");
  assert.deepEqual(writes.map(([url]) => url.split("/repos/moi/mon-site")[1]), ["/git/blobs"]);
  assert.ok(!seen.some(([url]) => /\/git\/(refs|commits|trees)/.test(url)));
});

/* ── l'expiration du jeton ────────────────────────────────────────────────── */

test("la date d'expiration se lit au format que GitHub envoie", () => {
  const at = tokenExpiry("2026-09-30 15:00:00 UTC", NOW);
  assert.equal(at.at, "2026-09-30T15:00:00.000Z");
  assert.equal(at.days, 42);
  assert.equal(tokenExpiry("", NOW), null, "un jeton sans date n'en invente pas");
  assert.equal(tokenExpiry("jamais", NOW), null, "une date illisible reste null");
});

test("un jeton qui expire bientôt est daté et signalé sans être une panne", async () => {
  const { body } = await call(FULL, ENV, POLICY, "2026-08-26 12:00:00 UTC");
  assert.equal(body.token.expires_in_days, 7);
  const line = verdict(body).find(l => /expire dans/.test(l.label));
  assert.ok(line && !line.ok && !line.fatal, "sept jours doit alerter sans faire échouer");
});

test("un jeton déjà expiré est une panne, et le diagnostic le dit ainsi", async () => {
  const { body } = await call(FULL, ENV, POLICY, "2026-08-17 12:00:00 UTC");
  assert.ok(body.token.expires_in_days < 0);
  assert.ok(verdict(body).some(l => l.fatal && !l.ok && /a expiré/.test(l.label)));
});

test("un jeton confortable ne déclenche rien", async () => {
  const { body } = await call(FULL, ENV, POLICY, "2027-08-19 12:00:00 UTC");
  assert.ok(verdict(body).every(l => l.ok || !/expir/.test(l.label)));
});

// L'en-tête arrive aussi sur un refus, et un refus est justement ce que rend un
// jeton mort : le lire seulement sur les réponses valides le rendrait muet
// exactement quand il sert.
test("la date se lit même quand GitHub refuse tout", async () => {
  const { body } = await call({}, ENV, POLICY, "2026-08-17 12:00:00 UTC");
  assert.equal(body.token.reads, false);
  assert.equal(body.token.expires_at, "2026-08-17T12:00:00.000Z");
});

test("le diagnostic exige une session, comme toute autre action", async () => {
  const req = new Request("https://site.fr/api/cms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "diagnose" }),
  });
  const res = await handle(req, ENV, { fetch: forge(FULL), now: NOW, policy: POLICY });
  assert.equal(res.status, 401);
});

test("les deux cookies du pont sont relus depuis l'en-tête, ensemble ou séparés", () => {
  const joined = new Headers();
  joined.append("set-cookie", "__Host-nth_cms=A; Path=/; Max-Age=1; Secure; HttpOnly");
  joined.append("set-cookie", "__Host-nth_cms_csrf=B; Path=/; Max-Age=1; Secure");
  const jar = cookiesFrom(joined);
  assert.equal(jar.get("__Host-nth_cms"), "A");
  assert.equal(jar.get("__Host-nth_cms_csrf"), "B");
});
