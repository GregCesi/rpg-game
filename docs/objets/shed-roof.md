# Toit de planches de l'abri (`shed-roof`)

## Identité
- Clé : `shed-roof`.
- Nom affiché : toit de planches.
- Nature : objet du monde (`props.json`), sans `take` : la dernière pièce du chantier de l'abri à bois, étape « le
  toit ». Pièce du toit (`roof`). Il remplace la couverture de chaume (`shed-thatch`, retirée le 30 octobre 2026 ; son
  numéro de tuile reste réservé dans `art/tile-registry.json`).
- Mains : aucune (le toit se fait planche par planche ; ici, une seule pièce).

## Dimensions (gabarit)
- Toit à une seule pente (appentis) de 20,1°, le côté haut au nord. Planches refendues de 20 à 25 cm de large et 5 cm
  d'épaisseur, posées dans le sens de la pente (nord-sud), clouées sur des liteaux en travers des chevrons.
- Débord : 20 cm à l'est et à l'ouest des poteaux, 35 cm au nord et au sud. Emprise au sol : 3,65 m est-ouest, 4,45 m
  nord-sud (73 × 89 px).
- **Hauteurs réelles du dessus du toit** : **200 cm au bord sud** (l'avant-toit), **360 cm au bord nord**. Dessous des
  planches 5 cm plus bas (195 et 355 cm) ; dessous des chevrons à l'avant-toit : 185 cm.
- Boîte englobante : 365 × 445 × 165 cm (5 d'épaisseur + 160 de pente sur 4,45 m).
- **Pièce qui relie des appuis posés au sol** (`ground`, docs/STYLE.md section 8) : W = 73 ; H + D = 33 + 89 =
  **73 × 122 px**, dessiné 73 × 121.
- Image de 73 × 162 : la silhouette en haut (rangées 0 à 120), puis 41 rangées vides : le bas de l'image est un pixel au
  sud du bord de l'avant-toit au sol (sa profondeur d'affichage) ; Xéros dessous est derrière lui, Xéros au sud de
  l'avant-toit est devant.
- **Emprise au sol dans le repère de l'image** (pour l'ombre portée) : x = 0, y = 72, largeur 73 px, profondeur 89 px
  (rangées 72 à 160 ; la rangée 161 est le pixel de marge au sud). Dans la carte : x de 604 à 676, y de 57 à 145.
- Dans `ferme.tmj` : coin bas gauche de l'image en (604, 147), 73 × 162. Le haut de l'image est à y = −15 : les 15
  rangées du haut du toit (le bord nord) dépassent du haut de la carte.

## Masse
- Pas encore déplaçable (le toit est posé tout construit) : pas de masse saisie. Plusieurs centaines de kilos de planches : il
  se montera pièce par pièce quand on construira soi-même.

## Vues
- Posé : le dessus, un pan de 73 px de planches nord-sud : joints verticaux (P), fil le long de la planche, arête gauche
  de chaque planche éclairée, quelques nœuds ; trois teintes de bois équarri (`art/world/wood.ts` : claire Y, ordinaire
  t, vieille T), les claires plutôt à l'ouest, côté lumière ; une planche sur trois environ plus courte d'un pixel au
  nord ou au sud ; un clou par planche sur chacun des quatre liteaux. Au sud, la tranche de l'avant-toit : le bout des
  planches (bois de bout T, plus sombre que le dessus), le contour du bas, et juste dessous les bouts des cinq
  chevrons (leurs images). Contour N en haut et à gauche, OUTLINE en bas et à droite. **Pas d'ombre peinte** : le jeu
  calcule l'ombre portée du toit.
- Transparent : quand Xéros est dessous ou caché derrière, il devient en partie transparent (le jeu, `roof`), avec les
  chevrons qu'il couvre.
- En main, case d'interface, fantôme, porté : aucun.

## Regroupement
Seul ; un par abri.

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Posé dans `ferme.tmj` avec l'abri. Plus tard : des planches refendues dans une bille (coins et maillet), clouées sur des
liteaux, de bas en haut : pas encore construit.

## Devenir
Abrite ce qui est rangé dessous. Ne bloque pas le passage.

## Vérification
- Aperçu : `.art-preview/woodshed-5.png` (l'abri fini), `.art-preview/woodshed-6.png` (Xéros dessous, toit effacé),
  `.art-preview/woodshed.png` (les étapes côte à côte), à côté de `gabarit.png` et `xeros.png`.
- En jeu : tourner autour de l'abri (le toit cache Xéros derrière lui et s'efface) ; entrer dessous par le sud (sous la
  sablière basse à 1,85 m : de justesse), l'est et l'ouest (le toit s'efface) ; ressortir au sud (le toit revient, Xéros
  passe devant) ; monter un tas de billes dessous ; recharger la page (tout est là).
