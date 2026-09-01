# NullToHero pour Hermes Agent

Ce dossier porte NullToHero sur [Hermes Agent](https://github.com/NousResearch/hermes-agent), en plus du plugin Claude Code natif servi par `null-to-hero/` (et son build `dist/`) à la racine du repo. Les deux cohabitent sans se gêner : rien ici ne modifie `null-to-hero/` ni `dist/`.

## Pourquoi un dossier séparé

`dist/agents/skills/` (généré par `null-to-hero/tools/build-dist.mjs`) porte déjà les 4 compétences à sous-commandes (`nth-siteasy`, `nth-seo`, `nth-audit`, `nth-cms`) au format Agent Skills portable — celles-là sont copiées telles quelles par `update-hermes-skills.sh`, sans besoin de portage.

Les 14 sous-agents Claude Code de `null-to-hero/agents/` (`inspect-agent-*`, `seo-agent-*`, `siteasy-agent-*`), invoqués via le `Task` tool natif de Claude Code pour l'audit parallèle multi-dimensions, n'ont pas d'équivalent générique dans `dist/`. Ce dossier fournit leur portage :

- **`skills/`** — les 14 sous-agents reformulés en compétences [Agent Skills](https://hermes-agent.nousresearch.com/docs/) (SKILL.md + frontmatter), générées automatiquement par `convert-agents-to-skills.py` (racine du repo) depuis `null-to-hero/agents/*.md`. Le frontmatter Claude Code (`model`, `tools` restreints) est retiré — sans équivalent direct côté Agent Skills — et remplacé par `category`/`version`/`author`/`tags`. Le corps (méthode, grille de score, format de sortie) est copié au caractère près.

## Installation

```bash
bash update-hermes-skills.sh          # depuis la racine du repo
```

Le script :
1. `git pull` (si l'arbre est propre) ;
2. régénère `hermes-agent/skills/` depuis `null-to-hero/agents/` via `convert-agents-to-skills.py` ;
3. copie les 4 compétences de `dist/agents/skills/` + les 14 compétences portées vers `~/.hermes/skills/null-to-hero/` (ou `%LOCALAPPDATA%\hermes\skills\null-to-hero\` sous Windows), en substituant `${NTH_ROOT}` par le chemin absolu du checkout.

Pour une synchronisation automatique quotidienne, planifier ce script en cron Hermes (`cronjob` MCP tool, `no_agent: true`) pointant sur un wrapper dans `~/.hermes/scripts/`.

## Comment invoquer un sous-agent porté

Sous Claude Code, `/audit full` dispatche les 15 sous-agents en parallèle via le `Task` tool natif, en une passe. Hermes n'a pas de dispatch parallèle natif équivalent par nom de sous-agent : invoquer chaque skill porté individuellement (ou via `delegate_task` pour un vrai parallélisme), puis fusionner les scores selon la grille de `null-to-hero/skills/audit/references/full.md`.

## Différences connues avec le plugin Claude Code

| Aspect | Claude Code | Hermes |
|---|---|---|
| Dispatch des 15 sous-agents | `Task` tool, un seul message, parallèle natif | `delegate_task` (parallèle réel) ou skills invoqués séquentiellement |
| `model` / `tools` restreints par agent | imposés par le frontmatter | non applicable, retirés du portage |
| `${NTH_ROOT}` | résolu par Claude Code au runtime | substitué en dur au moment de la copie par `update-hermes-skills.sh` |
| Références `tools/data/*.csv` en prose | relatives à la racine du plugin | inchangées, comme dans `dist/` original (pas de substitution côté build officiel non plus) |

Aucune de ces différences ne dégrade le plugin Claude Code d'origine : `null-to-hero/` et `dist/` restent inchangés et continuent de fonctionner de façon identique sous Claude Code.
