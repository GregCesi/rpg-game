# Caisse de ferraille (`scrap-crate`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : la caisse du jeu, pleine de vieux fers à remettre au feu.

## Identité
- Clé : `scrap-crate`.
- Nom affiché : « caisse de ferraille » (féminin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take` : la caisse du jeu (60 × 50 × 50) pleine de ferraille en
  vrac (fers à cheval usés, clous, outils cassés, bouts de barre). La ferraille n'est pas encore un objet (`scrap-iron`,
  CADRAGE-forge.md, section 3).
- Mains : aucune.
- Âge : aucun (pas `aged` : le fer domine ; la caisse elle-même est celle du jeu).

## Masse
`{"matter": "iron", "fill": 0.1}` sur la boîte de ses `dims` (60 × 50 × 50 cm, 0,15 m³) : 0,015 m³ de fer en vrac, **118 kg**. Le
bois de la caisse (une vingtaine de kg) n'est pas compté : une seule matière par objet. Elle ne se porte pas (118 kg, Xéros en porte
70).

## Dimensions (gabarit, docs/STYLE.md section 8)
- 60 × 50 × 50 cm de haut, contour compris, ceux de la caisse ; boîte.
- Place dans l'atelier : x 780–860, y 560–620, près de la meule.
- À l'écran, est-ouest : 12 × (10 + 5) = **12 × 15 px** ; nord-sud : 10 × (10 + 6) = **10 × 16 px**.

## Vues
Symétrique (`symmetric`), comme la caisse : l'est-ouest (`scrap-crate`) et le nord-sud (`scrap-crate-ns`) ; la caisse de planches, la
ferraille rouillée qui dépasse du bord.

## Variantes naturelles
Aucune.

## Regroupement
Seule.

## Gestes
- Mode construction : clic gauche la pose au sol, R la tourne, clic droit la retire.
- En jeu : elle bloque son emprise.

## Travail
Aucun.

## Arme
Aucune.

## Origine
La caisse du jeu, remplie de ce qu'on rapporte au forgeron. Pas encore fabriquée en jeu.

## Devenir
**À remettre au feu de forge** : au village, le fer ne se fond pas (CADRAGE-forge.md, section 4) ; la ferraille se chauffe et se
soude en paquet au marteau, ou se vend.

## Transformations
Aucune pour l'instant.

## Métier
Le forgeron (`smith`).

## Vérification
- `.art-preview/forge-pieces.png` : ses deux vues au gabarit, Xéros à côté.
- `npm run test:forge` (à venir) ; `npm run check`.
