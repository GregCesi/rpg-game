# Arbre normal (`normal-tree`) et son tronc couché

Une fiche pour toute la série de l'arbre normal, de l'arbre debout aux pièces du tronc couché : un jeu de pièces dont chacune
se nomme `normal-…`. La bille et le tas ont la leur : [bille normale](normal-felled-log.md). Le gros arbre (`big-tree`,
`big-tree-stump`, `big-felled-…`, tronc de 55 cm) est l'arbre d'avant : mêmes gestes, même chaîne de pièces, autre échelle.

## Identité
- Clés : `normal-tree` (debout), `normal-tree-stump` (souche), `normal-tree-fall` et `normal-tree-fall-left` (planches de
  la chute), `normal-felled-section-1..4`, `normal-felled-crown`, `normal-felled-head` (pièces du tronc couché),
  `normal-felled-log-1..5` (leurs billes), `normal-felled-log` (la bille ordinaire). Toutes aussi clés d'image.
- Noms affichés : arbre, souche, tronc couché, houppier, tête de tronc ébranchée, bille.
- Nature : objets du monde (`props.json`). L'arbre, les sections, le houppier et la tête ont un `harvest` ; la souche n'en a
  pas ; les billes se prennent (`take`).
- Mains : les billes, deux (longues et lourdes).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Tronc de 30 cm : 6 px d'écorce, 8 px (40 cm) contour compris. Le gros : 55 cm, 11 px d'écorce, 13 px (65 cm) contour compris.
- Arbre debout : 190 × 190 × 700 cm (boîte) : silhouette **38 × 159 px**, contre 54 × 79 (exception) pour le gros. Il se lit plus
  haut (7 m, la hauteur de la silhouette fait foi) et plus fin ; le houppier couvre les rangées 3 à 100, le tronc nu 3 m dessous.
- Souche : 55 × 55 × 40 cm (cylindre debout) : **11 × 13,5 px**.
- Pièce de tronc couché (section) : 95 × 40 × 40 cm (cylindre est-ouest) : 19 px de long, environ 9 de haut. Chaque pièce est
  exactement une future bille de même image et même place. Le houppier et la tête, plus larges (leurs `dims` sont ceux de leur
  boîte).
- Longueur couchée : environ 140 px (7 m), houppier compris : 5 billes (4 sections de tronc nu, puis la 5e bille sous le
  houppier), contre 4 pour le gros.

## Vues
- Debout : `normal-tree`, 48 × 168, pied du tronc en (24, 161) ; houppier étroit et haut (masses asymétriques), tronc nu
  droit et vertical (colonnes 21 à 26 du pied au houppier, sans courbe ni coude : l'arbre de la charpente), une branche à
  droite sous le houppier, deux racines.
- Souche : `normal-tree-stump`, 24 × 24, pied en (12, 19) ; face de coupe sans cernes (trop étroite), rayures.
- Chute : `normal-tree-fall` (à droite) et `normal-tree-fall-left` (à gauche, dessinée avec sa propre lumière en haut à
  gauche, pas un miroir), 192 × 168, animation `fall` de 4 images : la première est l'arbre debout, les deux suivantes
  le même tronc droit pivoté autour du pied (10°, 45°), la dernière est l'arbre couché lui-même.
- Couché : les 4 sections, le houppier puis la tête ; états : entailles `-n1`, `-n2`, bout coupé `-cut-right`, voisine
  `-cut-left`, et pour chaque image sa version `-left` (tronc couché à gauche).
- Case d'interface, porté, fantôme : ceux de la bille ordinaire (voir sa fiche).

## Regroupement
Seul pour l'arbre et la souche. Les pièces du tronc couché forment une chaîne (ordre de `spawns`). Les billes qui en naissent
s'entassent en tas de leur propre genre (`normal-logs`).

## Gestes
- Espace avec la hache, debout, de côté (`use`) : 4 coups, l'arbre tombe du côté opposé à Xéros, laisse sa souche et fait
  naître l'arbre couché.
- Espace, de haut en bas (`chop`) : sur le houppier, 3 coups, il lâche 2 à 3 branches et devient la tête nue (1 branche de
  plus quand la tête est coupée) ; sur une encoche, 3 coups (entaille 1, 2, coupe) : la pièce devient bille.
- E : sur une bille, la prendre à deux mains. R : la tourner. Q : la poser.

## Origine
Pousse debout dans la ferme (`ferme.tmj`, calque des arbres) ; les billes naissent de l'abattage.

## Devenir
Souche. Billes (5 par arbre, plus des branches). Plus tard, l'arbre normal se coupera aussi à la longueur d'une pièce de
charpente : pas dans ce chantier.

## Vérification
- Aperçu : `.art-preview/collection.png`, `.art-preview/arbres.png` (les deux arbres côte à côte à chaque étape : debout,
  chute, couché, entaillé, billes, tas), `.art-preview/gabarit.png`.
- En jeu : voir le rapport de la branche `arbre-normal`.
