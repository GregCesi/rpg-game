# Remplissages, bandes de baie et jambages de la maison de Xéros (`staves-panel` … `lime-inner-jamb`)

Décidé le 2 novembre 2026 (CONCEPTION « La maison de Xéros », étape 2, « Les pièces de l'étape 2 ») : le mur de la chaumière entre
deux poteaux de l'ossature en pan de bois, monté en quatre couches. Les dessins viennent de l'essai validé par Grégoire
(`art/proposals/maison-xeros.ts`, « parfait, j'adore »), passés dans le jeu par `art/lib/volumes.ts` et `art/world/xeros-house.ts`.

## Identité
- Clés : `staves-panel` `wattle-panel` `daub-panel` `lime-panel` (plein) ; `staves-window-panel` `wattle-window-panel` `daub-window-panel` `lime-window-panel` (à fenêtre) ; `staves-jamb` `wattle-jamb` `daub-jamb` `lime-jamb` (bandes de 10 cm d'une baie de porte) ; `staves-inner-jamb` `wattle-inner-jamb` `daub-inner-jamb` `lime-inner-jamb` (anciens jambages d'une porte intérieure, gardés au catalogue, plus utilisés par la maison).
- Noms affichés : « remplissage de palançons », « … de clayonnage », « … de torchis », « remplissage chaulé » ; « … à fenêtre » ;
  « bande de palançons (baie de porte) »… (féminin) ; « jambage de palançons (porte intérieure) »… (masculin).
- Nature : objets du monde (`props.json`), sans `take`, famille `éléments`. Chaque étape est sa propre pièce : `layers` (ses couches
  jusqu'à elle : palançons, clayonnage, torchis, chaux) et `over` (la pièce qu'elle recouvre et remplace en mode construction :
  `wattle-panel` sur `staves-panel`, `daub-panel` sur `wattle-panel`, `lime-panel` sur `daub-panel` ; de même pour la fenêtre et
  les jambages).
- Une porte se passe : le remplissage d'une travée de porte n'est pas d'une seule pièce (sa boîte boucherait le passage). Depuis la
  baie de porte validée par Grégoire le 3 novembre 2026 (`art/proposals/baie-porte.ts`, `.art-preview/baie-porte.png`), la travée
  d'une porte, d'entrée comme intérieure, est : une bande de remplissage de 10 cm (`*-jamb`, sans bois), l'[huisserie](door-frame.md)
  de 15, la porte de 90 (`cottage-door`, `inner-door`) sur son seuil, l'huisserie, la bande de 10 : 10 + 15 + 90 + 15 + 10 = 140 cm ;
  au-dessus, la [tête de baie](door-head.md). Les jambages intérieurs de 30 cm (`*-inner-jamb`, l'huisserie dedans, du côté de la
  baie) restent au catalogue, sans usage dans la maison.
- Âge : le bois qui se voit (palançons, clayonnage, huisseries des jambages intérieurs, appui, linteau et montants de la fenêtre)
  prend l'âge du bois (`"aged": true`) ; `daub-panel`, `lime-panel`, `daub-jamb` et `lime-jamb`, sans bois visible, ne le prennent
  pas (le torchis et la chaux ne sont pas du bois).

## Masse
Par la matière, sur la boîte de leurs `dims` (140 × 15 × 180 cm, 0,378 m³ pour un plein) : palançons `{"matter": "wood", "fill": 0.13}`
(44 kg), clayonnage `wood` 0,22 (75 kg), torchis `cob` 0,9 (595 kg), chaulé `cob` 0,92 (la chaux, un badigeon, ne pèse presque rien).
Les bandes de baie, à leur largeur de 10 cm (0,027 m³ : 3, 5, 43 et 44 kg) ; les jambages intérieurs, à 30 cm. Rien ne se porte : un remplissage se monte en place, couche après couche.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Remplissage : 140 × 15 × 180 cm (entre deux poteaux de 20 cm sur la grille de 1,60 m, entre la traverse basse et la sablière),
  pièce de bâtiment `ground` (sa profondeur à l'échelle du sol, comme les poteaux qu'elle relie). Face : 28 × 39 px ; de chant :
  4 × 64 px (palançons : 2 × 64).
- Bandes de baie : 10 × 15 × 180 (2 × 39 px, dessinées 2 × 40 ; de chant 3 × 38, dessinées 4 × 38 ; palançons 2 × 38).
- Jambages intérieurs : 30 × 15 × 180 (6 × 40 ; de chant 4 × 42).
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
Seul, dans sa travée ; une travée de porte : bande, huisserie, porte (sur son seuil), huisserie, bande ; la tête de baie au-dessus.

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
- `.art-preview/maison-pieces.png` (rangées 1 à 4 : chaque pièce dans ses quatre vues, Xéros à côté).
- `.art-preview/baie-porte.png` (`npx tsx tools/essai-baie.ts`) : les bandes de 10 cm dans leurs quatre étapes, la travée de porte montée.
- `npm run check` (gabarit, vues, âges, catalogue).
