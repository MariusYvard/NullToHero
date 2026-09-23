#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ENGINE_DEFINITIONS,
  MANUAL_CHECKS,
  PROFILES,
  canonicalizeReport,
  classifyCheck,
  parseArgs,
  startStaticServer,
  summarize,
} from "../null-to-hero/skills/siteasy/scripts/mobile-validate.mjs";

test("Playwright engines stay desktop proxies, never Safari or iOS evidence", () => {
  assert.deepEqual(Object.keys(ENGINE_DEFINITIONS).sort(), ["chromium", "webkit"]);
  for (const [name, engine] of Object.entries(ENGINE_DEFINITIONS)) {
    assert.equal(engine.engine, name);
    assert.equal(engine.layer, "desktop-proxy");
    assert.equal(engine.platform, "desktop");
    assert.match(engine.id, /desktop.*mobile-emulation|mobile-emulation.*desktop/);
    assert.doesNotMatch(engine.id, /safari|ios|iphone/i);
    assert.match(engine.disclaimer, /not Safari on iOS/i);
  }
});

test("profiles cover portrait, landscape, reduced motion and keyboard-height proxy", () => {
  assert.deepEqual(Object.keys(PROFILES).sort(), ["keyboard-height-proxy", "landscape", "portrait", "reduced-motion"]);
  assert.deepEqual(PROFILES.portrait.viewport, { width: 390, height: 844 });
  assert.deepEqual(PROFILES.landscape.viewport, { width: 844, height: 390 });
  assert.equal(PROFILES["reduced-motion"].reducedMotion, "reduce");
  assert.ok(PROFILES["keyboard-height-proxy"].viewport.height < PROFILES.portrait.viewport.height);
});

test("manual rows cover every iOS-only claim and name the required evidence layer", () => {
  const ids = new Set(MANUAL_CHECKS.map((check) => check.id));
  for (const id of [
    "safari-dynamic-chrome",
    "physical-safe-areas",
    "dynamic-island-clearance",
    "ios-virtual-keyboard",
    "ios-edge-gestures",
    "mobile-gpu-performance",
    "installed-pwa-ios",
  ]) assert.ok(ids.has(id), `${id} is required`);

  for (const check of MANUAL_CHECKS) {
    assert.equal(check.status, "manual-required");
    assert.ok(["ios-simulator", "physical-ios"].includes(check.requiredLayer));
    assert.ok(check.procedure.length > 20);
  }
  assert.equal(MANUAL_CHECKS.find((c) => c.id === "mobile-gpu-performance").requiredLayer, "physical-ios");
  assert.equal(MANUAL_CHECKS.find((c) => c.id === "installed-pwa-ios").requiredLayer, "physical-ios");
  assert.equal(MANUAL_CHECKS.find((c) => c.id === "ios-virtual-keyboard").requiredLayer, "physical-ios");
});

test("CLI defaults to both desktop engines and rejects dishonest engine names", () => {
  const parsed = parseArgs(["https://example.test"]);
  assert.equal(parsed.target, "https://example.test");
  assert.deepEqual(parsed.engines, ["chromium", "webkit"]);
  assert.equal(parsed.requireEngines, true);
  assert.equal(parseArgs(["https://example.test", "--allow-missing-engines"]).requireEngines, false);
  assert.throws(() => parseArgs(["https://example.test", "--engines", "safari"]), /chromium.*webkit/i);
  assert.throws(() => parseArgs([]), /target/i);
});

test("proxy observations can never be promoted to direct passes", () => {
  assert.equal(classifyCheck({ kind: "proxy", passed: true }), "proxy-pass");
  assert.equal(classifyCheck({ kind: "proxy", passed: false }), "proxy-fail");
  assert.equal(classifyCheck({ kind: "direct", passed: true }), "pass");
  assert.equal(classifyCheck({ kind: "direct", passed: false }), "fail");
  assert.equal(classifyCheck({ kind: "manual" }), "manual-required");
});

test("summary remains explicit that iOS was not validated", () => {
  const summary = summarize([
    { status: "pass" },
    { status: "proxy-pass" },
    { status: "manual-required" },
    { status: "unavailable" },
  ]);
  assert.equal(summary.iosValidated, false);
  assert.equal(summary.proxyFailures, 0);
  assert.equal(summary.manualRequired, 1);
  assert.equal(summary.unavailableEngines, 1);
});

test("canonical reports are stable and strip volatile absolute paths and timestamps", () => {
  const report = {
    generatedAt: "2026-09-23T00:00:00Z",
    artifactsRoot: "C:\\private\\mobile-evidence",
    checks: [
      { id: "z", engine: "webkit", profile: "portrait", status: "proxy-pass" },
      { id: "a", engine: "chromium", profile: "landscape", status: "proxy-pass" },
    ],
    schemaVersion: 1,
  };
  const canonical = canonicalizeReport(report);
  assert.equal(canonical.generatedAt, undefined);
  assert.equal(canonical.artifactsRoot, "mobile-evidence");
  assert.deepEqual(canonical.checks.map((c) => c.id), ["a", "z"]);
  assert.equal(JSON.stringify(canonical), JSON.stringify(canonicalizeReport(report)));
});

test("the local fixture server blocks symlink and junction escapes", async (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "nth-mobile-server-"));
  const root = path.join(parent, "root");
  const outside = path.join(parent, "outside");
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>fixture</title>");
  fs.writeFileSync(path.join(outside, "secret.txt"), "must-not-be-served");
  fs.symlinkSync(outside, path.join(root, "escape"), process.platform === "win32" ? "junction" : "dir");
  const server = await startStaticServer(path.join(root, "index.html"));
  t.after(async () => {
    await server.close();
    fs.rmSync(parent, { recursive: true, force: true });
  });
  const response = await fetch(new URL("escape/secret.txt", server.url));
  assert.equal(response.status, 403);
  assert.notEqual(await response.text(), "must-not-be-served");
});
