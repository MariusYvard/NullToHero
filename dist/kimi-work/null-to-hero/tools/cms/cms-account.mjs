#!/usr/bin/env node
// cms-account.mjs — mints the accounts the bridge will accept, and nothing else.
//
// WHY THE ACCOUNTS ARE OURS
// -------------------------
// With an identity provider behind the bridge, whether a stranger can sign in
// depends on the site owner having switched registration to invite only in a
// console nobody here controls, and a missed switch is silent: the site looks
// finished and the door is open. The accounts this prints are the only ones that
// exist, because each of them took a command to create.
//
// The password is never written anywhere. What comes out is a scrypt derivation
// with its parameters and its salt, which goes in an environment variable on the
// site, never in the repository. Losing it means minting a new one; there is no
// way back from the derivation, which is the property being paid for.
//
// Usage:
//   node cms-account.mjs add owner@example.com --roles editor
//   node cms-account.mjs add owner@example.com --roles editor,manager --password -
//   node cms-account.mjs remove owner@example.com --accounts '<current JSON>'
//   node cms-account.mjs list --accounts '<current JSON>'
//
// `--accounts` takes the value the site already carries, so the output is the
// whole variable, ready to paste. Without it the output holds one account.
// `--password -` reads the password from stdin instead of generating one.

import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// OWASP's floor for scrypt at the time of writing. The cost is written into the
// record, so raising it later does not lock out the accounts already minted.
export const PARAMS = { N: 32768, r: 8, p: 1, keylen: 32 };
const MAXMEM = 256 * 1024 * 1024;

export function hashPassword(password, params = PARAMS, salt = randomBytes(16)) {
  if (String(password).length < 12) throw new Error("a password under twelve characters is not one");
  const key = scryptSync(String(password), salt, params.keylen,
    { N: params.N, r: params.r, p: params.p, maxmem: MAXMEM });
  return `scrypt$${params.N}$${params.r}$${params.p}$` +
    `${salt.toString("base64url")}$${key.toString("base64url")}`;
}

// Four words out of a wide list beat a shorter string of symbols, and the client
// has to be able to read this one out over the telephone.
const WORDS = ("able acid aged airy amber anchor ankle apple april arbor arrow autumn azure bacon badge baker balsa " +
  "banjo barley basil beach beacon beam bean bear beech berry birch bishop bison blade bloom blue board bolt bonus " +
  "boreal brass bread brick bridge bronze brook brush cable cactus camel canal candle canvas cargo carrot cedar " +
  "chalk charm cherry chess chill cider cinder circle citrus civic clay cliff clover cobalt cocoa comet coral " +
  "cotton cove crane crest crown crystal cumin curve cypress daisy dawn delta denim desert diamond dune dusk " +
  "eagle east ember emerald ether fable falcon fern fjord flame flax flint florin forest fossil frost garnet " +
  "ginger glacier glass grain granite grove hazel heather hedge helm hemlock heron hickory hollow honey ivory " +
  "jade jasper jetty juniper kale kelp kernel lagoon lantern larch laurel lemon lichen lilac linen lotus lumen " +
  "maple marble marsh meadow mesa mint mirror moss myrtle nectar nickel north oak oasis ochre olive onyx opal " +
  "orchid osprey otter oxide paper pastel peach pearl pebble pepper pewter pine plum pollen poplar prairie quartz " +
  "quince radish raven reed reef resin ridge river rowan rust saffron sage salt sandy sepia shale shore silk " +
  "silver slate sorrel spruce stone storm summit sumac tamarind teak thistle thyme timber topaz tulip tundra " +
  "umber valley velvet vine violet walnut willow winter yarrow yellow yew zinc").split(" ");

export function generatePassword(words = 4) {
  const out = [];
  for (let i = 0; i < words; i++) out.push(WORDS[randomBytes(2).readUInt16BE(0) % WORDS.length]);
  out.push(String(randomBytes(2).readUInt16BE(0) % 100).padStart(2, "0"));
  return out.join("-");
}

export function upsert(accounts, account) {
  const rest = accounts.filter(a => a.email !== account.email);
  return [...rest, account].sort((a, b) => a.email.localeCompare(b.email));
}

export function parseAccounts(raw) {
  if (!raw) return [];
  const text = raw.startsWith("@") ? readFileSync(raw.slice(1), "utf8") : raw;
  const list = JSON.parse(text);
  if (!Array.isArray(list)) throw new Error("--accounts must hold a JSON array");
  return list;
}

/* ── CLI ──────────────────────────────────────────────────────────────────── */

const isCli = () => import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli()) {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
  const [command, email] = args.filter(a => !a.startsWith("--") && args[args.indexOf(a) - 1]?.startsWith("--") !== true);

  let accounts;
  try { accounts = parseAccounts(flag("accounts")); }
  catch (e) { console.error(`--accounts: ${e.message}`); process.exit(2); }

  const emit = list => {
    console.log("\nPaste this whole line into NTH_CMS_ACCOUNTS on the site:\n");
    console.log(JSON.stringify(list));
    console.log("\nIt is an environment variable, never a file in the repository.\n");
  };

  if (command === "list") {
    if (!accounts.length) console.log("\nNo account. Nobody can sign in.\n");
    else {
      console.log("");
      for (const a of accounts) console.log(`  ${a.email}  ${(a.roles || []).join(", ") || "(no role)"}`);
      console.log("");
    }
    process.exit(0);
  }

  if (command === "remove") {
    if (!email) { console.error("usage: cms-account.mjs remove <email> --accounts '<json>'"); process.exit(2); }
    const target = email.trim().toLowerCase();
    if (!accounts.some(a => a.email === target)) {
      console.error(`no account for ${target}`);
      process.exit(1);
    }
    emit(accounts.filter(a => a.email !== target));
    console.log("The removed account stops working the moment the site redeploys with the new value.\n");
    process.exit(0);
  }

  if (command !== "add" || !email) {
    console.error("usage: cms-account.mjs add <email> [--roles editor,manager] [--password -] [--accounts '<json>']");
    process.exit(2);
  }

  const roles = (flag("roles") || "editor").split(",").map(r => r.trim()).filter(Boolean);
  let password = flag("password");
  let generated = false;
  if (password === "-") {
    // Reading it here rather than from the command line keeps it out of the
    // shell history and out of the process list.
    password = readFileSync(0, "utf8").trim();
    if (!password) { console.error("no password on stdin"); process.exit(2); }
  } else if (password) {
    console.error("refusing a password on the command line; use --password - and pipe it, or let this generate one");
    process.exit(2);
  } else {
    password = generatePassword();
    generated = true;
  }

  let record;
  try { record = hashPassword(password); }
  catch (e) { console.error(e.message); process.exit(2); }

  emit(upsert(accounts, { email: email.trim().toLowerCase(), roles, password: record }));
  if (generated) {
    console.log("The password, shown once and stored nowhere:\n");
    console.log(`    ${password}\n`);
    console.log("Send it to the client by a channel that is not this terminal's history.");
    console.log("There is no reset link: to change it, run this command again.\n");
  }
}
