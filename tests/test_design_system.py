#!/usr/bin/env python3
"""Unit tests for design-system slug sanitisation. Run: python3 tests/test_design_system.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "null-to-hero" / "tools" / "design-system" / "scripts"))
from design_system import safe_slug  # noqa: E402

failures = 0


def ok(name, cond):
    global failures
    if cond:
        print(f"  OK   {name}")
    else:
        print(f"  FAIL {name}")
        failures += 1


print("\n-- safe_slug: normalises names --")
ok("lowercases and dashes spaces", safe_slug("My Site", "x") == "my-site")
ok("keeps dots and dashes", safe_slug("acme-v1.2", "x") == "acme-v1.2")

print("\n-- safe_slug: strips traversal and unsafe chars --")
ok("drops slashes", "/" not in safe_slug("../../etc/passwd", "x"))
ok("no parent traversal survives", safe_slug("../../etc", "x") == "etc")
ok("strips leading dots", not safe_slug("...hidden", "x").startswith("."))
ok("drops unsafe punctuation", safe_slug("a;b$c", "x") == "abc")

print("\n-- safe_slug: falls back on empty --")
ok("empty falls back", safe_slug("", "default") == "default")
ok("all-unsafe falls back", safe_slug("///", "default") == "default")
ok("none falls back", safe_slug(None, "default") == "default")

print("\n-- theme_css: the four export formats agree on one palette --")
import json  # noqa: E402
import subprocess  # noqa: E402

SCRIPT = str(Path(__file__).resolve().parent.parent / "null-to-hero" / "tools" / "design-system" / "scripts" / "theme_css.py")
ARGS = ["--bg", "#0B0B0C", "--ink", "#F5F5F4", "--accent", "#6E56CF"]


def emit(fmt):
    return subprocess.run([sys.executable, SCRIPT, *ARGS, "--format", fmt],
                          capture_output=True, text=True, check=True).stdout


css, tw, shad = emit("css"), emit("tailwind"), emit("shadcn")
dtcg = json.loads(emit("dtcg"))

ok("css still carries its contrast verdicts", "contrast fg on bg" in css and "PASS" in css)
ok("tailwind uses --spacing, not --space", "--spacing-4:" in tw and "--space-4:" not in tw)
ok("tailwind prefixes colours for utility generation", "--color-accent: #6E56CF;" in tw)
ok("dtcg is valid and typed", dtcg["color"]["accent"]["$type"] == "color")
ok("dtcg omits the clamp() type scale rather than mistyping it", "text" not in dtcg)

# The mapping that is easy to get wrong and silent when wrong: shadcn's --accent is
# the hover surface, the brand belongs in --primary.
ok("shadcn puts the brand in --primary", "--primary: #6E56CF;" in shad)
ok("shadcn does not put the brand in --accent", "--accent: #6E56CF;" not in shad)
ok("shadcn refuses to invent a destructive colour", "--destructive:" not in shad)

# One palette, four spellings: the accent must be the same value everywhere.
ok("every format reports the same accent",
   "#6E56CF" in css and "#6E56CF" in tw and "#6E56CF" in shad
   and dtcg["color"]["accent"]["$value"] == "#6E56CF")

print("\n" + "=" * 50)
if failures:
    print(f"FAILED: {failures} failure(s).")
    sys.exit(1)
print("OK: design_system unit tests passed.")
sys.exit(0)
