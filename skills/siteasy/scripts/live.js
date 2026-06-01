/* siteasy live — browser picker client (maison implementation).
 * Served by live-server.mjs at /live.js with __LIVE_PORT__ / __LIVE_TOKEN__ filled in.
 * Pick an element, choose an action, Go. The agent generates variants into source;
 * this client cycles them and sends accept/discard. No external dependencies.
 *
 * Maison simplification vs upstream impeccable: comments and strokes are sent as
 * structured data only; no rasterized annotated screenshot (screenshotPath) is produced.
 */
(function () {
  "use strict";
  if (window.__siteasyLive) return;
  window.__siteasyLive = true;

  var PORT = "__LIVE_PORT__", TOKEN = "__LIVE_TOKEN__";
  var BASE = "http://localhost:" + PORT;
  var ACTIONS = ["amplify","simplify","animate","typeset","layout","adapt","delight","polish","overdrive"];

  var state = { picked: null, mode: "idle", comments: [], strokes: [], lastFile: null, eventId: 0 };

  // ---- styles ----
  var css = document.createElement("style");
  css.textContent = [
    ".sl-hl{outline:2px solid #22c55e!important;outline-offset:2px;cursor:crosshair}",
    ".sl-bar{position:fixed;z-index:2147483647;bottom:16px;left:50%;transform:translateX(-50%);",
      "background:#0b1020;color:#e8edf5;font:13px system-ui;border:1px solid #2a3550;border-radius:10px;",
      "padding:10px 12px;display:flex;gap:8px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,.4)}",
    ".sl-bar button{background:#1b2540;color:#e8edf5;border:1px solid #33406b;border-radius:6px;padding:5px 9px;cursor:pointer}",
    ".sl-bar button.go{background:#22c55e;color:#06210f;border-color:#22c55e;font-weight:600}",
    ".sl-bar select,.sl-bar input{background:#121a30;color:#e8edf5;border:1px solid #33406b;border-radius:6px;padding:5px}",
    ".sl-canvas{position:fixed;inset:0;z-index:2147483646;pointer-events:none}"
  ].join("");
  document.documentElement.appendChild(css);

  // ---- SSE ----
  var es = new EventSource(BASE + "/events?token=" + TOKEN);
  es.onmessage = function (m) {
    var ev; try { ev = JSON.parse(m.data); } catch { return; }
    if (ev.type === "reply") {
      if (ev.file) state.lastFile = ev.file;
      if (ev.status === "done") { setTimeout(function(){ location.reload(); }, 150); }
      else if (ev.status === "error") { bar("Generation error: " + (ev.reason||""), true); }
    }
  };

  function post(body) {
    return fetch(BASE + "/event", { method: "POST",
      headers: { "content-type": "application/json", "x-live-token": TOKEN }, body: JSON.stringify(body) });
  }

  // ---- element picking ----
  var hovered = null;
  function onMove(e) {
    if (state.mode !== "picking") return;
    var el = e.target;
    if (el === hovered || (el.closest && el.closest(".sl-bar"))) return;
    if (hovered) hovered.classList.remove("sl-hl");
    hovered = el; el.classList.add("sl-hl");
  }
  function onClick(e) {
    if (state.mode !== "picking") return;
    if (e.target.closest && e.target.closest(".sl-bar")) return;
    e.preventDefault(); e.stopPropagation();
    pick(e.target);
  }
  function pick(el) {
    state.picked = el; state.comments = []; state.strokes = [];
    if (hovered) hovered.classList.remove("sl-hl");
    el.classList.add("sl-hl");
    state.mode = "configuring";
    renderConfigBar();
  }

  function describe(el) {
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      id: el.id || null,
      classes: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "").toString().split(/\s+/).filter(Boolean),
      tagName: el.tagName.toLowerCase(),
      textContent: (el.textContent || "").trim().slice(0, 200),
      outerHTML: el.outerHTML.slice(0, 6000),
      boundingRect: { x: r.x, y: r.y, width: r.width, height: r.height },
      computed: { color: cs.color, background: cs.backgroundColor, font: cs.font, display: cs.display }
    };
  }

  // ---- bars ----
  var barEl = null;
  function bar(msg, isErr) {
    clearBar();
    barEl = document.createElement("div"); barEl.className = "sl-bar";
    var span = document.createElement("span");
    span.style.color = isErr ? "#f87171" : "#9fb3d8";
    span.textContent = msg;
    barEl.appendChild(span);
    document.body.appendChild(barEl);
  }
  function clearBar() { if (barEl && barEl.parentNode) barEl.parentNode.removeChild(barEl); barEl = null; }

  function renderStartBar() {
    clearBar();
    barEl = document.createElement("div"); barEl.className = "sl-bar";
    var b = document.createElement("button"); b.textContent = "Pick element";
    b.onclick = function () { state.mode = "picking"; bar("Click an element to design…"); };
    var x = document.createElement("button"); x.textContent = "Exit";
    x.onclick = function () { post({ type: "exit" }); clearBar(); es.close(); };
    barEl.appendChild(b); barEl.appendChild(x); document.body.appendChild(barEl);
  }

  function renderConfigBar() {
    clearBar();
    barEl = document.createElement("div"); barEl.className = "sl-bar";
    var sel = document.createElement("select");
    var of = document.createElement("option"); of.value = ""; of.textContent = "freeform"; sel.appendChild(of);
    ACTIONS.forEach(function (a) { var o = document.createElement("option"); o.value = a; o.textContent = a; sel.appendChild(o); });
    var prompt = document.createElement("input"); prompt.placeholder = "freeform prompt (optional)"; prompt.size = 22;
    var go = document.createElement("button"); go.className = "go"; go.textContent = "Go";
    go.onclick = function () { sendGenerate(sel.value, prompt.value); };
    var cancel = document.createElement("button"); cancel.textContent = "✕";
    cancel.onclick = function () { if (state.picked) state.picked.classList.remove("sl-hl"); state.picked = null; renderStartBar(); };
    barEl.appendChild(sel); barEl.appendChild(prompt); barEl.appendChild(go); barEl.appendChild(cancel);
    document.body.appendChild(barEl);
  }

  function sendGenerate(action, freeform) {
    if (!state.picked) return;
    state.eventId++;
    var ev = {
      type: "generate", id: String(state.eventId),
      action: action || "siteasy", freeformPrompt: freeform || null,
      count: 3, pageUrl: location.pathname,
      element: describe(state.picked),
      comments: state.comments, strokes: state.strokes
    };
    bar("Generating 3 variants… (agent working)");
    post(ev);
  }

  // ---- variant cycling (after reload, if source has variant blocks) ----
  function initVariantCycler() {
    var variants = Array.prototype.slice.call(document.querySelectorAll("[data-siteasy-variant]"));
    if (!variants.length) { renderStartBar(); return; }
    var idx = 0;
    function show(i) { variants.forEach(function (v, j) { v.style.display = j === i ? "" : "none"; }); idx = i; }
    show(0);
    clearBar();
    barEl = document.createElement("div"); barEl.className = "sl-bar";
    var label = document.createElement("span"); label.textContent = "Variant 1/" + variants.length;
    var prev = document.createElement("button"); prev.textContent = "‹";
    var next = document.createElement("button"); next.textContent = "›";
    prev.onclick = function () { show((idx - 1 + variants.length) % variants.length); label.textContent = "Variant " + (idx+1) + "/" + variants.length; };
    next.onclick = function () { show((idx + 1) % variants.length); label.textContent = "Variant " + (idx+1) + "/" + variants.length; };
    var acc = document.createElement("button"); acc.className = "go"; acc.textContent = "Accept";
    acc.onclick = function () { post({ type: "accept", id: String(++state.eventId), variantId: variants[idx].getAttribute("data-siteasy-variant"), file: state.lastFile }); clearBar(); };
    var dis = document.createElement("button"); dis.textContent = "Discard";
    dis.onclick = function () { post({ type: "discard", id: String(++state.eventId), file: state.lastFile }); clearBar(); };
    [label, prev, next, acc, dis].forEach(function (n) { barEl.appendChild(n); });
    document.body.appendChild(barEl);
  }

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.mode === "picking") { state.mode = "idle"; renderStartBar(); } });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initVariantCycler);
  else initVariantCycler();
})();
