# Pignon en bardage (`board-gable`)

Décidé le 31 octobre 2026 (chantier « bâtiments », la grange) : le triangle au-dessus de la sablière d'un mur de bout de la grange,
sous les deux pans du toit ; il porte le bout du faîtage.

## Identité
- Clé : `board-gable` (objet du monde, `props.json`), sans `take`.
- Nom affiché : pignon en bardage (masculin).
- Nature : le même bardage que les murs (`board-wall` : planches fendues debout, couvre-joints), coupé suivant les deux rampants,
  chevillé sur la sablière et sur les lisses du dedans.
- Mains : aucune.

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.09}` sur la boîte de ses `dims` (520 × 20 × 220 cm : un pentagone de bardage et ses
  lisses), bois vert 900 kg/m³ : **185 kg**. Ne se porte pas d'un bloc.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 5,20 m de base (sur la sablière du mur de bout, sans aller jusqu'aux deux bords de la grange, qui sont sous les rives basses des
  pans : un pan se pose sur le plus haut dessus de sa rive), 2,20 m au sommet, 20 cm d'épaisseur (comme le bardage) : boîte debout ;
  silhouette de face, un pentagone (deux petits côtés de 30 cm aux bouts, puis les rampants). Pente : 36°, celle des pans (2,60 m
  sur 3,40 m, 37°) à l'épaisseur du toit près.
- 2,20 m pour que le faîtage (une poutre de 30 cm, contour compris) posé sur son sommet (5,62 m) ait son dessus (5,92 m) sous le faîte
  des pans (6,02 m).
- À l'écran, de face (r0, r2) : 104 × 46 px (45 dessinés) ; de chant (r1, r3) : 5 × 97 px. Dans la grange, les pignons sont à l'est et à
  l'ouest : on les voit de chant.

## Vues
- Quatre (`four`), debout : r0, la face du dehors (au sud) ; r2, le dedans ; r1, r3 : de chant, un profil mince qui monte jusqu'au
  sommet et redescend.

## Variantes naturelles
Aucune.

## Regroupement
Seul ; deux par grange.

## Gestes
- Mode construction : clic gauche le pose sur la sablière d'un mur de bout, R le tourne (à l'ouest : face du dehors à l'ouest, r1 ; à
  l'est, r3), clic droit le retire.
- En jeu : il ne bloque pas (posé au-dessus de 2 m).

## Origine
Comme le pan de bardage : planches de la chaîne du gros bois (`rive-plank`), couvre-joints, chevilles. Pas encore fabriqué en jeu.

## Devenir
Il reste sous le toit.

## Transformations
Aucune pour l'instant.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/board-gable*.png` ; `.art-preview/grange.png`.
- `npm run test:grange` pose les deux pignons et le faîtage dessus.
