#!/usr/bin/env node
// cms-diagnose.mjs — demande au pont déployé ce que le dépôt ne peut pas dire.
//
// POURQUOI CE FICHIER EXISTE
// --------------------------
// `cms-lint` et `cms-scaffold --check` lisent le dépôt, donc ils voient ce qui y
// est écrit et rien d'autre. Les droits que le jeton porte vraiment, les
// variables posées sur le contexte de déploiement servi, la branche que
// l'hébergeur déploie : tout cela vit dans une console que le dépôt ignore. Le
// pont, lui, tourne dedans et tient le jeton. Il sait. Il fallait un client pour
// le lui demander.
//
// Le mot de passe n'est jamais un argument de ligne de commande : un argument
// finit dans l'historique du shell et dans la table des processus. Il est lu au
// clavier sans écho, ou sur l'entrée standard quand elle est branchée.
//
// Usage:
//   node cms-diagnose.mjs https://exemple.netlify.app moi@exemple.fr
//   node cms-diagnose.mjs https://exemple.netlify.app moi@exemple.fr --json
//
// Sort 0 si tout ce qui est vérifiable d'ici tient, 1 sinon, 2 si le pont n'a
// pas répondu.

import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

// Les cookies du pont n'ont pas d'attribut Expires, donc aucune virgule : les
// découper sur la virgule est sûr ici et ne le serait pas ailleurs.
// `getSetCookie` existe depuis Node 18.15, la scission couvre les runtimes plus
// anciens que le pont accepte par ailleurs.
export function cookiesFrom(headers) {
  const raw = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : String(headers.get("set-cookie") || "").split(/,(?=[^;]+=)/);
  const jar = new Map();
  for (const line of raw) {
    const pair = String(line).split(";")[0];
    const at = pair.indexOf("=");
    if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }
  return jar;
}

// Le verdict, séparé du réseau pour être testable. Chaque ligne est un constat
// et sa gravité : `false` ne veut pas dire panne partout, un flux illisible est
// normal quand le site publie à l'enregistrement.
export function verdict(d) {
  const out = [];
  const say = (ok, label, fatal = true) => out.push({ ok, label, fatal });

  say(d.env.session_secret, "NTH_CMS_SESSION_SECRET posée et assez longue");
  say(d.env.accounts !== null && d.env.accounts > 0,
    d.env.accounts === null
      ? "NTH_CMS_ACCOUNTS absente ou illisible"
      : `NTH_CMS_ACCOUNTS porte ${d.env.accounts} compte(s)`);
  say(d.env.github_token, "NTH_CMS_GITHUB_TOKEN posée");
  say(d.env.repo, "NTH_CMS_REPO nomme un dépôt");
  say(d.token.reads, "le jeton lit le dépôt");
  say(d.token.writes === true, d.token.writes === null
    ? "le jeton n'a pas pu être testé en écriture, GitHub a répondu autre chose qu'un refus"
    : "le jeton écrit le contenu (Contents: write)");
  say(d.branches.content, "la branche de contenu existe");
  if (d.branches.production !== null) say(d.branches.production, "la branche de production existe");
  if (d.publish.mode === "manual") {
    say(d.publish.workflow_readable, "le jeton lit le flux de publication (Actions), requis en publication manuelle");
  } else if (d.publish.workflow_readable === false) {
    say(true, "le jeton ne lit pas Actions, ce qui est attendu en publication à l'enregistrement", false);
  }
  if (d.publish.last_run_at) {
    say(d.publish.last_run_ok !== false, `dernier passage du flux le ${d.publish.last_run_at}`, false);
  } else {
    say(false, "le flux de publication n'a jamais tourné, ou son historique est illisible", false);
  }
  return out;
}

async function ask(prompt) {
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  }
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let hide = false;
    process.stdout.write(prompt);
    // readline réécrit chaque frappe sur la sortie. Sans cette coupure, le mot
    // de passe reste affiché dans le terminal et dans son tampon de défilement.
    rl._writeToOutput = s => { if (!hide) rl.output.write(s); };
    hide = true;
    rl.question("", answer => { hide = false; process.stdout.write("\n"); rl.close(); resolve(answer); });
  });
}

export async function diagnose(base, email, password, fetchImpl = globalThis.fetch) {
  const root = String(base).replace(/\/+$/, "");
  const login = await fetchImpl(`${root}/api/cms/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    const body = await login.json().catch(() => ({}));
    throw new Error(`connexion refusée (${login.status}) : ${body.error || "sans détail"}`);
  }
  const jar = cookiesFrom(login.headers);
  const csrf = jar.get("__Host-nth_cms_csrf");
  const session = jar.get("__Host-nth_cms");
  if (!csrf || !session) throw new Error("le pont a répondu sans poser ses deux cookies");

  const res = await fetchImpl(`${root}/api/cms`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nth-csrf": csrf,
      cookie: `__Host-nth_cms=${session}; __Host-nth_cms_csrf=${csrf}`,
    },
    body: JSON.stringify({ action: "diagnose" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`diagnostic refusé (${res.status}) : ${body.error || "sans détail"}`);
  return body;
}

const isCli = () => import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli()) {
  const [base, email] = process.argv.slice(2).filter(a => !a.startsWith("--"));
  if (!base || !email) {
    console.error("usage: node cms-diagnose.mjs <https://site> <email> [--json]");
    process.exit(2);
  }
  let report;
  try {
    report = await diagnose(base, email, await ask(`Mot de passe de ${email} : `));
  } catch (e) {
    console.error(`cms-diagnose: ${e.message}`);
    process.exit(2);
  }
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const line of verdict(report)) {
      console.log(`${line.ok ? "ok  " : line.fatal ? "NON " : "note"} ${line.label}`);
    }
    console.log("\nCe qui reste hors de portée : le DNS du domaine, le fait que l'hébergeur");
    console.log("serve bien la branche de production, et l'absence de la permission");
    console.log("Workflows sur le jeton. La constater demanderait d'écrire sous");
    console.log(".github/workflows/, ce qui est précisément ce qu'on ne veut pas pouvoir faire.");
  }
  process.exit(verdict(report).some(l => l.fatal && !l.ok) ? 1 : 0);
}
