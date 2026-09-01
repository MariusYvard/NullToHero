// bridge.mjs — the write bridge between a Decap CMS admin page and one GitHub
// branch. `/siteasy entrust` copies this file verbatim to the client project as
// `netlify/functions/cms.mjs`; only `cms-policy.json` next to it is generated.
//
// WHY THIS FILE EXISTS
// --------------------
// Every shipped way of putting Decap in front of GitHub leaves a token with
// repository scope in `localStorage`, and none of them can restrict which paths
// an editor writes: not Decap, not its reference proxy server, and not GitHub,
// which has no per-directory permission for a fine-grained token or for an App.
// So the browser here holds nothing, and the allow-list below is not a hardening
// pass on top of the design, it is the design.
//
// The wire protocol is Decap's `proxy` backend, action for action, so a
// NullToHero editor can replace Decap later without this server changing. Shapes
// are taken from decap-cms-backend-proxy/src/implementation.ts and from
// decap-server/src/middlewares/localFs/index.ts, not from documentation.
//
// WHO IS ALLOWED IN
// -----------------
// The accounts are this bridge's own, minted by `cms-account.mjs` and carried in
// one environment variable. There is no identity provider behind it, and that is
// the point: with Netlify Identity, whether a stranger could sign in depended on
// the site owner having switched registration to invite only in a console we do
// not control, and a missed switch is silent. Here the only accounts that exist
// are the ones somebody typed a command to create.
//
// Passwords are never stored. What the variable holds is a scrypt derivation,
// with its parameters, its salt and a random per-account pepper of nothing: the
// salt is per account and the work factor is written into the record, so raising
// it later does not invalidate the accounts already minted.
//
// Environment:
//   NTH_CMS_SESSION_SECRET   32+ random bytes, signs the session cookie
//   NTH_CMS_ACCOUNTS         JSON array from cms-account.mjs, never in the repo
//   NTH_CMS_GITHUB_TOKEN     fine-grained PAT, Contents: write, Workflows: none
//   NTH_CMS_REPO             "owner/repo"
//
// `writeQuota` in the policy caps how many commits this site may land per
// window, which is what keeps one client from spending an agency's whole build
// allowance. It is counted from the branch history, not from anything this
// function remembers.
//
// The file exports its pure parts so `tests/cms-bridge.mjs` can forge requests
// against them without a network or a Netlify runtime.

import { createHmac, timingSafeEqual, randomBytes, createHash, scryptSync } from "node:crypto";
import POLICY from "./cms-policy.json" with { type: "json" };

export const config = { path: ["/api/cms", "/api/cms/session"] };

const COOKIE = "__Host-nth_cms";
const CSRF_COOKIE = "__Host-nth_cms_csrf";
const CSRF_HEADER = "x-nth-csrf";
const GITHUB = "https://api.github.com";

/* ── the allow-list ───────────────────────────────────────────────────────── */

// A rule prefix that ends in "/" is a directory and matches on a directory
// boundary, so `content/` accepts `content/a.md` and refuses `content-secret/a.md`.
// That neighbouring-prefix case is the one decap-server gets wrong: its only
// check resolves the path and compares strings, so `../content-secret` under a
// repo named `content` passes. A prefix without a trailing slash is one exact file.
export function loadPolicy(policy = POLICY) {
  const bad = why => { throw new Error(`cms-policy.json: ${why}`); };
  if (!Array.isArray(policy.rules) || !policy.rules.length) bad("no rules");
  if (!Array.isArray(policy.requiredRoles)) bad("requiredRoles must be a list");
  if (!Array.isArray(policy.writeQuota)) bad("writeQuota must be a list of windows");
  for (const w of policy.writeQuota) {
    if (!(w.hours > 0) || !(w.max > 0)) bad(`window ${JSON.stringify(w)} needs hours and max`);
    // One page of commit history answers the question. A cap above a page would
    // need pagination, and a quota that silently stopped counting at 100 would
    // read as "no limit" exactly when the limit matters.
    if (w.max > 100) bad(`window of ${w.hours}h caps at 100, not ${w.max}`);
  }
  for (const rule of policy.rules) {
    const p = rule.prefix;
    if (typeof p !== "string" || !p || p.startsWith("/") || p.includes("..") || p.startsWith("./")) {
      bad(`refusing rule prefix ${JSON.stringify(p)}`);
    }
    if (!Array.isArray(rule.roles)) bad(`rule ${p} has no roles list`);
    // A directory rule with no extension filter is a directory-wide write
    // permission. That is never what a content allow-list means, so it is a
    // configuration error rather than a permissive default.
    if (!Array.isArray(rule.extensions)) bad(`rule ${p} has no extensions list`);
    if (p.endsWith("/") && !rule.extensions.length) bad(`directory rule ${p} must name its extensions`);
  }
  return policy;
}

