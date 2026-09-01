#!/usr/bin/env bash
# NullToHero — Manual installer for Unix/macOS/Linux
# Usage: bash install.sh
# Requires: Claude Code CLI

set -euo pipefail

REPO="MariusYvard/NullToHero"
PLUGIN_DIR="${HOME}/.claude/plugins"
INSTALL_NAME="null-to-hero"
PLUGIN_VERSION="4.0.0"   # pinned release tag for the manual-clone fallback

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()    { echo -e "${BLUE}[NullToHero]${NC} $1"; }
ok()     { echo -e "${GREEN}[OK]${NC} $1"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()    { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ─── Portable targets: Codex, Kimi and Hermes ─────────────────────────────────
#
#   bash install.sh                  Claude Code, the default, unchanged below
#   bash install.sh --target codex   copies dist/codex into ~/.agents/skills
#   bash install.sh --target kimi    copies dist/kimi into ~/.kimi-code/skills
#   bash install.sh --target agents  copies dist/agents into ~/.agents/skills
#   bash install.sh --target hermes  copies dist/hermes into ~/.hermes/skills,
#                                     plus the 15 audit sub-agents (hermes-agent/)
#   bash install.sh --target all     codex and kimi
#
# Only the sub-agent files differ between codex and kimi, and they go to each
# host's own directory.
#
# `agents` is the package for every other host that reads the Agent Skills
# format: Cursor, GitHub Copilot, VS Code, Gemini CLI, opencode and the rest.
# It carries no sub-agents, because the standard defines none.
#
# `hermes` reads the same Agent Skills format as `agents`, in its own
# directory (~/.hermes/skills, kept apart so the two packages, which carry
# different frontmatter, cannot overwrite one another), and additionally
# installs the 15 audit sub-agents from hermes-agent/skills/ (ported to
# Agent Skills, since Hermes has no named sub-agent directory format):
# dispatch them at runtime with delegate_task, not from a file Hermes reads
# at startup.
#
# `codex` and `agents` land in the same directory, so they exclude one another.
# The installer refuses rather than overwriting: pick Codex if you want the
# fifteen sub-agents, pick agents if the host is anything else.

TARGET="claude"
while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    --target=*) TARGET="${1#*=}"; shift ;;
    *) shift ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NTH_ROOT_ABS="${SCRIPT_DIR}/null-to-hero"
# Codex reads ~/.agents/skills. Kimi Code reads $KIMI_CODE_HOME/skills, default
# ~/.kimi-code/skills. Hermes reads $HERMES_HOME/skills, default ~/.hermes/skills
# (or the active profile's own skills directory). They are kept apart so the
# packages, which carry different frontmatter and different tool names, cannot
# overwrite one another.
KIMI_CODE_HOME="${KIMI_CODE_HOME:-${HOME}/.kimi-code}"
HERMES_HOME="${HERMES_HOME:-${HOME}/.hermes}"
skills_dir_for() {
  case "$1" in
    kimi)   echo "${KIMI_CODE_HOME}/skills" ;;
    hermes) echo "${HERMES_HOME}/skills" ;;
    *)      echo "${HOME}/.agents/skills" ;;
  esac
}

