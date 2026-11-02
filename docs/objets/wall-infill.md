# Remplissages et jambages de la maison de Xéros (`staves-panel` … `lime-inner-jamb`)

Décidé le 2 novembre 2026 (CONCEPTION « La maison de Xéros », étape 2, « Les pièces de l'étape 2 ») : le mur de la chaumière entre
deux poteaux de l'ossature en pan de bois, monté en quatre couches. Les dessins viennent de l'essai validé par Grégoire
(`art/proposals/maison-xeros.ts`, « parfait, j'adore »), passés dans le jeu par `art/lib/volumes.ts` et `art/world/xeros-house.ts`.

## Identité
- Clés : `staves-panel` `wattle-panel` `daub-panel` `lime-panel` (plein) ; `staves-window-panel` `wattle-window-panel` `daub-window-panel` `lime-window-panel` (à fenêtre) ; `staves-jamb` `wattle-jamb` `daub-jamb` `lime-jamb` (jambages de la porte d'entrée) ; `staves-inner-jamb` `wattle-inner-jamb` `daub-inner-jamb` `lime-inner-jamb` (jambages d'une porte intérieure).
- Noms affichés : « remplissage de palançons », « … de clayonnage », « … de torchis », « remplissage chaulé » ; « … à fenêtre » ;
  « jambage de palançons (porte d'entrée) »… (masculin).
- Nature : objets du monde (`props.json`), sans `take`, famille `éléments`. Chaque étape est sa propre pièce : `layers` (ses couches
  jusqu'à elle : palançons, clayonnage, torchis, chaux) et `over` (la pièce qu'elle recouvre et remplace en mode construction :
  `wattle-panel` sur `staves-panel`, `daub-panel` sur `wattle-panel`, `lime-panel` sur `daub-panel` ; de même pour la fenêtre et
  les jambages).
- Une porte se passe : le remplissage d'une travée de porte n'est pas d'une seule pièce (sa boîte boucherait le passage). La porte
  (`cottage-door`, `inner-door`) est sa propre pièce, posée dans la baie entre deux jambages : 25 + 90 + 25 cm (entrée), 30 + 80 + 30
  cm (porte intérieure), soit les 140 cm de la travée. L'huisserie (15 cm) est dans le jambage, du côté de la baie : à l'ouest en
  r0 (le jambage de droite), à l'est en r2 (le même, tourné d'un demi-tour : le jambage de gauche).
- Âge : le bois qui se voit (palançons, clayonnage, huisseries, appui, linteau et montants de la fenêtre) prend l'âge du bois
  (`"aged": true`) ; `daub-panel` et `lime-panel`, sans bois visible, ne le prennent pas (le torchis et la chaux ne sont pas du bois).

## Masse
Par la matière, sur la boîte de leurs `dims` (140 × 15 × 180 cm, 0,378 m³ pour un plein) : palançons `{"matter": "wood", "fill": 0.13}`
(44 kg), clayonnage `wood` 0,22 (75 kg), torchis `cob` 0,9 (595 kg), chaulé `cob` 0,92 (la chaux, un badigeon, ne pèse presque rien).
Les jambages, à leur largeur (25 et 30 cm). Rien ne se porte : un remplissage se monte en place, couche après couche.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Remplissage : 140 × 15 × 180 cm (entre deux poteaux de 20 cm sur la grille de 1,60 m, entre la traverse basse et la sablière),
  pièce de bâtiment `ground` (sa profondeur à l'échelle du sol, comme les poteaux qu'elle relie). Face : 28 × 39 px ; de chant :
  4 × 64 px (palançons : 2 × 64).
- Jambages : 25 × 15 × 180 (5 × 40 px ; de chant 4 × 41) et 30 × 15 × 180 (6 × 40 ; de chant 4 × 42).
- Fenêtre : l'appui à 20 cm du bas de la travée (80 cm du sol), la baie de 50 × 40 cm entre deux montants de 10 cm, le linteau (les
  mesures de l'essai : CONCEPTION dit une baie de 60 × 40, l'essai la dessine à 50 entre les montants, 70 hors tout ; le volet
  `plank-shutter`, 60 × 40, la couvre).

## Vues
- Quatre (`four`) : r0 la face du dehors au sud, r1 de chant (la face du dehors à l'ouest), r2 la face du dedans (une cloison est
  chaulée des deux côtés ; la baie de la fenêtre vue du dedans est ouverte), r3 de chant. Chaque vue est le même modèle en volumes
  tourné, rendu dans la projection du jeu.
- Palançons : un palançon de 10 cm (la perche de 12 fendue) tous les 30 cm environ, aux deux bords. Clayonnage : les baguettes de
  noisetier tressées devant et derrière les palançons. Torchis : les mottes, les brins de paille. Chaux : blanc cassé (la rampe du
  calcaire), la terre rejaillie au pied.
- Fantôme : lui-même en transparence.

## Variantes naturelles
Aucune : un ouvrage régulier à la mesure du travail (les mottes et les brins sont tirés d'une graine fixe par étape).

## Regroupement
Seul, dans sa travée ; une travée de porte : jambage r2, porte, jambage r0.

## Gestes
- Mode construction : posé entre deux poteaux, sur la traverse basse ; l'étape suivante se pose dessus et la remplace (`over`,
  le moteur viendra : CONCEPTION, découpage de l'étape 2, « Le moteur »).
- En jeu : il bloque le passage (`body`, 15 cm d'épais).

## Travail
Aucun pour l'instant (le geste de chaque couche, « à venir »).

## Arme
Aucune.

## Origine
Les palançons : la perche fendue en deux (`pole` `half`, wood.json, un autre dessinateur) ; le clayonnage : la baguette
(`wattle-rod`) ; le torchis : la motte de torchis (`cob`) ; la chaux : la chaux éteinte (chantier en cours).

## Devenir
Il reste au mur.

## Transformations
Aucune entrée de transforms.json : chaque couche se pose sur la précédente.

## Métier
Palançons : le charpentier (`carpenter`) ; clayonnage : le bûcheron (`woodcutter`, les baguettes) ; torchis : le terrassier
(`digger`) ; chaux : le maçon (`mason`).

## Vérification
- `.art-preview/maison-pieces.png` (rangées 1 à 4 : chaque pièce dans ses quatre vues, Xéros à côté ; une travée de porte montée).
- `npm run check` (gabarit, vues, âges, catalogue).
