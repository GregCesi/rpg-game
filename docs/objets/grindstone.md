# Meule (`grindstone`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : la meule à aiguiser du forgeron, près de l'ouverture, pour la lumière.

## Identité
- Clé : `grindstone`.
- Nom affiché : « meule » (féminin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take` : une meule de grès sur son axe de fer, la manivelle d'un
  côté, le bâti de bois, l'auge d'eau dessous où trempe le bas de la meule.
- Mains : aucune.
- Âge : aucun (la pierre domine ; le bâti n'est pas déclaré `aged`).

## Masse
`{"matter": "stone", "fill": 0.2}` sur la boîte de ses `dims` (100 × 50 × 90 cm, 0,45 m³) : 0,09 m³, **216 kg**. La meule seule (Ø 80,
environ 15 cm d'épaisseur) en fait 0,075 m³, 181 kg ; le bâti de bois (une vingtaine de kg) est pesé ici comme de la pierre : une
seule matière par objet. Le grès n'est pas une roche de `rocks.json` : la meule pèse au calcaire (2 400 kg/m³ ; le grès est voisin,
connaissance générale, non sourcée).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Bâti 100 × 50 cm, 90 cm de haut ; **meule de grès Ø 80**, son axe vers 50 cm (elle monte de 10 à 90 cm) ; boîte.
- Place dans l'atelier : le milieu en x 760, y 520.
- À l'écran, en long (r0, r2) : 20 × (18 + 5) = **20 × 23 px** ; de côté (r1, r3) : 10 × (18 + 10) = **10 × 28 px**.

## Vues
Quatre (`four` : la manivelle d'un seul côté). La meule tourne dans le sens de la longueur du bâti, son axe nord-sud : r0, la meule
ronde de flanc, la manivelle au bout sud de l'axe, devant ; r2, la même de dos, sans manivelle ; r1, r3, la meule par la tranche,
dans son bâti, la manivelle d'un côté.

## Variantes naturelles
Aucune : la meule est taillée ronde.

## Regroupement
Seule.

## Gestes
- Mode construction : clic gauche la pose au sol, R la tourne (la manivelle), clic droit la retire.
- En jeu : elle bloque son emprise. Plus tard : aiguiser un outil (la hache, la cognée).

## Travail
Aucun pour l'instant.

## Arme
Aucune.

## Origine
La meule taillée par le carrier dans un banc de grès (pas de grès au jeu encore) ; le bâti par le charpentier, l'axe et la manivelle
par le forgeron. Pas encore fabriquée en jeu.

## Devenir
Elle s'use et rapetisse ; elle reste.

## Transformations
Aucune.

## Métier
Le carrier (`quarryman`).

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues au gabarit, Xéros à côté.
- `npm run test:forge` (à venir) ; `npm run check`.
