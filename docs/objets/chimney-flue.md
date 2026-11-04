# Conduit (`chimney-flue`)

Décidé le 3 novembre 2026 (retouche de Grégoire, CONCEPTION « La maison de Xéros » ; refait avec la cheminée paysanne, proposition
validée par Grégoire : `art/proposals/cheminee-2.ts`, `.art-preview/cheminee-2.png`) : le conduit de la cheminée, en tronçons
d'un mètre empilés sur la [hotte](chimney-hood.md), de 2,50 m à 7,50 m (cinq tronçons), à travers le [pan de chaume percé](thatch-roof-pierced.md)
jusqu'au [couronnement](chimney-cap.md).

## Identité
- Clé : `chimney-flue`.
- Nom affiché : « conduit » (masculin).
- Nature : objet du monde (`props.json`), famille `éléments`, une pièce de bâtiment qui s'empile sur elle-même.
- Mains : aucune.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.7}` : 1,00 × 0,80 × 1,00 m (0,8 m³), moins le passage de la fumée (60 × 40 cm) : 1,3 t le tronçon.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 100 × 80 × 100 cm hors tout ; parois de pierre de 20 cm, passage de 60 × 40 cm ; boîte, `ground: true` (empilé sur la hotte :
  voir la fiche de l'âtre). Place (cm, en axes) : x 720–820, y 30–110, centré sur la hotte, z 250 à 750.
- Le passage : RAPPORT.md point 12 donne « de l'ordre de 40 × 60 à 60 × 100 cm » (non sourcé) ; 60 × 40, choisi faute de source
  dans cette fourchette (l'ancien, 70 × 20, était nettement plus étroit).
- À l'écran : 20 × (20 + 16) = **20 × 36 px** ; de côté **16 × 40**.

## Vues
Deux (`symmetric`) : est-ouest et nord-sud (`chimney-flue-ns`). Quatre assises de 25 cm de moellons au mortier, les angles en pierre
de taille alternés long et court (quatre assises : l'alternance continue d'un tronçon au suivant) ; le dessus, le tour de pierre et
le noir du conduit de fumée, n'est vu que sur le tronçon du haut (celui du dessus le couvre) ; le bas sans contour (le joint de lit
à la place) : **cinq tronçons empilés se lisent comme un seul conduit**, vus du sud comme de côté.

## Variantes naturelles
Aucune : maçonnerie. Les cinq tronçons ont le même dessin (le motif des joints revient tous les mètres).

## Regroupement
Empilé : chaque tronçon sur le précédent (z = 250 + 100 k cm).

## Gestes
Mode construction : posé sur la hotte, puis sur le tronçon d'en dessous (x 720, y 30).

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
`.art-preview/cheminee-2.png` (`npx tsx tools/essai-cheminee.ts` : le tronçon au gabarit, la cheminée montée, la souche à travers
le pan nord), `.art-preview/chimney-flue.png`, `npm run check`.
