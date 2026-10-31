# Volet d'étal (`stall-shutter`, `stall-shutter-open`)

Décidé le 31 octobre 2026 (chantier « bâtiments », l'étal de la place) : « un volet d'étal qui se rabat en comptoir ». Fermé, il clôt
le haut de la face de l'étal au-dessus du devant bas ; rabattu vers la rue, il devient le comptoir où le marchand pose sa marchandise.

## Identité
- Clés : `stall-shutter` (fermé, debout) et `stall-shutter-open` (rabattu en comptoir), deux objets du monde (`props.json`), les deux
  états du même volet (`swing`, gond `bottom`).
- Nom affiché : volet d'étal (masculin) ; « volet d'étal (rabattu en comptoir) ».
- Nature : des planches fendues debout, jointives, deux traverses au dedans, chevillées ; il tourne sur deux gros gonds de bois pris
  dans le rebord du devant ; un loquet de bois le tient fermé.
- Mains : deux (plus tard) ; il se pose en mode construction.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` : neuf, patiné, vieux ; ses images à trois âges, la même grille peinte de la rampe de l'âge ; CONCEPTION « L'âge du bois »).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.8}` sur 160 × 4 × 90 cm (fermé) ou 160 × 90 × 4 (rabattu, la même boîte tournée),
  bois vert 900 kg/m³ : **41 kg**. Porté à deux mains, lentement (au-dessus de 25 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Fermé : 1,60 m de large (entre les poteaux de devant), 90 cm de haut (de 1 m, le dessus du devant, à 1,90 m, sous la sablière),
  4 cm d'épaisseur ; de face 32 × 18 px.
- Rabattu : 1,60 m de large, 90 cm de profondeur vers la rue, 4 cm d'épaisseur, son dessus à 1 m : de face 32 × 10 px (le dessus
  et sa tranche) ; r1, r3 18 × 17 px.

## Vues
- Quatre (`four`) par état. Fermé : r0 dehors (planches, loquet, gonds en bas), r2 dedans (traverses), r1, r3 de chant. Rabattu : le
  volet a tourné sur son bas vers la rue, sa face du dedans en dessus : le dessus du comptoir montre ses planches (qui courent
  maintenant vers la rue) et ses deux traverses chevillées en relief, les gonds au bord nord, et sa tranche.
- Fantôme : en mode construction, lui-même en transparence.

## Variantes naturelles
Aucune.

## Regroupement
Seul, un par étal.

## Gestes
- Mode construction : clic gauche le pose fermé sur le devant bas (son rebord le porte), R le tourne, clic droit le retire.
- En jeu, **E** devant lui : il se rabat en comptoir (gond `bottom` : `swung` de world/build.ts le pose contre la face du dehors du
  fermé, son dessus à la hauteur de la base du fermé) ; E encore, il se relève et ferme l'étal. Il ne bloque pas (pas de collision).
- Ce qui manque : rabattu, il tient en l'air (en vrai, deux chaînes ou deux jambes de force le portent : à dessiner avec le premier
  marchand).

## Origine
Pas encore fabriqué en jeu : des planches fendues au coutre (`rive-plank`), deux traverses, des chevilles (`peg`) ; le menuisier.

## Devenir
Il reste à l'étal.

## Transformations
Aucune pour l'instant.

## Métier
Le menuisier (`joiner`).

## Vérification
- `.art-preview/stall-shutter*.png` ; `.art-preview/etal.png` (la dernière image : l'étal ouvert, en jeu).
- `npm run test:etal` le pose fermé, sort du mode construction, le rabat en comptoir et le relève avec E.
