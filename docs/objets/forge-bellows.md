# Soufflet de forge (`forge-bellows`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : le grand soufflet double qui souffle le feu de la [forge](forge-hearth.md), sur son bâti, avec sa perche.

## Identité
- Clé : `forge-bellows`.
- Nom affiché : « soufflet de forge » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take`. Un soufflet **à deux vents** : deux tables de bois en
  poire, le cuir plissé entre elles, la buse de fer au bout étroit, le tout sur un bâti ; la **perche** qui le manœuvre.
- Mains : aucune.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` : neuf, patiné, vieux ; dans la forge, vieux).

## Masse
`{"matter": "wood", "fill": 0.08}` sur la boîte de ses `dims` (1,80 × 0,75 × 1,10 m, 1,49 m³) : 0,12 m³ de bois vert, **107 kg**. Le
cuir (une dizaine de kg) et la buse de fer ne sont pas comptés (le cuir n'est pas une matière du jeu). Il ne se porte pas (107 kg,
Xéros en porte 70).

## Dimensions (gabarit, docs/STYLE.md section 8)
- 180 (sa longueur) × 75 × 110 cm de haut (le dessus de la table haute), contour compris ; boîte.
- Dans l'atelier il est nord-sud, contre le bardage ouest (x 45–145, y 60–240) : sa buse au nord entre dans la tuyère de la joue ouest
  de la forge (vue r3, si r0 a la buse à l'est).
- À l'écran, en long (r0, r2) : 36 × (22 + 7,5) = **36 × 30 px** ; en travers (r1, r3) : 15 × (22 + 18) = **15 × 40 px**.

## Vues
Quatre (`four` : un bout étroit et sa buse, un bout large) ; le cuir plissé, les tables, le bâti, la perche.

## Variantes naturelles
Aucune.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose au sol, R le tourne (la buse), clic droit le retire.
- En jeu : il bloque son emprise. Un geste plus tard (tirer la perche pour souffler le feu).

## Travail
Aucun pour l'instant.

## Arme
Aucune.

## Origine
Fait par le menuisier (les tables, le bâti), le cuir par un bourrelier (pas encore au jeu), la buse par le forgeron. Pas encore
fabriqué en jeu.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Le menuisier (`joiner`).

## Points ouverts
- **La perche** : dans le réel, une perche de 2,50 m pivote au-dessus du soufflet et revient au devant de la forge, à la main du
  forgeron (CADRAGE-forge.md, section 2). Elle sort de la boîte de 180 × 75 × 110 : soit le dessin la garde dans la boîte (couchée
  ou raccourcie), soit elle devient une pièce à part (une perche de bois, `wood-piece`). À trancher avec le dessin.

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues au gabarit, Xéros à côté, la buse contre la joue de la forge.
- `npm run test:forge` (à venir) ; `npm run check` (ses trois âges).
