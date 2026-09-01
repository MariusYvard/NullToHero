#!/usr/bin/env bash
# Met à jour les skills NullToHero installés dans Hermes (~/.hermes/skills, ou
# %LOCALAPPDATA%\hermes\skills sous Windows) depuis ce checkout :
# git pull (si repo propre) -> build-dist.mjs -> conversion des 15 sous-agents
# Claude Code (null-to-hero/agents/) en Agent Skills -> install.sh --target hermes.
#
# dist/hermes/ est un target natif de build-dist.mjs (au même titre que codex,
# kimi, agents) : ses 4 compétences nth-* portent nativement le texte
# delegate_task (voir tools/build-dist.mjs, entrée HOSTS.hermes). Les 15
# sous-agents d'audit n'ont pas d'équivalent de répertoire de sous-agents côté
# Hermes ; ils sont portés à part en Agent Skills, régénérés à chaque run par
# hermes-agent/tools/convert-agents-to-skills.py, et installés dans le même
# dossier de compétences par install.sh --target hermes.
#
# Usage: bash update-hermes-skills.sh [--no-pull]
#
# Cron/automatisation : appelé périodiquement par le job Hermes "nulltohero-skills-sync".

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HERMES_PORT_DIR="${SCRIPT_DIR}/hermes-agent"

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

# 2. rebuild dist/ (inclut dist/hermes, target natif)
if [ ! -f "null-to-hero/tools/build-dist.mjs" ]; then
  err "build-dist.mjs introuvable. Checkout invalide ?"
  exit 1
fi
log "node null-to-hero/tools/build-dist.mjs"
node null-to-hero/tools/build-dist.mjs

if [ ! -d "${SCRIPT_DIR}/dist/hermes/skills" ]; then
  err "dist/hermes/skills introuvable après build."
  exit 1
fi

# 3. régénère hermes-agent/skills/ depuis null-to-hero/agents/ (15 sous-agents)
if [ -f "${HERMES_PORT_DIR}/tools/convert-agents-to-skills.py" ]; then
  log "python3 hermes-agent/tools/convert-agents-to-skills.py"
  CONVERT_SCRIPT_WIN="$(cygpath -w "${HERMES_PORT_DIR}/tools/convert-agents-to-skills.py" 2>/dev/null || echo "${HERMES_PORT_DIR}/tools/convert-agents-to-skills.py")"
  python3 "$CONVERT_SCRIPT_WIN" >/dev/null
fi

# 4. install.sh --target hermes : copie dist/hermes + hermes-agent/skills vers
# ~/.hermes/skills (ou $HERMES_HOME/skills), substitution ${NTH_ROOT} incluse.
log "bash install.sh --target hermes"
bash install.sh --target hermes
