// La règle de mise à l'échelle de l'aperçu téléphone : l'appareil entre dans
// le volet sans le faire défiler, et ne grossit jamais au-delà de sa taille.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { fitDevice } = createRequire(import.meta.url)("../null-to-hero/tools/cms/nth-backend.js");

function device(stageH, stageW) {
  const node = {
    offsetHeight: 872, offsetWidth: 418, style: {},
    parentNode: { clientHeight: stageH, clientWidth: stageW },
  };
  fitDevice(node);
  return Number(/scale\(([\d.]+)\)/.exec(node.style.transform)[1]);
}

test("un volet trop court réduit l'appareil pour qu'il tienne", () => {
  const k = device(600, 900);
  assert.ok(k < 1);
  assert.ok(872 * k <= 600, "l'appareil dépasse encore la hauteur du volet");
});

test("un volet étroit réduit aussi sur la largeur", () => {
  assert.ok(418 * device(2000, 300) <= 300);
});

test("un volet vaste ne grossit pas l'appareil", () => {
  assert.equal(device(2000, 2000), 1);
});

test("un volet de hauteur nulle ne produit pas d'échelle absurde", () => {
  assert.equal(device(0, 0), 1);
});

// Le volet lui-même : sa hauteur descend jusqu'au bas de la fenêtre où il est
// posé, qui n'est pas celle du script quand Decap rend l'aperçu dans une iframe.
const { fitPane } = createRequire(import.meta.url)("../null-to-hero/tools/cms/nth-backend.js");

function pane(top, viewHeight, scriptHeight) {
  const before = globalThis.window;
  globalThis.window = { innerHeight: scriptHeight, addEventListener() {} };
  const body = { style: {} };
  const node = {
    style: {},
    getBoundingClientRect: () => ({ top: top }),
    ownerDocument: { body: body, defaultView: { innerHeight: viewHeight, addEventListener() {} } },
  };
  try { fitPane(node); } finally { globalThis.window = before; }
  return { height: node.style.height, bodyMargin: body.style.margin };
}

test("le volet s'arrête au bas de la fenêtre qui le porte", () => {
  assert.equal(pane(0, 608, 674).height, "608px");
});

test("la fenêtre du script ne sert pas de mesure", () => {
  assert.equal(pane(8, 608, 674).height, "600px");
});

test("la marge du corps de l'iframe est remise à zéro", () => {
  assert.equal(pane(0, 608, 674).bodyMargin, "0");
});

test("un bloc déjà hors champ garde une hauteur utilisable", () => {
  assert.equal(pane(900, 608, 674).height, "240px");
});

// L'aperçu ordinateur : l'écran garde 1280 px de large quelle que soit la
// largeur du volet, sinon le site répond avec sa mise en page étroite.
const { fitDesktop } = createRequire(import.meta.url)("../null-to-hero/tools/cms/nth-backend.js");

function desk(stageW, stageH) {
  const node = { style: {}, parentNode: { clientWidth: stageW, clientHeight: stageH } };
  fitDesktop(node);
  return { ...node.style, k: Number(/scale\(([\d.]+)\)/.exec(node.style.transform)[1]) };
}

test("l'écran vaut 1280 px même dans un volet de 740", () => {
  assert.equal(desk(740, 590).width, "1280px");
});

test("le rendu est réduit pour tenir dans la largeur du volet", () => {
  const d = desk(740, 590);
  assert.ok(Math.abs(1280 * d.k - 740) < 1);
});

test("la hauteur de l'écran remplit le volet une fois réduite", () => {
  const d = desk(740, 590);
  assert.ok(Math.abs(parseInt(d.height, 10) * d.k - 590) < 2);
});

test("un volet plus large que 1280 n'agrandit pas le rendu", () => {
  assert.equal(desk(1600, 900).k, 1);
});
