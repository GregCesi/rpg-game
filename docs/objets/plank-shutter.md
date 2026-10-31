# Volet en planches (`plank-shutter`, `plank-shutter-open`)

Décidé le 31 octobre 2026 (chantier « bâtiments », finition de la cabane, réponse de Grégoire : « un volet de planches à la
fenêtre, qui s'ouvre et se ferme en jeu ») : le volet de la fenêtre de la cabane (une ouverture de 60 × 40 cm dans le mur est). Le
premier objet qui s'ouvre et se ferme.

## Identité
- Clés : `plank-shutter` (fermé) et `plank-shutter-open` (ouvert), deux objets du monde (`props.json`) qui sont les deux états du
  même volet (`swing`, chacun nomme l'autre ; le même dessin, `image: plank-shutter`).
- Nom affiché : volet en planches (masculin) ; « volet en planches (ouvert) ».
- Nature : trois planches fendues debout, deux traverses et une écharpe du côté du dedans, chevillées ; il tourne sur deux gonds
  de bois sur son bord gauche vu du dehors (pas de ferrure, comme la porte).
- Mains : une (plus tard, quand il se prendra) ; aujourd'hui il se pose en mode construction.

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.8}` sur la boîte de ses `dims` (60 × 4 × 40 cm), bois vert 900 kg/m³ : **6,9 kg**.
  Porté d'une main, marche normale.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 60 × 40 cm, 4 cm d'épaisseur (planches de 3 cm et traverses) : boîte debout ; il remplit l'ouverture de la fenêtre.
- À l'écran, de face (r0, r2) : 12 × 8 px ; de chant (r1, r3) : environ 3 × 14 px.

## Vues
- Quatre (`four`), debout : r0, la face du dehors (au sud) : les trois planches, les têtes de chevilles des traverses ; r2, la face
  du dedans : les traverses et l'écharpe ; r1, r3 : de chant.
- Ouvert : le même dessin dans la vue suivante (il a tourné d'un quart sur son gond) : dans le mur est de la cabane, fermé il est
  vu de chant (r3), ouvert il sort du mur vers l'est et montre sa face du dehors (r0).
- Fantôme : en mode construction, lui-même en transparence.

## Variantes naturelles
Aucune : un ouvrage de menuisier, régulier.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose dans l'ouverture (sur le rondin du dessous, avant l'assise du dessus : la visée prend le
  plus haut dessus), R le tourne (sa face du dehors), clic droit le retire.
- En jeu, **E** devant lui : il s'ouvre (un quart de tour vers le dehors autour de son gond, le bord gauche de sa face du dehors vu
  du dehors), E encore : il se referme à sa place. `swung` (world/build.ts) calcule l'autre état ; GameState le note (`builds`,
  `addBuildPieces` avec son identifiant) ; la carte le redessine. Refusé (« Xéros est dans le passage. ») seulement si, ouvert, il
  bloquerait Xéros : le volet, sans collision et en hauteur, ne bloque jamais.

## Origine
Pas encore fabriqué en jeu. Plus tard : des planches fendues au coutre dans un quartier du gros bois (`rive-plank` de
transforms.json), recoupées, deux traverses, des chevilles (`peg`) enfoncées au maillet ; le menuisier le fait et le vend.

## Devenir
Il reste à sa fenêtre.

## Transformations
Aucune pour l'instant.

## Métier
Le menuisier (`joiner`).

## Vérification
- `.art-preview/plank-shutter*.png` ; `.art-preview/cabane.png` (la dernière image : le volet ouvert, en jeu).
- `npm run test:cabane` le pose dans la fenêtre, sort du mode construction, l'ouvre et le referme avec E.
