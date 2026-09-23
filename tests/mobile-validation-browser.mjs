#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateMobile } from "../null-to-hero/skills/siteasy/scripts/mobile-validate.mjs";

const fixture = path.resolve("tests/fixtures/mobile-validation/index.html");
const validator = path.resolve("null-to-hero/skills/siteasy/scripts/mobile-validate.mjs");

test("Chromium and desktop WebKit fixtures produce proxy evidence without claiming iOS", async (t) => {
  const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), "nth-mobile-proxy-"));
  t.after(() => fs.rmSync(artifacts, { recursive: true, force: true }));

  const report = await validateMobile(fixture, {
    engines: ["chromium", "webkit"],
    profiles: ["portrait", "landscape", "reduced-motion", "keyboard-height-proxy"],
    artifacts,
    timeout: 20_000,
  });

  assert.equal(report.validationKind, "local-mobile-proxy");
  assert.equal(report.summary.iosValidated, false);
  assert.equal(report.summary.failures, 0);
  assert.equal(report.summary.proxyFailures, 0);
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.manualRequired, 7);
  assert.ok(report.checks.some((check) => check.id === "manifest-fetch" && check.status === "pass"));
  assert.ok(report.checks.some((check) => check.id === "focused-control-visible" && check.profile === "keyboard-height-proxy" && check.status === "proxy-pass"));
  assert.ok(report.checks.every((check) => check.status !== "pass" || !/safari|dynamic-island|ios-virtual-keyboard|edge-gestures|mobile-gpu|installed-pwa/i.test(check.id)));
  assert.deepEqual(report.engines.map((engine) => engine.id), [
    "desktop-chromium-mobile-emulation",
    "desktop-webkit-mobile-emulation",
  ]);
  assert.ok(report.engines.every((engine) => engine.availability === "available"));
  for (const engine of ["chromium", "webkit"]) {
    for (const profile of ["portrait", "landscape", "reduced-motion", "keyboard-height-proxy"]) {
      assert.ok(fs.existsSync(path.join(artifacts, `${engine}-${profile}.png`)));
    }
  }
});

test("absence of safe-area implementation is not serialized as a direct pass", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nth-mobile-no-safe-area-"));
  const artifacts = path.join(root, "artifacts");
  const target = path.join(root, "index.html");
  fs.writeFileSync(target, '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>/* env(safe-area-inset-top) */ body::before{content:"env(safe-area-inset-top)"}body{margin:0}</style><title>No safe area</title>');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const report = await validateMobile(target, { engines: ["chromium"], profiles: ["portrait"], artifacts, timeout: 10_000 });
  assert.equal(report.checks.some((check) => check.id === "safe-area-structure" && check.status === "pass"), false);
});

test("a page that never reaches the load event produces a proxy failure", async (t) => {
  const sockets = new Set();
  const server = http.createServer((request, response) => {
    if (request.url === "/never") return;
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end('<!doctype html><meta name="viewport" content="width=device-width"><img src="/never" alt="">');
  });
  server.on("connection", (socket) => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), "nth-mobile-incomplete-load-"));
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(artifacts, { recursive: true, force: true });
  });
  const { port } = server.address();
  const report = await validateMobile(`http://127.0.0.1:${port}/`, { engines: ["chromium"], profiles: ["portrait"], artifacts, timeout: 1_000 });
  const load = report.checks.find((check) => check.id === "load-event-complete");
  assert.equal(load.status, "proxy-fail");
  assert.ok(report.summary.proxyFailures >= 1);
});

test("a hanging manifest request is bounded by the validator timeout", { timeout: 15_000 }, async (t) => {
  const sockets = new Set();
  const server = http.createServer((request, response) => {
    if (request.url === "/manifest.webmanifest") return;
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end('<!doctype html><meta name="viewport" content="width=device-width"><link rel="manifest" href="/manifest.webmanifest"><script>window.fetch=()=>new Promise(()=>{})</script><title>Manifest timeout</title>');
  });
  server.on("connection", (socket) => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), "nth-mobile-manifest-timeout-"));
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(artifacts, { recursive: true, force: true });
  });
  const { port } = server.address();
  const started = Date.now();
  const report = await validateMobile(`http://127.0.0.1:${port}/`, { engines: ["chromium"], profiles: ["portrait"], artifacts, timeout: 1_000 });
  assert.ok(Date.now() - started < 10_000);
  assert.equal(report.checks.find((check) => check.id === "manifest-fetch").status, "fail");
});

test("the CLI exits 3 when a required browser executable is unavailable", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nth-mobile-missing-browser-"));
  try {
    const result = spawnSync(process.execPath, [validator, fixture, "--engines", "chromium", "--profiles", "portrait", "--artifacts", path.join(root, "artifacts")], {
      cwd: path.resolve("."),
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(root, "empty-browsers") },
      encoding: "utf8",
      timeout: 20_000,
    });
    assert.equal(result.status, 3, result.stderr || result.stdout);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a copied standalone validator resolves Playwright from the current project", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nth-mobile-standalone-"));
  try {
    const copy = path.join(root, "mobile-validate.mjs");
    fs.copyFileSync(validator, copy);
    const result = spawnSync(process.execPath, [copy, fixture, "--engines", "chromium", "--profiles", "portrait", "--artifacts", path.join(root, "artifacts")], {
      cwd: path.resolve("."),
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a missing Playwright package exits without leaving the fixture server alive", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nth-mobile-no-playwright-"));
  try {
    const copy = path.join(root, "mobile-validate.mjs");
    const target = path.join(root, "index.html");
    fs.copyFileSync(validator, copy);
    fs.writeFileSync(target, '<!doctype html><meta name="viewport" content="width=device-width"><title>No package</title>');
    const result = spawnSync(process.execPath, [copy, target, "--engines", "chromium", "--profiles", "portrait", "--artifacts", path.join(root, "artifacts")], {
      cwd: root,
      encoding: "utf8",
      timeout: 5_000,
    });
    assert.equal(result.signal, null, `validator hung until ${result.signal || result.error}`);
    assert.equal(result.status, 4, result.stderr || result.stdout);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
