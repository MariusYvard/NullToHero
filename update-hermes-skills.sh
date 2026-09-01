#!/usr/bin/env bash
# Met à jour les skills NullToHero installés dans Hermes (~/AppData/Local/hermes/skills/null-to-hero)
# depuis ce checkout : git pull (si repo propre) -> build-dist.mjs -> conversion des 15
# sous-agents Claude Code (null-to-hero/agents/) en Agent Skills -> copie + substitution NTH_ROOT.
#
# Le portage Hermes (hermes-agent/) est un ajout à côté du plugin Claude Code natif
# (null-to-hero/, dist/) : rien ici ne modifie ces deux arbres.
#
# Usage: bash update-hermes-skills.sh [--no-pull]
#
# Cron/automatisation : appelé périodiquement par le job Hermes "nulltohero-skills-sync".

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NTH_ROOT_ABS="${SCRIPT_DIR}/null-to-hero"
DIST_SRC="${SCRIPT_DIR}/dist/agents/skills"
HERMES_PORT_DIR="${SCRIPT_DIR}/hermes-agent"
DEST_BASE="${LOCALAPPDATA:-$HOME/AppData/Local}/hermes/skills/null-to-hero"
# Normalise en chemin POSIX si LOCALAPPDATA est au format Windows (C:\...)
DEST_BASE="$(cygpath -u "$DEST_BASE" 2>/dev/null || echo "$DEST_BASE")"

log()  { echo "[nth-sync] $*"; }
err()  { echo "[nth-sync][ERROR] $*" >&2; }

DO_PULL=1
[ "${1:-}" = "--no-pull" ] && DO_PULL=0

cd "$SCRIPT_DIR"

# 1. git pull optionnel (seulement si l'arbre de travail est propre)
if [ "$DO_PULL" = "1" ] && [ -d .git ]; then
  if [ -z "$(git status --porcelain)" ]; then
    log "git pull..."
    if git pull --ff-only 2>&1 | tee /tmp/nth-pull.log; then
      :
    else
      err "git pull a échoué, poursuite avec la copie locale."
    fi
  else
    log "Arbre de travail non propre : git pull sauté, build à partir de l'état local."
  fi
fi

# 2. rebuild dist/
if [ ! -f "null-to-hero/tools/build-dist.mjs" ]; then
  err "build-dist.mjs introuvable. Checkout invalide ?"
  exit 1
fi
log "node null-to-hero/tools/build-dist.mjs"
node null-to-hero/tools/build-dist.mjs

if [ ! -d "$DIST_SRC" ]; then
  err "dist/agents/skills introuvable après build."
  exit 1
fi

# 2bis. régénère hermes-agent/skills/ depuis null-to-hero/agents/ (15 sous-agents)
if [ -f "${HERMES_PORT_DIR}/tools/convert-agents-to-skills.py" ]; then
  log "python3 hermes-agent/tools/convert-agents-to-skills.py"
  CONVERT_SCRIPT_WIN="$(cygpath -w "${HERMES_PORT_DIR}/tools/convert-agents-to-skills.py" 2>/dev/null || echo "${HERMES_PORT_DIR}/tools/convert-agents-to-skills.py")"
  python3 "$CONVERT_SCRIPT_WIN" >/dev/null
fi

# 3. copie + substitution ${NTH_ROOT} + marqueur d'install, avec hash pour détecter les changements
mkdir -p "$DEST_BASE"
CHANGED=0

sync_skill_dir() {
  # $1 = dossier compétence source
  local skill_dir="$1"
  local name dest tmp
  name="$(basename "$skill_dir")"
  dest="$DEST_BASE/$name"
  tmp="$(mktemp -d)"
  cp -r "$skill_dir" "$tmp/$name"
  find "$tmp/$name" -type f \( -name '*.md' -o -name '*.mjs' -o -name '*.py' \) -print0 \
    | while IFS= read -r -d '' f; do
        sed -i "s|\${NTH_ROOT}|${NTH_ROOT_ABS}|g" "$f"
      done

  if [ -d "$dest" ] && diff -rq "$dest" "$tmp/$name" \
      --exclude=.nth-installed >/dev/null 2>&1; then
    log "$name : inchangé"
    rm -rf "$tmp"
    return
  fi

  rm -rf "$dest"
  mv "$tmp/$name" "$dest"
  date -u +%Y-%m-%dT%H:%M:%SZ > "$dest/.nth-installed"
  rmdir "$tmp" 2>/dev/null || true
  CHANGED=1
  log "$name : mis à jour -> $dest"
}

for skill_dir in "$DIST_SRC"/*/; do
  sync_skill_dir "$skill_dir"
done
if [ -d "${HERMES_PORT_DIR}/skills" ]; then
  for skill_dir in "${HERMES_PORT_DIR}"/skills/*/; do
    sync_skill_dir "$skill_dir"
  done
fi

if [ "$CHANGED" = "1" ]; then
  log "Skills NullToHero mis à jour dans Hermes."
else
  log "Rien à mettre à jour."
fi
