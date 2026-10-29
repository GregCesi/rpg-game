# Couverture de chaume de l'abri (`shed-thatch`)

## Identité
- Clé : `shed-thatch`.
- Nom affiché : couverture de chaume.
- Nature : objet du monde (`props.json`), sans `take` : la dernière pièce du chantier de l'abri à bois, étape « le
  chaume ». Pièce du toit (`roof`).
- Mains : aucune (la couverture se fait botte par botte ; ici, une seule pièce).

## Dimensions (gabarit)
- Toit à une seule pente (appentis), le côté haut au nord. Chaume (paille de seigle) de 30 cm d'épaisseur posé sur les
  chevrons. Avant-toit qui déborde : 20 cm à l'est, à l'ouest et au nord, 50 cm au sud (le côté bas, qui jette l'eau
  loin du bois rangé). Emprise au sol : 3,60 m est-ouest, 3,90 m nord-sud.
- Dessous à 2,50 m au nord, environ 2,04 m au bord sud ; le dessus 30 cm plus haut.
- Boîte englobante : 360 × 390 × 78,75 cm (30 d'épaisseur + 48,75 de pente sur 3,90 m).
- **Pièce qui relie des appuis posés au sol** (`ground`, docs/STYLE.md section 8) : W = 72 ; H + D = 15,75 + 78 =
  **72 × 93,75 px**, dessiné 72 × 94.
- Dans son image, sous elle, la hauteur qui la sépare du sol (vide) : le bas de l'image est un pixel au sud du bord de
  l'avant-toit au sol (sa profondeur d'affichage) ; Xéros dessous est derrière elle, Xéros au sud de l'avant-toit est
  devant.

## Vues
- Posée : le dessus du chaume, un grand pan de 72 px qui descend du nord au sud, en rangs de paille est-ouest (rampe du
  chaume `Y t T P`, tramage pour la texture de paille), bords un peu irréguliers, éclairé en haut à gauche ; au sud,
  la tranche de l'avant-toit (6 rangées, 30 cm), plus sombre, bouts de paille. Pas d'ombre portée peinte.
- Transparente : quand Xéros est dessous ou caché derrière, elle devient en partie transparente (le jeu, `roof`), avec
  les chevrons qu'elle couvre.
- En main, case d'interface, fantôme, porté : aucun.

## Regroupement
Seule ; une par abri.

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Posée dans `ferme.tmj` avec l'abri. Plus tard : des bottes de paille (moisson), liées sur des lattes clouées aux
chevrons, de bas en haut : pas encore construit.

## Devenir
Abrite ce qui est rangé dessous. Ne bloque pas le passage.

## Vérification
- Aperçu : `.art-preview/woodshed-5.png` (l'abri fini), `.art-preview/woodshed-6.png` (Xéros dessous, toit effacé),
  `.art-preview/woodshed.png` (les étapes côte à côte).
- En jeu : tourner autour de l'abri (le toit cache Xéros derrière lui et s'efface) ; entrer dessous par le sud, l'est et
  l'ouest (le toit s'efface) ; ressortir au sud (le toit revient, Xéros passe devant) ; monter un tas de billes dessous ;
  recharger la page (tout est là).
