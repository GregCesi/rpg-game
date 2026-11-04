# Râtelier à outils (`tool-rack`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : le râtelier où pendent les pinces et les marteaux du forgeron, à portée de l'enclume.

## Identité
- Clé : `tool-rack`.
- Nom affiché : « râtelier à outils » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take` : deux montants, deux traverses à chevilles ; **les pinces
  et les marteaux pendus sont dessinés avec lui**, ce ne sont pas encore des objets (`tongs`, `smith-hammer`, `sledge` : CADRAGE-forge.md,
  section 3).
- Mains : aucune.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` ; dans la forge, vieux).

## Masse
`{"matter": "wood", "fill": 0.08}` sur la boîte de ses `dims` (120 × 15 × 100 cm, 0,18 m³) : 0,0144 m³ de bois vert, **13 kg**. Les
outils pendus (le fer : une dizaine de kg) ne sont pas comptés tant qu'ils ne sont pas des objets.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 120 × 15 × 100 cm de haut, contour compris ; boîte. Debout au sol contre le bardage, ses montants posés par terre (le jeu ne pend
  encore rien à un mur).
- Place dans l'atelier : x 45–60, y 270–390, contre le bardage ouest, entre le soufflet et le coffre à charbon : il y est nord-sud, vu
  de chant.
- À l'écran, de face (r0, r2) : 24 × (20 + 1,5) = **24 × 22 px** ; de chant (r1, r3) : 3 × (20 + 12) = **3 × 32 px**, à sa taille
  réelle (comme le poteau de l'abri, on ne l'agrandit pas).

## Vues
Quatre (`four` : une face où pendent les outils, un dos contre le mur) : r0, de face, les pinces et les marteaux pendus ; r2, le dos
des traverses ; r1, r3, de chant, les manches qui dépassent.

## Variantes naturelles
Aucune.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose au sol, R le tourne, clic droit le retire.
- En jeu : il bloque son emprise (mince, le long du mur). Plus tard : y prendre et y pendre les outils, quand ils seront des objets.

## Travail
Aucun.

## Arme
Aucune.

## Origine
Assemblé par le charpentier : montants et traverses de bois fendu, chevilles. Pas encore fabriqué en jeu.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues au gabarit, Xéros à côté ; ses trois âges.
- `npm run test:forge` (à venir) ; `npm run check`.
