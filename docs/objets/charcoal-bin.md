# Coffre à charbon (`charcoal-bin`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : la réserve de charbon de bois du jour, près du feu ; le gros stock est dans l'abri à charbon.

## Identité
- Clé : `charcoal-bin`.
- Nom affiché : « coffre à charbon » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take` : un coffre de planches ouvert en haut, le charbon à ras.
- Mains : aucune.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` ; dans la forge, vieux, noirci de poussier).

## Masse
`{"matter": "wood", "fill": 0.05}` sur la boîte de ses `dims` (1 × 1 × 0,70 m, 0,70 m³) : 0,035 m³ de bois vert, **31,5 kg** (des
planches minces, environ 1 cm sur les quatre côtés et le fond, et les montants). Le charbon n'est pas compté : la matière `charcoal`
n'existe pas encore (à ras, environ 0,6 m³ à 200–250 kg/m³ : 120 à 150 kg ; densité de connaissance générale, non sourcée).

## Dimensions (gabarit, docs/STYLE.md section 8)
- 100 × 100 × 70 cm de haut, contour compris ; boîte.
- Place dans l'atelier : x 45–145, y 410–510, contre le bardage ouest.
- À l'écran, de toutes ses faces : 20 × (14 + 10) = **20 × 24 px**.

## Vues
Quatre (`four` : un devant, plus bas, par où l'on puise à la pelle ; un dos) ; le charbon noir et mat à ras du bord.

## Variantes naturelles
Aucune.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose au sol, R le tourne (le devant), clic droit le retire.
- En jeu : il bloque son emprise. Plus tard : y prendre du charbon (le sac de charbon, `charcoal-sack`, pas encore au jeu).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Assemblé par le charpentier : planches de la chaîne du gros bois, montants, chevilles. Pas encore fabriqué en jeu.

## Devenir
Il reste ; on le remplit de l'abri à charbon.

## Transformations
Aucune.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues au gabarit, Xéros à côté ; ses trois âges.
- `npm run test:forge` (à venir) ; `npm run check`.
