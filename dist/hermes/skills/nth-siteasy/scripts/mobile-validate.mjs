#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ENGINE_DEFINITIONS = Object.freeze({
  chromium: Object.freeze({
    id: "desktop-chromium-mobile-emulation",
    engine: "chromium",
    layer: "desktop-proxy",
    platform: "desktop",
    disclaimer: "Desktop Playwright Chromium mobile emulation is not Safari on iOS.",
  }),
  webkit: Object.freeze({
    id: "desktop-webkit-mobile-emulation",
    engine: "webkit",
    layer: "desktop-proxy",
    platform: "desktop",
    disclaimer: "Playwright desktop WebKit mobile emulation is not Safari on iOS.",
  }),
});

export const PROFILES = Object.freeze({
  portrait: Object.freeze({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "no-preference" }),
  landscape: Object.freeze({ viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "no-preference" }),
  "reduced-motion": Object.freeze({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce" }),
  "keyboard-height-proxy": Object.freeze({ viewport: { width: 390, height: 500 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "no-preference" }),
});

export const MANUAL_CHECKS = Object.freeze([
  {
    id: "safari-dynamic-chrome",
    status: "manual-required",
    requiredLayer: "ios-simulator",
    reason: "Desktop engines do not reproduce Mobile Safari's expanding and collapsing browser bars.",
    procedure: "In Mobile Safari on a named Xcode Simulator runtime, scroll both directions and record the first frame, collapsed chrome, expanded chrome and rotation states.",
  },
  {
    id: "physical-safe-areas",
    status: "manual-required",
    requiredLayer: "physical-ios",
    reason: "Desktop safe-area environment values are not values from a physical cutout or home indicator.",
    procedure: "On a physical iPhone in portrait and landscape, capture every full-bleed, fixed and sticky surface and verify all four safe-area edges.",
  },
  {
    id: "dynamic-island-clearance",
    status: "manual-required",
    requiredLayer: "physical-ios",
    reason: "A web page cannot detect Dynamic Island as a web API; only clearance around the physical sensor housing can be observed.",
    procedure: "On a Dynamic Island iPhone, inspect portrait and both landscape directions and verify that content and controls clear the sensor housing.",
  },
  {
    id: "ios-virtual-keyboard",
    status: "manual-required",
    requiredLayer: "physical-ios",
    reason: "A short desktop viewport is only a geometry proxy, not the iOS keyboard or its VisualViewport behavior.",
    procedure: "Exercise every field in Simulator first, then repeat on physical iOS with the system keyboard, autofill and OTP. Record VisualViewport resize and offsets, visibility, dismissal and rotation.",
  },
  {
    id: "ios-edge-gestures",
    status: "manual-required",
    requiredLayer: "physical-ios",
    reason: "Mouse and synthetic touch input cannot establish conflicts with iOS system gestures.",
    procedure: "On physical hardware, exercise left-edge back, bottom home, pull-to-refresh and horizontal component gestures; verify visible non-gesture alternatives.",
  },
  {
    id: "mobile-gpu-performance",
    status: "manual-required",
    requiredLayer: "physical-ios",
    reason: "Desktop and Simulator GPU, memory and thermal behavior do not represent an iPhone GPU under pressure.",
    procedure: "On a mid-range physical iPhone, record sustained frame pacing, DPR, memory pressure, background and foreground recovery, context loss and thermal degradation.",
  },
  {
    id: "installed-pwa-ios",
    status: "manual-required",
    requiredLayer: "physical-ios",
    reason: "Manifest and service-worker inspection do not prove the Add to Home Screen lifecycle or standalone behavior on iOS.",
    procedure: "Add the site to the Home Screen on physical iOS, cold-launch it, verify standalone safe areas, offline navigation, form persistence, update behavior and relaunch.",
  },
]);

const DEFAULT_PROFILES = Object.keys(PROFILES);
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
};

export function parseArgs(argv) {
  const out = {
    target: null,
    engines: ["chromium", "webkit"],
    profiles: [...DEFAULT_PROFILES],
    requireEngines: true,
    json: null,
    artifacts: "mobile-validation-artifacts",
    timeout: 30_000,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--require-engines") out.requireEngines = true;
    else if (arg === "--allow-missing-engines") out.requireEngines = false;
    else if (arg === "--engines") out.engines = String(argv[++i] || "").split(",").filter(Boolean);
    else if (arg === "--profiles") out.profiles = String(argv[++i] || "").split(",").filter(Boolean);
    else if (arg === "--json") out.json = argv[++i] || null;
    else if (arg === "--artifacts") out.artifacts = argv[++i] || "";
    else if (arg === "--timeout") out.timeout = Number(argv[++i]);
    else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else if (!out.target) out.target = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (out.help) return out;
  if (!out.target) throw new Error("A target URL or file path is required.");
  if (!out.engines.length || out.engines.some((name) => !ENGINE_DEFINITIONS[name])) {
    throw new Error("--engines accepts only chromium and webkit.");
  }
  if (!out.profiles.length || out.profiles.some((name) => !PROFILES[name])) {
    throw new Error(`--profiles accepts only ${Object.keys(PROFILES).join(", ")}.`);
  }
  if (!Number.isFinite(out.timeout) || out.timeout < 1_000) throw new Error("--timeout must be at least 1000ms.");
  if (!out.artifacts) throw new Error("--artifacts requires a directory.");
  return out;
}

export function classifyCheck({ kind, passed }) {
  if (kind === "manual") return "manual-required";
  if (kind === "proxy") return passed ? "proxy-pass" : "proxy-fail";
  if (kind === "direct") return passed ? "pass" : "fail";
  throw new Error(`Unknown check kind: ${kind}`);
}

export function summarize(checks) {
  const count = (status) => checks.filter((check) => check.status === status).length;
  return {
    passes: count("pass"),
    failures: count("fail"),
    proxyPasses: count("proxy-pass"),
    proxyFailures: count("proxy-fail"),
    manualRequired: count("manual-required"),
    unavailableEngines: count("unavailable"),
    errors: count("error"),
    iosValidated: false,
  };
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function canonicalizeReport(report) {
  const clean = structuredClone(report);
  delete clean.generatedAt;
  if (clean.artifactsRoot) clean.artifactsRoot = path.basename(clean.artifactsRoot);
  if (Array.isArray(clean.checks)) {
    clean.checks.sort((a, b) => [a.id, a.engine || "", a.profile || ""].join("|").localeCompare([b.id, b.engine || "", b.profile || ""].join("|")));
  }
  return sortValue(clean);
}

function helpText() {
  return `Usage: mobile-validate.mjs <url-or-file> [options]

Deterministic mobile-sized checks in desktop Chromium and Playwright desktop WebKit.
This command does not validate Safari on iOS or a physical Apple device.

Options:
  --engines chromium,webkit       Engines to run (default: both)
  --profiles portrait,landscape   Profiles to run (default: all four)
  --require-engines               Require every engine (default; retained for clarity)
  --allow-missing-engines         Permit unavailable engines but report them
  --json <file>                   Write the full JSON report
  --artifacts <directory>         Screenshot directory
  --timeout <milliseconds>        Navigation timeout (default: 30000)
  -h, --help                      Show this help
`;
}

function normalizeTarget(target) {
  try {
    const url = new URL(target);
    if (["http:", "https:"].includes(url.protocol)) return { kind: "url", value: url.href, display: url.href };
  } catch {}
  const absolute = path.resolve(target);
  if (!fs.existsSync(absolute)) throw new Error(`Target does not exist: ${target}`);
  const stat = fs.statSync(absolute);
  const file = stat.isDirectory() ? path.join(absolute, "index.html") : absolute;
  if (!fs.existsSync(file)) throw new Error(`No index.html found in target directory: ${target}`);
  return { kind: "file", value: file, display: path.relative(process.cwd(), file) || path.basename(file) };
}

export async function startStaticServer(file) {
  const root = path.dirname(file);
  const realRoot = fs.realpathSync.native(root);
  const entry = path.basename(file);
  const server = http.createServer((request, response) => {
    let requested;
    try { requested = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname); }
    catch { response.writeHead(400).end("Bad request"); return; }
    const relative = requested === "/" ? entry : requested.replace(/^\/+/, "");
    const candidate = path.resolve(root, relative);
    if (candidate !== root && !candidate.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden"); return;
    }
    fs.realpath(candidate, (realError, realCandidate) => {
      if (realError) { response.writeHead(realError.code === "ENOENT" ? 404 : 500).end("Not found"); return; }
      const relativeReal = path.relative(realRoot, realCandidate);
      if (relativeReal === ".." || relativeReal.startsWith(`..${path.sep}`) || path.isAbsolute(relativeReal)) {
        response.writeHead(403).end("Forbidden"); return;
      }
      fs.readFile(realCandidate, (error, body) => {
        if (error) { response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found"); return; }
        response.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(realCandidate).toLowerCase()] || "application/octet-stream" });
        response.end(body);
      });
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function check(id, kind, passed, engine, profile, evidence, note) {
  return { id, status: classifyCheck({ kind, passed }), engine, profile, evidence, ...(note ? { note } : {}) };
}

async function collectPageEvidence(page, profileName, runtimeMessages = { consoleErrors: [], pageErrors: [] }, manifestTimeoutMs = 5_000) {
  const data = await page.evaluate(async ({ currentProfile }) => {
    const visible = (element, rect) => {
      const style = getComputedStyle(element);
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[tabindex]:not([tabindex='-1'])")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const inlineTextLink = element.tagName === "A" && style.display === "inline" && !element.hasAttribute("role");
        return { tag: element.tagName.toLowerCase(), width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, visible: visible(element, rect), inlineTextLink };
      }).filter((item) => item.visible && !item.inlineTextLink);
    let unreadableStyleSheets = 0;
    let safeAreaDeclarations = 0;
    let dynamicViewportUnits = 0;
    const stripStrings = (value) => {
      let output = "";
      let quote = null;
      let escaped = false;
      for (const char of value) {
        if (escaped) { escaped = false; if (!quote) output += char; continue; }
        if (char === "\\") { escaped = true; continue; }
        if (quote) { if (char === quote) quote = null; continue; }
        if (char === '"' || char === "'") { quote = char; continue; }
        output += char;
      }
      return output;
    };
    const inspectRules = (rules) => {
      for (const rule of rules || []) {
        if (rule.style) {
          // cssText preserves env() where CSSOM may resolve the declaration value
          // to an empty string on a desktop with zero safe-area insets. CSSOM has
          // already removed comments; stripping quoted strings excludes examples
          // in generated content such as content: "env(safe-area-inset-top)".
          const declarations = stripStrings(rule.cssText || "");
          safeAreaDeclarations += (declarations.match(/env\(\s*safe-area-inset-(?:top|right|bottom|left)\b/gi) || []).length;
          dynamicViewportUnits += (declarations.match(/\b\d+(?:\.\d+)?(?:dvh|svh|lvh)\b/gi) || []).length;
        }
        if (rule.cssRules) inspectRules(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try { inspectRules(sheet.cssRules); }
      catch { unreadableStyleSheets++; }
    }
    const viewport = document.querySelector('meta[name="viewport"]')?.content || "";
    const manifestHref = document.querySelector('link[rel~="manifest"]')?.href || null;
    let serviceWorkers = null;
    if ("serviceWorker" in navigator) {
      try { serviceWorkers = (await navigator.serviceWorker.getRegistrations()).length; }
      catch { serviceWorkers = null; }
    }
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const webgl = gl ? {
      available: true,
      version: gl.getParameter(gl.VERSION),
      renderer: gl.getParameter(gl.RENDERER),
      loseContext: Boolean(gl.getExtension("WEBGL_lose_context")),
    } : { available: false };
    const vv = window.visualViewport;
    return {
      profile: currentProfile,
      viewportMeta: viewport,
      viewportFitCover: /(?:^|,)\s*viewport-fit\s*=\s*cover(?:\s*,|$)/i.test(viewport),
      zoomDisabled: /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0+)?(?:\s*,|$)/i.test(viewport),
      inner: { width: innerWidth, height: innerHeight },
      document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, clientHeight: document.documentElement.clientHeight, scrollHeight: document.documentElement.scrollHeight },
      visualViewport: vv ? { width: vv.width, height: vv.height, offsetLeft: vv.offsetLeft, offsetTop: vv.offsetTop, scale: vv.scale } : null,
      controls,
      css: {
        safeAreaDeclarations,
        dynamicViewportUnits,
        unreadableStyleSheets,
      },
      displayMode: {
        standalone: matchMedia("(display-mode: standalone)").matches,
        fullscreen: matchMedia("(display-mode: fullscreen)").matches,
        navigatorStandalone: navigator.standalone === true,
      },
      manifestHref,
      serviceWorkers,
      webgl,
      runningAnimations: document.getAnimations().filter((animation) => animation.playState === "running").length,
      prefersReducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  }, { currentProfile: profileName });
  data.manifest = null;
  if (data.manifestHref) {
    try {
      const response = await page.context().request.get(data.manifestHref, { timeout: manifestTimeoutMs });
      const body = await response.json();
      data.manifest = { ok: response.ok(), status: response.status(), display: body.display || null, name: body.name || body.short_name || null, icons: Array.isArray(body.icons) ? body.icons.length : 0 };
    } catch (error) {
      data.manifest = { ok: false, error: String(error.message || error), timedOut: /timeout/i.test(String(error.message || error)) };
    }
  }
  delete data.manifestHref;
  data.consoleErrors = [...new Set(runtimeMessages.consoleErrors)].sort();
  data.pageErrors = [...new Set(runtimeMessages.pageErrors)].sort();
  return data;
}

async function focusEvidence(page) {
  const locator = page.locator("input:not([type=hidden]):visible,textarea:visible,select:visible").first();
  if (await locator.count() === 0) return { applicable: false };
  await locator.scrollIntoViewIfNeeded();
  await locator.focus();
  await page.waitForTimeout(100);
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const vv = visualViewport;
    const top = vv?.offsetTop || 0;
    const bottom = top + (vv?.height || innerHeight);
    return { applicable: true, tag: element.tagName.toLowerCase(), top: rect.top, bottom: rect.bottom, viewportTop: top, viewportBottom: bottom, visible: rect.top >= top && rect.bottom <= bottom };
  });
}

function checksFromEvidence(engine, profile, data, focused) {
  const checks = [];
  const viewportPresent = /width\s*=\s*device-width/i.test(data.viewportMeta);
  checks.push(check("viewport-device-width", "direct", viewportPresent, engine, profile, { content: data.viewportMeta }));
  checks.push(check("zoom-not-disabled", "direct", !data.zoomDisabled, engine, profile, { content: data.viewportMeta }));
  checks.push(check("page-errors", "proxy", data.pageErrors.length === 0, engine, profile, { messages: data.pageErrors }));
  checks.push(check("console-errors", "proxy", data.consoleErrors.length === 0, engine, profile, { messages: data.consoleErrors }));
  checks.push(check("horizontal-overflow", "proxy", data.document.scrollWidth <= data.document.clientWidth + 1, engine, profile, { scrollWidth: data.document.scrollWidth, clientWidth: data.document.clientWidth }));
  const tooSmall = data.controls.filter((control) => control.width < 24 || control.height < 24);
  const belowComfort = data.controls.filter((control) => control.width < 44 || control.height < 44);
  checks.push(check("touch-target-floor", "proxy", tooSmall.length === 0, engine, profile, { checked: data.controls.length, failures: tooSmall.slice(0, 20), belowComfort: belowComfort.length }));
  checks.push(check("visual-viewport-api-smoke", "proxy", Boolean(data.visualViewport), engine, profile, { visualViewport: data.visualViewport, inner: data.inner }));
  checks.push(check("reduced-motion-preference", "proxy", profile !== "reduced-motion" || data.prefersReducedMotion, engine, profile, { requested: profile === "reduced-motion", matched: data.prefersReducedMotion, runningAnimations: data.runningAnimations }));
  checks.push(check("focused-control-visible", "proxy", !focused.applicable || focused.visible, engine, profile, focused, focused.applicable ? undefined : "No form control was present; focus geometry was not applicable."));
  if (data.css.safeAreaDeclarations > 0 || data.viewportFitCover) {
    const safeAreaConsistent = data.css.safeAreaDeclarations > 0 && data.viewportFitCover;
    checks.push(check("safe-area-structure", "direct", safeAreaConsistent, engine, profile, { viewportFitCover: data.viewportFitCover, declarations: data.css.safeAreaDeclarations, unreadableStyleSheets: data.css.unreadableStyleSheets }, "Presence and wiring only; absence is not a pass and desktop values are not physical safe-area evidence."));
  }
  if (data.manifest) checks.push(check("manifest-fetch", "direct", data.manifest.ok, engine, profile, data.manifest, "Manifest structure does not validate an installed iOS PWA."));
  checks.push(check("webgl-api-smoke", "proxy", data.webgl.available, engine, profile, data.webgl, "API availability is not mobile GPU performance evidence."));
  return checks;
}

async function runEngine(playwright, engineName, targetUrl, profiles, artifactsRoot, timeout) {
  const definition = ENGINE_DEFINITIONS[engineName];
  const browserType = playwright[engineName];
  let browser;
  try { browser = await browserType.launch({ headless: true }); }
  catch (error) {
    return {
      engine: { ...definition, availability: "unavailable", reason: String(error.message || error).split("\n")[0] },
      checks: [{ id: `engine-${engineName}`, engine: engineName, status: "unavailable", reason: String(error.message || error).split("\n")[0] }],
    };
  }
  const checks = [];
  const engineInfo = { ...definition, availability: "available", version: browser.version() };
  try {
    for (const profileName of profiles) {
      const profile = PROFILES[profileName];
      const context = await browser.newContext({
        viewport: profile.viewport,
        screen: profile.screen,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        reducedMotion: profile.reducedMotion,
        colorScheme: "light",
        locale: "en-US",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(timeout);
      const runtimeMessages = { consoleErrors: [], pageErrors: [] };
      page.on("console", (message) => { if (message.type() === "error") runtimeMessages.consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => runtimeMessages.pageErrors.push(error.message));
      try {
        const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout });
        checks.push(check("page-load", "proxy", !response || response.ok(), engineName, profileName, { status: response?.status() ?? null, url: page.url() }));
        let loadComplete = true;
        let loadError = null;
        try { await page.waitForLoadState("load", { timeout: Math.min(timeout, 10_000) }); }
        catch (error) { loadComplete = false; loadError = String(error.message || error).split("\n")[0]; }
        checks.push(check("load-event-complete", "proxy", loadComplete, engineName, profileName, { error: loadError }));
        await page.waitForTimeout(150);
        const focused = profileName === "keyboard-height-proxy" ? await focusEvidence(page) : { applicable: false };
        const evidence = await collectPageEvidence(page, profileName, runtimeMessages, Math.min(timeout, 5_000));
        checks.push(...checksFromEvidence(engineName, profileName, evidence, focused));
        const screenshot = path.join(artifactsRoot, `${engineName}-${profileName}.png`);
        try {
          await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
        } catch (error) {
          if (!/32767|larger than/i.test(String(error.message || error))) throw error;
          await page.screenshot({ path: screenshot, fullPage: false, animations: "disabled" });
          checks.push(check("screenshot-capped-to-viewport", "proxy", true, engineName, profileName, { reason: "Full-page height exceeded the engine screenshot limit." }));
        }
      } catch (error) {
        checks.push({ id: "runner", engine: engineName, profile: profileName, status: "error", reason: String(error.message || error).split("\n")[0] });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return { engine: engineInfo, checks };
}

export async function validateMobile(targetInput, options = {}) {
  const target = normalizeTarget(targetInput);
  const artifactsRoot = path.resolve(options.artifacts || "mobile-validation-artifacts");
  fs.mkdirSync(artifactsRoot, { recursive: true });
  let playwright;
  try {
    if (options.playwright) playwright = options.playwright;
    else {
      try { playwright = await import("playwright"); }
      catch {
        const requireFromProject = createRequire(path.join(process.cwd(), "package.json"));
        playwright = requireFromProject("playwright");
      }
    }
  }
  catch (error) {
    throw new Error(`Playwright is unavailable: ${String(error.message || error)}. Install it in the current project with: npm install --no-save --package-lock=false playwright@1.63.0`);
  }
  let server = null;
  let targetUrl = target.value;
  if (target.kind === "file") {
    server = await startStaticServer(target.value);
    targetUrl = server.url;
  }
  const engines = [];
  const checks = [];
  try {
    for (const engineName of options.engines || ["chromium", "webkit"]) {
      const result = await runEngine(playwright, engineName, targetUrl, options.profiles || DEFAULT_PROFILES, artifactsRoot, options.timeout || 30_000);
      engines.push(result.engine);
      checks.push(...result.checks);
    }
  } finally {
    if (server) await server.close();
  }
  checks.push(...MANUAL_CHECKS.map((item) => ({ ...item, layer: item.requiredLayer })));
  const report = {
    schemaVersion: 1,
    validationKind: "local-mobile-proxy",
    claim: "Desktop Chromium and Playwright desktop WebKit mobile-emulation validation",
    generatedAt: new Date().toISOString(),
    target: { kind: target.kind, value: target.display },
    artifactsRoot,
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    engines,
    checks,
    notValidated: [
      "Safari on iOS",
      "real iPhone or iPad safe areas and Dynamic Island clearance",
      "real iOS virtual keyboard and system edge gestures",
      "mobile GPU, memory and thermal performance",
      "installed iOS PWA lifecycle",
    ],
  };
  report.summary = summarize(checks);
  return report;
}

function exitCode(report, requireEngines) {
  if (report.summary.failures || report.summary.proxyFailures) return 1;
  if (report.summary.errors) return 4;
  if (requireEngines && report.summary.unavailableEngines) return 3;
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  let options;
  try { options = parseArgs(argv); }
  catch (error) { console.error(error.message); console.error(helpText()); return 2; }
  if (options.help) { console.log(helpText()); return 0; }
  try {
    const report = await validateMobile(options.target, options);
    const output = JSON.stringify(report, null, 2) + "\n";
    if (options.json) {
      const jsonPath = path.resolve(options.json);
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      fs.writeFileSync(jsonPath, output);
    }
    console.log(output.trimEnd());
    return exitCode(report, options.requireEngines);
  } catch (error) {
    console.error(String(error.stack || error));
    return 4;
  }
}

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) process.exitCode = await main();
