# Fagot (`faggot`)

## Identité
- Clé : `faggot`.
- Nom affiché : fagot.
- Nature : objet du monde (`props.json`) qui se prend (`take`), comme la bille.
- Mains : deux (lourd et long) : porté devant lui, il ralentit comme la bille.

## Dimensions (gabarit)
- Branches serrées par un lien : environ 130 cm de long, Ø 50 cm, contour compris.
- Cylindre couché est-ouest (`ew`) ; dans un tas tourné, nord-sud (`ns`).
- Est-ouest : L = **26 px** de long, Ø × 1,12 = **11 px** de haut, bouts en ovales de 5 × 10 (Ø/2 × Ø).
- Nord-sud : Ø = **10 px** de large, Ø × 7/11 + L/2 = 6,4 + 13 = **19 px** de haut ; le bout est une face de branches
  coupées aplatie, 10 × 6.

## Vues
- Au sol : `faggot`, est-ouest : le faisceau de branches, gros bouts mêlés, quelques rameaux qui dépassent, le lien qui le
  serre au milieu ; ombre portée. Seul, il est un tas de fagots d'une pièce.
- Tourné : `faggot-ns`, vu par le bout : les bouts des branches (ronds clairs dans l'ombre) au sud, le dessus du faisceau
  qui fuit vers le nord, le lien en travers.
- En main (`held-faggot`, posture `carry`, à deux mains devant lui) : de face et de dos, en longueur (le fagot est-ouest
  sans son ombre) ; de profil (`right`, `left` en miroir), par le bout, comme la bille portée.
- Case d'interface : `item-faggot`, 16×16, le fagot de trois quarts et son lien.
- Fantôme : `faggot` ou `faggot-ns` en transparence, à la place exacte où il ira (tas visé ou nouveau tas).
- Porté : `carry`, à deux mains, marche lente (`PLAYER.carrySpeed`), pas de course, rien d'autre.

## Regroupement
En tas (`piles.json`, `faggots`), même forme que les billes : 3 au sol côte à côte, 2 dans les creux, 1 au sommet, 6 au plus ;
est-ouest ou nord-sud (`turned`). Un fagot posé seul est un tas d'une pièce. Il bloque le passage dès la première pièce.

## Gestes
- E court : le prendre à deux mains (le plus haut d'un tas, ou le seul) ; le portant, E le pose devant soi (en tas).
- E maintenu (mains libres, une demi-seconde, jauge au-dessus de Xéros) : sur un fagot seul, il se dénoue en un tas de
  10 branches avec son lien, à la même place. Sur un tas de plusieurs fagots : « Un seul fagot à la fois. ».
- Espace : rien (porté, Xéros n'utilise rien).
- R : le portant, il tourne entre est-ouest et nord-sud ; le fantôme suit.
- Q : le pose devant soi (en tas), comme E.

## Origine
Fabriqué : un tas de 10 branches plein, ceinturé d'un [lien](rope-tie.md), noué avec E maintenu. Le fagot prend la place du
tas, couché est-ouest.

## Devenir
Se dénoue en 10 branches et leur lien. Plus tard il servira au feu (pas encore construit).

## Vérification
- Aperçu : `.art-preview/collection.png` (faggot, faggot-ns, item-faggot), `.art-preview/hands.png` (held-faggot porté),
  `.art-preview/piles.png` (le tas de fagots est-ouest et nord-sud, tous ses états), à côté de `gabarit.png` (bille est-ouest
  et nord-sud). `npm run check` vérifie 26 × 11.
- En jeu : voir la liste de [la corde au fagot](rope-tie.md#vérification), étapes 9 à 12.
