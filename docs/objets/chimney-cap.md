# Couronnement (`chimney-cap`)

Décidé le 3 novembre 2026 (retouche de Grégoire, CONCEPTION « La maison de Xéros » ; refait avec la cheminée paysanne, proposition
validée par Grégoire : `art/proposals/cheminee-2.ts`, `.art-preview/cheminee-2.png`) : la dalle percée qui coiffe la souche de la
cheminée, sur le dernier tronçon du [conduit](chimney-flue.md), à 7,50 m (1 m au-dessus du faîte, 6,58 m) ; la fumée sort par son trou.

## Identité
- Clé : `chimney-cap`.
- Nom affiché : « couronnement » (masculin).
- Nature : objet du monde (`props.json`), famille `éléments` ; sa fumée (`smoke`, au milieu du trou).
- Mains : aucune.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.83}` : 1,40 × 1,00 × 0,10 m, percée de 60 × 40 cm : 279 kg.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 140 × 100 × 10 cm ; boîte, `ground: true` (sur le conduit : voir la fiche de l'âtre). Elle déborde du conduit de 20 cm à l'est et
  à l'ouest, de 10 au nord et au sud (la place de la maison rebâtie en mode construction, grille de 20 cm ; le débord choisi faute de
  source). Place (cm, en axes) : x 700–840, y 20–120, z 750–760.
- La souche à 1 m au-dessus du faîte : aucune règle d'époque trouvée (RAPPORT.md point 12 : la règle moderne, DTU 24.1, demande
  0,40 m) ; 1 m, choisi faute de source, éloigne les escarbilles du chaume.
- À l'écran : 28 × (2 + 24) = **28 × 22 px** ; de côté **20 × 30**.

## Vues
Deux (`symmetric`) : est-ouest et nord-sud (`chimney-cap-ns`). Une dalle de calcaire ; sur le dessus, le trou au droit du conduit de
fumée, sa lèvre de suie.

## Variantes naturelles
Aucune.

## Regroupement
Seule.

## Gestes
Mode construction : posée sur le dernier tronçon (x 700, y 20, z 750).

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
`.art-preview/cheminee-2.png` (la cheminée montée, la souche au-dessus du pan nord), `.art-preview/chimney-cap.png`. La fumée :
`smoke` [14, 10], le milieu du trou dans l'image.
