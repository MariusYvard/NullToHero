// WCAG 2.1 relative-luminance and contrast-ratio math, plus a small CSS color
// parser. Pure Node standard library, no dependencies. Used by the static
// analyzer to turn an (inline) text color and background color into a
// deterministic contrast verdict.
//
// Colour spaces: legacy sRGB syntax (named / hex / rgb()) plus the modern spaces
// this plugin itself prescribes — oklch(), oklab(), lab(), lch() — and hsl().
// That is not optional: design-tokens.md recommends OKLCH throughout, and
// inspect-rules.csv's own "good" example is `background: oklch(0.15 0.01 270)`.
// A parser that returns null for those makes L-CONTRAST-1 pass vacuously on
// exactly the sites that followed our advice.
//
// References:
//   https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
//   https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
//   https://www.w3.org/TR/css-color-4/#the-hsl-notation
//   https://www.w3.org/TR/css-color-4/#lab-colors
//   https://bottosson.github.io/posts/oklab/  (OKLab, Björn Ottosson)

// Minimal CSS named-color table (the common subset that shows up in real markup).
const NAMED = {
  black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000",
  blue: "#0000ff", gray: "#808080", grey: "#808080", silver: "#c0c0c0",
  maroon: "#800000", yellow: "#ffff00", olive: "#808000", lime: "#00ff00",
  aqua: "#00ffff", cyan: "#00ffff", teal: "#008080", navy: "#000080",
  fuchsia: "#ff00ff", magenta: "#ff00ff", purple: "#800080", orange: "#ffa500",
  transparent: "transparent",
};

// Parse a CSS color into { r, g, b, a } with channels 0-255 and alpha 0-1.
// Returns null when the value cannot be parsed deterministically.
export function parseColor(input) {
  if (!input || typeof input !== "string") return null;
  let v = input.trim().toLowerCase();
  if (NAMED[v]) v = NAMED[v];
  if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  // #rgb / #rgba / #rrggbb / #rrggbbaa
  let m = v.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  // rgb()/rgba()  — supports comma and space syntax, percent or 0-255
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,/\s]+/).filter(Boolean);
    if (parts.length >= 3) {
      const chan = (s) => s.endsWith("%")
        ? Math.round(parseFloat(s) * 2.55)
        : Math.round(parseFloat(s));
      const r = chan(parts[0]), g = chan(parts[1]), b = chan(parts[2]);
      const a = parts[3] !== undefined
        ? (parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]))
        : 1;
      if ([r, g, b].every((n) => Number.isFinite(n))) {
        return { r: clamp8(r), g: clamp8(g), b: clamp8(b), a: Number.isFinite(a) ? a : 1 };
      }
    }
  }

  // Modern CSS color functions. Grouped because they share argument shapes:
  // <fn>(c1 c2 c3[ / alpha]), comma syntax tolerated for hsl()'s legacy form.
  m = v.match(/^(hsla?|oklch|oklab|lch|lab)\(([^)]+)\)$/);
  if (m) {
    const fn = m[1];
    const args = splitArgs(m[2]);
    if (!args) return null;
    const [c1, c2, c3, alpha] = args;
    let rgb = null;
    if (fn === "hsl" || fn === "hsla") rgb = hslToRgb(c1, c2, c3);
    else if (fn === "oklch") rgb = oklabToRgb(...lchToLab(pctOr(c1, 1), c2, c3));
    else if (fn === "oklab") rgb = oklabToRgb(pctOr(c1, 1), c2, c3);
    else if (fn === "lch") rgb = labToRgb(...lchToLab(pctOr(c1, 100), c2, c3));
    else if (fn === "lab") rgb = labToRgb(pctOr(c1, 100), c2, c3);
    if (rgb) return { ...rgb, a: Number.isFinite(alpha) ? alpha : 1 };
  }

  return null;
}

