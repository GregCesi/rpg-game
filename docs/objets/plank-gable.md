# Pignon en planches (`plank-gable`)

Décidé le 31 octobre 2026 (chantier « bâtiments », finition de la cabane, réponse de Grégoire : « pignons fermés en planches
fendues, pas de rondins en biais pour l'instant ») : il ferme le triangle au-dessus du dernier rondin d'un mur de bout de la
cabane, sous les deux pans de toit, et porte la faîtière.

## Identité
- Clé : `plank-gable` (objet du monde, `props.json`), sans `take` (il se pose en mode construction).
- Nom affiché : pignon en planches (masculin).
- Nature : des planches fendues (la planche du gros bois, `plank` de wood.json : 3 × 25 cm) posées debout, jointives, coupées en
  haut suivant les deux pentes du toit, chevillées en bas sur le dernier rondin du mur et, côté dedans, sur une traverse.
- Mains : aucune (il se monte planche à planche ; ici, un seul élément).
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` : neuf, patiné, vieux ; ses images à trois âges, la même grille peinte de la rampe de l'âge ; CONCEPTION « L'âge du bois »).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.25}` sur la boîte de ses `dims` (260 × 6 × 60 cm : un pentagone de planches de
  3 cm, à peu près la moitié de la face, plus la traverse), bois vert 900 kg/m³ : **21 kg**. Ne se porte pas d'un bloc.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 260 cm de large (entre les faces intérieures des deux murs nord-sud de la cabane), 60 cm de haut au sommet, 6 cm d'épaisseur
  (planches et traverse) : boîte debout. Silhouette de face : un pentagone, deux petits côtés verticaux aux bouts, deux rampants.
- 60 cm et pas le mètre de la pente du toit : le pignon porte la faîtière (40 cm, contour compris) sur son sommet, et le dessus de
  la faîtière arrive au faîte des pans (2,52 m + 0,60 + 0,40 = 3,52 m).
- À l'écran, de face (r0, r2) : 52 × 13 px ; de chant (r1, r3) : environ 3 × 38 px.

## Vues
- Quatre (`four`), debout : r0, la face du dehors (tournée au sud) : les planches debout, leurs joints, le fil, les têtes de
  chevilles le long du bas ; r2, la face du dedans : les planches et la traverse ; r1, r3 : de chant.
- Fantôme : en mode construction, lui-même en transparence.

## Variantes naturelles
Aucune : un ouvrage de charpentier, régulier.

## Regroupement
Seul ; deux par cabane (un sur chaque mur de bout).

## Gestes
- Mode construction : clic gauche le pose sur le dernier rondin d'un mur de bout, R le tourne (au nord : la face du dehors au nord,
  vue r2), clic droit le retire.
- En jeu : il ne bloque pas (posé au-dessus de 2 m).

## Origine
Pas encore fabriqué en jeu. Les planches viennent de la chaîne du gros bois : la bille fendue en demi-billes puis en quartiers
(coin, masse), les planches fendues au coutre dans un quartier (`rive-plank` de transforms.json, jouable par « Transformer »),
recoupées à la pente, chevillées (chevilles `peg`, maillet).

## Devenir
Il reste sous le toit.

## Transformations
Aucune pour l'instant (son assemblage viendra avec les gestes de charpente).

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/plank-gable*.png` ; la cabane : `.art-preview/cabane.png` (« les pignons en planches et la faîtière »).
- `npm run test:cabane` pose les deux pignons et la faîtière dessus.
