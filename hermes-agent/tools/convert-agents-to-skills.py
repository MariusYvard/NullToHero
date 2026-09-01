#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convertit les 14 sous-agents Claude Code de null-to-hero/agents/*.md en
compétences Hermes Agent Skills (hermes-agent/skills/<name>/SKILL.md).

Chaque agent Claude Code a un frontmatter (name, description, model, tools)
et un corps en prose. Hermes ne connait ni `model` ni `tools` restreints par
sous-agent au meme sens (les Agent Skills n'imposent pas de modele ni de
sandbox d'outils par skill) : ces deux cles sont retirees et remplacees par
category/version/author, le corps du texte reste identique au caractere
pres pour ne rien perdre de la methode.
"""
import re
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent.parent
SRC_DIR = REPO_ROOT / "null-to-hero" / "agents"
DEST_DIR = TOOLS_DIR.parent / "skills"

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)

def parse_frontmatter(text):
    m = FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError("no frontmatter")
    fm_raw, body = m.group(1), m.group(2)
    fm = {}
    for line in fm_raw.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip()
    return fm, body

def main():
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    for src in sorted(SRC_DIR.glob("*.md")):
        text = src.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(text)
        name = fm.get("name", src.stem)
        description = fm.get("description", "")
        new_fm = (
            "---\n"
            f"name: {name}\n"
            f"description: >\n  {description}\n"
            "category: null-to-hero-agents\n"
            'version: "1.0"\n'
            "author: NullToHero\n"
            "tags: [null-to-hero, audit, sub-agent]\n"
            "---\n"
        )
        out = new_fm + body
        dest_dir = DEST_DIR / name
        dest_dir.mkdir(parents=True, exist_ok=True)
        (dest_dir / "SKILL.md").write_text(out, encoding="utf-8", newline="\n")
        count += 1
        print(f"{name} -> {dest_dir / 'SKILL.md'}")
    print(f"{count} compétences générées.")

if __name__ == "__main__":
    main()
