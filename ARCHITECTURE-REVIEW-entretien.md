# NullToHero, le chantier entretien, chiffré à part

`ARCHITECTURE-REVIEW.md` évalue la fiabilité et planifie 19 points, dont quinze ne
servent qu'elle. Ce document chiffre l'autre axe, celui que la question "ce dépôt
sera-t-il plus simple à entretenir" pose réellement, et que le plan principal
décline explicitement à trois endroits.

Le critère de refus employé là-bas était le bon pour une évaluation de fiabilité et
le mauvais pour celle-ci : un écart n'y entrait au plan que si je pouvais démontrer
qu'il causait un verdict faux. Le coût d'entretien ne cause pas de verdict faux, il
se paie à chaque version.

Même fonction de classement qu'en 6.1, `dégât × probabilité ÷ coût`, même plancher :
tout point demandant un test non trivial coûte au moins un jour, un demi pour le
changement et un demi pour le test, plus un demi-jour de revue dans la borne haute.
Le dégât se lit ici comme coût récurrent et non comme dommage utilisateur.

| # | Point | Dégât | Prob. | Coût | Prio. |
|---|---|---|---|---|---|
| E1 | La vue qui montre une règle en entier | 2 | 4 | 1 à 1,5 j | 8 |
| E2 | Étendre la portée du contrôle 37 aux 29 lois sans garde | 2 | 4 | 1 à 1,5 j | 8 |
| E3 | L'enregistrement générique des sondes (P12) | 1 | 2 | 1 à 1,5 j | 2 |
| E4 | Dater et sourcer `laws.csv` | 1 | 2 | 1 à 1,5 j | 2 |

Total : 4 à 6 jours-personne. Le plan principal en achète déjà deux de plus sur le
même axe, P7 (générer les comptages) et P8 (promouvoir trois seuils en lois), pour
2 à 3 jours. L'axe entretien complet vaut donc 6 à 9 jours, dont un tiers est déjà
dans le plan de fiabilité.

---

## E1. La vue qui montre une règle en entier

**Ce qui coûte aujourd'hui.** La connaissance d'une règle vit dans quatre fichiers
de données plus une implémentation plus deux fixtures : `inspect-rules.csv` (86
lignes, 10 colonnes) pour le fond, `rule-coverage.csv` (86 lignes) pour l'exécuteur,
`remediation-map.csv` (132 lignes, dont 83 en `rule-N`) pour la route de correction,
`laws.csv` quand un seuil est en jeu, et deux des 102 fichiers de
`tools/inspect/fixtures/`. Répondre à "que fait la règle 47, où s'exécute-t-elle et
comment on la corrige" demande d'ouvrir trois CSV et de croiser à la main.

Ce découpage est ce qui rend l'ajout d'une règle mécanique, et il faut le garder.
Ce qui manque n'est pas une fusion, c'est la vue.

**Pourquoi le plan principal l'écarte, et pourquoi c'est le mauvais critère.**
`ARCHITECTURE-REVIEW.md` §4 la nomme puis la refuse, faute de pouvoir démontrer que
quelqu'un l'a cherchée. Or la même section établit que cette dispersion est ce qui
rend possible l'écart de 5.6, où le registre déclare une règle exécutable pendant
que l'appelant ne lui passe pas ses entrées. Personne ne lit les trois fichiers
ensemble, donc personne ne voit l'incohérence. C'est le seul point de ce document
qui a déjà produit un défaut de fiabilité mesuré.

**Le geste.** `node tools/rule.mjs 47` imprime une règle entière : catégorie,
sévérité, do et don't, les deux exemples de code, la classe de couverture et
l'exécuteur, la route de remédiation, la loi citée s'il y en a une, et le chemin des
deux fixtures. Modèle disponible dans le dépôt : `tools/search-references.mjs`, 66
lignes, bibliothèque standard seule, aucune dépendance.

