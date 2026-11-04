# Four de forge (`forge-oven`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : le four de l'atelier, pour **chauffer** les grandes pièces que la forge ne prend pas et **recuire** le fer.
Ce n'est pas le four de la fonderie à venir (CADRAGE-forge.md, section 4).

## Identité
- Clé : `forge-oven`.
- Nom affiché : « four de forge » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take`.
- Mains : aucune.
- Âge : aucun (pierre et terre).

## Masse
`{"matter": "stone", "fill": 0.35}` sur la boîte de ses `dims` (1,40 × 1,40 × 1,30 m, 2,55 m³) : 0,89 m³, **2,1 t**. La voûte est de
terre (1 800 kg/m³), pesée ici comme le socle, en calcaire : une seule matière par objet. Il ne se déplace pas.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 140 × 140 × 130 cm de haut, contour compris ; boîte. Un socle de pierre, la sole dessus, la **voûte de terre** en dôme, la
  **bouche au sud** et sa porte de fer. Mesures choisies faute de source (CADRAGE-forge.md, section 3).
- Place dans l'atelier : x 560–700, y 45–185, contre le bardage nord, dans la travée du milieu.
- `ground: true`, comme la forge. À l'écran, de toutes ses faces : 28 × (26 + 28) = **28 × 54 px**.

## Vues
Quatre (`four`, il a une bouche) : r0, la bouche au sud ; r1, r3, le flanc du dôme sur son socle ; r2, le dos. Le feu : à décider avec
le dessin (point ouvert) ; s'il est allumé, comme la forge (`anim: burn`, `light` à la bouche).

## Variantes naturelles
Aucune.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose au sol, R le tourne (la bouche), clic droit le retire.
- En jeu : il bloque toute son emprise.

## Travail
Aucun pour l'instant.

## Arme
Aucune.

## Origine
Bâti par le maçon : socle de moellons, voûte de terre montée sur un cintre. Pas encore fabriqué en jeu.

## Devenir
Il reste.

## Transformations
Aucune pour l'instant (plus tard : le poste de « recuire »).

## Métier
Le maçon (`mason`).

## Points ouverts
- **Pas de conduit à lui pour l'instant** : il tire par sa bouche, et l'atelier est ouvert au sud ; le pan nord n'est percé que pour la
  forge. Dans le réel, un four sans conduit enfume l'atelier sous le toit ; le cadrage proposait un petit conduit à travers le pan nord
  (question 4) : à reprendre si on le veut.

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues au gabarit, Xéros à côté.
- `npm run test:forge` (à venir) ; `npm run check`.
