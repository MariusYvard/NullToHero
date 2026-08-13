# NullToHero, évaluation d'architecture et de fiabilité

## En cinq lignes

Le dépôt a une idée d'architecture, bonne, appliquée à trois endroits sur beaucoup
plus. Le chemin le plus visible, et non le mieux classé : la porte d'intégration
continue rend PASS et sort 0 sur un fichier qui n'est pas un rapport d'audit, et sur
un rapport de la semaine dernière. Il ouvre ce document parce qu'il se raconte en
une phrase et se reproduit en une commande, pas parce qu'il domine le classement de
6.1, où P4 et P3b sont à 12 quand P1 est à 6.
Trente et un chemins rendent un verdict positif sur une mesure qui n'a pas eu lieu,
dont vingt-six sont planifiés ici. Le plan vaut entre 22,5 et 32 jours-personne
plus 2 jours de déploiement, et il achète aussi quatre points de structure (P3b, P6,
P7, P8) qu'aucune entrée de l'annexe ne nomme. La première livraison, cinq points,
5 à 7,5 jours, ferme les chemins qui rendent vert un résultat non mesuré à
l'entrée, qui perdent le code de sortie en chemin, ou qui laissent les sondes
navigateur hors de l'intégration continue. La deuxième fera visiblement
baisser les scores, et le §6.4 dit de combien et comment l'annoncer.

Huit de ces trente et un chemins sont dans le code que l'auteur de ce document a
écrit ; six ont été trouvés par une relecture indépendante et non par lui (5.8).

**Lundi matin, sans lire le reste.** Les cinq points de la première livraison, leur
test, et les deux nombres à garder en tête.

| Point | Le geste | Le test qui échouerait aujourd'hui |
|---|---|---|
| P17 | `--json` sort le code que la voie texte sort déjà | même code de sortie sur les deux invocations, même fixture |
| P10 | le workflow installe Chromium et lance `rendered-rules.mjs` | le workflow échoue si les treize règles ne sont pas vérifiées |
| P2 | la porte compare `generatedAt` à maintenant | un rapport de plus de N heures fait sortir 2 |
| P5 | `gate.mjs` refuse un statut HTTP au-dessus de 399 | une fixture 404 fait refuser au lieu de noter 86 |
| P1 | la porte exige `pluginVersion`, `generatedAt`, `checks` non vide | `--report package.json` fait sortir 2 |

Les deux nombres : la deuxième livraison bascule **279 verdicts** et ne bouge le
score d'**aucun point** (6.4). C'est ce qui rend indispensable de livrer P3 et P4
ensemble, et de l'annoncer.

Portée : le dépôt à la version 3.7.1, le 11 août 2026. Quatre questions, traitées
dans l'ordre des sections 2 à 5 : entretien, évolution, compréhension, fiabilité.

**Conflit d'intérêts, à lire avant tout le reste.** L'auteur de ce document a
écrit les versions 3.6.0 à 3.7.1, soit deux des sept mécanismes cités en 5.10
comme bonne pratique et sept des trente et un chemins défectueux de l'annexe, plus
un huitième partagé avec du code antérieur. Le biais était que le code récent avait
été lu par son auteur et le code ancien par un lecteur neuf, et que ces deux
lectures ne trouvent pas les mêmes choses. Une version antérieure de ce document se
contentait de le déclarer. La relecture croisée qui manquait a été faite avant
publication, elle a trouvé six chemins de plus, tous dans le code de l'auteur, et le
§5.8 rend son résultat entier, y compris les quatre défauts qu'elle a trouvés et
que ce document ne recense pas.

Convention de preuve. Dans la section 5 et l'annexe, chaque constat porte un
fichier et une ligne quand il désigne du code, et la colonne source distingue **V**,
reproduit par exécution avec la commande donnée, de **L**, établi par lecture. Les
constats qui désignent une absence (un fichier qui ne lance pas un test, une
propriété non vérifiée) portent le fichier sans ligne, parce qu'il n'y en a pas.
Ailleurs, les affirmations portent une référence quand elle existe.

**Les nombres de ce document sont dérivés, pas retapés.**
`node tools/check-review-numbers.mjs` relit ce fichier et échoue quand la prose
s'écarte de sa source. Ce qu'il couvre, énuméré parce qu'une promesse générale
serait le défaut décrit en 2.1, et remis à jour parce qu'une version antérieure de
cette liste en déclarait la moitié :

- les comptages de l'annexe, du tableau du plan et du dépôt, la répartition par
  moteur du §2.1, les statistiques du graphe de références, la somme du §5.10 ;
- l'arithmétique `dégât × probabilité ÷ coût` sur les dix-neuf lignes du plan, la
  conversion des probabilités de l'annexe vers le plan, le vocabulaire de l'échelle,
  la partition des 31 entrées, et l'ordre de livraison avec ses dérogations ;
- douze reproductions chiffrées, rejouées et non relues, couvrant les transcripts
  de 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7 et 5.8 (codes de sortie compris) ainsi que
  les mesures du §6.4 ;
- l'existence de chacun des 206 emplacements cités par le document et son artefact
  compagnon, dont 124 portent un numéro de ligne (100 couples distincts), la borne
  haute de chaque ligne citée, et, quand le document affirme qu'un fragment de code
  se trouve à un endroit, sa présence dans la fenêtre citée ; ce contrôle attrape le
  fichier inventé et la ligne au-delà de la fin, pas la ligne existante mais fausse
  sur laquelle rien n'est cité ;
- les chiffres du conflit d'intérêts, dérivés des entrées de l'annexe ;
- son propre câblage.

Ce qu'il ne couvre pas : les jugements, la prose non chiffrée, la colonne "Le dit ?" de l'annexe, la colonne
"Dépend de" du tableau du plan, et les nombres qui ne sont dans aucun tableau.

Le script existe parce qu'une première version de ce document énonçait ses propres
nombres à la main et en a fait dériver cinq. Trois relectures en aveugle ont ensuite
trouvé, à chaque tour, des écarts que la version précédente du garde ne voyait pas :
cinq contradictions internes, puis quatre nombres périmés par une édition, puis sept
trous démontrés par mutation dirigée du document. Chaque tour a élargi le garde
plutôt que corrigé la prose seule. Un document qui reproche des comptages non gardés
sans s'y soumettre n'a pas d'autorité pour le faire.

Deux choses à dire sur le garde lui-même, puisque ce document en exige autant des
autres. Il est appelé par `npm test`, donc il tourne à chaque exécution de la suite.
Mais ce garde tourne dans `npm test` et pas dans le workflow, pour la raison même
qui vaut à `rendered-rules.mjs` d'en être absent : son bloc 12 rejoue les sondes de
5.8 et demande un navigateur. C'est le défaut du §5.7 appliqué à ce document, et
c'est P10 qui le ferme, la ligne étant ajoutée à son périmètre. Second point, ce
garde est un programme attaché à un document vivant : c'est une dette, et
son entretien est chiffré à un demi-jour par révision majeure du document, ligne
absente du total de 6.1 parce qu'elle ne porte pas sur le produit.

---

## 1. La thèse

Le dépôt tient sur une idée : **une affirmation doit être tenue par quelque chose
capable de la contredire.** Pas un commentaire, pas une convention, un mécanisme
qui échoue quand l'affirmation devient fausse.

Elle est appliquée à trois endroits, et à ces trois endroits le résultat est
solide, à trois réserves établies plus loin : le garde de la première ligne vérifie
l'existence et non l'atteignabilité (5.6), la seconde moitié de la deuxième ligne ne
vaut que pour 4 lois sur 33 (5.11), et le contrat de la troisième ne tourne jamais
en intégration continue (5.7).

| Affirmation | Ce qui la tient | Ce qui casse si elle devient fausse |
|---|---|---|
| "cette règle s'exécute ici" | `rule-coverage.csv` plus le garde de `tests/inspect-rules.mjs` | le build, avec le nom de la règle et l'écart |
| "ce seuil vaut N" | `laws.csv` plus le contrôle 37 de `validate.js` | le build, si la loi cesse d'être citée ; et si un fichier réénonce le nombre, mais pour 4 lois sur 33 seulement |
| "cette règle détecte ce défaut" | deux fixtures par règle, dans les deux sens, plus le contrôle de contamination croisée | le build, si la règle devient muette ou bruyante |

Partout ailleurs la même affirmation existe sans rien pour la tenir. Ce document
cartographie ce "partout ailleurs", et il y a deux niveaux d'écart qu'il ne faut
pas confondre.

Le premier est **général** et couvre les sections 2 et 4 : un nombre énoncé à la
main, un seuil jamais promu en loi, deux corpus qui décrivent le même monde sans
se confronter. Rien ne casse quand ils divergent, donc ils divergent.

Le second est **une forme de code précise** et couvre la section 5 : une fonction
reçoit un paramètre qui ne distingue pas *absent* de *vide* de *non récupérable*,
appelée par une couche qui avait l'information et l'a laissée tomber. Le résultat
est un verdict positif sur une mesure qui n'a pas eu lieu.

Les deux relèvent du même principe et ne se corrigent pas de la même façon. Le
premier demande une génération, le second un type **et** un invariant qui échoue
sur le vingt-septième cas. Le plan de la section 6 doit livrer les trois, faute de
quoi il rapièce vingt-six chemins et laisse la porte ouverte au suivant.

---

## 2. Entretien

### 2.1 Ce qui coûte à chaque version

Trois versions ont été livrées pendant l'évaluation, 3.6.0, 3.7.0 et 3.7.1.
Chacune a passé du temps sur la même tâche : mettre à jour des comptages énoncés à
la main dans la prose.

