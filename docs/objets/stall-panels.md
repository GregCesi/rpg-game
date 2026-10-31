# Pans de l'étal (`stall-back`, `stall-side`, `stall-front`)

Décidés le 31 octobre 2026 (chantier « bâtiments », l'étal de la place) : le fond, les deux côtés et le devant bas de l'étal, en
bardage. Les pièces d'un même genre partagent cette fiche.

## Identité
- Clés : `stall-back` (fond d'étal, masculin), `stall-side` (côté d'étal, masculin, deux par étal), `stall-front` (devant d'étal,
  masculin) ; objets du monde (`props.json`), sans `take`.
- Nature : le bardage de la grange (`board-wall`) à d'autres tailles : des planches fendues debout, des couvre-joints, sur des lisses
  chevillées à la face du dehors des poteaux. Le devant bas finit en haut par une planche de rive horizontale, le rebord où le volet
  d'étal s'appuie et tourne.
- Mains : aucune (montés sur place).
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` : neuf, patiné, vieux ; ses images à trois âges, la même grille peinte de la rampe de l'âge ; CONCEPTION « L'âge du bois »).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.18}` (comme le pan de bardage) sur la boîte de leurs `dims` : fond 160 × 20 × 252 cm,
  **131 kg** ; côté 80 × 20 × 192, **50 kg** ; devant 160 × 20 × 100, **52 kg**. Ne se portent pas d'un bloc.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Fond : 1,60 m (entre les deux poteaux de derrière), 2,52 m (du sol au dessous de la sablière de derrière : poteaux de 2,40 m sur
  dalles), 20 cm (lisses, planches, couvre-joints, comme le bardage) ; de face 32 × 52 px.
- Côté : 80 cm (entre le poteau de devant et celui de derrière), 1,92 m (à la hauteur de la tête du poteau de devant ; au-dessus,
  sous l'auvent, l'étal est ouvert : l'air passe), 20 cm ; de face 16 × 40 px.
- Devant : 1,60 m, 1 m (la hauteur du comptoir), 20 cm ; de face 32 × 22 px.

## Vues
- Quatre (`four`), debout, comme le pan de bardage : r0 dehors, r2 dedans (lisses), r1, r3 de chant.

## Variantes naturelles
Aucune.

## Regroupement
Un fond, deux côtés, un devant par étal.

## Gestes
- Mode construction : clic gauche les pose au sol contre la face du dehors des poteaux, R les tourne (côté ouest : r1 ; est : r3),
  clic droit les retire.
- En jeu : ils bloquent le passage (`body`).

## Origine
Comme le pan de bardage : planches de la chaîne du gros bois (`rive-plank`), couvre-joints, lisses, chevilles. Pas encore fabriqués en
jeu.

## Devenir
Ils restent à l'étal.

## Transformations
Aucune pour l'instant.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/stall-*.png` ; l'étal : `.art-preview/etal.png`.
- `npm run test:etal` les pose.
