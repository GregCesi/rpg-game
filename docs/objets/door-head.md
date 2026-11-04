# Tête de baie (`staves-door-head` … `lime-door-head`)

Décidé le 3 novembre 2026 (proposition « la baie de porte » validée par Grégoire : `art/proposals/baie-porte.ts`, planche
`.art-preview/baie-porte.png`) : le haut d'une baie de porte de la maison en pan de bois, de 2 m à la sablière (2,50 m). Les autres
pièces de la baie : l'[huisserie](door-frame.md), les [bandes de remplissage](wall-infill.md), la [porte](cottage-door.md), le
[seuil](inner-threshold-stone.md).

## Identité
- Clés : `staves-door-head` `wattle-door-head` `daub-door-head` `lime-door-head`.
- Noms affichés : « tête de baie de palançons », « … de clayonnage », « … de torchis », « tête de baie chaulée » (féminin).
- Nature : objets du monde (`props.json`), famille `éléments`, pièces de bâtiment. Chaque étape est sa propre pièce, comme les
  remplissages : `layers` (ses couches jusqu'à elle) et `over` (la pièce qu'elle recouvre et remplace en mode construction :
  `wattle-door-head` sur `staves-door-head`, `daub-` sur `wattle-`, `lime-` sur `daub-`).
- Ce qu'elle contient : les deux huisseries prolongées jusqu'à la sablière (15 cm chacune, le fil repris de l'huisserie), le
  linteau de 15 cm entre elles (son dessous à 2 m, le haut de la porte, tenon chevillé), le remplissage de 90 × 35 cm au-dessus du
  linteau, à son étape (sans terre rejaillie : il est en l'air). Huisseries et linteau sont là dès la première étape : on les pose
  avant de garnir.
- Âge : le bois se voit à toutes les étapes, `"aged": true`.

## Masse
Sur la boîte de 120 × 15 × 50 cm (0,09 m³) : le bois (deux bouts d'huisserie de 15 × 15 × 50, le linteau de 90 × 15 × 15 :
0,043 m³, 38 kg) et le remplissage de 90 × 35 × 15 (0,047 m³).
- palançons `{"matter": "wood", "fill": 0.54}` (44 kg) ; clayonnage `wood` 0,59 (48 kg) ;
- torchis `{"matter": "cob", "fill": 0.72}` (113 kg : le bois, plus le torchis à 0,9 du remplissage, ramenés à la densité du
  torchis) ; chaulé `cob` 0,73 (115 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- 120 × 15 × 50 cm : la largeur du seuil (huisseries et porte : 15 + 90 + 15), l'épaisseur du mur, la hauteur de 2 m à la sablière.
- Pièce de bâtiment `ground`. À l'écran : 24 × (10 + 3) = **24 × 13 px** (dessiné 24 × 14) ; de chant **3 × 34** (dessiné 4 × 34).
- Posée sur les deux huisseries (z 200 → 250).

## Vues
Quatre (`four`) : r0 le dehors, r2 le dedans, r1 et r3 de chant ; le même modèle en volumes tourné (art/world/xeros-house.ts
`doorHead`), les matières des remplissages (graines `SEEDS` + 400). Fantôme : elle-même en transparence.

## Variantes naturelles
Aucune.

## Regroupement
Une par baie de porte, au-dessus de la porte et des deux huisseries.

## Gestes
- Mode construction : posée sur les huisseries ; l'étape suivante se pose dessus et la remplace (`over`).
- En jeu : pas de `body` (elle est en l'air, au-dessus du passage).

## Travail
Aucun pour l'instant (le geste de chaque couche, à venir).

## Arme
Aucune.

## Origine
Le linteau et les huisseries : bois équarri ; le remplissage : comme les [remplissages](wall-infill.md).

## Devenir
Elle reste au mur.

## Transformations
Aucune entrée de transforms.json.

## Métier
Palançons : le charpentier (`carpenter`) ; clayonnage : le bûcheron (`woodcutter`) ; torchis : le terrassier (`digger`) ; chaux :
le maçon (`mason`).

## Vérification
- `.art-preview/baie-porte.png` (`npx tsx tools/essai-baie.ts`) : chaque étape dans ses quatre vues et ses trois âges ; la travée
  montée (entrée, porte intérieure, baie du cagibi sans porte).
- `npm run check` (gabarit, vues, âges, catalogue).
