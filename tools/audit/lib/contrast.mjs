// WCAG 2.1 relative-luminance and contrast-ratio math, plus a small CSS color
// parser. Pure Node standard library, no dependencies. Used by the static
// analyzer to turn an (inline) text color and background color into a
// deterministic contrast verdict.
//
// References:
//   https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
//   https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio

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
  return null;
}

function clamp8(n) { return Math.max(0, Math.min(255, n)); }

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
