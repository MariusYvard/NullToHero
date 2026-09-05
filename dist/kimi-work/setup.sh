#!/usr/bin/env bash
# Prepare dist/kimi-plugin for registration in the Kimi Work personal plugin
# market: substitute the ${NTH_ROOT} token with the absolute path of the
# bundled runtime, so the package is self-contained and the checkout can move
# or be deleted after registration.
#
# Idempotent: a second run finds no token and exits 0. Safe to run from
# anywhere; paths with spaces are handled.
set -euo pipefail

PLUGIN_DIR="${PLUGIN_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
NTH="${PLUGIN_DIR}/null-to-hero"
SCAN_DIRS=("${PLUGIN_DIR}/skills" "${PLUGIN_DIR}/agents" "${NTH}")

if [ ! -d "${NTH}/tools" ]; then
  echo "error: bundled runtime missing at ${NTH} (expected ${NTH}/tools)." >&2
  echo "this script must run inside a dist/kimi-plugin package." >&2
  exit 1
fi

if ! grep -rq '\${NTH_ROOT}' "${SCAN_DIRS[@]}" 2>/dev/null; then
  echo "NTH_ROOT already substituted -> ${NTH}"
  exit 0
fi

# Every text file that still carries the token, whatever its extension:
# skill and agent Markdown, but also the scripts' usage comments.
grep -rIl '\${NTH_ROOT}' "${SCAN_DIRS[@]}" | while IFS= read -r f; do
  sed -i.bak "s|\${NTH_ROOT}|${NTH}|g" "$f" 2>/dev/null && rm -f "$f.bak" \
    || sed -i '' "s|\${NTH_ROOT}|${NTH}|g" "$f"
done

echo "NTH_ROOT substituted -> ${NTH}"
echo "next: kimi-daimon kimi-plugin register-personal \"${PLUGIN_DIR}\" --json"
