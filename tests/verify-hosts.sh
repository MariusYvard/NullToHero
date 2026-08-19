#!/usr/bin/env bash
# Verify the generated packages against the real Codex and Kimi Code binaries.
#
#   bash tests/verify-hosts.sh
#
# This is NOT part of the normal test suite. It installs two CLIs from npm, so
# it needs the network and about 200 MB, and it takes a couple of minutes. Run it
# when a host publishes a new version, or before a release that touches dist/.
#
# It answers the three questions tests/portability.mjs cannot:
#
#   1. does each host actually discover the four skills where the installer put
#      them, and do they reach the request that goes to the model
#   2. do the fifteen sub-agent files load, or are they rejected as malformed
#   3. is the read-only contract of a sub-agent actually applied
#
# Neither CLI is logged in. A local server stands in for the model API and
# captures the request; that request is the ground truth, because it is exactly
# what the host would have sent.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
PREFIX="${WORK}/npm"
PORT=8919
PASS=0
FAIL=0

green() { printf '\033[0;32m  ok    \033[0m%s\n' "$1"; PASS=$((PASS + 1)); }
red()   { printf '\033[0;31m  FAIL  \033[0m%s\n' "$1"; FAIL=$((FAIL + 1)); }
head_() { printf '\n%s\n' "$1"; }

cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "${SERVER_PID}" 2>/dev/null
  rm -rf "${WORK}"
}
trap cleanup EXIT

