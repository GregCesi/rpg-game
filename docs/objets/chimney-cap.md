# Couronnement (`chimney-cap`)

Décidé le 3 novembre 2026 (retouche de Grégoire, CONCEPTION « La maison de Xéros ») : la dalle percée qui coiffe la souche de la
cheminée de pierre, sur le dernier tronçon du [conduit](chimney-flue.md), à 8,50 m ; la fumée sort par son trou.

## Identité
- Clé : `chimney-cap`.
- Nom affiché : « couronnement » (masculin).
- Nature : objet du monde (`props.json`), famille `éléments` ; sa fumée (`smoke`, au milieu du trou).
- Mains : aucune.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.79}` : 1,10 × 0,60 × 0,10 m, percée de 70 × 20 cm : 125 kg.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 110 × 60 × 10 cm ; boîte, `ground: true` (sur le conduit : voir la fiche de l'âtre). Elle déborde du conduit de 5 cm de chaque côté.
- À l'écran : 22 × (2 + 12) = **22 × 14 px** ; de côté **12 × 24**.

## Vues
Deux (`symmetric`) : est-ouest et nord-sud (`chimney-cap-ns`). Une dalle de calcaire ; sur le dessus, le trou au droit du conduit de
fumée, sa lèvre de suie.

## Variantes naturelles
Aucune.

## Regroupement
Seule.

## Gestes
Mode construction : posée sur le dernier tronçon (tools/lib/maison-xeros.ts : x 725, y 25, z 850).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Une dalle de calcaire percée par le tailleur de pierre.

## Devenir
Elle reste.

## Transformations
Aucune.

## Métier
Le maçon (`mason`).

## Vérification
`.art-preview/maison-pieces.png` (la cheminée montée), `.art-preview/chimney-cap.png`. La fumée : `smoke` [11, 6], le milieu du trou
dans l'image.
