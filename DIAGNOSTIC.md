# Diagnostic : pourquoi le jeu bugue et rame depuis la maison du coq

Chantier « diagnostic », 11 novembre 2026, branche `diagnostic` partie de main 1e3e36c. Ce chantier **mesure et explique** ; il ne change rien au jeu. Les chiffres viennent de `npm run diagnostic` (`tools/diagnostic.ts`), qui pilote le vrai Google Chrome, fenêtre visible, sur le GPU de la machine (Apple M3, ANGLE Metal), à x1, sur une partie neuve (`?dieu&reset`). Les rapports bruts sont dans `docs/diagnostic/*.json`, les captures dans `docs/diagnostic/*.png`.

Trois versions comparées :

| nom | commit | ce qu'elle contient |
|---|---|---|
| **avant** | b9cc596 | main d'avant le coq demandé (le relief, les hauteurs) |
| **milieu** | 467aa68 | avant + le pas de jeu fixe (sangliers-charge), sans le coq : pour séparer les deux changements fusionnés entre-temps |
| **après** | 1e3e36c | main actuel, avec la maison du coq et le moteur de l'étage |

Chaque version a été mesurée en dev (`vite`, comme Grégoire joue), et « avant » et « après » aussi en build (`vite build` + `vite preview`).

> **Corrections faites** (chantier « corrections », branche `corrections`) : les étapes 1 à 3 de l'ordre recommandé, avec leurs mesures comparées, sont en **section 5**. Les sections 1 à 4 sont le diagnostic d'origine.

---

## L'essentiel en dix lignes

