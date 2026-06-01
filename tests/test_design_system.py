#!/usr/bin/env python3
"""Unit tests for design-system slug sanitisation. Run: python3 tests/test_design_system.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools" / "design-system" / "scripts"))
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

print("\n" + "=" * 50)
if failures:
    print(f"FAILED: {failures} failure(s).")
    sys.exit(1)
print("OK: design_system unit tests passed.")
sys.exit(0)
