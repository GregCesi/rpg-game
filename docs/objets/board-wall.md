# Pan de bardage (`board-wall`)

Décidé le 31 octobre 2026 (chantier « bâtiments », la grange) : un module de mur en bardage de planches debout à couvre-joints, posé
entre deux poteaux d'une ossature (deux modules par travée de 2,40 m).

## Identité
- Clé : `board-wall` (objet du monde, `props.json`), sans `take`.
- Nom affiché : pan de bardage (masculin).
- Nature : des planches fendues (la planche du gros bois, `plank` de wood.json : 3 × 25 cm) posées debout, jointives, chevillées sur
  deux lisses horizontales côté dedans (les lisses sont chevillées à la face du dehors des poteaux : le bardage passe devant
  l'ossature) ; sur chaque joint, un couvre-joint (une latte étroite refendue dans une planche) qui empêche
  l'eau d'entrer. Un module se raccorde à son voisin : son bord tombe sur un joint, que le couvre-joint d'un des deux recouvre.
- Mains : aucune (il se monte planche à planche ; ici, un module).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.18}` sur la boîte de ses `dims` (120 × 20 × 312 cm : planches de 3 cm sur toute la
  face, couvre-joints et lisses), bois vert 900 kg/m³ : **121 kg**. Ne se porte pas d'un bloc.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 1,20 m de large (la moitié d'une travée de 2,40 m entre deux poteaux de 40 cm), 3,12 m de haut (du sol au dessous de la sablière :
  les poteaux de 3 m sur leurs dalles de 12 cm), 20 cm d'épaisseur (les lisses, 10 cm, puis les planches et leurs couvre-joints) :
  boîte debout. 20 et pas 6 : posé contre la face du dehors des poteaux, il tombe ainsi sur la grille de 20 cm (le mode construction
  aimante les bords à moins de 10 cm, et un pan mince s'y décalait d'un pan à l'autre).
- À l'écran, de face (r0, r2) : 24 × 64 px (63 dessinés) ; de chant (r1, r3) : 5 × 75 px.

## Vues
- Quatre (`four`), debout : r0, la face du dehors (au sud) : les planches, leurs couvre-joints en relief, le bas plus sombre ; r2, la
  face du dedans : les planches et les deux lisses ; r1, r3 : de chant.
- Fantôme : en mode construction, lui-même en transparence.

## Variantes naturelles
Aucune : un ouvrage de charpentier, régulier.

## Regroupement
Côte à côte : deux modules font une travée ; posés bord à bord, ils se lisent comme un seul mur.

## Gestes
- Mode construction : clic gauche le pose au sol entre deux poteaux, contre leur face du dehors, R le tourne (sa face du dehors : au nord r2,
  à l'ouest r1, à l'est r3), clic droit le retire.
- En jeu : il bloque le passage (`body`, sous 2 m).

## Origine
Pas encore fabriqué en jeu. Les planches viennent de la chaîne du gros bois : bille, demi-billes, quartiers (coin, masse), planches
fendues au coutre (`rive-plank`, jouable par « Transformer ») ; les couvre-joints, une planche refendue ; les lisses, des perches
(`pole`) ou des planches ; chevilles (`peg`) au maillet.

## Devenir
Il reste au mur.

## Transformations
Aucune pour l'instant (l'assemblage viendra avec les gestes de charpente).

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/board-wall*.png` ; la grange : `.art-preview/grange.png`.
- `npm run test:grange` en pose dix-huit, deux par travée.