install_portable() {
  local host="$1"
  local src="${SCRIPT_DIR}/dist/${host}"

  if [ ! -d "${src}" ]; then
    err "dist/${host} not found. Run: node null-to-hero/tools/build-dist.mjs"
    exit 1
  fi
  if [ ! -f "${NTH_ROOT_ABS}/.claude-plugin/plugin.json" ]; then
    err "This script must run from a NullToHero checkout; ${NTH_ROOT_ABS} is missing."
    exit 1
  fi

  local target_skills; target_skills="$(skills_dir_for "${host}")"
  mkdir -p "${target_skills}"
  local skill dest
  for skill in "${src}"/skills/*/; do
    dest="${target_skills}/$(basename "${skill}")"
    if [ -d "${dest}" ] && [ ! -f "${dest}/.nth-installed" ]; then
      warn "Skipping ${dest}: it exists and was not installed by NullToHero."
      continue
    fi
    # `codex` et `agents` visent le meme dossier. Ecraser l'un par l'autre
    # retirerait les sous-agents sans le dire, ou les remettrait sur un hote qui
    # ne les lit pas. Le refus nomme les deux cotes.
    if [ -f "${dest}/SKILL.md" ] && ! grep -q "^  host: ${host}$" "${dest}/SKILL.md"; then
      local other; other="$(sed -n 's/^  host: //p' "${dest}/SKILL.md" | head -1)"
      err "${dest} holds the ${other} package. It and ${host} share this directory."
      err "Remove ~/.agents/skills/nth-* first, or install the other target instead."
      exit 1
    fi
    rm -rf "${dest}"
    cp -r "${skill}" "${dest}"
    # Resolve the root token to this checkout. The tools and the asset library
    # stay where they are; only the skill text is copied.
    find "${dest}" -type f \( -name '*.md' -o -name '*.mjs' -o -name '*.py' \) \
      -exec sed -i.bak "s|\${NTH_ROOT}|${NTH_ROOT_ABS}|g" {} \; 2>/dev/null || \
    find "${dest}" -type f \( -name '*.md' -o -name '*.mjs' -o -name '*.py' \) \
      -exec sed -i '' "s|\${NTH_ROOT}|${NTH_ROOT_ABS}|g" {} \;
    find "${dest}" -name '*.bak' -delete
    date -u +%Y-%m-%dT%H:%M:%SZ > "${dest}/.nth-installed"
    ok "$(basename "${skill}") -> ${dest}"
  done

  # Le paquet neutre n'a pas de sous-agents : le standard n'en definit pas.
  # Hermes non plus, dans dist/hermes/, mais ses 15 sous-agents existent a
  # part en Agent Skills (hermes-agent/skills/), installes dans le meme
  # dossier de competences plutot que dans un repertoire de sous-agents que
  # Hermes ne lit pas.
  if [ -d "${src}/agents" ]; then
    local agents_dest
    if [ "${host}" = "codex" ]; then agents_dest="${HOME}/.codex/agents"; else agents_dest="${KIMI_CODE_HOME}/agents"; fi
    mkdir -p "${agents_dest}"
    cp -r "${src}"/agents/. "${agents_dest}/"
    ok "sub-agents -> ${agents_dest}"
  elif [ "${host}" = "hermes" ] && [ -d "${SCRIPT_DIR}/hermes-agent/skills" ]; then
    local hermes_agent
    for hermes_agent in "${SCRIPT_DIR}"/hermes-agent/skills/*/; do
      dest="${target_skills}/$(basename "${hermes_agent}")"
      rm -rf "${dest}"
      cp -r "${hermes_agent}" "${dest}"
      date -u +%Y-%m-%dT%H:%M:%SZ > "${dest}/.nth-installed"
      ok "$(basename "${hermes_agent}") -> ${dest}"
    done
    log "15 audit sub-agents installed as skills. Dispatch them with delegate_task."
  else
    log "No sub-agents in this package: the Agent Skills standard defines none."
  fi

  echo ""
  log "Read dist/VERIFY.md: three claims about these hosts come from their"
  log "documentation and have never been observed running."
}

case "${TARGET}" in
  codex)  install_portable codex; exit 0 ;;
  kimi)   install_portable kimi;  exit 0 ;;
  agents) install_portable agents; exit 0 ;;
  hermes) install_portable hermes; exit 0 ;;
  all)    install_portable codex; install_portable kimi; exit 0 ;;
  claude) : ;;
  *) err "Unknown target: ${TARGET}. Use claude, codex, kimi, agents, hermes or all."; exit 1 ;;
esac

# ─── Check dependencies ───────────────────────────────────────────────────────

log "Checking dependencies..."

if ! command -v claude &>/dev/null; then
  err "Claude Code CLI not found. Install it from: https://claude.ai/claude-code"
  exit 1
fi