// Split "a b c / d" or the legacy "a, b, c, d" into 4 numbers (alpha may be NaN).
// `none` is CSS Color 4 for "this channel is missing"; it behaves as 0.
function splitArgs(body) {
  const [head, tail] = body.split("/");
  const parts = head.trim().split(/[,\s]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const num = (s) => (s === "none" ? 0 : parseFloat(s));
  const c = parts.slice(0, 3).map(num);
  if (!c.every((n) => Number.isFinite(n))) return null;
  // Alpha rides either after the slash or as a 4th comma-separated value.
  const aRaw = tail !== undefined ? tail.trim() : parts[3];
  let a = NaN;
  if (aRaw !== undefined) a = aRaw.endsWith("%") ? parseFloat(aRaw) / 100 : parseFloat(aRaw);
  // Percent channels are re-expanded by the caller via pctOr / the raw strings.
  c.pct = parts.slice(0, 3).map((s) => s.endsWith("%"));
  return [rawOrPct(parts[0]), rawOrPct(parts[1]), rawOrPct(parts[2]), a];
}

// Keep percent-ness with the value so each space can scale it correctly:
// L is 0..1 in OKLab but 0..100 in Lab, and a/b/C are percent-relative too.
function rawOrPct(s) {
  if (s === "none") return { v: 0, pct: false };
  const v = parseFloat(s);
  return { v, pct: s.endsWith("%") };
}

// Resolve a channel that may be a percentage, where 100% === `full`.
function pctOr({ v, pct }, full) { return pct ? (v / 100) * full : v; }

function clamp8(n) { return Math.max(0, Math.min(255, n)); }
function clamp01(n) { return Math.max(0, Math.min(1, n)); }

// --- HSL ------------------------------------------------------------------
function hslToRgb(H, S, L) {
  const h = ((H.v % 360) + 360) % 360;
  const s = clamp01(S.pct || S.v > 1 ? S.v / 100 : S.v);
  const l = clamp01(L.pct || L.v > 1 ? L.v / 100 : L.v);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m0 = l - c / 2;
  const seg = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return {
    r: clamp8(Math.round((seg[0] + m0) * 255)),
    g: clamp8(Math.round((seg[1] + m0) * 255)),
    b: clamp8(Math.round((seg[2] + m0) * 255)),
  };
}

// --- polar to rectangular (shared by oklch/lch) ---------------------------
function lchToLab(L, C, H) {
  const c = C.pct ? (C.v / 100) * 0.4 : C.v; // 100% chroma is 0.4 in OKLCH per CSS Color 4
  const h = (H.v * Math.PI) / 180;
  return [L, { v: c * Math.cos(h), pct: false }, { v: c * Math.sin(h), pct: false }];
}

// --- OKLab (Björn Ottosson) ----------------------------------------------
function oklabToRgb(L, A, B) {
  const a = A.pct ? (A.v / 100) * 0.4 : A.v;
  const b = B.pct ? (B.v / 100) * 0.4 : B.v;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return linearToSrgb(
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  );
}

// --- CIE Lab (D50, matching CSS Color 4) ----------------------------------
function labToRgb(L, A, B) {
  const a = A.pct ? (A.v / 100) * 125 : A.v;
  const b = B.pct ? (B.v / 100) * 125 : B.v;
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const e = 216 / 24389, k = 24389 / 27;
  const f2 = (t) => (t ** 3 > e ? t ** 3 : (116 * t - 16) / k);
  // D50 reference white
  const X = f2(fx) * 0.3457 / 0.3585, Y = (L > k * e ? ((L + 16) / 116) ** 3 : L / k), Z = f2(fz) * (1 - 0.3457 - 0.3585) / 0.3585;
  // D50 XYZ -> linear sRGB (Bradford-adapted)
  return linearToSrgb(
    +3.1341359569 * X - 1.6173209458 * Y - 0.4906244790 * Z,
    -0.9787375540 * X + 1.9161638712 * Y + 0.0334756169 * Z,
    +0.0719542332 * X - 0.2289822698 * Y + 1.4053521003 * Z,
  );
}

// Linear-light sRGB to 0-255. Out-of-gamut components are clipped, which is what
// a browser does for display and therefore what a contrast verdict should assume.
function linearToSrgb(lr, lg, lb) {
  const enc = (x) => {
    const c = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055;
    return clamp8(Math.round(clamp01(c) * 255));
  };
  return { r: enc(lr), g: enc(lg), b: enc(lb) };
}

// Composite a (possibly translucent) foreground over an opaque background.
export function flatten(fg, bg) {
  if (!fg) return bg;
  if (fg.a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function channelLum(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// Relative luminance of an opaque color (0 black .. 1 white).
export function luminance({ r, g, b }) {
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

// Contrast ratio between two opaque colors, 1.0 .. 21.0, rounded to 2 dp.
export function contrastRatio(fg, bg) {
  const L1 = luminance(fg), L2 = luminance(bg);
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

// WCAG AA threshold for the given text metrics. Large text is >= 24px, or
// >= 18.66px when bold (>= 700).
export function aaThreshold({ fontSizePx = 16, bold = false } = {}) {
  const large = fontSizePx >= 24 || (bold && fontSizePx >= 18.66);
  return large ? 3.0 : 4.5;
}

// Convenience: ratio of two CSS color strings over an opaque background.
// Returns { ratio, fg, bg } or null when either color is unparseable.
export function ratioOf(fgStr, bgStr) {
  const bg0 = parseColor(bgStr);
  const fg0 = parseColor(fgStr);
  if (!fg0 || !bg0) return null;
  const bg = bg0.a < 1 ? flatten(bg0, { r: 255, g: 255, b: 255, a: 1 }) : bg0;
  const fg = flatten(fg0, bg);
  return { ratio: contrastRatio(fg, bg), fg, bg };
}
