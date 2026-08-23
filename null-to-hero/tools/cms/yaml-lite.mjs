#!/usr/bin/env node
// yaml-lite.mjs — reads the subset of YAML a Decap config.yml is written in, and
// refuses the rest out loud.
//
// WHY NOT A YAML LIBRARY
// ----------------------
// This file is copied into a client project and runs there, so a dependency here
// is a dependency in every site the plugin ships. The subset a config.yml needs
// is small and closed: block maps, block sequences, plain and quoted scalars,
// flow sequences. Anchors, tags, block scalars and multiple documents are not in
// it, and each of them throws rather than being skipped, because a config half
// read is a linter that reports on a file it did not see.

const SUPPORTED = "block maps, block sequences, quoted or plain scalars, and [inline, lists]";

export class YamlError extends Error {
  constructor(line, message) {
    super(`line ${line}: ${message}`);
    this.line = line;
  }
}

export function parse(text) {
  const lines = [];
  String(text).replace(/^﻿/, "").split(/\r?\n/).forEach((raw, i) => {
    const line = stripComment(raw, i + 1);
    if (!line.trim()) return;
    if (/^\s*(---|\.\.\.)\s*$/.test(line)) {
      if (lines.length) throw new YamlError(i + 1, "a second document; this reads one");
      return;
    }
    lines.push({ n: i + 1, indent: line.match(/^ */)[0].length, text: line.trim() });
  });
  if (!lines.length) return {};
  const [value, next] = block(lines, 0, lines[0].indent);
  if (next < lines.length) throw new YamlError(lines[next].n, "unexpected indentation");
  return value;
}

// A `#` inside quotes is content, not a comment. Nothing else on the line can
// hide one, because block scalars are refused below.
//
// A quote only opens a quoted scalar where a scalar can start. Treating every
// apostrophe as an opener breaks on `label: Jours d'ouverture`, which is an
// ordinary plain scalar and the first thing a French label runs into.
const OPENS_SCALAR = new Set([":", "-", "[", "{", ","]);

function stripComment(raw, n) {
  let out = "", quote = null, prev = null;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      out += c;
      if (c === quote && raw[i - 1] !== "\\") quote = null;
      continue;
    }
    if ((c === '"' || c === "'") && (prev === null || OPENS_SCALAR.has(prev))) {
      quote = c; out += c; prev = c; continue;
    }
    if (c === "#" && (i === 0 || /\s/.test(raw[i - 1]))) break;
    out += c;
    if (!/\s/.test(c)) prev = c;
  }
  if (quote) throw new YamlError(n, "unterminated quote");
  return out;
}

function block(lines, i, indent) {
  if (lines[i].text.startsWith("- ") || lines[i].text === "-") return sequence(lines, i, indent);
  return mapping(lines, i, indent);
}

function mapping(lines, i, indent) {
  const out = {};
  while (i < lines.length && lines[i].indent >= indent) {
    if (lines[i].indent > indent) throw new YamlError(lines[i].n, "unexpected indentation");
    const { n, text } = lines[i];
    const cut = splitKey(text, n);
    const key = unquote(cut.key);
    if (cut.rest === "") {
      // An empty value is whatever the next, deeper block says it is; nothing
      // deeper means an explicitly empty key.
      if (i + 1 < lines.length && lines[i + 1].indent > indent) {
        const [value, next] = block(lines, i + 1, lines[i + 1].indent);
        out[key] = value;
        i = next;
      } else { out[key] = null; i++; }
    } else {
      out[key] = scalar(cut.rest, n);
      i++;
    }
  }
  return [out, i];
}

