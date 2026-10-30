# Arbre normal (`normal-tree`) et son tronc couché

Une fiche pour toute la série de l'arbre normal, de l'arbre debout aux pièces du tronc couché : un jeu de pièces dont chacune
se nomme `normal-…`. Le rondin (et la bille de 95 cm, le tas) a la sienne : [rondin](normal-felled-log.md) ; la [poutre](normal-beam.md) aussi.
Repris le 30 octobre 2026 (équarrissage) : couché, l'arbre est un seul objet ; ébranché, son tronc devient un rondin de 5 m qu'on coupe où l'on veut. Le gros arbre (`big-tree`,
`big-tree-stump`, `big-felled-…`, tronc de 55 cm) est l'arbre d'avant : mêmes gestes, même chaîne de pièces, autre échelle.

## Identité
- Clés : `normal-tree` (debout), `normal-tree-stump` (souche), `normal-tree-fall` et `normal-tree-fall-left` (planches de
  la chute), `normal-felled-tree` (l'arbre couché, tronc et houppier : un seul objet, `-left` vers la gauche),
  `normal-felled-log` (le rondin qu'il devient, ébranché). Toutes aussi clés d'image (le rondin s'assemble à sa longueur).
- Noms affichés : arbre, souche, arbre couché, rondin.
- Nature : objets du monde (`props.json`). L'arbre et l'arbre couché ont un `harvest` ; la souche n'en a pas ; le rondin est
  du bois d'œuvre (`timber`).
- Mains : le rondin, deux, s'il se porte (70 kg ou moins).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Tronc de 30 cm : 6 px d'écorce, 8 px (40 cm) contour compris. Le gros : 55 cm, 11 px d'écorce, 13 px (65 cm) contour compris.
- Arbre debout : 190 × 190 × 700 cm (boîte) : silhouette **38 × 159 px**, contre 54 × 79 (exception) pour le gros. Il se lit plus
  haut (7 m, la hauteur de la silhouette fait foi) et plus fin ; le houppier couvre les rangées 3 à 100, le tronc nu 3 m dessous.
- Souche : 60 × 55 × 40 cm (boîte : le pied évasé, racines comprises, fait 60 cm d'est en ouest ; le fût, 40 cm contour
  compris) : **12 × 13,5 px**, dessinée 12 × 14.
- Arbre couché (`normal-felled-tree`) : 700 × 100 × 50 cm (boîte) : 140 × 22 px, la dernière image de la chute ; collisions du
  tronc (123 × 6 px) et du houppier (79 × 14).
- Longueur utile du tronc : **5 m** (100 px), du bout scié jusqu'où la cime commence à s'amincir : le rondin qu'il devient.

## Masse
- L'arbre debout et l'arbre couché : pas déplaçables, pas de masse. Le rondin de 5 m pèse **318 kg** : au-delà des 300 kg que
  Xéros fait rouler, il ne bouge pas, c'est voulu (on le coupe d'abord ; voir la [fiche du rondin](normal-felled-log.md)).

## Vues
- Debout : `normal-tree`, 48 × 168, pied du tronc en (24, 161) ; houppier étroit et haut (masses asymétriques), tronc nu
  droit et vertical (colonnes 21 à 26 du pied au houppier, sans courbe ni coude : l'arbre de la charpente), une branche à
  droite sous le houppier, deux racines.
- Souche : `normal-tree-stump`, 24 × 24, pied en (12, 19) : le pied de l'arbre debout (mêmes colonnes d'écorce, même
  évasement, mêmes racines), coupé en biais comme celle du gros (`slantedCut` de big-tree.ts : plus bas à gauche, plus
  haut à droite, côté charnière) ; face de coupe claire sans cernes (trop étroite). Collision 10 × 6, celle du pied de
  l'arbre.
- Chute : `normal-tree-fall` (à droite) et `normal-tree-fall-left` (à gauche, dessinée avec sa propre lumière en haut à
  gauche, pas un miroir), 192 × 168, animation `fall` de 4 images : la première est l'arbre debout, les deux suivantes
  le même tronc droit pivoté autour du pied (10°, 45°), la dernière est l'arbre couché lui-même.
- Couché : `normal-felled-tree` (et `-left`), pixel pour pixel la dernière image de la chute.
- Ébranché : le rondin de 5 m, posé sur le tronc, bout scié sur bout scié (vers la gauche, en miroir de position, jamais dessiné
  retourné).

## Regroupement
Seuls. Les billes de 95 cm qu'on coupe du rondin s'entassent en tas de leur propre genre (`normal-logs`).

## Gestes
- Espace avec la hache, debout, de côté (`use`) : 4 coups, l'arbre tombe du côté opposé à Xéros, laisse sa souche et fait
  naître l'arbre couché.
- Espace, de haut en bas (`chop`), sur le houppier : 3 coups, il lâche 3 à 4 branches (la cime comprise) et le tronc ébranché
  devient un rondin de 5 m. Le rondin se coupe où l'on veut (voir sa fiche).

## Origine
Pousse debout dans la ferme (`ferme.tmj`, calque des arbres) ; les billes naissent de l'abattage.

## Devenir
Souche, branches, et un rondin de 5 m : un poteau de 3 m et un de 1,70 m (30 cm de chute), ou des billes de 95 cm.

## Vérification
- Aperçu : `.art-preview/collection.png`, `.art-preview/arbres.png` (les deux arbres côte à côte à chaque étape : debout,
  chute, couché, ébranché, coupé à 3 m, tas), `.art-preview/timber.png`, `.art-preview/gabarit.png`.
- Test : `npm run test:equarrissage`.
- En jeu : voir le rapport de la branche `arbre-normal`.
