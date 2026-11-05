# Les plantes des gradins (`hazel`, `young-ash`, `long-bush`, `briar`)

Les petits arbres et les buissons qui poussent droits sur les gradins du chemin creux (chantier « relief », CADRAGE.md 13.0 ; dessins
du pixel-artist validés par Grégoire le 4 novembre 2026). Une seule rangée par gradin, alignée le long du chemin : chaque gradin n'a
que la place d'un tronc (50 cm). Ce sont les étages d'arbres, les uns au-dessus des autres, qui referment le cercle au-dessus du
chemin ; les grands arbres restent sur le dessus. Quatre plantes, une fiche.

## Identité
- Clés : `hazel` (le noisetier), `young-ash` (le jeune frêne), `long-bush` (le buisson long), `briar` (l'églantier) ; `props.json`,
  types des objets dans Tiled.
- Noms affichés : noisetier, jeune frêne, buisson long, églantier.
- Nature : objets du monde, fixes, sans `take`, **sans corps** : chacune est posée à 1 m au moins au-dessus du chemin, hors de portée
  de Xéros (la marche l'arrête avant ; un tronc au bord du gradin le bloquerait sans qu'il sache pourquoi). Le noisetier et le jeune frêne ont `roots` : leurs racines (`relief-roots-*`)
  descendent la marche sous eux, peintes par le terrain (`world/terrainView.ts`).
- Mains : ne se prennent pas.
- Âge : non (bois vivant).

## Masse
- Aucune requise (pas de `take`). Pour mémoire (l'abattage, plus tard) : le noisetier, une cépée de trois tiges de 6 à 8 cm, une
  trentaine de kg ; le jeune frêne, un tronc de 15 cm, une quarantaine ; les buissons, quelques kg de branches.

## Dimensions (gabarit, docs/STYLE.md section 8)
Boîtes (`box`) : W × (H + D/2), contour compris ; vérifié par validate.ts à 2 px près.
- `hazel` : 220 × 150 × 380 cm, **44 × 91 px** (image 52 × 100, pied en (25, 94)).
- `young-ash` : 160 × 140 × 420 cm, **32 × 98 px** (image 38 × 108, pied en (19, 102)).
- `long-bush` : 150 × 50 × 90 cm, **30 × 23 px** (image 32 × 28) ; vu par le bout (`long-bush-ns`) 50 × 150 × 90 cm, **12 × 32 px**
  pour un gabarit de 10 × 33 (image 14 × 40).
- `briar` : 90 × 50 × 70 cm, **19 × 19 px** pour un gabarit de 18 × 19 (image 22 × 22).
- Pose : le point Tiled (le bas de l'image) sur le gradin, 2 px derrière son arête ; le pied dessiné tombe sur le gradin.

## Vues
- Au sol (posé) : leur image, leur contour, lumière en haut à gauche, leur ombre au sol.
- Symétrie : le noisetier, le jeune frêne et l'églantier sont ronds (`round`, une vue : on en fait le tour, ils se ressemblent de tous
  les côtés, comme les arbres du jeu) ; le buisson long est symétrique (`symmetric`, deux vues : est-ouest, et nord-sud vu par le bout,
  le bout sud bombé et le dos qui file vers le nord).
- En main, porté, case d'interface : non. Fantôme : leur image en transparence.
- Au sud du chemin, elles s'effacent avec le bord sud quand Xéros est dessous (il en reste 0,2).

## Variantes naturelles
Une forme chacune ; la carte les alterne le long de chaque gradin (noisetier, frêne, buisson long, églantier).

## Regroupement
Seules.

## Gestes
Aucun pour l'instant. **Limite listée** (CONCEPTION « Le relief ») : les abattre viendra plus tard (décision de Grégoire, question
38), avec leurs données comme les autres arbres (`harvest`, `tree`), sans code.

## Travail
Aucun pour l'instant (l'abattage, plus tard, au coup).

## Arme
Aucune.

## Origine
Naturelles : posées dans la carte de la ferme, une rangée par gradin, des deux côtés du chemin creux, là où le gradin dépasse le sol
d'au moins 1 m.

## Devenir
Elles restent. Plus tard : abattues, des branches, des perches, du petit bois.

## Transformations
Aucune.

## Métier
Aucun pour l'instant (`TRADE_TODO`, comme les autres plantes : la nature, ou le cueilleur, à décider).

## Vérification
- Aperçu : `.art-preview/relief-gradins-1-matieres.png` (seules, en x4, x2, x1), `.art-preview/relief-gradins-2-scenes.png`.
- En jeu : `.art-preview/relief-jeu-*.png` (`npx tsx tools/essai-relief-jeu.ts`) ; dans le chemin creux, une rangée d'arbres droits
  par gradin au nord, en fantôme au sud.
