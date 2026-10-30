# Billot et branche (`chopping-block-branch`)

## Identité
- Clé : `chopping-block-branch`.
- Nom affiché : billot et branche.
- Nature : objet du monde (`props.json`), le billot (`chopping-block`) avec une branche posée sur sa face de coupe. Il naît de `chopping-block` quand on y pose une branche (`rest`) et redevient le billot nu quand on la reprend (`bears`) ou qu'on la taille (`harvest`).
- Mains : aucune (on ne le prend pas).

## Masse
- Pas déplaçable : pas de masse.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Le billot : Ø 55 cm, 45 cm de haut ; la branche : 100 cm de long, Ø 5 cm, posée en travers sur le dessus, elle dépasse de part et d'autre. L'ensemble tient dans une boîte (`box`) de 100 × 55 × 50 cm.
- À l'écran : W = 100/5 = 20 px ; H + D/2 = 10 + 5,5 = 15,5 : **20 × 15 à 16**. Le billot (11 px) est au même pixel que dans ses autres images (nu, à hache, à rouleau) : rien ne bouge quand on pose la branche.

## Vues
- Au sol (posé dans le jeu) : `chopping-block-branch`, 20 × 16 (le billot de 11 × 16 comme `chopping-block-rope`, et la branche qui déborde) ; le dessus du billot, la branche (écorce, matière `NORMAL_WOOD`) couchée est-ouest en travers, dépassant de part et d'autre du plateau, les bouts hors du billot.
- En main, case d'interface, fantôme, porté : aucun.

## Regroupement
Seul.

## Gestes
- E court, mains libres : reprendre la branche.
- E court, branche dans la main active, face au billot nu : la poser dessus.
- Espace, hache en main (geste de haut en bas, `chop`) : un coup taille la branche en pointe : le piquet (`stake`) tombe au sol à côté, le billot redevient nu. Coûte un coup de hache (`chop`).

## Origine
Le billot de la ferme (`chopping-block`), à côté de la souche et de la hache.

## Devenir
Taillée, la branche devient un piquet. Reprise, elle redevient une branche (`branch`).

## Vérification
- Aperçu : `.art-preview/collection.png`.
- En jeu : poser une branche sur le billot, la reprendre ; la reposer, un coup de hache : un piquet à côté.
