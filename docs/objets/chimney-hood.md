# Hotte (`chimney-hood`)

Décidé le 3 novembre 2026 (retouche de Grégoire, CONCEPTION « La maison de Xéros ») : la hotte de la cheminée de pierre, posée sur
l'[âtre](stone-hearth.md), de 1,20 m à la sablière (2,50 m) ; le conduit monte dessus.

## Identité
- Clé : `chimney-hood`.
- Nom affiché : « hotte » (féminin).
- Nature : objet du monde (`props.json`), famille `éléments`, une pièce de bâtiment.
- Mains : aucune.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.6}` : 1,90 × 0,50 × 1,30 m (1,24 m³), creuse (la gorge où monte la fumée) : 1,8 t. Ne se déplace pas.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 190 × 50 × 130 cm ; boîte, `ground: true` (posée sur l'âtre : voir sa fiche).
- À l'écran : 38 × (26 + 10) = **38 × 36 px** ; de côté **10 × 64**.
- D'une seule largeur : un ressaut plus étroit en haut raccourcirait son dessus vu de côté (60 px au lieu de 64, hors gabarit) ; le
  ressaut des hottes de pays est marqué par un cordon de pierre de taille de 10 cm à 70 cm du bas.

## Vues
Deux (`symmetric`) : est-ouest et nord-sud (`chimney-hood-ns`). Moellons de calcaire au mortier de chaux, assises de 25 cm, les
angles en pierre de taille alternés long et court, le cordon, le bas assombri par la fumée qui lèche le manteau ; le dessus en dalles
(le conduit s'y pose).

## Variantes naturelles
Aucune : maçonnerie.

## Regroupement
Seule.

## Gestes
Mode construction : posée sur l'âtre (tools/lib/maison-xeros.ts : x 685, y 30, z 120).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Montée par le maçon : moellons, mortier de chaux, pierre de taille aux angles.

## Devenir
Elle reste.

## Transformations
Aucune.

## Métier
Le maçon (`mason`).

## Vérification
`.art-preview/maison-pieces.png` (avant-dernière rangée, et la cheminée montée), `.art-preview/chimney-hood.png`.