const BAD = /[\\\0#?%]|[\x00-\x1f\x7f]|(^|\/)\.\.(\/|$)|\/\//;

// Returns null when the path is allowed, otherwise the reason it is not. The
// reason is for the log; the client is told "path not allowed" and nothing more,
// because a precise refusal maps the allow-list for whoever is probing it.
export function checkPath(path, policy, roles = []) {
  if (typeof path !== "string" || !path || path.length > 512) return "shape";
  if (path.startsWith("/") || BAD.test(path)) return "traversal";
  // La règle exacte gagne sur la règle de dossier qui la contient. Avec un
  // simple `find`, c'est l'ordre du fichier de politique qui décidait, et un
  // fichier réservé à un rôle posé sous un dossier ouvert était ouvert à tous.
  const rule = policy.rules.find(r => !r.prefix.endsWith("/") && path === r.prefix)
    || policy.rules.find(r => r.prefix.endsWith("/") && path.startsWith(r.prefix));
  if (!rule) return "outside the allow-list";
  const dot = path.lastIndexOf(".");
  const ext = dot > path.lastIndexOf("/") ? path.slice(dot).toLowerCase() : "";
  if (rule.extensions.length && !rule.extensions.includes(ext)) return `extension ${ext || "none"}`;
  if (rule.roles.length && !rule.roles.some(r => roles.includes(r))) return "role";
  return null;
}

/* ── the accounts ─────────────────────────────────────────────────────────── */

// `scrypt$N$r$p$salt$hash`, all base64url. Reading the parameters from the record
// rather than from a constant is what lets the cost be raised without locking
// out everybody minted before the change.
export function verifyPassword(password, record) {
  const parts = String(record || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, salt, expected] = parts;
  const want = Buffer.from(expected, "base64url");
  if (!want.length) return false;
  let got;
  try {
    got = scryptSync(String(password), Buffer.from(salt, "base64url"), want.length, {
      N: Number(N), r: Number(r), p: Number(p),
      // Node caps scrypt memory at 32 MB by default, which N=32768 exceeds.
      maxmem: 256 * 1024 * 1024,
    });
  } catch { return false; }
  return timingSafeEqual(got, want);
}

export function loadAccounts(raw) {
  let list;
  try { list = JSON.parse(raw || "[]"); } catch { throw new Error("NTH_CMS_ACCOUNTS is not JSON"); }
  if (!Array.isArray(list)) throw new Error("NTH_CMS_ACCOUNTS is not a list");
  return list.map(a => ({
    email: String(a.email || "").trim().toLowerCase(),
    roles: Array.isArray(a.roles) ? a.roles : [],
    password: String(a.password || ""),
  })).filter(a => a.email && a.password);
}

// CE QUE LE PONT SAIT DE SA PROPRE CONFIGURATION
// ----------------------------------------------
// En booléens et en nombres, jamais en valeurs. `diagnose` répond avec ceci, et
// un diagnostic qui rendrait la valeur d'une variable serait une fuite de
// variable. Le nombre de comptes suffit à distinguer les trois états qui se
// ressemblent depuis l'extérieur : variable absente, variable posée sur le
// mauvais contexte de déploiement, variable posée mais vide.
export function envState(env, secret = env.NTH_CMS_SESSION_SECRET) {
  let accounts = null;
  try { accounts = loadAccounts(env.NTH_CMS_ACCOUNTS).length; } catch { accounts = null; }
  return {
    session_secret: Boolean(secret) && String(secret).length >= 32,
    accounts,                       // null : la variable est absente ou illisible
    github_token: Boolean(env.NTH_CMS_GITHUB_TOKEN),
    repo: /^[^/\s]+\/[^/\s]+$/.test(String(env.NTH_CMS_REPO || "")),
  };
}

// An unknown email still pays for one derivation, so the answer takes the same
// time whether or not the account exists. Otherwise the login route is an oracle
// that tells anyone which addresses are worth attacking.
const DECOY = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function authenticate(email, password, accounts) {
  const wanted = String(email || "").trim().toLowerCase();
  const found = accounts.find(a => a.email === wanted);
  const ok = verifyPassword(password, found ? found.password : DECOY);
  return ok && found ? found : null;
}

/* ── the session ──────────────────────────────────────────────────────────── */
//
// The password is derived once, at login, and never again: scrypt is deliberately
// slow, so paying for it on every action would make the editor unusable. What
// every later request carries is a cookie this server signed, which costs one
// HMAC to check.

const b64u = buf => Buffer.from(buf).toString("base64url");

export function signSession(claims, secret) {
  const body = b64u(JSON.stringify(claims));
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const got = Buffer.from(token.slice(dot + 1), "base64url");
  const want = createHmac("sha256", secret).update(body).digest();
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  let claims;
  try { claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); }
  catch { return null; }
  if (!claims || typeof claims.exp !== "number" || claims.exp <= now) return null;
  return claims;
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const name = part.slice(0, eq).trim();
    if (!(name in out)) out[name] = part.slice(eq + 1).trim();
  }
  return out;
}

