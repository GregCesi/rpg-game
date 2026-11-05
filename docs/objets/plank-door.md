# Porte en planches (`plank-door`)

Décidée le 31 octobre 2026 (chantier « cabane en rondins ») : la porte de la cabane de bûcheron, qui ferme l'ouverture laissée dans
le mur sud (rondins recoupés de part et d'autre).

## Identité
- Clés : `plank-door` (fermée) et `plank-door-open` (ouverte) (objets du monde, `props.json`), sans `take` pour l'instant (elle se pose en mode construction).
- Nom affiché : porte en planches (féminin).
- Nature : un vantail : des planches fendues jointives posées debout, tenues par deux traverses et une écharpe en diagonale (le Z),
  chevillées ; elle tourne sur deux pivots de bois pris dans le seuil et le linteau (pas de ferrure : la cabane n'a pas de forgeron).
- Mains : deux (plus tard).
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` : neuf, patiné, vieux ; ses images à trois âges, la même grille peinte de la rampe de l'âge ; CONCEPTION « L'âge du bois »).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.5}` sur la boîte de ses `dims` (100 × 6 × 210 cm : la moitié de la boîte est du
  bois, les planches de 3 cm et les traverses), bois vert 900 kg/m³ : **56,7 kg**. Portée, lentement (au-dessus de 25 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- 100 cm de large, 210 cm de haut, 6 cm d'épaisseur (3 de planches, 3 de traverses) : boîte debout. 2,10 m depuis le chantier
  « hauteurs » (5 novembre 2026, réponse 4 de Grégoire) : du seuil (12 cm) au linteau de la cabane, la 8e assise de rondins de 30 cm.
- À l'écran, face (r0, r2) : 20 × (42 + 0,6) ≈ **20 × 43 px** ; de chant (r1, r3) : 1,2 px de large, agrandi au plancher de
  lisibilité, environ 3 × 52 px.

## Vues
- Quatre (`four`), debout :
  - r0, la face du dehors (tournée au sud) : cinq planches debout, joints sombres, fil vertical, un nœud ou deux, le haut un peu
    usé ; les têtes de chevilles des traverses (deux rangées de points) ; le pivot dépasse en haut et en bas d'un côté.
  - r2, la face du dedans : les planches, les deux traverses et l'écharpe en Z.
  - r1, r3 : la porte vue de chant (sa tranche, planche et traverse).
- Fantôme : en mode construction, elle-même en transparence.

## Variantes naturelles
Aucune : un ouvrage de menuisier, régulier.

## Regroupement
Seule.

## Gestes
- Mode construction : clic gauche la pose (dans l'ouverture d'un mur, sur le sol ou un seuil), R la tourne, clic droit la retire.
- En jeu (chantier « intérieurs ») : fermée, elle bloque le passage ; **E** devant elle l'ouvre : un quart de tour vers le dehors
  sur son pivot (le bord gauche de sa face du dehors vu du dehors), comme le volet ; E encore la referme. Deux états, deux clés :
  `plank-door` et `plank-door-open` (`swing`, le même dessin dans la vue suivante), `passage` : ouverte, on passe, et marcher dans
  son ouverture fait entrer dans le bâtiment (CONCEPTION « Les intérieurs »).

## Origine
Pas encore fabriquée en jeu. Plus tard : des planches fendues au coutre dans un quartier (transforms.json), deux traverses et une
écharpe (planches), des chevilles (`peg`) enfoncées au maillet dans des trous percés à la tarière ; le menuisier la fait et la vend.

## Devenir
Elle reste dans son ouverture.

## Transformations
Aucune pour l'instant (son assemblage viendra avec les gestes de menuiserie).

## Métier
Le menuisier (`joiner`).

## Vérification
- `.art-preview/plank-door*.png`, et la cabane : `.art-preview/cabane.png`.
- `npm run test:cabane` la pose dans l'ouverture de la cabane.
