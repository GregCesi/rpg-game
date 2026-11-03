# Conduit (`chimney-flue`)

Décidé le 3 novembre 2026 (retouche de Grégoire, CONCEPTION « La maison de Xéros ») : le conduit de la cheminée de pierre, en tronçons
d'un mètre empilés sur la [hotte](chimney-hood.md), de 2,50 m à 8,50 m (six tronçons), à travers le [pan de chaume percé](thatch-roof-pierced.md)
jusqu'au [couronnement](chimney-cap.md).

## Identité
- Clé : `chimney-flue`.
- Nom affiché : « conduit » (masculin).
- Nature : objet du monde (`props.json`), famille `éléments`, une pièce de bâtiment qui s'empile sur elle-même.
- Mains : aucune.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.72}` : 1,00 × 0,50 × 1,00 m (0,5 m³), moins le conduit de fumée (70 × 20 cm) : 864 kg le tronçon.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 100 × 50 × 100 cm ; boîte, `ground: true` (empilé sur la hotte : voir la fiche de l'âtre).
- À l'écran : 20 × (20 + 10) = **20 × 30 px** ; de côté **10 × 40**.

## Vues
Deux (`symmetric`) : est-ouest et nord-sud (`chimney-flue-ns`). Quatre assises de 25 cm de moellons au mortier, les angles en pierre
de taille alternés long et court (quatre assises : l'alternance continue d'un tronçon au suivant) ; le dessus, le tour de pierre et
le noir du conduit de fumée, n'est vu que sur le tronçon du haut (celui du dessus le couvre) ; le bas sans contour (le joint de lit
à la place) : **six tronçons empilés se lisent comme un seul conduit**, vus du sud comme de côté.

## Variantes naturelles
Aucune : maçonnerie. Les six tronçons ont le même dessin (le motif des joints revient tous les mètres).

## Regroupement
Empilé : chaque tronçon sur le précédent (z = 250 + 100 k cm).

## Gestes
Mode construction : posé sur la hotte, puis sur le tronçon d'en dessous (tools/lib/maison-xeros.ts : x 730, y 30).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Monté par le maçon.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Le maçon (`mason`).

## Vérification
`.art-preview/maison-pieces.png` (dernière rangée : la cheminée montée, six tronçons seuls est-ouest et nord-sud),
`.art-preview/chimney-flue.png`.