const setCookie = (name, value, maxAge, httpOnly = true) =>
  `${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Strict` +
  (httpOnly ? "; HttpOnly" : "");

/* ── GitHub ───────────────────────────────────────────────────────────────── */

const encodePath = path => path.split("/").map(encodeURIComponent).join("/");

// QUAND LE JETON MEURT
// --------------------
// GitHub joint la date d'expiration du jeton à chaque réponse REST faite avec
// lui, dans un en-tête, au format `2026-12-31 15:00:00 UTC`. Elle ne coûte donc
// aucun appel : elle est déjà là, sur les appels que le pont fait de toute
// façon. Un jeton à durée illimitée n'a pas d'en-tête, ce qui se lit `null`
// plutôt que "jamais" : le pont ne sait pas la différence entre pas d'en-tête et
// pas de date.
export function tokenExpiry(raw, now = Date.now()) {
  if (!raw) return null;
  const at = Date.parse(String(raw).replace(" UTC", "Z").replace(" ", "T"));
  if (!Number.isFinite(at)) return null;
  return { at: new Date(at).toISOString(), days: Math.floor((at - now) / 86_400_000) };
}

// En dessous, le pont le dit dans le journal de l'hébergeur à chaque action.
// Trois semaines laissent le temps de frapper un jeton, de poser la variable et
// de redéployer sans travailler un dimanche.
export const EXPIRY_WARN_DAYS = 21;

function github(env, fetchImpl, quota) {
  let expiry = null;
  const call = async (path, init = {}) => {
    const res = await fetchImpl(`${GITHUB}/repos/${env.NTH_CMS_REPO}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${env.NTH_CMS_GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
    });
    // L'en-tête arrive aussi sur un refus, et un refus est justement ce que rend
    // un jeton expiré : la lire ici plutôt qu'après le `if` est ce qui permet de
    // dire "il a expiré" au lieu de "GitHub a refusé".
    expiry = (res.headers && res.headers.get("github-authentication-token-expiration")) || expiry;
    if (!res.ok) {
      console.error(JSON.stringify({ cms: "github", status: res.status, path }));
      const err = res.status === 404
        ? new HttpError(404, "not found")
        : new HttpError(502, "upstream refused the write");
      // Le statut d'origine ne sort jamais vers le navigateur ; `diagnose` en a
      // besoin en interne pour séparer "interdit" de "cassé".
      err.upstream = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  };
  return {
    call,
    get expiryHeader() { return expiry; },
    // Contents returns an empty string past one megabyte and hands over a blob sha.
    async read(path, branch) {
      const meta = await call(`/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`);
      if (meta.content) return { sha: meta.sha, buffer: Buffer.from(meta.content, "base64") };
      const blob = await call(`/git/blobs/${meta.sha}`);
      return { sha: meta.sha, buffer: Buffer.from(blob.content, "base64") };
    },
    async tree(branch) {
      const t = await call(`/git/trees/${encodeURIComponent(branch)}?recursive=1`);
      if (t.truncated) throw new HttpError(502, "repository tree is truncated");
      return t.tree.filter(e => e.type === "blob");
    },
    // One commit for the whole entry, so a half-written entry cannot be deployed.
    // A tree entry with a null sha is how the Git Data API expresses a deletion.
    async commit({ branch, message, writes = [], deletes = [] }) {
      const windows = quota ? await quota(call, branch) : [];
      const over = windows.find(w => w.used >= w.max);
      if (over) {
        throw new HttpError(429,
          `this site is limited to ${over.max} changes per ${over.hours}h and has used ${over.used}`,
          { key: "quota", ...over });
      }
      // Ce commit-ci compte. Le rendre avec la réponse évite au navigateur de
      // redemander l'état, et donc à GitHub une lecture d'historique de plus.
      this.lastQuota = windows.map(w => ({
        hours: w.hours, max: w.max, used: w.used + 1, left: Math.max(0, w.left - 1),
      }));
      const ref = await call(`/git/ref/heads/${encodeURIComponent(branch)}`);
      const head = await call(`/git/commits/${ref.object.sha}`);
      const blobs = await Promise.all(writes.map(w =>
        call("/git/blobs", {
          method: "POST",
          body: JSON.stringify({ content: w.buffer.toString("base64"), encoding: "base64" }),
        }).then(b => ({ path: w.path, mode: "100644", type: "blob", sha: b.sha }))));
      const tree = await call("/git/trees", {
        method: "POST",
        body: JSON.stringify({
          base_tree: head.tree.sha,
          tree: [...blobs, ...deletes.map(p => ({ path: p, mode: "100644", type: "blob", sha: null }))],
        }),
      });
      const made = await call("/git/commits", {
        method: "POST",
        body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
      });
      await call(`/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: "PATCH", body: JSON.stringify({ sha: made.sha }),
      });
      return made.sha;
    },
  };
}

