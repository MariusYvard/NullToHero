#!/usr/bin/env node
// live-server.mjs — the siteasy live helper daemon (HTTP + SSE + event queue).
// Bridges the browser picker and the agent's poll loop. One per project.
//
// Usage: live-server.mjs start --port N --token T
//        live-server.mjs stop [--keep-inject]
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import http from "node:http";
import { projectRoot, ensureStateDir, statePath, readJSON, writeJSON,
         httpJSON } from "./live-core.mjs";
import { applyAccept, applyDiscard } from "./live-accept.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const root = projectRoot();
const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const cmd = args[0];

if (cmd === "stop") {
  const st = readJSON(statePath(root));
  if (st && st.port) {
    try { await httpJSON("POST", st.port, `/shutdown?token=${st.token}`, st.token, {}); } catch {}
  }
  if (!args.includes("--keep-inject")) {
    spawnSync(process.execPath, [join(HERE, "live-inject.mjs"), "--remove"], { cwd: root, stdio: "ignore" });
  }
  try { unlinkSync(statePath(root)); } catch {}
  process.stdout.write(JSON.stringify({ ok: true, stopped: true }) + "\n");
  process.exit(0);
}

if (cmd !== "start") { console.error("Usage: live-server.mjs start|stop"); process.exit(2); }

const PORT = Number(get("--port")) || 8400;
const TOKEN = get("--token") || "";

const queue = [];
const waiters = [];   // pending /poll responses
let sseClients = [];
let exitTimer = null;

function authed(req, url) {
  const t = url.searchParams.get("token") || req.headers["x-live-token"];
  return t === TOKEN;
}
function deliver(event) {
  const w = waiters.shift();
  if (w) { clearTimeout(w.timer); w.res.end(JSON.stringify(event)); }
  else queue.push(event);
}
function sseSend(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach((c) => { try { c.write(payload); } catch {} });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,x-live-token" };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }

  // Serve the browser client.
  if (req.method === "GET" && url.pathname === "/live.js") {
    const js = readFileSync(join(HERE, "live.js"), "utf8")
      .replace(/__LIVE_PORT__/g, String(PORT)).replace(/__LIVE_TOKEN__/g, TOKEN);
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", ...cors });
    return res.end(js);
  }
  if (!authed(req, url)) { res.writeHead(401, cors); return res.end('{"error":"unauthorized"}'); }

  // SSE stream to the browser.
  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", ...cors });
    res.write(": connected\n\n");
    sseClients.push(res);
    if (exitTimer) { clearTimeout(exitTimer); exitTimer = null; }
    req.on("close", () => {
      sseClients = sseClients.filter((c) => c !== res);
      if (sseClients.length === 0) {
        exitTimer = setTimeout(() => deliver({ type: "exit", reason: "browser_closed" }), 8000);
      }
    });
    return;
  }

  // Browser -> server event.
  if (req.method === "POST" && url.pathname === "/event") {
    const body = await readBody(req);
    const ev = body || {};
    if (ev.type === "accept") {
      ev._acceptResult = applyAccept({ root, file: ev.file, variantId: ev.variantId });
    } else if (ev.type === "discard") {
      ev._acceptResult = applyDiscard({ root, file: ev.file });
    }
    deliver(ev);
    res.writeHead(200, cors); return res.end('{"ok":true}');
  }

  // Agent long-poll.
  if (req.method === "GET" && url.pathname === "/poll") {
    if (queue.length) { res.writeHead(200, cors); return res.end(JSON.stringify(queue.shift())); }
    const timeout = Number(url.searchParams.get("timeout")) || 600000;
    const timer = setTimeout(() => {
      waiters.splice(waiters.findIndex((w) => w.res === res), 1);
      res.writeHead(200, cors); res.end(JSON.stringify({ type: "timeout" }));
    }, timeout);
    waiters.push({ res, timer });
    req.on("close", () => { clearTimeout(timer); });
    return;
  }

  // Agent -> browser reply.
  if (req.method === "POST" && url.pathname === "/reply") {
    const body = await readBody(req);
    sseSend({ type: "reply", ...body });
    res.writeHead(200, cors); return res.end('{"ok":true}');
  }

  if (req.method === "POST" && url.pathname === "/shutdown") {
    res.writeHead(200, cors); res.end('{"ok":true}');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500);
    return;
  }

  res.writeHead(404, cors); res.end('{"error":"not_found"}');
});

function readBody(req) {
  return new Promise((resolve) => {
    let b = ""; req.on("data", (c) => (b += c));
    req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
  });
}

server.listen(PORT, "127.0.0.1", () => {
  ensureStateDir(root);
  writeJSON(statePath(root), { port: PORT, token: TOKEN, pid: process.pid });
});