command -v npm >/dev/null || { echo "npm is required"; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required"; exit 1; }
[ -d "${REPO}/dist/codex" ] || { echo "dist/ missing. Run: node null-to-hero/tools/build-dist.mjs"; exit 1; }

# ─── the stand-in model API ──────────────────────────────────────────────────

cat > "${WORK}/server.py" <<'PY'
import json, socketserver, http.server, sys, time
CAP = sys.argv[1]

class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode("utf8", "replace")
        try: payload = json.loads(body)
        except Exception: payload = {"raw": body[:4000]}
        json.dump({"path": self.path, "payload": payload}, open(CAP, "w"))
        out = {"id": "x", "object": "chat.completion", "created": int(time.time()),
               "model": "offline-1",
               "choices": [{"index": 0, "message": {"role": "assistant", "content": "ok"},
                            "finish_reason": "stop"}],
               "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}}
        self._send(out)
    def do_GET(self):
        self._send({"object": "list", "data": [{"id": "offline-1", "object": "model"}]})
    def _send(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

socketserver.TCPServer.allow_reuse_address = True
socketserver.TCPServer(("127.0.0.1", int(sys.argv[2])), H).serve_forever()
PY

python3 "${WORK}/server.py" "${WORK}/capture.json" "${PORT}" >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1

echo "Installing the two CLIs into ${PREFIX} (this pulls from npm)"
npm i --prefix "${PREFIX}" -g @openai/codex @moonshot-ai/kimi-code >/dev/null 2>&1
export PATH="${PREFIX}/bin:${PATH}"
CODEX_VER="$(codex --version 2>/dev/null | head -1)"
KIMI_VER="$(kimi --version 2>/dev/null | head -1)"
echo "codex ${CODEX_VER:-absent} · kimi ${KIMI_VER:-absent}"

# ─── Codex ───────────────────────────────────────────────────────────────────

head_ "Codex ${CODEX_VER}"
CH="${WORK}/codex-home"
mkdir -p "${CH}/proj"
( cd "${REPO}" && HOME="${CH}" bash install.sh --target codex >/dev/null 2>&1 )
( cd "${CH}/proj" && git init -q . 2>/dev/null )

cat > "${CH}/.codex/config.toml" <<EOF
model = "offline-1"
model_provider = "offline"
sandbox_mode = "read-only"
model_reasoning_effort = "medium"

[model_providers.offline]
name = "offline"
base_url = "http://127.0.0.1:${PORT}/v1"
wire_api = "responses"
env_key = "OFFLINE_KEY"
EOF

# The loader only runs on a real turn, so a deliberately broken file proves the
# check has teeth: without it, silence would be indistinguishable from no loader.
cat > "${CH}/.codex/agents/zz-control.toml" <<'EOF'
name = "zz-control"
description = "Negative control: carries a key the agent-role parser does not know."
developer_instructions = "nothing"
version = "1.0.0"
EOF
CTRL="$(cd "${CH}/proj" && OFFLINE_KEY=x HOME="${CH}" CODEX_HOME="${CH}/.codex" \
        timeout 90 codex exec --skip-git-repo-check "hi" </dev/null 2>&1 | grep -c 'malformed agent role')"
rm "${CH}/.codex/agents/zz-control.toml"
[ "${CTRL}" -gt 0 ] \
  && green "the agent-role loader runs and rejects an unknown key (negative control)" \
  || red "the negative control raised no warning; this run proves nothing about agent loading"

rm -f "${WORK}/capture.json"
OURS="$(cd "${CH}/proj" && OFFLINE_KEY=x HOME="${CH}" CODEX_HOME="${CH}/.codex" \
        timeout 90 codex exec --skip-git-repo-check "hi" </dev/null 2>&1 | grep -c 'malformed agent role')"
[ "${OURS}" -eq 0 ] \
  && green "the 15 agent files load with no warning" \
  || red "${OURS} agent file(s) were rejected as malformed"

python3 - "${WORK}/capture.json" "${REPO}" codex <<'PY'
import json, re, sys, os
cap, repo, host = sys.argv[1], sys.argv[2], sys.argv[3]
if not os.path.exists(cap):
    print("\033[0;31m  FAIL  \033[0mno request captured; the host never reached the API"); sys.exit(3)
p = json.load(open(cap))["payload"]
blob = json.dumps(p.get("input") or p.get("messages") or [])
skills = sorted(set(re.findall(r"nth-(?:seo|siteasy|inspect|audit)", blob)))
print(("\033[0;32m  ok    \033[0m" if len(skills) == 4 else "\033[0;31m  FAIL  \033[0m")
      + f"{len(skills)}/4 skills reach the model-facing request: {', '.join(skills)}")
agents = set()
for t in p.get("tools", []):
    agents |= set(re.findall(r"(?:seo|inspect|siteasy)-agent-[a-z0-9]+", json.dumps(t)))
print(("\033[0;32m  ok    \033[0m" if len(agents) == 15 else "\033[0;31m  FAIL  \033[0m")
      + f"{len(agents)}/15 sub-agents are offered to the model as spawnable roles")
sys.exit(0 if len(skills) == 4 and len(agents) == 15 else 3)
PY
[ $? -eq 0 ] && PASS=$((PASS + 2)) || FAIL=$((FAIL + 2))

# ─── Kimi Code ───────────────────────────────────────────────────────────────

head_ "Kimi Code ${KIMI_VER}"
KH="${WORK}/kimi-home"
mkdir -p "${KH}/proj"
( cd "${REPO}" && HOME="${KH}" KIMI_CODE_HOME="${KH}/.kimi-code" bash install.sh --target kimi >/dev/null 2>&1 )
( cd "${KH}/proj" && git init -q . 2>/dev/null )

cat > "${KH}/.kimi-code/config.toml" <<EOF
default_model = "offline"

[providers.offline]
type = "openai"
base_url = "http://127.0.0.1:${PORT}/v1"
api_key = "not-a-real-key"

[models.offline]
provider_id = "offline"
name = "offline-1"
max_context_size = 128000
max_output_tokens = 4096
EOF

PROFILES="$(cd "${KH}/proj" && HOME="${KH}" KIMI_CODE_HOME="${KH}/.kimi-code" \
            timeout 90 kimi --agent zz-does-not-exist -p hi </dev/null 2>&1)"
FOUND=$(printf '%s' "${PROFILES}" | grep -o -E '(seo|inspect|siteasy)-agent-[a-z0-9]+' | sort -u | wc -l)
[ "${FOUND}" -eq 15 ] \
  && green "all 15 sub-agents are registered as selectable profiles" \
  || red "${FOUND}/15 sub-agents registered; Kimi listed: $(printf '%s' "${PROFILES}" | head -2 | tail -1)"

rm -f "${WORK}/capture.json"
( cd "${KH}/proj" && HOME="${KH}" KIMI_CODE_HOME="${KH}/.kimi-code" \
  timeout 90 kimi -p "hi" </dev/null >/dev/null 2>&1 )
python3 - "${WORK}/capture.json" <<'PY'
import json, re, sys, os
cap = sys.argv[1]
if not os.path.exists(cap):
    print("\033[0;31m  FAIL  \033[0mno request captured"); sys.exit(3)
p = json.load(open(cap))["payload"]
blob = json.dumps(p.get("messages") or [])
skills = sorted(set(re.findall(r"nth-(?:seo|siteasy|inspect|audit)", blob)))
print(("\033[0;32m  ok    \033[0m" if len(skills) == 4 else "\033[0;31m  FAIL  \033[0m")
      + f"{len(skills)}/4 skills reach the model-facing request: {', '.join(skills)}")
sys.exit(0 if len(skills) == 4 else 3)
PY
[ $? -eq 0 ] && PASS=$((PASS + 1)) || FAIL=$((FAIL + 1))

rm -f "${WORK}/capture.json"
( cd "${KH}/proj" && HOME="${KH}" KIMI_CODE_HOME="${KH}/.kimi-code" \
  timeout 90 kimi --agent seo-agent-technical -p "hi" </dev/null >/dev/null 2>&1 )
python3 - "${WORK}/capture.json" <<'PY'
import json, sys, os
cap = sys.argv[1]
if not os.path.exists(cap):
    print("\033[0;31m  FAIL  \033[0mno request captured for the sub-agent"); sys.exit(3)
p = json.load(open(cap))["payload"]
tools = sorted((t.get("function", {}).get("name") or t.get("name") or "?") for t in p.get("tools", []))
writers = sorted(set(tools) & {"Write", "Edit", "Bash", "Agent", "AgentSwarm", "CronCreate", "CronDelete", "TaskStop"})
sysmsg = "".join(str(m.get("content", "")) for m in p.get("messages", []) if m.get("role") in ("system", "developer"))
ok = not writers and "WebFetch" not in sysmsg and "FetchURL" in sysmsg
print(("\033[0;32m  ok    \033[0m" if not writers else "\033[0;31m  FAIL  \033[0m")
      + f"sub-agent tools are {tools}; write or delegate tools present: {writers or 'none'}")
print(("\033[0;32m  ok    \033[0m" if "WebFetch" not in sysmsg else "\033[0;31m  FAIL  \033[0m")
      + "the sub-agent prompt uses this host's tool names, not Claude's")
sys.exit(0 if ok else 3)
PY
[ $? -eq 0 ] && PASS=$((PASS + 2)) || FAIL=$((FAIL + 2))

head_ "${PASS} passed, ${FAIL} failed"
[ "${FAIL}" -eq 0 ] || exit 1