// WHY THE COUNTER LIVES IN GIT
// ----------------------------
// What costs an agency money is not a request, it is a build: every commit on
// the content branch fires the publish workflow, which commits to production,
// which spends Netlify build minutes. So the thing to count is commits, and the
// branch already is that count. A Netlify function instance is ephemeral, so an
// in-memory counter would reset under load, which is when it would be needed;
// any durable store would be one more service to run and to keep in sync with
// the branch it is supposed to describe.
//
// One page of history covers every window, because loadPolicy refuses a cap
// above a page.
// Ce que chaque fenêtre a consommé. Un client qui apprend la limite au moment
// du refus a déjà écrit son texte : mieux vaut la lui montrer avant.
export async function quotaUsage(call, policy, branch, now) {
  if (!policy.writeQuota.length) return [];
  const longest = Math.max(...policy.writeQuota.map(w => w.hours));
  const since = new Date(now - longest * 3600_000).toISOString();
  const commits = await call(
    `/commits?sha=${encodeURIComponent(branch)}&since=${since}&per_page=100`,
  ).catch(e => (e.status === 404 ? [] : Promise.reject(e)));
  const dates = commits.map(c => Date.parse(c.commit?.committer?.date || 0));
  return policy.writeQuota.map(w => {
    const used = dates.filter(d => d >= now - w.hours * 3600_000).length;
    return { hours: w.hours, max: w.max, used, left: Math.max(0, w.max - used) };
  });
}

// La distance entre la production et le contenu, en nombre de commits. GitHub
// répond 404 si l'une des deux branches n'existe pas encore : rien en attente
// vaut mieux qu'une erreur qui empêche l'éditeur de s'ouvrir.
export async function pendingCount(call, policy, branch) {
  const base = policy.productionBranch;
  if (!base || base === branch) return null;
  const out = await call(
    `/compare/${encodeURIComponent(base)}...${encodeURIComponent(branch)}`,
  ).catch(() => null);
  return out && typeof out.ahead_by === "number" ? out.ahead_by : null;
}

async function overQuota(call, policy, branch, now) {
  const windows = await quotaUsage(call, policy, branch, now);
  return windows.find(w => w.used >= w.max) || null;
}

// Les couples chemin/valeur d'un objet imbriqué, à plat.
function* flatten(node, prefix = "") {
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") yield* flatten(value, path);
    else if (value != null) yield [path, value];
  }
}

class HttpError extends Error {
  constructor(status, message, params) { super(message); this.status = status; this.params = params; }
}

// The log always speaks English, because the agency reads it. What the editor
// shows the person signing in follows the site's declared locale.
//
// The table is keyed by the English message, so a call site that refuses is
// unchanged and a locale with no entry falls back on its own. An entry may be a
// function when the message carries numbers.
//
// ponytail: one table in one file. Move it out when a third locale arrives, or
// when a client asks for wording of their own.
const SAY = {
  fr: {
    "not signed in": "Vous n'êtes pas connecté.",
    "session expired": "Votre session a expiré. Rechargez la page et reconnectez-vous.",
    "wrong email or password": "Adresse ou mot de passe incorrect.",
    "this account has no editing role": "Ce compte n'a pas le droit de modifier ce site.",
    "email and password are required": "L'adresse et le mot de passe sont obligatoires.",
    "path not allowed": "Ce fichier n'est pas modifiable depuis l'éditeur.",
    "file too large": "Ce fichier est trop lourd.",
    "request too large": "L'envoi est trop lourd.",
    "the request body is not valid UTF-8": "Le texte envoyé n'est pas encodé en UTF-8.",
    "invalid JSON": "L'envoi est illisible.",
    "bad csrf token": "Jeton de sécurité invalide. Rechargez la page.",
    "not found": "Introuvable.",
    "nothing to persist": "Rien à enregistrer.",
    "nothing to delete": "Rien à supprimer.",
    "assets must be base64": "Ce fichier n'est pas lisible.",
    "bridge is not configured": "Le site n'est pas configuré pour l'édition.",
    "upstream refused the write": "L'enregistrement a été refusé. Réessayez dans un instant.",
    "repository tree is truncated": "Le dépôt est trop grand pour être lu d'un coup.",
    "bridge error": "Une erreur est survenue.",
    quota: p =>
      `Ce site est limité à ${p.max} modifications par ${p.hours} h et en a déjà utilisé ${p.used}.`,
  },
};

export function say(locale, message, params) {
  const table = SAY[locale];
  const entry = table && (params && params.key ? table[params.key] : table[message]);
  if (typeof entry === "function") return entry(params);
  return entry || message;
}

const json = (body, status = 200, headers) => {
  const h = headers instanceof Headers
    ? headers
    : new Headers({ "content-type": "application/json; charset=utf-8", ...headers });
  return new Response(JSON.stringify(body), { status, headers: h });
};

// Decap parses the error body before it builds its message, so an empty body on a
// non-2xx turns into a client-side crash instead of a visible failure.
const fail = (status, message) => json({ error: message }, status);

