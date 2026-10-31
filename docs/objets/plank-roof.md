# Pan de toit en planches (`plank-roof`, `plank-roof-large`)

Décidé le 31 octobre 2026 (chantier « cabane en rondins ») : un des deux pans du toit de la cabane de bûcheron, posé de la rive
basse (l'avant-toit, sur le dernier rondin du mur) à la faîtière. Le **grand pan** (`plank-roof-large`, chantier « bâtiments », la
grange) est le même pan à une autre taille : mêmes planches, même dessin, tiré des mêmes fonctions (`art/lib/plank-roof.ts`).

## Identité
- Clés : `plank-roof` (objet du monde, `props.json`), sans `take` ; `plank-roof-large` (le grand pan de la grange).
- Nom affiché : pan de toit en planches (masculin) ; grand pan de toit en planches.
- Nature : un élément composé de planches fendues (la planche du gros bois, `plank` de wood.json : 3 × 25 cm) posées dans le sens de
  la pente, sur deux épaisseurs à joints croisés (la seconde couvre les joints de la première), chevillées à la faîtière et au
  rondin de rive. Pièce de toit (`roof`) : elle s'efface quand Xéros est dessous.
- Mains : aucune (il se monte planche à planche ; ici, un seul élément).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.067}` sur la boîte de ses `dims` (480 × 200 × 100 cm, 9,6 m³) : deux épaisseurs de
  3 cm sur la longueur de la pente (2,24 m) et 4,8 m, soit 0,645 m³, **580 kg** de bois vert. Ne se porte pas d'un bloc. (Corrigé le
  31 octobre 2026 : la fiche disait 0,062 m³ et 60 kg, une erreur d'un facteur dix.)
- Le grand pan : `{"matter": "wood", "fill": 0.029}` sur 960 × 340 × 260 cm (84,9 m³) : deux épaisseurs de 3 cm sur une pente de
  4,28 m et 9,6 m de long, 2,47 m³, **2,2 t**.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Dans sa vue 0 : 4,80 m le long du faîtage (est-ouest), 2 m de la rive basse au faîtage (nord-sud), 1 m de pente (100 cm de haut,
  épaisseur comprise) : environ 22°. Le côté bas est au sud dans la vue 0 (`pitch: "south"`) ; un quart de tour le met à l'ouest
  (r1), au nord (r2), à l'est (r3).
- **Pièce de bâtiment qui relie des appuis** (`ground: true`) : sa profondeur se voit à l'échelle du sol. r0 et r2 :
  W = 96 ; H + D = 20 + 40 = **96 × 60 px** ; r1 et r3 : **40 × 116 px**.
- Le grand pan : 9,60 m le long du faîtage, 3,40 m de la rive basse au faîtage, 2,60 m de pente (37°, un toit à foin) ; r0 et r2
  192 × 120 px, r1 et r3 68 × 244 px.
- **Sans rangées vides sous lui** : en mode construction, sa hauteur (`z`) le relève ; sa base est le dessus de ce qui porte sa rive
  basse (le rondin de rive).

## Vues
- Quatre (`four`), chacune le pan vu de dessus en trois quarts : le plan incliné de planches dans le sens de la pente, joints entre
  planches, le recouvrement de la seconde épaisseur, la rive basse (bout des planches, plus sombre) du côté bas, l'arête du faîtage
  du côté haut ; les têtes de chevilles le long du faîtage et de la rive. Lumière en haut à gauche : le pan tourné vers l'ouest ou le
  nord un peu plus clair que celui tourné vers l'est ou le sud. Pas d'ombre peinte.

## Variantes naturelles
Aucune.

## Regroupement
Deux pans font un toit à deux versants ; ils se rejoignent au faîtage.

## Gestes
- Mode construction : clic gauche le pose, sa rive basse sur le dessus de ce qu'il y a dessous (le rondin de rive), R le tourne
  (le côté bas), clic droit le retire. Il ne se heurte pas à ce qui est sous sa pente (pignon, faîtière).
- En jeu : il ne bloque pas (posé au-dessus de 2 m) ; il s'efface quand Xéros passe dessous.

## Origine
Pas encore fabriqué en jeu. Plus tard : les planches fendues au coutre dans les quartiers du gros bois (transforms.json, déjà
jouable par « Transformer »), chevillées (tarière, chevilles `peg`, maillet) ; le charpentier ou le fendeur.

## Devenir
Il reste sur le toit.

## Transformations
Aucune pour l'instant.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/plank-roof*.png` ; la cabane : `.art-preview/cabane.png`.
- `npm run test:cabane` pose les deux pans ; `npm run test:grange` les deux grands pans (`.art-preview/grange.png`).
