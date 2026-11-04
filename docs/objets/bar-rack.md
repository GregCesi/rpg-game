# Râtelier à barres (`bar-rack`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : le râtelier où les barres de fer attendent debout, triées par épaisseur.

## Identité
- Clé : `bar-rack`.
- Nom affiché : « râtelier à barres » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take` : un bâti de bois, une traverse haute à cases, un bas qui
  retient les pieds des barres ; **les barres sont dessinées avec lui**, ce ne sont pas encore des objets (`iron-bar`, CADRAGE-forge.md,
  section 3).
- Mains : aucune.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` ; dans la forge, vieux).

## Masse
`{"matter": "wood", "fill": 0.05}` sur la boîte de ses `dims` (160 × 40 × 120 cm, 0,77 m³) : 0,038 m³ de bois vert, **35 kg**. Les
barres ne sont pas comptées (une barre de 120 × 3 × 3 cm pèse 8,5 kg ; une vingtaine, 170 kg) : elles le seront quand elles seront
des objets.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 160 × 40 × 120 cm de haut, contour compris ; boîte.
- Place dans l'atelier : x 880–920, y 460–620, contre le bardage est : il y est nord-sud.
- À l'écran, de face (r0, r2) : 32 × (24 + 4) = **32 × 28 px** ; de côté (r1, r3) : 8 × (24 + 16) = **8 × 40 px**.

## Vues
Quatre (`four` : une face où l'on prend les barres, un dos) ; les barres de fer sombres, debout, de plusieurs épaisseurs.

## Variantes naturelles
Aucune.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose au sol, R le tourne, clic droit le retire.
- En jeu : il bloque son emprise. Plus tard : y prendre une barre.

## Travail
Aucun.

## Arme
Aucune.

## Origine
Assemblé par le charpentier. Pas encore fabriqué en jeu.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues au gabarit, Xéros à côté ; ses trois âges.
- `npm run test:forge` (à venir) ; `npm run check`.
