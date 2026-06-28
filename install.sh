#!/usr/bin/env bash
# NullToHero — Manual installer for Unix/macOS/Linux
# Usage: bash install.sh
# Requires: Claude Code CLI

set -euo pipefail

REPO="MariusYvard/NullToHero"
PLUGIN_DIR="${HOME}/.claude/plugins"
INSTALL_NAME="null-to-hero"
PLUGIN_VERSION="1.20.3"   # pinned release tag for the manual-clone fallback

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
DEST="${PLUGIN_DIR}/${INSTALL_NAME}"

if [ -d "${DEST}" ]; then
  warn "Existing installation found at ${DEST}. Removing before reinstall."
  rm -rf "${DEST}"
fi

cp -r "${TEMP_DIR}/NullToHero" "${DEST}"
ok "Files copied to ${DEST}"

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