Le nombre de règles apparaît dans `skills/inspect/SKILL.md:69` (deux fois),
`skills/inspect/references/detect.md:31` et `tools/README.md:18`. Le nombre de
documents de référence apparaît dans `README.md:14` et `README.md:480`. La
répartition par moteur apparaît dans deux fichiers, sous la forme "48 dans le
moteur de règles, 18 dans les contrôles statiques, 7 dans la sonde rendue, 3 dans
la sonde three.js, 3 dans la sonde motion". Ces cinq nombres font 79, le total
annoncé est 86, et l'écart de 7 est le nombre de règles qui ne s'exécutent pas.
Les deux fichiers énoncent bien le résultat (`skills/inspect/SKILL.md:69` écrit "7 that do not
execute", `detect.md:31` écrit "79 are executable"), donc le lecteur n'a rien à
reconstituer. Ce sont sept nombres à tenir cohérents à la main, dont deux sont la
somme et la différence des cinq autres.

Le validateur détecte la dérive, ce qui est le bon comportement. Mais il la
détecte après coup et la correction reste manuelle dans les quatre fichiers
ci-dessus, à cinq emplacements. L'asymétrie
est le défaut : les seuils sont gardés **et** dérivés d'une source unique, les
comptages sont gardés **et** retapés. Le dépôt possède déjà le mécanisme
manquant, `tools/sync-overview.mjs` et `tools/sync-compare.mjs` écrivent des
valeurs dérivées dans des artefacts. Il n'a jamais été pointé vers la prose.

### 2.2 Les nombres qui se contredisent parce qu'ils ne sont pas des lois

`laws.csv` existe pour qu'un seuil vive une fois. Les seuils qui n'y ont pas été
promus dérivent librement, et le garde ne peut pas les voir. Il ne surveille pas
seulement les identifiants déclarés : il ne surveille que ceux qui portent une
expression régulière de garde, soit quatre sur 33 (5.11).

Délai de stagger par élément :

| Valeur | Fichier |
|---|---|
| 30 à 50 ms | `skills/siteasy/references/style-systems.md:65` |
| 30 à 80 ms | `skills/siteasy/references/animation-engineering.md:286` |
| 40 à 80 ms | `skills/siteasy/references/motion-choreography.md:41` |
| 50 à 100 ms | `skills/siteasy/references/bolder.md:92` |
| 100 à 150 ms | `skills/siteasy/references/animate.md:59` |
| environ 50 ms | `skills/siteasy/references/animate.md:113` |

Les deux dernières lignes sont dans le même fichier, à cinquante-quatre lignes
d'écart.

Ratio de durée d'une sortie sur son entrée : 75 % dans `animate.md:86`,
`animation-engineering.md:75`, `animation-engineering.md:285` et
`motion-design.md:20`, contre 60 à 70 % dans `style-systems.md:64`.

### 2.3 Trois corpus qui décrivent le même monde sans se confronter

**Premier cas, trouvé.** `tools/design-system/data/stacks/threejs.csv` sert la
génération, `tools/data/inspect-rules.csv` sert l'audit, les deux décrivent
three.js et rien ne compare leurs affirmations. Jusqu'au commit `ad23b72` le
premier épinglait la révision r128 et enseignait
`renderer.outputEncoding = THREE.sRGBEncoding`, pendant que la sonde du second
(`tools/inspect/three.mjs:119-120`) déclenche la règle 81 sur toute révision
antérieure à r152, au motif que le pipeline colorimétrique y est l'ancien. Le
générateur produisait des pages que son propre auditeur signale.

Deux précisions qui limitent la portée du constat. Aucun mécanisme du dépôt ne
signale la ligne `outputEncoding` elle-même : `grep -rn outputEncoding tools/ skills/
agents/` ne retourne que deux choses, le corpus de génération et la prose citée
juste après. Ce qui se contredit est la révision épinglée, pas l'appel d'API. Et la
divergence est déjà racontée dans `skills/siteasy/references/overdrive.md:129`, écrite au moment de la
correction : elle était connue d'un lecteur, elle n'était tenue par rien.

C'est le constat dont la conséquence est la plus directement visible pour un
utilisateur, puisqu'il a reçu du code périmé. Il a été trouvé par une question
posée à voix haute, pas par une méthode, ce qui est la raison d'être de P6.

**Deuxième cas, que la thèse impose de chercher.** Si le motif est réel, il doit
se répéter. Le registre de 86 règles et les contrôles que `runChecks` émet
décrivent-ils le même monde sans se confronter ? Mesure :

```
$ node -e "…compare rule-coverage.csv aux id: rendus par runChecks"
contrôles émis : 50
mappés à une règle du registre : 18
non mappés : 32
exemples non mappés : html-lang, title-tag, meta-description, robots-disallow,
                      security-headers, canonical-url, invalid-aria-attribute
```

**vérifié.** Le comptage vient de l'exécution et non d'un `grep` sur les
déclarations : `checks.mjs` déclare 42 fonctions, `runChecks` en émet 50, les huit
autres venant de `ai-access.mjs` qu'il importe. Une version antérieure de ce
document soustrayait ces deux populations et annonçait 24 contrôles hors registre au
lieu de 32 ; l'erreur comptait pour le plan, puisque `ai-crawler-robots`, l'entrée 4
de l'annexe, est l'un des huit oubliés.

Le dépôt annonce que chaque constat porte un identifiant de registre,
une sévérité et une source vérifiable. C'est vrai du moteur de règles et de 18
contrôles. Les 32 autres émettent des verdicts qui gouvernent le score sans
identifiant de registre.

Une version antérieure de ce document le prouvait en montrant la forme de la sortie
d'un contrôle non mappé. La preuve ne discriminait rien : les 50 contrôles ont la
même forme, les 18 mappés compris. Voici celle qui discrimine.

```
$ node -e "…compare l'identifiant attaché par detect.mjs"
html-lang            -> id: null,  source: "tools/audit/lib/checks.mjs (html-lang)"
motion-reduced-guard -> id: 47,    source: "tools/audit/lib/checks.mjs (motion-reduced-guard)"
```

**vérifié.** `detect.mjs:136-142` attache `severity` et `source` à tout constat, et
l'identifiant de registre seulement quand la carte en donne un. Les 32 autres ne
sont donc pas ingouvernés, ils portent une sévérité dérivée de leur verdict et une
source qui pointe leur propre fichier ; ce qu'ils n'ont pas est la ligne de registre
qui donne aux 18 autres leur rationnel, leur exemple et leur route de correction. C'est le même motif que le premier cas, une marche plus bas : la
promesse centrale du plugin est vraie des 86 règles du registre et de 18 des 50
contrôles.

Je ne classe pas ce deuxième cas comme un défaut de fiabilité, parce qu'aucun
verdict n'en devient faux. C'est un défaut de cohérence de la promesse, et il
mérite une décision explicite : soit les 32 entrent au registre, soit le dépôt
cesse d'annoncer la propriété au singulier.

**Troisième cas, le plus grand et le moins examiné.** Les 15 sous-agents de
`agents/` émettent des verdicts notés sur 100 qui entrent dans le rapport par
`site-audit.mjs`, et aucun ne passe par le registre. Leurs barèmes sont écrits en
prose dans leur propre fichier. Le §5.0 les exclut du recensement de fiabilité
parce que leurs verdicts viennent d'un modèle et non de code, ce qui est une raison
valable pour ce recensement-là et une raison faible ici : c'est précisément la
promesse "identifiant, sévérité, source" que des verdicts produits par un modèle
tiendront le moins bien. Je n'ai pas tranché dans ce document, et c'est le plus gros angle mort de mon
propre travail. Ce n'est pas une raison pour n'en donner qu'un aveu. La sonde qui
manque tient en une journée : charger les 15 fichiers d'`agents/`, extraire le
format de sortie que chacun décrit, et vérifier qu'il porte un identifiant, une
sévérité et une source. Elle ne prouverait pas que les verdicts sont justes, ce
qu'aucun mécanisme statique ne peut faire sur une sortie de modèle ; elle
établirait si la promesse est seulement formulable là, ce qui est la question posée
et pas une autre. Un jour, dégât 2, probabilité 4 : elle entrerait au plan à
priorité 8, et je ne l'y porte pas parce que je ne l'ai pas écrite. Elle est le
premier des deux travaux que le §8 laisse à un successeur.

### 2.4 La taille du corpus : ce que j'ai mesuré et ce que je n'établis pas

`skills/siteasy/references/` contient 85 fichiers, contre 27 pour `seo`, 7 pour
`audit` et 6 pour `inspect`. Le garde `tools/check-context-budget.mjs` borne la
taille de chaque fichier, rien ne borne leur nombre.

Mesure, depuis `tools/reference-graph.json` : la médiane des citations entrantes
d'une référence siteasy est de 3, le 90e centile de 6, le maximum de 14, et 16 des
85 sont citées exactement une fois, le graphe interdisant les orphelins. Près d'un
cinquième du corpus n'a donc qu'un seul point d'entrée.

Ce que je n'établis pas : que ce soit un défaut. Un corpus large et bien indexé
est une force, `tools/search-references.mjs` existe et le graphe interdit les
orphelins. La seule conséquence que je peux démontrer est celle de 2.2, six
valeurs pour la même chose réparties sur cinq fichiers, ce qui est ce qu'un corpus de
cette taille produit sans arbitre. Le correctif est donc P8, pas une réduction du
corpus. Je signale la taille, je ne la condamne pas.

---

## 3. Évolution

C'est l'axe le plus fort du dépôt, et il faut le mesurer sur deux gestes
différents.

### 3.1 Ajouter une règle : excellent

Cinq gestes toujours identiques : une ligne dans `tools/data/inspect-rules.csv`,
une dans `tools/data/rule-coverage.csv`, une dans
`tools/data/remediation-map.csv`, une implémentation, deux fixtures sous
`tools/inspect/fixtures/`. Le build dit lequel manque.

Quatorze règles ont été ajoutées pendant l'évaluation, sans qu'il faille réfléchir à
l'endroit où poser les choses, seulement à savoir si la règle était juste. Elles
sont toutes arrivées dans la seule version 3.7.0 : `inspect-rules.csv` compte 72
lignes en 3.5.2 comme en 3.6.0, et 86 en 3.7.0 comme en 3.7.1. L'argument porte donc
sur quatorze ajouts d'un même geste, pas sur trois cycles indépendants, et il est
plus faible pour cette raison : c'est une session de travail, pas une habitude
observée sur la durée.

Les gardes ont travaillé pendant ces ajouts. Le garde de couverture
(`tests/inspect-rules.mjs:128-133`, `:152-157`) a repris trois erreurs de
déclaration où le code et la carte n'étaient pas d'accord. Le contrat des fixtures
en a trouvé deux autres, dont un défaut dans un template livré :
`assets/templates/react-modal/Modal.css:87-92` neutralisait
`prefers-reduced-motion` avec `animation: none`, ce qui empêche `animationend` de
se déclencher et bloque tout code qui l'attend, corrigé en 3.7.0.

### 3.2 Ajouter un type d'exécution : de la friction

Trois classes de couverture existent, `rendered-probe` préexistante puis
`three-probe` et `motion-probe` ajoutées pendant l'évaluation, parce que chaque
sonde a besoin d'un contrat de lanceur différent : un script d'initialisation
avant le module de la page, une émulation de fonctionnalité média, une grille
temporelle. La séparation est justifiée, une règle rangée dans la mauvaise sonde
paraîtrait couverte et ne tournerait jamais.

Le coût est ailleurs. `tests/inspect-rules.mjs:128-133`, `:135-142` et `:144-149`
sont trois blocs quasi identiques qui vérifient qu'une sonde et la carte déclarent
les mêmes identifiants. Une quatrième famille en ajouterait un quatrième. Le garde
connaît les sondes par énumération alors qu'il devrait les connaître par contrat,
et c'est le seul endroit du dépôt où l'ajout est en O(n) plutôt qu'en O(1).

---

## 4. Compréhension

La taille du corpus est traitée en 2.4. Ce qui suit est ce que je peux dire du
coût d'arrivée pour quelqu'un qui n'a pas écrit ce dépôt.

**Ce qui est bon, et rare.** Chaque outil déterministe porte un en-tête qui
explique **pourquoi il existe** avant de dire ce qu'il fait, et nomme le défaut qui
l'a fait naître. `tools/inspect/rendered.mjs:52-57` raconte que l'appelant
fournissait le temps écoulé et se trompait. `tools/inspect/rules.mjs:41-50` raconte
qu'une regex capturait la requête média comme sélecteur, et pourquoi c'est devenu
un parcours d'accolades. Le lecteur qui arrive six mois plus tard sait ce qu'il ne
doit pas refaire, et cette information ne vit dans aucun système de tickets.

**Ce qui coûte.** La connaissance d'une règle est répartie sur quatre fichiers de
données (`inspect-rules.csv` pour le fond, `rule-coverage.csv` pour l'exécuteur,
`remediation-map.csv` pour la route de correction, `laws.csv` quand un seuil est en
jeu), plus l'implémentation et deux fixtures. Ce découpage est ce qui rend
l'extension mécanique (3.1) et il fait qu'aucune vue ne montre une règle en entier.
Pour répondre à "que fait la règle 47 et où", il faut ouvrir trois CSV.

Cette dispersion a un coût mesurable : c'est elle qui rend possible l'écart de 5.6,
où le registre déclare une règle exécutable et l'appelant ne lui passe pas ses
entrées. Personne ne lit les trois fichiers ensemble, donc personne ne voit
l'incohérence, et le garde ne la voit pas non plus. La bonne réponse n'est pas de
fusionner les CSV, qui sont éditables précisément parce qu'ils sont séparés, mais
d'ajouter la vue qui manque : `node tools/search-references.mjs` existe pour les
références et rien d'équivalent n'existe pour "montre-moi la règle N en entier".
Je ne le porte pas au plan parce que je ne peux pas démontrer que quelqu'un l'a
cherchée, à la différence de l'écart de 5.6 qui est planifié en P9.

**Ce que je n'ai pas évalué.** Le temps réel d'arrivée d'un contributeur externe.
`CONTRIBUTING.md` existe et décrit les cinq gestes ; personne n'a chronométré
quelqu'un les suivant pour la première fois.

---

## 5. Fiabilité

Pour un outil dont toute la valeur est la confiance dans ses verdicts, il n'existe
qu'une défaillance irrattrapable : le **vert faux**, un "aucun défaut trouvé" rendu
alors que le contrôle n'a pas tourné, n'a pas pu tourner, ou a tourné sur rien.

Il faut nuancer immédiatement, parce que la formule inverse est trop commode. Un
rouge faux n'est pas anodin : une porte qui crie au loup est contournée, et une
fois contournée elle laisse aussi passer les vrais rouges. La conséquence pratique
est en 6.4, et elle est mesurée, parce que ce plan va produire des verdicts
visiblement différents de ceux d'aujourd'hui.

### 5.0 Méthode du recensement

Sans méthode, "vingt-cinq chemins" est un nombre qu'on cite et qu'on ne peut pas
contredire, ce que ce document reproche par ailleurs.

**Population.** Les quinze modules qui émettent un verdict ou un code de sortie :
`tools/inspect/{rules,detect,rendered,three,motion,capture}.mjs`,
`tools/audit/{analyze,fetch,gate,eval}.mjs`, `tools/audit/lib/{checks,aggregate,site-audit,ai-access}.mjs`,
`tools/content/score.mjs`, plus les cinq harnais de `tests/`.

`skills/siteasy/scripts/` contient douze fichiers et n'entre pas en bloc. Six
rendent un verdict ou un objet de résultat positif : `parallax-audit.mjs`,
`video-guardplay.mjs`, `live-inject.mjs` et `detect-csp.mjs`, qui fournissent six
entrées de l'annexe, plus `live-poll.mjs` et `live-server.mjs`, dont le `ok: true`
rapporte un transport réussi et non une mesure, ce qui les met hors du critère de
retenue. Les six autres (`live-wrap`, `live`, `live.js`, `load-context`,
`live-accept`, `live-core`) ne rendent aucun verdict ; `live-accept` et `live-core`
sont tout de même lus en 5.9, comme référence de ce que `live-inject` ne fait pas.

**Énumération.** Les 50 contrôles que `runChecks` émet, un par un (42 déclarés dans
`checks.mjs`, 8 importés de `ai-access.mjs`). Ailleurs, chaque
site retournant un verdict positif, un tableau de constats vide ou un code de
sortie zéro : `verdict: "PASS"`, `return []`, `process.exit(0)`, et chaque
`catch` dont le corps ne pousse rien.

**Critère de retenue.** Un chemin est retenu quand il existe un état du monde où
le module rend un résultat positif alors que la mesure n'a pas eu lieu. Un chemin
qui dit qu'il n'a pas mesuré n'est pas retenu, et l'entrée 21 de l'annexe est la
seule exception : elle le dit très bien et son code de sortie le contredit.

**Règle d'arrêt.** L'énumération est exhaustive sur les contrôles de `runChecks` (50 sur 50) et
sur les six modules de `tools/inspect/`. Elle est exhaustive par motif et non par
ligne sur `fetch.mjs` (952 lignes) et sur les scripts de `skills/`. Le
vingt-sixième chemin viendra donc probablement de là, et c'est la raison d'être de
l'invariant P3b : un correctif qui rapièce les cas connus ne protège pas du suivant.
Au moment où cette règle a été écrite le recensement en comptait vingt-cinq ; le
§5.8 l'a porté à trente et un, ce qui ne change pas l'argument et change le nombre.

Ce pari est perdu, et le §5.8 dit comment. Les six chemins suivants ne sont venus ni
de `fetch.mjs` ni des scripts de `skills/`, mais des trois sondes que l'auteur de ce
document venait d'écrire, et ils ont été trouvés par une relecture indépendante et
non par cette énumération. La règle d'arrêt visait la bonne faiblesse (une zone
énumérée par motif) et a manqué la vraie (une zone énumérée par son auteur). P3b
reste le bon correctif ; ce qui manquait à côté est ce que 5.8 appelle un test de
mutation.

