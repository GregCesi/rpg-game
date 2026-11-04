# Seuil intérieur (`inner-threshold-stone`)

Décidé le 3 novembre 2026 (proposition « la baie de porte » validée par Grégoire, `art/proposals/baie-porte.ts`,
`.art-preview/baie-porte.png`) : le seuil des portes intérieures, la même dalle que le seuil de la porte d'entrée
(`threshold-stone`, sa fiche : [hearth.md](hearth.md)), à la largeur du solin des cloisons. Les autres pièces de la baie : l'[huisserie](door-frame.md), la
[tête de baie](door-head.md), les [bandes de remplissage](wall-infill.md), la [porte](cottage-door.md).

## Identité
- Clé : `inner-threshold-stone`.
- Nom affiché : « seuil intérieur » (masculin).
- Nature : objets du monde (`props.json`), famille `éléments`, `layer: floor` (on marche dessus) ; posés à la place du solin sous
  une porte : le seuil d'entrée dans le solin du tour (50 cm d'épais), le seuil intérieur dans le solin des cloisons (30 cm).
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.95}` (une dalle de calcaire, ses arêtes un peu abattues) : 120 × 50 × 20 cm, 274 kg ; 120 × 30 × 20,
164 kg. Ils ne se portent pas seuls : on les met en place à deux, ou à la pince.

## Dimensions (gabarit, docs/STYLE.md section 8)
- `threshold-stone` : 120 × 50 × 20 cm ; boîte, le dessus en raccourci (un meuble posé au sol) : **24 × 15 px** est-ouest.
- `inner-threshold-stone` : 120 × 30 × 20 cm (la largeur de la baie, huisseries comprises ; l'épaisseur du solin des cloisons) :
  24 × (4 + 3) = **24 × 7 px** (dessiné 25 × 8) ; nord-sud 6 × (4 + 12) = **6 × 16** (dessiné 7 × 16).
- Le dessus du seuil à 20 cm : la porte et les huisseries partent de là.

## Vues
Deux (`symmetric`) : est-ouest et nord-sud (`-ns`), la même dalle de calcaire (`slabTex`), son ombre portée dessous.

## Variantes naturelles
Aucune : pierre taillée.

## Regroupement
Seul, sous une porte.

## Gestes
- Mode construction : posé au sol, dans la coupure du solin et de la traverse basse.
- En jeu : on passe dessus (pas de `body`).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Taillé par le maçon dans une dalle de calcaire.

## Devenir
Il reste ; il s'use au milieu (à venir).

## Transformations
Aucune.

## Métier
Le maçon (`mason`).

## Vérification
`.art-preview/baie-porte.png` (le seuil intérieur seul, puis sous la porte intérieure montée), `.art-preview/inner-threshold-stone.png`,
`npm run check`.
