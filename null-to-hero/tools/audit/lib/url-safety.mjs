// SSRF guard for every fetch of a user-supplied URL.
//
// The analyzer takes a URL from whoever runs it and fetches it, follows its
// redirects, and probes sibling paths on its origin. That is exactly the shape an
// attacker needs to reach something the host can see and they cannot: a cloud
// metadata endpoint, a service on localhost, a box on the private network behind
// the machine running the audit.
//
// Three defences, because any one of them alone is bypassable:
//
//   1. Authority parsing. Reject the URL forms that exist to confuse parsers
//      (backslashes, percent-encoded authority, userinfo) before anything reads it.
//   2. Address canonicalisation. Decimal, hex and octal spellings of an IP all
//      normalise to the same address, so 2130706433 and 0x7f000001 cannot smuggle
//      127.0.0.1 past a string comparison.
//   3. Resolve-then-check on EVERY address. A hostname that resolves to both a
//      public and a private address must be refused, not accepted on the first
//      public answer, otherwise an attacker races the resolver between the check
//      and the connection.
//
// Known limitation, stated rather than hidden: when a page is loaded in headless
// Chromium the browser resolves DNS itself, so this module does not sit on that
// path. The render path is therefore only as safe as the URL that reached it,
// which is why validation happens before the browser is handed anything.
//
// Pure Node standard library.

import { promises as dns } from "node:dns";
import { isIP } from "node:net";

// Cloud instance-metadata endpoints, which is what SSRF is usually reaching for.
// The IPv4 link-local address is shared by AWS, Azure, GCP, Oracle and Alibaba.
const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "metadata.azure.com",
  "metadata.ec2.internal",
  "metadata.oraclecloud.com",
  "instance-data",
  "instance-data.ec2.internal",
  "169.254.169.254",
  "fd00:ec2::254",
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export class UrlSafetyError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "UrlSafetyError";
    this.code = code;
  }
}

// ── authority-level rejections ────────────────────────────────────────────────