**Ce que le recensement ne couvre pas.** La surface de distribution :
`.claude-plugin/marketplace.json`, `install.sh`, `install.ps1`, et `action.yml`
au-delà des deux points où il croise le recensement (l'entrée `report:` en 5.1, et
l'étape Chromium de `:61-64` qui rechiffre P10). Ces fichiers déterminent qui reçoit
quoi et non ce qu'un module rend, donc le critère de retenue ne s'y applique pas ;
ils mériteraient leur propre passe.

Également non couverts, les 15 sous-agents de `agents/`, dont les
verdicts sont produits par un modèle et non par du code : la notion de "chemin
d'exécution" ne s'y applique pas et un recensement statique n'y trouverait rien.
Cette exclusion est légitime pour la fiabilité au sens de ce document et ne l'est
pas pour la cohérence de la promesse, ce que dit 2.3. Également exclu, le chemin de
génération de `/siteasy`, qui ne rend pas de verdict.

Trente et un chemins retenus, neuf sont reproduits par exécution, vingt et un
établis par lecture et un des deux à la fois (l'entrée 1 : le score de la page 404
est reproduit, le fait que personne ne lise `status` est lu). L'annexe les liste
tous avec leur dégât, leur probabilité, leur point de plan et leur statut.

### 5.1 La porte d'intégration continue passe sur un rapport qu'elle ne sait pas lire

`tools/audit/gate.mjs:54-68`. Le seuil de score est gardé par `score != null`, ce
qui **désactive** le contrôle au lieu de le faire échouer.

```
$ node tools/audit/gate.mjs --report package.json --min-score 95 --max-fails 0
NullToHero audit gate — ?
  deterministic score: n/a/100   FAIL: 0   WARN: 0   critical FAIL: 0
  RESULT: PASS
$ echo $?
0
```

**vérifié.** `package.json` n'est pas un rapport d'audit. La porte demandée à 95
sur 100 rend PASS et sort 0, ce que l'intégration continue lit comme un succès. Un
rapport tronqué, un chemin erroné pointant sur un autre JSON, ou un changement de
schéma produisent le même résultat. La première ligne porte un `?` là où irait la
cible, seule trace de l'anomalie, et rien ne la lit : c'est ce que l'annexe note
dans la colonne "Le dit ?".

**Ce constat porte sur le produit livré, pas sur un outil interne.** `action.yml`
publie une Action GitHub dont l'entrée `report:` appelle `gate.mjs --report`. Un
utilisateur qui la câble sur un chemin devenu faux obtient un job vert. C'est la
raison pour laquelle ce chemin ouvre le document.

### 5.2 La porte ne regarde pas la date du rapport

`tools/audit/gate.mjs:46-47` lit le fichier et rien d'autre. `buildSiteAudit`
écrit pourtant `generatedAt`, `inputs.hashes` et `pluginVersion`
(`site-audit.mjs:121-170`).

```
$ node tools/audit/analyze.mjs tests/eval/fixtures/clean-pass.html --json > /tmp/old.json
$ node -e "const j=require('/tmp/old.json'); j.generatedAt='2026-08-04T09:00:00.000Z';
   require('fs').writeFileSync('/tmp/old.json', JSON.stringify(j))"
$ node -e "console.log(require('/tmp/old.json').generatedAt)"
2026-08-04T09:00:00.000Z
$ node tools/audit/gate.mjs --report /tmp/old.json --min-score 90; echo $?
0
```

**vérifié.** Le rapport est daté d'une semaine avant la portée de ce document, la
porte le passe, et rien dans sa sortie n'indique son âge. Une étape d'analyse qui échoue sans faire échouer le
job laisse le rapport de la veille sur le disque et la porte reste verte sur les
verdicts de la veille. L'annexe classe ce chemin en probabilité élevée, avec dix
autres, et derrière six chemins certains.

### 5.3 Le score part de 100 et ne connaît pas son dénominateur

`tools/audit/lib/checks.mjs:1806-1812`. Le score est une déduction depuis un
départ parfait, et le nombre de contrôles ayant réellement tourné n'entre jamais
dans le calcul. Un contrôle qui n'a pas pu tourner déduit zéro, ce qui est
arithmétiquement identique à un contrôle qui a réussi.

```
$ node -e "import('./tools/audit/lib/checks.mjs').then(({scoreFromChecks})=>
   console.log(JSON.stringify(scoreFromChecks(
     Array.from({length:42},(_,i)=>({id:'c'+i,verdict:'NOT_MEASURED'}))))))"
{"score":100,"fails":0,"warns":0,"notMeasured":42,...}
```

**vérifié.** Quarante-deux contrôles non mesurés donnent 100 sur 100.

Le dépôt sait déjà que c'est faux, un niveau plus haut.
`tools/audit/lib/site-audit.mjs:149-165` refuse de publier un score global quand
un groupe n'a pas tourné, et la note explique pourquoi dans les termes exacts du
problème. Le bon réflexe est présent, appliqué à la mauvaise altitude : le
plancher qu'il expose en dessous a le défaut que sa propre note décrit.

### 5.4 Un fichier non récupéré se lit comme un fichier propre

`tools/audit/fetch.mjs:40` fixe les plafonds :
`{ maxFiles: 30, maxBytesPerFile: 512 * 1024, maxTotalBytes: 3 * 1024 * 1024 }`.
`fetch.mjs:387` refuse toute ressource d'une autre origine avec
`skipped.push({ href, reason: "cross-origin" })`. Un bundle GSAP, ScrollTrigger ou
Lenis servi par un CDN déclenche les deux.

Sept contrôles reçoivent alors une chaîne nue. **Cinq la lisent comme une
absence** et **deux rendent déjà `NOT_MEASURED`**, ce qui rend la correction
d'autant plus simple : le modèle est dans le même fichier.

Reproduction sur une page dont toute l'animation est sur jsdelivr et unpkg :

```
$ node -e "import('./tools/audit/lib/checks.mjs').then(({runChecks,scoreFromChecks})=>{
  const html='<!doctype html><html lang=\"en\"><head><title>Studio</title>'
   +'<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\">'
   +'</head><body><h1>Studio</h1>'
   +'<script src=\"https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js\"></script>'
   +'</body></html>';
  const r=runChecks({rawHtml:html, css:'', js:''});
  for (const c of r) if (c.verdict==='PASS' && /motion-reduced|three-dup|frame-|scrollbar/.test(c.id))
    console.log(c.verdict, c.id, JSON.stringify(c.detail));
  console.log('score', scoreFromChecks(r).score);
})"
PASS    motion-reduced-guard     "No JS animation or scroll library detected."
PASS    scrollbar-hidden         "Document scrollbar not suppressed."
PASS    frame-sequence-preload   "No large sequential image set referenced."
PASS    three-duplicate-copies   "No three.js build detected in the page's own scripts."
PASS    frame-loop-alloc         "No frame loops detected."
score 72
```

**vérifié.** Score de la page : **72 sur 100, zéro FAIL, vingt PASS**. Le contrôle
n'échoue pas seulement à détecter, il **affirme** qu'aucune bibliothèque
d'animation n'est présente, sur un site entièrement bâti sur une.

Les deux qui font le bon geste, dans le même fichier :
`checkViewportUnits` (`checks.mjs:253-256`) et `checkRobots` (`checks.mjs:202-204`)
rendent `NOT_MEASURED` avec une raison nommée.

Cas identique et plus fréquent, `tools/audit/lib/ai-access.mjs:121-132` rend PASS
avec `"No robots.txt found. Every AI crawler is allowed by default."` quand
`robotsTxt` vaut `null`. Or `robotsTxt` vaut `null` sur cinq états, dont
quatre sont dans `fetch.mjs:104-112` (cible locale à `:105`, réponse non OK à
`:110`, erreur réseau et délai dépassé partageant le `return` de `:112`). Le
cinquième, "non demandé", est décidé à `:819`, la sonde étant derrière `--robots`. Et `checkRobots` rend `NOT_MEASURED` pour ce même `null`. Deux
contrôles, une entrée, deux réponses opposées.

### 5.5 La page d'erreur du serveur est auditée comme la page cible

`tools/audit/fetch.mjs:83-86` récupère `res.status`, le range dans
`fetchResult.status`, et rien ne le lit ensuite : ni `runChecks`, ni
`buildSiteAudit`, ni `gate.mjs`.

```
$ node -e "import('./tools/audit/lib/checks.mjs').then(({runChecks,scoreFromChecks})=>{
  const h='<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\">'
   +'<title>Page introuvable</title><meta name=\"description\" content=\"...\">'
   +'<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head>'
   +'<body><main><h1>404</h1><p>Cette page n existe pas.</p><a href=\"/\">Accueil</a>'
   +'</main></body></html>';
  const r=runChecks({rawHtml:h, css:'', js:''}); const s=scoreFromChecks(r);
  console.log('score', s.score, 'FAIL', s.fails, 'PASS', r.filter(c=>c.verdict==='PASS').length);
})"
score 86 FAIL 0 PASS 22
```

**vérifié.** Une page 404 correctement construite, avec un titre, une
meta description, un `lang`, un `viewport` et un `h1`, obtient **86 sur 100, zéro
FAIL, vingt-deux PASS**. Aucune ligne de sortie ne dit que le serveur n'a pas
servi la page demandée.

Le chemin par page, sept cent cinquante lignes plus bas, fait le contrôle
(`fetch.mjs:853`). C'est la page d'entrée qui ne l'a pas.

### 5.6 La couverture déclarée n'est pas la couverture atteinte

`tools/inspect/detect.mjs:129` appelle `runChecks({ rawHtml: html, css })` sans
passer `js`, qui vaut alors `""` par défaut (`checks.mjs:1743`). Le JS en ligne
existe pourtant : il est extrait à `:126` sous le nom `inlineJs` et passé à
`runRules` à la ligne suivante. Il est disponible, il n'est pas transmis.

```
$ grep -n "runChecks({" tools/inspect/detect.mjs
129:    for (const c of runChecks({ rawHtml: html, css })) {
$ node -e "import('./tools/audit/lib/checks.mjs').then(({runChecks})=>console.log(
   runChecks({rawHtml:'<html><body><script>gsap.to(x,{y:1})</script></body></html>', css:''})
     .find(c=>c.id==='motion-reduced-guard').verdict))"
PASS
```

**vérifié.** Or `tools/data/rule-coverage.csv` classe les règles 47 et 58 en
`static-check`, donc exécutables, et `tests/inspect-rules.mjs:161` les compte dans
le total "N sur M exécutables". Sur un scan local elles sont structurellement
incapables de se déclencher, et le garde de dérive ne l'attrape pas parce qu'il
vérifie que le contrôle **existe**, pas qu'il est **atteignable avec ses
entrées**.

### 5.7 Ce que la suite de tests ne vérifie pas

`tests/rendered-rules.mjs:36-43` annonce loyalement les règles qu'il n'a pas pu
vérifier quand Playwright est absent, puis sort ensuite 0.

Une version antérieure de ce document prouvait cela en lançant le fichier depuis
`/tmp` avec la sortie redirigée. La preuve ne tenait pas : Node résout `playwright`
depuis l'emplacement du module importateur, donc le harnais tournait pour de bon et
le 0 signifiait "tout est passé". Un transcript qui vaut 0 dans les deux cas ne
distingue rien, ce qui est l'exacte défaillance qu'il prétendait montrer. La preuve
est donc en deux morceaux, tous deux vérifiables sans navigateur :

```
$ grep -n "SKIPPED" -A 4 tests/rendered-rules.mjs | grep "process.exit"
    process.exit(0);
$ grep -c "rendered-rules" .github/workflows/validate.yml
0
$ node -e "console.log(require('./package.json').scripts.test.includes('rendered-rules'))"
true
```

**vérifié.** La branche du saut sort 0, et le fichier est dans `npm test` et absent
du workflow. Treize règles ne sont donc pas vérifiées, les 5, 23, 27, 51, 52, 62,
68, 79, 80, 81, 84, 85 et 86, et l'intégration continue, qui ne lit que le code de
sortie, voit vert. Ces treize sont l'intégralité des règles exigeant un
navigateur : aucune ne peut être vérifiée par un autre chemin. La vérification en
navigateur ne tourne jamais en intégration continue, non par échec mais par
construction.

C'est le constat le plus inquiétant en nature : les sondes navigateur sont ce que
le produit vend et rien ne les vérifie. Sa cause est une omission de configuration
et non un défaut de code, ce qui le rend le moins cher à corriger sur le principe.
Une version antérieure de ce document le disait aussi le plus cher en pratique, et
le reléguait au onzième rang pour cette raison. La vérification a corrigé les deux :
la recette Chromium existe déjà dans le dépôt (`action.yml:61-64`), le coût tombe
sous la barre du jour et P10 sort deuxième du plan, derrière P17 seulement. Le
constat le plus inquiétant est donc aussi le deuxième à payer, ce qui est le cas
rare où la rhétorique et le classement disent la même chose.

Une réserve sur ma propre affirmation : je dis que ces treize règles ne peuvent
être vérifiées par aucun autre chemin. C'est vrai par construction, leur classe de
couverture les définit comme exigeant une page rendue, et c'est une lecture de la
carte, pas une preuve qu'aucune approximation statique n'existerait. Elle porte le
choix le plus coûteux du plan et mérite d'être contestée avant d'être payée.

### 5.8 Ce que la relecture croisée des sondes a trouvé

Ce document annonçait, en tête, qu'une relecture des sondes de 3.7.0 par quelqu'un
d'autre que leur auteur était son complément manquant. Elle a été faite avant
publication : les trois modules (`three.mjs`, `motion.mjs`, `capture.mjs`), leurs
tests, leurs fixtures et leurs lignes de registre, remis à un lecteur sans contexte
avec la doctrine du dépôt et la consigne de trouver ce qui ne va pas. Vingt constats,
dont quatre de gravité haute, versés en entier dans
`ARCHITECTURE-REVIEW-sondes.md`, qui dit pour chacun s'il est recensé ici et sinon
pourquoi. Six entrent au recensement, ce qui le porte de
vingt-cinq à trente et un chemins et ajoute trois points au plan.

Le résultat qui compte n'est pas le nombre. C'est que les six chemins sont dans le
code écrit par l'auteur de ce document, pendant que ce document mesurait les
chemins des autres. La règle d'arrêt de 5.0 pariait que le vingt-sixième viendrait
de `fetch.mjs` ou des scripts de `skills/`, les deux zones énumérées par motif. Le
pari était faux, et il l'était dans la direction que le paragraphe de conflit
d'intérêts annonçait.

**Trois des quatre de gravité haute.** Le quatrième, le diviseur WebGPU, est plus
bas avec les autres retenus : le relecteur le classe haut sur la gravité du
symptôme, je le cote dégât 2 sur la classe de défaillance, et le compagnon garde le
désaccord au lieu d'en faire une moyenne.

`three.mjs:295`, `motion.mjs:379` et `:400`, et `rendered.mjs:392` avant eux : le
drapeau `--json` imprime le rapport et sort 0, quel que soit le contenu du rapport.

```
$ node tools/inspect/three.mjs "file://$PWD/tools/inspect/fixtures/three/bad.html"
  5 findings
$ echo $?
1
$ node tools/inspect/three.mjs "file://$PWD/tools/inspect/fixtures/three/bad.html" --json >/dev/null
$ echo $?
0
$ node tools/inspect/motion.mjs "file://$PWD/tools/inspect/fixtures/motion/sweep-static.html" --sweep
  REFUSED  no drivable animation on the page, so the sweep measured nothing
$ echo $?
2
$ node tools/inspect/motion.mjs "file://$PWD/tools/inspect/fixtures/motion/sweep-static.html" --sweep --json >/dev/null
$ echo $?
0
```

**vérifié.** Les deux références présentent `--json` comme l'invocation principale.
Le code 2 du refus, écrit exprès pour qu'un appelant ne prenne pas un refus pour un
succès, disparaît sur le chemin que la documentation recommande. C'est le
vocabulaire du refus annulé par le transport.

`motion.mjs:410-411`. Quand `sampled` vaut 0, aucune animation ne tournait à
l'ouverture de l'échantillon, ce que la sonde note correctement. Puis elle conclut.

```
$ node tools/inspect/motion.mjs file:///tmp/nothing.html --reduced
  0 animations were running when the sample started, 0 of them infinite
  NOTE  nothing was animating when the sample started, so this run cleared nothing
  The page honours the preference: nothing advanced.
$ echo $?
0
```

**vérifié.** La note et le verdict se contredisent dans la même sortie, et c'est le
verdict qui est lu. `skills/inspect/references/rendered.md:105` écrit la règle que
cette ligne viole : une page où rien n'anime ne dédouane rien, et un zéro n'est pas
un succès. Les révélations au défilement et les entrées différées sont le cas
courant, pas le cas limite.

`three.mjs:149-165`. La sonde coupe `info.autoReset`, remet les compteurs, attend
deux rAF, puis divise. Rien ne vérifie qu'un rendu a eu lieu dans cette fenêtre. Sur
une scène qui rend à la demande, un `render()` au chargement puis plus rien, le
compteur reste à zéro, la règle 80 se tait et la ligne de sortie annonce zéro appel
de dessin. Le zéro est à la fois la valeur sentinelle et le meilleur score possible,
exactement le motif de l'entrée 6 de l'annexe dans un module écrit trois versions
plus tard. Le diviseur juste est déjà disponible : `info.render.frame` s'incrémente
à chaque `render()` et n'est pas remis à zéro par `reset()`, et `motion.mjs:68` lit
déjà ce champ. Je n'ai pas reproduit ce chemin faute d'une build locale de three.js
dans l'environnement d'exécution. Il est donc établi par lecture, et l'entrée 28
porte **L** : la relecture croisée annonce l'avoir reproduit de son côté et je n'ai
pas son transcript, ce qui ne suffit pas pour un **V** sous la convention de ce
document.

**Les trois autres retenus, dont ce quatrième constat haut.** Le balayage tronque à 20 s sans note, donc une
animation déclarée à 40 s reçoit "rien ne bouge entre 2609 ms et 20000 ms d'une
séquence de 20000 ms" alors que la seconde moitié n'a pas été parcourue
(`motion.mjs:233`, `:255`). Le drapeau `truncated`, levé au-delà de 1500 éléments,
n'est lu ni par `evaluateSweep` ni par le CLI, donc un verdict propre sort sur un
sous-ensemble non annoncé (`:191`, `:255`). Et sur le rendu WebGPU, le diviseur est
`info.render.frameCalls`, qui compte les appels de rendu de la trame et non les
trames : une chaîne de post-traitement à trois passes divise par trois de trop, et
un dépassement du plafond de 1000 sort en simple écart à la cible de 300
(`three.mjs:152`). Cette branche n'a jamais été exécutée par un test, les fixtures
fournissant un `info` écrit à la main sans `frameCalls`.

**Ce qui reste hors recensement, et pourquoi.** La règle 81 émet deux constats
contradictoires sur une scène antérieure à r152, puisqu'elle y cherche une propriété
`colorSpace` que la bibliothèque n'avait pas encore, et son comptage sature à six
par un `if` mal placé : ce sont des rouges faux et des nombres faux, pas des verts
faux. La moitié three.js de la règle 84 lit un global que seul `three.mjs` installe,
donc elle ne se déclenche sur aucun chemin livré : c'est le motif de 5.6, une
couverture déclarée et non atteinte, dans un module plus récent. Le "au repos" de la
règle 86 est mesuré sur la première trame, c'est-à-dire au début de l'animation et
non à sa fin, ce qui produit des faux positifs et des faux négatifs. Et la recette
Claude in Chrome de `three.md:39-47` demande d'installer un global puis de recharger
la page, ce que la navigation détruit : le chemin échoue proprement, `installed`
vaut alors `false`, mais la voie annoncée pour une page derrière authentification
n'a jamais mesuré un coût. Ces quatre défauts sont réels et sont hors du sujet de ce
document. Ils sont notés ici pour ne pas être perdus.

**Les deux chemins déjà recensés.** `three.mjs:134-140`, la lecture du ratio de
pixels est dans un `try` dont le `catch` est vide, donc la loi L-WEBGL-2 n'est pas
contrôlée et rien ne le dit dans le JSON, alors que le bloc situé vingt-six lignes
plus bas fait le bon geste. Et `tools/inspect/capture.mjs:105-118`, si `video.path()`
échoue, le repli parcourt le dossier de sortie et retient un `.webm` arbitraire dans
l'ordre de `readdirSync` : sur un deuxième run dans le même dossier, l'outil annonce
le fichier du run précédent comme la capture de celui-ci. Le correctif complet est un
dossier par run, pas une meilleure sélection. Les deux sont planifiés en P13.

**Ce que la relecture a jugé propre, explicitement.** Le protocole three.js
(`__THREE_DEVTOOLS__`, `data-engine`, `window.__THREE__`, la sémantique de
`autoReset`, `memory` qui compte des objets) est exact contre three r185. Le garde
d'auto-invalidation de `motion.mjs:45-50` est correct et réellement testé. La
séparation navigateur/verdict est réelle et non nominale : `evaluateSweep` est bien
pure. Et le balayage ne souffre pas de la course rAF qu'on lui soupçonnerait, la
boucle de 24 échantillons étant une seule tâche synchrone.

**Ce que cette relecture apprend sur la méthode, pas sur le code.** Les trois
constats hauts ont une cause commune que l'auteur ne pouvait pas voir : chaque
fixture three.js écrite par l'auteur fait tourner une boucle rAF, parce que c'est ce
qui rend `autoReset` pertinent. Le défaut est l'absence de ce que la fixture fournit
toujours. Un test de mutation le montre mieux qu'une relecture : la relecture a
modifié `evaluateSweep` pour qu'elle garde `refused: true` tout en émettant des
constats, et la suite complète est restée verte. Les deux fixtures de refus portent
une matrice vide, donc la forme du refus est testée et son effet ne l'est pas.

### 5.9 La frontière de confiance réseau, examinée et jugée solide

Un outil qui récupère une URL fournie par un tiers, suit ses redirections et sonde
des chemins voisins sur son origine est une surface de falsification de requête
côté serveur. Le dépôt le sait et le traite dans `tools/audit/lib/url-safety.mjs`,
dont l'en-tête nomme le problème avant de le résoudre.

Ce qui est couvert : les plages privées et de bouclage, l'adresse de métadonnées
`169.254.169.254`, la canonisation d'un hôte écrit en décimal, en octal ou en
forme courte (`canonicalizeHost`, lignes 90 à 128, avec le commentaire expliquant
que `127.1` atteint le bouclage sans jamais correspondre à la chaîne `127.0.0.1`),
et la vérification de chaque saut d'une chaîne de redirections et non du seul
premier.

Ce qui ne l'est pas, vérifié plutôt que signalé comme question ouverte.
`skills/siteasy/scripts/live-inject.mjs:24` construit son chemin d'écriture avec
`join(root, rel)` et n'appelle jamais `resolveInRoot`, alors que son frère
`live-accept.mjs:15` le fait et que `live-core.mjs:117` l'expose, testé dans
`tests/unit.mjs`. Les chemins viennent de `resolveConfigFiles`, qui accepte une
entrée de configuration littérale dès qu'elle existe sur le disque
(`live-core.mjs:88`), donc une entrée `../..` sort de la racine. Le fichier de
configuration est écrit par l'utilisateur, ce qui borne le risque à un pied tiré
dessus plutôt qu'à une élévation, et c'est pour cette raison que je ne le classe
pas en vert faux. Le correctif est un appel de fonction déjà écrite et testée,
planifié en P15.

### 5.10 La doctrine existe, et elle est rigoureuse là où elle est appliquée

Il serait faux de présenter ce dépôt comme naïf sur la question. Il a un
vocabulaire explicite pour "je n'ai pas pu mesurer", et chaque module dont l'entrée
est un navigateur en porte au moins un usage.

Il faut lire cette liste avec 5.8 en tête, sinon elle dit plus qu'elle ne vaut.
Avoir le vocabulaire n'est pas l'appliquer sur tous les chemins : les entrées 24,
27, 28, 29 et 30 de l'annexe sont des verts faux dans ces mêmes sondes, dont
l'entrée est bien un navigateur. La frontière n'est donc pas seulement "chaîne
contre navigateur", elle est aussi "échantillon vide contre échantillon peuplé", et
c'est ce second bord que le vocabulaire ne franchit pas.

- `tools/inspect/rendered.mjs:101-109` compte les candidats par règle, et `:400`
  imprime `"Nothing on the page to judge for: N. Their silence is not a pass."`
- `rendered.mjs:58-62` mesure son propre temps écoulé et rend `settled: false`
  plutôt que de faire confiance à l'appelant.
- `tools/inspect/motion.mjs:45-49` vérifie que l'émulation a pris avant de juger,
  et `motion.mjs:271-276` rend `refused: true` et **sort 2** quand le balayage n'a
  pas bougé la page.
- `tools/inspect/three.mjs:111-113` annonce que le collecteur n'était pas installé
  et que seuls les constats de détection sont réels.
- `tools/audit/lib/css.mjs:58-78` enregistre l'ambiguïté au lieu de choisir un
  camp, dans un sens comme dans l'autre, et `css.mjs:216-217` écrit la doctrine :
  inventer un succès est pire qu'inventer un échec, parce que personne ne
  revérifie un verdict vert.
- `tools/audit/lib/aggregate.mjs:36` interdit à un `NOT_MEASURED` de primer sur un
  verdict réel.
- `tests/behavior/run.mjs:522` : "un corpus valide n'est pas un test de
  comportement qui passe".

Deux de ces sept ont été écrits pendant l'évaluation, celui de `motion.mjs` et celui
de `three.mjs`, dans les modules nés en 3.7.0. Cinq préexistaient, y compris le
comptage de candidats de `rendered.mjs:101-109`, arrivé en 3.5.2
(`git log -S "Their silence is not a pass"`). Le vocabulaire préexiste, il a été
étendu, et il n'a traversé ni la frontière où l'entrée est une chaîne, ni celle où
l'échantillon est vide.

### 5.11 Ce qui tient laws.csv

Le contrôle 37 garantit qu'une loi est citée. Il garantit aussi qu'aucun fichier ne
réénonce son seuil sans citer son identifiant, mais seulement là où la ligne porte
une expression régulière dans sa colonne `guard`, `tests/validate.js:1412` faisant
`if (!law.guard) continue;`. Quatre lignes sur 33 en portent une (`L-PROG-1`,
`L-PROG-2`, `L-WORD-1`, `L-INDEXNOW-1`). Pour les 29 autres, la réénonciation n'est
pas détectée : la promesse du tableau de la section 1 vaut au huitième. C'est le
meilleur exemple existant du défaut décrit en 2.2, et il est dans le mécanisme censé
le corriger.

Il ne garantit pas non plus que la valeur soit juste, ni
qu'elle soit encore juste : `L-PERF-1` vaut 2,5 s parce que Google le disait quand
la ligne a été écrite, et rien dans le dépôt ne date cette affirmation ni ne la
rattache à sa source. La colonne `source` existe dans `inspect-rules.csv` et pas
dans `laws.csv`.

Le mécanisme qui tient tous les seuils honnêtes n'a donc lui-même rien qui le
tienne, au-delà de la cohérence interne. Je ne le porte pas au plan parce que la
correction est éditoriale (dater et sourcer 33 lignes) et non mécanique, mais
c'est la racine de confiance du dépôt et elle est plus fine qu'elle n'en a l'air.

### 5.12 Conclusion de la section

La conclusion n'est donc pas que le dépôt ignore le problème. C'est qu'il l'a
nommé, doté d'un vocabulaire, et résolu chemin par chemin plutôt que par classe.
Là où l'entrée arrive sous forme de chaîne ou de `null`, il ne l'a pas résolu du
tout. Là où l'entrée est un navigateur, il l'a résolu sur les chemins où quelque
chose a été mesuré et pas sur ceux où l'échantillon est vide, ce que 5.8 établit
dans les modules les plus récents. Le score, enfin, convertit chaque cas non résolu
en points gratuits. C'est pour cette raison que P3b, l'invariant, compte plus que
la somme des correctifs unitaires : ce dépôt sait faire le geste, il ne sait pas
encore l'exiger.

---

## 6. Le plan

### 6.1 Fonction de classement

`priorité = dégât × probabilité ÷ coût`, avec dégât dans {1 mineur, 2 moyen,
3 élevé}, probabilité dans {1 faible, 2 moyenne, 3 élevée, 4 certaine}, coût en
jours-personne pour quelqu'un qui connaît le dépôt, borne basse au dénominateur.

**Conversion depuis l'annexe.** Un point de plan qui couvre des entrées prend le
maximum de leurs dégâts et le maximum de leurs probabilités. Les cinq points
qu'aucune entrée ne nomme (P3b, P6, P7, P8, P12) portent une valeur de jugement, non
dérivée, dont l'argument tient en une ligne de leur paragraphe. Le mot "très élevée" apparaissait dans une version antérieure de
l'annexe pour les entrées 4 et 7 et n'existait sur aucune échelle : ces deux chemins
sont empruntés à chaque exécution par défaut, comme les entrées 2, 9, 21 et 26, donc
"certaine". Le critère de la colonne est corrigé en conséquence dans l'annexe.

**Coûts.** Une version antérieure de ce document annonçait une base (un demi-jour
par tranche de trois sites d'appel, plus un demi-jour par test) et ne l'appliquait à
aucune ligne : quatre points étaient chiffrés sous le plancher que cette base
produit, et les deux estimations mises en scène comme des dérivations ne la
suivaient pas. Une base qu'on n'applique pas est le défaut décrit en 2.1. La règle
retenue est plus pauvre et vérifiable : tout point demandant un test non trivial
coûte au moins un jour, un demi pour le changement et un demi pour le test, plus un
demi-jour de revue dans la borne haute. Au-delà de ce plancher les chiffres sont des
jugements, et le document ne prétend plus les dériver.

Conséquence qu'il faut dire plutôt que laisser voir : quinze des dix-neuf lignes
valent exactement le plancher, donc le dénominateur est constant sur les quatre
cinquièmes du tableau et la division n'y ordonne rien. Sur ces quinze lignes, le
classement se réduit à `dégât × probabilité`, et trois dérogations réordonnent
ensuite le résultat. La formule sert à rendre le raisonnement contestable ligne à
ligne, pas à trancher : ce qui décide vraiment de l'ordre de livraison, ce sont les
dégâts, les probabilités et les trois dérogations écrites ci-dessous.

Trois dérogations au classement, chacune motivée :

- **P17, P10, P2, P5 et P1 sont livrés en premier** malgré une priorité inférieure
  à celle du bloc P3 pour trois d'entre eux. Ils sont indépendants, tiennent dans
  une version, et ferment l'entrée pendant que le bloc P3 est en cours. Laisser la
  porte passante trois semaines pour livrer d'abord ce qui rapporte le plus par
  jour-personne est une erreur d'unité.
- **P3, P4 et P3b forment un bloc**, classé au rang de sa plus haute priorité (12),
  P3 en tête parce que les deux autres en dépendent (6.4).
- **P13 est remonté** de la dernière place, devant P15, P6, P18, P7 et P14. Sa
  probabilité est faible, mais l'un de ses deux chemins présente l'artefact d'une
  exécution précédente comme la preuve de celle-ci. Pour un outil dont le produit est la preuve, c'est une erreur de
  catégorie et pas une erreur de degré.

Le tableau est dans l'ordre de livraison, pas dans l'ordre de priorité. Quatre des
cinq blocs séparés par les dérogations ci-dessus sont à priorité décroissante ; le
bloc P3, P4, P3b est ordonné par dépendance et classé au rang de son maximum (12),
donc il monte en interne.

| # | Point | Dégât | Prob. | Coût | Prio. | Dépend de |
|---|---|---|---|---|---|---|
| P17 | `--json` porte le code de sortie | 3 | 4 | 1 à 1,5 j | 12 | |
| P10 | Les règles navigateur remontent à la CI | 3 | 4 | 1 à 1,5 j | 12 | |
| P2 | La porte refuse un rapport périmé | 3 | 3 | 1 à 1,5 j | 9 | |
| P5 | Lire le statut HTTP de la page d'entrée | 3 | 3 | 1 à 1,5 j | 9 | |
| P1 | La porte refuse un rapport illisible | 3 | 2 | 1 à 1,5 j | 6 | |
| P3 | "Non mesuré" devient indéracinable | 3 | 4 | 3 à 3,5 j | 4 | |
| P4 | Le score connaît son dénominateur | 3 | 4 | 1 à 1,5 j | 12 | **P3** |
| P3b | L'invariant qui rend le recensement auto-porteur | 3 | 4 | 1 à 1,5 j | 12 | **P3, P4** |
| P8 | Promouvoir les nombres contestés en lois | 2 | 4 | 1 à 1,5 j | 8 | |
| P9 | Le garde vérifie l'atteignabilité | 2 | 4 | 1 à 1,5 j | 8 | |
| P11 | Le balayage parallax cesse de rendre PASS à vide | 3 | 3 | 1,5 à 2 j | 6 | |
| P16 | Les sondes refusent de conclure sur un échantillon vide | 3 | 3 | 1,5 à 2 j | 6 | |
| P4b | Le second scoreur cesse d'imputer 70 | 2 | 3 | 1 à 1,5 j | 6 | |
| P13 | Les deux chemins de 5.8 | 3 | 1 | 1,5 à 2 j | 2 | |
| P15 | `live-inject` passe par `resolveInRoot` | 2 | 2 | 1 à 1,5 j | 4 | |
| P6 | Confronter les corpus three.js | 2 | 2 | 1 à 1,5 j | 4 | |
| P18 | Le diviseur WebGPU et le comptage de la règle 81 | 2 | 2 | 1 à 1,5 j | 4 | **P16** |
| P7 | Générer les comptages depuis les CSV | 1 | 4 | 1 à 1,5 j | 4 | |
| P14 | Le contrôle d'intégrité cesse de se taire | 1 | 2 | 1 à 1,5 j | 2 | |

Total : 22,5 à 32 jours-personne, plus le déploiement échelonné de 6.4, chiffré
à 2 jours. Ce total achète les vingt-six chemins planifiés **et** quatre points de
structure qu'aucune entrée de l'annexe ne nomme, P3b, P6, P7 et P8, soit 4 à 6 jours.

**P3 et P4 se livrent ensemble.** Le tableau les sépare parce que ce sont deux
travaux, la livraison n'en fait qu'une : le §6.4 montre que P3 seul est un
incrément strictement négatif, trois jours et demi pour 279 verdicts basculés et
aucun signal visible.

**P12, l'enregistrement générique des sondes, sort du plan.** Son dégât utilisateur
est nul (3.2) et le classer avec des chemins de vert faux affaiblirait l'idée que
cette liste est ordonnée par impact. Il reste une dette de structure, notée ici
pour ne pas être oubliée, à reprendre quand une quatrième famille de sonde
arrivera.

### 6.2 Les points

Dans l'ordre de livraison du tableau de 6.1.

**P17. `--json` porte le code de sortie.** `three.mjs:295`, `motion.mjs:379` et
`:400`, `rendered.mjs:392` : sortir le code que la voie texte sort déjà, 1 pour des
constats, 2 pour un refus. Le refus a son code depuis 3.7.0, il est perdu par le
transport que les références recommandent.
*Test :* pour chacune des trois sondes, l'invocation `--json` et l'invocation texte
rendent le même code de sortie sur la même fixture.
*Ne corrige pas :* la forme du JSON, que des appelants lisent déjà.

**P10. Les règles navigateur remontent à l'intégration continue.** Un job
`validate.yml` qui installe Chromium avec cache et exécute
`tests/rendered-rules.mjs`. Le drapeau `--require-browser`, à un demi-jour,
transforme le saut silencieux en échec bruyant sans jamais vérifier les treize
règles : pour un outil dont la valeur est le verdict observé en navigateur, ce
n'est pas suffisant. Prendre le job Chromium.
Chiffrage corrigé après vérification. Une version antérieure comptait deux à trois
jours en supposant la recette à écrire. Elle est écrite : `action.yml:61-64` porte
déjà `npx --yes playwright install --with-deps chromium`, dans l'Action publiée du
dépôt. Le travail est de la porter dans `validate.yml` avec un cache, un demi-jour à
un jour, plus le budget de stabilisation ci-dessous. La priorité passe de 6 à 12 et
P10 remonte dans le lot de tête, ce qui est le bon rang pour le constat que 5.7
appelle le plus inquiétant.
Le même job porte `node tools/check-review-numbers.mjs`, dont le bloc 12 rejoue les
sondes de 5.8 et demande donc le même navigateur.
*Test :* le workflow échoue si les treize règles ne sont pas vérifiées, et le garde
du présent document tourne dans le même job.
*Ne corrige pas :* la durée d'exécution, qui augmente d'environ deux minutes.
*Condition de livraison, à ne pas sauter :* une porte instable est contournée, et
une porte contournée cesse de protéger contre les vrais rouges, ce que ce document
soutient par ailleurs en 6.4. Avant de rendre ce job bloquant, le faire tourner
vingt fois de suite sur la même révision. Zéro échec, il devient bloquant. Un seul
échec, il reste informatif et le premier travail est de le stabiliser, pas de
l'imposer. Ce budget est inclus dans la borne haute.

**P2. La porte refuse un rapport périmé.** Dans `gate.mjs:46-47`, comparer
`generatedAt` à maintenant
avec une borne configurable, et comparer `inputs.hashes` à l'arbre courant quand
la cible est un fichier local.
*Test :* la commande de 5.2 sort 2 quand le rapport a plus de N heures.
*Ne corrige pas :* un rapport frais produit contre la mauvaise cible.

**P5. Lire le statut HTTP de la page d'entrée.** `fetch.mjs` a déjà `res.status` ;
`buildSiteAudit` doit le porter dans `target`, qui n'a pas ce champ aujourd'hui, et
`gate.mjs` doit refuser au-dessus de 399.
*Test :* une fixture servant un 404 bien formé, assertion que l'audit refuse au
lieu de noter 86.
*Ne corrige pas :* une redirection vers une page de connexion qui rend 200.

**P1. La porte refuse ce qu'elle ne sait pas lire.** `gate.mjs` exige un
`pluginVersion`, un `generatedAt` et un tableau `checks` non vide, et sort 2 en
leur absence.
*Test :* la commande de 5.1 sort 2 et non 0.
*Ne corrige pas :* un rapport frais et sincèrement vide, que P4 couvre.

**P3. "Non mesuré" devient indéracinable.** Sept contrôles reçoivent une chaîne
nue : `checkRobots`, `checkViewportUnits`, `checkMotionReducedGuard`,
`checkScrollbarHidden`, `checkFrameSequencePreload`, `checkThreeDuplicate`,
`checkFrameLoopAlloc`. Deux rendent déjà `NOT_MEASURED` et servent de modèle, cinq
sont à corriger. Ils doivent recevoir la chaîne accompagnée de sa provenance,
`measured`, `absent` ou `unfetchable`. La couche qui possède cette information la
possède déjà : `fetchResult.assets.skipped`, `renderAvailable`,
`probes.*.unresolved`.
Périmètre : sept signatures et un site d'appel dans `runChecks` (1 j), deux champs
à porter depuis `fetch.mjs` (0,5 j), les entrées 4, 7, 10, 14 et 17 de l'annexe qui
sont la même correction dans `ai-access.mjs` et `checks.mjs` (1 j), et les tests
(0,5 j). Somme 3 jours, plus le demi-jour de revue de 6.1 en borne haute.
*Test :* un cas où CSS et JS sont vides parce qu'ils ont été refusés, avec
assertion de `NOT_MEASURED` et non de `PASS`, pour les cinq contrôles nommés.
*Ne corrige pas :* les sondes réseau de 5.5, qui ont besoin de P5.

**P4. Le score connaît son dénominateur.** Dans `checks.mjs:1806-1812`,
`scoreFromChecks` rend déjà
`notMeasured`. Il doit rendre une couverture, et le rapport doit refuser un score
global sous un plancher, exactement comme `buildSiteAudit` le fait un niveau plus
haut.
*Test :* quarante-deux contrôles non mesurés rendent `score: null` et non 100.
*Ne corrige pas :* le choix du plancher, arbitrage produit et non mécanisme.

**P3b. L'invariant qui rend le recensement auto-porteur.** Le correctif de P3
rapièce les six chemins qu'il couvre et le plan les vingt-six qu'il recense.
L'invariant protège du vingt-septième : un test
qui, pour les 50 contrôles que `runChecks` émet, `ai-access.mjs` compris, construit
une entrée de provenance `absent` puis
`unfetchable` et échoue si un contrôle rend `PASS`. C'est la seule partie du plan
qui applique la thèse du document à lui-même, en donnant au recensement un
mécanisme capable de le contredire.
*Cotation :* dégât 3 et probabilité 4, ceux du chemin qu'il protège, puisque son
absence est ce qui laisse revenir la classe entière de P3.
*Test :* il est le test. Ajouter un contrôle qui rend PASS sur une entrée absente
doit faire échouer le build.
*Ne corrige pas :* les modules hors `checks.mjs`, qui n'ont pas d'énumération
comparable.

**P8. Promouvoir les nombres contestés en lois.** Stagger par élément, ratio de
sortie, distance de translation d'entrée, chacun avec un `guard`, sans quoi le
contrôle 37 ne voit rien (5.11).
*Cotation :* dégât 2, un conseil contradictoire dégrade la génération sans fausser
un audit ; probabilité 4, les six valeurs de 2.2 divergent déjà.
*Test :* le contrôle 37, sans modification.
*Ne corrige pas :* le choix de la valeur, qui demande un arbitrage éditorial.

**P9. Le garde vérifie l'atteignabilité.** Il doit vérifier que l'appelant passe
ses entrées à un contrôle déclaré exécutable. Ajouté seul, le garde passe au rouge
sur la révision courante, puisque `detect.mjs:129` est en écart : le correctif de
l'appelant tient dans un argument. `inlineJs` est calculé à `detect.mjs:126` et
passé à `runRules` à la ligne suivante, puis oublié à `:129`. Les deux changements
vont dans le même commit.
*Test :* retirer `js` d'un appelant fait échouer le garde.
*Ne corrige pas :* les entrées présentes mais vides, qui sont P3.

**P11. Le balayage parallax cesse de rendre PASS à vide.**
`skills/siteasy/scripts/parallax-audit.mjs` contribue trois entrées de l'annexe.
Zéro pour les vitals est à la fois la valeur sentinelle et le meilleur score
possible (`:115-116` posé, `:185-192` jugé), zéro calque trouvé donne "calques
neutralisés" (`:218-220`), zéro image pesée donne "toutes les images sous 200 Ko"
(`:215`). Le correctif est le motif de `rendered.mjs:101-109` et `:400` : compter les
candidats et refuser de conclure sur un ensemble vide.
*Test :* une page sans calque parallax rend un rapport qui dit qu'il n'a rien
trouvé à juger, et non trois PASS.
*Ne corrige pas :* la détection par convention de nommage, qui est le défaut
d'origine et demande une autre approche.

**P16. Les sondes refusent de conclure sur un échantillon vide.** Quatre chemins,
un seul motif, celui de `rendered.mjs:101-109` et `:400` porté aux modules de 3.7.0.
`motion.mjs:410-411` doit brancher sur `sampled === 0` au lieu de conclure après sa
propre note. `three.mjs:149-165` doit échantillonner `info.render.frame` avant et
après la fenêtre, ce qui donne à la fois le bon diviseur et un `NOT_MEASURED`
gratuit quand l'écart est nul. La troncature à 20 s et le drapeau `truncated`
doivent remonter en note jusqu'au CLI et au JSON.
*Test :* une scène qui rend une fois puis s'arrête, et une page où rien n'anime,
rendent un refus et non un verdict ; le test de mutation de 5.8 (garder
`refused: true` en émettant des constats) doit faire échouer la suite.
*Ne corrige pas :* les quatre défauts hors recensement de 5.8, qui sont des rouges
faux et des nombres faux.

**P4b. Le second scoreur cesse d'imputer 70.** `tools/content/score.mjs:144`,
`:349` et `:406` imputent 70 aux dimensions qu'ils ne peuvent pas noter, valeur
ensuite pondérée dans le composite, dans le drapeau `passed` et dans le code de
sortie. L'intention est bonne et écrite, l'effet ne l'est pas. Livrer P4 sans P4b
laisse un scoreur honnête et un scoreur qui ne l'est pas, et c'est le second qui
sert de porte.
*Test :* un document trop court pour trois dimensions rend `passed: null` et un
composite marqué partiel, non un nombre.
*Ne corrige pas :* le choix de la couverture minimale pour noter.

**P13. Les deux chemins de 5.8.** Une note dans le `catch` de `three.mjs`, et pour
`capture.mjs` un changement de sémantique du dossier de sortie : un sous-dossier
horodaté par exécution, ou à défaut une comparaison de date de modification au
démarrage. Le second n'est pas une meilleure sélection de fichier, c'est
l'admission que deux exécutions partageant un dossier ne sont pas sûres. Deux tests
non triviaux et un changement de sémantique, donc 1,5 jour sous le plancher de 6.1
et non 0,5.
*Test :* un renderer qui lève sur `getPixelRatio` produit une note ; un second run
dans un dossier occupé échoue au lieu de rendre l'ancien fichier.
*Ne corrige pas :* le cas où `capture.mjs` produit une vidéo vide mais valide.

**P15. `live-inject` passe par `resolveInRoot`.** `live-core.mjs:117` expose la
fonction, `live-accept.mjs:15` l'utilise, `tests/unit.mjs` la teste dans les deux
sens. `live-inject.mjs:24` construit son chemin avec `join` et s'en passe.
*Test :* une entrée de configuration pointant hors de la racine est refusée, avec
le cas déjà écrit dans `tests/unit.mjs` comme modèle.
*Ne corrige pas :* le `ok: true` inconditionnel de la même ligne, qui est
l'autre moitié de l'entrée 20 et se corrige dans le même commit.

**P6. Confronter les corpus three.js.** Une liste d'identifiants interdits
partagée entre le corpus de génération et celui d'audit, avec un test qui échoue
si un `Code Good` du premier contient un motif que le second classe en défaut.
*Cotation :* dégât 2, l'utilisateur reçoit du code périmé sans qu'un verdict
devienne faux ; probabilité 2, il faut qu'un des deux corpus bouge sans l'autre.
Aucun motif d'audit n'exprime aujourd'hui `outputEncoding` (2.3) : le premier
travail est d'écrire le motif, le test vient après, et le jour couvre les deux.
*Test :* réintroduire `outputEncoding` dans un `Code Good` fait échouer le build.
*Ne corrige pas :* les divergences que ni corpus n'exprime en motif, ni la
question ouverte de 2.3 sur les 32 contrôles hors registre, qui demande une
décision et non un test.

**P18. Le diviseur WebGPU et le comptage de la règle 81.** Sur le rendu WebGPU,
`three.mjs:152` divise par `info.render.frameCalls`, qui compte les appels de rendu
de la trame : remplacer par l'écart de `info.render.frame`, le même champ que P16
installe, d'où la dépendance.
Dans la même passe, dédupliquer le comptage de la règle 81 par identifiant de
texture (il sature à six par un `if` mal placé) et le gater sur la révision, la
propriété `colorSpace` n'existant pas avant r152.
*Test :* une fixture WebGPU à plusieurs passes, avec `frameCalls` réellement peuplé,
la branche n'ayant jamais été exécutée par un test ; et une scène pré-r152 qui
n'émet plus deux constats contradictoires.
*Ne corrige pas :* la sémantique "au repos" de la règle 86 ni la moitié morte de la
règle 84, qui demandent chacune une décision de conception (5.8).

**P7. Générer les comptages.** Un script écrit les nombres dans la prose depuis
les CSV, sur le modèle de `sync-overview.mjs`.
*Cotation :* dégât 1, une prose fausse n'invalide aucun verdict ; probabilité 4,
la dérive est arrivée à chacune des trois dernières versions.
*Test :* le script est idempotent **et** un test compare chaque nombre écrit à la
source qui le produit, faute de quoi un script qui écrit deux fois la mauvaise
valeur passe.
*Ne corrige pas :* les nombres qui ne sont dans aucun CSV, qui sont P8.

**P14. Le contrôle d'intégrité cesse de se taire sur un fichier absent.**
`tests/validate.js:326-330` transforme un fichier absent en avertissement, et
`:1702` fait sortir 0 sur un lot d'avertissements. Le contrôle 6 est donc muet là où
il devrait parler.
Ce point a été dégradé après vérification. Une version antérieure de ce document
concluait qu'un fichier supprimé passe. C'est faux, et je l'ai reproduit : supprimer
`skills/seo/references/geo.md` fait bien sortir `validate.js` avec 1, par quatre
autres contrôles (la référence exigée par une commande, le comptage du README, la
péremption de `reference-index.json`, la détection d'orphelins). Le défaut est réel
et local, la conséquence annoncée ne l'était pas : dégât ramené de 3 à 1, le point
sort du lot de tête et tombe en dernière ligne du plan.
Le détail vaut d'être noté, parce qu'il coupe dans l'autre sens que 2.1 : ce qui
rattrape la suppression, c'est d'abord le comptage écrit à la main dans le README,
celui-là même que 2.1 condamne. Un comptage retapé n'est pas seulement une dette, il
attrape ici ce qu'un garde typé laissait passer.
*Test :* supprimer un fichier de `FILE_INTEGRITY` fait échouer le contrôle 6
lui-même, et non seulement les quatre autres.
*Ne corrige pas :* les autres avertissements de `validate.js`, dont certains sont
légitimement non bloquants.

**P12. Enregistrement générique des sondes.** Hors du classement (6.1). Une boucle
sur les modules de sonde remplace les trois blocs de `tests/inspect-rules.mjs`.
*Test :* les trois contrats existants continuent d'échouer aux mêmes conditions.
*Ne corrige pas :* rien d'observable pour un utilisateur.

### 6.3 Le résidu : ce qui n'est pas planifié

Cinq des trente et un chemins n'ont pas de point de plan : les entrées 12, 19, 22, 23
et 25 de l'annexe. Aucun n'est classé en probabilité élevée ou certaine, deux sont
en moyenne et trois en faible, et aucun ne touche le score ni la porte.

Chiffrage du refus, puisque ce document exige un coût partout ailleurs. Sous le
plancher de 6.1, chacune demande un test non trivial et coûte donc au moins un
jour : cinq jours, soit le plancher du bloc P3 tout entier, pour un dixième de la
probabilité cumulée. C'est le motif du refus, et il est révisable : si P3 et P4
livrent en avance, les cinq sont le meilleur usage suivant d'une journée.

Deux entrées ont quitté ce résidu depuis la première version de ce document, sur
l'argument qu'elles ne relevaient pas de la périphérie. L'entrée 15 touche le
validateur lui-même, c'est-à-dire le garde qui tient toutes les autres
affirmations, et un trou dans ce garde prime sur n'importe quel confort de
structure : elle est devenue P14. L'entrée 20 est adjacente à une question de
frontière de confiance (5.9) et sa correction est un appel de fonction déjà écrite
et testée : elle est devenue P15.

### 6.4 Ce que ce plan va casser, mesuré

Assertion vérifiable plutôt qu'affirmée. Sur les 56 fixtures HTML de
`tests/eval/fixtures/`, analysées comme le serait un site dont le CSS et le JS
sont sur un CDN :

```
fixtures analysées : 56
verdicts PASS qui deviendraient NOT_MEASURED : 279 ( 5,0 par page )
score moyen avant : 83,6   après P3 seul : 83,6
```

**vérifié**, et le second chiffre est le résultat intéressant. **P3 seul fait
basculer 279 verdicts et ne bouge le score d'aucun point**, parce que PASS et
`NOT_MEASURED` déduisent tous deux zéro. Une équipe qui livre P3 puis regarde son
tableau de bord conclura qu'il ne s'est rien passé.

C'est avec P4 que le changement arrive. Sur `clean-pass.html`, la couverture passe
de 25 contrôles mesurés sur 50 à 20 sur 50, soit de 50 % à 40 %. Sous n'importe
quel plancher de couverture raisonnable, l'audit d'un site à ressources externes
cesse de rendre 93 et rend "pas de score". Ce n'est pas une régression, c'est la
première mesure honnête, et elle ressemblera à une régression.

Trois précautions, chiffrées à deux jours en plus du total de 6.1. Livrer P3 et P4
derrière un drapeau pendant une version, en rapportant l'écart entre l'ancien et
le nouveau score sans l'appliquer. Publier dans le changelog la liste des
contrôles qui changent de verdict et pourquoi, en s'appuyant sur les 279 cas
ci-dessus. Et ne pas relever les seuils de la porte dans la même version, sans quoi
il devient impossible de distinguer une régression du site d'un changement de
mesure.

C'est aussi la réponse à la formule "un rouge faux agace" : une porte qui devient
soudain plus sévère sans explication est contournée, et une porte contournée ne
protège plus contre rien, pas même contre les vrais rouges.

---

## 7. Ce qu'il ne faut pas changer

Le CSV comme couche de connaissance éditable. Il rend la connaissance modifiable
sans toucher au code, et c'est la raison pour laquelle quatorze règles ont pu être
ajoutées d'un seul geste (3.1). Son coût est réel et il faut le dire : pas de schéma,
pas de types, et une intégrité référentielle assurée seulement par des gardes
écrits à la main, dont ce document montre en 5.6 qu'ils peuvent affirmer une
couverture qui n'existe pas. Le format reste le bon choix, il ne se garde pas tout
seul.

Le couple registre plus moteur déterministe. C'est ce qui distingue ce plugin des
recueils de conseils : chaque constat porte un identifiant, une sévérité et une
source que le lecteur peut aller lire, pour les 86 règles du registre et 18 des 50
contrôles (2.3).

Les classes typées qui disent **pourquoi** une règle ne s'exécute pas
(`convention`, `judgment`, `build-time`, `tooling`). Un seul seau "non implémenté"
se lirait comme un arriéré et inviterait à le vider avec des règles qui devinent.

Le vocabulaire du refus dans les sondes (`settled`, `advanced`, `refused`,
`candidates`, `installed`). Le plan consiste pour l'essentiel à l'étendre.

Les en-têtes qui racontent le défaut d'origine. C'est la documentation la moins
chère et la plus durable du dépôt.

---

## 8. Limites

Cette évaluation porte sur le dépôt, pas sur la qualité des verdicts rendus à un
utilisateur. Savoir si les 86 règles détectent les bons défauts est une autre
question, à laquelle `tools/eval-corpus/` répond pour treize cas.

Le recensement de la section 5 est exhaustif sur `checks.mjs` et sur
`tools/inspect/`, et exhaustif par motif seulement sur `fetch.mjs` et sur les
scripts de `skills/` (5.0). Sur trente et un chemins, neuf sont reproduits par
exécution, vingt et un établis par lecture et un des deux. Les colonnes dégât et probabilité sont des jugements
argumentés ligne par ligne en annexe, pas des mesures : personne n'a instrumenté
d'exécutions réelles pour les chiffrer.

Deux choses que ce document n'a pas faites et qu'un successeur devrait faire. La
sonde d'un jour sur les 15 sous-agents décrite en 2.3 : vérifier que le format de
sortie que chacun décrit porte un identifiant, une sévérité et une source. C'est le
plus gros angle mort du recensement et je ne l'ai pas écrite. Et la décision, pas la
mesure, sur les 32 contrôles hors registre de 2.3 : ce document constate l'écart et
ne tranche pas s'il faut étendre le registre ou corriger la promesse.

Le chemin d'écriture de `live-inject.mjs` figurait ici dans une version antérieure.
Il en sort : le §5.9 l'a examiné plutôt que signalé, le défaut est à l'entrée 20 et
le correctif est P15.

La troisième, la relecture croisée des sondes de 3.7.0, a été faite (5.8). Elle
change ce que valent les deux paragraphes ci-dessus : le recensement de la section 5
a été construit par une seule personne, et la seule zone où une seconde personne est
passée a rendu six chemins de plus en une lecture. Rien ne dit que les vingt-cinq
premiers aient été énumérés mieux. Le chiffre honnête n'est pas trente et un, c'est
"trente et un trouvés, par une méthode dont on connaît maintenant le taux de
manque sur un échantillon".

---

## Annexe. Les trente et un chemins de vert faux

Dégât : 3 élevé, 2 moyen, 1 mineur. Probabilité : l'échelle de 6.1, quatre
valeurs. "Le dit ?" : ce que le chemin laisse voir de sa propre défaillance, du
silence complet ("non") à l'annonce explicite, en passant par une trace qui existe
sans être lue (un champ du JSON, une ligne de stderr, un point d'interrogation dans
le CLI). Source : **V** reproduit par exécution, **L** établi par lecture, **V/L**
quand l'exécution n'établit qu'une moitié du constat. Statut : le point de plan, ou
"décliné" avec le motif de 6.3.

| # | Emplacement | Défaillance | Le dit ? | Dégât | Prob. | Src | Statut |
|---|---|---|---|---|---|---|---|
| 1 | `fetch.mjs:83-86` | une page 4xx ou 5xx est auditée comme la cible, `status` n'est lu par personne | non | 3 | élevée | V/L | P5 |
| 2 | `checks.mjs:1806-1812` | les contrôles non mesurés notent 100 | stderr | 3 | certaine | V | P4 |
| 3 | `gate.mjs:54-68` | un rapport vide ou étranger passe avec `--min-score 95` | `?` dans le CLI | 3 | moyenne | V | P1 |
| 4 | `ai-access.mjs:121-132` | robots.txt non récupéré donne "tout crawler autorisé", score 100 | non | 3 | certaine | L | P3 |
| 5 | `checks.mjs:1188-1191` | JS non récupéré donne "aucune bibliothèque d'animation détectée" | non | 3 | élevée | V | P3 |
| 6 | `parallax-audit.mjs:115-192` | vitals en échec donnent LCP, CLS et INP à zéro, tous PASS | non | 3 | élevée | L | P11 |
| 7 | `fetch.mjs:534-537` puis `checks.mjs:663, 626` | rendu indisponible, débordement et contraste rendent PASS statique et perdent leur criticité | détail | 3 | certaine | L | P3 |
| 8 | `parallax-audit.mjs:218-220` | aucun calque trouvé donne "calques neutralisés" | non | 3 | élevée | L | P11 |
| 9 | `detect.mjs:129` | `js` jamais transmis, règles 47 et 58 déclarées exécutables et inatteignables | le garde affirme le contraire | 2 | certaine | V | P9 |
| 10 | `checks.mjs:1300` | toutes les sondes média en échec donnent "0,0 Mo de vidéo" | `value` | 2 | élevée | L | P3 |
| 11 | `parallax-audit.mjs:65-72, 215` | aucune image pesée donne "toutes les images sous 200 Ko" | non | 2 | élevée | L | P11 |
| 12 | `eval.mjs:31, 52-55` | référentiel absent ou fixture renommée donnent "aucune dérive", `--strict` sort 0 | non | 2 | moyenne | L | décliné |
| 13 | `score.mjs:144, 349, 406` | dimensions non notables imputées à 70, pliées dans le composite et le code de sortie | JSON | 2 | élevée | L | P4b |
| 14 | `ai-access.mjs:160-168` | le texte du PASS affirme les crawlers de rang 2 joignables alors qu'ils sont bloqués | non | 2 | élevée | L | P3 |
| 15 | `validate.js:326-330` et `:1702` | le contrôle 6 dégrade un fichier absent en avertissement, quatre autres contrôles rattrapent la sortie | avertissement | 1 | moyenne | V | P14 |
| 16 | `gate.mjs:46-47` | un rapport `site-audit` périmé garde la porte verte | non | 3 | élevée | V | P2 |
| 17 | `checks.mjs:1123-1126` | délai DNS sur l'hôte alternatif donne "ne sert pas le site", PASS | non | 2 | moyenne | L | P3 |
| 18 | `capture.mjs:105-118` | le repli rend le webm d'un run précédent | non | 3 | faible | L | P13 |
| 19 | `video-guardplay.mjs:34, 174` | page d'erreur ou SPA donnent "aucun élément video", sortie 0 | non | 2 | moyenne | L | décliné |
| 20 | `live-inject.mjs:31, 35` | `ok: true` après injection dans zéro fichier, et le chemin d'écriture ne passe pas par `resolveInRoot` | `touched` | 2 | moyenne | L | P15 |
| 21 | `rendered-rules.mjs:37-43` | treize règles de sonde non vérifiées, sortie 0 | **oui, explicitement** | 3 | certaine | V | P10 |
| 22 | `eval.mjs:63, 74-77` | zéro assertion donne "eval passed (0.0% accuracy)" | non | 1 | faible | L | décliné |
| 23 | `aggregate.mjs:68-69` | "Checked on N page(s)" compte les pages non jugées | `perPage` | 1 | faible | L | décliné |
| 24 | `three.mjs:134-140` | ratio de pixels avalé sans note, L-WEBGL-2 non contrôlée | `?` dans le CLI | 2 | faible | L | P13 |
| 25 | `detect-csp.mjs:11` | fichier illisible donne `shape: null`, comme "pas de CSP" | non | 1 | faible | L | décliné |
| 26 | `three.mjs:295`, `motion.mjs:379, 400`, `rendered.mjs:392` | `--json` imprime le rapport et sort 0, y compris sur un refus | non | 3 | certaine | V | P17 |
| 27 | `motion.mjs:410-411` | zéro animation échantillonnée donne "la page respecte la préférence" | note contredite par le verdict | 3 | élevée | V | P16 |
| 28 | `three.mjs:149-165` | aucun rendu dans la fenêtre donne zéro appel de dessin et la règle 80 se tait | non | 3 | élevée | L | P16 |
| 29 | `motion.mjs:233, 255` | la troncature à 20 s n'est pas notée, l'immobilité est affirmée hors fenêtre | non | 2 | moyenne | L | P16 |
| 30 | `motion.mjs:191, 255` | `truncated` n'est lu nulle part, verdict propre sur 1500 éléments au plus | non | 2 | faible | L | P16 |
| 31 | `three.mjs:152` | diviseur `frameCalls` sur WebGPU, un dépassement de plafond sort en écart à la cible | non | 2 | moyenne | L | P18 |

Motivation des colonnes. Le dégât vaut 3 quand le chemin fausse un score, une
porte ou une affirmation positive sur une propriété du site ; 2 quand il fausse un
constat isolé sans toucher au score ; 1 quand il n'affecte qu'un outil
périphérique. La probabilité vaut "certaine" quand le chemin est emprunté à chaque
exécution par défaut, soit à chaque appel (entrées 2, 9, 21 et 26), soit dès qu'un
drapeau optionnel n'est pas passé ou qu'aucun rendu n'est disponible (4, 7) ;
"élevée" quand il dépend d'une propriété courante du site audité ou de la page
sondée, ressources sur un CDN, rendu client, révélation au défilement ou scène
rendue à la demande (1, 5, 6, 8, 10, 11, 13, 14, 16, 27, 28),
"moyenne" quand il demande une panne, une erreur d'exploitation ou une
configuration particulière (3, 12, 15, 17, 19, 20, 29, 31), "faible" quand
il demande une conjonction (18, 22, 23, 24, 25, 30).

Vingt-six chemins sont planifiés, cinq déclinés. L'entrée 21 est la seule de la
liste qui annonce sa propre limite, et elle le fait mieux que ne le demande ce
document : *"A skipped test that reports 'passed' is how a suite starts lying"*.
Sa seule faille est le code de sortie, ce qui est P10. La relecture croisée a
d'ailleurs trouvé, dans l'en-tête de ce même fichier, un commentaire annonçant
"the five rules it did not verify" pendant que le code en nommait treize : le défaut
du §2.1 logé dans l'exemplaire de probité. Corrigé en retirant le nombre plutôt
qu'en le mettant à jour, puisqu'un nombre écrit à la main dans un commentaire
redérivera.
