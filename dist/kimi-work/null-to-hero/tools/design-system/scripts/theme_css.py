#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Theme CSS generator. From a few brand inputs, emit a drop-in :root stylesheet:
semantic color tokens with WCAG contrast checks, an elevation ramp, a fluid type
scale, spacing and radius scales, focus-visible, a reduced-motion guard and a print
sheet. Pure standard library, no dependencies.

Usage:
  python theme_css.py --bg "#0B0B0C" --ink "#F5F5F4" --accent "#6E56CF" \
      [--accent-ink "#FFFFFF"] [--font "Geist, system-ui, sans-serif"] \
      [--font-head "Cabinet Grotesk, serif"] [--radius 10] [--ratio 1.25] [--out theme.css]

Colors are sRGB mixes for a starter; refine in OKLCH afterwards. Contrast uses the
WCAG 2.1 relative-luminance formula. A pairing below its threshold is flagged in a
CSS comment, never silently shipped.
"""
import argparse, re, sys

HEX = re.compile(r"^#([0-9a-fA-F]{6})$")

def parse_hex(h):
    if not HEX.match(h):
        raise SystemExit(f"Invalid hex color: {h} (expected #RRGGBB)")
    h = h[1:]
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def to_hex(rgb):
    return "#%02X%02X%02X" % tuple(max(0, min(255, round(c))) for c in rgb)

def _lin(v):
    v /= 255.0
    return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

def lum(rgb):
    r, g, b = (_lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def mix(rgb, target, t):
    return tuple(rgb[i] + (target[i] - rgb[i]) * t for i in range(3))

WHITE, BLACK = (255, 255, 255), (0, 0, 0)

def ramp(base):
    out = {}
    for name, t in [("50", 0.94), ("100", 0.86), ("200", 0.72), ("300", 0.54), ("400", 0.30)]:
        out[name] = to_hex(mix(base, WHITE, t))
    out["500"] = to_hex(base)
    for name, t in [("600", 0.18), ("700", 0.36), ("800", 0.56), ("900", 0.74)]:
        out[name] = to_hex(mix(base, BLACK, t))
    return out

def fluid(n, ratio):
    maxpx = 16 * (ratio ** n)
    minpx = 16 * (ratio ** (n * 0.62)) if n > 0 else maxpx
    if abs(maxpx - minpx) < 0.5:
        return f"{maxpx/16:.3f}rem"
    span = (maxpx - minpx) / 9.2
    return f"clamp({minpx/16:.3f}rem, calc({minpx/16:.3f}rem + {span:.2f}vw), {maxpx/16:.3f}rem)"

def emit_tailwind(t, a):
    """Tailwind v4 @theme. v4 reads the theme from CSS, so this is the same token
    set under the names Tailwind generates utilities from. Note --spacing-*, not
    --space-*: Tailwind owns that prefix and a mismatch produces no utility and no
    error."""
    L = ["/* Tailwind v4. Import once, then use bg-bg, text-fg, border-border. */",
         "@theme {",
         f"  --font-sans: {a.font};",
         f"  --font-head: {a.font_head or a.font};"]
    for k in ("bg", "surface", "fg", "fg-muted", "border", "accent", "accent-ink", "ring"):
        L.append(f"  --color-{k}: {t[k]};")
    for k, v in t["neutral"].items(): L.append(f"  --color-neutral-{k}: {v};")
    for k, v in t["accent-ramp"].items(): L.append(f"  --color-accent-{k}: {v};")
    for i in [1, 2, 3, 4, 6, 8, 12, 16]:
        L.append(f"  --spacing-{i}: {i*0.25:.2f}rem;")
    for name, n in t["text"]: L.append(f"  --text-{name}: {n};")
    L.append(f"  --radius-sm: {max(0, a.radius-4):g}px;")
    L.append(f"  --radius: {a.radius:g}px;")
    L.append(f"  --radius-lg: {a.radius+6:g}px;")
    L.append("}")
    return "\n".join(L) + "\n"


def emit_dtcg(t, a):
    """W3C Design Tokens Community Group JSON. The type scale is dropped rather
    than exported: its values are clamp() expressions, which $type "dimension"
    cannot carry, and a token that lies about its type is worse than an absent
    one."""
    import json
    colors = {k: {"$value": t[k], "$type": "color"}
              for k in ("bg", "surface", "fg", "fg-muted", "border", "accent", "accent-ink", "ring")}
    colors["neutral"] = {k: {"$value": v, "$type": "color"} for k, v in t["neutral"].items()}
    colors["accent-scale"] = {k: {"$value": v, "$type": "color"} for k, v in t["accent-ramp"].items()}
    doc = {
        "$schema": "https://tr.designtokens.org/format/",
        "$description": "Generated starter. Colours are sRGB mixes; refine in OKLCH before shipping. The fluid type scale is not exported, see the note in theme_css.py.",
        "color": colors,
        "space": {str(i): {"$value": f"{i*0.25:.2f}rem", "$type": "dimension"} for i in [1, 2, 3, 4, 6, 8, 12, 16]},
        "radius": {
            "sm": {"$value": f"{max(0, a.radius-4):g}px", "$type": "dimension"},
            "base": {"$value": f"{a.radius:g}px", "$type": "dimension"},
            "lg": {"$value": f"{a.radius+6:g}px", "$type": "dimension"},
        },
        "font": {
            "sans": {"$value": a.font, "$type": "fontFamily"},
            "head": {"$value": a.font_head or a.font, "$type": "fontFamily"},
        },
    }
    return json.dumps(doc, indent=2, ensure_ascii=False) + "\n"


def emit_shadcn(t, a):
    """shadcn/ui variables. The one mapping worth stating: shadcn's --accent is the
    subtle hover surface, not the brand colour. The brand goes to --primary. Wiring
    the brand into --accent turns every hover row into a block of brand colour,
    which is the mistake that makes a shadcn app look mis-themed rather than
    themed."""
    pairs = [
        ("background", t["bg"]), ("foreground", t["fg"]),
        ("card", t["surface"]), ("card-foreground", t["fg"]),
        ("popover", t["surface"]), ("popover-foreground", t["fg"]),
        ("primary", t["accent"]), ("primary-foreground", t["accent-ink"]),
        ("secondary", t["surface"]), ("secondary-foreground", t["fg"]),
        ("muted", t["surface"]), ("muted-foreground", t["fg-muted"]),
        ("accent", t["surface"]), ("accent-foreground", t["fg"]),
        ("border", t["border"]), ("input", t["border"]), ("ring", t["accent"]),
    ]
    L = ["/* shadcn/ui. Paste into globals.css. Values are hex, which shadcn accepts;",
         "   convert to OKLCH when you refine the palette. */",
         ":root {"]
    L += [f"  --{k}: {v};" for k, v in pairs]
    L.append(f"  --radius: {a.radius:g}px;")
    L.append("  /* --destructive and --destructive-foreground are not derived from the")
    L.append("     brand inputs. Choose them deliberately: a destructive colour that")
    L.append("     falls out of a hue ramp is the one that reads as decoration. */")
    L.append("}")
    return "\n".join(L) + "\n"


def emit_decap(t, a):
    """admin/theme.css for a Decap CMS admin page.

    Two halves, and the difference between them matters.

    The first is ours and it is contractual. nth-backend.js renders the login
    screen and reads these custom properties, so a client sees their own colours
    on the one page that is entirely ours.

    The second repaints Decap's own chrome, and it is not contractual. Decap has
    no CSS variables: its seventeen chrome colours are constants in a plain
    JavaScript object (decap-cms-ui-default/src/styles.js) compiled into the
    bundle by Emotion. The only handle left is the class names, which stay
    readable because the repository sets autoLabel: 'always' in babel.config.js.
    A component renamed upstream breaks a selector here, silently, and the way
    that is caught is by pinning the bundle to an exact version and reviewing
    this file when it moves. Say that to the client rather than promising a
    themeable editor."""
    ink, bg = parse_hex(a.ink), parse_hex(a.bg)
    on_accent = a.accent_ink
    line = to_hex(mix(bg, ink, 0.16))
    L = [
        "/* Generated by theme_css.py --format decap. The admin page only.",
        "   The site's own stylesheet is not loaded here and must not be. */",
        "",
        ":root {",
        f"  --nth-admin-paper: {a.bg};",
        f"  --nth-admin-surface: {t['surface']};",
        f"  --nth-admin-ink: {a.ink};",
        f"  --nth-admin-ink-muted: {t['fg-muted']};",
        f"  --nth-admin-line: {line};",
        f"  --nth-admin-accent: {a.accent};",
        f"  --nth-admin-on-accent: {on_accent};",
        f"  --nth-admin-danger: #B00020;",
        f"  --nth-admin-font: {a.font};",
        f"  --nth-admin-radius: {a.radius:g}px;",
        "}",
        "",
        "/* Everything below reaches into Decap's own markup and is NOT contractual.",
        "   Decap compiles its colours as JavaScript constants, so there is no",
        "   variable to set; these attribute selectors match the Emotion labels the",
        "   bundle emits. Pin the bundle version, and read this file again when it",
        "   moves. cms-lint.mjs checks that the pinned version and the vendored file",
        "   still agree. */",
        "",
        "#nc-root {",
        "  font-family: var(--nth-admin-font);",
        "  background: var(--nth-admin-paper);",
        "  color: var(--nth-admin-ink);",
        "}",
        "",
        '#nc-root [class*="AppHeader"] {',
        "  background: var(--nth-admin-accent);",
        "  color: var(--nth-admin-on-accent);",
        "}",
        "",
        '#nc-root [class*="AppHeaderButton"]:hover,',
        '#nc-root [class*="AppHeaderNavLink"]:hover {',
        "  color: var(--nth-admin-on-accent);",
        "  opacity: 0.85;",
        "}",
        "",
        '#nc-root [class*="SidebarNavLink"][class*="active"],',
        '#nc-root [class*="PublishButton"],',
        '#nc-root [class*="CollectionTopNewButton"] {',
        "  background: var(--nth-admin-accent);",
        "  color: var(--nth-admin-on-accent);",
        "  border-radius: var(--nth-admin-radius);",
        "}",
        "",
        '#nc-root [class*="CardCollection"],',
        '#nc-root [class*="ControlPaneContainer"],',
        '#nc-root [class*="PreviewPaneContainer"] {',
        "  background: var(--nth-admin-surface);",
        "  border-color: var(--nth-admin-line);",
        "  border-radius: var(--nth-admin-radius);",
        "}",
        "",
        '#nc-root [class*="CardTitle"],',
        '#nc-root [class*="CollectionTopHeading"] {',
        "  color: var(--nth-admin-ink);",
        "}",
        "",
        '#nc-root [class*="CollectionTopDescription"],',
        '#nc-root [class*="CardDateContainer"] {',
        "  color: var(--nth-admin-ink-muted);",
        "}",
        "",
        "/* Decap draws no visible focus ring on several of its controls, which is a",
        "   keyboard user's only way of knowing where they are. This is the one rule",
        "   here that is a fix rather than a repaint. */",
        "#nc-root :focus-visible {",
        "  outline: 2px solid var(--nth-admin-accent);",
        "  outline-offset: 2px;",
        "}",
        "",
        "@media (prefers-reduced-motion: reduce) {",
        "  #nc-root *, #nth-login * {",
        "    animation-duration: 0.01ms !important;",
        "    transition-duration: 0.01ms !important;",
        "  }",
        "}",
    ]
    warn = contrast(parse_hex(a.accent), parse_hex(on_accent))
    if warn < 4.5:
        L.insert(2, f"/* WARNING: accent on accent-ink is {warn:.2f}:1, below 4.5:1. "
                    "The header and every primary button fail here. */")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser(description="Emit a drop-in :root theme stylesheet.")
    ap.add_argument("--bg", default="#0B0B0C")
    ap.add_argument("--ink", default="#F5F5F4")
    ap.add_argument("--accent", default="#6E56CF")
    ap.add_argument("--accent-ink", default="#FFFFFF")
    ap.add_argument("--font", default="Geist, system-ui, sans-serif")
    ap.add_argument("--font-head", default=None)
    ap.add_argument("--radius", type=float, default=10)
    ap.add_argument("--ratio", type=float, default=1.25)
    ap.add_argument("--out", default=None)
    ap.add_argument("--format", default="css", choices=["css", "tailwind", "dtcg", "shadcn", "decap"],
                    help="css (default) | tailwind (v4 @theme) | dtcg (W3C tokens JSON) | shadcn (globals.css vars) | decap (admin/theme.css)")
    a = ap.parse_args()
    bg = parse_hex(a.bg); ink = parse_hex(a.ink); accent = parse_hex(a.accent); aink = parse_hex(a.accent_ink)
    surface = to_hex(mix(bg, ink, 0.05))
    fg_muted = to_hex(mix(ink, bg, 0.32))
    border = to_hex(mix(bg, ink, 0.16))
    nr = ramp(mix((128, 128, 128), bg, 0.12))
    ar = ramp(accent)

    # One computation, five spellings. The formats existed as columns in colors.csv
    # and typography.csv and as prose in document.md, and nothing wrote them, so a
    # project on Tailwind or shadcn re-typed the palette by hand.
    tok = {
        "bg": a.bg, "surface": surface, "fg": a.ink, "fg-muted": fg_muted,
        "border": border, "accent": a.accent, "accent-ink": a.accent_ink, "ring": a.accent,
        "neutral": nr, "accent-ramp": ar,
        "text": [(name, fluid(n, a.ratio)) for name, n in
                 [("xs", -1), ("sm", -0.4), ("base", 0), ("lg", 1), ("xl", 2), ("2xl", 3), ("3xl", 4), ("4xl", 5)]],
    }
    if a.format != "css":
        out = {"tailwind": emit_tailwind, "dtcg": emit_dtcg,
               "shadcn": emit_shadcn, "decap": emit_decap}[a.format](tok, a)
        if a.out:
            open(a.out, "w", encoding="utf-8", newline="\n").write(out)
            print(f"Wrote {a.out}")
        else:
            sys.stdout.write(out)
        return

    L = []
    L.append("/* Generated theme. Tokens are a starter; refine the palette in OKLCH. */")
    L.append("/* WCAG: body text needs 4.5:1; large text and UI components need 3:1. */")
    for label, val, thr in [("fg on bg", contrast(ink, bg), 4.5),
                            ("muted on bg", contrast(parse_hex(fg_muted), bg), 4.5),
                            ("accent-ink on accent", contrast(aink, accent), 4.5)]:
        L.append(f"/* contrast {label}: {val:.2f}:1 (need {thr}) -> {'PASS' if val>=thr else 'FAIL, adjust before shipping'} */")
    L.append(":root {")
    L.append(f"  --font-sans: {a.font};")
    L.append(f"  --font-head: {a.font_head or a.font};")
    L.append(f"  --bg: {a.bg};")
    L.append(f"  --surface: {surface};")
    L.append(f"  --fg: {a.ink};")
    L.append(f"  --fg-muted: {fg_muted};")
    L.append(f"  --border: {border};")
    L.append(f"  --accent: {a.accent};")
    L.append(f"  --accent-ink: {a.accent_ink};")
    L.append(f"  --ring: {a.accent};")
    for k, v in nr.items(): L.append(f"  --neutral-{k}: {v};")
    for k, v in ar.items(): L.append(f"  --accent-{k}: {v};")
    for i, (oy, bl, op) in enumerate([(1, 2, 0.20), (2, 4, 0.20), (4, 8, 0.18), (8, 16, 0.16), (16, 24, 0.14)], 1):
        L.append(f"  --elevation-{i}: 0 {oy}px {bl}px rgb(0 0 0 / {op});")
    L.append(f"  --radius-sm: {max(0, a.radius-4):g}px;")
    L.append(f"  --radius: {a.radius:g}px;")
    L.append(f"  --radius-lg: {a.radius+6:g}px;")
    for i in [1, 2, 3, 4, 6, 8, 12, 16]:
        L.append(f"  --space-{i}: {i*0.25:.2f}rem;")
    for name, n in [("xs", -1), ("sm", -0.4), ("base", 0), ("lg", 1), ("xl", 2), ("2xl", 3), ("3xl", 4), ("4xl", 5)]:
        L.append(f"  --text-{name}: {fluid(n, a.ratio)};")
    L.append("  --measure: 70ch;")
    L.append("}")
    L.append("")
    L.append("*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }")
    L.append("@media (prefers-reduced-motion: reduce) {")
    L.append("  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }")
    L.append("}")
    L.append("@media print {")
    L.append("  :root { --bg: #ffffff; --surface: #ffffff; --fg: #000000; }")
    L.append("  body { background: #fff; color: #000; }")
    L.append("}")
    css = "\n".join(L) + "\n"
    if a.out:
        open(a.out, "w", encoding="utf-8", newline="\n").write(css)
        print(f"Wrote {a.out}")
    else:
        sys.stdout.write(css)

if __name__ == "__main__":
    main()
