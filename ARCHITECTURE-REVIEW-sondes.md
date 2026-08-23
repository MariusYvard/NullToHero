# Relecture croisée des sondes de 3.7.0

Artefact du §5.8 de `ARCHITECTURE-REVIEW.md`. Ce document existe pour que la phrase
"vingt constats, dont quatre de gravité haute" soit tenue par quelque chose, et pour
que les douze constats non recensés ne soient pas perdus.

Un désaccord de cotation, à ne pas lisser. Le relecteur classe le constat 2 (le
diviseur WebGPU) en gravité haute ; l'annexe de `ARCHITECTURE-REVIEW.md` le cote
dégât 2 à l'entrée 31. La raison de l'écart : le relecteur juge sur la gravité du
symptôme (un dépassement de plafond rendu comme un écart à la cible), l'annexe sur
la classe de défaillance (le chemin rend un nombre faux, pas un verdict positif sur
une mesure absente). Les deux lectures sont défendables et je n'en ai pas fusionné
une moyenne.

Portée remise au relecteur : `tools/inspect/three.mjs`, `tools/inspect/motion.mjs`,
`tools/inspect/capture.mjs`, leurs tests (`tests/rendered-rules.mjs`, `tests/unit.mjs`),
leurs fixtures, leurs lignes de registre (règles 79, 80, 81, 84, 85, 86) et leurs
références. Consigne : la doctrine du dépôt (ne jamais rendre un verdict positif sur
une mesure qui n'a pas eu lieu) et l'ordre de trouver ce qui ne va pas. Le relecteur
n'avait pas écrit ces modules et n'avait pas lu l'évaluation d'architecture.

Colonne "recensé" : l'entrée de l'annexe de `ARCHITECTURE-REVIEW.md` quand le
constat est un chemin de vert faux, "hors" sinon, avec le motif.

| # | Emplacement | Constat | Gravité | Recensé |
|---|---|---|---|---|
| 1 | `three.mjs:149-165` | aucun rendu pendant la fenêtre d'échantillon donne `drawCalls: 0`, aucun constat, aucune note. Une scène qui rend à la demande sort "0 draw calls" et "No named defect found", code 0. Le diviseur juste existe : `info.render.frame` s'incrémente à chaque `render()` et survit à `reset()` | haute | entrée 28 |
| 2 | `three.mjs:152` | sur WebGPU le diviseur est `info.render.frameCalls`, qui compte les appels de rendu de la trame et non les trames. Une chaîne à trois passes divise par trois de trop, et un dépassement du plafond de 1000 sort en écart à la cible de 300 | haute | entrée 31 |
| 3 | `motion.mjs:410-411` | `sampled: 0` est noté correctement puis suivi de "The page honours the preference: nothing advanced", code 0. `rendered.md:105` écrit la règle que cette ligne viole | haute | entrée 27 |
| 4 | `motion.mjs:67-69, 87-88, 94-97` | la moitié three.js de la règle 84 lit `window.__nthThree`, que seul `three.mjs` installe. Aucun chemin livré ne l'installe avant `motion.mjs`, donc `threeFrames` vaut toujours `null` et le constat `setAnimationLoop` est du code mort, présenté comme un second témoin | moyenne | hors, motif de 5.6 (couverture déclarée non atteinte) et non vert faux |
| 5 | `motion.mjs:308-318, 330` | "au repos" est mesuré sur la trame 0, c'est-à-dire au début de l'animation. Faux positif sur une collision permanente décrite comme transitoire, faux négatif sur deux éléments empilés à l'origine | moyenne | hors, faux positifs et faux négatifs, pas un vert faux |
| 6 | `three.mjs:119-121` contre `:198` | sur une scène pré-r152, la règle 81 émet deux constats contradictoires : la révision précède le changement colorimétrique, et les textures ne portent pas `colorSpace`, propriété qui n'existait pas encore | moyenne | hors, rouge faux ; corrigé par P18 |
| 7 | `three.mjs:198-201, 211-214` | `untagged` et `mistagged` sont poussés une fois par visite de maillage et le garde `< 6` est dans la condition de poussée, donc le compte sature à 6. Un matériau partagé par 400 maillages est compté six fois | moyenne | hors, nombre faux ; corrigé par P18 |
| 8 | `capture.mjs:114-118` | si `video.path()` échoue, le repli retient le dernier `.webm` dans l'ordre de `readdirSync`, sans contrôle de date | moyenne | entrée 18, préexistante à la relecture |
| 9 | `three.mjs:295`, `motion.mjs:379, 400` | `--json` sort 0 quel que soit le contenu, y compris sur un refus qui vaut 2 sur la voie texte | haute | entrée 26 |
| 10 | `three.mjs:265` et `skills/audit/references/three.md:39-47` | la recette Claude in Chrome demande d'installer un global puis de recharger la page, ce que la navigation détruit. Le chemin échoue proprement (`installed: false`) mais la voie annoncée pour une page derrière authentification n'a jamais mesuré un coût | moyenne | hors, échec sûr et défaut de documentation |
| 11 | `tests/unit.mjs:394-397`, `tests/rendered-rules.mjs:215-217` | les deux fixtures de refus portent une matrice vide, donc la forme du refus est testée et son effet ne l'est pas. Mutation appliquée : garder `refused: true` en émettant des constats laisse la suite verte | moyenne | hors, défaut de test ; couvert par le test de mutation exigé en P16 |
| 12 | `tests/rendered-rules.mjs:130-133` | la section three.js n'assère pas que la mesure a eu lieu, à la différence de la section reduced-motion qui vérifie `good.sampled > 0`. Aucune fixture ne couvre le constat 1 | moyenne | hors, défaut de test |
| 13 | `tools/inspect/fixtures/three/*.html` | les fixtures émettent elles-mêmes l'événement `observe` et fournissent un `info` écrit à la main, donc le contrat sous test ne peut pas être falsifié et la branche WebGPU n'a jamais été exécutée. Le protocole réel a été vérifié contre three r185 et il est correct | moyenne | hors, défaut de fixture |
| 14 | `motion.mjs:233, 255, 295` | le plafond de 20 s est silencieux : une animation déclarée à 40 s reçoit "rien ne bouge entre 2609 ms et 20000 ms d'une séquence de 20000 ms" | basse | entrée 29 |
| 15 | `motion.mjs:191, 255` | `truncated`, levé au-delà de 1500 éléments, n'est lu ni par `evaluateSweep` ni par le CLI | basse | entrée 30 |
| 16 | `motion.mjs:249` | le balayage rejoue `play()` sur toutes les animations qu'il a mises en pause, y compris celles déjà finies, et ne restaure pas `currentTime`. Sans conséquence dans une page Playwright jetable, visible dans l'onglet réel du chemin Chrome | basse | hors, mutation de la page et non verdict |
| 17 | `three.mjs:140`, `motion.mjs:77-78` | deux `catch` silencieux : le ratio de pixels avalé sans note (le bloc suivant en pousse une, donc l'incohérence est interne), et une animation détachée pendant l'échantillon retirée du compte sans note | basse | entrée 24 pour le premier, préexistante |
| 18 | `motion.mjs:245` | oublier `--install` dans le chemin Chrome produit `TypeError: window.__nthSample is not a function` et non un refus | basse | hors, échec bruyant |
| 19 | `capture.mjs:127` | la commande de suivi imprimée passe un chemin nu à `motion.mjs`, qui fait `goto(target)` sans `file://` et lève | basse | hors, défaut d'ergonomie |
| 20 | divers | `three.mjs:261` un `--wait` en fin d'arguments donne `waitForTimeout(NaN)` ; `three.mjs:68-70` `store.revisions` est collecté et jamais lu ; `three.mjs:179` `r.__nthScene` n'est jamais posé ; `three.mjs:216` le total de maillages est écrit sur le premier renderer et perdu s'il n'y en a aucun ; `motion.mjs:293` le seuil d'immobilité vaut 91 % de la durée à 1 s et 9 % à 20 s ; `motion.mjs:335` `findings.slice(0, 6)` tronque sans note | basse | hors |

## Jugé propre, explicitement

Le protocole three.js vérifié contre three r185 : le dialogue `__THREE_DEVTOOLS__`,
l'attribut `data-engine`, `window.__THREE__`, la sémantique de `autoReset`, `memory`
qui compte des objets, et le fait que `render.calls` soit cumulatif sur WebGPU. Le
garde d'auto-invalidation de `motion.mjs:45-50`, correct et réellement testé.
L'hypothèse de synchronicité de `sampleFrame` après un positionnement, y compris sur
des animations de `transform` compositées. L'absence de course rAF dans le balayage,
la boucle de 24 échantillons étant une seule tâche synchrone. Le cycle de vie vidéo
de `capture.mjs`. Et la pureté réelle, non nominale, d'`evaluateSweep`.

## Ce que la relecture a reproduit et ce qu'elle a lu

Reproduits par exécution par le relecteur : les constats 1, 2, 3, 5, 6, 7, 8, 9, 10,
11, 14, 16, 18, 19. Établis par lecture : 4 (vérifié par `grep` sur les appelants),
12, 13, 15, 17, 20.

Reproduits ensuite indépendamment dans l'environnement de l'auteur : les constats 3
et 9, dont les transcripts figurent au §5.8. Le constat 1 n'a pas pu l'être, faute
d'une build locale de three.js, ce qui lui vaut la source **L** à l'entrée 28.

## Ce que la relecture dit de la méthode

Trois des constats hauts ont une cause commune que l'auteur ne pouvait pas voir.
Chaque fixture three.js écrite par l'auteur fait tourner une boucle rAF, parce que
c'est ce qui rend `autoReset` pertinent : le défaut est l'absence de ce que la
fixture fournit toujours. La branche WebGPU est celle sur laquelle l'auteur a écrit
le plus long paragraphe d'en-tête et elle n'a jamais été exécutée. Et le trou de
suppression du refus ne se voit qu'en mutant le code, pas en le relisant, parce que
les deux fixtures de refus portent une matrice vide.
