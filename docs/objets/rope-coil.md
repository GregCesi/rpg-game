# Rouleau de corde (`rope-coil`)

## Identité
- Clé : `rope-coil`.
- Nom affiché : rouleau de corde.
- Nature : objet du monde (`props.json`) qui se prend (`take`) : il se pose dans Tiled, et garde sa longueur.
- Mains : une.

## Dimensions (gabarit)
- Corde de chanvre lovée en rouleau : Ø 30 cm, 10 cm d'épaisseur, contour compris.
- Cylindre debout (`up`), couché à plat sur le sol.
- À l'écran : Ø/5 = **6 px** de large, H + Ø/2 = 2 + 3 = **5 px** de haut.
- Posé sur le billot (`chopping-block-rope`) : le rouleau est posé à plat au milieu de la face de coupe du billot
  (Ø 55 × 45 cm, 11 × 15 px), à la même échelle que seul (6 × 5 px) ; il couvre l'essentiel du dessus et dépasse d'1 px le
  bord arrière. Billot et rouleau : `dims` 55 × 55 × 55 cm (45 + 10), cylindre debout, attendu 11 × 16,5, dessiné 11 × 16.
  Le billot est au même pixel dans ses trois images (vide, à hache, à rouleau) : rien ne bouge quand on pose le rouleau.

## Masse
- **1 kg** les 10 m (`"mass": 1`), au prorata de la longueur restante (4 m : 0,4 kg).

## Vues
- Au sol : `rope-coil`, 6 × 5 px, le dessus du rouleau (les tours de corde, un trou sombre au milieu) et sa tranche au sud ;
  ombre portée dessous. Pas de version `-left`.
- En main (`held-rope-coil`, posture `hand`) : le rouleau pend au poing, le long de la jambe. De profil (`right`, et `left`
  en miroir) on le voit à plat, un anneau de 6 px ; de face (`down`) et de dos (`up`), par la tranche, un ovale étroit.
- Case d'interface : `item-rope-coil`, 16×16, le rouleau vu de trois quarts, plus grand qu'au sol ; sa longueur restante
  en petits signes en bas à droite de la case (« 10 m », « 8 m », « 1,5 m » : `ui-digit-<chiffre>`, `-comma`, `-m`),
  dans le style du nombre de pièces d'un tas.
- Fantôme : aucun (il ne se range pas en tas ; Q le pose juste devant Xéros, comme une bille hors d'un tas).
- Porté : à une main (`hand`), l'autre main reste libre.
- Posé sur le billot : `chopping-block-rope`, le billot nu (`chopping-block`) avec le rouleau à plat sur sa face de coupe.

## Regroupement
Quantité mesurée : sa **longueur restante**, en centimètres (`length` dans GameState : sur ce qu'on tient, sur l'objet
né ou changé, ou sur le billot qui le porte). 10 m au départ (`length.start` = 1000). Il ne se range pas en tas.

## Gestes
- E court : le prendre dans une main libre (au sol) ; rouleau dans la main active, face au billot nu : le poser dessus ;
  face au billot qui le porte, mains libres : le reprendre, avec sa longueur.
- E maintenu : rien.
- Espace : rien en main (c'est une ressource) ; posé sur le billot, la hache en main coupe un lien (voir Devenir).
- R : rien.
- Q : le pose devant Xéros (objet né, sa longueur notée).

## Origine
Trouvé : un rouleau posé dans la réserve de la maison (`maison.tmj`). Plus tard il s'achètera ou se fabriquera : pas
encore construit.

## Devenir
Posé sur le billot, chaque coup de hache (Espace, geste de haut en bas) en coupe un lien : 2 m (`length.cut` = 200), un
`rope-tie` tombe au sol à côté du billot, le rouleau perd 2 m (« Rouleau de corde : 8 m restants. »). À zéro il disparaît, le
billot redevient nu (« Rouleau de corde : vide. ») : un rouleau de 10 m donne 5 liens.

## Vérification
- Aperçu : `.art-preview/collection.png` (rope-coil, chopping-block-rope, item-rope-coil), `.art-preview/hands.png`
  (held-rope-coil dans les deux mains, 4 directions), à côté de `gabarit.png`. `npm run check` vérifie 6 × 5 et 18 × 16.
- En jeu : voir la liste de [la corde au fagot](rope-tie.md#vérification).