const mediaFile = (path, buffer, sha) => ({
  id: sha || createHash("sha256").update(buffer).digest("hex"),
  content: buffer.toString("base64"),
  encoding: "base64",           // any other value makes Decap build an empty file, silently
  path,
  name: path.slice(path.lastIndexOf("/") + 1),
});

/* ── the actions ──────────────────────────────────────────────────────────── */

async function act(body, ctx) {
  const { gh, policy, roles, branch } = ctx;
  const p = body.params || {};
  const guard = path => {
    const why = checkPath(path, policy, roles);
    if (why) throw new HttpError(403, "path not allowed");
    return path;
  };
  const entry = async path => {
    const { buffer, sha } = await gh.read(path, branch).catch(e =>
      e.status === 404 ? { buffer: null, sha: null } : Promise.reject(e));
    return { data: buffer && buffer.toString("utf8"), file: { path, id: sha } };
  };

  switch (body.action) {
    case "info": {
      // Le quota coûte un appel à GitHub. `info` est demandé une fois à
      // l'ouverture de l'éditeur puis après chaque enregistrement, et un jeton
      // qui ne répond pas ne doit pas empêcher l'éditeur de s'ouvrir.
      const quota = await quotaUsage(gh.call, ctx.policy, branch, ctx.now)
        .catch(e => { console.error(JSON.stringify({ cms: "quota-unreadable", why: e.message })); return []; });
      // En publication manuelle, ce qui est enregistré attend sur la branche de
      // contenu. Le nombre d'écritures en attente est la distance entre les
      // deux branches, et il n'a de sens que dans ce mode.
      const pending = ctx.policy.publish === "manual" ? await pendingCount(gh.call, ctx.policy, branch) : null;
      return { repo: ctx.repo, publish_modes: ["simple"], type: "nth_bridge", quota, pending,
               publish: ctx.policy.publish };
    }

    case "entriesByFolder": {
      // `depth` counts directory levels from the folder itself, as decap-server does.
      const folder = String(p.folder || "").replace(/\/+$/, "");
      const ext = String(p.extension || "");
      const depth = Number(p.depth) || 1;
      const files = (await gh.tree(branch))
        .map(e => e.path)
        .filter(path => path.startsWith(`${folder}/`))
        .filter(path => path.slice(folder.length + 1).split("/").length <= depth)
        .filter(path => path.endsWith(ext))
        .filter(path => !checkPath(path, policy, roles));
      return Promise.all(files.map(entry));
    }

    case "entriesByFiles": {
      // Guard the whole list before reading any of it, so one refused path
      // refuses the request instead of leaving a half-served response behind.
      const paths = (p.files || []).map(f => guard(f.path));
      return Promise.all(paths.map(entry));
    }

    case "getEntry":
      return entry(guard(p.path));

    case "getMedia": {
      const folder = String(p.mediaFolder || "").replace(/\/+$/, "");
      const files = (await gh.tree(branch))
        .filter(e => e.path.startsWith(`${folder}/`))
        .filter(e => e.path.slice(folder.length + 1).indexOf("/") === -1)
        .filter(e => !checkPath(e.path, policy, roles));
      return Promise.all(files.map(async e => {
        const { buffer, sha } = await gh.read(e.path, branch);
        return mediaFile(e.path, buffer, sha);
      }));
    }

    case "getMediaFile": {
      const { buffer, sha } = await gh.read(guard(p.path), branch);
      return mediaFile(p.path, buffer, sha);
    }

    case "persistEntry": {
      const dataFiles = p.dataFiles || (p.entry ? [p.entry] : []);
      const writes = [], deletes = [];
      for (const f of dataFiles) {
        const target = f.newPath || f.path;
        writes.push({ path: guard(target), buffer: sized(Buffer.from(String(f.raw), "utf8"), policy) });
        if (f.newPath && f.newPath !== f.path) deletes.push(guard(f.path));
      }
      for (const a of p.assets || []) {
        writes.push({ path: guard(a.path), buffer: sized(decode(a), policy) });
      }
      if (!writes.length) throw new HttpError(422, "nothing to persist");
      await gh.commit({ branch, message: message(p, `Update ${writes.length} file(s)`), writes, deletes });
      return { message: "entry persisted", quota: gh.lastQuota };
    }

    // Chercher une phrase, pas une page. La recherche de Decap ne regarde que la
    // collection ouverte et rend l'entrée sans dire quel champ correspond, ce
    // qui ne suffit pas quand une entrée porte soixante champs repliés.
    //
    // Seuls les fichiers exacts de la liste blanche sont lus, donc la recherche
    // ne voit rien que l'éditeur ne puisse déjà ouvrir. Les lectures partent
    // ensemble : une par fichier, en parallèle.
    case "searchContent": {
      const needle = String(p.query || "").trim().toLowerCase();
      if (needle.length < 2) return { matches: [] };
      const paths = policy.rules.filter(r => !r.prefix.endsWith("/")).map(r => r.prefix);
      const limit = Math.min(Number(p.limit) || 40, 100);
      const files = await Promise.all(paths.map(path => gh.read(path, branch)
        .then(out => ({ path, text: out.buffer.toString("utf8") }))
        .catch(() => null)));
      const matches = [];
      for (const file of files.filter(Boolean)) {
        let data;
        try { data = JSON.parse(file.text); } catch { continue; }
        for (const [field, value] of flatten(data)) {
          if (!String(value).toLowerCase().includes(needle)) continue;
          matches.push({ file: file.path, field, value: String(value).slice(0, 160) });
          if (matches.length >= limit) return { matches, truncated: true };
        }
      }
      return { matches, truncated: false };
    }

    // Mettre en ligne, c'est demander au flux de travail de copier les chemins
    // autorisés vers la branche de production. Le pont ne copie pas lui-même :
    // le copieur vit dans .github/, hors de portée du jeton, et c'est ce qui
    // fait qu'un pont compromis ne peut pas réécrire le site publié.
    case "publishSite": {
      if (ctx.policy.publish !== "manual") throw new HttpError(422, "this site publishes on save");
      const file = ctx.policy.publishWorkflow || "publish-content.yml";
      await gh.call(`/actions/workflows/${encodeURIComponent(file)}/dispatches`, {
        method: "POST",
        body: JSON.stringify({ ref: branch }),
      });
      return { message: "publish requested" };
    }

    // Revenir en arrière se fait en deux temps. Ici, l'existence d'une version
    // précédente et sa date : un appel, aucune lecture de contenu, pour un
    // bouton qui ne servira peut-être pas.
    case "previousEntry": {
      const path = guard(p.path);
      const commits = await gh.call(
        `/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=2`,
      ).catch(e => (e.status === 404 ? [] : Promise.reject(e)));
      if (!Array.isArray(commits) || commits.length < 2) return { found: false };
      const prev = commits[1];
      return { found: true, sha: prev.sha, at: prev.commit?.committer?.date || null };
    }

    // Et ici l'écriture. Le contenu est relu côté serveur à la révision
    // demandée : le navigateur ne l'a jamais eu, il ne peut donc pas le
    // remplacer par autre chose en chemin.
    case "restoreEntry": {
      const path = guard(p.path);
      const sha = String(p.sha || "");
      if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new HttpError(422, "bad revision");
      const { buffer } = await gh.read(path, sha);
      await gh.commit({
        branch,
        message: message(p, `Restore ${path} to ${sha.slice(0, 7)}`),
        writes: [{ path, buffer: sized(buffer, policy) }],
      });
      return { message: "entry restored", quota: gh.lastQuota };
    }

    case "persistMedia": {
      const a = p.asset || {};
      const buffer = sized(decode(a), policy);
      await gh.commit({ branch, message: message(p, `Upload ${a.path}`), writes: [{ path: guard(a.path), buffer }] });
      const { sha } = await gh.read(a.path, branch);
      // Decap désérialise cette réponse en objet média, elle garde sa forme
      // exacte. Ce qui reste du quota suivra le prochain enregistrement.
      return mediaFile(a.path, buffer, sha);
    }

    case "deleteFiles": {
      const paths = (p.paths || []).map(guard);
      if (!paths.length) throw new HttpError(422, "nothing to delete");
      await gh.commit({ branch, message: message(p, `Delete ${paths.length} file(s)`), deletes: paths });
      return { message: `deleted files ${paths.join(", ")}`, quota: gh.lastQuota };
    }

    case "getDeployPreview":
      return null;

    // TROIS DES QUATRE QUESTIONS QUE CMS.md LAISSE OUVERTES
    // -----------------------------------------------------
    // La fiche de mise en service finit par ce qu'aucun contrôle ne peut établir
    // depuis le dépôt : les droits réels du jeton, les variables posées sur le
    // bon contexte, la branche que l'hébergeur déploie, le DNS. Les trois
    // premières se répondent d'ici et de nulle part ailleurs, parce que le pont
    // tourne dans le contexte servi et qu'il tient le jeton. La quatrième reste
    // dehors : le pont ne sait pas par quel nom on l'a joint.
    //
    // Aucun appel n'est fatal. Un pont à moitié configuré est exactement le cas
    // où l'on demande le diagnostic, et un diagnostic qui refuse de répondre
    // parce qu'une brique manque ne diagnostique rien.
    case "diagnose": {
      const probe = path => gh.call(path).catch(() => null);
      const file = policy.publishWorkflow || "publish-content.yml";
      const separate = Boolean(policy.productionBranch) && policy.productionBranch !== branch;
      const [repo, content, production, runs] = await Promise.all([
        probe(""),
        probe(`/branches/${encodeURIComponent(branch)}`),
        separate ? probe(`/branches/${encodeURIComponent(policy.productionBranch)}`) : null,
        probe(`/actions/workflows/${encodeURIComponent(file)}/runs?per_page=1`),
      ]);
      const run = runs && Array.isArray(runs.workflow_runs) ? runs.workflow_runs[0] : null;
      const writes = await gh.call("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: "nth-diagnose", encoding: "utf-8" }),
      }).then(() => true).catch(e => (e.upstream === 403 ? false : null));
      const expires = tokenExpiry(gh.expiryHeader, ctx.now);
      return {
        env: ctx.config,
        token: {
          reads: Boolean(repo),
          // POURQUOI UNE ÉCRITURE PLUTÔT QU'UNE LECTURE DE DROITS
          // ----------------------------------------------------
          // Le champ `permissions` des métadonnées du dépôt décrit le rôle du
          // compte propriétaire du jeton, pas ce que ce jeton-là s'est vu
          // accorder. Sur le dépôt de son propre auteur il rend `push: true`
          // quel que soit le jeton, donc il répondrait oui à un jeton en
          // lecture seule. La seule question sans ambiguïté est celle qu'on
          // pose à l'écriture elle-même.
          //
          // Un blob créé sans arbre ni commit ne référence rien, n'apparaît sur
          // aucune branche, ne déclenche aucun build et ne compte pas dans le
          // quota, qui compte des commits. GitHub le ramasse tout seul.
          writes,
          expires_at: expires ? expires.at : null,
          expires_in_days: expires ? expires.days : null,
        },
        branches: {
          content: Boolean(content),
          production: separate ? Boolean(production) : null,
        },
        // Un flux illisible veut dire un jeton sans Actions. C'est l'état normal
        // en publication automatique, et une panne en publication manuelle :
        // `publishSite` ne pourra pas déclencher la mise en ligne.
        publish: {
          mode: policy.publish,
          workflow_readable: Boolean(runs),
          last_run_at: run?.updated_at || null,
          last_run_ok: run ? run.conclusion === "success" : null,
        },
      };
    }

    default:
      throw new HttpError(422, `Unknown action ${body.action}`);
  }
}

