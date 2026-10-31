# Porte charretière (`cart-door`)

Décidée le 31 octobre 2026 (chantier « bâtiments », la grange) : la grande porte à deux battants du mur sud de la grange, assez large
pour faire entrer une charrette.

## Identité
- Clé : `cart-door` (objet du monde, `props.json`), sans `take`.
- Nom affiché : porte charretière (féminin).
- Nature : deux battants de 1,20 m, chacun de planches fendues debout tenues par deux traverses et une écharpe en Z, chevillées ; ils
  tournent sur de gros pivots de bois pris dans le seuil et la sablière ; une barre de fermeture en travers, côté dedans.
- Mains : aucune (elle se monte sur place).
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` : neuf, patiné, vieux ; ses images à trois âges, la même grille peinte de la rampe de l'âge ; CONCEPTION « L'âge du bois »).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.165}` sur la boîte de ses `dims` (240 × 20 × 312 cm), bois vert 900 kg/m³ : **222 kg**
  (111 kg par battant). Ne se porte pas.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 2,40 m de large (la travée du milieu, entre deux poteaux), 3,12 m de haut (du sol au dessous de la sablière), 20 cm d'épaisseur
  (dans le plan du bardage, contre la face du dehors des poteaux, ses pivots et la barre compris) : boîte debout. Une charrette de
  1,60 à 1,80 m passe.
- À l'écran, de face (r0, r2) : 48 × 64 px (63 dessinés) ; de chant (r1, r3) : 5 × 87 px.

## Vues
- Quatre (`four`), debout : r0, la face du dehors (au sud) : les planches, les deux Z, la fente entre les battants, les pivots ; r2,
  la face du dedans : les planches et la barre ; r1, r3 : de chant.
- Fantôme : en mode construction, elle-même en transparence.

## Variantes naturelles
Aucune : un ouvrage de menuisier, régulier.

## Regroupement
Seule.

## Gestes
- Mode construction : clic gauche la pose au sol entre les deux poteaux de la travée du milieu, R la tourne, clic droit la retire.
- En jeu : fermée, elle bloque le passage (`body`). L'ouvrir (chaque battant sur son pivot) viendra : elle a deux gonds, un par
  battant, ce que le battant simple (`swing`, le volet) ne sait pas encore faire.

## Origine
Pas encore fabriquée en jeu. Les planches de la chaîne du gros bois (`rive-plank`), les traverses et les écharpes en planches, des
chevilles (`peg`) au maillet ; le menuisier la fait.

## Devenir
Elle reste dans son ouverture.

## Transformations
Aucune pour l'instant.

## Métier
Le menuisier (`joiner`).

## Vérification
- `.art-preview/cart-door*.png` ; `.art-preview/grange.png`.
- `npm run test:grange` la pose dans la travée du milieu du mur sud.