1. **Toutes les lenteurs graves ont une seule cause** : les ombres de joint (`drawJointShades`, chantier « hauteurs ») lisent chaque pixel des images une à une par `textures.getPixelAlpha` de Phaser, qui fait un `getImageData` d'un pixel sur un canevas à chaque appel. La maison du coq a 469 paires de pièces de bois posées l'une sur l'autre : **12,7 s sur 12,9 s** du chargement de la ferme du riche passent dans `getImageData` (profil CPU de Chrome).
2. Elle est appelée par `GameMap.sortBuilds`, qui refait tout après chaque pose, retrait ou porte ouverte. D'où, sur la ferme du riche : **13 s** pour y arriver (aussi la 2e fois), **13 s** pour ouvrir la porte en arc, **13 s** pour ressortir de la maison, **13 s** pour revenir du village par le bord. Avant le coq : 77 ms, rien, rien, 521 ms.
3. **Les écrans noirs** sont ces 13 s vues depuis un fondu : `fadeTo` passe au noir, puis la scène se recrée et bloque 13 s. Aucune perte du contexte WebGL n'a été vue en cinq passes (zéro événement `webglcontextlost`).
4. La ferme de Xéros coûte déjà 1 s pour la même raison, **depuis avant le coq** (le défaut est né avec les ombres de joint ; la maison du coq l'a multiplié par 13).
5. Hors de ces gels, le jeu tient 60 images/s sur le M3 partout. Seul l'étage descend (p95 de 33 ms, 500 appels de dessin par image au lieu de 163 en bas) : chaque pièce du rez-de-chaussée vue par la trémie a son propre masque.
6. Pas de spirale du pas de jeu : 1 à 1,2 pas par image, un pas coûte 0,6 à 2,5 ms ; les 12 pas d'une image n'arrivent qu'après un gel, puis le retard est abandonné comme prévu.
7. La maison du coq ajoute **7 000 objets** à la scène (10 649 contre 3 597) : 6 508 sont des « tranches » de 2 px des pièces nord-sud (`sideSlices`). Le dessin passe de 1,6 à 3,6 ms par image, et de 6 à 166 appels de dessin.
8. La mémoire des textures ne redescend jamais : 2 301 textures (35 Mo) au démarrage, 3 837 (113 Mo) après le tour des 20 zones. Seule la zone où est Xéros est simulée ; les autres sont figées, avec un rattrapage des garennes au retour.
9. Les quatre défauts d'affichage ont chacun une cause précise, trouvée et vérifiée en jeu (section 2).
10. L'ordre recommandé (section 3) commence par une correction d'une demi-journée qui supprime les gels de 13 s, avant tout chantier de fond.

---

## 1. Les mesures

### 1.1 Les chargements (une scène qui se recrée : changer de zone, entrer, sortir)

Temps jusqu'au monde prêt (ms) ; entre parenthèses, la durée du `create` de la scène.

| zone | avant 1re fois | avant 2e | milieu 1re | milieu 2e | **après 1re** | **après 2e** |
|---|---|---|---|---|---|---|
| ferme-du-riche (le coq) | 158 (22) | 132 (14) | 153 (15) | 145 (11) | **13 384 (13 229)** | **13 103 (12 963)** |
| ferme (Xéros) | 2 205 (2 073) | 1 163 (1 049) | 2 227 (2 080) | 1 192 (1 048) | 2 243 (2 098) | 1 179 (1 034) |
| foret-profonde-nord | 1 111 (867) | 150 (31) | 1 094 (861) | 181 (44) | 1 070 (853) | 174 (35) |
| foret-des-ronces | 747 (626) | 172 (32) | 759 (621) | 168 (29) | 761 (624) | 176 (36) |
| bois-du-nord | 765 (624) | 155 (30) | 765 (628) | 175 (32) | 769 (633) | 172 (33) |
| les 15 autres | 119 à 619 | 120 à 185 | 135 à 633 | 139 à 184 | 140 à 658 | 139 à 175 |

Le tableau complet des 20 zones est en annexe A.

- **La ferme du riche est la seule zone touchée par le coq**, et elle ne s'améliore pas au retour : rien n'y est gardé, tout se recalcule.
- Les forêts coûtent 0,5 à 1 s la première fois (le terrain peint par le jeu, `world/terrainView.ts` : 20 à 280 canevas), puis 150 ms : leurs textures sont gardées.
- La ferme de Xéros coûte 1 s **à chaque fois**, avant comme après le coq : même cause que la ferme du riche (les ombres de joint de sa maison), à plus petite échelle.

Les gestes qui recréent la scène, sur la version après :

| geste | temps (ms) | create (ms) | ce qui coûte (profil) |
|---|---|---|---|
| entrer dans la maison du coq | 1 122 | 753 | l'intérieur calculé : 215 textures de mur fabriquées (193 canevas, 1,1 Mo) |
| ressortir sur la ferme du riche | **13 422** | 12 963 | `sortBuilds` → `drawJointShades` |
| passer le bord vers le village | 937 | 45 | — (la maison est dessinée dans la bande, sans ombres) |
| revenir du village par le bord | **13 449** | 12 907 | `drawJointShades` |
| avant le coq : revenir du village | 521 | 14 | — |

Profil CPU d'un chargement de la ferme du riche (après, dev), en temps cumulé :

| fonction | ms |
|---|---|
| `create` de WorldScene | 12 838 |
| `new GameMap` | 12 831 |
| `GameMap.sortBuilds` (GameMap.ts:885) | 12 826 |
| `GameMap.drawJointShades` (GameMap.ts:925) | 12 756 |
| `shadePixels` (world/jointShade.ts:37) | 12 734 |
| `opaque` → `textures.getPixelAlpha` (GameMap.ts:940) | 12 715 |
| dont `getImageData` (natif) | 12 480 (94 % du temps de la période) |

### 1.2 Le démarrage (dev contre build)

| | avant dev | après dev | avant build | après build |
|---|---|---|---|---|
| monde prêt (ms) | 3 142 | 3 798 | 1 799 | 1 928 |
| requêtes | 250 | 250 | 137 | 144 |
| scripts (Ko) | 35 678 | 36 354 | 1 636 | 1 743 |
| textures au démarrage | 1 999 (33 Mo) | 2 301 (35 Mo) | 1 999 | 2 301 |

En dev, Phaser (19,9 Mo non minifié) et `src/generated/maps.ts` (7,8 Mo : **les 20 zones, toujours toutes chargées**) font l'essentiel. Le build démarre deux fois plus vite, mais **les 13 s de la ferme du riche y sont identiques** (12 998 ms) : le mode dev n'est pas en cause.

### 1.3 Les images par seconde et le temps d'une image

Moyennes sur 4 à 6 s, à x1. L'écran du M3 donne 60 images/s ; une image dure donc 16,7 ms quand tout va bien. Colonnes « pas » : le temps CPU du pas de jeu (physique, systèmes du monde, HUD) ; « dessin » : le rendu WebGL côté CPU.

| situation | version | img/s | image p50 / p95 / max (ms) | pas/image | pas (ms) | dessin (ms) | appels de dessin | objets (dans la vue) |
|---|---|---|---|---|---|---|---|---|
| dehors loin du coq (ferme), immobile | avant | 58,8 | 16,7 / 17,5 / 133 | 1 | 2,0 | 2,7 | 46 | 9 060 (851) |
| | après | 59,4 | 16,7 / 17,5 / 84 | 1 | 2,4 | 2,8 | 46 | 9 084 (852) |
| devant le coq, immobile | avant | 58,5 | 16,7 / 17,6 / 166 | 1 | 0,3 | 1,6 | 6 | 3 597 (73) |
| | **après** | 59,8 | 16,7 / 17,5 / 50 | 1 | 0,6 | **3,6** | **166** | **10 649 (5 985)** |
| devant le coq, en marchant | après | 59,8 | 16,7 / 17,4 / 50 | 1 | 0,6 | 3,6 | 166 | 10 649 |
| **ouvrir la porte en arc (E)** | après | **1,8** | 16,7 / 49 / **12 933** | 1,5 (12 max) | 350 | 4,0 | 166 | 10 679 |
| dedans en bas, immobile | après | 59,8 | 16,6 / 17,5 / 50 | 1 | 1,4 | 1,8 | 163 | 4 536 |
| dedans en bas, en marchant | après | 59,3 | 16,6 / 17,4 / 83 | 1 | 1,4 | 1,8 | 163 | 4 536 |
| monter l'escalier | après | 55,5 | 16,7 / **33,2** / 51 | 1,1 | 1,6 | 2,4 | 431 | 4 535 |
| **dedans en haut, immobile** | après | 56,9 | 16,7 / **33,4** / 83 | 1,1 | 1,6 | 2,6 | **500** | 4 535 |
| ouvrir une porte du palier (E) | après | 43,9 | 16,7 / 33 / **584** | 1,2 | 6,1 | 2,6 | 500 | 4 509 |
| dedans en haut, en marchant | après | 52,7 | 16,7 / 33,4 / 67 | 1,1 | 1,9 | 2,7 | 491 | 4 509 |
| descendre l'escalier | après | 59,7 | 16,7 / 17,5 / 67 | 1 | 1,5 | 1,9 | 215 | 4 510 |

Le build donne les mêmes valeurs à 0,1 ms près (annexe B).

Ce qu'on en tire :

- **En régime calme, le M3 a de la marge** : le CPU est occupé environ un tiers du temps (profil : 3,4 à 3,7 s d'inactivité sur 5 s), dehors comme dedans. Ce qui « rame », ce sont les **gels** : 13 s à chaque porte, entrée, sortie ou retour sur la ferme du riche, et 0,6 s à chaque porte du palier (même cause : `drawJointShades`, 521 ms sur 574).
- **À l'étage**, une image sur vingt prend 33 ms alors que le CPU n'en use que 4 à 5 : le GPU attend. Les pièces du rez-de-chaussée vues par la trémie ont chacune leur `GeometryMask` (`systems/storeys.ts:122`), donc un passage au stencil par pièce : 500 appels de dessin au lieu de 163. Sur une machine moins forte que le M3, c'est là que l'étage ramera en continu.
- **Devant le coq**, le dessin coûte 3,6 ms au lieu de 1,6 et fait 166 appels au lieu de 6 : les 7 000 objets de plus, presque tous dans la vue.
- La physique d'Arcade ne paraît pas dans les profils (moins de 1 % ; elle n'est pas isolable par l'outil, Arcade s'abonnant à la scène avant lui). 675 corps statiques, une seule collision dynamique (Xéros).
- Ce qui coûte à chaque pas, en régime calme : `systems/lift.ts` (la projection du relief, qui parcourt tous les objets affichés à chaque pas : 0,9 à 1,6 ms), `Roofs.builds` (0,2 à 0,4 ms : `roofView` sur toutes les pièces posées), le rendu de Phaser (`batchSprite`, environ 3 ms pour 9 000 à 10 000 images, toutes envoyées au GPU : la caméra de Phaser n'écarte pas les images hors de la vue, `renderList` = 9 044 dehors pour 852 dans la vue).

### 1.4 Le pas de jeu : pas de spirale

- 1,0 pas par image partout en régime calme (1,1 à 1,2 à l'étage, où une image sur vingt dure deux périodes d'écran).
- Coût d'un pas : 0,3 ms (avant, devant le coq), 0,6 ms (après, devant), 1,4 à 1,9 ms dedans, 2 à 2,5 ms à la ferme (le relief : `lift`, `laneFade`).
- Le maximum de 12 pas dans une image n'apparaît qu'**après** un gel : `TimeStep` en fait au plus `STEP.maxPerImage` (12), puis abandonne le retard (`world/timeStep.ts`). Un pas ne devient jamais assez cher pour en faire faire plusieurs : il faudrait 16 ms par pas, on en est à 2,5 au pire.

### 1.5 La mémoire et les textures

| | avant (dev) | après (dev) |
|---|---|---|
| textures au démarrage | 1 999 (33 Mo) | 2 301 (35 Mo) |
| textures après les 20 zones et la maison | 2 931 (108 Mo) | **3 837 (113 Mo)** |
| dont canevas fabriqués par le jeu | 998 (76 Mo) | 1 602 (79 Mo) |
| tas JavaScript après le parcours (après un GC) | 81 Mo | 92 Mo (41 Mo en build) |
| pertes du contexte WebGL | 0 | **0** |

- **Ce qui fabrique des textures** : le terrain peint des zones à relief (`terrainView.ts:432`, une texture par morceau et par bande : 278 textures et 13 Mo pour la forêt profonde nord, 254 et 16 Mo pour la ferme), les tronçons de mur (`wallTexture.ts:38`) et le bois (`woodTexture.ts:46`, 88). L'intérieur du coq en fabrique 215 (1,1 Mo) à l'entrée. La maison du coq vue de dehors : 382 canevas, 1,7 Mo seulement (ses pans sont petits).
- **Rien n'est jamais libéré** : le terrain est gardé dans le registre (`terrainView.ts:208`), les murs et le bois par `textures.exists(key)`. Toutes les zones visitées restent en mémoire GPU. 113 Mo ne posent pas de problème au M3 ; sur une machine à mémoire graphique partagée plus petite, c'est la piste d'une vraie perte de contexte plus tard.
- Toutes les données des 20 zones sont dans le bundle et en mémoire dès le démarrage (`src/generated/maps.ts`, 1,4 Mo de source, 7,8 Mo servis par Vite en dev).

### 1.6 Ce que le jeu gère et dessine à chaque image

Devant la maison du coq (après) : **10 649 objets** dans la scène, contre 3 597 avant. Leur répartition (compte dans la page) :

| sorte | nombre |
|---|---|
| tranches de 2 px des pièces nord-sud (`sideSlices`, `GameMap.ts:216` : `SLICE = 2`) | **6 508** |
| images des pièces posées (`builds`) | 497 |
| ombres de joint (un `Graphics` par paire, rempli pixel par pixel) | 409 |
| zones de collision des pièces posées | 350 |
| le reste de la carte (sol, objets de Tiled, bande des voisines) | 2 885 |

Les tranches viennent surtout des murs de pierre de taille nord-sud (`ashlar-wall` 2 049, `ashlar-wall-40` 1 743) et des rondins (1 663) : un mur de 121 px de haut devient environ 60 images, pour que Xéros passe devant ou derrière chaque bande de 2 px.

### 1.7 Ce qui est recalculé à chaque action

| action | ce qui est refait | coût mesuré |
|---|---|---|
| ouvrir, fermer une porte ou un volet (`WorldScene.swing`, WorldScene.ts:1077) | `removeBuild` + `placeBuild` + **`sortBuilds` de toute la carte** : les tronçons de mur, les assemblages, le décalage de chaque pièce (`offsetOf`), les bâtiments (`buildingsOf`), les profondeurs (`depthsOf`), toutes les tranches, **toutes les ombres de joint**, les demi-bois ; puis l'intérieur (`refresh`) et la sauvegarde | 12,9 s dehors (ferme du riche), 0,57 s dans la maison (ses seules pièces) |
| poser, retirer en mode construction (`systems/build.ts:418-565`) | le même `sortBuilds` complet | idem |
| entrer dans un bâtiment | la scène entière recréée, l'intérieur recalculé de ses pièces (`resolveInterior`), ses murs redessinés | 1,1 s (coq) |
| sortir, changer de zone | la scène entière recréée, `sortBuilds` compris | 13 s pour la ferme du riche |
| chaque pas, dedans | `Storeys.update` (léger, `apply` seulement quand `buildsVersion` change) mais `Roofs.builds` remet l'opacité de toutes les pièces (voir défaut 2.1) | 0,2 à 0,4 ms |
| chaque pas, partout | `LiftPass.update` sur tous les objets affichés | 0,9 à 1,6 ms |

### 1.8 Ce qui est chargé et simulé selon l'endroit

- **Simulé** : seulement la carte où est Xéros. `CreatureSystem` ne prend que les garennes de la carte courante (`systems/creatures.ts:97`, `def.warrens`). Quand Xéros est en ville, les sangliers et les lapins des autres zones ne tournent pas.
- **Au retour** : `settle` (`world/warren.ts:84`) rattrape grossièrement le temps passé pour une garenne (les naissances, les guérisons). C'est déjà, en petit, la « simulation grossière » proposée plus bas, sauf que rien d'autre ne se rattrape.
- **Dessiné** : la zone courante et une bande de ses voisines (`world/zoneBand.ts` : leur sol, leurs objets, leurs pièces posées, sans ombres de joint ni collision).
- **En mémoire** : les données de toutes les zones (le bundle) et les textures de toutes les zones déjà vues (1.5).

---

## 2. Les quatre défauts d'affichage : les causes

Les quatre causes ont été trouvées dans le code, puis vérifiées en jeu (captures dans `docs/diagnostic/`, valeurs lues dans la page). Aucune n'est corrigée ici.

### 2.1 Dedans, au rez-de-chaussée, on voit l'étage (certain)

Capture : `docs/diagnostic/1b-dedans-1500ms-apres.png` (les planches du plancher, les lits, le coffre et le lit à courtines par-dessus la salle).

- **Le classement par niveau est juste.** `storeys` de `world/interior.ts` donne deux niveaux (z 0 et 283), et les meubles de l'étage n'appartiennent pas au niveau 0. `Storeys.apply` met bien leur opacité à 0 (`systems/storeys.ts:120`).
- **`Roofs.builds` la remet à 1 à chaque pas.** WorldScene appelle `this.roofs.update(…, this.mode !== 'build' && !this.interior, …)` (WorldScene.ts:536), **après** `this.storeys?.update` (ligne 522).
  - Dans un intérieur, `on` est faux, donc `faded` est vide (`roofs.ts:81`).
  - La cible de chaque pièce posée devient donc 1, et `b.image.setAlpha(toward(a, target))` (`roofs.ts:90`) la ramène vers 1 en `ROOF.fadeMs` (250 ms).
  - `Storeys.apply` ne repasse que quand `buildsVersion` change : il perd toujours.
- **Mesure en jeu** : juste après l'entrée, 149 pièces de l'étage sur 149 ont une opacité > 0,5, alors que `storeys.shown` vaut `[1, 0]`. Seul le masque de la trémie et la teinte restent justes.
- Le même mécanisme rend le rez-de-chaussée visible tout entier quand on est en haut, au lieu de la seule trémie (`2a-etage.png` : la table et le coffre d'en bas sous le plancher).
- Aussi : les ombres de joint (des `Graphics` hors de `PlacedBuild`) ne passent jamais par `Storeys.apply` ; celles des planches sur les solives restent visibles à tout niveau.
- **Piste** : dans un intérieur, `Roofs` ne touche pas l'opacité des pièces posées (ou `Storeys` a le dernier mot à chaque pas). Coût : quelques lignes, plus un test d'opacité dans `test-etage`.

### 2.2 Les jours entre les planches du plancher (certain)

Capture : `docs/diagnostic/2a-etage.png` (des lignes claires régulières dans le plancher).

L'hypothèse de Grégoire est presque la bonne : ce n'est pas le contour, c'est **l'ombre au sol de chaque planche**.

- **Le pas de pose est juste.** L'emprise d'une planche est `across + CONTOUR_CM` = 25 + 10 = 35 cm (`world/woodPiece.ts:50`). Les 67 planches du plan sont posées tous les 35 cm, soit 7 px, exactement la hauteur de leur image (`frameH: 7`, lu en jeu).
- **Ce que contient l'image d'une planche** (texture `wood:big:plank:ew:460::::::worn` fabriquée par `world/woodTexture.ts`, 7 rangées, lue en jeu au milieu de la planche) :

  | rangée | contenu |
  |---|---|
  | 0 | contour sombre |
  | 1 à 4 | face |
  | 5 | arête sombre |
  | 6 | **ombre au sol, opacité 25 %** |

- Rien ne recouvre cette dernière rangée : la planche suivante commence juste dessous, sans chevauchement. Toutes les 7 px, une rangée translucide laisse donc voir ce qui est dessous : le vide de l'intérieur, ou le rez-de-chaussée à cause du défaut 2.1.
- Ce n'est ni `lift` ni un arrondi : toutes les planches sont à z 280, et `LiftPass` donne 0 dans un intérieur.
- **Piste** : pas d'ombre au sol pour une pièce qui ne pose pas au sol (une planche sur des solives), ou une planche dessinée sans rangée d'ombre quand elle est jointive. C'est une affaire de dessin (pixel-artist) et de `woodShape`. Coût : petit.

### 2.3 Les pièces loin de leur place (certain)

Captures : `3a-ouest-de-la-maison.png` (les barres blanches verticales à l'ouest), `3b-pignon-cheminee-dans-le-champ.png`.

**Le décalage d'affichage d'un mur nord-sud de pierre de taille double à chaque assise.**

- `GameMap.offsetOf` (`GameMap.ts:989`) ajoute, quand le support est un mur nord-sud : `placed.image.x − round(centre / 5 − largeur / 2)`.
- Mais `sortBuilds` a déjà déplacé l'image de ce support de son propre décalage (`GameMap.ts:901`, par z croissant) : `placed.image.x` contient déjà `base.dx`, qui s'ajoute une deuxième fois. D'où `dx(k) = 2 × dx(k−1) + e`.
- **D'où vient le premier écart `e`** : le cordon nord-sud (`string-course-wall`, z 270) est un tronçon de 11 px calé au ras de l'angle (`align` west/east, `world/wallRuns.ts:118-137`). Son x nominal centré tombe sur un demi-pixel, d'où un écart d'1 px.
- **Lu en jeu** (`map.shownOffset`), pour les murs ouest (x 13 120) et est (x 14 700) :

  | z (cm) | 350 | 380 | 410 | 440 | 470 | 500 | 530 (pignon) | 890 à 1 090 (souche, chapeau) |
  |---|---|---|---|---|---|---|---|---|
  | décalage (px) | ∓4 | ∓8 | ∓16 | ∓32 | ∓64 | ∓128 | ∓256 | −256 |

- Ce que voit le joueur :
  - **les barres blanches alignées** : les assises 290 à 500 des murs ouest et est, chacune à 1, 2, 4… 128 px de sa place ;
  - **la colonne couchée dans le champ** : le pignon `ashlar-gable` vu de côté, à 256 px (12,8 m) ;
  - **la souche de cheminée** : `chimney-flue` et `chimney-cap` côté ouest, à 256 px.

  Dedans, les mêmes pièces fixes ont le même calcul, d'où les barres de chaque côté.
- L'aperçu `.art-preview/maison-coq.png` montre déjà ce défaut.
- **Piste** : dans `offsetOf`, mesurer l'écart de calage du support sur sa position calculée, sans son propre décalage (soustraire `base.dx`). Coût : une ligne, plus un test de non-dérive dans `test-murs-coq` ou `test-etage-moteur`.

### 2.4 Le poteau fin sous la porte en arc (certain)

Captures : `4a-porte-fermee.png` (pas de poteau), `4b-porte-ouverte.png` (le poteau à gauche de la baie).

- **Le poteau, c'est la porte elle-même, ouverte et vue de chant** : `oak-arch-door-open`, vue 1, image `oak-arch-door-r1-worn` de 3 × 61 px (lu en jeu).
- `swung` (`world/build.ts:513`) la fait pivoter d'un quart **vers le dehors** autour de son gond. Ouverte, elle dépasse la façade de 78 cm vers le sud : son bord sud est plus au sud que celui du mur, elle se dessine donc devant lui et descend 16 px sous le pied de la façade.
- Le poteau n'apparaît qu'une fois la porte ouverte, et en jeu elle l'est dès qu'on est passé.
- **Piste, une décision de Grégoire** : une porte d'entrée en embrasure s'ouvre vers le dedans (le `swing` de la porte, ou le sens donné par le plan) ; ou bien la porte ouverte se dessine rabattue contre l'embrasure (pixel-artist). Coût : petit.

---

## 3. Les propositions (sans code)

### 3.0 D'abord, la correction qui supprime les gels (demi-journée)

**Les ombres de joint sans `getPixelAlpha`.**

- **Le défaut** : `opaque(x, y)` (GameMap.ts:940) lit un pixel par un `getImageData` d'un pixel, environ 28 000 fois pour la maison du coq.
- **Trois manières, de la plus simple à la plus propre** :
  - lire chaque texture une seule fois (un `getImageData` de toute l'image, gardé par clé de texture) ;
  - ou tirer l'opacité de la forme déjà calculée par `woodShape` (le dessin est fait par le jeu, sa silhouette est connue) ;
  - en plus, garder les pixels d'ombre d'une paire tant que ses deux pièces n'ont pas bougé.
- **Gain attendu** : la ferme du riche de 13 s à environ 0,1 à 0,3 s (sa part hors ombres : 70 ms) ; la porte en arc de 13 s à moins de 0,2 s ; la sortie de la maison et le retour par le bord de 13 s à moins de 0,5 s ; la porte du palier de 0,6 s à environ 50 ms ; **la ferme de Xéros de 1 s à environ 0,05 s**. Les écrans noirs disparaissent avec.
- **Risque** : nul pour le dessin (même résultat, pixel pour pixel) ; à vérifier par `npm run diagnostic` et `test:maison-coq`.

### 3.1 Les quatre défauts d'affichage (une journée en tout)

Dans l'ordre de la section 2 :
- `Roofs` ne touche pas l'opacité dans un intérieur ;
- l'ombre au sol des planches jointives (dessin, pixel-artist) ;
- `offsetOf` sans double compte ;
- le sens d'ouverture de la porte en arc (décision de Grégoire).

Chacun avec son test. Ils ne dépendent pas du reste.

### 3.2 Ne refaire que ce qui change (1 à 2 jours)

`sortBuilds` refait toute la carte pour une porte qui tourne.

- **Ce qui suffit pour une porte, un volet** : retirer et replacer la pièce, recalculer sa profondeur, ses tranches et les bâtiments (une porte change le passage) ; pas les murs, pas les assemblages, pas les ombres des autres pièces.
- **Pour une pose en mode construction** : seulement les pièces dont la boîte touche celle de la pièce posée (les tronçons de mur voisins, ses supports, ce qu'elle porte).
- **Pour l'intérieur** : `InteriorMap` gardé par bâtiment et par version de ses pièces (une empreinte de `builds`). Une deuxième entrée ne recalcule rien, et ses 215 textures de mur sont déjà là (aujourd'hui elles le sont aussi, mais le calcul de l'intérieur est refait).
- **Gain** : une action dans un bâtiment de 500 pièces passe de dizaines de ms (après 3.0) à quelques ms.

### 3.3 « Un bâtiment fini devient un seul objet » (décision de Grégoire ; 4 à 6 jours)

**Ce que c'est :**
- la coque (murs, toit, plancher, escalier, et tout ce qui ne bouge pas) est cuite en images ;
- ce qui vit reste à part : portes, volets, meubles qu'on utilise (le lit où l'on dort, le pétrin), objets posés, feu ;
- les pièces restent dans les données : la matière se conserve, la sauvegarde ne change pas.

**Comment, concrètement :**
- **Pas une image par niveau, mais une image par niveau et par bande de profondeur.**
  - Xéros doit pouvoir passer devant ou derrière un mur. Une seule image par niveau serait toujours devant ou toujours derrière lui.
  - La coque d'un niveau se cuit en bandes horizontales (par exemple une bande par 16 px de profondeur, en suivant les profondeurs déjà calculées par `depthsOf`) : chaque bande est une `RenderTexture`, posée à la profondeur de son bord sud.
  - Pour la maison du coq : environ 25 bandes par niveau, au lieu de 497 images et 6 508 tranches.
  - Les tranches de 2 px disparaissent : la bande fait leur travail.
- **Les toits à part** : chaque pan de toit cuit dans sa propre image, pour garder le fondu sous un abri et la découpe d'une fenêtre (`roofView`, `windowFade`).
- **Les niveaux deviennent triviaux** : on montre les bandes du niveau courant, on cache les autres. La trémie devient un seul masque sur une seule image par bande (de 500 appels de dessin à environ 60 à l'étage), et le défaut 2.1 ne peut plus revenir.
- **Les ombres de joint et les demi-bois sont cuits dedans** : plus de 409 `Graphics`.
- **La collision** : les zones des pièces fusionnées en rectangles (les mêmes tranches de hauteur, `sliceOf`), une dizaine par niveau au lieu de 350 zones.
- **Quand la cuire, et la recuire** :
  - à l'arrivée sur la carte (après 3.0, quelques dizaines de ms), puis seulement quand une pièce de la coque est retirée ou ajoutée ;
  - une porte qui tourne ne la recuit pas (elle vit à part) ;
  - la cuisson peut s'étaler sur plusieurs images (une bande par image) et se garder par empreinte des pièces : une deuxième visite ne cuit rien.

**Ce que ça change :**
- **Mode construction** : entrer dans le mode construction (ou viser un bâtiment) le « décuit » ; ses pièces redeviennent des images à part, comme aujourd'hui, pour poser, retirer, viser. En sortant, il se recuit. L'aimant, la visée, les plans ne changent pas : ils travaillent sur les données.
- **Sauvegarde** : rien. La cuisson est un cache d'affichage, jamais sauvegardé ; `builds` reste la vérité, et `SAVE_VERSION` ne bouge pas.
- **Gain attendu** :
  - devant le coq, 10 649 objets deviennent environ 3 700, 166 appels de dessin environ 20, et le dessin passe de 3,6 à environ 1,6 ms (le niveau d'avant le coq) ;
  - à l'étage, la p95 de 33 ms revient à 17 ms ;
  - chaque nouveau bâtiment ne coûtera plus que quelques images.
- **Risque** : l'ordre d'affichage aux bords des bandes (Xéros entre deux pièces d'une même bande) ; à vérifier par les scénarios `test-etage`, `test-interieur`, `test-forge-visite`, et des captures comparées pixel pour pixel avec l'affichage actuel.

### 3.4 « Ne charger que ce qui est proche » (décision de Grégoire ; 3 à 5 jours)

**Ce qui existe déjà :**
- une seule zone simulée, les voisines dessinées en décor ;
- un rattrapage pour les garennes (`settle`).

**Ce qui manque :**
- **Trois cercles** :
  - **la zone de Xéros**, tout simulé, comme aujourd'hui ;
  - **les zones voisines**, une simulation grossière à pas long (une fois par minute de jeu : les garennes avancent leurs naissances et leurs sorties, une bête blessée guérit, un feu s'éteint, plus tard les cultures), sans physique ni affichage ;
  - **au-delà, rien** : seule l'heure de la dernière visite est gardée par zone.
- **Le rattrapage au retour** : une fonction par système, appelée avec le temps passé (`catchUp(état, minutes)`). C'est `settle` des garennes généralisé (le bois qui vieillit, les cultures, les PNJ qui ont fait leur journée). Elle doit donner le même résultat qu'une simulation grossière continue ; un test le vérifie, à la manière de `test-cadence`.
- **Libérer une zone quittée** : ses textures (terrain peint, murs, bois propres à la zone) se retirent du gestionnaire de textures quand elle n'est plus ni la zone courante ni une voisine (un compte par zone de ce qu'elle a fabriqué ; aujourd'hui le terrain est gardé dans le registre). Mémoire attendue : stable autour de 50 à 60 Mo de textures au lieu de 113 Mo et plus à chaque zone découverte. Le prix : la première arrivée sur une forêt refaite coûte 0,5 à 1 s au lieu de 150 ms, à moins de la préparer quand Xéros s'approche du bord.
- **Les données des zones** : `maps.ts` coupé en un module par zone, chargé avec ses voisines et préparé à l'approche du bord. Gain au démarrage : environ 1 s en dev, moins en build.
- **Risque** : la règle « le monde ne limite pas » (rien ne doit se perdre pendant l'absence : `test-matiere`) ; l'arrivée par le bord, qui doit trouver la voisine déjà prête (`systems/zones.ts`).

### 3.5 Les autres gains

| gain | comment | coût | gain attendu |
|---|---|---|---|
| **Écarter ce qui est hors de la vue** | les images à plus d'un écran de la caméra passent à `visible = false` (une grille de cases, mise à jour quand la caméra change de case) ; la caméra de Phaser n'écarte rien aujourd'hui | 1 jour | dehors, 9 000 images envoyées au GPU deviennent environ 1 000 : le dessin de 2,8 à environ 1 ms |
| **`lift` seulement quand ça bouge** | `LiftPass` (`systems/lift.ts:38`) recalcule tous les objets à chaque pas ; ne traiter que ceux qui bougent, et la caméra | 0,5 jour | 1 à 1,6 ms par pas |
| **Atlas préparés au build** | `npm run art` range les 2 235 PNG en quelques atlas (des cadres d'une même texture) ; plus de 2 500 changements de texture par image | 2 à 3 jours (le jeu nomme ses images par clé partout : une table clé → cadre) | moins d'appels de dessin, démarrage plus rapide en build ; peu visible sur le M3, réel sur un GPU faible |
| **Une grille pour la physique** | Arcade range déjà les corps statiques dans un arbre (RTree), et la physique ne paraît pas dans les profils | — | **rien de mesurable aujourd'hui** : à ne pas faire avant que la mesure le demande |
| **L'intérieur recalculé seulement quand il change** | voir 3.2 | compris dans 3.2 | l'entrée de 1,1 s à environ 0,3 s |

### 3.6 L'ordre recommandé

| étape | quoi | coût | gain attendu |
|---|---|---|---|
| 1 | Les ombres de joint sans `getPixelAlpha` (3.0) | ½ jour | **les gels de 13 s et les écrans noirs disparaissent** ; ferme du riche, porte, sortie, bord : de 13 s à moins de 0,5 s ; la ferme de Xéros de 1 s à 0,05 s |
| 2 | Les quatre défauts d'affichage (3.1) | 1 jour | la maison s'affiche juste |
| 3 | Ne refaire que ce qui change (3.2) | 1 à 2 jours | une action dans un bâtiment : quelques ms ; une entrée de 1,1 à 0,3 s |
| 4 | Le bâtiment cuit (3.3) | 4 à 6 jours | devant le coq, objets ÷ 3, appels de dessin ÷ 8 ; l'étage à 60 images/s ; les bâtiments suivants ne coûtent presque plus rien |
| 5 | Écarter ce qui est hors de la vue, `lift` au mouvement (3.5) | 1,5 jour | dessin et pas divisés par 2 dehors : de la marge pour les machines plus faibles |
| 6 | Ne charger que ce qui est proche (3.4) | 3 à 5 jours | mémoire stable, démarrage plus court, monde vivant hors de vue |
| 7 | Atlas (3.5) | 2 à 3 jours | les GPU faibles |

L'étape 1 rend le jeu jouable tout de suite. Les étapes 3 et 4 sont celles qui comptent pour les prochains bâtiments (le village) : sans elles, chaque maison ajoutera ses tranches et son `sortBuilds` complet.

---

## 4. Refaire les mesures

```bash
npm run diagnostic                                   # main courant, en dev : docs/diagnostic/apres-dev.json
npm run diagnostic -- --build                        # le même en build
npm run diagnostic -- --label corrige                # après une correction, sous un autre nom
npm run diagnostic -- --report docs/diagnostic/avant-dev.json docs/diagnostic/apres-dev.json docs/diagnostic/corrige-dev.json
```

- `--only boot,zones,chargements,situations,maison,bord,memoire` en fait une partie.
- `--root <dossier>` mesure un autre arbre du jeu, par exemple un worktree d'un commit plus ancien (`git worktree add --detach <dossier> b9cc596`, un lien vers `node_modules`, une copie de `src/generated/` d'un arbre du même commit, puis `npm run art` et `npm run maps` dans ce dossier).
- Une fenêtre de Chrome s'ouvre pendant une dizaine de minutes ; rien de lourd ne doit tourner à côté.
- **Limites de l'outil** : le temps de la physique d'Arcade n'est pas isolé (il est compté dans le pas) ; le GPU n'est mesuré que par ses effets (la durée des images, les appels de dessin) ; un rapport ne vaut que pour la machine où il est pris (ici un MacBook à puce M3).

---

## Annexe A : les 20 zones (dev, prêt en ms, create entre parenthèses)

| zone | avant 1re | avant 2e | milieu 1re | milieu 2e | après 1re | après 2e |
|---|---|---|---|---|---|---|
| foret-profonde-nord | 1111 (867) | 150 (31) | 1094 (861) | 181 (44) | 1070 (853) | 174 (35) |
| bois-du-nord | 765 (624) | 155 (30) | 765 (628) | 175 (32) | 769 (633) | 172 (33) |
| pres-du-nord | 158 (23) | 132 (19) | 157 (25) | 154 (20) | 177 (39) | 163 (30) |
| ferme-du-riche | 158 (22) | 132 (14) | 153 (15) | 145 (11) | 13384 (13229) | 13103 (12963) |
| champs-du-riche | 147 (12) | 147 (12) | 149 (12) | 145 (11) | 156 (20) | 155 (19) |
| foret-profonde | 619 (496) | 185 (42) | 633 (495) | 183 (45) | 658 (519) | 172 (35) |
| ferme | 2205 (2073) | 1163 (1049) | 2227 (2080) | 1192 (1048) | 2243 (2098) | 1179 (1034) |
| chemin | 165 (20) | 143 (19) | 156 (18) | 158 (19) | 164 (29) | 172 (28) |
| village | 156 (36) | 146 (30) | 173 (38) | 169 (32) | 180 (44) | 170 (37) |
| route-de-la-ville | 121 (11) | 130 (10) | 148 (12) | 146 (12) | 157 (24) | 154 (22) |
| foret-profonde-sud | 512 (373) | 176 (36) | 520 (381) | 184 (41) | 515 (377) | 175 (38) |
| bois-du-sud | 540 (414) | 165 (35) | 550 (411) | 178 (36) | 555 (413) | 174 (35) |
| pres-du-sud | 157 (22) | 120 (19) | 158 (21) | 155 (18) | 152 (21) | 158 (21) |
| quartier-sud | 136 (16) | 130 (12) | 148 (14) | 149 (14) | 149 (14) | 145 (13) |
| pres-de-l-est | 144 (12) | 124 (8) | 144 (10) | 144 (10) | 146 (12) | 147 (10) |
| foret-des-ronces | 747 (626) | 172 (32) | 759 (621) | 168 (29) | 761 (624) | 176 (36) |
| bois-de-la-riviere | 557 (414) | 151 (28) | 548 (411) | 170 (28) | 562 (418) | 167 (29) |
| friches | 128 (9) | 128 (9) | 143 (10) | 145 (11) | 147 (12) | 143 (10) |
| ferme-rivale | 119 (5) | 139 (5) | 135 (5) | 139 (5) | 142 (6) | 139 (5) |
| champs-rivaux | 137 (5) | 142 (7) | 142 (6) | 140 (7) | 140 (7) | 139 (5) |

## Annexe B : le build

`npm run diagnostic -- --report docs/diagnostic/avant-build.json docs/diagnostic/apres-build.json` donne les tableaux complets. En bref :
- démarrage en 1,8 s (avant) et 1,9 s (après), contre 3,1 et 3,8 s en dev ;
- la ferme du riche en 13 s (12 998 ms, 13 439 ms au retour) contre 112 ms avant ;
- la porte en arc : une image de 12 816 ms ;
- l'étage : p95 de 33,5 ms et 500 appels de dessin, comme en dev.

---

## 5. Les corrections (chantier « corrections », 11 novembre 2026)

Branche `corrections`, partie de `diagnostic`. Les étapes 1 à 3 de l'ordre recommandé (3.6), et ce qu'il fallait de plus pour les seuils de Grégoire : **plus aucune image de plus de 100 ms à l'arrivée sur une zone, en ouvrant une porte, en entrant ou en sortant ; 60 images par seconde dehors et en bas du coq.**

### 5.1 Ce qui a changé

| défaut | correction | test qui l'aurait attrapé |
|---|---|---|
| les gels de 13 s (ombres de joint) | chaque image n'est lue qu'une fois, un seul `getImageData` par cadre, gardé (`src/world/alphaMask.ts`) ; de même pour la teinte de la coupe d'un intérieur (`meanColor`) et la visée du mode construction ; plus aucune lecture pixel par pixel dans `src/` | `npm run test:recalcul` : mêmes pixels d'ombre que `getPixelAlpha` sur 32 paires, chaque image lue une fois |
| tout refaire à chaque porte | `GameMap.sortBuilds` ne refait que les alentours de ce qui a changé (l'emprise d'avant et d'après, les entures, le tronçon de mur, ce qui repose dessus) ; une porte ou un volet ne refait que lui, et seul son bâtiment (`swungIn`) ; `SupportIndex` trouve les porteurs sans tout parcourir ; le recalcul complet n'est que pour l'arrivée | `test:recalcul` : la porte, une pièce posée puis retirée, comparées au recalcul complet, pièce par pièce ; `tools/test-recalcul-pur.ts` (test:fast) : l'index et `swungIn` égaux au calcul complet sur tous les plans, et deux bâtiments voisins |
| l'étage vu d'en bas (2.1) | dans un intérieur, seul `systems/storeys.ts` décide de ce qui se voit ; les toits n'y touchent plus ; les ombres de joint suivent le niveau de leur pièce | `test:recalcul` (en bas, une seconde après l'entrée) et `test:etage` (en haut, le bas seulement par la trémie) |
| les jours du plancher (2.2) | une planche dont une autre touche le bord sud, à la même hauteur : sa rangée d'ombre devient le joint, de la couleur de son contour (`jointiveSpans`, texture `#joined`), sans nouveau dessin | `test:recalcul` : 60 planches jointives sur 64, aucun pixel translucide ; `test-recalcul-pur` |
| les pièces loin de leur place (2.3) | `offsetOf` mesure l'écart de calage d'un mur sans son propre décalage : il n'est plus compté deux fois | `test:recalcul` : toutes les pièces posées de toutes les cartes à bâtiments (la ferme, la ferme du riche, le village, le quartier sud) et de la maison du coq, à 4 px au plus de leur place (un calage au ras d'un angle en fait 1 à 3) |
| le poteau sous la porte en arc (2.4) | les portes d'entrée s'ouvrent vers l'intérieur (`swing.inward` de props.json : la porte en arc, la porte de la chaumière, la porte en planches) ; une porte restée ouverte vers le dehors dans une ancienne sauvegarde se referme quand même | `tools/test-portes-sens.ts` (test:fast) : chaque porte d'entrée de chaque plan ; il a trouvé **trois** portes ouvertes vers le dehors (la cabane, la maison de Xéros, la maison du coq). La porte charretière de la grange, à deux battants, s'ouvre vers le dehors, comme celles des granges : dite, pas changée |
| les premières visites (le terrain, les murs) | le terrain se peint par petits pas, le plus près de la vue d'abord, dans le budget de l'image (`TERRAIN` de config.ts) ; le fondu d'arrivée attend que la vue soit peinte ; la zone et la bande de ses voisines partagent leurs morceaux. Les textures des pièces posées, le relief et les bâtiments des cartes d'alentour se préparent d'avance, peu à chaque image (`systems/prewarm.ts`, `PREPARE`) ; un morceau de mur ne dessine plus son propre tronçon, jeté aussitôt ; les bâtiments d'une carte sont gardés tant que ses pièces ne changent pas (`buildingsCached`) | `npm run diagnostic` : la pire image de chaque arrivée |

**Pas dans ce chantier, réservé à la cuisson des bâtiments (3.3)** : les tranches de 2 px des pièces nord-sud (6 508 objets devant le coq, 166 appels de dessin au lieu de 6) et les masques de l'étage (une pièce du rez-de-chaussée vue par la trémie, un passage au stencil : 500 appels de dessin, une image sur vingt à 33 ms en haut). Ils viendront avec la coque cuite par niveau et par bande de profondeur.

### 5.2 Les mesures comparées

Mêmes chemins, même machine (Apple M3, vrai Chrome), en dev. L'outil a été corrigé pendant ce chantier :
- le profileur de Chrome démarre avant l'enregistrement des images (son démarrage figeait la première, d'où les maxima de 50 à 170 ms des tableaux de la section 1, même loin du coq) ;
- chaque arrivée dit sa pire image, de la commande jusqu'à 1,5 s après le monde prêt ;
- la tournée des zones attend la fin de la préparation d'avance, comme un joueur qui marche d'une zone à l'autre (323 ms après le réveil).

Les deux références ont donc été **remesurées avec le même outil** : `docs/diagnostic/avant-dev.json`, `apres-dev.json`, `corrige-dev.json` (les rapports d'origine sont dans l'historique, commit 06ae941).

**La pire image de chaque arrivée** (ms), entre parenthèses le `create` de la scène :

| zone | b9cc596 1re | b9cc596 2e | 1e3e36c 1re | 1e3e36c 2e | corrigé 1re | corrigé 2e |
|---|---|---|---|---|---|---|
| foret-profonde-nord | 879 (851) | 73 (44) | 872 (843) | 65 (37) | 85 (47) | 69 (40) |
| bois-du-nord | 709 (673) | 71 (34) | 666 (634) | 62 (32) | 90 (33) | 61 (28) |
| pres-du-nord | 57 (30) | 46 (21) | 66 (39) | 54 (29) | 43 (17) | 34 (10) |
| **ferme-du-riche** | 45 (20) | 37 (14) | **13 053** (13 015) | **13 284** (13 258) | **96** (60) | **60** (32) |
| champs-du-riche | 36 (12) | 39 (15) | 53 (23) | 47 (19) | 38 (7) | 36 (6) |
| foret-profonde | 541 (514) | 70 (45) | 550 (523) | 78 (46) | 77 (46) | 61 (34) |
| **ferme** | 2 165 (2 124) | 1 063 (1 026) | 2 402 (2 364) | 1 124 (1 089) | **89** (52) | **80** (44) |
| chemin | 50 (20) | 49 (19) | 61 (31) | 61 (29) | 67 (12) | 40 (11) |
| village | 65 (40) | 53 (29) | 77 (51) | 69 (46) | 56 (33) | 42 (16) |
| route-de-la-ville | 41 (15) | 39 (12) | 54 (27) | 43 (20) | 37 (11) | 35 (9) |
| foret-profonde-sud | 406 (379) | 65 (39) | 402 (376) | 68 (41) | 75 (42) | 70 (41) |
| bois-du-sud | 446 (412) | 71 (37) | 455 (423) | 74 (39) | 93 (31) | 65 (29) |
| pres-du-sud | 51 (23) | 49 (22) | 46 (20) | 52 (24) | 42 (15) | 38 (13) |
| quartier-sud | 40 (16) | 42 (18) | 40 (17) | 39 (15) | 36 (13) | 35 (11) |
| pres-de-l-est | 37 (12) | 35 (11) | 34 (10) | 31 (10) | 37 (11) | 33 (8) |
| foret-des-ronces | 655 (628) | 63 (36) | 677 (649) | 70 (41) | 73 (40) | 65 (37) |
| bois-de-la-riviere | 443 (412) | 62 (29) | 451 (420) | 62 (30) | 83 (28) | 60 (29) |
| friches | 40 (12) | 35 (11) | 36 (11) | 41 (12) | 34 (9) | 38 (12) |
| ferme-rivale | 29 (6) | 28 (6) | 31 (7) | 29 (7) | 30 (7) | 26 (5) |
| champs-rivaux | 30 (8) | 32 (9) | 33 (9) | 29 (7) | 27 (6) | 27 (6) |
| **arrivées au-dessus de 100 ms** | **9 sur 40** | | **11 sur 40** | | **0 sur 40** (la pire : 96) | |

**Les gestes** (la pire image, ms) :

| geste | b9cc596 | 1e3e36c | corrigé |
|---|---|---|---|
| ouvrir la porte en arc | — (pas de maison) | **13 899** | **18** |
| entrer dans la maison du coq | — | 827 (create 790) | **46** (create 14) |
| ouvrir une porte du palier | — | 600 | **34** |
| ressortir sur la ferme du riche | — | **12 932** | **74** (create 43) |
| passer le bord vers le village | 59 | 73 | 45 |
| revenir du village par le bord | 41 | **12 956** | **60** |

**En régime calme** (corrigé, dev) :

| situation | images/s | image p50 / p95 / max (ms) | appels de dessin |
|---|---|---|---|
| dehors loin du coq (ferme), immobile et en marchant | 60,2 | 16,7 / 17,6 / 17,8 | 46 |
| devant le coq, immobile et en marchant | 60,2 | 16,7 / 17,5 / 17,7 | 166 |
| dedans en bas, immobile et en marchant | 60,2 à 60,3 | 16,7 / 17,5 / 17,7 | 85 (163 avant : l'étage n'est plus dessiné en bas) |
| dedans en haut | 48,7 à 55,6 | 16,7 / 33,2 / 34 à 50 | 500 (les masques : la cuisson) |

Aucune perte du contexte WebGL, aucune erreur de la page. La mémoire après tout le parcours : 3 573 textures, 111 Mo (113 Mo avant ; la libération des zones quittées est l'étape 6).

**Les seuils de Grégoire sont tenus** :
- aucune arrivée, porte, entrée ni sortie au-dessus de 100 ms ;
- 60 images par seconde dehors et en bas du coq.

L'étage reste à une image sur vingt de 33 ms, jusqu'à la cuisson.

