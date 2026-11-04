# Liseré de la coupure (`water-cut`)

Le liseré mouillé là où l'eau de la rivière s'arrête net contre le pied du flanc extérieur d'un talus du chemin creux (chantier
« relief », 4 novembre 2026) : la terre noyée, une ligne d'eau sombre, puis l'eau qui s'éclaircit. Il dit, sans un mot, que l'eau est
retenue (le miroitement `shimmer` le double).

## Identité
- Clé : `water-cut` (`props.json`, type de l'objet dans Tiled), posé en segments bout à bout le long de la coupure.
- Nom affiché : bord de l'eau.
- Nature : objet du monde, à plat, fixe, sans `take`, sans corps (la rivière bloque déjà le passage).
- Mains : ne se prend pas. Âge : non.

## Masse
- Aucune (pas de `take`) : ce n'est que le bord de l'eau.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Un segment : 160 cm de long, 20 cm de large ; à plat (`flat`) : **32 × 4 px**.

## Vues
- Symétrie : quatre vues (`four`) : `water-cut`, l'eau au sud (le flanc au nord : la coupure sud) ; `-r1`, l'eau à l'ouest ;
  `-r2`, l'eau au nord (la coupure nord) ; `-r3`, l'eau à l'est. Les vues `-r1` et `-r3` font 4 × 32 px.
- Le dessin : terre noyée `5` `8` contre le flanc, ligne d'eau sombre `q`, puis `q` et `w` vers l'eau ouverte. Sans contour (c'est du
  terrain). Raccord libre bout à bout (périodique sur 32).
- En main, porté, case : non.

## Variantes naturelles
Aucune : le liseré est la ligne nette d'une eau retenue, il doit être régulier.

## Regroupement
En segments bout à bout.

## Gestes
Aucun.

## Travail
Aucun.

## Arme
Aucune.

## Origine
Posé dans la carte de la ferme, au pied des flancs extérieurs des talus au-dessus de la rivière.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Aucun.

## Vérification
- Aperçu : `.art-preview/relief-final-1-matieres.png` (ses quatre vues sur l'eau), `.art-preview/relief-final-4-coupure.png`
  (détail de la coupure sud).
- En jeu : le long des flancs au-dessus de la rivière, l'eau s'arrête net sur une ligne sombre.
