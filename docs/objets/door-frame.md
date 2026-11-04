# Huisserie (`door-frame`)

Décidé le 3 novembre 2026 (proposition « la baie de porte » validée par Grégoire : `art/proposals/baie-porte.ts`, planche
`.art-preview/baie-porte.png`, `tools/essai-baie.ts`) : la baie d'une porte de la maison en pan de bois est faite de pièces séparées,
posées dans la travée de 1,40 m entre deux poteaux : une [bande de remplissage](wall-infill.md) de 10 cm, une huisserie, la
[porte](cottage-door.md) de 90 cm sur son [seuil](inner-threshold-stone.md), une huisserie, une bande de 10 cm ; la
[tête de baie](door-head.md) au-dessus, jusqu'à la sablière.

## Identité
- Clé : `door-frame`.
- Nom affiché : « huisserie » (féminin).
- Nature : objet du monde (`props.json`), famille `éléments`, une pièce de bâtiment ; deux par porte, une de chaque côté.
- Mains : aucune dans le jeu (une pièce de mur qu'on pose en mode construction).
- Âge : bois travaillé, `"aged": true` (neuf, patiné, vieux).

## Masse
`{"matter": "wood", "fill": 1}` : bois équarri plein, 15 × 15 × 180 cm (0,0405 m³) à 900 kg/m³ : 36 kg.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 15 × 15 × 180 cm (la section des poteaux de la porte, choisie dans l'essai validé de la maison ; la hauteur : la porte de
  1,80 m, posée sur le seuil de 20 cm, z 20 → 200).
- Pièce de bâtiment `ground` (comme les remplissages et les poteaux : sa profondeur à l'échelle du sol). À l'écran : 3 × (36 + 3) =
  **3 × 39 px** (dessiné 3 × 40) ; de chant **3 × 39** (dessiné 4 × 39).
- L'huisserie paraît continue du seuil à la sablière : la tête de baie la prolonge de 50 cm, son fil repris à la même hauteur.

## Vues
Quatre (`four`) : le même modèle en volumes tourné (art/world/xeros-house.ts `doorFrame`), le fil du bois équarri, la cheville du
linteau au haut. Fantôme : lui-même en transparence.

## Variantes naturelles
Aucune : bois équarri à la mesure.

## Regroupement
Dans la travée de porte : bande, huisserie, porte, huisserie, bande (2 + 3 + 18 + 3 + 2 = 28 px, les 1,40 m entre les poteaux).

## Gestes
- Mode construction : posée sur le seuil (le plus haut dessus que recoupe son emprise), contre la porte.
- En jeu : elle bloque (`body`, 15 × 15 cm), pas le passage de la porte.

## Travail
Aucun pour l'instant (l'équarrissage d'une pièce de bois de 15 cm, à venir).

## Arme
Aucune.

## Origine
Une pièce de bois équarrie, assemblée au linteau par tenon et cheville.

## Devenir
Elle reste en place.

## Transformations
Aucune.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/baie-porte.png` (`npx tsx tools/essai-baie.ts`) : la pièce dans ses quatre vues et ses trois âges, Xéros à côté,
  la taille attendue et dessinée ; la travée d'entrée montée de face, ouverte, de côté, en coupe.
- `.art-preview/door-frame.png`, `npm run check` (gabarit, vues, âges, catalogue).
