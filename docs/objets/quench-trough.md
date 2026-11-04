# Auge de forge (`quench-trough`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : l'auge d'eau où le forgeron trempe le fer, à droite du feu.

## Identité
- Clé : `quench-trough`.
- Nom affiché : « auge de forge » (féminin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take` : un bloc de calcaire creusé, l'eau noire de battitures.
- Mains : aucune.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.45}` sur la boîte de ses `dims` (120 × 50 × 50 cm, 0,30 m³) : 0,135 m³ de calcaire (parois et fond
d'environ 7 cm), **324 kg**. L'eau (environ 160 l, 160 kg pleine) n'est pas comptée. Elle ne se déplace pas.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 120 × 50 × 50 cm de haut, contour compris ; boîte.
- Place dans l'atelier : x 395–515, y 70–120, à droite de la forge, sous la main du forgeron.
- À l'écran, est-ouest : 24 × (10 + 5) = **24 × 15 px** ; nord-sud : 10 × (10 + 12) = **10 × 22 px**.

## Vues
Symétrique (`symmetric`) : l'est-ouest (`quench-trough`) et le nord-sud (`quench-trough-ns`) ; le bord de pierre taillé, l'eau
sombre dedans.

## Variantes naturelles
Aucune : taillée à la mesure du maçon.

## Regroupement
Seule.

## Gestes
- Mode construction : clic gauche la pose au sol, R la tourne (est-ouest, nord-sud), clic droit la retire.
- En jeu : elle bloque son emprise. Plus tard : la remplir au puits de la cour (`well`) avec le seau (point
  ouvert, aucun geste encore), y tremper le fer.

## Travail
Aucun.

## Arme
Aucune.

## Origine
Un bloc de calcaire tiré par le carrier, creusé par le maçon. Pas encore fabriquée en jeu.

## Devenir
Elle reste.

## Transformations
Aucune pour l'instant.

## Métier
Le maçon (`mason`).

## Vérification
- `.art-preview/forge-pieces.png` : ses deux vues au gabarit, Xéros à côté.
- `npm run test:forge` (à venir) ; `npm run check`.