*Test :* une règle dont la ligne manque dans l'un des quatre CSV fait sortir 1 avec
le nom du fichier incomplet, ce qui rend la vue utile comme contrôle d'intégrité en
plus de la lecture.
*Ne corrige pas :* la dispersion elle-même, qui est la contrepartie voulue de
l'éditabilité.

## E2. Étendre la portée du contrôle 37

**Ce qui coûte aujourd'hui.** Le contrôle 37 garantit qu'aucun fichier ne réénonce
le seuil d'une loi sans citer son identifiant, mais seulement là où la ligne porte
une expression régulière dans sa colonne `guard` : `tests/validate.js:1412` fait
`if (!law.guard) continue;`. Quatre lignes sur 33 en portent une. Pour les 29
autres, la réénonciation n'est pas détectée, et §2.2 de l'évaluation montre le
résultat sur un cas non promu : six valeurs pour le délai de stagger dans cinq
fichiers.

**Le geste.** Une passe sur les 29 lignes sans `guard`, ajoutant l'expression quand
le seuil s'exprime en motif (une durée, un ratio, une distance en pixels) et
laissant la colonne vide avec un motif écrit quand il ne s'exprime pas. C'est la
généralisation de P8, qui ne fait le geste que pour trois nouvelles lois.

*Test :* le contrôle 37, sans modification, plus une assertion que le nombre de
lois gardées ne peut que croître.
*Ne corrige pas :* la justesse des valeurs, qui est E4.

## E3. L'enregistrement générique des sondes

**Ce qui coûte aujourd'hui.** `tests/inspect-rules.mjs:128-133`, `:135-142` et
`:144-149` sont trois blocs quasi identiques qui vérifient qu'une sonde et la carte
déclarent les mêmes identifiants. Une quatrième famille de sonde en ajouterait un
quatrième. Le garde connaît les sondes par énumération alors qu'il devrait les
connaître par contrat, et c'est le seul endroit du dépôt où l'ajout est en O(n)
plutôt qu'en O(1).

**Le geste.** Une boucle sur un registre de sondes, chacune exportant son nom de
classe et sa liste d'identifiants, remplace les trois blocs.

*Test :* les trois contrats existants continuent d'échouer aux mêmes conditions.
*Ne corrige pas :* rien d'observable pour un utilisateur, ce qui est la raison pour
laquelle ce point est sorti du plan principal.

## E4. Dater et sourcer laws.csv

**Ce qui coûte aujourd'hui.** `laws.csv` porte `id,area,name,value,statement,anchor,guard`
et pas de colonne `source`, quand `inspect-rules.csv` en a une. `L-PERF-1` vaut
2,5 s parce que Google le disait à l'écriture de la ligne, et rien ne date cette
affirmation ni ne la rattache à sa source. Le mécanisme qui tient tous les seuils
honnêtes n'a lui-même rien qui le tienne, au-delà de sa cohérence interne.

**Le geste.** Deux colonnes, `source` et `asserted`, remplies sur 33 lignes, plus
un contrôle qui échoue quand une ligne n'a ni l'une ni l'autre.

*Test :* ajouter une loi sans source fait échouer le build.
*Ne corrige pas :* la péremption. Une valeur datée de 2024 reste fausse si le
monde a bougé ; dater rend la question posable, pas résolue.

---

## Ce que ce chantier ne fait pas

Il ne réduit pas le corpus. `skills/siteasy/references/` compte 85 fichiers contre
27, 7 et 6 pour les autres compétences, et §2.4 de l'évaluation refuse de le
condamner faute de pouvoir démontrer un défaut : le graphe interdit les orphelins,
`search-references.mjs` existe, et la seule conséquence démontrable est celle que
E2 traite. Un corpus large et bien indexé est une force jusqu'à preuve du
contraire, et la preuve n'a pas été faite.

Il ne raccourcit pas le code. Comme le plan de fiabilité, ce chantier ajoute : une
vue, des colonnes, un registre. Ce qu'il retire est du travail humain répété, pas
des lignes.