// Applied to the raw string, before URL parsing, because the point is to refuse
// the spellings that make two parsers disagree about where the host ends.
export function rejectAuthorityTricks(raw) {
  const s = String(raw || "");
  const schemeEnd = s.indexOf("://");
  if (schemeEnd === -1) throw new UrlSafetyError("URL has no scheme", "no-scheme");
  const afterScheme = s.slice(schemeEnd + 3);
  const authorityEnd = afterScheme.search(/[/?#]/);
  const authority = authorityEnd === -1 ? afterScheme : afterScheme.slice(0, authorityEnd);

  if (/\\/.test(authority) || /%5c/i.test(authority)) {
    throw new UrlSafetyError("Backslash in the authority", "authority-backslash");
  }
  if (/%/.test(authority)) {
    throw new UrlSafetyError("Percent-encoding in the authority", "authority-percent");
  }
  if (authority.includes("@")) {
    throw new UrlSafetyError("Userinfo in the authority", "authority-userinfo");
  }
  // "#@" and its encoded form make some parsers read the fragment as the host.
  if (/#@|%23@/i.test(s.slice(0, schemeEnd + 3 + authority.length + 1))) {
    throw new UrlSafetyError("Fragment-at confusion in the authority", "authority-fragment-at");
  }
  return authority;
}

// ── address canonicalisation ──────────────────────────────────────────────────

// 127.0.0.1 can be written 2130706433, 0x7f000001, 0177.0.0.1 and 127.1. Each of
// those reaches loopback and none of them matches the string "127.0.0.1".
export function canonicalizeHost(host) {
  let h = String(host || "").trim().toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  if (isIP(h)) return h;

  // Integer, hex or octal forms, with or without dots.
  const parts = h.split(".");
  const parseSeg = (seg) => {
    if (/^0x[0-9a-f]+$/.test(seg)) return parseInt(seg, 16);
    if (/^0[0-7]+$/.test(seg)) return parseInt(seg, 8);
    if (/^\d+$/.test(seg)) return parseInt(seg, 10);
    return NaN;
  };
  if (parts.length === 1) {
    const n = parseSeg(parts[0]);
    if (Number.isFinite(n) && n >= 0 && n <= 0xFFFFFFFF) {
      return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
    }
    return h;
  }
  if (parts.length >= 2 && parts.length <= 4 && parts.every(p => Number.isFinite(parseSeg(p)))) {
    const nums = parts.map(parseSeg);
    // Short forms pack the remainder into the final segment (127.1 is 127.0.0.1).
    const last = nums[nums.length - 1];
    const head = nums.slice(0, -1);
    const maxTail = 2 ** (8 * (4 - head.length));
    if (head.every(n => n >= 0 && n <= 255) && last >= 0 && last < maxTail) {
      const tail = [];
      for (let i = 4 - head.length - 1; i >= 0; i--) tail.push((last >>> (8 * i)) & 255);
      return [...head, ...tail].join(".");
    }
  }
  return h;
}

// ── address classification ────────────────────────────────────────────────────

export function isSafeIp(addr) {
  const fam = isIP(addr);
  if (fam === 4) {
    const o = addr.split(".").map(Number);
    if (o.length !== 4 || o.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    if (o[0] === 0) return false;                                  // this network
    if (o[0] === 10) return false;                                 // private
    if (o[0] === 127) return false;                                // loopback
    if (o[0] === 169 && o[1] === 254) return false;                // link-local, metadata
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return false;    // private
    if (o[0] === 192 && o[1] === 168) return false;                // private
    if (o[0] === 192 && o[1] === 0 && o[2] === 0) return false;    // IETF protocol assignments
    if (o[0] === 192 && o[1] === 0 && o[2] === 2) return false;    // TEST-NET-1
    if (o[0] === 198 && (o[1] === 18 || o[1] === 19)) return false;// benchmarking
    if (o[0] === 198 && o[1] === 51 && o[2] === 100) return false; // TEST-NET-2
    if (o[0] === 203 && o[1] === 0 && o[2] === 113) return false;  // TEST-NET-3
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return false;   // carrier-grade NAT
    if (o[0] >= 224) return false;                                 // multicast and reserved
    return true;
  }
  if (fam === 6) {
    const a = addr.toLowerCase();
    if (a === "::" || a === "::1") return false;
    if (a.startsWith("fe80")) return false;                        // link-local
    if (/^f[cd]/.test(a)) return false;                            // unique local
    if (a.startsWith("ff")) return false;                          // multicast
    // IPv4-mapped and IPv4-compatible: judge the embedded IPv4 address.
    const m = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/) || a.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isSafeIp(m[1]);
    if (a === "fd00:ec2::254") return false;
    return true;
  }
  return false;
}

// ── the public entry point ────────────────────────────────────────────────────

/**
 * Validate a URL for outbound fetching. Throws UrlSafetyError on refusal.
 * Returns { url, host, addresses } on acceptance.
 *
 * resolve: pass false to skip DNS (string-level checks only). Used by callers that
 * cannot await, and by tests. String-level checks alone are NOT sufficient against
 * a hostname that resolves to a private address, so the default is true.
 */
export async function validateUrl(raw, { resolve = true } = {}) {
  rejectAuthorityTricks(raw);

  let u;
  try { u = new URL(raw); } catch { throw new UrlSafetyError("Unparseable URL", "unparseable"); }
  if (!ALLOWED_PROTOCOLS.has(u.protocol)) {
    throw new UrlSafetyError(`Protocol ${u.protocol} is not allowed`, "protocol");
  }
  const host = canonicalizeHost(u.hostname);
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new UrlSafetyError(`Host ${host} is on the blocklist`, "blocked-host");
  }
  if (isIP(host) && !isSafeIp(host)) {
    throw new UrlSafetyError(`Address ${host} is private, loopback or reserved`, "private-address");
  }
  if (!resolve || isIP(host)) return { url: u, host, addresses: isIP(host) ? [host] : [] };

  let records;
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch (e) {
    throw new UrlSafetyError(`DNS lookup failed for ${host}: ${e.code || e.message}`, "dns");
  }
  if (!records.length) throw new UrlSafetyError(`No address for ${host}`, "dns-empty");

  // EVERY answer must pass. Accepting on the first public address leaves the door
  // open to a name that also answers with a private one.
  const unsafe = records.filter(r => !isSafeIp(r.address));
  if (unsafe.length) {
    throw new UrlSafetyError(
      `${host} resolves to ${unsafe.map(r => r.address).join(", ")}, which is private, loopback or reserved`,
      "private-resolution");
  }
  return { url: u, host, addresses: records.map(r => r.address) };
}

/**
 * Redirect-aware fetch. Follows redirects one hop at a time and revalidates each
 * destination, because a public URL that 302s to 169.254.169.254 defeats a check
 * that only ever looked at the URL it was given.
 */
export async function safeFetch(raw, { maxRedirects = 5, ...init } = {}) {
  let current = raw;
  const chain = [];
  for (let i = 0; i <= maxRedirects; i++) {
    await validateUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    chain.push({ url: current, status: res.status });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { res, chain };
      try { await res.body?.cancel(); } catch { /* ignore */ }
      current = new URL(loc, current).toString();
      continue;
    }
    return { res, chain };
  }
  throw new UrlSafetyError(`More than ${maxRedirects} redirects`, "redirect-loop");
}
