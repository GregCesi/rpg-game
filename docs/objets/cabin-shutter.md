# Volet de cabane (`cabin-shutter`, `cabin-shutter-open`)

Décidé le 5 novembre 2026 (chantier « hauteurs », CADRAGE-hauteurs.md, réponse 5 de Grégoire : « un nouveau volet de cabane de
60 × 60, pas de vide ») : posés à leur hauteur vraie, les rondins de la cabane ont 30 cm de haut ; la fenêtre du mur est s'ouvre
sur deux assises (60 × 60 cm) et le volet en planches de 40 cm (`plank-shutter`, qui reste celui des fenêtres de la maison de
Xéros) ne la remplit plus. Le volet de cabane est le même ouvrage, haussé à 60 cm.

## Identité
- Clés : `cabin-shutter` (fermé) et `cabin-shutter-open` (ouvert), deux objets du monde (`props.json`) qui sont les deux états du
  même volet (`swing`, chacun nomme l'autre ; le même dessin, `image: cabin-shutter`).
- Nom affiché : volet de cabane (masculin) ; « volet de cabane (ouvert) ».
- Nature : trois planches fendues debout, deux traverses du côté du dedans, chevillées ; il tourne sur deux gonds de bois sur son
  bord gauche vu du dehors (pas de ferrure, comme la porte).
- Mains : une (plus tard, quand il se prendra) ; aujourd'hui il se pose en mode construction.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` : neuf, patiné, vieux ; CONCEPTION « L'âge du bois »).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.8}` sur la boîte de ses `dims` (60 × 4 × 60 cm), bois vert 900 kg/m³ : **10,4 kg**.
  Porté d'une main, marche normale.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 60 × 60 cm, 4 cm d'épaisseur : boîte debout ; il remplit l'ouverture de deux assises de la fenêtre.
- À l'écran, de face (r0, r2) : 12 × 12 px (plus la colonne des gonds) ; de chant (r1, r3) : 4 × 18 px.

## Vues
- Quatre (`four`), debout : r0, la face du dehors (au sud) : les trois planches, les têtes de chevilles ; r2, la face du dedans : les
  traverses ; r1, r3 : de chant.
- Ouvert : le même dessin dans la vue suivante (un quart de tour sur son gond), comme le volet en planches.
- Fantôme : en mode construction, lui-même en transparence.

## Variantes naturelles
Aucune : un ouvrage de menuisier, régulier.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose dans l'ouverture (sur le rondin de l'assise d'en dessous, avant les deux assises
  recoupées : la visée prend le plus haut dessus), R le tourne (sa face du dehors), clic droit le retire.
- En jeu, **E** devant lui : il s'ouvre, E encore : il se referme à sa place (`swung`, world/build.ts), comme le volet en planches.

## Origine
Pas encore fabriqué en jeu. Plus tard : des planches fendues au coutre (`rive-plank` de transforms.json), recoupées, deux traverses,
des chevilles (`peg`) ; le menuisier le fait et le vend.

## Devenir
Il reste à sa fenêtre.

## Transformations
Aucune pour l'instant.

## Métier
Le menuisier (`joiner`).

## Vérification
- `.art-preview/volet-cabane.png` (la planche de validation) ; `.art-preview/cabane.png` (la dernière image : le volet ouvert, en jeu).
- `npm run test:cabane` le pose dans la fenêtre, sort du mode construction, l'ouvre et le referme avec E.