const message = (p, fallback) =>
  typeof p.options?.commitMessage === "string" && p.options.commitMessage.trim()
    ? p.options.commitMessage.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 500)
    : fallback;

function decode(asset) {
  if (asset.encoding !== "base64") throw new HttpError(422, "assets must be base64");
  return Buffer.from(String(asset.content || ""), "base64");
}

function sized(buffer, policy) {
  if (buffer.length > policy.maxFileBytes) throw new HttpError(413, "file too large");
  return buffer;
}

/* ── the two routes ───────────────────────────────────────────────────────── */

export async function handle(req, env, deps = {}) {
  const fetchImpl = deps.fetch || globalThis.fetch;
  const now = deps.now || Date.now();
  const policy = loadPolicy(deps.policy);
  const secret = env.NTH_CMS_SESSION_SECRET;
  if (!secret || secret.length < 32) return fail(500, "bridge is not configured");
  if (req.method !== "POST") return fail(405, "POST only");

  const url = new URL(req.url);
  const raw = await req.text();
  if (Buffer.byteLength(raw) > policy.maxRequestBytes) return fail(413, say(policy.locale, "request too large"));
  // `req.text()` replaces every byte it cannot decode with U+FFFD rather than
  // failing, so a client that posts Latin-1 gets its accents silently turned into
  // replacement characters and committed. Observed for real: a test harness sent
  // `Métro` as one byte and the site published `M<?>tro` with nothing reported.
  if (raw.includes("\uFFFD")) return fail(400, say(policy.locale, "the request body is not valid UTF-8"));

  let body;
  try { body = JSON.parse(raw || "{}"); } catch { return fail(400, say(policy.locale, "invalid JSON")); }

  if (url.pathname.endsWith("/session")) return session(body, env, policy, secret, now, fetchImpl);

  const claims = verifySession(cookies(req)[COOKIE], secret, now);
  if (!claims) return fail(401, say(policy.locale, "not signed in"));
  // The sliding window keeps a working editor signed in; the ceiling means a
  // captured cookie dies on its own even if it is used every minute.
  if (now > (claims.iat || 0) + policy.maxSessionHours * 3600_000) return fail(401, say(policy.locale, "session expired"));
  // SameSite=Strict already keeps this cookie off a cross-site POST. The header
  // is the second lock, and our backend is the only client that sends it.
  if (req.headers.get(CSRF_HEADER) !== claims.csrf) return fail(403, say(policy.locale, "bad csrf token"));

  const branch = policy.branch;
  const ctx = {
    gh: github(env, fetchImpl, (call, b) => quotaUsage(call, policy, b, now)),
    policy, roles: claims.roles || [], branch, repo: env.NTH_CMS_REPO, now,
    config: envState(env, secret),
  };
  // UN JETON QUI EXPIRE NE PRÉVIENT PAS
  // -----------------------------------
  // Il cesse simplement d'écrire, un mardi, et le client appelle en disant que
  // l'éditeur est cassé. La date est dans les réponses de GitHub, donc elle ne
  // coûte rien : la dire dans le journal de l'hébergeur pendant les trois
  // semaines qui précèdent transforme une panne en rendez-vous.
  const warnExpiry = () => {
    const left = tokenExpiry(ctx.gh.expiryHeader, now);
    if (left && left.days <= EXPIRY_WARN_DAYS) {
      console.warn(JSON.stringify({ cms: "token-expiry", days: left.days, at: left.at }));
    }
  };

  try {
    const out = await act(body, ctx);
    warnExpiry();
    // Le diagnostic n'écrit rien mais il lit la configuration : qui l'a demandé
    // et quand appartient au journal de l'hébergeur au même titre qu'une écriture.
    if (WRITES.has(body.action) || body.action === "diagnose") {
      console.log(JSON.stringify({
        cms: body.action, who: claims.email, at: new Date(now).toISOString(),
        paths: pathsOf(body), bytes: Buffer.byteLength(raw),
      }));
    }
    return json(out, 200, refresh(claims, secret, now, policy));
  } catch (e) {
    // Surtout ici : un jeton expiré se manifeste par un refus de GitHub, et
    // "expiré depuis deux jours" est une réponse là où "502" n'en est pas une.
    warnExpiry();
    if (e instanceof HttpError) {
      console.log(JSON.stringify({ cms: body.action, who: claims.email, refused: e.message }));
      if (e.status === 429) console.warn(JSON.stringify({ cms: "quota", repo: env.NTH_CMS_REPO, at: new Date(now).toISOString() }));
      return fail(e.status, say(policy.locale, e.message, e.params));
    }
    console.error(e);
    return fail(500, say(policy.locale, "bridge error"));
  }
}

