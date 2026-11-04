# Pignons en bardage à 45° et à 55° (`board-gable-tall`, `board-gable-steep`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées ; **la charpente de la forge est celle de la grange relevée à 45°**, poinçons de 3 m sous les pans à 45°, de 4,40 m sous les lauzes à 55°, au lieu de 2,20) : le
[pignon en bardage](board-gable.md) de la grange, relevé à la pente des nouvelles couvertures. **`board-gable-tall`** (45°) va sous
les pans de [bardeaux](shingle-roof-large.md) (la forge) et de [tuiles plates](tile-roof-large.md) ; **`board-gable-steep`** (55°)
sous les pans de [lauzes](lauze-roof-large.md).

## Identité
- Clés : `board-gable-tall`, `board-gable-steep`.
- Nom affiché : pignon en bardage à 45° ; pignon en bardage à 55° (masculin).
- Nature : objet du monde (`props.json`), famille `éléments`, sans `take` : le même bardage que les murs (`board-wall` : planches
  fendues debout, couvre-joints), coupé suivant les deux rampants, chevillé sur la sablière et sur les lisses du dedans. Il porte le
  bout du faîtage.
- Mains : aucune.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` ; à la forge, vieux).

## Masse
- `board-gable-tall` : `{"matter": "wood", "fill": 0.091}` sur 520 × 20 × 300 cm (3,12 m³) : **256 kg**. Le pentagone fait 8,84 m²
  (520 × 40, plus le triangle de 520 sur 260) : 29 kg/m², comme le pignon de la grange (185 kg sur 6,5 m²).
- `board-gable-steep` : `{"matter": "wood", "fill": 0.087}` sur 520 × 20 × 440 cm (4,58 m³) : **358 kg**, sur 13,26 m² (520 × 70,
  plus le triangle de 520 sur 370) : 27 kg/m².
- Ni l'un ni l'autre ne se porte d'un bloc.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Les deux : 5,20 m de base sur la sablière du mur de bout, 20 cm d'épaisseur ; boîte debout ; de face, un pentagone (deux petits
  côtés aux bouts, puis les rampants).
- `board-gable-tall` : **3 m** au sommet (bouts de 40 cm) ; les rampants montent de 260 cm sur 260 : **45°**, la pente des pans. Sur
  la sablière à 3,42 m, son sommet est à 6,42 m, à la hauteur du sommet des poinçons de 3 m : le faîtage (30 cm) pose dessus, son
  dessus à 6,72 m, sous le faîte des pans (6,82 m).
- `board-gable-steep` : **4,40 m** au sommet (bouts de 70 cm) ; les rampants montent de 370 cm sur 260 : **55°**. Son sommet à 7,82 m,
  avec les poinçons de 4,40 m ; le dessus du faîtage à 8,12 m, sous le faîte des lauzes (8,28 m).
- À l'écran, de face (r0, r2) : `board-gable-tall` 104 × (60 + 2) = **104 × 62 px**, dessiné 104 × 60 ; `board-gable-steep`
  104 × (88 + 2) = **104 × 90 px**, dessiné 104 × 89. De chant (r1, r3) : 4 × (60 + 52) = **4 × 112 px**, dessiné 5 × 112, et
  4 × (88 + 52) = **4 × 140 px**, dessiné 5 × 142 (sur 5 px de large, comme le pignon de la grange, dans la tolérance).

## Vues
- Quatre (`four`), debout, comme le pignon de la grange : r0, la face du dehors ; r2, le dedans, les lisses ; r1, r3, de chant, un
  profil mince qui monte jusqu'au sommet et redescend. Dans l'atelier, les pignons sont à l'est et à l'ouest : on les voit de chant.

## Variantes naturelles
Aucune.

## Regroupement
Seul ; deux par bâtiment.

## Gestes
- Mode construction : clic gauche le pose sur la sablière d'un mur de bout, R le tourne (à l'ouest : face du dehors à l'ouest, r1 ; à
  l'est, r3), clic droit le retire.
- En jeu : il ne bloque pas (posé au-dessus de 2 m).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Comme le pan de bardage : planches de la chaîne du gros bois (`rive-plank`), couvre-joints, chevilles. Pas encore fabriqué en jeu.

## Devenir
Il reste sous le toit.

## Transformations
Aucune pour l'instant.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/forge-pieces.png` : leurs quatre vues au gabarit, sous leurs pans ; leurs trois âges.
- `npm run test:forge` (à venir) pose les deux `board-gable-tall` et le faîtage dessus ; `npm run check`.