CLAUDE_VERSION=$(claude --version 2>/dev/null | head -1 || echo "unknown")
log "Claude Code version: ${CLAUDE_VERSION}"

if ! command -v git &>/dev/null; then
  err "git is required. Install it from: https://git-scm.com"
  exit 1
fi

ok "Dependencies satisfied."

# ─── Preferred path: plugin marketplace ───────────────────────────────────────

log "Attempting marketplace install (recommended)..."

if claude plugin marketplace add "${REPO}" 2>/dev/null; then
  if claude plugin install "${INSTALL_NAME}@null-to-hero-marketplace" 2>/dev/null; then
    ok "Installed via marketplace. Auto-updates enabled."
    ok "Run /siteasy, /seo, /inspect, or /audit in Claude to get started."
    exit 0
  fi
fi

warn "Marketplace install failed or not supported. Falling back to manual install."

# ─── Fallback: manual git clone ───────────────────────────────────────────────

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "${TEMP_DIR}"' EXIT

log "Cloning repository (pinned to v${PLUGIN_VERSION})..."
if ! git clone --depth 1 --branch "v${PLUGIN_VERSION}" "https://github.com/${REPO}.git" "${TEMP_DIR}/NullToHero" 2>/dev/null; then
  warn "Tag v${PLUGIN_VERSION} not found; falling back to default branch."
  git clone --depth 1 "https://github.com/${REPO}.git" "${TEMP_DIR}/NullToHero"
fi

log "Installing plugin manually..."
mkdir -p "${PLUGIN_DIR}"
# What is cloned is the marketplace: its manifest sits at the repository root and
# the plugin itself is in null-to-hero/. It must not occupy the directory name
# Claude Code uses for the installed plugin.
DEST="${PLUGIN_DIR}/${INSTALL_NAME}-marketplace"

if [ -d "${DEST}" ]; then
  warn "Existing installation found at ${DEST}. Removing before reinstall."
  rm -rf "${DEST}"
fi

cp -r "${TEMP_DIR}/NullToHero" "${DEST}"
ok "Marketplace copied to ${DEST} (plugin in ${DEST}/${INSTALL_NAME})"

# Register the local copy as a marketplace, then install from it
if claude plugin marketplace add "${DEST}" 2>/dev/null && \
   claude plugin install "${INSTALL_NAME}@null-to-hero-marketplace" 2>/dev/null; then
  ok "Plugin registered with Claude Code."
else
  warn "Could not auto-register. Run: claude plugin marketplace add \"${DEST}\"  then restart Claude Code."
fi

# ─── Node.js check (for /inspect preview) ─────────────────────────────────────

if ! command -v node &>/dev/null; then
  warn "Node.js not found. /inspect preview and /inspect detect require Node.js."
  warn "Install Node.js from: https://nodejs.org"
else
  NODE_VERSION=$(node --version)
  ok "Node.js ${NODE_VERSION} found. /inspect commands will work."
fi

# ─── Done ─────────────────────────────────────────────────────────────────────

echo ""
ok "NullToHero installed successfully!"
echo ""
echo -e "  ${BLUE}Skills available:${NC}"
echo -e "    ${GREEN}/siteasy${NC}  — Design, UX, motion, accessibility"
echo -e "    ${GREEN}/seo${NC}      — Full SEO toolkit (19 commands)"
echo -e "    ${GREEN}/inspect${NC}  — Anti-pattern detection, browser preview"
echo -e "    ${GREEN}/audit${NC}    — Whole-site audit, 13 parallel sub-agents"
echo ""
echo -e "  ${BLUE}If a short name collides with another plugin, use the namespaced form:${NC}"
echo -e "    /null-to-hero:seo · /null-to-hero:siteasy · /null-to-hero:inspect · /null-to-hero:audit"
echo ""
echo -e "  ${BLUE}Quick start:${NC}"
echo -e "    /seo audit https://yoursite.com"
echo -e "    /siteasy setup"
echo -e "    /inspect detect index.html"
echo ""
echo -e "  ${BLUE}To update later:${NC}"
echo -e "    bash install.sh  (re-run this script)"