const WRITES = new Set(["persistEntry", "persistMedia", "deleteFiles", "restoreEntry"]);

const pathsOf = body => {
  const p = body.params || {};
  return [
    ...(p.dataFiles || []).map(f => f.newPath || f.path),
    ...(p.assets || []).map(a => a.path),
    ...(p.asset ? [p.asset.path] : []),
    ...(p.paths || []),
    // Un retour en arrière est une écriture d'un seul fichier, nommé directement.
    ...(p.path ? [p.path] : []),
  ];
};

// Sliding window: every accepted action pushes the expiry back, so an editor who
// keeps working is never logged out mid-entry, and a closed tab expires on time.
function refresh(claims, secret, now, policy) {
  const ttl = policy.sessionHours * 3600;
  const next = signSession({ ...claims, exp: now + ttl * 1000 }, secret);
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append("set-cookie", setCookie(COOKIE, next, ttl));
  headers.append("set-cookie", setCookie(CSRF_COOKIE, claims.csrf, ttl, false));
  return headers;
}

async function session(body, env, policy, secret, now, fetchImpl) {
  if (body.action === "logout") {
    const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
    headers.append("set-cookie", setCookie(COOKIE, "", 0));
    headers.append("set-cookie", setCookie(CSRF_COOKIE, "", 0, false));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }
  const { email, password } = body;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return fail(400, say(policy.locale, "email and password are required"));
  }
  let accounts;
  try { accounts = loadAccounts(env.NTH_CMS_ACCOUNTS); }
  catch (e) { console.error(e.message); return fail(500, say(policy.locale, "bridge is not configured")); }
  if (!accounts.length) {
    console.error("NTH_CMS_ACCOUNTS holds no account; nobody can sign in");
    return fail(500, say(policy.locale, "bridge is not configured"));
  }

  // ponytail: no brute-force throttle. A Netlify function instance is ephemeral,
  // so an in-memory counter would reset under the load that would need it. scrypt
  // at these parameters costs about a tenth of a second per attempt, which is the
  // rate limit until there is a store to keep a counter in.
  const account = authenticate(email, password, accounts);
  if (!account) {
    console.log(JSON.stringify({ cms: "login-refused", who: String(email).slice(0, 80) }));
    return fail(401, say(policy.locale, "wrong email or password"));
  }
  if (policy.requiredRoles.length && !policy.requiredRoles.some(r => account.roles.includes(r))) {
    console.log(JSON.stringify({ cms: "login-no-role", who: account.email, roles: account.roles }));
    return fail(403, say(policy.locale, "this account has no editing role"));
  }

  const ttl = policy.sessionHours * 3600;
  const csrf = randomBytes(16).toString("base64url");
  const claims = {
    sub: account.email, email: account.email,
    roles: account.roles, csrf, iat: now, exp: now + ttl * 1000,
  };
  console.log(JSON.stringify({ cms: "login", who: claims.email, roles: claims.roles }));
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append("set-cookie", setCookie(COOKIE, signSession(claims, secret), ttl));
  headers.append("set-cookie", setCookie(CSRF_COOKIE, csrf, ttl, false));
  return new Response(JSON.stringify({ email: claims.email, roles: claims.roles }), { status: 200, headers });
}

export default async req => handle(req, process.env);
