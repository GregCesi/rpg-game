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
- Posé sur le billot (`chopping-block-rope`) : le rouleau (10 cm) tient dans la coupe sans dépasser le bord du fond ; le
  billot qui le porte garde la taille du billot. Le billot nu est un objet ancien (`EXCEPTIONS`), dessiné à 18 × 15 px au
  lieu de 11 × 14,5 : le billot et son rouleau reprennent ce dessin, décrit tel qu'il est (`dims` 90 × 70 × 45 cm, attendu
  18 × 16). À reprendre ensemble (billot, billot et hache, billot et rouleau, Ø 55 cm) le jour où le billot sort des
  exceptions.

## Vues
- Au sol : `rope-coil`, 6 × 5 px, le dessus du rouleau (les tours de corde, un trou sombre au milieu) et sa tranche au sud ;
  ombre portée dessous. Pas de version `-left`.
- En main (`held-rope-coil`, posture `hand`) : le rouleau pend au poing, le long de la jambe. De profil (`right`, et `left`
  en miroir) on le voit à plat, un anneau de 6 px ; de face (`down`) et de dos (`up`), par la tranche, un ovale étroit.
- Case d'interface : `item-rope-coil`, 16×16, le rouleau vu de trois quarts, plus grand qu'au sol.
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