function sequence(lines, i, indent) {
  const out = [];
  while (i < lines.length && lines[i].indent === indent && /^-(\s|$)/.test(lines[i].text)) {
    const { n, text } = lines[i];
    const rest = text.slice(1).trim();
    if (rest === "") {
      if (i + 1 < lines.length && lines[i + 1].indent > indent) {
        const [value, next] = block(lines, i + 1, lines[i + 1].indent);
        out.push(value);
        i = next;
      } else { out.push(null); i++; }
      continue;
    }
    if (!/^[^:\s]+:(\s|$)/.test(rest) && !rest.startsWith('"') && !rest.startsWith("'")) {
      out.push(scalar(rest, n));
      i++;
      continue;
    }
    if (/^["'].*["']\s*$/.test(rest)) { out.push(scalar(rest, n)); i++; continue; }
    // `- key: value` opens a map whose first pair sits on the dash line. The
    // dash counts as indentation for everything that follows it.
    const inner = [{ n, indent: indent + 2, text: rest }];
    let j = i + 1;
    while (j < lines.length && lines[j].indent > indent) { inner.push(lines[j]); j++; }
    const [value] = mapping(inner, 0, indent + 2);
    out.push(value);
    i = j;
  }
  return [out, i];
}

function splitKey(text, n) {
  if (text[0] === '"' || text[0] === "'") {
    const quote = text[0];
    const end = text.indexOf(quote, 1);
    if (end < 0) throw new YamlError(n, "unterminated quote");
    const after = text.slice(end + 1).trimStart();
    if (!after.startsWith(":")) throw new YamlError(n, `not a key; this reads ${SUPPORTED}`);
    return { key: text.slice(0, end + 1), rest: after.slice(1).trim() };
  }
  const colon = text.indexOf(":");
  if (colon < 0) throw new YamlError(n, `not a key; this reads ${SUPPORTED}`);
  return { key: text.slice(0, colon).trim(), rest: text.slice(colon + 1).trim() };
}

const unquote = s => (/^(["']).*\1$/.test(s) ? s.slice(1, -1) : s);

function scalar(raw, n) {
  const value = raw.trim();
  if (value === "|" || value === ">" || /^[|>][-+]?\d*$/.test(value)) {
    throw new YamlError(n, "a block scalar; this reads " + SUPPORTED);
  }
  if (value[0] === "&" || value[0] === "*" || value[0] === "!") {
    throw new YamlError(n, "an anchor, alias or tag; this reads " + SUPPORTED);
  }
  if (value.startsWith("{")) {
    if (value === "{}") return {};
    throw new YamlError(n, "an inline map; this reads " + SUPPORTED);
  }
  if (value.startsWith("[")) {
    if (!value.endsWith("]")) throw new YamlError(n, "unterminated inline list");
    const inside = value.slice(1, -1).trim();
    return inside ? inside.split(",").map(part => scalar(part, n)) : [];
  }
  if (/^(["']).*\1$/.test(value)) return unquote(value);
  if (value === "true" || value === "false") return value === "true";
  if (value === "null" || value === "~") return null;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

/* ── writing it back ──────────────────────────────────────────────────────── */
//
// The generator emits config.yml, and the linter reads it back with `parse`
// above. Keeping both in one file is what makes the round trip testable: the
// writer may only produce what the reader accepts.

const NEEDS_QUOTES = /^$|^[\s]|[\s]$|^[-?:,\[\]{}#&*!|>'"%@`]|:\s|\s#|\n/;

export function quote(value) {
  const text = String(value);
  if (NEEDS_QUOTES.test(text)) return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  if (["true", "false", "null", "~", ""].includes(text)) return `"${text}"`;
  if (/^-?\d+(\.\d+)?$/.test(text)) return `"${text}"`;
  return text;
}

export function stringify(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    return value.map(item => {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const inner = stringify(item, indent + 2);
        return `${pad}-${inner.slice(indent + 1)}`;   // the first pair rides the dash
      }
      return `${pad}- ${leaf(item)}`;
    }).join("\n");
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).filter(([, v]) => v !== undefined).map(([key, v]) => {
      if (v !== null && typeof v === "object" && (Array.isArray(v) ? v.length : Object.keys(v).length)) {
        return `${pad}${quote(key)}:\n${stringify(v, indent + 2)}`;
      }
      if (v !== null && typeof v === "object") return `${pad}${quote(key)}: ${Array.isArray(v) ? "[]" : "{}"}`;
      return `${pad}${quote(key)}: ${leaf(v)}`;
    }).join("\n");
  }
  return `${pad}${leaf(value)}`;
}

function leaf(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return quote(value);
}
